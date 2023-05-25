import { TypedArray } from 'common/types/IPlatformConfig';
import IBufferUtils from 'common/types/IBufferUtils';

export type Bufferlike = Buffer | ArrayBuffer | TypedArray;
export type Output = Buffer;
export type ToBufferOutput = Buffer;
export type ComparableBuffer = Buffer;

class BufferUtils implements IBufferUtils<Bufferlike, Output, ToBufferOutput, ComparableBuffer> {
  base64CharSet: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  hexCharSet: string = '0123456789abcdef';

  base64Decode(string: string): Output {
    return Buffer.from(string, 'base64');
  }

  base64Encode(buffer: Bufferlike): string {
    return this.toBuffer(buffer).toString('base64');
  }

  bufferCompare(buffer1: ComparableBuffer, buffer2: ComparableBuffer): number {
    if (!buffer1) return -1;
    if (!buffer2) return 1;
    return buffer1.compare(buffer2);
  }

  byteLength(buffer: Bufferlike): number {
    return buffer.byteLength;
  }

  hexDecode(string: string): Output {
    return Buffer.from(string, 'hex');
  }

  hexEncode(buffer: Bufferlike): string {
    return this.toBuffer(buffer).toString('hex');
  }

  isArrayBuffer(ob: unknown): ob is ArrayBuffer {
    return ob !== null && ob !== undefined && (ob as ArrayBuffer).constructor === ArrayBuffer;
  }

  /* In node, BufferUtils methods that return binary objects return a Buffer
   * for historical reasons; the browser equivalents return ArrayBuffers */
  isBuffer(buffer: unknown): buffer is Bufferlike {
    return Buffer.isBuffer(buffer) || this.isArrayBuffer(buffer) || ArrayBuffer.isView(buffer);
  }

  toArrayBuffer(buffer: Bufferlike): ArrayBuffer {
    const nodeBuffer = this.toBuffer(buffer);
    return nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength);
  }

  toBuffer(buffer: Bufferlike): ToBufferOutput {
    if (Buffer.isBuffer(buffer)) {
      return buffer;
    }
    return Buffer.from(buffer);
  }

  typedArrayToBuffer(typedArray: TypedArray): Buffer {
    return this.toBuffer(typedArray.buffer);
  }

  utf8Decode(buffer: Bufferlike): string {
    if (!this.isBuffer(buffer)) {
      throw new Error('Expected input of utf8Decode to be a buffer, arraybuffer, or view');
    }
    return this.toBuffer(buffer).toString('utf8');
  }

  utf8Encode(string: string): Output {
    return Buffer.from(string, 'utf8');
  }
}

export default new BufferUtils();
