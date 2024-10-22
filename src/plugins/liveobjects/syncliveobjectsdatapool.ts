import type BaseClient from 'common/lib/client/baseclient';
import RealtimeChannel from 'common/lib/client/realtimechannel';
import { LiveCounterData } from './livecounter';
import { LiveMapData, MapEntry, ObjectIdStateData, StateData, ValueStateData } from './livemap';
import { LiveObjectData } from './liveobject';
import { LiveObjects } from './liveobjects';
import { MapSemantics, StateMessage, StateObject } from './statemessage';

export interface LiveObjectDataEntry {
  objectData: LiveObjectData;
  regionalTimeserial: string;
  objectType: 'LiveMap' | 'LiveCounter';
}

export interface LiveCounterDataEntry extends LiveObjectDataEntry {
  created: boolean;
  objectType: 'LiveCounter';
}

export interface LiveMapDataEntry extends LiveObjectDataEntry {
  objectType: 'LiveMap';
  semantics: MapSemantics;
}

export type AnyDataEntry = LiveCounterDataEntry | LiveMapDataEntry;

/**
 * @internal
 */
export class SyncLiveObjectsDataPool {
  private _client: BaseClient;
  private _channel: RealtimeChannel;
  private _pool: Map<string, AnyDataEntry>;

  constructor(private _liveObjects: LiveObjects) {
    this._client = this._liveObjects.getClient();
    this._channel = this._liveObjects.getChannel();
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

  applyStateMessages(stateMessages: StateMessage[]): void {
    for (const stateMessage of stateMessages) {
      if (!stateMessage.object) {
        this._client.Logger.logAction(
          this._client.logger,
          this._client.Logger.LOG_MAJOR,
          'LiveObjects.SyncLiveObjectsDataPool.applyStateMessages()',
          `state message is received during SYNC without 'object' field, skipping message; message id: ${stateMessage.id}, channel: ${this._channel.name}`,
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
          this._client.Logger.LOG_MINOR,
          'LiveObjects.SyncLiveObjectsDataPool.applyStateMessages()',
          `received unsupported state object message during SYNC, expected 'counter' or 'map' to be present; message id: ${stateMessage.id}, channel: ${this._channel.name}`,
        );
      }
    }
  }

  private _createLiveCounterDataEntry(stateObject: StateObject): LiveCounterDataEntry {
    const counter = stateObject.counter!;

    const objectData: LiveCounterData = {
      data: counter.count ?? 0,
    };
    const newEntry: LiveCounterDataEntry = {
      created: counter.created,
      objectData,
      objectType: 'LiveCounter',
      regionalTimeserial: stateObject.regionalTimeserial,
    };

    return newEntry;
  }

  private _createLiveMapDataEntry(stateObject: StateObject): LiveMapDataEntry {
    const map = stateObject.map!;

    const objectData: LiveMapData = {
      data: new Map<string, MapEntry>(),
    };
    // need to iterate over entries manually to work around optional parameters from state object entries type
    Object.entries(map.entries ?? {}).forEach(([key, entryFromMessage]) => {
      let liveData: StateData;
      if (typeof entryFromMessage.data.objectId !== 'undefined') {
        liveData = { objectId: entryFromMessage.data.objectId } as ObjectIdStateData;
      } else {
        liveData = { encoding: entryFromMessage.data.encoding, value: entryFromMessage.data.value } as ValueStateData;
      }

      const liveDataEntry: MapEntry = {
        ...entryFromMessage,
        // true only if we received explicit true. otherwise always false
        tombstone: entryFromMessage.tombstone === true,
        data: liveData,
      };

      objectData.data.set(key, liveDataEntry);
    });

    const newEntry: LiveMapDataEntry = {
      objectData,
      objectType: 'LiveMap',
      regionalTimeserial: stateObject.regionalTimeserial,
      semantics: map.semantics ?? MapSemantics.LWW,
    };

    return newEntry;
  }
}
