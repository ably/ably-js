import { TypedArray } from './IPlatformConfig';

export default interface IBufferUtils<Bufferlike, Output, ToBufferOutput, WordArrayLike> {
  base64CharSet: string;
  hexCharSet: string;
  isBuffer: (buffer: unknown) => buffer is Bufferlike;
  isArrayBuffer: (buffer: unknown) => buffer is ArrayBuffer;
  isWordArray: (val: unknown) => val is WordArrayLike;
  // On browser this returns a Uint8Array, on node a Buffer
  toBuffer: (buffer: Bufferlike) => ToBufferOutput;
  toArrayBuffer: (buffer: Bufferlike) => ArrayBuffer;
  base64Encode: (buffer: Bufferlike) => string;
  base64Decode: (string: string) => Output;
  hexEncode: (buffer: Bufferlike) => string;
  hexDecode: (string: string) => Output;
  utf8Encode: (string: string) => Output;
  utf8Decode: (buffer: Bufferlike) => string;
  bufferCompare: (buffer1: Bufferlike, buffer2: Bufferlike) => number;
  byteLength: (buffer: Bufferlike) => number;
  typedArrayToBuffer: (typedArray: TypedArray) => Bufferlike;
  toWordArray: (buffer: Bufferlike | number[]) => WordArrayLike;
}
