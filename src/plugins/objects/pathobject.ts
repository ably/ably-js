import type BaseClient from 'common/lib/client/baseclient';
import type * as API from '../../../ably';
import type {
  AnyPathObject,
  EventCallback,
  Instance,
  PathObject,
  PathObjectSubscriptionEvent,
  PathObjectSubscriptionOptions,
  Primitive,
  Value,
} from '../../../ably';
import { DefaultInstance } from './instance';
import { LiveCounter } from './livecounter';
import { LiveMap } from './livemap';
import { LiveObject, SubscribeResponse } from './liveobject';
import { RealtimeObject } from './realtimeobject';

/**
 * Basic implementation of AnyPathObject interface.
 * Provides a generic implementation that can handle any type of PathObject operations.
 */
export class DefaultPathObject<T extends Value = Value> implements AnyPathObject<T> {
  private _client: BaseClient;
  private _path: string[];

  constructor(
    private _realtimeObject: RealtimeObject,
    private _root: LiveMap<any>,
    path: string[],
    parent?: DefaultPathObject<any>,
  ) {
    this._client = this._realtimeObject.getClient();
    // copy parent path array
    this._path = [...(parent?._path ?? []), ...path];
  }

  /**
   * Returns the fully-qualified string path that this PathObject represents
   */
  path(): string {
    // escape dots in path segments to avoid ambiguity in the joined path
    return this._escapePath(this._path).join('.');
  }

  /**
   * Returns a compact representation of the object at this path
   */
  compact(): any {
    throw new Error('Not implemented');
  }

  /**
   * Navigate to a child path within the collection by obtaining a PathObject for that path.
   * The next path segment in a collection is identified with a string key.
   */
  get<U extends Value = Value>(key: string): PathObject<U> {
    if (typeof key !== 'string') {
      throw new this._client.ErrorInfo(`Path key must be a string: ${key}`, 40003, 400);
    }
    return new DefaultPathObject<U>(this._realtimeObject, this._root, [key], this) as unknown as PathObject<U>;
  }

  /**
   * Get a PathObject at the specified path relative to this object
   */
  at<U extends Value = Value>(path: string): PathObject<U> {
    if (typeof path !== 'string') {
      throw new this._client.ErrorInfo(`Path must be a string: ${path}`, 40003, 400);
    }
    // split path on unescaped dots
    const pathAsArray = path.split(/(?<!\\)\./).map((segment) => segment.replace(/\\\./g, '.'));
    return new DefaultPathObject<U>(this._realtimeObject, this._root, pathAsArray, this) as unknown as PathObject<U>;
  }

  /**
   * Get the current value at this path.
   * If the path does not resolve to any specific entry, returns `undefined`.
   */
  value<U extends number | Primitive = number | Primitive>(): U | undefined {
    try {
      const resolved = this._resolvePath(this._path);

      if (resolved instanceof LiveObject) {
        if (resolved instanceof LiveCounter) {
          return resolved.value() as U;
        }

        // can't resolve value for other live object types
        return undefined;
      } else if (
        this._client.Platform.BufferUtils.isBuffer(resolved) ||
        typeof resolved === 'string' ||
        typeof resolved === 'number' ||
        typeof resolved === 'boolean' ||
        typeof resolved === 'object' ||
        resolved === null
      ) {
        // primitive type - return it
        return resolved as U;
      } else {
        // unknown type - return undefined
        return undefined;
      }
    } catch (error) {
      if (this._client.Utils.isErrorInfoOrPartialErrorInfo(error)) {
        // ignore ErrorInfos indicating path resolution failure and return undefined
        return undefined;
      }
      // otherwise rethrow unexpected errors
      throw error;
    }
  }

  instance<T extends Value = Value>(): Instance<T> | undefined {
    try {
      const value = this._resolvePath(this._path);

      if (value instanceof LiveObject) {
        // only return an Instance for LiveObject values
        return new DefaultInstance(this._realtimeObject, value) as unknown as Instance<T>;
      }

      // return undefined for primitive values
      return undefined;
    } catch (error) {
      if (this._client.Utils.isErrorInfoOrPartialErrorInfo(error)) {
        // ignore ErrorInfos indicating path resolution failure and return undefined
        return undefined;
      }
      // otherwise rethrow unexpected errors
      throw error;
    }
  }

  /**
   * Returns an iterator of [key, value] pairs for LiveMap entries
   */
  *entries<U extends Record<string, Value>>(): IterableIterator<[keyof U, PathObject<U[keyof U]>]> {
    const resolved = this._resolvePath(this._path);
    if (!(resolved instanceof LiveMap)) {
      throw new this._client.ErrorInfo(
        `Cannot iterate entries on a non-LiveMap object at path: ${this._escapePath(this._path).join('.')}`,
        40000,
        400,
      );
    }

    for (const [key, _] of resolved.entries()) {
      const value = new DefaultPathObject(this._realtimeObject, this._root, [key], this) as unknown as PathObject<
        U[keyof U]
      >;
      yield [key, value];
    }
  }

