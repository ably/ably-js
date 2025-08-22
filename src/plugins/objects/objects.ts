import type BaseClient from 'common/lib/client/baseclient';
import type RealtimeChannel from 'common/lib/client/realtimechannel';
import type EventEmitter from 'common/lib/util/eventemitter';
import type * as API from '../../../ably';
import { BatchContext } from './batchcontext';
import { DEFAULTS } from './defaults';
import { LiveCounter } from './livecounter';
import { LiveMap } from './livemap';
import { LiveObject, LiveObjectUpdate, LiveObjectUpdateNoop } from './liveobject';
import { ObjectMessage, ObjectOperationAction } from './objectmessage';
import { ObjectsPool, ROOT_OBJECT_ID } from './objectspool';
import { SyncObjectsDataPool } from './syncobjectsdatapool';

export enum ObjectsEvent {
  syncing = 'syncing',
  synced = 'synced',
}

export enum ObjectsState {
  initialized = 'initialized',
  syncing = 'syncing',
  synced = 'synced',
}

const StateToEventsMap: Record<ObjectsState, ObjectsEvent | undefined> = {
  initialized: undefined,
  syncing: ObjectsEvent.syncing,
  synced: ObjectsEvent.synced,
};

export type ObjectsEventCallback = () => void;

export interface OnObjectsEventResponse {
  off(): void;
}

export type BatchCallback = (batchContext: BatchContext) => void;

export class Objects {
  gcGracePeriod: number;

  private _client: BaseClient;
  private _channel: RealtimeChannel;
  private _state: ObjectsState;
  // composition over inheritance since we cannot import class directly into plugin code.
  // instead we obtain a class type from the client
  private _eventEmitterInternal: EventEmitter;
  // related to RTC10, should have a separate EventEmitter for users of the library
  private _eventEmitterPublic: EventEmitter;
  private _objectsPool: ObjectsPool; // RTO3
  private _syncObjectsDataPool: SyncObjectsDataPool;
  private _currentSyncId: string | undefined;
  private _currentSyncCursor: string | undefined;
  private _bufferedObjectOperations: ObjectMessage[];

  // Used by tests
  static _DEFAULTS = DEFAULTS;

  constructor(channel: RealtimeChannel) {
    this._channel = channel;
    this._client = channel.client;
    this._state = ObjectsState.initialized;
    this._eventEmitterInternal = new this._client.EventEmitter(this._client.logger);
    this._eventEmitterPublic = new this._client.EventEmitter(this._client.logger);
    this._objectsPool = new ObjectsPool(this);
    this._syncObjectsDataPool = new SyncObjectsDataPool(this);
    this._bufferedObjectOperations = [];
    // use server-provided objectsGCGracePeriod if available, and subscribe to new connectionDetails that can be emitted as part of the RTN24
    this.gcGracePeriod =
      this._channel.connectionManager.connectionDetails?.objectsGCGracePeriod ?? DEFAULTS.gcGracePeriod;
    this._channel.connectionManager.on('connectiondetails', (details: Record<string, any>) => {
      this.gcGracePeriod = details.objectsGCGracePeriod ?? DEFAULTS.gcGracePeriod;
    });
  }

  /**
   * When called without a type variable, we return a default root type which is based on globally defined interface for Objects feature.
   * A user can provide an explicit type for the getRoot method to explicitly set the type structure on this particular channel.
   * This is useful when working with multiple channels with different underlying data structure.
   * @spec RTO1
   */
  async getRoot<T extends API.LiveMapType = API.DefaultRoot>(): Promise<LiveMap<T>> {
    this.throwIfInvalidAccessApiConfiguration(); // RTO1a, RTO1b

    // if we're not synced yet, wait for sync sequence to finish before returning root
    if (this._state !== ObjectsState.synced) {
      await this._eventEmitterInternal.once(ObjectsEvent.synced); // RTO1c
    }

    return this._objectsPool.get(ROOT_OBJECT_ID) as LiveMap<T>; // RTO1d
  }

