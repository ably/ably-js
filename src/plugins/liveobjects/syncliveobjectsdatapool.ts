import type BaseClient from 'common/lib/client/baseclient';
import type RealtimeChannel from 'common/lib/client/realtimechannel';
import { Objects } from './liveobjects';
import { StateMessage, StateObject } from './statemessage';

export interface LiveObjectDataEntry {
  stateObject: StateObject;
  objectType: 'LiveMap' | 'LiveCounter';
}

export interface LiveCounterDataEntry extends LiveObjectDataEntry {
  objectType: 'LiveCounter';
}

export interface LiveMapDataEntry extends LiveObjectDataEntry {
  objectType: 'LiveMap';
}

export type AnyDataEntry = LiveCounterDataEntry | LiveMapDataEntry;

// TODO: investigate if this class is still needed after changes with createOp. objects are now initialized from the stateObject and this class does minimal processing
/**
 * @internal
 */
export class SyncObjectsDataPool {
  private _client: BaseClient;
  private _channel: RealtimeChannel;
  private _pool: Map<string, AnyDataEntry>;

  constructor(private _objects: Objects) {
    this._client = this._objects.getClient();
    this._channel = this._objects.getChannel();
    this._pool = new Map<string, AnyDataEntry>();
  }

  entries() {
    return this._pool.entries();
  }

  size(): number {
    return this._pool.size;
  }

  isEmpty(): boolean {
    return this._pool.size === 0;
  }

  reset(): void {
    this._pool.clear();
  }

  applyStateSyncMessages(stateMessages: StateMessage[]): void {
    for (const stateMessage of stateMessages) {
      if (!stateMessage.object) {
        this._client.Logger.logAction(
          this._client.logger,
          this._client.Logger.LOG_MAJOR,
          'SyncObjectsDataPool.applyStateSyncMessages()',
          `state object message is received during SYNC without 'object' field, skipping message; message id: ${stateMessage.id}, channel: ${this._channel.name}`,
        );
        continue;
      }

      const stateObject = stateMessage.object;

      if (stateObject.counter) {
        this._pool.set(stateObject.objectId, this._createLiveCounterDataEntry(stateObject));
      } else if (stateObject.map) {
        this._pool.set(stateObject.objectId, this._createLiveMapDataEntry(stateObject));
      } else {
        this._client.Logger.logAction(
          this._client.logger,
          this._client.Logger.LOG_MAJOR,
          'SyncObjectsDataPool.applyStateSyncMessages()',
          `received unsupported state object message during SYNC, expected 'counter' or 'map' to be present, skipping message; message id: ${stateMessage.id}, channel: ${this._channel.name}`,
        );
      }
    }
  }

  private _createLiveCounterDataEntry(stateObject: StateObject): LiveCounterDataEntry {
    const newEntry: LiveCounterDataEntry = {
      stateObject,
      objectType: 'LiveCounter',
    };

    return newEntry;
  }

  private _createLiveMapDataEntry(stateObject: StateObject): LiveMapDataEntry {
    const newEntry: LiveMapDataEntry = {
      stateObject,
      objectType: 'LiveMap',
    };

    return newEntry;
  }
}
