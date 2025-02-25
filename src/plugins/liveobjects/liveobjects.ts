import type BaseClient from 'common/lib/client/baseclient';
import type RealtimeChannel from 'common/lib/client/realtimechannel';
import type EventEmitter from 'common/lib/util/eventemitter';
import type * as API from '../../../ably';
import { BatchContext } from './batchcontext';
import { DEFAULTS } from './defaults';
import { LiveCounter } from './livecounter';
import { LiveMap } from './livemap';
import { LiveObject, LiveObjectUpdate, LiveObjectUpdateNoop } from './liveobject';
import { LiveObjectsPool, ROOT_OBJECT_ID } from './liveobjectspool';
import { StateMessage, StateOperationAction } from './statemessage';
import { SyncLiveObjectsDataPool } from './syncliveobjectsdatapool';

export enum LiveObjectsEvent {
  syncing = 'syncing',
  synced = 'synced',
}

export enum LiveObjectsState {
  initialized = 'initialized',
  syncing = 'syncing',
  synced = 'synced',
}

const StateToEventsMap: Record<LiveObjectsState, LiveObjectsEvent | undefined> = {
  initialized: undefined,
  syncing: LiveObjectsEvent.syncing,
  synced: LiveObjectsEvent.synced,
};

export type LiveObjectsEventCallback = () => void;

export interface OnLiveObjectsEventResponse {
  off(): void;
}

export type BatchCallback = (batchContext: BatchContext) => void;

export class LiveObjects {
  private _client: BaseClient;
  private _channel: RealtimeChannel;
  private _state: LiveObjectsState;
  // composition over inheritance since we cannot import class directly into plugin code.
  // instead we obtain a class type from the client
  private _eventEmitterInternal: EventEmitter;
  // related to RTC10, should have a separate EventEmitter for users of the library
  private _eventEmitterPublic: EventEmitter;
  private _liveObjectsPool: LiveObjectsPool;
  private _syncLiveObjectsDataPool: SyncLiveObjectsDataPool;
  private _currentSyncId: string | undefined;
  private _currentSyncCursor: string | undefined;
  private _bufferedStateOperations: StateMessage[];

  // Used by tests
  static _DEFAULTS = DEFAULTS;

  constructor(channel: RealtimeChannel) {
    this._channel = channel;
    this._client = channel.client;
    this._state = LiveObjectsState.initialized;
    this._eventEmitterInternal = new this._client.EventEmitter(this._client.logger);
    this._eventEmitterPublic = new this._client.EventEmitter(this._client.logger);
    this._liveObjectsPool = new LiveObjectsPool(this);
    this._syncLiveObjectsDataPool = new SyncLiveObjectsDataPool(this);
    this._bufferedStateOperations = [];
  }

  /**
   * When called without a type variable, we return a default root type which is based on globally defined LiveObjects interface.
   * A user can provide an explicit type for the getRoot method to explicitly set the LiveObjects type structure on this particular channel.
   * This is useful when working with LiveObjects on multiple channels with different underlying data.
   */
  async getRoot<T extends API.LiveMapType = API.DefaultRoot>(): Promise<LiveMap<T>> {
    this.throwIfInvalidAccessApiConfiguration();

    // if we're not synced yet, wait for SYNC sequence to finish before returning root
    if (this._state !== LiveObjectsState.synced) {
      await this._eventEmitterInternal.once(LiveObjectsEvent.synced);
    }

    return this._liveObjectsPool.get(ROOT_OBJECT_ID) as LiveMap<T>;
  }