  /**
   * Provides access to the synchronous write API for Objects that can be used to batch multiple operations together in a single channel message.
   */
  async batch(callback: BatchCallback): Promise<void> {
    this.throwIfInvalidWriteApiConfiguration();

    const root = await this.getRoot();
    const context = new BatchContext(this, root);

    try {
      callback(context);
      await context.flush();
    } finally {
      context.close();
    }
  }

  /**
   * Send a MAP_CREATE operation to the realtime system to create a new map object in the pool.
   *
   * Once the ACK message is received, the method returns the object from the local pool if it got created due to
   * the echoed MAP_CREATE operation, or if it wasn't received yet, the method creates a new object locally using the provided data and returns it.
   *
   * @returns A promise which resolves upon receiving the ACK message for the published operation message. A promise is resolved with an object containing provided data.
   */
  async createMap<T extends API.LiveMapType>(entries?: T): Promise<LiveMap<T>> {
    this.throwIfInvalidWriteApiConfiguration();

    const msg = await LiveMap.createMapCreateMessage(this, entries);
    const objectId = msg.operation?.objectId!;

    await this.publish([msg]);

    // we may have already received the MAP_CREATE operation at this point, as it could arrive before the ACK for our publish message.
    // this means the object might already exist in the local pool, having been added during the usual MAP_CREATE operation process.
    // here we check if the object is present, and return it if found; otherwise, create a new object on the client side.
    if (this._objectsPool.get(objectId)) {
      return this._objectsPool.get(objectId) as LiveMap<T>;
    }

    // we haven't received the MAP_CREATE operation yet, so we can create a new map object using the locally constructed object operation.
    // we don't know the serials for map entries, so we assign an "earliest possible" serial to each entry, so that any subsequent operation can be applied to them.
    // we mark the MAP_CREATE operation as merged for the object, guaranteeing its idempotency and preventing it from being applied again when the operation arrives.
    const map = LiveMap.fromObjectOperation<T>(this, msg);
    this._objectsPool.set(objectId, map);

    return map;
  }

  /**
   * Send a COUNTER_CREATE operation to the realtime system to create a new counter object in the pool.
   *
   * Once the ACK message is received, the method returns the object from the local pool if it got created due to
   * the echoed COUNTER_CREATE operation, or if it wasn't received yet, the method creates a new object locally using the provided data and returns it.
   *
   * @returns A promise which resolves upon receiving the ACK message for the published operation message. A promise is resolved with an object containing provided data.
   */
  async createCounter(count?: number): Promise<LiveCounter> {
    this.throwIfInvalidWriteApiConfiguration();

    const msg = await LiveCounter.createCounterCreateMessage(this, count);
    const objectId = msg.operation?.objectId!;

    await this.publish([msg]);

    // we may have already received the COUNTER_CREATE operation at this point, as it could arrive before the ACK for our publish message.
    // this means the object might already exist in the local pool, having been added during the usual COUNTER_CREATE operation process.
    // here we check if the object is present, and return it if found; otherwise, create a new object on the client side.
    if (this._objectsPool.get(objectId)) {
      return this._objectsPool.get(objectId) as LiveCounter;
    }

    // we haven't received the COUNTER_CREATE operation yet, so we can create a new counter object using the locally constructed object operation.
    // we mark the COUNTER_CREATE operation as merged for the object, guaranteeing its idempotency. this ensures we don't double count the initial counter value when the operation arrives.
    const counter = LiveCounter.fromObjectOperation(this, msg);
    this._objectsPool.set(objectId, counter);

    return counter;
  }

  on(event: ObjectsEvent, callback: ObjectsEventCallback): OnObjectsEventResponse {
    // this public API method can be called without specific configuration, so checking for invalid settings is unnecessary.
    this._eventEmitterPublic.on(event, callback);

    const off = () => {
      this._eventEmitterPublic.off(event, callback);
    };

    return { off };
  }

  off(event: ObjectsEvent, callback: ObjectsEventCallback): void {
    // this public API method can be called without specific configuration, so checking for invalid settings is unnecessary.

    // prevent accidentally calling .off without any arguments on an EventEmitter and removing all callbacks
    if (this._client.Utils.isNil(event) && this._client.Utils.isNil(callback)) {
      return;
    }

    this._eventEmitterPublic.off(event, callback);
  }

