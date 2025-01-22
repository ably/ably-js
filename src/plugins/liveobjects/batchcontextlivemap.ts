import type * as API from '../../../ably';
import { BatchContext } from './batchcontext';
import { LiveMap } from './livemap';
import { LiveObject } from './liveobject';
import { LiveObjects } from './liveobjects';

export class BatchContextLiveMap<T extends API.LiveMapType> {
  constructor(
    private _batchContext: BatchContext,
    private _liveObjects: LiveObjects,
    private _map: LiveMap<T>,
  ) {}

  get<TKey extends keyof T & string>(key: TKey): T[TKey] | undefined {
    this._liveObjects.throwIfMissingStateSubscribeMode();
    this._batchContext.throwIfClosed();
    const value = this._map.get(key);
    if (value instanceof LiveObject) {
      return this._batchContext.getWrappedObject(value.getObjectId()) as T[TKey];
    } else {
      return value;
    }
  }

  size(): number {
    this._liveObjects.throwIfMissingStateSubscribeMode();
    this._batchContext.throwIfClosed();
    return this._map.size();
  }

  set<TKey extends keyof T & string>(key: TKey, value: T[TKey]): void {
    this._liveObjects.throwIfMissingStatePublishMode();
    this._batchContext.throwIfClosed();
    const stateMessage = LiveMap.createMapSetMessage(this._liveObjects, this._map.getObjectId(), key, value);
    this._batchContext.queueStateMessage(stateMessage);
  }

  remove<TKey extends keyof T & string>(key: TKey): void {
    this._liveObjects.throwIfMissingStatePublishMode();
    this._batchContext.throwIfClosed();
    const stateMessage = LiveMap.createMapRemoveMessage(this._liveObjects, this._map.getObjectId(), key);
    this._batchContext.queueStateMessage(stateMessage);
  }
}