  /**
   * Provides access to the synchronous write API for LiveObjects that can be used to batch multiple operations together in a single channel message.
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

    const stateMessage = await LiveMap.createMapCreateMessage(this, entries);
    const objectId = stateMessage.operation?.objectId!;

    await this.publish([stateMessage]);

    // we may have already received the CREATE operation at this point, as it could arrive before the ACK for our publish message.
    // this means the object might already exist in the local pool, having been added during the usual CREATE operation process.
    // here we check if the object is present, and return it if found; otherwise, create a new object on the client side.
    if (this._liveObjectsPool.get(objectId)) {
      return this._liveObjectsPool.get(objectId) as LiveMap<T>;
    }

    // we haven't received the CREATE operation yet, so we can create a new map object using the locally constructed state operation.
    // we don't know the timeserials for map entries, so we assign an "earliest possible" timeserial to each entry, so that any subsequent operation can be applied to them.
    // we mark the CREATE operation as merged for the object, guaranteeing its idempotency and preventing it from being applied again when the operation arrives.
    const map = LiveMap.fromStateOperation<T>(this, stateMessage.operation!);
    this._liveObjectsPool.set(objectId, map);

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

    const stateMessage = await LiveCounter.createCounterCreateMessage(this, count);
    const objectId = stateMessage.operation?.objectId!;

    await this.publish([stateMessage]);

    // we may have already received the CREATE operation at this point, as it could arrive before the ACK for our publish message.
    // this means the object might already exist in the local pool, having been added during the usual CREATE operation process.
    // here we check if the object is present, and return it if found; otherwise, create a new object on the client side.
    if (this._liveObjectsPool.get(objectId)) {
      return this._liveObjectsPool.get(objectId) as LiveCounter;
    }

    // we haven't received the CREATE operation yet, so we can create a new counter object using the locally constructed state operation.
    // we mark the CREATE operation as merged for the object, guaranteeing its idempotency. this ensures we don't double count the initial counter value when the operation arrives.
    const counter = LiveCounter.fromStateOperation(this, stateMessage.operation!);
    this._liveObjectsPool.set(objectId, counter);

    return counter;
  }

  on(event: LiveObjectsEvent, callback: LiveObjectsEventCallback): OnLiveObjectsEventResponse {
    // this public API method can be called without specific configuration, so checking for invalid settings is unnecessary.
    this._eventEmitterPublic.on(event, callback);

    const off = () => {
      this._eventEmitterPublic.off(event, callback);
    };

    return { off };
  }

  off(event: LiveObjectsEvent, callback: LiveObjectsEventCallback): void {
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
  getPool(): LiveObjectsPool {
    return this._liveObjectsPool;
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
   */
  handleStateSyncMessages(stateMessages: StateMessage[], syncChannelSerial: string | null | undefined): void {
    const { syncId, syncCursor } = this._parseSyncChannelSerial(syncChannelSerial);
    const newSyncSequence = this._currentSyncId !== syncId;
    if (newSyncSequence) {
      this._startNewSync(syncId, syncCursor);
    }

    this._syncLiveObjectsDataPool.applyStateSyncMessages(stateMessages);

    // if this is the last (or only) message in a sequence of sync updates, end the sync
    if (!syncCursor) {
      // defer the state change event until the next tick if this was a new sync sequence
      // to allow any event listeners to process the start of the new sequence event that was emitted earlier during this event loop.
      this._endSync(newSyncSequence);
    }
  }

  /**
   * @internal
   */
  handleStateMessages(stateMessages: StateMessage[]): void {
    if (this._state !== LiveObjectsState.synced) {
      // The client receives state messages in realtime over the channel concurrently with the SYNC sequence.
      // Some of the incoming state messages may have already been applied to the state objects described in
      // the SYNC sequence, but others may not; therefore we must buffer these messages so that we can apply
      // them to the state objects once the SYNC is complete.
      this._bufferedStateOperations.push(...stateMessages);
      return;
    }

    this._applyStateMessages(stateMessages);
  }