  offAll(): void {
    // this public API method can be called without specific configuration, so checking for invalid settings is unnecessary.
    this._eventEmitterPublic.off();
  }

  /**
   * @internal
   */
  getPool(): ObjectsPool {
    return this._objectsPool;
  }

  /**
   * @internal
   */
  getChannel(): RealtimeChannel {
    return this._channel;
  }

  /**
   * @internal
   */
  getClient(): BaseClient {
    return this._client;
  }

  /**
   * @internal
   * @spec RTO5
   */
  handleObjectSyncMessages(objectMessages: ObjectMessage[], syncChannelSerial: string | null | undefined): void {
    const { syncId, syncCursor } = this._parseSyncChannelSerial(syncChannelSerial); // RTO5a
    const newSyncSequence = this._currentSyncId !== syncId;
    if (newSyncSequence) {
      // RTO5a2 - new sync sequence started
      this._startNewSync(syncId, syncCursor); // RTO5a2a
    }

    // RTO5a3 - continue current sync sequence
    this._syncObjectsDataPool.applyObjectSyncMessages(objectMessages); // RTO5b

    // RTO5a4 - if this is the last (or only) message in a sequence of sync updates, end the sync
    if (!syncCursor) {
      // defer the state change event until the next tick if this was a new sync sequence
      // to allow any event listeners to process the start of the new sequence event that was emitted earlier during this event loop.
      this._endSync(newSyncSequence);
    }
  }

  /**
   * @internal
   */
  handleObjectMessages(objectMessages: ObjectMessage[]): void {
    if (this._state !== ObjectsState.synced) {
      // The client receives object messages in realtime over the channel concurrently with the sync sequence.
      // Some of the incoming object messages may have already been applied to the objects described in
      // the sync sequence, but others may not; therefore we must buffer these messages so that we can apply
      // them to the objects once the sync is complete.
      this._bufferedObjectOperations.push(...objectMessages);
      return;
    }

    this._applyObjectMessages(objectMessages);
  }

  /**
   * @internal
   * @spec RTO4
   */
  onAttached(hasObjects?: boolean): void {
    this._client.Logger.logAction(
      this._client.logger,
      this._client.Logger.LOG_MINOR,
      'Objects.onAttached()',
      `channel=${this._channel.name}, hasObjects=${hasObjects}`,
    );

    // RTO4a
    const fromInitializedState = this._state === ObjectsState.initialized;
    if (hasObjects || fromInitializedState) {
      // should always start a new sync sequence if we're in the initialized state, no matter the HAS_OBJECTS flag value.
      // this guarantees we emit both "syncing" -> "synced" events in that order.
      this._startNewSync();
    }

    // RTO4b
    if (!hasObjects) {
      // if no HAS_OBJECTS flag received on attach, we can end sync sequence immediately and treat it as no objects on a channel.
      // reset the objects pool to its initial state, and emit update events so subscribers to root object get notified about changes.
      this._objectsPool.resetToInitialPool(true); // RTO4b1, RTO4b2
      this._syncObjectsDataPool.clear(); // RTO4b3
      // defer the state change event until the next tick if we started a new sequence just now due to being in initialized state.
      // this allows any event listeners to process the start of the new sequence event that was emitted earlier during this event loop.
      this._endSync(fromInitializedState); // RTO4b4
    }
  }

  /**
   * @internal
   */
  actOnChannelState(state: API.ChannelState, hasObjects?: boolean): void {
    switch (state) {
      case 'attached':
        this.onAttached(hasObjects);
        break;

      case 'detached':
      case 'failed':
        // do not emit data update events as the actual current state of Objects data is unknown when we're in these channel states
        this._objectsPool.clearObjectsData(false);
        this._syncObjectsDataPool.clear();
        break;
    }
  }

