import type BaseClient from 'common/lib/client/baseclient';
import type RealtimeChannel from 'common/lib/client/realtimechannel';
import type EventEmitter from 'common/lib/util/eventemitter';
import type * as API from '../../../ably';
import { LiveCounter } from './livecounter';
import { LiveMap } from './livemap';
import { LiveObject } from './liveobject';
import { LiveObjectsPool, ROOT_OBJECT_ID } from './liveobjectspool';
import { StateMessage } from './statemessage';
import { LiveCounterDataEntry, SyncLiveObjectsDataPool } from './syncliveobjectsdatapool';
import { DefaultTimeserial, Timeserial } from './timeserial';

enum LiveObjectsEvents {
  SyncCompleted = 'SyncCompleted',
}

export interface BufferedStateMessage {
  stateMessage: StateMessage;
  regionalTimeserial: Timeserial;
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
  private _bufferedStateOperations: BufferedStateMessage[];

  constructor(channel: RealtimeChannel) {
    this._channel = channel;
    this._client = channel.client;
    this._eventEmitter = new this._client.EventEmitter(this._client.logger);
    this._liveObjectsPool = new LiveObjectsPool(this);
    this._syncLiveObjectsDataPool = new SyncLiveObjectsDataPool(this);
    this._syncInProgress = true;
    this._bufferedStateOperations = [];
  }

  async getRoot(): Promise<LiveMap> {
    // SYNC is currently in progress, wait for SYNC sequence to finish
    if (this._syncInProgress) {
      await this._eventEmitter.once(LiveObjectsEvents.SyncCompleted);
    }

    return this._liveObjectsPool.get(ROOT_OBJECT_ID) as LiveMap;
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
  handleStateMessages(stateMessages: StateMessage[], msgRegionalTimeserial: string | null | undefined): void {
    const timeserial = DefaultTimeserial.calculateTimeserial(this._client, msgRegionalTimeserial);

    if (this._syncInProgress) {
      // The client receives state messages in realtime over the channel concurrently with the SYNC sequence.
      // Some of the incoming state messages may have already been applied to the state objects described in
      // the SYNC sequence, but others may not; therefore we must buffer these messages so that we can apply
      // them to the state objects once the SYNC is complete. To avoid double-counting, the buffered operations
      // are applied according to the state object's regional timeserial, which reflects the regional timeserial
      // of the state message that was last applied to that state object.
      stateMessages.forEach((x) =>
        this._bufferedStateOperations.push({ stateMessage: x, regionalTimeserial: timeserial }),
      );
      return;
    }

    this._liveObjectsPool.applyStateMessages(stateMessages, timeserial);
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
    // should apply buffered state operations after we applied the SYNC data
    this._liveObjectsPool.applyBufferedStateMessages(this._bufferedStateOperations);

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

    for (const [objectId, entry] of this._syncLiveObjectsDataPool.entries()) {
      receivedObjectIds.add(objectId);
      const existingObject = this._liveObjectsPool.get(objectId);
      const regionalTimeserialObj = DefaultTimeserial.calculateTimeserial(this._client, entry.regionalTimeserial);

      if (existingObject) {
        existingObject.setData(entry.objectData);
        existingObject.setRegionalTimeserial(regionalTimeserialObj);
        if (existingObject instanceof LiveCounter) {
          existingObject.setCreated((entry as LiveCounterDataEntry).created);
        }
        continue;
      }

      let newObject: LiveObject;
      // assign to a variable so TS doesn't complain about 'never' type in the default case
      const objectType = entry.objectType;
      switch (objectType) {
        case 'LiveCounter':
          newObject = new LiveCounter(this, entry.created, entry.objectData, objectId, regionalTimeserialObj);
          break;

        case 'LiveMap':
          newObject = new LiveMap(this, entry.semantics, entry.objectData, objectId, regionalTimeserialObj);
          break;

        default:
          throw new this._client.ErrorInfo(`Unknown live object type: ${objectType}`, 50000, 500);
      }

      this._liveObjectsPool.set(objectId, newObject);
    }

    // need to remove LiveObject instances from the LiveObjectsPool for which objectIds were not received during the SYNC sequence
    this._liveObjectsPool.deleteExtraObjectIds([...receivedObjectIds]);
  }
}
