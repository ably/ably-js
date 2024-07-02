import { DeviceFormFactor, DevicePlatform } from 'common/lib/types/devicedetails';

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
  getRandomArrayBuffer: (byteLength: number) => Promise<ArrayBuffer>;
  push?: IPlatformPushConfig;
}

/**
 * Interface for platform specific config properties that do make sense on some platforms but not on others.
 *
 * These properties should always be optional, so that only relevant platforms would set them.
 */
export interface ISpecificPlatformConfig {
  addEventListener?: typeof window.addEventListener | typeof global.addEventListener | null;
  userAgent?: string | null;
  inherits?: typeof import('util').inherits;
  currentUrl?: string;
  fetchSupported?: boolean;
  xhrSupported?: boolean;
  allowComet?: boolean;
  ArrayBuffer?: typeof ArrayBuffer | false;
  atob?: typeof atob | null;
  TextEncoder?: typeof TextEncoder;
  TextDecoder?: typeof TextDecoder;
  isWebworker?: boolean;
}

export interface IPlatformPushStorage {
  get(name: string): string;
  set(name: string, value: string);
  remove(name: string);
}

export interface IPlatformPushConfig {
  platform: DevicePlatform;
  formFactor: DeviceFormFactor;
  storage: IPlatformPushStorage;
  getPushDeviceDetails?(machine: any);
}

export type IPlatformConfig = ICommonPlatformConfig & ISpecificPlatformConfig;