  /**
   * @internal
   */
  async publish(objectMessages: ObjectMessage[]): Promise<void> {
    this._channel.throwIfUnpublishableState();

    const encodedMsgs = objectMessages.map((x) => x.encode(this._client));
    const maxMessageSize = this._client.options.maxMessageSize;
    const size = encodedMsgs.reduce((acc, msg) => acc + msg.getMessageSize(), 0);
    if (size > maxMessageSize) {
      throw new this._client.ErrorInfo(
        `Maximum size of object messages that can be published at once exceeded (was ${size} bytes; limit is ${maxMessageSize} bytes)`,
        40009,
        400,
      );
    }

    return this._channel.sendState(encodedMsgs);
  }

  /**
   * @internal
   */
  throwIfInvalidAccessApiConfiguration(): void {
    this._throwIfMissingChannelMode('object_subscribe');
    this._throwIfInChannelState(['detached', 'failed']);
  }

  /**
   * @internal
   */
  throwIfInvalidWriteApiConfiguration(): void {
    this._throwIfMissingChannelMode('object_publish');
    this._throwIfInChannelState(['detached', 'failed', 'suspended']);
    this._throwIfEchoMessagesDisabled();
  }

  private _startNewSync(syncId?: string, syncCursor?: string): void {
    // need to discard all buffered object operation messages on new sync start
    this._bufferedObjectOperations = [];
    this._syncObjectsDataPool.clear();
    this._currentSyncId = syncId;
    this._currentSyncCursor = syncCursor;
    this._stateChange(ObjectsState.syncing, false);
  }

  /** @spec RTO5c */
  private _endSync(deferStateEvent: boolean): void {
    this._applySync();
    // should apply buffered object operations after we applied the sync.
    // can use regular object messages application logic
    this._applyObjectMessages(this._bufferedObjectOperations);

    this._bufferedObjectOperations = [];
    this._syncObjectsDataPool.clear(); // RTO5c4
    this._currentSyncId = undefined; // RTO5c3
    this._currentSyncCursor = undefined; // RTO5c3
    this._stateChange(ObjectsState.synced, deferStateEvent);
  }

  private _parseSyncChannelSerial(syncChannelSerial: string | null | undefined): {
    syncId: string | undefined;
    syncCursor: string | undefined;
  } {
    let match: RegExpMatchArray | null;
    let syncId: string | undefined = undefined;
    let syncCursor: string | undefined = undefined;
    // RTO5a1 - syncChannelSerial is a two-part identifier: <sequence id>:<cursor value>
    if (syncChannelSerial && (match = syncChannelSerial.match(/^([\w-]+):(.*)$/))) {
      syncId = match[1];
      syncCursor = match[2];
    }

    return {
      syncId,
      syncCursor,
    };
  }

  private _applySync(): void {
    if (this._syncObjectsDataPool.isEmpty()) {
      return;
    }

    const receivedObjectIds = new Set<string>();
    const existingObjectUpdates: { object: LiveObject; update: LiveObjectUpdate | LiveObjectUpdateNoop }[] = [];

    // RTO5c1
    for (const [objectId, entry] of this._syncObjectsDataPool.entries()) {
      receivedObjectIds.add(objectId);
      const existingObject = this._objectsPool.get(objectId);

      // RTO5c1a
      if (existingObject) {
        const update = existingObject.overrideWithObjectState(entry.objectMessage); // RTO5c1a1
        // store updates to call subscription callbacks for all of them once the sync sequence is completed.
        // this will ensure that clients get notified about the changes only once everything has been applied.
        existingObjectUpdates.push({ object: existingObject, update });
        continue;
      }

      // RTO5c1b,
      let newObject: LiveObject;
      // assign to a variable so TS doesn't complain about 'never' type in the default case
      const objectType = entry.objectType;
      switch (objectType) {
        case 'LiveCounter':
          newObject = LiveCounter.fromObjectState(this, entry.objectMessage); // RTO5c1b1a
          break;

        case 'LiveMap':
          newObject = LiveMap.fromObjectState(this, entry.objectMessage); // RTO5c1b1b
          break;

        default:
          throw new this._client.ErrorInfo(`Unknown LiveObject type: ${objectType}`, 50000, 500); // RTO5c1b1c
      }

      this._objectsPool.set(objectId, newObject); // RTO5c1b1
    }

    // RTO5c2 - need to remove LiveObject instances from the ObjectsPool for which objectIds were not received during the sync sequence
    this._objectsPool.deleteExtraObjectIds([...receivedObjectIds]);

    // call subscription callbacks for all updated existing objects
    existingObjectUpdates.forEach(({ object, update }) => object.notifyUpdated(update));
  }

