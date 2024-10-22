import type BaseClient from 'common/lib/client/baseclient';
import type RealtimeChannel from 'common/lib/client/realtimechannel';
import type * as API from '../../../ably';
import { LiveCounter } from './livecounter';
import { LiveMap } from './livemap';
import { LiveObject } from './liveobject';
import { LiveObjectsPool, ROOT_OBJECT_ID } from './liveobjectspool';
import { StateMessage } from './statemessage';
import { SyncLiveObjectsDataPool } from './syncliveobjectsdatapool';

export class LiveObjects {
  private _client: BaseClient;
  private _channel: RealtimeChannel;
  private _liveObjectsPool: LiveObjectsPool;
  private _syncLiveObjectsDataPool: SyncLiveObjectsDataPool;
  private _syncInProgress: boolean;
  private _currentSyncId: string | undefined;
  private _currentSyncCursor: string | undefined;

  constructor(channel: RealtimeChannel) {
    this._channel = channel;
    this._client = channel.client;
    this._liveObjectsPool = new LiveObjectsPool(this);
    this._syncLiveObjectsDataPool = new SyncLiveObjectsDataPool(this);
    this._syncInProgress = true;
  }

  async getRoot(): Promise<LiveMap> {
    // TODO: wait for SYNC sequence to finish to return root
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
  handleStateSyncMessage(stateMessages: StateMessage[], syncChannelSerial: string | null | undefined): void {
    const { syncId, syncCursor } = this._parseSyncChannelSerial(syncChannelSerial);
    if (this._currentSyncId !== syncId) {
      this._startNewSync(syncId, syncCursor);
    }

    this._syncLiveObjectsDataPool.applyStateMessages(stateMessages);

    // if this is the last (or only) message in a sequence of sync updates, end the sync
    if (!syncCursor) {
      this._endSync();
    }
  }

  /**
   * @internal
   */
  onAttached(hasState?: boolean): void {
    this._client.Logger.logAction(
      this._client.logger,
      this._client.Logger.LOG_MINOR,
      'LiveObjects.onAttached()',
      'channel = ' + this._channel.name + ', hasState = ' + hasState,
    );

    if (hasState) {
      this._startNewSync(undefined);
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
    this._syncLiveObjectsDataPool.reset();
    this._currentSyncId = syncId;
    this._currentSyncCursor = syncCursor;
    this._syncInProgress = true;
  }

  private _endSync(): void {
    this._applySync();
    this._syncLiveObjectsDataPool.reset();
    this._currentSyncId = undefined;
    this._currentSyncCursor = undefined;
    this._syncInProgress = false;
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

      if (existingObject) {
        existingObject.setData(entry.objectData);
        existingObject.setRegionalTimeserial(entry.regionalTimeserial);
        continue;
      }

      let newObject: LiveObject;
      // assign to a variable so TS doesn't complain about 'never' type in the default case
      const objectType = entry.objectType;
      switch (objectType) {
        case 'LiveCounter':
          newObject = new LiveCounter(this, entry.objectData, objectId);
          break;

        case 'LiveMap':
          newObject = new LiveMap(this, entry.semantics, entry.objectData, objectId);
          break;

        default:
          throw new this._client.ErrorInfo(`Unknown live object type: ${objectType}`, 40000, 400);
      }
      newObject.setRegionalTimeserial(entry.regionalTimeserial);

      this._liveObjectsPool.set(objectId, newObject);
    }

    // need to remove LiveObject instances from the LiveObjectsPool for which objectIds were not received during the SYNC sequence
    this._liveObjectsPool.deleteExtraObjectIds([...receivedObjectIds]);
  }
}
