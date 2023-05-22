import WordArray from 'crypto-js/build/lib-typedarrays';
import Platform from 'common/platform';
import { TypedArray } from 'common/types/IPlatformConfig';
import IBufferUtils from 'common/types/IBufferUtils';

/* Most BufferUtils methods that return a binary object return an ArrayBuffer
 * The exception is toBuffer, which returns a Uint8Array (and won't work on
 * browsers too old to support it) */

export type Bufferlike = ArrayBuffer | TypedArray;
export type Output = Bufferlike;
export type ToBufferOutput = Uint8Array;
export type ComparableBuffer = ArrayBuffer;
export type WordArrayLike = WordArray;

class BufferUtils implements IBufferUtils<Bufferlike, Output, ToBufferOutput, ComparableBuffer, WordArrayLike> {
  base64CharSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  hexCharSet = '0123456789abcdef';

  isWordArray(ob: unknown): ob is WordArray {
    return ob !== null && ob !== undefined && (ob as WordArray).sigBytes !== undefined;
  }

  isArrayBuffer(ob: unknown): ob is ArrayBuffer {
    return ob !== null && ob !== undefined && (ob as ArrayBuffer).constructor === ArrayBuffer;
  }

  isTypedArray(ob: unknown): ob is TypedArray {
    return !!ArrayBuffer && ArrayBuffer.isView && ArrayBuffer.isView(ob);
  }

  // // https://gist.githubusercontent.com/jonleighton/958841/raw/f200e30dfe95212c0165ccf1ae000ca51e9de803/gistfile1.js
  uint8ViewToBase64(bytes: Uint8Array) {
    let base64 = '';
    const encodings = this.base64CharSet;

    const byteLength = bytes.byteLength;
    const byteRemainder = byteLength % 3;
    const mainLength = byteLength - byteRemainder;

    let a, b, c, d;
    let chunk;

    // Main loop deals with bytes in chunks of 3
    for (let i = 0; i < mainLength; i = i + 3) {
      // Combine the three bytes into a single integer
      chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

      // Use bitmasks to extract 6-bit segments from the triplet
      a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
      b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
      c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
      d = chunk & 63; // 63       = 2^6 - 1

      // Convert the raw binary segments to the appropriate ASCII encoding
      base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder == 1) {
      chunk = bytes[mainLength];

      a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

      // Set the 4 least significant bits to zero
      b = (chunk & 3) << 4; // 3   = 2^2 - 1

      base64 += encodings[a] + encodings[b] + '==';
    } else if (byteRemainder == 2) {
      chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

      a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
      b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4

      // Set the 2 least significant bits to zero
      c = (chunk & 15) << 2; // 15    = 2^4 - 1

      base64 += encodings[a] + encodings[b] + encodings[c] + '=';
    }

    return base64;
  }