  private _applyObjectMessages(objectMessages: ObjectMessage[]): void {
    for (const objectMessage of objectMessages) {
      if (!objectMessage.operation) {
        this._client.Logger.logAction(
          this._client.logger,
          this._client.Logger.LOG_MAJOR,
          'Objects._applyObjectMessages()',
          `object operation message is received without 'operation' field, skipping message; message id: ${objectMessage.id}, channel: ${this._channel.name}`,
        );
        continue;
      }

      const objectOperation = objectMessage.operation;

      switch (objectOperation.action) {
        case ObjectOperationAction.MAP_CREATE:
        case ObjectOperationAction.COUNTER_CREATE:
        case ObjectOperationAction.MAP_SET:
        case ObjectOperationAction.MAP_REMOVE:
        case ObjectOperationAction.COUNTER_INC:
        case ObjectOperationAction.OBJECT_DELETE:
          // we can receive an op for an object id we don't have yet in the pool. instead of buffering such operations,
          // we can create a zero-value object for the provided object id and apply the operation to that zero-value object.
          // this also means that all objects are capable of applying the corresponding *_CREATE ops on themselves,
          // since they need to be able to eventually initialize themselves from that *_CREATE op.
          // so to simplify operations handling, we always try to create a zero-value object in the pool first,
          // and then we can always apply the operation on the existing object in the pool.
          this._objectsPool.createZeroValueObjectIfNotExists(objectOperation.objectId);
          this._objectsPool.get(objectOperation.objectId)!.applyOperation(objectOperation, objectMessage);
          break;

        default:
          this._client.Logger.logAction(
            this._client.logger,
            this._client.Logger.LOG_MAJOR,
            'Objects._applyObjectMessages()',
            `received unsupported action in object operation message: ${objectOperation.action}, skipping message; message id: ${objectMessage.id}, channel: ${this._channel.name}`,
          );
      }
    }
  }

  /** @spec RTO2 */
  private _throwIfMissingChannelMode(expectedMode: 'object_subscribe' | 'object_publish'): void {
    // RTO2a - channel.modes is only populated on channel attachment, so use it only if it is set
    if (this._channel.modes != null && !this._channel.modes.includes(expectedMode)) {
      throw new this._client.ErrorInfo(`"${expectedMode}" channel mode must be set for this operation`, 40024, 400); // RTO2a2
    }
    // RTO2b - otherwise as a best effort use user provided channel options
    if (!this._client.Utils.allToLowerCase(this._channel.channelOptions.modes ?? []).includes(expectedMode)) {
      throw new this._client.ErrorInfo(`"${expectedMode}" channel mode must be set for this operation`, 40024, 400); // RTO2b2
    }
  }

  private _stateChange(state: ObjectsState, deferEvent: boolean): void {
    if (this._state === state) {
      return;
    }

    this._state = state;
    const event = StateToEventsMap[state];
    if (!event) {
      return;
    }

    if (deferEvent) {
      this._client.Platform.Config.nextTick(() => {
        this._eventEmitterInternal.emit(event);
        this._eventEmitterPublic.emit(event);
      });
    } else {
      this._eventEmitterInternal.emit(event);
      this._eventEmitterPublic.emit(event);
    }
  }

  private _throwIfInChannelState(channelState: API.ChannelState[]): void {
    if (channelState.includes(this._channel.state)) {
      throw this._client.ErrorInfo.fromValues(this._channel.invalidStateError());
    }
  }

  private _throwIfEchoMessagesDisabled(): void {
    if (this._channel.client.options.echoMessages === false) {
      throw new this._channel.client.ErrorInfo(
        `"echoMessages" client option must be enabled for this operation`,
        40000,
        400,
      );
    }
  }
}
