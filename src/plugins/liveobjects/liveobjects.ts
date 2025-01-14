import type BaseClient from 'common/lib/client/baseclient';
import type RealtimeChannel from 'common/lib/client/realtimechannel';
import type EventEmitter from 'common/lib/util/eventemitter';
import type * as API from '../../../ably';
import { DEFAULTS } from './defaults';
import { LiveCounter } from './livecounter';
import { LiveMap } from './livemap';
import { LiveObject, LiveObjectUpdate, LiveObjectUpdateNoop } from './liveobject';
import { LiveObjectsPool, ROOT_OBJECT_ID } from './liveobjectspool';
import { StateMessage, StateOperationAction } from './statemessage';
import { SyncLiveObjectsDataPool } from './syncliveobjectsdatapool';

enum LiveObjectsEvents {
  SyncCompleted = 'SyncCompleted',
}

export class LiveObjects {
  private _client: BaseClient;
  private _channel: RealtimeChannel;
  // composition over inheritance since we cannot import class directly into plugin code.
  // instead we obtain a class type from the client
  private _eventEmitter: EventEmitter;
  private _liveObjectsPool: LiveObjectsPool;
  private _syncLiveObjectsDataPool: SyncLiveObjectsDataPool;
  private _syncInProgress: boolean;
  private _currentSyncId: string | undefined;
  private _currentSyncCursor: string | undefined;
  private _bufferedStateOperations: StateMessage[];

  // Used by tests
  static _DEFAULTS = DEFAULTS;

  constructor(channel: RealtimeChannel) {
    this._channel = channel;
    this._client = channel.client;
    this._eventEmitter = new this._client.EventEmitter(this._client.logger);
    this._liveObjectsPool = new LiveObjectsPool(this);
    this._syncLiveObjectsDataPool = new SyncLiveObjectsDataPool(this);
    this._syncInProgress = true;
    this._bufferedStateOperations = [];
  }

  /**
   * When called without a type variable, we return a default root type which is based on globally defined LiveObjects interface.
   * A user can provide an explicit type for the getRoot method to explicitly set the LiveObjects type structure on this particular channel.
   * This is useful when working with LiveObjects on multiple channels with different underlying data.
   */
  async getRoot<T extends API.LiveMapType = API.DefaultRoot>(): Promise<LiveMap<T>> {
    // SYNC is currently in progress, wait for SYNC sequence to finish
    if (this._syncInProgress) {
      await this._eventEmitter.once(LiveObjectsEvents.SyncCompleted);
    }

    return this._liveObjectsPool.get(ROOT_OBJECT_ID) as LiveMap<T>;
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
    if (this._currentSyncId !== syncId) {
      this._startNewSync(syncId, syncCursor);
    }

    this._syncLiveObjectsDataPool.applyStateSyncMessages(stateMessages);

    // if this is the last (or only) message in a sequence of sync updates, end the sync
    if (!syncCursor) {
      this._endSync();
    }
  }

  /**
   * @internal
   */
  handleStateMessages(stateMessages: StateMessage[]): void {
    if (this._syncInProgress) {
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

    if (hasState) {
      this._startNewSync();
    } else {
      // no HAS_STATE flag received on attach, can end SYNC sequence immediately
      // and treat it as no state on a channel
      this._liveObjectsPool.reset();
      this._syncLiveObjectsDataPool.reset();
      this._endSync();
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
        // TODO: do something
        break;

      case 'suspended':
        // TODO: do something
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

    return this._channel.sendState(stateMessages);
  }

  private _startNewSync(syncId?: string, syncCursor?: string): void {
    // need to discard all buffered state operation messages on new sync start
    this._bufferedStateOperations = [];
    this._syncLiveObjectsDataPool.reset();
    this._currentSyncId = syncId;
    this._currentSyncCursor = syncCursor;
    this._syncInProgress = true;
  }

  private _endSync(): void {
    this._applySync();
    // should apply buffered state operations after we applied the SYNC data.
    // can use regular state messages application logic
    this._applyStateMessages(this._bufferedStateOperations);

    this._bufferedStateOperations = [];
    this._syncLiveObjectsDataPool.reset();
    this._currentSyncId = undefined;
    this._currentSyncCursor = undefined;
    this._syncInProgress = false;
    this._eventEmitter.emit(LiveObjectsEvents.SyncCompleted);
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
          throw new this._client.ErrorInfo(`Unknown live object type: ${objectType}`, 50000, 500);
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
}
