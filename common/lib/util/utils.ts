import Platform from 'platform';
import Defaults from './defaults';
import BufferUtils from 'platform-bufferutils';
import ErrorInfo from '../types/errorinfo';

function randomPosn(arrOrStr: Array<unknown> | string) {
	return Math.floor(Math.random() * arrOrStr.length);
}

/*
* Add a set of properties to a target object
* target: the target object
* props:  an object whose enumerable properties are
*         added, by reference only
*/
export function mixin(target: Record<string, unknown>, ...args: Array<object | undefined | null>): Record<string, unknown> {
	for (let i = 0; i < args.length; i++) {
		const source = args[i];
		if (!source) {
			break;
		}
		const hasOwnProperty = Object.prototype.hasOwnProperty;
		for (const key in source) {
			if (!hasOwnProperty || hasOwnProperty.call(source, key)) {
				target[key] = (source as Record<string, unknown>)[key];
			}
		}
	}
	return target;
}

/*
* Add a set of properties to a target object
* target: the target object
* props:  an object whose enumerable properties are
*         added, by reference only
*/
export function copy<T = Record<string, unknown>>(src: T | Record<string, unknown> | null | undefined): T {
	return mixin({}, src as Record<string, unknown>) as T;
}

/*
* Determine whether or not a given object is
* an array.
*/
export const isArray =
	Array.isArray ||
	function (value: unknown): value is Array<unknown> {
		return Object.prototype.toString.call(value) == '[object Array]';
	};

