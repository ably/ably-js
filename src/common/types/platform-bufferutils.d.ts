declare module 'platform-bufferutils' {
  export const base64CharSet: string;
  export const hexCharSet: string;
  export const isBuffer: (buffer: unknown) => buffer is Buffer | ArrayBuffer | DataView;
  export const toBuffer: (buffer: Buffer | TypedArray) => Buffer;
  export const toArrayBuffer: (buffer: Buffer) => ArrayBuffer;
  export const base64Encode: (buffer: Buffer | TypedArray) => string;
  export const base64Decode: (string: string) => Buffer;
  export const hexEncode: (buffer: Buffer | TypedArray) => string;
  export const hexDecode: (string: string) => Buffer;
  export const utf8Encode: (string: string) => Buffer;
  export const utf8Decode: (buffer: Buffer) => string;
  export const bufferCompare: (buffer1: Buffer, buffer2: Buffer) => number;
  export const byteLength: (buffer: Buffer | ArrayBuffer | DataView) => number;
  export const typedArrayToBuffer: (typedArray: TypedArray) => Buffer;
}
