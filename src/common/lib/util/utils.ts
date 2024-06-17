import Platform from 'common/platform';
import ErrorInfo, { PartialErrorInfo } from 'common/lib/types/errorinfo';
import { ModularPlugins } from '../client/modularplugins';
import { MsgPack } from 'common/types/msgpack';

function randomPosn(arrOrStr: Array<unknown> | string) {
  return Math.floor(Math.random() * arrOrStr.length);
}

/**
 * Add a set of properties to a target object
 *
 * @param target the target object
 * @param args objects, which enumerable properties are added to target, by reference only
 * @returns target object with added properties
 */
export function mixin(
  target: Record<string, unknown>,
  ...args: Array<object | undefined | null>
): Record<string, unknown> {
  for (let i = 0; i < args.length; i++) {
    const source = args[i];
    if (!source) {
      break;
    }

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = (source as Record<string, unknown>)[key];
      }
    }
  }
  return target;
}

/**
 * Creates a copy of enumerable properties of the source object
 *
 * @param src object to copy
 * @returns copy of src
 */
export function copy<T = Record<string, unknown>>(src: T | Record<string, unknown> | null | undefined): T {
  return mixin({}, src as Record<string, unknown>) as T;
}

/*
 * Ensures that an Array object is always returned
 * returning the original Array of obj is an Array
 * else wrapping the obj in a single element Array
 */
export function ensureArray(obj: Record<string, unknown>): unknown[] {
  if (isNil(obj)) {
    return [];
  }
  if (Array.isArray(obj)) {
    return obj;
  }
  return [obj];
}

export function isObject(ob: unknown): ob is Record<string, unknown> {
  return Object.prototype.toString.call(ob) == '[object Object]';
}

/*
 * Determine whether or not an object contains
 * any enumerable properties.
 * ob: the object
 */
export function isEmpty(ob: Record<string, unknown> | unknown[]): boolean {
  for (const prop in ob) return false;
  return true;
}

/**
 * Checks if `value` is `null` or `undefined`.
 *
 * Source: https://github.com/lodash/lodash/blob/main/src/isNil.ts
 */
export function isNil(arg: unknown): arg is null | undefined {
  return arg == null;
}

/*
 * Perform a simple shallow clone of an object.
 * Result is an object irrespective of whether
 * the input is an object or array. All
 * enumerable properties are copied.
 * ob: the object
 */
export function shallowClone(ob: Record<string, unknown>): Record<string, unknown> {
  const result = new Object() as Record<string, unknown>;
  for (const prop in ob) result[prop] = ob[prop];
  return result;
}

/*
 * Clone an object by creating a new object with the
 * given object as its prototype. Optionally
 * a set of additional own properties can be
 * supplied to be added to the newly created clone.
 * ob:            the object to be cloned
 * ownProperties: optional object with additional
 *                properties to add
 */
export function prototypicalClone(
  ob: Record<string, unknown>,
  ownProperties: Record<string, unknown>,
): Record<string, unknown> {
  class F {}
  F.prototype = ob;
  const result = new F() as Record<string, unknown>;
  if (ownProperties) mixin(result, ownProperties);
  return result;
}

/*
 * Declare a constructor to represent a subclass
 * of another constructor
 * If platform has a built-in version we use that from Platform, else we
 * define here (so can make use of other Utils fns)
 * See node.js util.inherits
 */
export const inherits = function (ctor: any, superCtor: Function) {
  if (Platform.Config.inherits) {
    Platform.Config.inherits(ctor, superCtor);
    return;
  }
  ctor.super_ = superCtor;
  ctor.prototype = prototypicalClone(superCtor.prototype, { constructor: ctor });
};

/*
 * Determine whether or not an object has an enumerable
 * property whose value equals a given value.
 * ob:  the object
 * val: the value to find
 */
export function containsValue(ob: Record<string, unknown>, val: unknown): boolean {
  for (const i in ob) {
    if (ob[i] == val) return true;
  }
  return false;
}

export function intersect<K extends string, T>(arr: Array<K>, ob: K[] | Partial<Record<K, T>>): K[] {
  return Array.isArray(ob) ? arrIntersect(arr, ob) : arrIntersectOb(arr, ob);
}

export function arrIntersect<T>(arr1: Array<T>, arr2: Array<T>): Array<T> {
  const result = [];
  for (let i = 0; i < arr1.length; i++) {
    const member = arr1[i];
    if (arr2.indexOf(member) != -1) result.push(member);
  }
  return result;
}

export function arrIntersectOb<K extends string>(arr: Array<K>, ob: Partial<Record<K, unknown>>): K[] {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const member = arr[i];
    if (member in ob) result.push(member);
  }
  return result;
}

export function arrSubtract<T>(arr1: Array<T>, arr2: Array<T>): Array<T> {
  const result = [];
  for (let i = 0; i < arr1.length; i++) {
    const element = arr1[i];
    if (arr2.indexOf(element) == -1) result.push(element);
  }
  return result;
}

