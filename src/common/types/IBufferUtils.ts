import { TypedArray } from './IPlatformConfig';

export default interface IBufferUtils<Bufferlike, Output> {
  base64CharSet: string;
  hexCharSet: string;
  isBuffer: (buffer: unknown) => buffer is Bufferlike;
  toUint8Array: (buffer: Bufferlike) => Uint8Array;
  toArrayBuffer: (buffer: Bufferlike) => ArrayBuffer;
  base64Encode: (buffer: Bufferlike) => string;
  base64Decode: (string: string) => Output;
  hexEncode: (buffer: Bufferlike) => string;
  hexDecode: (string: string) => Output;
  utf8Encode: (string: string) => Output;
  utf8Decode: (buffer: Bufferlike) => string;
  bufferCompare: (buffer1: Buffer, buffer2: Buffer) => number;
  byteLength: (buffer: Bufferlike) => number;
  typedArrayToBuffer: (typedArray: TypedArray) => Bufferlike;
}
