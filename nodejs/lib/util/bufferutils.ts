import { TypedArray } from '../../../common/types/IPlatform';

function isArrayBuffer(ob: unknown) {
  return ob !== null && ob !== undefined && (ob as ArrayBuffer).constructor === ArrayBuffer;
}

/* In node, BufferUtils methods that return binary objects return a Buffer
 * for historical reasons; the browser equivalents return ArrayBuffers */
export const isBuffer = function (buffer: Buffer | string): buffer is Buffer {
  return Buffer.isBuffer(buffer) || isArrayBuffer(buffer) || ArrayBuffer.isView(buffer);
};

export const toBuffer = function (buffer: Buffer) {
  if (Buffer.isBuffer(buffer)) {
    return buffer;
  }
  return Buffer.from(buffer);
};

export const toArrayBuffer = function (buffer: Buffer) {
  return toBuffer(buffer).buffer;
};

export const base64Encode = function (buffer: Buffer) {
  return toBuffer(buffer).toString('base64');
};

export const base64Decode = function (string: string) {
  return Buffer.from(string, 'base64');
};

export const hexEncode = function (buffer: Buffer) {
  return toBuffer(buffer).toString('hex');
};

export const hexDecode = function (string: string) {
  return Buffer.from(string, 'hex');
};

export const utf8Encode = function (string: string) {
  return Buffer.from(string, 'utf8');
};

/* For utf8 decoding we apply slightly stricter input validation than to
 * hexEncode/base64Encode/etc: in those we accept anything that Buffer.from
 * can take (in particular allowing strings, which are just interpreted as
 * binary); here we ensure that the input is actually a buffer since trying
 * to utf8-decode a string to another string is almost certainly a mistake */
export const utf8Decode = function (buffer: Buffer) {
  if (!isBuffer(buffer)) {
    throw new Error('Expected input of utf8Decode to be a buffer, arraybuffer, or view');
  }
  return toBuffer(buffer).toString('utf8');
};

export const bufferCompare = function (buffer1: Buffer, buffer2: Buffer) {
  if (!buffer1) return -1;
  if (!buffer2) return 1;
  return buffer1.compare(buffer2);
};

export const byteLength = function (buffer: Buffer) {
  return buffer.byteLength;
};

/* Returns ArrayBuffer on browser and Buffer on Node.js */
export const typedArrayToBuffer = function (typedArray: TypedArray) {
  return toBuffer(typedArray.buffer as Buffer);
};
