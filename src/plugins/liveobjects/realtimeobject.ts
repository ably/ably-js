import type BaseClient from 'common/lib/client/baseclient';
import type RealtimeChannel from 'common/lib/client/realtimechannel';
import type EventEmitter from 'common/lib/util/eventemitter';
import type * as API from '../../../ably';
import type { ChannelState, StatusSubscription } from '../../../ably';
import type * as ObjectsApi from '../../../liveobjects';
import { DEFAULTS } from './defaults';
import { LiveCounter } from './livecounter';
import { LiveMap } from './livemap';
import { LiveObject, LiveObjectUpdate, LiveObjectUpdateNoop } from './liveobject';
import { ObjectMessage, ObjectOperationAction } from './objectmessage';
import { ObjectsPool } from './objectspool';
import { DefaultPathObject } from './pathobject';
import { PathObjectSubscriptionRegister } from './pathobjectsubscriptionregister';
import { SyncObjectsDataPool } from './syncobjectsdatapool';

export enum ObjectsEvent {
  syncing = 'syncing',
  synced = 'synced',
}

/** @spec RTO22 */
export enum ObjectsOperationSource {
  local = 'local',
  channel = 'channel',
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

export class RealtimeObject {
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
  private _appliedOnAckSerials: Set<string>; // RTO7b
  private _pathObjectSubscriptionRegister: PathObjectSubscriptionRegister;

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
    this._appliedOnAckSerials = new Set(); // RTO7b1
    this._pathObjectSubscriptionRegister = new PathObjectSubscriptionRegister(this);
    // use server-provided objectsGCGracePeriod if available, and subscribe to new connectionDetails that can be emitted as part of the RTN24
    this.gcGracePeriod =
      this._channel.connectionManager.connectionDetails?.objectsGCGracePeriod ?? DEFAULTS.gcGracePeriod;
    this._channel.connectionManager.on('connectiondetails', (details: Record<string, any>) => {
      this.gcGracePeriod = details.objectsGCGracePeriod ?? DEFAULTS.gcGracePeriod;
    });
  }

  /**
   * When called without a type variable, we return a default root type which is based on globally defined interface for Objects feature.
   * A user can provide an explicit type for the this method to explicitly set the type structure on this particular channel.
   * This is useful when working with multiple channels with different underlying data structure.
   */
  async get<T extends Record<string, ObjectsApi.Value>>(): Promise<ObjectsApi.PathObject<ObjectsApi.LiveMap<T>>> {
    this._throwIfMissingChannelMode('object_subscribe');

    // implicit attach before proceeding
    await this._channel.ensureAttached();

    // if we're not synced yet, wait for sync sequence to finish before returning root
    if (this._state !== ObjectsState.synced) {
      await this._eventEmitterInternal.once(ObjectsEvent.synced); // RTO1c
    }

    const pathObject = new DefaultPathObject(this, this._objectsPool.getRoot(), []);
    return pathObject;
  }

  on(event: ObjectsEvent, callback: ObjectsEventCallback): StatusSubscription {
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
   */
  getPathObjectSubscriptionRegister(): PathObjectSubscriptionRegister {
    return this._pathObjectSubscriptionRegister;
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
      this._endSync();
    }
  }

  /**
   * @internal
   * @spec RTO8
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

    this._applyObjectMessages(objectMessages, ObjectsOperationSource.channel); // RTO8b
  }

  /**
   * @internal
   * @spec RTO4
   */
  onAttached(hasObjects?: boolean): void {
    this._client.Logger.logAction(
      this._client.logger,
      this._client.Logger.LOG_MINOR,
      'RealtimeObject.onAttached()',
      `channel=${this._channel.name}, hasObjects=${hasObjects}`,
    );

    // RTO4a
    this._startNewSync();

    // RTO4b
    if (!hasObjects) {
      // if no HAS_OBJECTS flag received on attach, we can end sync sequence immediately and treat it as no objects on a channel.
      // reset the objects pool to its initial state, and emit update events so subscribers to root object get notified about changes.
      this._objectsPool.resetToInitialPool(true); // RTO4b1, RTO4b2
      this._syncObjectsDataPool.clear(); // RTO4b3
      this._endSync(); // RTO4b4
    }
  }

