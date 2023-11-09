import { IPlatformConfig } from '../../common/types/IPlatformConfig';
import crypto from 'crypto';
import WebSocket from 'ws';
import util from 'util';

const Config: IPlatformConfig = {
  agent: 'nodejs/' + process.versions.node,
  logTimestamps: true,
  userAgent: null,
  binaryType: 'nodebuffer' as BinaryType,
  WebSocket,
  useProtocolHeartbeats: false,
  supportsBinary: true,
  preferBinary: true,
  nextTick: process.nextTick,
  inspect: util.inspect,
  stringByteSize: Buffer.byteLength,
  inherits: util.inherits,
  addEventListener: null,
  getRandomValues: function (arr: ArrayBufferView, callback?: (err: Error | null) => void): void {
    const bytes = crypto.randomBytes(arr.byteLength);
    const dataView = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);

    for (let i = 0; i < bytes.length; i++) {
      dataView.setUint8(i, bytes[i]);
    }

    if (callback) {
      callback(null);
    }
  },
};

export default Config;