  /**
   * @internal
   */
  onAttached(hasState?: boolean): void {
    this._client.Logger.logAction(
      this._client.logger,
      this._client.Logger.LOG_MINOR,
      'LiveObjects.onAttached()',
      `channel=${this._channel.name}, hasState=${hasState}`,
    );

    const fromInitializedState = this._state === LiveObjectsState.initialized;
    if (hasState || fromInitializedState) {
      // should always start a new sync sequence if we're in the initialized state, no matter the HAS_STATE flag value.
      // this guarantees we emit both "syncing" -> "synced" events in that order.
      this._startNewSync();
    }

    if (!hasState) {
      // if no HAS_STATE flag received on attach, we can end SYNC sequence immediately and treat it as no state on a channel.
      this._liveObjectsPool.reset();
      this._syncLiveObjectsDataPool.reset();
      // defer the state change event until the next tick if we started a new sequence just now due to being in initialized state.
      // this allows any event listeners to process the start of the new sequence event that was emitted earlier during this event loop.
      this._endSync(fromInitializedState);
    }
  }

  /**
   * @internal
   */
  actOnChannelState(state: API.ChannelState, hasState?: boolean): void {
    switch (state) {
      case 'attached':
        this.onAttached(hasState);
        break;

      case 'detached':
      case 'failed':
        this._liveObjectsPool.reset();
        this._syncLiveObjectsDataPool.reset();
        break;
    }
  }

  /**
   * @internal
   */
  async publish(stateMessages: StateMessage[]): Promise<void> {
    if (!this._channel.connectionManager.activeState()) {
      throw this._channel.connectionManager.getError();
    }

    if (this._channel.state === 'failed' || this._channel.state === 'suspended') {
      throw this._client.ErrorInfo.fromValues(this._channel.invalidStateError());
    }

    stateMessages.forEach((x) => StateMessage.encode(x, this._client.MessageEncoding));
    const maxMessageSize = this._client.options.maxMessageSize;
    const size = stateMessages.reduce((acc, msg) => acc + msg.getMessageSize(), 0);
    if (size > maxMessageSize) {
      throw new this._client.ErrorInfo(
        `Maximum size of state messages that can be published at once exceeded (was ${size} bytes; limit is ${maxMessageSize} bytes)`,
        40009,
        400,
      );
    }

    return this._channel.sendState(stateMessages);
  }

  /**
   * @internal
   */
  throwIfInvalidAccessApiConfiguration(): void {
    this._throwIfMissingChannelMode('state_subscribe');
    this._throwIfInChannelState(['detached', 'failed']);
  }

  /**
   * @internal
   */
  throwIfInvalidWriteApiConfiguration(): void {
    this._throwIfMissingChannelMode('state_publish');
    this._throwIfInChannelState(['detached', 'failed', 'suspended']);
  }

  private _startNewSync(syncId?: string, syncCursor?: string): void {
    // need to discard all buffered state operation messages on new sync start
    this._bufferedStateOperations = [];
    this._syncLiveObjectsDataPool.reset();
    this._currentSyncId = syncId;
    this._currentSyncCursor = syncCursor;
    this._stateChange(LiveObjectsState.syncing, false);
  }

  private _endSync(deferStateEvent: boolean): void {
    this._applySync();
    // should apply buffered state operations after we applied the SYNC data.
    // can use regular state messages application logic
    this._applyStateMessages(this._bufferedStateOperations);

    this._bufferedStateOperations = [];
    this._syncLiveObjectsDataPool.reset();
    this._currentSyncId = undefined;
    this._currentSyncCursor = undefined;
    this._stateChange(LiveObjectsState.synced, deferStateEvent);
  }