  base64ToArrayBuffer(base64: string) {
    const binary_string = atob?.(base64) as string; // this will always be defined in browser so it's safe to cast
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      const ascii = binary_string.charCodeAt(i);
      bytes[i] = ascii;
    }
    return bytes.buffer;
  }

  isBuffer(buffer: unknown): buffer is Bufferlike {
    return this.isArrayBuffer(buffer) || this.isTypedArray(buffer);
  }

  /* In browsers, returns a Uint8Array */
  toBuffer(buffer: Bufferlike): ToBufferOutput {
    if (!ArrayBuffer) {
      throw new Error("Can't convert to Buffer: browser does not support the necessary types");
    }

    if (this.isArrayBuffer(buffer)) {
      return new Uint8Array(buffer);
    }

    // TODO is a TypedArray an ArrayBuffer? what's going on here?

    //if (this.isTypedArray(buffer)) {
    //return new Uint8Array(buffer.buffer);
    //}

    throw new Error('BufferUtils.toBuffer expected an arraybuffer or typed array');
  }

  wordArrayToBuffer(wordArray: WordArrayLike) {
    /* Backported from unreleased CryptoJS
     * https://code.google.com/p/crypto-js/source/browse/branches/3.x/src/lib-typedarrays.js?r=661 */
    var arrayBuffer = new ArrayBuffer(wordArray.sigBytes);
    var uint8View = new Uint8Array(arrayBuffer);

    for (var i = 0; i < wordArray.sigBytes; i++) {
      uint8View[i] = (wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }

    return uint8View;
  }

  toArrayBuffer(buffer: Bufferlike | WordArrayLike): ArrayBuffer {
    if (this.isArrayBuffer(buffer)) {
      return buffer;
    }
    if (this.isWordArray(buffer)) {
      return this.wordArrayToBuffer(buffer);
    }
    return this.toBuffer(buffer).buffer;
  }

  toWordArray(buffer: Bufferlike | number[]) {
    if (this.isTypedArray(buffer)) {
      buffer = buffer.buffer;
    }
    return this.isWordArray(buffer) ? buffer : WordArray.create(buffer as number[]);
  }

  base64Encode(buffer: Bufferlike) {
    return this.uint8ViewToBase64(this.toBuffer(buffer));
  }

  base64Decode(str: string): Output {
    if (ArrayBuffer && Platform.Config.atob) {
      return this.base64ToArrayBuffer(str);
    } else {
      throw new Error('Expected ArrayBuffer to exist and Platform.Config.atob to be configured');
    }
  }

  // TODO inspect, https://github.com/LinusU/array-buffer-to-hex/blob/fbff172a0d666d53ed95e65d19a6ee9b4009f1b9/index.js
  arrayBufferToHex(arrayBuffer: ArrayBuffer) {
    if (typeof arrayBuffer !== 'object' || arrayBuffer === null || typeof arrayBuffer.byteLength !== 'number') {
      throw new TypeError('Expected input to be an ArrayBuffer');
    }

    var view = new Uint8Array(arrayBuffer);
    var result = '';
    var value;

    for (var i = 0; i < view.length; i++) {
      value = view[i].toString(16);
      result += value.length === 1 ? '0' + value : value;
    }

    return result;
  }

  hexEncode(buffer: Bufferlike) {
    // TODO is TypedArray a type of ArrayBuffer? what's going on here? or are the types confused?
    return this.arrayBufferToHex(buffer);
  }

  // TODO inspect, https://gist.github.com/don/871170d88cf6b9007f7663fdbc23fe09
  /**
   * Convert a hex string to an ArrayBuffer.
   *
   * @param hexString - hex representation of bytes
   * @return The bytes in an ArrayBuffer.
   */
  hexStringToArrayBuffer(hexString: string) {
    // remove the leading 0x
    hexString = hexString.replace(/^0x/, '');

    // ensure even number of characters
    if (hexString.length % 2 != 0) {
      console.log('WARNING: expecting an even number of characters in the hexString');
    }

    // check for some non-hex characters
    var bad = hexString.match(/[G-Z\s]/i);
    if (bad) {
      console.log('WARNING: found non-hex characters', bad);
    }

    // split the string into pairs of octets
    var pairs = hexString.match(/[\dA-F]{2}/gi)!;

    // convert the octets to integers
    var integers = pairs.map(function (s) {
      return parseInt(s, 16);
    });

    var array = new Uint8Array(integers);
    console.log(array);

    return array.buffer;
  }

  hexDecode(string: string) {
    return this.hexStringToArrayBuffer(string);
  }

  utf8Encode(string: string) {
    if (Platform.Config.TextEncoder) {
      return new Platform.Config.TextEncoder().encode(string).buffer;
    } else {
      throw new Error('Expected TextEncoder to be configured');
    }
  }

  /* For utf8 decoding we apply slightly stricter input validation than to
   * hexEncode/base64Encode/etc: in those we accept anything that Buffer.from
   * can take (in particular allowing strings, which are just interpreted as
   * binary); here we ensure that the input is actually a buffer since trying
   * to utf8-decode a string to another string is almost certainly a mistake */
  utf8Decode(buffer: Bufferlike) {
    if (!this.isBuffer(buffer)) {
      throw new Error('Expected input of utf8decode to be an arraybuffer or typed array');
    }
    if (TextDecoder) {
      return new TextDecoder().decode(buffer);
    } else {
      throw new Error('Expected TextDecoder to be configured');
    }
  }

  // TODO these two are copied from https://stackoverflow.com/a/53066400
  // compare ArrayBuffers
  arrayBuffersAreEqual(a: ArrayBuffer, b: ArrayBuffer) {
    return this.dataViewsAreEqual(new DataView(a), new DataView(b));
  }

  // compare DataViews
  dataViewsAreEqual(a: DataView, b: DataView) {
    if (a.byteLength !== b.byteLength) return false;
    for (let i = 0; i < a.byteLength; i++) {
      if (a.getUint8(i) !== b.getUint8(i)) return false;
    }
    return true;
  }

  bufferCompare(buffer1: ComparableBuffer, buffer2: ComparableBuffer) {
    if (!buffer1) return -1;
    if (!buffer2) return 1;

    // TODO this isn't quite doing the right thing, no need to know which is larger though
    return this.arrayBuffersAreEqual(buffer1, buffer2) ? 0 : 1;
  }

  byteLength(buffer: Bufferlike) {
    if (this.isArrayBuffer(buffer) || this.isTypedArray(buffer)) {
      return buffer.byteLength;
    }
    return -1;
  }

  /* Returns ArrayBuffer on browser and Buffer on Node.js */
  typedArrayToBuffer(typedArray: TypedArray) {
    return typedArray.buffer;
  }
}

export default new BufferUtils();
