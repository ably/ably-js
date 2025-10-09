import type * as API from '../../../ably';
import { BatchContext } from './batchcontext';
import { LiveMap } from './livemap';
import { LiveObject } from './liveobject';
import { RealtimeObject } from './realtimeobject';

export class BatchContextLiveMap<T extends API.LiveMapType> {
  constructor(
    private _batchContext: BatchContext,
    private _realtimeObject: RealtimeObject,
    private _map: LiveMap<T>,
  ) {}

  get<TKey extends keyof T & string>(key: TKey): T[TKey] | undefined {
    this._realtimeObject.throwIfInvalidAccessApiConfiguration();
    this._batchContext.throwIfClosed();
    const value = this._map.get(key);
    if (value instanceof LiveObject) {
      return this._batchContext.getWrappedObject(value.getObjectId()) as T[TKey];
    } else {
      return value;
    }
  }

  size(): number {
    this._realtimeObject.throwIfInvalidAccessApiConfiguration();
    this._batchContext.throwIfClosed();
    return this._map.size();
  }

  *entries<TKey extends keyof T & string>(): IterableIterator<[TKey, T[TKey]]> {
    this._realtimeObject.throwIfInvalidAccessApiConfiguration();
    this._batchContext.throwIfClosed();
    yield* this._map.entries();
  }

  *keys<TKey extends keyof T & string>(): IterableIterator<TKey> {
    this._realtimeObject.throwIfInvalidAccessApiConfiguration();
    this._batchContext.throwIfClosed();
    yield* this._map.keys();
  }

  *values<TKey extends keyof T & string>(): IterableIterator<T[TKey]> {
    this._realtimeObject.throwIfInvalidAccessApiConfiguration();
    this._batchContext.throwIfClosed();
    yield* this._map.values();
  }

  set<TKey extends keyof T & string>(key: TKey, value: T[TKey]): void {
    this._realtimeObject.throwIfInvalidWriteApiConfiguration();
    this._batchContext.throwIfClosed();
    const msg = LiveMap.createMapSetMessage(this._realtimeObject, this._map.getObjectId(), key, value);
    this._batchContext.queueMessage(msg);
  }

  remove<TKey extends keyof T & string>(key: TKey): void {
    this._realtimeObject.throwIfInvalidWriteApiConfiguration();
    this._batchContext.throwIfClosed();
    const msg = LiveMap.createMapRemoveMessage(this._realtimeObject, this._map.getObjectId(), key);
    this._batchContext.queueMessage(msg);
  }
}
