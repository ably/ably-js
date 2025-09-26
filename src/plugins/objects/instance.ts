import type BaseClient from 'common/lib/client/baseclient';
import type { AnyInstance, Instance, Primitive, Value } from '../../../ably';
import { LiveCounter } from './livecounter';
import { LiveMap } from './livemap';
import { LiveObject } from './liveobject';
import { RealtimeObject } from './realtimeobject';

export class DefaultInstance<T extends Value> implements AnyInstance<T> {
  protected _client: BaseClient;

  constructor(
    private _realtimeObject: RealtimeObject,
    private _value: T,
  ) {
    this._client = this._realtimeObject.getClient();
  }

  id(): string {
    if (!(this._value instanceof LiveObject)) {
      throw new this._client.ErrorInfo('Cannot get object ID for a non-LiveObject instance', 40000, 400);
    }
    return this._value.getObjectId();
  }

  compact(): any {
    throw new Error('Not implemented');
  }

  get<U extends Value = Value>(key: string): Instance<U> | undefined {
    if (!(this._value instanceof LiveMap)) {
      throw new this._client.ErrorInfo('Cannot get value for a key from a non-LiveMap instance', 40000, 400);
    }

    if (typeof key !== 'string') {
      throw new this._client.ErrorInfo(`Key must be a string: ${key}`, 40003, 400);
    }

    const value = this._value.get(key);
    if (value === undefined) {
      return undefined;
    }
    return new DefaultInstance<U>(this._realtimeObject, value) as unknown as Instance<U>;
  }

  value<U extends number | Primitive = number | Primitive>(): U | undefined {
    if (this._value instanceof LiveObject) {
      if (this._value instanceof LiveCounter) {
        return this._value.value() as U;
      }

      // for other LiveObject types, return undefined
      return undefined;
    } else if (
      this._client.Platform.BufferUtils.isBuffer(this._value) ||
      typeof this._value === 'string' ||
      typeof this._value === 'number' ||
      typeof this._value === 'boolean' ||
      typeof this._value === 'object' ||
      this._value === null
    ) {
      // primitive type - return it
      return this._value as unknown as U;
    } else {
      // unknown type - return undefined
      return undefined;
    }
  }

  *entries<U extends Record<string, Value>>(): IterableIterator<[keyof U, Instance<U[keyof U]>]> {
    if (!(this._value instanceof LiveMap)) {
      throw new this._client.ErrorInfo('Cannot iterate entries on a non-LiveMap instance', 40000, 400);
    }

    for (const [key, value] of this._value.entries()) {
      const instance = new DefaultInstance<U[keyof U]>(this._realtimeObject, value) as unknown as Instance<U[keyof U]>;
      yield [key, instance];
    }
  }

  *keys<U extends Record<string, Value>>(): IterableIterator<keyof U> {
    for (const [key] of this.entries<U>()) {
      yield key;
    }
  }

  *values<U extends Record<string, Value>>(): IterableIterator<Instance<U[keyof U]>> {
    for (const [_, value] of this.entries<U>()) {
      yield value;
    }
  }

  size(): number {
    if (!(this._value instanceof LiveMap)) {
      throw new this._client.ErrorInfo('Cannot get size of a non-LiveMap instance', 40000, 400);
    }
    return this._value.size();
  }

  set<U extends Record<string, Value> = Record<string, Value>>(
    key: keyof U & string,
    value: U[keyof U],
  ): Promise<void> {
    if (!(this._value instanceof LiveMap)) {
      throw new this._client.ErrorInfo('Cannot set a key on a non-LiveMap instance', 40000, 400);
    }
    return this._value.set(key, value);
  }

  remove<U extends Record<string, Value> = Record<string, Value>>(key: keyof U & string): Promise<void> {
    if (!(this._value instanceof LiveMap)) {
      throw new this._client.ErrorInfo('Cannot remove a key from a non-LiveMap instance', 40000, 400);
    }
    return this._value.remove(key);
  }

  increment(amount?: number | undefined): Promise<void> {
    if (!(this._value instanceof LiveCounter)) {
      throw new this._client.ErrorInfo('Cannot increment a non-LiveCounter instance', 40000, 400);
    }
    return this._value.increment(amount ?? 1);
  }

  decrement(amount?: number | undefined): Promise<void> {
    if (!(this._value instanceof LiveCounter)) {
      throw new this._client.ErrorInfo('Cannot decrement a non-LiveCounter instance', 40000, 400);
    }
    return this._value.decrement(amount ?? 1);
  }
}
