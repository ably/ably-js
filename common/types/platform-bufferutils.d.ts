declare module 'platform-bufferutils' {
  export const base64CharSet: string;
  export const hexCharSet: string;
  export const isBuffer: (buf: unknown) => buf is Buffer | ArrayBuffer | DataView;
  export const toBuffer: (buf: Buffer | TypedArray) => Buffer;
  export const toArrayBuffer: (buf: Buffer) => ArrayBuffer;
  export const base64Encode: (buf: Buffer | TypedArray) => string;
  export const base64Decode: (string: string) => Buffer;
  export const hexEncode: (buf: Buffer | TypedArray) => string;
  export const hexDecode: (string: string) => Buffer;
  export const utf8Encode: (string: string) => Buffer;
  export const utf8Decode: (buf: Buffer) => string;
  export const bufferCompare: (buf1: Buffer, buf2: Buffer) => number;
  export const byteLength: (buffer: Buffer | ArrayBuffer | DataView) => number;
  export const typedArrayToBuffer: (typedArray: TypedArray) => Buffer
}
