import Platform from "platform";
import BufferUtils from "platform-bufferutils";

/* Data is assumed to be either a string or a buffer. */
export default function(data: string | Buffer) {
  if(BufferUtils.isBuffer(data)) {
    return BufferUtils.byteLength(data);
  }
  if(typeof data === 'string') {
    return Platform.stringByteSize(data);
  }
  throw new Error("Expected input of Utils.dataSizeBytes to be a buffer or string, but was: " + (typeof data));
};
