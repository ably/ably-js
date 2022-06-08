import { TypedArray } from 'common/types/IPlatform';
import IBufferUtils, { Bufferlike, NodeBufferlike } from 'common/types/IBufferUtils';

class BufferUtils implements IBufferUtils {
  base64CharSet: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  hexCharSet: string = '0123456789abcdef';

  base64Decode(string: string): Buffer {
    return Buffer.from(string, 'base64');
  }

  base64Encode(buffer: Bufferlike): string {
    return this.toBuffer(buffer).toString('base64');
  }

  bufferCompare(buffer1: Buffer, buffer2: Buffer): number {
    if (!buffer1) return -1;
    if (!buffer2) return 1;
    return buffer1.compare(buffer2);
  }

  byteLength(buffer: Bufferlike): number {
    return (buffer as NodeBufferlike).byteLength;
  }

  hexDecode(string: string): Buffer {
    return Buffer.from(string, 'hex');
  }

  hexEncode(buffer: Bufferlike): string {
    return this.toBuffer(buffer).toString('hex');
  }

  isArrayBuffer(ob: unknown) {
    return ob !== null && ob !== undefined && (ob as ArrayBuffer).constructor === ArrayBuffer;
  }

  /* In node, BufferUtils methods that return binary objects return a Buffer
   * for historical reasons; the browser equivalents return ArrayBuffers */
  isBuffer(buffer: unknown): buffer is Bufferlike {
    return Buffer.isBuffer(buffer) || this.isArrayBuffer(buffer) || ArrayBuffer.isView(buffer);
  }

  toArrayBuffer(buffer: Bufferlike): ArrayBuffer {
    return this.toBuffer(buffer).buffer;
  }

  toBuffer(buffer: Bufferlike): Buffer {
    if (Buffer.isBuffer(buffer)) {
      return buffer;
    }
    return Buffer.from(buffer as TypedArray);
  }

  typedArrayToBuffer(typedArray: TypedArray): Buffer {
    return this.toBuffer(typedArray.buffer as Buffer);
  }

  utf8Decode(buffer: Bufferlike): string {
    if (!this.isBuffer(buffer)) {
      throw new Error('Expected input of utf8Decode to be a buffer, arraybuffer, or view');
    }
    return this.toBuffer(buffer).toString('utf8');
  }

  utf8Encode(string: string): Buffer {
    return Buffer.from(string, 'utf8');
  }
}

export default new BufferUtils();
