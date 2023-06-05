interface MsgPack {
  encode(value: any, sparse?: boolean): Buffer | ArrayBuffer | undefined;
  decode(buffer: Buffer): any;
}

export interface IPlatformConfig {
  agent: string;
  logTimestamps: boolean;
  binaryType: BinaryType;
  WebSocket: typeof WebSocket | typeof import('ws');
  useProtocolHeartbeats: boolean;
  msgpack: MsgPack;
  supportsBinary: boolean;
  preferBinary: boolean;
  nextTick: process.nextTick;
  inspect: (value: unknown) => string;
  stringByteSize: Buffer.byteLength;
  addEventListener?: typeof window.addEventListener | typeof global.addEventListener | null;
  Promise: typeof Promise;
  getRandomValues: (arr: ArrayBufferView, callback?: (error: Error | null) => void) => void;
  userAgent?: string | null;
  inherits?: typeof import('util').inherits;
  currentUrl?: string;
  noUpgrade?: boolean | string;
  fetchSupported?: boolean;
  xhrSupported?: boolean;
  allowComet?: boolean;
  streamingSupported?: boolean;
  ArrayBuffer?: typeof ArrayBuffer | false;
  atob?: typeof atob | null;
  TextEncoder?: typeof TextEncoder;
  TextDecoder?: typeof TextDecoder;
  getRandomArrayBuffer?: (
    byteLength: number,
    callback: (err: Error | null, result: ArrayBuffer | null) => void
  ) => void;
  isWebworker?: boolean;
}
