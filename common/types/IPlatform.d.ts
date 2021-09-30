import { createHmac, Hmac } from 'crypto';
import ws from 'ws';
import msgpack from '@ably/msgpack';
import { inspect } from 'util';

export type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array;

export default interface IPlatform {
    agent: string;
    logTimestamps: boolean;
    binaryType: string;
    WebSocket: unknown;
    useProtocolHeartbeats: boolean;
    createHmac: typeof createHmac | null;
    msgpack: typeof msgpack;
    supportsBinary: boolean;
    preferBinary: boolean;
    nextTick: process.nextTick;
    inspect: (value: unknown) => string;
    stringByteSize: Buffer.byteLength;
    addEventListener: null;
    Promise: typeof Promise;
    getRandomValues?: ((arr: TypedArray, callback?: (error: Error | null) => void) => void) | unknown;
    userAgent?: string | null;
    inherits?: typeof inspect;
    addEventListener?: typeof window.addEventListener;
    currentUrl?: string;
    noUpgrade?: boolean | string;
    xhrSupported?: boolean;
    jsonpSupported?: boolean;
    allowComet?: boolean;
    streamingSupported?: boolean;
    ArrayBuffer?: typeof ArrayBuffer | false;
    atob?: typeof atob | null;
    TextEncoder?: typeof TextEncoder;
    TextDecoder?: typeof TextDecoder;
    getRandomWordArray?: (byteLength: number, callback: Function) => void;
}
