import type BaseClient from 'common/lib/client/baseclient';
import type * as API from '../../../ably';
import type { AnyPathObject, PathObject, Primitive, Value } from '../../../ably';
import { LiveCounter } from './livecounter';
import { LiveMap } from './livemap';
import { LiveObject } from './liveobject';
import { RealtimeObject } from './realtimeobject';

/**
 * Implementation of AnyPathObject interface.
 * Provides a generic implementation that can handle any type of PathObject operations.
 */
export class DefaultPathObject<T extends Value = Value> implements AnyPathObject<T> {
  protected _client: BaseClient;
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
   * Returns the fully-qualified string path that this PathObject represents.
   * Path segments with dots in them are escaped with a backslash.
   * For example, a path with segments `['a', 'b.c', 'd']` will be represented as `a.b\.c.d`.
   */
  path(): string {
    // escape dots in path segments to avoid ambiguity in the joined path
    return this._escapePath(this._path).join('.');
  }

  /**
   * Returns a compact representation of the object at this path
   */
  compact(): any | undefined {
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

    // We need to split the path on unescaped dots, i.e. dots not preceded by a backslash.
    // The easy way to do this would be to use "path.split(/(?<!\\)\./)" to split on unescaped dots
    // and then call ".replace(/\\\./g, '.')" on each segment.
    // However, that uses negative lookbehind which is not supported in some browsers we aim to support
    // (based on https://github.com/ably/ably-js/pull/2037/files), like Safari before 16.4.
    // See full list https://caniuse.com/?search=negative%20lookbehind.
    // So instead we do splitting manually.
    const pathAsArray: string[] = [];
    let currentSegment = '';
    let escaping = false;
    for (const char of path) {
      if (escaping) {
        // keep the escape character if not escaping a dot
        // this is to replicate the ".replace(/\\\./g, '.')" behavior where only escaped dots are unescaped
        if (char !== '.') currentSegment += '\\';
        currentSegment += char;
        escaping = false;
        continue;
      }
      if (char === '\\') {
        escaping = true;
        continue;
      }
      if (char === '.') {
        pathAsArray.push(currentSegment);
        currentSegment = '';
        continue;
      }
      currentSegment += char;
    }
    if (escaping) {
      currentSegment += '\\';
    }
    pathAsArray.push(currentSegment);

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
        this._client.Logger.logAction(
          this._client.logger,
          this._client.Logger.LOG_MAJOR,
          'PathObject.value()',
          `unexpected value type at path, resolving to undefined; path=${this._escapePath(this._path).join('.')}`,
        );
        // unknown type - return undefined
        return undefined;
      }
    } catch (error) {
      if (this._client.Utils.isErrorInfoOrPartialErrorInfo(error) && error.code === 92005) {
        // ignore path resolution errors and return undefined
        return undefined;
      }
      // rethrow everything else
      throw error;
    }
  }

  /**
   * Returns an iterator of [key, value] pairs for LiveMap entries
   */
  *entries<U extends Record<string, Value>>(): IterableIterator<[keyof U, PathObject<U[keyof U]>]> {
    try {
      const resolved = this._resolvePath(this._path);
      if (!(resolved instanceof LiveMap)) {
        // return empty iterator for non-LiveMap objects
        return;
      }

      for (const [key, _] of resolved.entries()) {
        const value = new DefaultPathObject(this._realtimeObject, this._root, [key], this) as unknown as PathObject<
          U[keyof U]
        >;
        yield [key, value];
      }
    } catch (error) {
      if (this._client.Utils.isErrorInfoOrPartialErrorInfo(error) && error.code === 92005) {
        // ignore path resolution errors and return empty iterator
        return;
      }
      // rethrow everything else
      throw error;
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
  size(): number | undefined {
    try {
      const resolved = this._resolvePath(this._path);
      if (!(resolved instanceof LiveMap)) {
        // can't return size for non-LiveMap objects
        return undefined;
      }

      return resolved.size();
    } catch (error) {
      if (this._client.Utils.isErrorInfoOrPartialErrorInfo(error) && error.code === 92005) {
        // ignore path resolution errors and return undefined
        return undefined;
      }
      // rethrow everything else
      throw error;
    }
  }

  set<T extends Record<string, API.Value> = Record<string, API.Value>>(
    key: keyof T & string,
    value: T[keyof T],
  ): Promise<void> {
    const resolved = this._resolvePath(this._path);
    if (!(resolved instanceof LiveMap)) {
      throw new this._client.ErrorInfo(
        `Cannot set a key on a non-LiveMap object at path: ${this._escapePath(this._path).join('.')}`,
        92007,
        400,
      );
    }

    return resolved.set(key, value);
  }

  remove<T extends Record<string, API.Value> = Record<string, API.Value>>(key: keyof T & string): Promise<void> {
    const resolved = this._resolvePath(this._path);
    if (!(resolved instanceof LiveMap)) {
      throw new this._client.ErrorInfo(
        `Cannot remove a key from a non-LiveMap object at path: ${this._escapePath(this._path).join('.')}`,
        92007,
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
        92007,
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
        92007,
        400,
      );
    }

    return resolved.decrement(amount ?? 1);
  }

  private _resolvePath(path: string[]): Value {
    // TODO: remove type assertion when internal LiveMap is updated to support new path based type system
    let current: Value = this._root as unknown as API.LiveMap;

    for (let i = 0; i < path.length; i++) {
      const segment = path[i];

      if (!(current instanceof LiveMap)) {
        throw new this._client.ErrorInfo(
          `Cannot resolve path segment '${segment}' on non-collection type at path: ${this._escapePath(path.slice(0, i)).join('.')}`,
          92005,
          400,
        );
      }

      const next: Value | undefined = current.get(segment);

      if (next === undefined) {
        throw new this._client.ErrorInfo(
          `Could not resolve value at path: ${this._escapePath(path.slice(0, i + 1)).join('.')}`,
          92005,
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
