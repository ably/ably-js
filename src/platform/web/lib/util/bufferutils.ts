import Platform from 'common/platform';
import IBufferUtils from 'common/types/IBufferUtils';
import { hmac as hmacSha256, sha256 } from './hmac-sha256';

/* Most BufferUtils methods that return a binary object return an ArrayBuffer
 * The exception is toBuffer, which returns a Uint8Array */

export type Bufferlike = BufferSource;
export type Output = ArrayBuffer;
export type ToBufferOutput = Uint8Array;

const U8 = Uint8Array,
  AB = ArrayBuffer;

function toAB(buffer: Bufferlike): ArrayBuffer {
  if (buffer instanceof AB) return buffer;
  if (AB.isView(buffer))
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  throw new Error('BufferUtils.toArrayBuffer expected an ArrayBuffer or a view onto one');
}

function toBuf(buffer: Bufferlike): Uint8Array {
  if (buffer instanceof AB) return new U8(buffer);
  if (AB.isView(buffer)) return new U8(toAB(buffer));
  throw new Error('BufferUtils.toBuffer expected an ArrayBuffer or a view onto one');
}

class BufferUtils implements IBufferUtils<Bufferlike, Output, ToBufferOutput> {
  base64CharSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  hexCharSet = '0123456789abcdef';

  isBuffer(buffer: unknown): buffer is Bufferlike {
    return buffer instanceof AB || AB.isView(buffer);
  }

  toBuffer = toBuf;
  toArrayBuffer = toAB;

  base64Encode(buffer: Bufferlike): string {
    const bytes = toBuf(buffer);
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }

  base64UrlEncode(buffer: Bufferlike): string {
    return this.base64Encode(buffer).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  base64Decode(str: string): Output {
    const s = atob(str);
    const b = new U8(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return toAB(b);
  }

  hexEncode(buffer: Bufferlike): string {
    return toBuf(buffer).reduce((a, b) => a + b.toString(16).padStart(2, '0'), '');
  }

  hexDecode(hex: string): Output {
    if (hex.length % 2 !== 0) throw new Error("Can't create a byte array from a hex string of odd length");
    const a = new U8(hex.length / 2);
    for (let i = 0; i < a.length; i++) a[i] = parseInt(hex.slice(2 * i, 2 * i + 2), 16);
    return toAB(a);
  }

  utf8Encode(string: string): Output {
    if (Platform.Config.TextEncoder) {
      return toAB(new Platform.Config.TextEncoder().encode(string));
    }
    throw new Error('Expected TextEncoder to be configured');
  }

  utf8Decode(buffer: Bufferlike): string {
    if (!this.isBuffer(buffer)) throw new Error('Expected input of utf8decode to be an arraybuffer or typed array');
    if (TextDecoder) return new TextDecoder().decode(buffer);
    throw new Error('Expected TextDecoder to be configured');
  }

  areBuffersEqual(buffer1: Bufferlike, buffer2: Bufferlike): boolean {
    if (!buffer1 || !buffer2) return false;
    const a = new U8(toAB(buffer1)),
      b = new U8(toAB(buffer2));
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  byteLength(buffer: Bufferlike): number {
    if (buffer instanceof AB || AB.isView(buffer)) return buffer.byteLength;
    return -1;
  }

  arrayBufferViewToBuffer(v: ArrayBufferView): ArrayBuffer {
    return toAB(v);
  }

  concat(buffers: Bufferlike[]): Output {
    const result = new U8(buffers.reduce((a, v) => a + v.byteLength, 0));
    let offset = 0;
    for (const buffer of buffers) {
      const u = toBuf(buffer);
      result.set(u, offset);
      offset += u.byteLength;
    }
    return result.buffer;
  }

  sha256(message: Bufferlike): Output {
    return toAB(sha256(toBuf(message)));
  }

  hmacSha256(message: Bufferlike, key: Bufferlike): Output {
    return toAB(hmacSha256(toBuf(key), toBuf(message)));
  }
}

export default new BufferUtils();