export function arrDeleteValue<T>(arr: Array<T>, val: T): boolean {
  const idx = arr.indexOf(val);
  const res = idx != -1;
  if (res) arr.splice(idx, 1);
  return res;
}

export function arrWithoutValue<T>(arr: Array<T>, val: T): Array<T> {
  const newArr = arr.slice();
  arrDeleteValue(newArr, val);
  return newArr;
}

/*
 * Construct an array of the keys of the enumerable
 * properties of a given object, optionally limited
 * to only the own properties.
 * ob:      the object
 * ownOnly: boolean, get own properties only
 */
export function keysArray(ob: Record<string, unknown>, ownOnly?: boolean): Array<string> {
  const result = [];
  for (const prop in ob) {
    if (ownOnly && !Object.prototype.hasOwnProperty.call(ob, prop)) continue;
    result.push(prop);
  }
  return result;
}

/*
 * Construct an array of the values of the enumerable
 * properties of a given object, optionally limited
 * to only the own properties.
 * ob:      the object
 * ownOnly: boolean, get own properties only
 */
export function valuesArray<T>(ob: Record<string, T>, ownOnly?: boolean): T[] {
  const result = [];
  for (const prop in ob) {
    if (ownOnly && !Object.prototype.hasOwnProperty.call(ob, prop)) continue;
    result.push(ob[prop]);
  }
  return result;
}

export function forInOwnNonNullProperties(ob: Record<string, unknown>, fn: (prop: string) => void): void {
  for (const prop in ob) {
    if (Object.prototype.hasOwnProperty.call(ob, prop) && ob[prop]) {
      fn(prop);
    }
  }
}

export function allSame(arr: Array<Record<string, unknown>>, prop: string): boolean {
  if (arr.length === 0) {
    return true;
  }
  const first = arr[0][prop];
  return arr.every(function (item) {
    return item[prop] === first;
  });
}

export enum Format {
  msgpack = 'msgpack',
  json = 'json',
}

export function arrPopRandomElement<T>(arr: Array<T>): T {
  return arr.splice(randomPosn(arr), 1)[0];
}

export function toQueryString(params?: Record<string, string> | null): string {
  const parts = [];
  if (params) {
    for (const key in params) parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
  }
  return parts.length ? '?' + parts.join('&') : '';
}

export function parseQueryString(query: string): Record<string, string> {
  let match;
  const search = /([^?&=]+)=?([^&]*)/g;
  const result: Record<string, string> = {};

  while ((match = search.exec(query))) result[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);

  return result;
}

export function isErrorInfoOrPartialErrorInfo(err: unknown): err is ErrorInfo | PartialErrorInfo {
  return typeof err == 'object' && err !== null && (err instanceof ErrorInfo || err instanceof PartialErrorInfo);
}

export function inspectError(err: unknown): string {
  if (
    err instanceof Error ||
    (err as ErrorInfo)?.constructor?.name === 'ErrorInfo' ||
    (err as PartialErrorInfo)?.constructor?.name === 'PartialErrorInfo'
  )
    return (err as Error).toString();
  return Platform.Config.inspect(err);
}

export function inspectBody(body: unknown): string {
  if (Platform.BufferUtils.isBuffer(body)) {
    return (body as any).toString();
  } else if (typeof body === 'string') {
    return body;
  } else {
    return Platform.Config.inspect(body);
  }
}

/* Data is assumed to be either a string or a buffer. */
export function dataSizeBytes(data: string | Buffer): number {
  if (Platform.BufferUtils.isBuffer(data)) {
    return Platform.BufferUtils.byteLength(data);
  }
  if (typeof data === 'string') {
    return Platform.Config.stringByteSize(data);
  }
  throw new Error('Expected input of Utils.dataSizeBytes to be a buffer or string, but was: ' + typeof data);
}

export function cheapRandStr(): string {
  return String(Math.random()).substr(2);
}

/* Takes param the minimum number of bytes of entropy the string must
 * include, not the length of the string. String length produced is not
 * guaranteed. */
export const randomString = async (numBytes: number): Promise<string> => {
  const buffer = await Platform.Config.getRandomArrayBuffer(numBytes);
  return Platform.BufferUtils.base64Encode(buffer);
};

/* Pick n elements at random without replacement from an array */
export function arrChooseN<T>(arr: Array<T>, n: number): Array<T> {
  const numItems = Math.min(n, arr.length),
    mutableArr = arr.slice(),
    result: Array<T> = [];
  for (let i = 0; i < numItems; i++) {
    result.push(arrPopRandomElement(mutableArr));
  }
  return result;
}