  /**
   * @internal
   */
  actOnChannelState(state: ChannelState, hasObjects?: boolean): void {
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
   * @spec RTO15
   */
  async publish(objectMessages: ObjectMessage[]): Promise<API.PublishResult> {
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

    // RTO15h
    return this._channel.sendState(encodedMsgs);
  }

  /**
   * Publishes ObjectMessages and applies them locally upon receiving the ACK from the server.
   *
   * @internal
   * @spec RTO20
   */
  async publishAndApply(objectMessages: ObjectMessage[]): Promise<void> {
    // RTO20b
    const publishResult = await this.publish(objectMessages);

    this._client.Logger.logAction(
      this._client.logger,
      this._client.Logger.LOG_MICRO,
      'RealtimeObject.publishAndApply()',
      `received ACK for ${objectMessages.length} message(s), applying locally; channel=${this._channel.name}`,
    );

    // RTO20c - check required information is available
    const siteCode = this._channel.connectionManager.connectionDetails?.siteCode;
    // RTO20c1
    if (!siteCode) {
      this._client.Logger.logAction(
        this._client.logger,
        this._client.Logger.LOG_ERROR,
        'RealtimeObject.publishAndApply()',
        `operations will not be applied locally: siteCode not available from connectionDetails; channel=${this._channel.name}`,
      );
      return;
    }
    // RTO20c2
    if (!publishResult.serials || publishResult.serials.length !== objectMessages.length) {
      this._client.Logger.logAction(
        this._client.logger,
        this._client.Logger.LOG_ERROR,
        'RealtimeObject.publishAndApply()',
        `operations will not be applied locally: PublishResult.serials has unexpected length (expected ${objectMessages.length}, got ${publishResult.serials?.length}); channel=${this._channel.name}`,
      );
      return;
    }

    // RTO20d
    const syntheticMessages: ObjectMessage[] = [];
    for (let i = 0; i < objectMessages.length; i++) {
      const serial = publishResult.serials[i];

      // RTO20d1
      if (serial === null) {
        this._client.Logger.logAction(
          this._client.logger,
          this._client.Logger.LOG_MICRO,
          'RealtimeObject.publishAndApply()',
          `operation will not be applied locally: serial is null in PublishResult (index ${i}); channel=${this._channel.name}`,
        );
        continue;
      }

      // RTO20d2, RTO20d3
      syntheticMessages.push(
        ObjectMessage.fromValues(
          {
            ...objectMessages[i],
            serial, // RTO20d2a
            siteCode, // RTO20d2b
          },
          this._client.Utils,
          this._client.MessageEncoding,
        ),
      );
    }

    // RTO20e - Wait for sync to complete if not synced
    if (this._state !== ObjectsState.synced) {
      this._client.Logger.logAction(
        this._client.logger,
        this._client.Logger.LOG_MICRO,
        'RealtimeObject.publishAndApply()',
        `waiting for sync to complete before applying ${syntheticMessages.length} message(s); channel=${this._channel.name}`,
      );

      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          this._eventEmitterInternal.off(onSynced);
          this._channel.internalStateChanges.off(onChannelState);
        };
        const onSynced = () => {
          cleanup();
          resolve();
        };
        // RTO20e1
        const onChannelState = () => {
          cleanup();
          reject(
            new this._client.ErrorInfo(
              `the operation could not be applied locally due to the channel entering the ${this._channel.state} state whilst waiting for objects sync to complete`,
              92008,
              400,
              this._channel.errorReason || undefined,
            ),
          );
        };
        this._eventEmitterInternal.once(ObjectsEvent.synced, onSynced);
        this._channel.internalStateChanges.once(['detached', 'suspended', 'failed'], onChannelState);
      });
    }

    // RTO20f - Apply synthetic messages
    this._client.Logger.logAction(
      this._client.logger,
      this._client.Logger.LOG_MICRO,
      'RealtimeObject.publishAndApply()',
      `applying ${syntheticMessages.length} message(s); channel=${this._channel.name}`,
    );
    this._applyObjectMessages(syntheticMessages, ObjectsOperationSource.local);
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
    this._stateChange(ObjectsState.syncing);
  }

  /** @spec RTO5c */
  private _endSync(): void {
    this._applySync();
    // should apply buffered object operations after we applied the sync.
    // can use regular object messages application logic
    this._applyObjectMessages(this._bufferedObjectOperations, ObjectsOperationSource.channel); // RTO5c6

    this._bufferedObjectOperations = [];
    this._syncObjectsDataPool.clear(); // RTO5c4
    this._currentSyncId = undefined; // RTO5c3
    this._currentSyncCursor = undefined; // RTO5c3

    // RTO5c9 - Clear appliedOnAckSerials
    this._appliedOnAckSerials.clear();

    this._stateChange(ObjectsState.synced);
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
    const existingObjectUpdates: {
      object: LiveObject;
      update: LiveObjectUpdate | LiveObjectUpdateNoop;
    }[] = [];

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

    // Rebuild all parent references after sync to ensure all object-to-object references are properly established
    // This is necessary because objects may reference other objects that weren't in the pool when they were initially created
    this._rebuildAllParentReferences();

    // call subscription callbacks for all updated existing objects.
    existingObjectUpdates.forEach(({ object, update }) => object.notifyUpdated(update));
  }

  /** @spec RTO9 */
  private _applyObjectMessages(objectMessages: ObjectMessage[], source: ObjectsOperationSource): void {
    for (const objectMessage of objectMessages) {
      if (!objectMessage.operation) {
        this._client.Logger.logAction(
          this._client.logger,
          this._client.Logger.LOG_MAJOR,
          'RealtimeObject._applyObjectMessages()',
          `object operation message is received without 'operation' field, skipping message; message id: ${objectMessage.id}, channel: ${this._channel.name}`,
        );
        continue;
      }

      const serial = objectMessage.serial;

      // RTO9a3 - Skip if already applied on ACK
      if (serial && this._appliedOnAckSerials.has(serial)) {
        this._client.Logger.logAction(
          this._client.logger,
          this._client.Logger.LOG_MICRO,
          'RealtimeObject._applyObjectMessages()',
          `skipping message: already applied on ACK; serial=${serial}, channel=${this._channel.name}`,
        );
        this._appliedOnAckSerials.delete(serial);
        continue;
      }

      const objectOperation = objectMessage.operation;

      switch (objectOperation.action) {
        case ObjectOperationAction.MAP_CREATE:
        case ObjectOperationAction.COUNTER_CREATE:
        case ObjectOperationAction.MAP_SET:
        case ObjectOperationAction.MAP_REMOVE:
        case ObjectOperationAction.COUNTER_INC:
        case ObjectOperationAction.OBJECT_DELETE: {
          // we can receive an op for an object id we don't have yet in the pool. instead of buffering such operations,
          // we can create a zero-value object for the provided object id and apply the operation to that zero-value object.
          // this also means that all objects are capable of applying the corresponding *_CREATE ops on themselves,
          // since they need to be able to eventually initialize themselves from that *_CREATE op.
          // so to simplify operations handling, we always try to create a zero-value object in the pool first,
          // and then we can always apply the operation on the existing object in the pool.
          this._objectsPool.createZeroValueObjectIfNotExists(objectOperation.objectId);
          const applied = this._objectsPool
            .get(objectOperation.objectId)!
            .applyOperation(objectOperation, objectMessage, source); // RTO9a2a3

          // RTO9a2a4
          if (source === ObjectsOperationSource.local && applied && serial) {
            this._appliedOnAckSerials.add(serial);
          }
          break;
        }

        default:
          this._client.Logger.logAction(
            this._client.logger,
            this._client.Logger.LOG_MAJOR,
            'RealtimeObject._applyObjectMessages()',
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

  private _stateChange(state: ObjectsState): void {
    if (this._state === state) {
      return;
    }

    this._state = state;
    const event = StateToEventsMap[state];
    if (!event) {
      return;
    }

    this._eventEmitterInternal.emit(event);
    this._eventEmitterPublic.emit(event);
  }

  /**
   * Rebuilds all parent references in the objects pool.
   * This is necessary after sync operations where objects may reference other objects
   * that weren't available when the initial parent references were established.
   */
  private _rebuildAllParentReferences(): void {
    // First, clear all existing parent references
    for (const object of this._objectsPool.getAll()) {
      object.clearParentReferences();
    }

    // Then, rebuild parent references by examining all objects and their data
    for (const object of this._objectsPool.getAll()) {
      if (object instanceof LiveMap) {
        // For LiveMaps, iterate through their entries and establish parent references
        for (const [key, value] of object.entries()) {
          if (value instanceof LiveObject) {
            value.addParentReference(object, key);
          }
        }
      }
      // Note: LiveCounter doesn't reference other objects, so no special handling needed
    }
  }

  private _throwIfInChannelState(channelState: ChannelState[]): void {
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