  private _parseSyncChannelSerial(syncChannelSerial: string | null | undefined): {
    syncId: string | undefined;
    syncCursor: string | undefined;
  } {
    let match: RegExpMatchArray | null;
    let syncId: string | undefined = undefined;
    let syncCursor: string | undefined = undefined;
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
    if (this._syncLiveObjectsDataPool.isEmpty()) {
      return;
    }

    const receivedObjectIds = new Set<string>();
    const existingObjectUpdates: { object: LiveObject; update: LiveObjectUpdate | LiveObjectUpdateNoop }[] = [];

    for (const [objectId, entry] of this._syncLiveObjectsDataPool.entries()) {
      receivedObjectIds.add(objectId);
      const existingObject = this._liveObjectsPool.get(objectId);

      if (existingObject) {
        const update = existingObject.overrideWithStateObject(entry.stateObject);
        // store updates to call subscription callbacks for all of them once the SYNC sequence is completed.
        // this will ensure that clients get notified about the changes only once everything has been applied.
        existingObjectUpdates.push({ object: existingObject, update });
        continue;
      }

      let newObject: LiveObject;
      // assign to a variable so TS doesn't complain about 'never' type in the default case
      const objectType = entry.objectType;
      switch (objectType) {
        case 'LiveCounter':
          newObject = LiveCounter.fromStateObject(this, entry.stateObject);
          break;

        case 'LiveMap':
          newObject = LiveMap.fromStateObject(this, entry.stateObject);
          break;

        default:
          throw new this._client.ErrorInfo(`Unknown Live Object type: ${objectType}`, 50000, 500);
      }

      this._liveObjectsPool.set(objectId, newObject);
    }

    // need to remove LiveObject instances from the LiveObjectsPool for which objectIds were not received during the SYNC sequence
    this._liveObjectsPool.deleteExtraObjectIds([...receivedObjectIds]);

    // call subscription callbacks for all updated existing objects
    existingObjectUpdates.forEach(({ object, update }) => object.notifyUpdated(update));
  }

  private _applyStateMessages(stateMessages: StateMessage[]): void {
    for (const stateMessage of stateMessages) {
      if (!stateMessage.operation) {
        this._client.Logger.logAction(
          this._client.logger,
          this._client.Logger.LOG_MAJOR,
          'LiveObjects._applyStateMessages()',
          `state operation message is received without 'operation' field, skipping message; message id: ${stateMessage.id}, channel: ${this._channel.name}`,
        );
        continue;
      }

      const stateOperation = stateMessage.operation;

      switch (stateOperation.action) {
        case StateOperationAction.MAP_CREATE:
        case StateOperationAction.COUNTER_CREATE:
        case StateOperationAction.MAP_SET:
        case StateOperationAction.MAP_REMOVE:
        case StateOperationAction.COUNTER_INC:
        case StateOperationAction.OBJECT_DELETE:
          // we can receive an op for an object id we don't have yet in the pool. instead of buffering such operations,
          // we can create a zero-value object for the provided object id and apply the operation to that zero-value object.
          // this also means that all objects are capable of applying the corresponding *_CREATE ops on themselves,
          // since they need to be able to eventually initialize themselves from that *_CREATE op.
          // so to simplify operations handling, we always try to create a zero-value object in the pool first,
          // and then we can always apply the operation on the existing object in the pool.
          this._liveObjectsPool.createZeroValueObjectIfNotExists(stateOperation.objectId);
          this._liveObjectsPool.get(stateOperation.objectId)!.applyOperation(stateOperation, stateMessage);
          break;

        default:
          this._client.Logger.logAction(
            this._client.logger,
            this._client.Logger.LOG_MAJOR,
            'LiveObjects._applyStateMessages()',
            `received unsupported action in state operation message: ${stateOperation.action}, skipping message; message id: ${stateMessage.id}, channel: ${this._channel.name}`,
          );
      }
    }
  }

  private _throwIfMissingChannelMode(expectedMode: 'state_subscribe' | 'state_publish'): void {
    // channel.modes is only populated on channel attachment, so use it only if it is set,
    // otherwise as a best effort use user provided channel options
    if (this._channel.modes != null && !this._channel.modes.includes(expectedMode)) {
      throw new this._client.ErrorInfo(`"${expectedMode}" channel mode must be set for this operation`, 40024, 400);
    }
    if (!this._client.Utils.allToLowerCase(this._channel.channelOptions.modes ?? []).includes(expectedMode)) {
      throw new this._client.ErrorInfo(`"${expectedMode}" channel mode must be set for this operation`, 40024, 400);
    }
  }

  private _stateChange(state: LiveObjectsState, deferEvent: boolean): void {
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
}
