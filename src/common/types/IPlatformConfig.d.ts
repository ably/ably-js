/**
 * Interface for common config properties shared between all platforms and that are relevant for all platforms.
 *
 * These properties must always be required and set for each platform.
 */
export interface ICommonPlatformConfig {
  agent: string;
  logTimestamps: boolean;
  binaryType: BinaryType;
  WebSocket: typeof WebSocket | typeof import('ws');
  useProtocolHeartbeats: boolean;
  supportsBinary: boolean;
  preferBinary: boolean;
  nextTick: process.nextTick;
  inspect: (value: unknown) => string;
  stringByteSize: Buffer.byteLength;
}

/**
 * Interface for platform specific config properties that do make sense on some platforms but not on others.
 *
 * These properties should always be optional, so that only relevant platforms would set them.
 */
export interface ISpecificPlatformConfig {
  addEventListener?: typeof window.addEventListener | typeof global.addEventListener | null;
  getRandomValues?: (arr: ArrayBufferView, callback?: (error: Error | null) => void) => void;
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

export type IPlatformConfig = ICommonPlatformConfig & ISpecificPlatformConfig;