/*
* Ensures that an Array object is always returned
* returning the original Array of obj is an Array
* else wrapping the obj in a single element Array
*/
export function ensureArray(obj: Record<string, unknown>): unknown[] {
	if (isEmptyArg(obj)) {
		return [];
	}
	if (isArray(obj)) {
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

export function isOnlyPropIn(ob: Record<string, unknown>, property: string): boolean {
	for (const prop in ob) {
		if (prop !== property) {
			return false;
		}
	}
	return true;
}

/*
* Determine whether or not an argument to an overloaded function is
* undefined (missing) or null.
* This method is useful when constructing functions such as (WebIDL terminology):
*   off([TreatUndefinedAs=Null] DOMString? event)
* as you can then confirm the argument using:
*   Utils.isEmptyArg(event)
*/

export function isEmptyArg(arg: unknown): arg is (null | undefined) {
	return arg === null || arg === undefined;
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
export function prototypicalClone(ob: Record<string, unknown>, ownProperties: Record<string, unknown>): Record<string, unknown> {
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
export const inherits =
	Platform.inherits ||
	function (ctor: any, superCtor: Function) {
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

export function intersect<T>(arr: Array<string>, ob: string[] | Record<string, T>): string[] {
	return isArray(ob) ? arrIntersect(arr, ob) : arrIntersectOb(arr, ob);
}

export function arrIntersect<T>(arr1: Array<T>, arr2: Array<T>): Array<T> {
	const result = [];
	for (let i = 0; i < arr1.length; i++) {
		const member = arr1[i];
		if (arrIndexOf(arr2, member) != -1) result.push(member);
	}
	return result;
}

export function arrIntersectOb<T>(arr: Array<T>, ob: Record<string, unknown>): T[] {
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
		if (arrIndexOf(arr2, element) == -1) result.push(element);
	}
	return result;
}

export const arrIndexOf = (Array.prototype.indexOf as unknown)
	? function (arr: Array<unknown>, elem: unknown, fromIndex?: number) {
			return arr.indexOf(elem, fromIndex);
		}
	: function (arr: Array<unknown>, elem: unknown, fromIndex?: number) {
			fromIndex = fromIndex || 0;
			const len = arr.length;
			for (; fromIndex < len; fromIndex++) {
				if (arr[fromIndex] === elem) {
					return fromIndex;
				}
			}
			return -1;
		};

export function arrIn(arr: Array<unknown>, val: unknown): boolean {
	return arrIndexOf(arr, val) !== -1;
}

export function arrDeleteValue<T>(arr: Array<T>, val: T): boolean {
	const idx = arrIndexOf(arr, val);
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

export const arrForEach = (Array.prototype.forEach as unknown)
	? function<T = unknown> (arr: Array<T>, fn: (value: T, index: number, arr: Array<T>) => unknown) {
			arr.forEach(fn);
		}
	: function<T = unknown> (arr: Array<T>, fn: (value: T, index: number, arr: Array<T>) => unknown) {
			const len = arr.length;
			for (let i = 0; i < len; i++) {
				fn(arr[i], i, arr);
			}
		};

/* Useful when the function may mutate the array */
export function safeArrForEach<T = unknown>(arr: Array<T>, fn: (value: T, index: number, arr: Array<T>) => unknown): void {
	return arrForEach(arr.slice(), fn);
}

export const arrMap = (Array.prototype.map as unknown)
	? function<T1, T2> (arr: Array<T1>, fn: (value: T1, index?: number, arr?: Array<T1>) => T2) {
			return arr.map(fn);
		}
	: function<T> (arr: Array<T>, fn: (value: T, index?: number, arr?: Array<T>) => unknown) {
			const result = [];
			const len = arr.length;
			for (let i = 0; i < len; i++) {
				result.push(fn(arr[i], i, arr));
			}
			return result;
		};

export const arrFilter = (Array.prototype.filter as unknown)
	? function<T>(arr: Array<T>, fn: (value: T, index?: number, arr?: Array<T>) => boolean) {
			return arr.filter(fn);
		}
	: function<T>(arr: Array<T>, fn: (value: T, index?: number, arr?: Array<T>) => boolean) {
			const result = [],
				len = arr.length;
			for (let i = 0; i < len; i++) {
				if (fn(arr[i])) {
					result.push(arr[i]);
				}
			}
			return result;
		};

export const arrEvery = (Array.prototype.every as unknown)
	? function<T>(arr: Array<T>, fn: (value: T, index?: number, arr?: Array<T>) => boolean) {
			return arr.every(fn);
		}
	: function<T>(arr: Array<T>, fn: (value: T, index?: number, arr?: Array<T>) => boolean) {
			const len = arr.length;
			for (let i = 0; i < len; i++) {
				if (!fn(arr[i], i, arr)) {
					return false;
				}
			}
			return true;
		};

export function allSame(arr: Array<Record<string, unknown>>, prop: string): boolean {
	if (arr.length === 0) {
		return true;
	}
	const first = arr[0][prop];
	return arrEvery(arr, function (item) {
		return item[prop] === first;
	});
}

export const nextTick = Platform.nextTick;

const contentTypes = {
	json: 'application/json',
	jsonp: 'application/javascript',
	xml: 'application/xml',
	html: 'text/html',
	msgpack: 'application/x-msgpack'
};

export function defaultGetHeaders(format?: Format): Record<string, string> {
	const accept = contentTypes[format || Format.json];
	return {
		accept: accept,
		'X-Ably-Version': Defaults.apiVersion,
		'Ably-Agent': Defaults.agent
	};
}

export function defaultPostHeaders(format?: Format): Record<string, string> {
	let contentType;
	const accept = contentType = contentTypes[format || Format.json];

	return {
		accept: accept,
		'content-type': contentType,
		'X-Ably-Version': Defaults.apiVersion,
		'Ably-Agent': Defaults.agent
	};
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

export const now =
	Date.now ||
	function () {
		/* IE 8 */
		return new Date().getTime();
	};

export const inspect = Platform.inspect;

export function isErrorInfo(err: Error | ErrorInfo): err is ErrorInfo {
	return err.constructor.name == 'ErrorInfo';
}

export function inspectError(err: unknown): string {
	if (err instanceof Error || (err as ErrorInfo)?.constructor?.name === 'ErrorInfo') return Platform.inspect(err);
	return (err as Error).toString();
}

export function inspectBody(body: unknown): string {
	if (BufferUtils.isBuffer(body)) {
		return body.toString();
	} else if (typeof body === 'string') {
		return body;
	} else {
		return Platform.inspect(body);
	}
}

/* Data is assumed to be either a string or a buffer. */
export function dataSizeBytes(data: string | Buffer): number {
	if(BufferUtils.isBuffer(data)) {
		return BufferUtils.byteLength(data);
	}
	if(typeof data === 'string') {
		return Platform.stringByteSize(data);
	}
	throw new Error("Expected input of Utils.dataSizeBytes to be a buffer or string, but was: " + (typeof data));
}

export function cheapRandStr(): string {
	return String(Math.random()).substr(2);
}

/* Takes param the minimum number of bytes of entropy the string must
* include, not the length of the string. String length produced is not
* guaranteed. */
export const randomString =
	Platform.getRandomValues && typeof Uint8Array !== 'undefined'
		? function (numBytes: number) {
				const uIntArr = new Uint8Array(numBytes);
				(Platform.getRandomValues as Function)(uIntArr);
				return BufferUtils.base64Encode(uIntArr);
			}
		: function (numBytes: number) {
				/* Old browser; fall back to Math.random. Could just use a
				* CryptoJS version of the above, but want this to still work in nocrypto
				* versions of the library */
				const charset = BufferUtils.base64CharSet;
				/* base64 has 33% overhead; round length up */
				const length = Math.round((numBytes * 4) / 3);
				let result = '';
				for (let i = 0; i < length; i++) {
					result += charset[randomPosn(charset)];
				}
				return result;
			};

export const randomHexString =
	Platform.getRandomValues && typeof Uint8Array !== 'undefined'
		? function (numBytes: number) {
				const uIntArr = new Uint8Array(numBytes);
				(Platform.getRandomValues as Function)(uIntArr);
				return BufferUtils.hexEncode(uIntArr);
			}
		: function (numBytes: number) {
				const charset = BufferUtils.hexCharSet;
				const length = numBytes * 2;
				let result = '';
				for (let i = 0; i < length; i++) {
					result += charset[randomPosn(charset)];
				}
				return result;
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

export const trim = (String.prototype.trim as unknown)
	? function (str: string) {
			return str.trim();
		}
	: function (str: string) {
			return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
		};

export function promisify<T>(ob: Record<string, any>, fnName: string, args: IArguments | unknown[]): Promise<T> {
	return new Promise(function (resolve, reject) {
		ob[fnName](...(args as unknown[]), function(err: Error, res: unknown) {
			err ? reject(err) : resolve(res as T);
		});
	});
}

export enum Format {
	msgpack = 'msgpack',
	json = 'json',
}

export function decodeBody<T>(body: unknown, format?: Format | null): T {
	return (format == 'msgpack') ? Platform.msgpack.decode(body as Buffer) : JSON.parse(String(body));
}

export function encodeBody(body: unknown, format?: Format): string | Buffer {
	return (format == 'msgpack') ? Platform.msgpack.encode(body, true) : JSON.stringify(body);
}

export function allToLowerCase(arr: Array<string>): Array<string> {
	return arr.map(function(element) {
		return element && element.toLowerCase();
	});
}

export function allToUpperCase(arr: Array<string>): Array<string> {
	return arr.map(function(element) {
		return element && element.toUpperCase();
	});
}
