import type BaseClient from 'common/lib/client/baseclient';
import type RealtimeChannel from 'common/lib/client/realtimechannel';
import { ObjectMessage } from './objectmessage';
import { Objects } from './objects';

export interface LiveObjectDataEntry {
  objectMessage: ObjectMessage;
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

  clear(): void {
    this._pool.clear();
  }

  applyObjectSyncMessages(objectMessages: ObjectMessage[]): void {
    for (const objectMessage of objectMessages) {
      if (!objectMessage.object) {
        this._client.Logger.logAction(
          this._client.logger,
          this._client.Logger.LOG_MAJOR,
          'SyncObjectsDataPool.applyObjectSyncMessages()',
          `object message is received during OBJECT_SYNC without 'object' field, skipping message; message id: ${objectMessage.id}, channel: ${this._channel.name}`,
        );
        continue;
      }

      const objectState = objectMessage.object;

      if (objectState.counter) {
        this._pool.set(objectState.objectId, this._createLiveCounterDataEntry(objectMessage));
      } else if (objectState.map) {
        this._pool.set(objectState.objectId, this._createLiveMapDataEntry(objectMessage));
      } else {
        this._client.Logger.logAction(
          this._client.logger,
          this._client.Logger.LOG_MAJOR,
          'SyncObjectsDataPool.applyObjectSyncMessages()',
          `received unsupported object state message during OBJECT_SYNC, expected 'counter' or 'map' to be present, skipping message; message id: ${objectMessage.id}, channel: ${this._channel.name}`,
        );
      }
    }
  }

  private _createLiveCounterDataEntry(objectMessage: ObjectMessage): LiveCounterDataEntry {
    const newEntry: LiveCounterDataEntry = {
      objectMessage,
      objectType: 'LiveCounter',
    };

    return newEntry;
  }

  private _createLiveMapDataEntry(objectMessage: ObjectMessage): LiveMapDataEntry {
    const newEntry: LiveMapDataEntry = {
      objectMessage,
      objectType: 'LiveMap',
    };

    return newEntry;
  }
}