  /**
   * Returns an iterator of keys for LiveMap entries
   */
  *keys<U extends Record<string, Value>>(): IterableIterator<keyof U> {
    for (const [key] of this.entries<U>()) {
      yield key;
    }
  }

  /**
   * Returns an iterator of PathObject values for LiveMap entries
   */
  *values<U extends Record<string, Value>>(): IterableIterator<PathObject<U[keyof U]>> {
    for (const [_, value] of this.entries<U>()) {
      yield value;
    }
  }

  /**
   * Returns the size of the collection at this path
   */
  size(): number {
    const resolved = this._resolvePath(this._path);
    if (!(resolved instanceof LiveMap)) {
      throw new this._client.ErrorInfo(
        `Cannot get size of a non-LiveMap object at path: ${this._escapePath(this._path).join('.')}`,
        40000,
        400,
      );
    }

    return resolved.size();
  }

  set<T extends Record<string, Value> = Record<string, Value>>(
    key: keyof T & string,
    value: T[keyof T],
  ): Promise<void> {
    const resolved = this._resolvePath(this._path);
    if (!(resolved instanceof LiveMap)) {
      throw new this._client.ErrorInfo(
        `Cannot set a key on a non-LiveMap object at path: ${this._escapePath(this._path).join('.')}`,
        40000,
        400,
      );
    }

    return resolved.set(key, value);
  }

  remove<T extends Record<string, Value> = Record<string, Value>>(key: keyof T & string): Promise<void> {
    const resolved = this._resolvePath(this._path);
    if (!(resolved instanceof LiveMap)) {
      throw new this._client.ErrorInfo(
        `Cannot remove a key from a non-LiveMap object at path: ${this._escapePath(this._path).join('.')}`,
        40000,
        400,
      );
    }

    return resolved.remove(key);
  }

  increment(amount?: number): Promise<void> {
    const resolved = this._resolvePath(this._path);
    if (!(resolved instanceof LiveCounter)) {
      throw new this._client.ErrorInfo(
        `Cannot increment a non-LiveCounter object at path: ${this._escapePath(this._path).join('.')}`,
        40000,
        400,
      );
    }

    return resolved.increment(amount ?? 1);
  }

  decrement(amount?: number): Promise<void> {
    const resolved = this._resolvePath(this._path);
    if (!(resolved instanceof LiveCounter)) {
      throw new this._client.ErrorInfo(
        `Cannot decrement a non-LiveCounter object at path: ${this._escapePath(this._path).join('.')}`,
        40000,
        400,
      );
    }

    return resolved.decrement(amount ?? 1);
  }

  /**
   * Subscribes to changes to the object (and, by default, its children) or to a primitive value at this path.
   *
   * PathObject subscriptions rely on LiveObject instances to broadcast updates through a subscription
   * registry for the paths they occupy in the object graph. These updates are then routed to the appropriate
   * PathObject subscriptions based on their paths.
   *
   * When the underlying object or primitive value at this path is changed via an update to its parent
   * collection (for example, if a new LiveCounter instance is set at this path, or a key's value is
   * changed in a parent LiveMap), a subscription to this path will receive a separate **non-bubbling**
   * event indicating the change. This event is not propagated to parent path subscriptions, as they will
   * receive their own event for changes made directly to the object at their respective paths.
   *
   * PathObject subscriptions observe nested changes by default. Optional `depth` parameter can be provided
   * to control this behavior. A subscription depth of `1` means that only direct updates to the underlying
   * object - and changes that overwrite the value at this path (via parent object updates) - will trigger events.
   */

  subscribe(
    listener: EventCallback<PathObjectSubscriptionEvent>,
    options?: PathObjectSubscriptionOptions,
  ): SubscribeResponse {
    return this._realtimeObject.getPathObjectSubscriptionRegister().subscribe(this._path, listener, options ?? {});
  }

  private _resolvePath(path: string[]): Value {
    // TODO: remove type assertion when internal LiveMap is updated to support new path based type system
    let current: Value = this._root as unknown as API.LiveMap;

    for (let i = 0; i < path.length; i++) {
      const segment = path[i];

      if (!(current instanceof LiveMap)) {
        throw new this._client.ErrorInfo(
          `Cannot resolve path segment '${segment}' on non-collection type at path: ${this._escapePath(path.slice(0, i)).join('.')}`,
          40000,
          400,
        );
      }

      const next: Value | undefined = current.get(segment);

      if (next === undefined) {
        throw new this._client.ErrorInfo(
          `Could not resolve value at path: ${this._escapePath(path.slice(0, i + 1)).join('.')}`,
          40000,
          400,
        );
      }

      current = next;
    }

    return current;
  }

  private _escapePath(path: string[]): string[] {
    return path.map((x) => x.replace(/\./g, '\\.'));
  }
}