/**
 * Uses a callback to communicate the result of a `Promise`. The first argument passed to the callback will be either an error (when the promise is rejected) or `null` (when the promise is fulfilled). In the case where the promise is fulfilled, the resulting value will be passed to the callback as a second argument.
 */
export function whenPromiseSettles<T, E = unknown>(
  promise: Promise<T>,
  callback?: (err: E | null, result?: T) => void,
) {
  promise
    .then((result) => {
      callback?.(null, result);
    })
    .catch((err: unknown) => {
      // We make no guarantees about the type of the error that gets passed to the callback. Issue https://github.com/ably/ably-js/issues/1617 will think about how to correctly handle error types.
      callback?.(err as E);
    });
}

export function decodeBody<T>(body: unknown, MsgPack: MsgPack | null, format?: Format | null): T {
  if (format == 'msgpack') {
    if (!MsgPack) {
      throwMissingPluginError('MsgPack');
    }
    return MsgPack.decode(body as Buffer);
  }

  return JSON.parse(String(body));
}

export function encodeBody(body: unknown, MsgPack: MsgPack | null, format?: Format): string | Buffer {
  if (format == 'msgpack') {
    if (!MsgPack) {
      throwMissingPluginError('MsgPack');
    }
    return MsgPack.encode(body, true) as Buffer;
  }

  return JSON.stringify(body);
}

export function allToLowerCase(arr: Array<string>): Array<string> {
  return arr.map(function (element) {
    return element && element.toLowerCase();
  });
}

export function allToUpperCase(arr: Array<string>): Array<string> {
  return arr.map(function (element) {
    return element && element.toUpperCase();
  });
}

export function getBackoffCoefficient(count: number) {
  return Math.min((count + 2) / 3, 2);
}

export function getJitterCoefficient() {
  return 1 - Math.random() * 0.2;
}

/**
 *
 * @param initialTimeout initial timeout value
 * @param retryAttempt integer indicating retryAttempt
 * @returns RetryTimeout value for given timeout and retryAttempt.
 * If x is the value generated then,
 * Upper bound = min((retryAttempt + 2) / 3, 2) * initialTimeout,
 * Lower bound = 0.8 * Upper bound,
 * Lower bound < x < Upper bound
 */
export function getRetryTime(initialTimeout: number, retryAttempt: number) {
  return initialTimeout * getBackoffCoefficient(retryAttempt) * getJitterCoefficient();
}

export function getGlobalObject() {
  if (typeof global !== 'undefined') {
    return global;
  }

  if (typeof window !== 'undefined') {
    return window;
  }

  return self;
}

export function shallowEquals(source: Record<string, unknown>, target: Record<string, unknown>) {
  return (
    Object.keys(source).every((key) => source[key] === target[key]) &&
    Object.keys(target).every((key) => target[key] === source[key])
  );
}

export function matchDerivedChannel(name: string) {
  /**
   * This regex check is to retain existing channel params if any e.g [?rewind=1]foo to
   * [filter=xyz?rewind=1]foo. This is to keep channel compatibility around use of
   * channel params that work with derived channels.
   *
   * This eslint unsafe regex warning is triggered because the RegExp uses nested quantifiers,
   * but it does not create any situation where the regex engine has to
   * explore a large number of possible matches so it’s safe to ignore
   */
  const regex = /^(\[([^?]*)(?:(.*))\])?(.+)$/; // eslint-disable-line
  const match = name.match(regex);
  if (!match || !match.length || match.length < 5) {
    throw new ErrorInfo('regex match failed', 400, 40010);
  }
  // Fail if there is already a channel qualifier, eg [meta]foo should fail instead of just overriding with [filter=xyz]foo
  if (match![2]) {
    throw new ErrorInfo(`cannot use a derived option with a ${match[2]} channel`, 400, 40010);
  }
  // Return match values to be added to derive channel quantifier.
  return {
    qualifierParam: match[3] || '',
    channelName: match[4],
  };
}

export function toBase64(str: string) {
  const bufferUtils = Platform.BufferUtils;
  const textBuffer = bufferUtils.utf8Encode(str);
  return bufferUtils.base64Encode(textBuffer);
}

export function arrEquals(a: any[], b: any[]) {
  return (
    a.length === b.length &&
    a.every(function (val, i) {
      return val === b[i];
    })
  );
}

export function createMissingPluginError(pluginName: keyof ModularPlugins): ErrorInfo {
  return new ErrorInfo(`${pluginName} plugin not provided`, 40019, 400);
}

export function throwMissingPluginError(pluginName: keyof ModularPlugins): never {
  throw createMissingPluginError(pluginName);
}

export async function withTimeoutAsync<A>(promise: Promise<A>, timeout = 5000, err = 'Timeout expired'): Promise<A> {
  const e = new ErrorInfo(err, 50000, 500);
  return Promise.race([promise, new Promise<A>((_resolve, reject) => setTimeout(() => reject(e), timeout))]);
}
