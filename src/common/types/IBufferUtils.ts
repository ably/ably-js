import { TypedArray } from "./IPlatform";

// A Buffer or a type which can be converted to a buffer
export type Bufferlike = Buffer | ArrayBuffer | TypedArray | DataView;

export default interface IBufferUtils {
  base64CharSet: string;
  hexCharSet: string;
  isBuffer: (buffer: unknown) => buffer is Bufferlike;
  toBuffer: (buffer: Bufferlike) => Buffer;
  toArrayBuffer: (buffer: Bufferlike) => ArrayBuffer;
  base64Encode: (buffer: Bufferlike) => string;
  base64Decode: (string: string) => Buffer;
  hexEncode: (buffer: Bufferlike) => string;
  hexDecode: (string: string) => Buffer;
  utf8Encode: (string: string) => Buffer;
  utf8Decode: (buffer: Bufferlike) => string;
  bufferCompare: (buffer1: Buffer, buffer2: Buffer) => number;
  byteLength: (buffer: Buffer) => number;
  typedArrayToBuffer: (typedArray: TypedArray) => Buffer;
}
