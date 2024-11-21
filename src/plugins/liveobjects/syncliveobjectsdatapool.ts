import type BaseClient from 'common/lib/client/baseclient';
import type RealtimeChannel from 'common/lib/client/realtimechannel';
import { LiveCounterData } from './livecounter';
import { LiveMap } from './livemap';
import { LiveObjectData } from './liveobject';
import { LiveObjects } from './liveobjects';
import { MapSemantics, StateMessage, StateObject } from './statemessage';
import { DefaultTimeserial, Timeserial } from './timeserial';

export interface LiveObjectDataEntry {
  objectData: LiveObjectData;
  siteTimeserials: Record<string, Timeserial>;
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

  applyStateSyncMessages(stateMessages: StateMessage[]): void {
    for (const stateMessage of stateMessages) {
      if (!stateMessage.object) {
        this._client.Logger.logAction(
          this._client.logger,
          this._client.Logger.LOG_MAJOR,
          'LiveObjects.SyncLiveObjectsDataPool.applyStateSyncMessages()',
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
          'LiveObjects.SyncLiveObjectsDataPool.applyStateSyncMessages()',
          `received unsupported state object message during SYNC, expected 'counter' or 'map' to be present, skipping message; message id: ${stateMessage.id}, channel: ${this._channel.name}`,
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
      objectData,
      objectType: 'LiveCounter',
      siteTimeserials: this._timeserialMapFromStringMap(stateObject.siteTimeserials),
      created: counter.created,
    };

    return newEntry;
  }

  private _createLiveMapDataEntry(stateObject: StateObject): LiveMapDataEntry {
    const map = stateObject.map!;
    const objectData = LiveMap.liveMapDataFromMapEntries(this._client, map.entries ?? {});

    const newEntry: LiveMapDataEntry = {
      objectData,
      objectType: 'LiveMap',
      siteTimeserials: this._timeserialMapFromStringMap(stateObject.siteTimeserials),
      semantics: map.semantics ?? MapSemantics.LWW,
    };

    return newEntry;
  }

  private _timeserialMapFromStringMap(stringTimeserialsMap: Record<string, string>): Record<string, Timeserial> {
    const objTimeserialsMap = Object.entries(stringTimeserialsMap).reduce(
      (acc, v) => {
        const [key, timeserialString] = v;
        acc[key] = DefaultTimeserial.calculateTimeserial(this._client, timeserialString);
        return acc;
      },
      {} as Record<string, Timeserial>,
    );

    return objTimeserialsMap;
  }
}
