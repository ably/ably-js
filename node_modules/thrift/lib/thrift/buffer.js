var util = require('util');

var mixin = function(target, source) {
	source = source || {};
	Object.keys(source).forEach(function(key) {
		target[key] = source[key];
	});
	return target;
};

/* constructor creates a buffer of a specified length
 * optionally based on the given underlying buffer */
var TBuffer = exports.TBuffer = function(length, buf) {
  this.buf = buf || new Buffer(length);
  this.offset = 0;
};

TBuffer.prototype = {
  slice: function(start, end) {
    return new TBuffer(end-start, this.buf.slice(start, end));
  },
  getInt8: function(off) {
    return this.buf.readInt8(off);
  },
  getInt16: function(off) {
    return this.buf.readInt16BE(off);
  },
  getInt32: function(off) {
    return this.buf.readInt32BE(off);
  },
  getInt64: function(off) {
    var hi = this.buf.readInt32BE(off);
    var lo = this.buf.readUInt32BE(off + 4);
    return new Int64(hi, lo);
  },
  getFloat64: function(off) {
    return this.buf.readDoubleBE(off);
  },
  getUtf8String: function(off, utflen) {
    return this.buf.toString('utf8', off, off + utflen);
  },
  setInt8: function(off, v) {
    this.buf.writeInt8(off, v);
  },
  setInt16: function(off, v) {
    this.buf.writeInt16BE(off, v);
  },
  setInt32: function(off, v) {
    this.buf.writeInt32BE(off, v);
  },
  setInt64: function(off, v) {
    v.buffer.copy(this.buf, off, 0);
  },
  setFloat64: function(off, v) {
    this.buf.writeDoubleBE(off, v);
  },
  setBuffer: function(off, v) {
    v.buffer.copy(this.buf, off, 0);
  },
  setUtf8String: function(off, v) {
    return this.buf.write(v, off);
  },
  inspect: function() {
    var result = 'length: ' + this.length + '\n';
    var idx = 0;
    while(idx < this.length) {
      for(var i = 0; (idx < this.length) && (i < 32); i++)
        result += this.buf[idx++].toString(16) + ' ';
      result += '\n';
    }
    return result;
  }
};

var CheckedBuffer = exports.CheckedBuffer = function(length, buf) {
  TBuffer.call(this, length, buf);
};
util.inherits(CheckedBuffer, TBuffer);

mixin(CheckedBuffer.prototype, {
  grow: function(extra) {
    extra = extra || 0;
    var len = this.length + Math.max(extra, this.length*0.41);
    var newBuf = new Buffer(len);
    this.buf.copy(newBuf);
    this.buf = newBuf;
    this.length = len;
  },
  checkAvailable: function(off, extra) {
    if(off + extra >= this.length)
      this.grow(extra);
  },
  setInt8: function(off, v) {
    this.checkAvailable(1);
    this.buf.writeInt8(off, v);
  },
  setInt16: function(off, v) {
    this.checkAvailable(2);
    this.buf.writeInt16BE(off, v);
  },
  setInt32: function(off, v) {
    this.checkAvailable(4);
    this.buf.writeInt32BE(off, v);
  },
  setInt64: function(off, v) {
    this.checkAvailable(8);
    v.buffer.copy(this.buf, off, 0);
  },
  setFloat64: function(off, v) {
    this.checkAvailable(8);
    this.buf.writeDoubleBE(off, v);
  },
  setBuffer: function(off, v) {
    this.checkAvailable(v.length);
    v.buffer.copy(this.buf, off, 0);
  },
  setUtf8String: function(off, v) {
    var encodedLen = Buffer.byteLength(v);
    var shortfall = off + encodedLen - this.length;
    if(shortfall)
      this.grow(shortfall);
    return this.buf.write(v, off);
  }
});
