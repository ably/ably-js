export type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array;

export interface IPlatform {
    agent: string;
    logTimestamps: boolean;
    binaryType: BinaryType;
    WebSocket: typeof WebSocket | typeof import('ws');
    useProtocolHeartbeats: boolean;
    createHmac: ((algorithm: string, key: import('crypto').BinaryLike | import('crypto').KeyObject) => import('crypto').Hmac) | null;
    msgpack: typeof import('@ably/msgpack-js');
    supportsBinary: boolean;
    preferBinary: boolean;
    nextTick: process.nextTick;
    inspect: (value: unknown) => string;
    stringByteSize: Buffer.byteLength;
    addEventListener: typeof global.addEventListener | null;
    Promise: typeof Promise;
    getRandomValues?: ((arr: TypedArray, callback?: (error?: Error | null) => void) => void);
    userAgent?: string | null;
    inherits?: typeof import('util').inherits;
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
    getRandomWordArray?: (byteLength: number, callback: (err: Error, result: boolean | CryptoJS.lib.WordArray) => void) => void;
}
