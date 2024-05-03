import IBufferUtils from 'common/types/IBufferUtils';
import crypto from 'crypto';

export type Bufferlike = Buffer | ArrayBuffer | ArrayBufferView;
export type Output = Buffer;
export type ToBufferOutput = Buffer;

class BufferUtils implements IBufferUtils<Bufferlike, Output, ToBufferOutput> {
  base64CharSet: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  hexCharSet: string = '0123456789abcdef';

  base64Decode(string: string): Output {
    return Buffer.from(string, 'base64');
  }

  base64Encode(buffer: Bufferlike): string {
    return this.toBuffer(buffer).toString('base64');
  }

  areBuffersEqual(buffer1: Bufferlike, buffer2: Bufferlike): boolean {
    if (!buffer1 || !buffer2) return false;
    return this.toBuffer(buffer1).compare(this.toBuffer(buffer2)) == 0;
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

  /* In node, BufferUtils methods that return binary objects return a Buffer
   * for historical reasons; the browser equivalents return ArrayBuffers */
  isBuffer(buffer: unknown): buffer is Bufferlike {
    return Buffer.isBuffer(buffer) || buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer);
  }

  toArrayBuffer(buffer: Bufferlike): ArrayBuffer {
    const nodeBuffer = this.toBuffer(buffer);
    return nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength);
  }

  toBuffer(buffer: Bufferlike): ToBufferOutput {
    if (Buffer.isBuffer(buffer)) {
      return buffer;
    }
    if (buffer instanceof ArrayBuffer) {
      return Buffer.from(buffer);
    }
    return Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }

  arrayBufferViewToBuffer(arrayBufferView: ArrayBufferView): Buffer {
    return this.toBuffer(arrayBufferView);
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

  hmacSha256(message: Bufferlike, key: Bufferlike): Output {
    const messageBuffer = this.toBuffer(message);
    const keyBuffer = this.toBuffer(key);

    const hmac = crypto.createHmac('SHA256', keyBuffer);
    hmac.update(messageBuffer);

    return hmac.digest();
  }
}

export default new BufferUtils();
