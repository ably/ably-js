import { TypedArray } from './IPlatform';
import WordArray from 'crypto-js/build/lib-typedarrays';

export type NodeBufferlike = Buffer | ArrayBuffer | TypedArray;
// As browsers don't support Buffer, ArrayBuffer is used if supported, and WordArray if not
export type BrowserBufferlike = ArrayBuffer | WordArray;

// A Buffer or a type which can be converted to a buffer
export type Bufferlike = NodeBufferlike | BrowserBufferlike;

export default interface IBufferUtils {
  base64CharSet: string;
  hexCharSet: string;
  isBuffer: (buffer: unknown) => buffer is Bufferlike;
  // On browser this returns a Uint8Array, on node a Buffer
  toBuffer: (buffer: Bufferlike) => Buffer | Uint8Array;
  toArrayBuffer: (buffer: Bufferlike) => ArrayBuffer;
  base64Encode: (buffer: Bufferlike) => string;
  base64Decode: (string: string) => Buffer | BrowserBufferlike;
  hexEncode: (buffer: Bufferlike) => string;
  hexDecode: (string: string) => Buffer | BrowserBufferlike;
  utf8Encode: (string: string) => Buffer | BrowserBufferlike;
  utf8Decode: (buffer: Bufferlike) => string;
  bufferCompare: (buffer1: Buffer, buffer2: Buffer) => number;
  byteLength: (buffer: Bufferlike) => number;
  typedArrayToBuffer: (typedArray: TypedArray) => Bufferlike;
}
