/*@license Copyright 2015-2022 Ably Real-time Ltd (ably.com)

Ably JavaScript Library v2.6.3
https://github.com/ably/ably-js

Released under the Apache Licence v2.0*/(function (g, f) {
    if ("object" == typeof exports && "object" == typeof module) {
      module.exports = f(require('ws'), require('got'));
    } else if ("function" == typeof define && define.amd) {
      define(['ws', 'got'], f);
    } else if ("object" == typeof exports) {
      exports["Ably"] = f(require('ws'), require('got'));
    } else {
      g["Ably"] = f(g["ws"], g["got"]);
    }
  }(this, (__da, __db) => {
var exports = {};
var module = { exports };
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/bops/from.js
var require_from = __commonJS({
  "node_modules/bops/from.js"(exports2, module2) {
    var Buffer2 = require("buffer").Buffer;
    var version2 = ((process || {}).version || "v0.0.0").slice(1).split(".")[0];
    module2.exports = Number(version2) < 6 ? function from(source, encoding) {
      return new Buffer2(source, encoding);
    } : function from(source, encoding) {
      return Buffer2.from(source, encoding);
    };
  }
});

// node_modules/bops/to.js
var require_to = __commonJS({
  "node_modules/bops/to.js"(exports2, module2) {
    module2.exports = function(source, encoding) {
      return source.toString(encoding);
    };
  }
});

// node_modules/bops/is.js
var require_is = __commonJS({
  "node_modules/bops/is.js"(exports2, module2) {
    var Buffer2 = require("buffer").Buffer;
    module2.exports = function(buffer) {
      return Buffer2.isBuffer(buffer);
    };
  }
});

// node_modules/bops/subarray.js
var require_subarray = __commonJS({
  "node_modules/bops/subarray.js"(exports2, module2) {
    module2.exports = function(source, from, to) {
      return arguments.length === 2 ? source.slice(from) : source.slice(from, to);
    };
  }
});

// node_modules/bops/join.js
var require_join = __commonJS({
  "node_modules/bops/join.js"(exports2, module2) {
    var Buffer2 = require("buffer").Buffer;
    module2.exports = function(targets, hint) {
      return hint !== void 0 ? Buffer2.concat(targets, hint) : Buffer2.concat(targets);
    };
  }
});

// node_modules/bops/copy.js
var require_copy = __commonJS({
  "node_modules/bops/copy.js"(exports2, module2) {
    module2.exports = copy2;
    function copy2(source, target, target_start, source_start, source_end) {
      return source.copy(target, target_start, source_start, source_end);
    }
  }
});

// node_modules/bops/create.js
var require_create = __commonJS({
  "node_modules/bops/create.js"(exports2, module2) {
    var Buffer2 = require("buffer").Buffer;
    var version2 = ((process || {}).version || "v0.0.0").slice(1).split(".")[0];
    module2.exports = Number(version2) < 6 ? function create(size) {
      return new Buffer2(size);
    } : function create(size) {
      return Buffer2.alloc(size);
    };
  }
});

// node_modules/bops/read.js
var require_read = __commonJS({
  "node_modules/bops/read.js"(exports2, module2) {
    var proto = {};
    var rex = /read.+/;
    var buildFn;
    buildFn = function(key2) {
      var code = "return buf." + key2 + "(" + ["a", "b", "c"].join(",") + ")";
      return new Function(["buf", "a", "b", "c"], code);
    };
    module2.exports = proto;
    for (key in Buffer.prototype) {
      if (rex.test(key)) {
        proto[key] = buildFn(key);
      }
    }
    var key;
  }
});

// node_modules/bops/write.js
var require_write = __commonJS({
  "node_modules/bops/write.js"(exports2, module2) {
    var Buffer2 = require("buffer").Buffer;
    var proto = {};
    var rex = /write.+/;
    var buildFn;
    buildFn = function(key2) {
      var code = "return buf." + key2 + "(" + ["a", "b", "c"].join(",") + ")";
      return new Function(["buf", "a", "b", "c"], code);
    };
    module2.exports = proto;
    for (key in Buffer2.prototype) {
      if (rex.test(key)) {
        proto[key] = buildFn(key);
      }
    }
    var key;
  }
});

// node_modules/bops/index.js
var require_bops = __commonJS({
  "node_modules/bops/index.js"(exports2, module2) {
    var proto = {};
    module2.exports = proto;
    proto.from = require_from();
    proto.to = require_to();
    proto.is = require_is();
    proto.subarray = require_subarray();
    proto.join = require_join();
    proto.copy = require_copy();
    proto.create = require_create();
    mix(require_read(), proto);
    mix(require_write(), proto);
    function mix(from, into) {
      for (var key in from) {
        into[key] = from[key];
      }
    }
  }
});

// node_modules/@ably/msgpack-js/msgpack.js
var require_msgpack = __commonJS({
  "node_modules/@ably/msgpack-js/msgpack.js"(exports2) {
    "use strict";
    var bops = require_bops();
    exports2.encode = function(value, sparse) {
      var size = sizeof(value, sparse);
      if (size == 0)
        return void 0;
      var buffer = bops.create(size);
      encode2(value, buffer, 0, sparse);
      return buffer;
    };
    exports2.decode = decode2;
    var SH_L_32 = (1 << 16) * (1 << 16);
    var SH_R_32 = 1 / SH_L_32;
    function readInt64BE(buf, offset) {
      offset = offset || 0;
      return buf.readInt32BE(offset + 0) * SH_L_32 + buf.readUInt32BE(offset + 4);
    }
    function readUInt64BE(buf, offset) {
      offset = offset || 0;
      return buf.readUInt32BE(offset + 0) * SH_L_32 + buf.readUInt32BE(offset + 4);
    }
    function writeInt64BE(buf, val, offset) {
      if (val < 9223372036854776e3) {
        buf.writeInt32BE(Math.floor(val * SH_R_32), offset);
        buf.writeInt32BE(val & -1, offset + 4);
      } else {
        buf.writeUInt32BE(2147483647, offset);
        buf.writeUInt32BE(4294967295, offset + 4);
      }
    }
    function writeUInt64BE(buf, val, offset) {
      if (val < 18446744073709552e3) {
        buf.writeUInt32BE(Math.floor(val * SH_R_32), offset);
        buf.writeInt32BE(val & -1, offset + 4);
      } else {
        buf.writeUInt32BE(4294967295, offset);
        buf.writeUInt32BE(4294967295, offset + 4);
      }
    }
    function Decoder(buffer, offset) {
      this.offset = offset || 0;
      this.buffer = buffer;
      this.bufferLength = buffer.length;
    }
    Decoder.prototype.map = function(length) {
      if (length * 2 > this.bufferLength) {
        throw new Error(`malformed messagepack detected: buffer size was ${this.bufferLength}, but referenced a map of length ${length})`);
      }
      var value = {};
      for (var i = 0; i < length; i++) {
        var key = this.parse();
        value[key] = this.parse();
      }
      return value;
    };
    Decoder.prototype.bin = Decoder.prototype.buf = function(length) {
      if (length > this.bufferLength) {
        throw new Error(`malformed messagepack detected: buffer size was ${this.bufferLength}, but referenced a binary of length ${length})`);
      }
      var value = bops.subarray(this.buffer, this.offset, this.offset + length);
      this.offset += length;
      return value;
    };
    Decoder.prototype.str = function(length) {
      if (length > this.bufferLength) {
        throw new Error(`malformed messagepack detected: buffer size was ${this.bufferLength}, but referenced a string of length ${length})`);
      }
      var value = bops.to(bops.subarray(this.buffer, this.offset, this.offset + length));
      this.offset += length;
      return value;
    };
    Decoder.prototype.array = function(length) {
      if (length > this.bufferLength) {
        throw new Error(`malformed messagepack detected: buffer size was ${this.bufferLength}, but referenced an array of length ${length})`);
      }
      var value = new Array(length);
      for (var i = 0; i < length; i++) {
        value[i] = this.parse();
      }
      return value;
    };
    Decoder.prototype.parse = function() {
      var type = this.buffer[this.offset];
      var value, length, extType;
      if (type === void 0) {
        throw new Error("malformed messagepack (referenced offset is outside buffer)");
      }
      if ((type & 128) === 0) {
        this.offset++;
        return type;
      }
      if ((type & 240) === 128) {
        length = type & 15;
        this.offset++;
        return this.map(length);
      }
      if ((type & 240) === 144) {
        length = type & 15;
        this.offset++;
        return this.array(length);
      }
      if ((type & 224) === 160) {
        length = type & 31;
        this.offset++;
        return this.str(length);
      }
      if ((type & 224) === 224) {
        value = bops.readInt8(this.buffer, this.offset);
        this.offset++;
        return value;
      }
      switch (type) {
        case 192:
          this.offset++;
          return null;
        case 194:
          this.offset++;
          return false;
        case 195:
          this.offset++;
          return true;
        case 196:
          length = bops.readUInt8(this.buffer, this.offset + 1);
          this.offset += 2;
          return this.bin(length);
        case 197:
          length = bops.readUInt16BE(this.buffer, this.offset + 1);
          this.offset += 3;
          return this.bin(length);
        case 198:
          length = bops.readUInt32BE(this.buffer, this.offset + 1);
          this.offset += 5;
          return this.bin(length);
        case 199:
          length = bops.readUInt8(this.buffer, this.offset + 1);
          extType = bops.readUInt8(this.buffer, this.offset + 2);
          this.offset += 3;
          return [extType, this.bin(length)];
        case 200:
          length = bops.readUInt16BE(this.buffer, this.offset + 1);
          extType = bops.readUInt8(this.buffer, this.offset + 3);
          this.offset += 4;
          return [extType, this.bin(length)];
        case 201:
          length = bops.readUInt32BE(this.buffer, this.offset + 1);
          extType = bops.readUInt8(this.buffer, this.offset + 5);
          this.offset += 6;
          return [extType, this.bin(length)];
        case 202:
          value = bops.readFloatBE(this.buffer, this.offset + 1);
          this.offset += 5;
          return value;
        case 203:
          value = bops.readDoubleBE(this.buffer, this.offset + 1);
          this.offset += 9;
          return value;
        case 204:
          value = this.buffer[this.offset + 1];
          this.offset += 2;
          return value;
        case 205:
          value = bops.readUInt16BE(this.buffer, this.offset + 1);
          this.offset += 3;
          return value;
        case 206:
          value = bops.readUInt32BE(this.buffer, this.offset + 1);
          this.offset += 5;
          return value;
        case 207:
          value = readUInt64BE(this.buffer, this.offset + 1);
          this.offset += 9;
          return value;
        case 208:
          value = bops.readInt8(this.buffer, this.offset + 1);
          this.offset += 2;
          return value;
        case 209:
          value = bops.readInt16BE(this.buffer, this.offset + 1);
          this.offset += 3;
          return value;
        case 210:
          value = bops.readInt32BE(this.buffer, this.offset + 1);
          this.offset += 5;
          return value;
        case 211:
          value = readInt64BE(this.buffer, this.offset + 1);
          this.offset += 9;
          return value;
        case 212:
          extType = bops.readUInt8(this.buffer, this.offset + 1);
          value = bops.readUInt8(this.buffer, this.offset + 2);
          this.offset += 3;
          return extType === 0 && value === 0 ? void 0 : [extType, value];
        case 213:
          extType = bops.readUInt8(this.buffer, this.offset + 1);
          this.offset += 2;
          return [extType, this.bin(2)];
        case 214:
          extType = bops.readUInt8(this.buffer, this.offset + 1);
          this.offset += 2;
          return [extType, this.bin(4)];
        case 215:
          extType = bops.readUInt8(this.buffer, this.offset + 1);
          this.offset += 2;
          return [extType, this.bin(8)];
        case 216:
          extType = bops.readUInt8(this.buffer, this.offset + 1);
          this.offset += 2;
          return [extType, this.bin(16)];
        case 217:
          length = bops.readUInt8(this.buffer, this.offset + 1);
          this.offset += 2;
          return this.str(length);
        case 218:
          length = bops.readUInt16BE(this.buffer, this.offset + 1);
          this.offset += 3;
          return this.str(length);
        case 219:
          length = bops.readUInt32BE(this.buffer, this.offset + 1);
          this.offset += 5;
          return this.str(length);
        case 220:
          length = bops.readUInt16BE(this.buffer, this.offset + 1);
          this.offset += 3;
          return this.array(length);
        case 221:
          length = bops.readUInt32BE(this.buffer, this.offset + 1);
          this.offset += 5;
          return this.array(length);
        case 222:
          length = bops.readUInt16BE(this.buffer, this.offset + 1);
          this.offset += 3;
          return this.map(length);
        case 223:
          length = bops.readUInt32BE(this.buffer, this.offset + 1);
          this.offset += 5;
          return this.map(length);
      }
      throw new Error("Unknown type 0x" + type.toString(16));
    };
    function decode2(buffer) {
      var decoder = new Decoder(buffer);
      var value = decoder.parse();
      if (decoder.offset !== buffer.length)
        throw new Error(buffer.length - decoder.offset + " trailing bytes");
      return value;
    }
    function encodeableKeys(value, sparse) {
      return Object.keys(value).filter(function(e) {
        var val = value[e], type = typeof val;
        return (!sparse || val !== void 0 && val !== null) && ("function" !== type || !!val.toJSON);
      });
    }
    function encode2(value, buffer, offset, sparse, isMapElement) {
      var type = typeof value;
      var length, size;
      if (type === "string") {
        value = bops.from(value);
        length = value.length;
        if (length < 32) {
          buffer[offset] = length | 160;
          bops.copy(value, buffer, offset + 1);
          return 1 + length;
        }
        if (length < 256) {
          buffer[offset] = 217;
          bops.writeUInt8(buffer, length, offset + 1);
          bops.copy(value, buffer, offset + 2);
          return 2 + length;
        }
        if (length < 65536) {
          buffer[offset] = 218;
          bops.writeUInt16BE(buffer, length, offset + 1);
          bops.copy(value, buffer, offset + 3);
          return 3 + length;
        }
        if (length < 4294967296) {
          buffer[offset] = 219;
          bops.writeUInt32BE(buffer, length, offset + 1);
          bops.copy(value, buffer, offset + 5);
          return 5 + length;
        }
      }
      if (bops.is(value)) {
        length = value.length;
        if (length < 256) {
          buffer[offset] = 196;
          bops.writeUInt8(buffer, length, offset + 1);
          bops.copy(value, buffer, offset + 2);
          return 2 + length;
        }
        if (length < 65536) {
          buffer[offset] = 197;
          bops.writeUInt16BE(buffer, length, offset + 1);
          bops.copy(value, buffer, offset + 3);
          return 3 + length;
        }
        if (length < 4294967296) {
          buffer[offset] = 198;
          bops.writeUInt32BE(buffer, length, offset + 1);
          bops.copy(value, buffer, offset + 5);
          return 5 + length;
        }
      }
      if (type === "number") {
        if (Math.floor(value) !== value) {
          buffer[offset] = 203;
          bops.writeDoubleBE(buffer, value, offset + 1);
          return 9;
        }
        if (value >= 0) {
          if (value < 128) {
            buffer[offset] = value;
            return 1;
          }
          if (value < 256) {
            buffer[offset] = 204;
            buffer[offset + 1] = value;
            return 2;
          }
          if (value < 65536) {
            buffer[offset] = 205;
            bops.writeUInt16BE(buffer, value, offset + 1);
            return 3;
          }
          if (value < 4294967296) {
            buffer[offset] = 206;
            bops.writeUInt32BE(buffer, value, offset + 1);
            return 5;
          }
          if (value < 18446744073709552e3) {
            buffer[offset] = 207;
            writeUInt64BE(buffer, value, offset + 1);
            return 9;
          }
          throw new Error("Number too big 0x" + value.toString(16));
        }
        if (value >= -32) {
          bops.writeInt8(buffer, value, offset);
          return 1;
        }
        if (value >= -128) {
          buffer[offset] = 208;
          bops.writeInt8(buffer, value, offset + 1);
          return 2;
        }
        if (value >= -32768) {
          buffer[offset] = 209;
          bops.writeInt16BE(buffer, value, offset + 1);
          return 3;
        }
        if (value >= -2147483648) {
          buffer[offset] = 210;
          bops.writeInt32BE(buffer, value, offset + 1);
          return 5;
        }
        if (value >= -9223372036854776e3) {
          buffer[offset] = 211;
          writeInt64BE(buffer, value, offset + 1);
          return 9;
        }
        throw new Error("Number too small -0x" + value.toString(16).substr(1));
      }
      if (type === "undefined") {
        if (sparse && isMapElement)
          return 0;
        buffer[offset] = 212;
        buffer[offset + 1] = 0;
        buffer[offset + 2] = 0;
        return 3;
      }
      if (value === null) {
        if (sparse && isMapElement)
          return 0;
        buffer[offset] = 192;
        return 1;
      }
      if (type === "boolean") {
        buffer[offset] = value ? 195 : 194;
        return 1;
      }
      if ("function" === typeof value.toJSON)
        return encode2(value.toJSON(), buffer, offset, sparse);
      if (type === "object") {
        size = 0;
        var isArray = Array.isArray(value);
        if (isArray) {
          length = value.length;
        } else {
          var keys = encodeableKeys(value, sparse);
          length = keys.length;
        }
        if (length < 16) {
          buffer[offset] = length | (isArray ? 144 : 128);
          size = 1;
        } else if (length < 65536) {
          buffer[offset] = isArray ? 220 : 222;
          bops.writeUInt16BE(buffer, length, offset + 1);
          size = 3;
        } else if (length < 4294967296) {
          buffer[offset] = isArray ? 221 : 223;
          bops.writeUInt32BE(buffer, length, offset + 1);
          size = 5;
        }
        if (isArray) {
          for (var i = 0; i < length; i++) {
            size += encode2(value[i], buffer, offset + size, sparse);
          }
        } else {
          for (var i = 0; i < length; i++) {
            var key = keys[i];
            size += encode2(key, buffer, offset + size);
            size += encode2(value[key], buffer, offset + size, sparse, true);
          }
        }
        return size;
      }
      if (type === "function")
        return void 0;
      throw new Error("Unknown type " + type);
    }
    function sizeof(value, sparse, isMapElement) {
      var type = typeof value;
      var length, size;
      if (type === "string") {
        length = bops.from(value).length;
        if (length < 32) {
          return 1 + length;
        }
        if (length < 256) {
          return 2 + length;
        }
        if (length < 65536) {
          return 3 + length;
        }
        if (length < 4294967296) {
          return 5 + length;
        }
      }
      if (bops.is(value)) {
        length = value.length;
        if (length < 256) {
          return 2 + length;
        }
        if (length < 65536) {
          return 3 + length;
        }
        if (length < 4294967296) {
          return 5 + length;
        }
      }
      if (type === "number") {
        if (Math.floor(value) !== value)
          return 9;
        if (value >= 0) {
          if (value < 128)
            return 1;
          if (value < 256)
            return 2;
          if (value < 65536)
            return 3;
          if (value < 4294967296)
            return 5;
          if (value < 18446744073709552e3)
            return 9;
          throw new Error("Number too big 0x" + value.toString(16));
        }
        if (value >= -32)
          return 1;
        if (value >= -128)
          return 2;
        if (value >= -32768)
          return 3;
        if (value >= -2147483648)
          return 5;
        if (value >= -9223372036854776e3)
          return 9;
        throw new Error("Number too small -0x" + value.toString(16).substr(1));
      }
      if (type === "boolean")
        return 1;
      if (value === null)
        return sparse && isMapElement ? 0 : 1;
      if (value === void 0)
        return sparse && isMapElement ? 0 : 3;
      if ("function" === typeof value.toJSON)
        return sizeof(value.toJSON(), sparse);
      if (type === "object") {
        size = 0;
        if (Array.isArray(value)) {
          length = value.length;
          for (var i = 0; i < length; i++) {
            size += sizeof(value[i], sparse);
          }
        } else {
          var keys = encodeableKeys(value, sparse);
          length = keys.length;
          for (var i = 0; i < length; i++) {
            var key = keys[i];
            size += sizeof(key) + sizeof(value[key], sparse, true);
          }
        }
        if (length < 16) {
          return 1 + size;
        }
        if (length < 65536) {
          return 3 + size;
        }
        if (length < 4294967296) {
          return 5 + size;
        }
        throw new Error("Array or object too long 0x" + length.toString(16));
      }
      if (type === "function")
        return 0;
      throw new Error("Unknown type " + type);
    }
  }
});

// src/common/platform.ts
var Platform = class {
};

// src/common/lib/util/logger.ts
var globalObject = typeof global !== "undefined" ? global : typeof window !== "undefined" ? window : self;
function pad(timeSegment, three) {
  return `${timeSegment}`.padStart(three ? 3 : 2, "0");
}
function getHandler(logger) {
  return Platform.Config.logTimestamps ? function(msg) {
    const time = /* @__PURE__ */ new Date();
    logger(
      pad(time.getHours()) + ":" + pad(time.getMinutes()) + ":" + pad(time.getSeconds()) + "." + pad(time.getMilliseconds(), 1) + " " + msg
    );
  } : function(msg) {
    logger(msg);
  };
}
var getDefaultLoggers = () => {
  var _a2;
  let consoleLogger;
  let errorLogger;
  if (typeof ((_a2 = globalObject == null ? void 0 : globalObject.console) == null ? void 0 : _a2.log) === "function") {
    consoleLogger = function(...args) {
      console.log.apply(console, args);
    };
    errorLogger = console.warn ? function(...args) {
      console.warn.apply(console, args);
    } : consoleLogger;
  } else {
    consoleLogger = errorLogger = function() {
    };
  }
  return [consoleLogger, errorLogger].map(getHandler);
};
var _Logger = class _Logger {
  constructor() {
    this.deprecated = (description, msg) => {
      this.deprecationWarning(`${description} is deprecated and will be removed in a future version. ${msg}`);
    };
    /* Where a logging operation is expensive, such as serialisation of data, use shouldLog will prevent
      the object being serialised if the log level will not output the message */
    this.shouldLog = (level) => {
      return level <= this.logLevel;
    };
    this.setLog = (level, handler) => {
      if (level !== void 0)
        this.logLevel = level;
      if (handler !== void 0)
        this.logHandler = this.logErrorHandler = handler;
    };
    this.logLevel = _Logger.defaultLogLevel;
    this.logHandler = _Logger.defaultLogHandler;
    this.logErrorHandler = _Logger.defaultLogErrorHandler;
  }
  static initLogHandlers() {
    const [logHandler, logErrorHandler] = getDefaultLoggers();
    this.defaultLogHandler = logHandler;
    this.defaultLogErrorHandler = logErrorHandler;
    this.defaultLogger = new _Logger();
  }
  /**
   * Calls to this method are never stripped by the `stripLogs` esbuild plugin. Use it for log statements that you wish to always be included in the modular variant of the SDK.
   */
  static logActionNoStrip(logger, level, action, message) {
    logger.logAction(level, action, message);
  }
  logAction(level, action, message) {
    if (this.shouldLog(level)) {
      (level === 1 /* Error */ ? this.logErrorHandler : this.logHandler)("Ably: " + action + ": " + message, level);
    }
  }
  renamedClientOption(oldName, newName) {
    this.deprecationWarning(
      `The \`${oldName}\` client option has been renamed to \`${newName}\`. Please update your code to use \`${newName}\` instead. \`${oldName}\` will be removed in a future version.`
    );
  }
  renamedMethod(className, oldName, newName) {
    this.deprecationWarning(
      `\`${className}\`\u2019s \`${oldName}\` method has been renamed to \`${newName}\`. Please update your code to use \`${newName}\` instead. \`${oldName}\` will be removed in a future version.`
    );
  }
  deprecationWarning(message) {
    if (this.shouldLog(1 /* Error */)) {
      this.logErrorHandler(`Ably: Deprecation warning - ${message}`, 1 /* Error */);
    }
  }
};
_Logger.defaultLogLevel = 1 /* Error */;
// public constants
_Logger.LOG_NONE = 0 /* None */;
_Logger.LOG_ERROR = 1 /* Error */;
_Logger.LOG_MAJOR = 2 /* Major */;
_Logger.LOG_MINOR = 3 /* Minor */;
_Logger.LOG_MICRO = 4 /* Micro */;
/* public static functions */
/**
 * In the modular variant of the SDK, the `stripLogs` esbuild plugin strips out all calls to this method (when invoked as `Logger.logAction(...)`) except when called with level `Logger.LOG_ERROR`. If you wish for a log statement to never be stripped, use the {@link logActionNoStrip} method instead.
 *
 * The aforementioned plugin expects `level` to be an expression of the form `Logger.LOG_*`; that is, you can’t dynamically specify the log level.
 */
_Logger.logAction = (logger, level, action, message) => {
  _Logger.logActionNoStrip(logger, level, action, message);
};
var Logger = _Logger;
var logger_default = Logger;

// src/common/lib/util/utils.ts
var utils_exports = {};
__export(utils_exports, {
  Format: () => Format,
  allSame: () => allSame,
  allToLowerCase: () => allToLowerCase,
  allToUpperCase: () => allToUpperCase,
  arrChooseN: () => arrChooseN,
  arrDeleteValue: () => arrDeleteValue,
  arrEquals: () => arrEquals,
  arrIntersect: () => arrIntersect,
  arrIntersectOb: () => arrIntersectOb,
  arrPopRandomElement: () => arrPopRandomElement,
  arrSubtract: () => arrSubtract,
  arrWithoutValue: () => arrWithoutValue,
  cheapRandStr: () => cheapRandStr,
  containsValue: () => containsValue,
  copy: () => copy,
  createMissingPluginError: () => createMissingPluginError,
  dataSizeBytes: () => dataSizeBytes,
  decodeBody: () => decodeBody,
  encodeBody: () => encodeBody,
  ensureArray: () => ensureArray,
  forInOwnNonNullProperties: () => forInOwnNonNullProperties,
  getBackoffCoefficient: () => getBackoffCoefficient,
  getGlobalObject: () => getGlobalObject,
  getJitterCoefficient: () => getJitterCoefficient,
  getRetryTime: () => getRetryTime,
  inherits: () => inherits,
  inspectBody: () => inspectBody,
  inspectError: () => inspectError,
  intersect: () => intersect,
  isEmpty: () => isEmpty,
  isErrorInfoOrPartialErrorInfo: () => isErrorInfoOrPartialErrorInfo,
  isNil: () => isNil,
  isObject: () => isObject,
  keysArray: () => keysArray,
  matchDerivedChannel: () => matchDerivedChannel,
  mixin: () => mixin,
  parseQueryString: () => parseQueryString,
  prototypicalClone: () => prototypicalClone,
  randomString: () => randomString,
  shallowClone: () => shallowClone,
  shallowEquals: () => shallowEquals,
  throwMissingPluginError: () => throwMissingPluginError,
  toBase64: () => toBase64,
  toQueryString: () => toQueryString,
  valuesArray: () => valuesArray,
  whenPromiseSettles: () => whenPromiseSettles,
  withTimeoutAsync: () => withTimeoutAsync
});

// src/common/lib/types/errorinfo.ts
function toString(err) {
  let result = "[" + err.constructor.name;
  if (err.message)
    result += ": " + err.message;
  if (err.statusCode)
    result += "; statusCode=" + err.statusCode;
  if (err.code)
    result += "; code=" + err.code;
  if (err.cause)
    result += "; cause=" + inspectError(err.cause);
  if (err.href && !(err.message && err.message.indexOf("help.ably.io") > -1))
    result += "; see " + err.href + " ";
  result += "]";
  return result;
}
var ErrorInfo = class _ErrorInfo extends Error {
  constructor(message, code, statusCode, cause) {
    super(message);
    if (typeof Object.setPrototypeOf !== "undefined") {
      Object.setPrototypeOf(this, _ErrorInfo.prototype);
    }
    this.code = code;
    this.statusCode = statusCode;
    this.cause = cause;
  }
  toString() {
    return toString(this);
  }
  static fromValues(values) {
    const { message, code, statusCode } = values;
    if (typeof message !== "string" || typeof code !== "number" || typeof statusCode !== "number") {
      throw new Error("ErrorInfo.fromValues(): invalid values: " + Platform.Config.inspect(values));
    }
    const result = Object.assign(new _ErrorInfo(message, code, statusCode), values);
    if (result.code && !result.href) {
      result.href = "https://help.ably.io/error/" + result.code;
    }
    return result;
  }
};
var PartialErrorInfo = class _PartialErrorInfo extends Error {
  constructor(message, code, statusCode, cause) {
    super(message);
    if (typeof Object.setPrototypeOf !== "undefined") {
      Object.setPrototypeOf(this, _PartialErrorInfo.prototype);
    }
    this.code = code;
    this.statusCode = statusCode;
    this.cause = cause;
  }
  toString() {
    return toString(this);
  }
  static fromValues(values) {
    const { message, code, statusCode } = values;
    if (typeof message !== "string" || !isNil(code) && typeof code !== "number" || !isNil(statusCode) && typeof statusCode !== "number") {
      throw new Error("PartialErrorInfo.fromValues(): invalid values: " + Platform.Config.inspect(values));
    }
    const result = Object.assign(new _PartialErrorInfo(message, code, statusCode), values);
    if (result.code && !result.href) {
      result.href = "https://help.ably.io/error/" + result.code;
    }
    return result;
  }
};

// src/common/lib/util/utils.ts
function randomPosn(arrOrStr) {
  return Math.floor(Math.random() * arrOrStr.length);
}
function mixin(target, ...args) {
  for (let i = 0; i < args.length; i++) {
    const source = args[i];
    if (!source) {
      break;
    }
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }
  return target;
}
function copy(src) {
  return mixin({}, src);
}
function ensureArray(obj) {
  if (isNil(obj)) {
    return [];
  }
  if (Array.isArray(obj)) {
    return obj;
  }
  return [obj];
}
function isObject(ob) {
  return Object.prototype.toString.call(ob) == "[object Object]";
}
function isEmpty(ob) {
  for (const prop in ob)
    return false;
  return true;
}
function isNil(arg) {
  return arg == null;
}
function shallowClone(ob) {
  const result = new Object();
  for (const prop in ob)
    result[prop] = ob[prop];
  return result;
}
function prototypicalClone(ob, ownProperties) {
  class F {
  }
  F.prototype = ob;
  const result = new F();
  if (ownProperties)
    mixin(result, ownProperties);
  return result;
}
var inherits = function(ctor, superCtor) {
  if (Platform.Config.inherits) {
    Platform.Config.inherits(ctor, superCtor);
    return;
  }
  ctor.super_ = superCtor;
  ctor.prototype = prototypicalClone(superCtor.prototype, { constructor: ctor });
};
function containsValue(ob, val) {
  for (const i in ob) {
    if (ob[i] == val)
      return true;
  }
  return false;
}
function intersect(arr, ob) {
  return Array.isArray(ob) ? arrIntersect(arr, ob) : arrIntersectOb(arr, ob);
}
function arrIntersect(arr1, arr2) {
  const result = [];
  for (let i = 0; i < arr1.length; i++) {
    const member = arr1[i];
    if (arr2.indexOf(member) != -1)
      result.push(member);
  }
  return result;
}
function arrIntersectOb(arr, ob) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const member = arr[i];
    if (member in ob)
      result.push(member);
  }
  return result;
}
function arrSubtract(arr1, arr2) {
  const result = [];
  for (let i = 0; i < arr1.length; i++) {
    const element = arr1[i];
    if (arr2.indexOf(element) == -1)
      result.push(element);
  }
  return result;
}
function arrDeleteValue(arr, val) {
  const idx = arr.indexOf(val);
  const res = idx != -1;
  if (res)
    arr.splice(idx, 1);
  return res;
}
function arrWithoutValue(arr, val) {
  const newArr = arr.slice();
  arrDeleteValue(newArr, val);
  return newArr;
}
function keysArray(ob, ownOnly) {
  const result = [];
  for (const prop in ob) {
    if (ownOnly && !Object.prototype.hasOwnProperty.call(ob, prop))
      continue;
    result.push(prop);
  }
  return result;
}
function valuesArray(ob, ownOnly) {
  const result = [];
  for (const prop in ob) {
    if (ownOnly && !Object.prototype.hasOwnProperty.call(ob, prop))
      continue;
    result.push(ob[prop]);
  }
  return result;
}
function forInOwnNonNullProperties(ob, fn) {
  for (const prop in ob) {
    if (Object.prototype.hasOwnProperty.call(ob, prop) && ob[prop]) {
      fn(prop);
    }
  }
}
function allSame(arr, prop) {
  if (arr.length === 0) {
    return true;
  }
  const first = arr[0][prop];
  return arr.every(function(item) {
    return item[prop] === first;
  });
}
var Format = /* @__PURE__ */ ((Format2) => {
  Format2["msgpack"] = "msgpack";
  Format2["json"] = "json";
  return Format2;
})(Format || {});
function arrPopRandomElement(arr) {
  return arr.splice(randomPosn(arr), 1)[0];
}
function toQueryString(params) {
  const parts = [];
  if (params) {
    for (const key in params)
      parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));
  }
  return parts.length ? "?" + parts.join("&") : "";
}
function parseQueryString(query) {
  let match;
  const search = /([^?&=]+)=?([^&]*)/g;
  const result = {};
  while (match = search.exec(query))
    result[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);
  return result;
}
function isErrorInfoOrPartialErrorInfo(err) {
  return typeof err == "object" && err !== null && (err instanceof ErrorInfo || err instanceof PartialErrorInfo);
}
function inspectError(err) {
  var _a2, _b;
  if (err instanceof Error || ((_a2 = err == null ? void 0 : err.constructor) == null ? void 0 : _a2.name) === "ErrorInfo" || ((_b = err == null ? void 0 : err.constructor) == null ? void 0 : _b.name) === "PartialErrorInfo")
    return err.toString();
  return Platform.Config.inspect(err);
}
function inspectBody(body) {
  if (Platform.BufferUtils.isBuffer(body)) {
    return body.toString();
  } else if (typeof body === "string") {
    return body;
  } else {
    return Platform.Config.inspect(body);
  }
}
function dataSizeBytes(data) {
  if (Platform.BufferUtils.isBuffer(data)) {
    return Platform.BufferUtils.byteLength(data);
  }
  if (typeof data === "string") {
    return Platform.Config.stringByteSize(data);
  }
  throw new Error("Expected input of Utils.dataSizeBytes to be a buffer or string, but was: " + typeof data);
}
function cheapRandStr() {
  return String(Math.random()).substr(2);
}
var randomString = async (numBytes) => {
  const buffer = await Platform.Config.getRandomArrayBuffer(numBytes);
  return Platform.BufferUtils.base64Encode(buffer);
};
function arrChooseN(arr, n) {
  const numItems = Math.min(n, arr.length), mutableArr = arr.slice(), result = [];
  for (let i = 0; i < numItems; i++) {
    result.push(arrPopRandomElement(mutableArr));
  }
  return result;
}
function whenPromiseSettles(promise, callback) {
  promise.then((result) => {
    callback == null ? void 0 : callback(null, result);
  }).catch((err) => {
    callback == null ? void 0 : callback(err);
  });
}
function decodeBody(body, MsgPack, format) {
  if (format == "msgpack") {
    if (!MsgPack) {
      throwMissingPluginError("MsgPack");
    }
    return MsgPack.decode(body);
  }
  return JSON.parse(String(body));
}
function encodeBody(body, MsgPack, format) {
  if (format == "msgpack") {
    if (!MsgPack) {
      throwMissingPluginError("MsgPack");
    }
    return MsgPack.encode(body, true);
  }
  return JSON.stringify(body);
}
function allToLowerCase(arr) {
  return arr.map(function(element) {
    return element && element.toLowerCase();
  });
}
function allToUpperCase(arr) {
  return arr.map(function(element) {
    return element && element.toUpperCase();
  });
}
function getBackoffCoefficient(count) {
  return Math.min((count + 2) / 3, 2);
}
function getJitterCoefficient() {
  return 1 - Math.random() * 0.2;
}
function getRetryTime(initialTimeout, retryAttempt) {
  return initialTimeout * getBackoffCoefficient(retryAttempt) * getJitterCoefficient();
}
function getGlobalObject() {
  if (typeof global !== "undefined") {
    return global;
  }
  if (typeof window !== "undefined") {
    return window;
  }
  return self;
}
function shallowEquals(source, target) {
  return Object.keys(source).every((key) => source[key] === target[key]) && Object.keys(target).every((key) => target[key] === source[key]);
}
function matchDerivedChannel(name) {
  const regex = /^(\[([^?]*)(?:(.*))\])?(.+)$/;
  const match = name.match(regex);
  if (!match || !match.length || match.length < 5) {
    throw new ErrorInfo("regex match failed", 400, 40010);
  }
  if (match[2]) {
    throw new ErrorInfo(`cannot use a derived option with a ${match[2]} channel`, 400, 40010);
  }
  return {
    qualifierParam: match[3] || "",
    channelName: match[4]
  };
}
function toBase64(str) {
  const bufferUtils = Platform.BufferUtils;
  const textBuffer = bufferUtils.utf8Encode(str);
  return bufferUtils.base64Encode(textBuffer);
}
function arrEquals(a, b) {
  return a.length === b.length && a.every(function(val, i) {
    return val === b[i];
  });
}
function createMissingPluginError(pluginName) {
  return new ErrorInfo(`${pluginName} plugin not provided`, 40019, 400);
}
function throwMissingPluginError(pluginName) {
  throw createMissingPluginError(pluginName);
}
async function withTimeoutAsync(promise, timeout = 5e3, err = "Timeout expired") {
  const e = new ErrorInfo(err, 5e4, 500);
  return Promise.race([promise, new Promise((_resolve, reject) => setTimeout(() => reject(e), timeout))]);
}

// package.json
var version = "2.6.3";

// src/common/lib/util/defaults.ts
var agent = "ably-js/" + version;
var Defaults = {
  ENVIRONMENT: "",
  REST_HOST: "rest.ably.io",
  REALTIME_HOST: "realtime.ably.io",
  FALLBACK_HOSTS: [
    "A.ably-realtime.com",
    "B.ably-realtime.com",
    "C.ably-realtime.com",
    "D.ably-realtime.com",
    "E.ably-realtime.com"
  ],
  PORT: 80,
  TLS_PORT: 443,
  TIMEOUTS: {
    /* Documented as options params: */
    disconnectedRetryTimeout: 15e3,
    suspendedRetryTimeout: 3e4,
    /* Undocumented, but part of the api and can be used by customers: */
    httpRequestTimeout: 1e4,
    httpMaxRetryDuration: 15e3,
    channelRetryTimeout: 15e3,
    fallbackRetryTimeout: 6e5,
    /* For internal / test use only: */
    connectionStateTtl: 12e4,
    realtimeRequestTimeout: 1e4,
    recvTimeout: 9e4,
    webSocketConnectTimeout: 1e4,
    webSocketSlowTimeout: 4e3
  },
  httpMaxRetryCount: 3,
  maxMessageSize: 65536,
  version,
  protocolVersion: 3,
  agent,
  getHost,
  getPort,
  getHttpScheme,
  environmentFallbackHosts,
  getFallbackHosts,
  getHosts,
  checkHost,
  objectifyOptions,
  normaliseOptions,
  defaultGetHeaders,
  defaultPostHeaders
};
function getHost(options, host, ws) {
  if (ws)
    host = host == options.restHost && options.realtimeHost || host || options.realtimeHost;
  else
    host = host || options.restHost;
  return host;
}
function getPort(options, tls) {
  return tls || options.tls ? options.tlsPort : options.port;
}
function getHttpScheme(options) {
  return options.tls ? "https://" : "http://";
}
function environmentFallbackHosts(environment) {
  return [
    environment + "-a-fallback.ably-realtime.com",
    environment + "-b-fallback.ably-realtime.com",
    environment + "-c-fallback.ably-realtime.com",
    environment + "-d-fallback.ably-realtime.com",
    environment + "-e-fallback.ably-realtime.com"
  ];
}
function getFallbackHosts(options) {
  const fallbackHosts = options.fallbackHosts, httpMaxRetryCount = typeof options.httpMaxRetryCount !== "undefined" ? options.httpMaxRetryCount : Defaults.httpMaxRetryCount;
  return fallbackHosts ? arrChooseN(fallbackHosts, httpMaxRetryCount) : [];
}
function getHosts(options, ws) {
  const hosts = [options.restHost].concat(getFallbackHosts(options));
  return ws ? hosts.map((host) => getHost(options, host, true)) : hosts;
}
function checkHost(host) {
  if (typeof host !== "string") {
    throw new ErrorInfo("host must be a string; was a " + typeof host, 4e4, 400);
  }
  if (!host.length) {
    throw new ErrorInfo("host must not be zero-length", 4e4, 400);
  }
}
function getRealtimeHost(options, production, environment, logger) {
  if (options.realtimeHost)
    return options.realtimeHost;
  if (options.restHost) {
    logger_default.logAction(
      logger,
      logger_default.LOG_MINOR,
      "Defaults.normaliseOptions",
      'restHost is set to "' + options.restHost + '" but realtimeHost is not set, so setting realtimeHost to "' + options.restHost + '" too. If this is not what you want, please set realtimeHost explicitly.'
    );
    return options.restHost;
  }
  return production ? Defaults.REALTIME_HOST : environment + "-" + Defaults.REALTIME_HOST;
}
function getTimeouts(options) {
  const timeouts = {};
  for (const prop in Defaults.TIMEOUTS) {
    timeouts[prop] = options[prop] || Defaults.TIMEOUTS[prop];
  }
  return timeouts;
}
function getAgentString(options) {
  let agentStr = Defaults.agent;
  if (options.agents) {
    for (var agent2 in options.agents) {
      agentStr += " " + agent2 + "/" + options.agents[agent2];
    }
  }
  return agentStr;
}
function objectifyOptions(options, allowKeyOrToken, sourceForErrorMessage, logger, modularPluginsToInclude) {
  if (options === void 0) {
    const msg = allowKeyOrToken ? `${sourceForErrorMessage} must be initialized with either a client options object, an Ably API key, or an Ably Token` : `${sourceForErrorMessage} must be initialized with a client options object`;
    logger_default.logAction(logger, logger_default.LOG_ERROR, `${sourceForErrorMessage}()`, msg);
    throw new Error(msg);
  }
  let optionsObj;
  if (typeof options === "string") {
    if (options.indexOf(":") == -1) {
      if (!allowKeyOrToken) {
        const msg = `${sourceForErrorMessage} cannot be initialized with just an Ably Token; you must provide a client options object with a \`plugins\` property. (Set this Ably Token as the object\u2019s \`token\` property.)`;
        logger_default.logAction(logger, logger_default.LOG_ERROR, `${sourceForErrorMessage}()`, msg);
        throw new Error(msg);
      }
      optionsObj = { token: options };
    } else {
      if (!allowKeyOrToken) {
        const msg = `${sourceForErrorMessage} cannot be initialized with just an Ably API key; you must provide a client options object with a \`plugins\` property. (Set this Ably API key as the object\u2019s \`key\` property.)`;
        logger_default.logAction(logger, logger_default.LOG_ERROR, `${sourceForErrorMessage}()`, msg);
        throw new Error(msg);
      }
      optionsObj = { key: options };
    }
  } else {
    optionsObj = options;
  }
  if (modularPluginsToInclude) {
    optionsObj = __spreadProps(__spreadValues({}, optionsObj), { plugins: __spreadValues(__spreadValues({}, modularPluginsToInclude), optionsObj.plugins) });
  }
  return optionsObj;
}
function normaliseOptions(options, MsgPack, logger) {
  const loggerToUse = logger != null ? logger : logger_default.defaultLogger;
  if (typeof options.recover === "function" && options.closeOnUnload === true) {
    logger_default.logAction(
      loggerToUse,
      logger_default.LOG_ERROR,
      "Defaults.normaliseOptions",
      "closeOnUnload was true and a session recovery function was set - these are mutually exclusive, so unsetting the latter"
    );
    options.recover = void 0;
  }
  if (!("closeOnUnload" in options)) {
    options.closeOnUnload = !options.recover;
  }
  if (!("queueMessages" in options))
    options.queueMessages = true;
  const environment = options.environment && String(options.environment).toLowerCase() || Defaults.ENVIRONMENT;
  const production = !environment || environment === "production";
  if (!options.fallbackHosts && !options.restHost && !options.realtimeHost && !options.port && !options.tlsPort) {
    options.fallbackHosts = production ? Defaults.FALLBACK_HOSTS : environmentFallbackHosts(environment);
  }
  const restHost = options.restHost || (production ? Defaults.REST_HOST : environment + "-" + Defaults.REST_HOST);
  const realtimeHost = getRealtimeHost(options, production, environment, loggerToUse);
  (options.fallbackHosts || []).concat(restHost, realtimeHost).forEach(checkHost);
  options.port = options.port || Defaults.PORT;
  options.tlsPort = options.tlsPort || Defaults.TLS_PORT;
  if (!("tls" in options))
    options.tls = true;
  const timeouts = getTimeouts(options);
  if (MsgPack) {
    if ("useBinaryProtocol" in options) {
      options.useBinaryProtocol = Platform.Config.supportsBinary && options.useBinaryProtocol;
    } else {
      options.useBinaryProtocol = Platform.Config.preferBinary;
    }
  } else {
    options.useBinaryProtocol = false;
  }
  const headers = {};
  if (options.clientId) {
    headers["X-Ably-ClientId"] = Platform.BufferUtils.base64Encode(Platform.BufferUtils.utf8Encode(options.clientId));
  }
  if (!("idempotentRestPublishing" in options)) {
    options.idempotentRestPublishing = true;
  }
  let connectivityCheckParams = null;
  let connectivityCheckUrl = options.connectivityCheckUrl;
  if (options.connectivityCheckUrl) {
    let [uri, qs] = options.connectivityCheckUrl.split("?");
    connectivityCheckParams = qs ? parseQueryString(qs) : {};
    if (uri.indexOf("://") === -1) {
      uri = "https://" + uri;
    }
    connectivityCheckUrl = uri;
  }
  let wsConnectivityCheckUrl = options.wsConnectivityCheckUrl;
  if (wsConnectivityCheckUrl && wsConnectivityCheckUrl.indexOf("://") === -1) {
    wsConnectivityCheckUrl = "wss://" + wsConnectivityCheckUrl;
  }
  return __spreadProps(__spreadValues({}, options), {
    realtimeHost,
    restHost,
    maxMessageSize: options.maxMessageSize || Defaults.maxMessageSize,
    timeouts,
    connectivityCheckParams,
    connectivityCheckUrl,
    wsConnectivityCheckUrl,
    headers
  });
}
function normaliseChannelOptions(Crypto2, logger, options) {
  const channelOptions = options || {};
  if (channelOptions.cipher) {
    if (!Crypto2)
      throwMissingPluginError("Crypto");
    const cipher = Crypto2.getCipher(channelOptions.cipher, logger);
    channelOptions.cipher = cipher.cipherParams;
    channelOptions.channelCipher = cipher.cipher;
  } else if ("cipher" in channelOptions) {
    channelOptions.cipher = void 0;
    channelOptions.channelCipher = null;
  }
  return channelOptions;
}
var contentTypes = {
  json: "application/json",
  xml: "application/xml",
  html: "text/html",
  msgpack: "application/x-msgpack",
  text: "text/plain"
};
var defaultHeadersOptions = {
  format: "json" /* json */,
  protocolVersion: Defaults.protocolVersion
};
function defaultGetHeaders(options, {
  format = defaultHeadersOptions.format,
  protocolVersion = defaultHeadersOptions.protocolVersion
} = {}) {
  const accept = contentTypes[format];
  return {
    accept,
    "X-Ably-Version": protocolVersion.toString(),
    "Ably-Agent": getAgentString(options)
  };
}
function defaultPostHeaders(options, {
  format = defaultHeadersOptions.format,
  protocolVersion = defaultHeadersOptions.protocolVersion
} = {}) {
  let contentType;
  const accept = contentType = contentTypes[format];
  return {
    accept,
    "content-type": contentType,
    "X-Ably-Version": protocolVersion.toString(),
    "Ably-Agent": getAgentString(options)
  };
}
var defaults_default = Defaults;
function getDefaults(platformDefaults) {
  return Object.assign(Defaults, platformDefaults);
}

// src/common/lib/util/multicaster.ts
var Multicaster = class _Multicaster {
  // Private constructor; use static Multicaster.create instead
  constructor(logger, members) {
    this.logger = logger;
    this.members = members || [];
  }
  call(err, result) {
    for (const member of this.members) {
      if (member) {
        try {
          member(err, result);
        } catch (e) {
          logger_default.logAction(
            this.logger,
            logger_default.LOG_ERROR,
            "Multicaster multiple callback handler",
            "Unexpected exception: " + e + "; stack = " + e.stack
          );
        }
      }
    }
  }
  push(...args) {
    this.members.push(...args);
  }
  createPromise() {
    return new Promise((resolve, reject) => {
      this.push((err, result) => {
        err ? reject(err) : resolve(result);
      });
    });
  }
  resolveAll(result) {
    this.call(null, result);
  }
  rejectAll(err) {
    this.call(err);
  }
  static create(logger, members) {
    const instance = new _Multicaster(logger, members);
    return Object.assign((err, result) => instance.call(err, result), {
      push: (fn) => instance.push(fn),
      createPromise: () => instance.createPromise(),
      resolveAll: (result) => instance.resolveAll(result),
      rejectAll: (err) => instance.rejectAll(err)
    });
  }
};
var multicaster_default = Multicaster;

// src/common/constants/HttpMethods.ts
var HttpMethods = /* @__PURE__ */ ((HttpMethods2) => {
  HttpMethods2["Get"] = "get";
  HttpMethods2["Delete"] = "delete";
  HttpMethods2["Post"] = "post";
  HttpMethods2["Put"] = "put";
  HttpMethods2["Patch"] = "patch";
  return HttpMethods2;
})(HttpMethods || {});
var HttpMethods_default = HttpMethods;

// src/common/constants/HttpStatusCodes.ts
var HttpStatusCodes = /* @__PURE__ */ ((HttpStatusCodes2) => {
  HttpStatusCodes2[HttpStatusCodes2["Success"] = 200] = "Success";
  HttpStatusCodes2[HttpStatusCodes2["NoContent"] = 204] = "NoContent";
  HttpStatusCodes2[HttpStatusCodes2["BadRequest"] = 400] = "BadRequest";
  HttpStatusCodes2[HttpStatusCodes2["Unauthorized"] = 401] = "Unauthorized";
  HttpStatusCodes2[HttpStatusCodes2["Forbidden"] = 403] = "Forbidden";
  HttpStatusCodes2[HttpStatusCodes2["RequestTimeout"] = 408] = "RequestTimeout";
  HttpStatusCodes2[HttpStatusCodes2["InternalServerError"] = 500] = "InternalServerError";
  return HttpStatusCodes2;
})(HttpStatusCodes || {});
function isSuccessCode(statusCode) {
  return statusCode >= 200 /* Success */ && statusCode < 400 /* BadRequest */;
}
var HttpStatusCodes_default = HttpStatusCodes;

// src/common/lib/client/auth.ts
var MAX_TOKEN_LENGTH = Math.pow(2, 17);
function random() {
  return ("000000" + Math.floor(Math.random() * 1e16)).slice(-16);
}
function isRealtime(client) {
  return !!client.connection;
}
function normaliseAuthcallbackError(err) {
  if (!isErrorInfoOrPartialErrorInfo(err)) {
    return new ErrorInfo(inspectError(err), err.code || 40170, err.statusCode || 401);
  }
  if (!err.code) {
    if (err.statusCode === 403) {
      err.code = 40300;
    } else {
      err.code = 40170;
      err.statusCode = 401;
    }
  }
  return err;
}
var hmac = (text, key) => {
  const bufferUtils = Platform.BufferUtils;
  const textBuffer = bufferUtils.utf8Encode(text);
  const keyBuffer = bufferUtils.utf8Encode(key);
  const digest = bufferUtils.hmacSha256(textBuffer, keyBuffer);
  return bufferUtils.base64Encode(digest);
};
function c14n(capability) {
  if (!capability)
    return "";
  if (typeof capability == "string")
    capability = JSON.parse(capability);
  const c14nCapability = /* @__PURE__ */ Object.create(null);
  const keys = keysArray(capability, true);
  if (!keys)
    return "";
  keys.sort();
  for (let i = 0; i < keys.length; i++) {
    c14nCapability[keys[i]] = capability[keys[i]].sort();
  }
  return JSON.stringify(c14nCapability);
}
function logAndValidateTokenAuthMethod(authOptions, logger) {
  if (authOptions.authCallback) {
    logger_default.logAction(logger, logger_default.LOG_MINOR, "Auth()", "using token auth with authCallback");
  } else if (authOptions.authUrl) {
    logger_default.logAction(logger, logger_default.LOG_MINOR, "Auth()", "using token auth with authUrl");
  } else if (authOptions.key) {
    logger_default.logAction(logger, logger_default.LOG_MINOR, "Auth()", "using token auth with client-side signing");
  } else if (authOptions.tokenDetails) {
    logger_default.logAction(logger, logger_default.LOG_MINOR, "Auth()", "using token auth with supplied token only");
  } else {
    const msg = "authOptions must include valid authentication parameters";
    logger_default.logAction(logger, logger_default.LOG_ERROR, "Auth()", msg);
    throw new Error(msg);
  }
}
function basicAuthForced(options) {
  return "useTokenAuth" in options && !options.useTokenAuth;
}
function useTokenAuth(options) {
  return options.useTokenAuth || !basicAuthForced(options) && (options.authCallback || options.authUrl || options.token || options.tokenDetails);
}
function noWayToRenew(options) {
  return !options.key && !options.authCallback && !options.authUrl;
}
var trId = 0;
function getTokenRequestId() {
  return trId++;
}
var Auth = class {
  constructor(client, options) {
    // This initialization is always overwritten and only used to prevent a TypeScript compiler error
    this.authOptions = {};
    this.client = client;
    this.tokenParams = options.defaultTokenParams || {};
    this.currentTokenRequestId = null;
    this.waitingForTokenRequest = null;
    if (useTokenAuth(options)) {
      if (noWayToRenew(options)) {
        logger_default.logAction(
          this.logger,
          logger_default.LOG_ERROR,
          "Auth()",
          "Warning: library initialized with a token literal without any way to renew the token when it expires (no authUrl, authCallback, or key). See https://help.ably.io/error/40171 for help"
        );
      }
      this._saveTokenOptions(options.defaultTokenParams, options);
      logAndValidateTokenAuthMethod(this.authOptions, this.logger);
    } else {
      if (!options.key) {
        const msg = "No authentication options provided; need one of: key, authUrl, or authCallback (or for testing only, token or tokenDetails)";
        logger_default.logAction(this.logger, logger_default.LOG_ERROR, "Auth()", msg);
        throw new ErrorInfo(msg, 40160, 401);
      }
      logger_default.logAction(this.logger, logger_default.LOG_MINOR, "Auth()", "anonymous, using basic auth");
      this._saveBasicOptions(options);
    }
  }
  get logger() {
    return this.client.logger;
  }
  async authorize(tokenParams, authOptions) {
    if (authOptions && authOptions.key && this.authOptions.key !== authOptions.key) {
      throw new ErrorInfo("Unable to update auth options with incompatible key", 40102, 401);
    }
    try {
      let tokenDetails = await this._forceNewToken(tokenParams != null ? tokenParams : null, authOptions != null ? authOptions : null);
      if (isRealtime(this.client)) {
        return new Promise((resolve, reject) => {
          this.client.connection.connectionManager.onAuthUpdated(
            tokenDetails,
            (err, tokenDetails2) => err ? reject(err) : resolve(tokenDetails2)
          );
        });
      } else {
        return tokenDetails;
      }
    } catch (err) {
      if (this.client.connection && err.statusCode === HttpStatusCodes_default.Forbidden) {
        this.client.connection.connectionManager.actOnErrorFromAuthorize(err);
      }
      throw err;
    }
  }
  /* For internal use, eg by connectionManager - useful when want to call back
   * as soon as we have the new token, rather than waiting for it to take
   * effect on the connection as #authorize does */
  async _forceNewToken(tokenParams, authOptions) {
    this.tokenDetails = null;
    this._saveTokenOptions(tokenParams, authOptions);
    logAndValidateTokenAuthMethod(this.authOptions, this.logger);
    try {
      return this._ensureValidAuthCredentials(true);
    } finally {
      delete this.tokenParams.timestamp;
      delete this.authOptions.queryTime;
    }
  }
  async requestToken(tokenParams, authOptions) {
    const resolvedAuthOptions = authOptions || this.authOptions;
    const resolvedTokenParams = tokenParams || copy(this.tokenParams);
    let tokenRequestCallback, client = this.client;
    if (resolvedAuthOptions.authCallback) {
      logger_default.logAction(this.logger, logger_default.LOG_MINOR, "Auth.requestToken()", "using token auth with authCallback");
      tokenRequestCallback = resolvedAuthOptions.authCallback;
    } else if (resolvedAuthOptions.authUrl) {
      logger_default.logAction(this.logger, logger_default.LOG_MINOR, "Auth.requestToken()", "using token auth with authUrl");
      tokenRequestCallback = (params, cb) => {
        const authHeaders = mixin(
          { accept: "application/json, text/plain" },
          resolvedAuthOptions.authHeaders
        );
        const usePost = resolvedAuthOptions.authMethod && resolvedAuthOptions.authMethod.toLowerCase() === "post";
        let providedQsParams;
        const queryIdx = resolvedAuthOptions.authUrl.indexOf("?");
        if (queryIdx > -1) {
          providedQsParams = parseQueryString(resolvedAuthOptions.authUrl.slice(queryIdx));
          resolvedAuthOptions.authUrl = resolvedAuthOptions.authUrl.slice(0, queryIdx);
          if (!usePost) {
            resolvedAuthOptions.authParams = mixin(
              providedQsParams,
              resolvedAuthOptions.authParams
            );
          }
        }
        const authParams = mixin({}, resolvedAuthOptions.authParams || {}, params);
        const authUrlRequestCallback = (result) => {
          var _a2, _b;
          let body = (_a2 = result.body) != null ? _a2 : null;
          let contentType = null;
          if (result.error) {
            logger_default.logAction(
              this.logger,
              logger_default.LOG_MICRO,
              "Auth.requestToken().tokenRequestCallback",
              "Received Error: " + inspectError(result.error)
            );
          } else {
            const contentTypeHeaderOrHeaders = (_b = result.headers["content-type"]) != null ? _b : null;
            if (Array.isArray(contentTypeHeaderOrHeaders)) {
              contentType = contentTypeHeaderOrHeaders.join(", ");
            } else {
              contentType = contentTypeHeaderOrHeaders;
            }
            logger_default.logAction(
              this.logger,
              logger_default.LOG_MICRO,
              "Auth.requestToken().tokenRequestCallback",
              "Received; content-type: " + contentType + "; body: " + inspectBody(body)
            );
          }
          if (result.error) {
            cb(result.error, null);
            return;
          }
          if (result.unpacked) {
            cb(null, body);
            return;
          }
          if (Platform.BufferUtils.isBuffer(body))
            body = body.toString();
          if (!contentType) {
            cb(new ErrorInfo("authUrl response is missing a content-type header", 40170, 401), null);
            return;
          }
          const json = contentType.indexOf("application/json") > -1, text = contentType.indexOf("text/plain") > -1 || contentType.indexOf("application/jwt") > -1;
          if (!json && !text) {
            cb(
              new ErrorInfo(
                "authUrl responded with unacceptable content-type " + contentType + ", should be either text/plain, application/jwt or application/json",
                40170,
                401
              ),
              null
            );
            return;
          }
          if (json) {
            if (body.length > MAX_TOKEN_LENGTH) {
              cb(new ErrorInfo("authUrl response exceeded max permitted length", 40170, 401), null);
              return;
            }
            try {
              body = JSON.parse(body);
            } catch (e) {
              cb(
                new ErrorInfo(
                  "Unexpected error processing authURL response; err = " + e.message,
                  40170,
                  401
                ),
                null
              );
              return;
            }
          }
          cb(null, body, contentType);
        };
        logger_default.logAction(
          this.logger,
          logger_default.LOG_MICRO,
          "Auth.requestToken().tokenRequestCallback",
          "Requesting token from " + resolvedAuthOptions.authUrl + "; Params: " + JSON.stringify(authParams) + "; method: " + (usePost ? "POST" : "GET")
        );
        if (usePost) {
          const headers = authHeaders || {};
          headers["content-type"] = "application/x-www-form-urlencoded";
          const body = toQueryString(authParams).slice(1);
          whenPromiseSettles(
            this.client.http.doUri(
              HttpMethods_default.Post,
              resolvedAuthOptions.authUrl,
              headers,
              body,
              providedQsParams
            ),
            (err, result) => err ? authUrlRequestCallback(err) : authUrlRequestCallback(result)
          );
        } else {
          whenPromiseSettles(
            this.client.http.doUri(HttpMethods_default.Get, resolvedAuthOptions.authUrl, authHeaders || {}, null, authParams),
            (err, result) => err ? authUrlRequestCallback(err) : authUrlRequestCallback(result)
          );
        }
      };
    } else if (resolvedAuthOptions.key) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MINOR,
        "Auth.requestToken()",
        "using token auth with client-side signing"
      );
      tokenRequestCallback = (params, cb) => {
        whenPromiseSettles(
          this.createTokenRequest(params, resolvedAuthOptions),
          (err, result) => cb(err, result != null ? result : null)
        );
      };
    } else {
      const msg = "Need a new token, but authOptions does not include any way to request one (no authUrl, authCallback, or key)";
      logger_default.logAction(
        this.logger,
        logger_default.LOG_ERROR,
        "Auth()",
        "library initialized with a token literal without any way to renew the token when it expires (no authUrl, authCallback, or key). See https://help.ably.io/error/40171 for help"
      );
      throw new ErrorInfo(msg, 40171, 403);
    }
    if ("capability" in resolvedTokenParams)
      resolvedTokenParams.capability = c14n(
        resolvedTokenParams.capability
      );
    const tokenRequest = (signedTokenParams, tokenCb) => {
      const keyName = signedTokenParams.keyName, path = "/keys/" + keyName + "/requestToken", tokenUri = function(host) {
        return client.baseUri(host) + path;
      };
      const requestHeaders = defaults_default.defaultPostHeaders(this.client.options);
      if (resolvedAuthOptions.requestHeaders)
        mixin(requestHeaders, resolvedAuthOptions.requestHeaders);
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MICRO,
        "Auth.requestToken().requestToken",
        "Sending POST to " + path + "; Token params: " + JSON.stringify(signedTokenParams)
      );
      whenPromiseSettles(
        this.client.http.do(HttpMethods_default.Post, tokenUri, requestHeaders, JSON.stringify(signedTokenParams), null),
        (err, result) => err ? tokenCb(err) : tokenCb(result.error, result.body, result.unpacked)
      );
    };
    return new Promise((resolve, reject) => {
      let tokenRequestCallbackTimeoutExpired = false, timeoutLength = this.client.options.timeouts.realtimeRequestTimeout, tokenRequestCallbackTimeout = setTimeout(() => {
        tokenRequestCallbackTimeoutExpired = true;
        const msg = "Token request callback timed out after " + timeoutLength / 1e3 + " seconds";
        logger_default.logAction(this.logger, logger_default.LOG_ERROR, "Auth.requestToken()", msg);
        reject(new ErrorInfo(msg, 40170, 401));
      }, timeoutLength);
      tokenRequestCallback(resolvedTokenParams, (err, tokenRequestOrDetails, contentType) => {
        if (tokenRequestCallbackTimeoutExpired)
          return;
        clearTimeout(tokenRequestCallbackTimeout);
        if (err) {
          logger_default.logAction(
            this.logger,
            logger_default.LOG_ERROR,
            "Auth.requestToken()",
            "token request signing call returned error; err = " + inspectError(err)
          );
          reject(normaliseAuthcallbackError(err));
          return;
        }
        if (typeof tokenRequestOrDetails === "string") {
          if (tokenRequestOrDetails.length === 0) {
            reject(new ErrorInfo("Token string is empty", 40170, 401));
          } else if (tokenRequestOrDetails.length > MAX_TOKEN_LENGTH) {
            reject(
              new ErrorInfo(
                "Token string exceeded max permitted length (was " + tokenRequestOrDetails.length + " bytes)",
                40170,
                401
              )
            );
          } else if (tokenRequestOrDetails === "undefined" || tokenRequestOrDetails === "null") {
            reject(new ErrorInfo("Token string was literal null/undefined", 40170, 401));
          } else if (tokenRequestOrDetails[0] === "{" && !(contentType && contentType.indexOf("application/jwt") > -1)) {
            reject(
              new ErrorInfo(
                "Token was double-encoded; make sure you're not JSON-encoding an already encoded token request or details",
                40170,
                401
              )
            );
          } else {
            resolve({ token: tokenRequestOrDetails });
          }
          return;
        }
        if (typeof tokenRequestOrDetails !== "object" || tokenRequestOrDetails === null) {
          const msg = "Expected token request callback to call back with a token string or token request/details object, but got a " + typeof tokenRequestOrDetails;
          logger_default.logAction(this.logger, logger_default.LOG_ERROR, "Auth.requestToken()", msg);
          reject(new ErrorInfo(msg, 40170, 401));
          return;
        }
        const objectSize = JSON.stringify(tokenRequestOrDetails).length;
        if (objectSize > MAX_TOKEN_LENGTH && !resolvedAuthOptions.suppressMaxLengthCheck) {
          reject(
            new ErrorInfo(
              "Token request/details object exceeded max permitted stringified size (was " + objectSize + " bytes)",
              40170,
              401
            )
          );
          return;
        }
        if ("issued" in tokenRequestOrDetails) {
          resolve(tokenRequestOrDetails);
          return;
        }
        if (!("keyName" in tokenRequestOrDetails)) {
          const msg = "Expected token request callback to call back with a token string, token request object, or token details object";
          logger_default.logAction(this.logger, logger_default.LOG_ERROR, "Auth.requestToken()", msg);
          reject(new ErrorInfo(msg, 40170, 401));
          return;
        }
        tokenRequest(tokenRequestOrDetails, (err2, tokenResponse, unpacked) => {
          if (err2) {
            logger_default.logAction(
              this.logger,
              logger_default.LOG_ERROR,
              "Auth.requestToken()",
              "token request API call returned error; err = " + inspectError(err2)
            );
            reject(normaliseAuthcallbackError(err2));
            return;
          }
          if (!unpacked)
            tokenResponse = JSON.parse(tokenResponse);
          logger_default.logAction(this.logger, logger_default.LOG_MINOR, "Auth.getToken()", "token received");
          resolve(tokenResponse);
        });
      });
    });
  }
  /**
   * Create and sign a token request based on the given options.
   * NOTE this can only be used when the key value is available locally.
   * Otherwise, signed token requests must be obtained from the key
   * owner (either using the token request callback or url).
   *
   * @param authOptions
   * an object containing the request options:
   * - key:           the key to use. If not specified, a key passed in constructing
   *                  the Rest interface will be used
   *
   * - queryTime      (optional) boolean indicating that the ably system should be
   *                  queried for the current time when none is specified explicitly
   *
   * - requestHeaders (optional, unsupported, for testing only) extra headers to add to the
   *                  requestToken request
   *
   * @param tokenParams
   * an object containing the parameters for the requested token:
   * - ttl:       (optional) the requested life of the token in ms. If none is specified
   *                  a default of 1 hour is provided. The maximum lifetime is 24hours; any request
   *                  exceeding that lifetime will be rejected with an error.
   *
   * - capability:    (optional) the capability to associate with the access token.
   *                  If none is specified, a token will be requested with all of the
   *                  capabilities of the specified key.
   *
   * - clientId:      (optional) a client ID to associate with the token; if not
   *                  specified, a clientId passed in constructing the Rest interface will be used
   *
   * - timestamp:     (optional) the time in ms since the epoch. If none is specified,
   *                  the system will be queried for a time value to use.
   */
  async createTokenRequest(tokenParams, authOptions) {
    authOptions = authOptions || this.authOptions;
    tokenParams = tokenParams || copy(this.tokenParams);
    const key = authOptions.key;
    if (!key) {
      throw new ErrorInfo("No key specified", 40101, 403);
    }
    const keyParts = key.split(":"), keyName = keyParts[0], keySecret = keyParts[1];
    if (!keySecret) {
      throw new ErrorInfo("Invalid key specified", 40101, 403);
    }
    if (tokenParams.clientId === "") {
      throw new ErrorInfo("clientId can\u2019t be an empty string", 40012, 400);
    }
    if ("capability" in tokenParams) {
      tokenParams.capability = c14n(tokenParams.capability);
    }
    const request = mixin({ keyName }, tokenParams), clientId = tokenParams.clientId || "", ttl = tokenParams.ttl || "", capability = tokenParams.capability || "";
    if (!request.timestamp) {
      request.timestamp = await this.getTimestamp(authOptions && authOptions.queryTime);
    }
    const nonce = request.nonce || (request.nonce = random()), timestamp = request.timestamp;
    const signText = request.keyName + "\n" + ttl + "\n" + capability + "\n" + clientId + "\n" + timestamp + "\n" + nonce + "\n";
    request.mac = request.mac || hmac(signText, keySecret);
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "Auth.getTokenRequest()", "generated signed request");
    return request;
  }
  /**
   * Get the auth query params to use for a websocket connection,
   * based on the current auth parameters
   */
  async getAuthParams() {
    if (this.method == "basic")
      return { key: this.key };
    else {
      let tokenDetails = await this._ensureValidAuthCredentials(false);
      if (!tokenDetails) {
        throw new Error("Auth.getAuthParams(): _ensureValidAuthCredentials returned no error or tokenDetails");
      }
      return { access_token: tokenDetails.token };
    }
  }
  /**
   * Get the authorization header to use for a REST or comet request,
   * based on the current auth parameters
   */
  async getAuthHeaders() {
    if (this.method == "basic") {
      return { authorization: "Basic " + this.basicKey };
    } else {
      const tokenDetails = await this._ensureValidAuthCredentials(false);
      if (!tokenDetails) {
        throw new Error("Auth.getAuthParams(): _ensureValidAuthCredentials returned no error or tokenDetails");
      }
      return { authorization: "Bearer " + toBase64(tokenDetails.token) };
    }
  }
  /**
   * Get the current time based on the local clock,
   * or if the option queryTime is true, return the server time.
   * The server time offset from the local time is stored so that
   * only one request to the server to get the time is ever needed
   */
  async getTimestamp(queryTime) {
    if (!this.isTimeOffsetSet() && (queryTime || this.authOptions.queryTime)) {
      return this.client.time();
    } else {
      return this.getTimestampUsingOffset();
    }
  }
  getTimestampUsingOffset() {
    return Date.now() + (this.client.serverTimeOffset || 0);
  }
  isTimeOffsetSet() {
    return this.client.serverTimeOffset !== null;
  }
  _saveBasicOptions(authOptions) {
    this.method = "basic";
    this.key = authOptions.key;
    this.basicKey = toBase64(authOptions.key);
    this.authOptions = authOptions || {};
    if ("clientId" in authOptions) {
      this._userSetClientId(authOptions.clientId);
    }
  }
  _saveTokenOptions(tokenParams, authOptions) {
    this.method = "token";
    if (tokenParams) {
      this.tokenParams = tokenParams;
    }
    if (authOptions) {
      if (authOptions.token) {
        authOptions.tokenDetails = typeof authOptions.token === "string" ? { token: authOptions.token } : authOptions.token;
      }
      if (authOptions.tokenDetails) {
        this.tokenDetails = authOptions.tokenDetails;
      }
      if ("clientId" in authOptions) {
        this._userSetClientId(authOptions.clientId);
      }
      this.authOptions = authOptions;
    }
  }
  /* @param forceSupersede: force a new token request even if there's one in
   * progress, making all pending callbacks wait for the new one */
  async _ensureValidAuthCredentials(forceSupersede) {
    const token = this.tokenDetails;
    if (token) {
      if (this._tokenClientIdMismatch(token.clientId)) {
        throw new ErrorInfo(
          "Mismatch between clientId in token (" + token.clientId + ") and current clientId (" + this.clientId + ")",
          40102,
          403
        );
      }
      if (!this.isTimeOffsetSet() || !token.expires || token.expires >= this.getTimestampUsingOffset()) {
        logger_default.logAction(
          this.logger,
          logger_default.LOG_MINOR,
          "Auth.getToken()",
          "using cached token; expires = " + token.expires
        );
        return token;
      }
      logger_default.logAction(this.logger, logger_default.LOG_MINOR, "Auth.getToken()", "deleting expired token");
      this.tokenDetails = null;
    }
    const promise = (this.waitingForTokenRequest || (this.waitingForTokenRequest = multicaster_default.create(this.logger))).createPromise();
    if (this.currentTokenRequestId !== null && !forceSupersede) {
      return promise;
    }
    const tokenRequestId = this.currentTokenRequestId = getTokenRequestId();
    let tokenResponse, caughtError = null;
    try {
      tokenResponse = await this.requestToken(this.tokenParams, this.authOptions);
    } catch (err) {
      caughtError = err;
    }
    if (this.currentTokenRequestId > tokenRequestId) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MINOR,
        "Auth._ensureValidAuthCredentials()",
        "Discarding token request response; overtaken by newer one"
      );
      return promise;
    }
    this.currentTokenRequestId = null;
    const multicaster = this.waitingForTokenRequest;
    this.waitingForTokenRequest = null;
    if (caughtError) {
      multicaster == null ? void 0 : multicaster.rejectAll(caughtError);
      return promise;
    }
    multicaster == null ? void 0 : multicaster.resolveAll(this.tokenDetails = tokenResponse);
    return promise;
  }
  /* User-set: check types, '*' is disallowed, throw any errors */
  _userSetClientId(clientId) {
    if (!(typeof clientId === "string" || clientId === null)) {
      throw new ErrorInfo("clientId must be either a string or null", 40012, 400);
    } else if (clientId === "*") {
      throw new ErrorInfo(
        'Can\u2019t use "*" as a clientId as that string is reserved. (To change the default token request behaviour to use a wildcard clientId, instantiate the library with {defaultTokenParams: {clientId: "*"}}), or if calling authorize(), pass it in as a tokenParam: authorize({clientId: "*"}, authOptions)',
        40012,
        400
      );
    } else {
      const err = this._uncheckedSetClientId(clientId);
      if (err)
        throw err;
    }
  }
  /* Ably-set: no typechecking, '*' is allowed but not set on this.clientId), return errors to the caller */
  _uncheckedSetClientId(clientId) {
    if (this._tokenClientIdMismatch(clientId)) {
      const msg = "Unexpected clientId mismatch: client has " + this.clientId + ", requested " + clientId;
      const err = new ErrorInfo(msg, 40102, 401);
      logger_default.logAction(this.logger, logger_default.LOG_ERROR, "Auth._uncheckedSetClientId()", msg);
      return err;
    } else {
      this.clientId = this.tokenParams.clientId = clientId;
      return null;
    }
  }
  _tokenClientIdMismatch(tokenClientId) {
    return !!(this.clientId && this.clientId !== "*" && tokenClientId && tokenClientId !== "*" && this.clientId !== tokenClientId);
  }
  static isTokenErr(error) {
    return error.code && error.code >= 40140 && error.code < 40150;
  }
  revokeTokens(specifiers, options) {
    return this.client.rest.revokeTokens(specifiers, options);
  }
};
var auth_default = Auth;

// src/common/types/http.ts
function paramString(params) {
  const paramPairs = [];
  if (params) {
    for (const needle in params) {
      paramPairs.push(needle + "=" + params[needle]);
    }
  }
  return paramPairs.join("&");
}
function appendingParams(uri, params) {
  return uri + (params ? "?" : "") + paramString(params);
}
function logResult(result, method, uri, params, logger) {
  if (result.error) {
    logger_default.logActionNoStrip(
      logger,
      logger_default.LOG_MICRO,
      "Http." + method + "()",
      "Received Error; " + appendingParams(uri, params) + "; Error: " + inspectError(result.error)
    );
  } else {
    logger_default.logActionNoStrip(
      logger,
      logger_default.LOG_MICRO,
      "Http." + method + "()",
      "Received; " + appendingParams(uri, params) + "; Headers: " + paramString(result.headers) + "; StatusCode: " + result.statusCode + "; Body" + (Platform.BufferUtils.isBuffer(result.body) ? " (Base64): " + Platform.BufferUtils.base64Encode(result.body) : ": " + result.body)
    );
  }
}
function logRequest(method, uri, body, params, logger) {
  if (logger.shouldLog(logger_default.LOG_MICRO)) {
    logger_default.logActionNoStrip(
      logger,
      logger_default.LOG_MICRO,
      "Http." + method + "()",
      "Sending; " + appendingParams(uri, params) + "; Body" + (Platform.BufferUtils.isBuffer(body) ? " (Base64): " + Platform.BufferUtils.base64Encode(body) : ": " + body)
    );
  }
}
var Http = class {
  constructor(client) {
    this.client = client;
    this.platformHttp = new Platform.Http(client);
    this.checkConnectivity = this.platformHttp.checkConnectivity ? () => this.platformHttp.checkConnectivity() : void 0;
  }
  get logger() {
    var _a2, _b;
    return (_b = (_a2 = this.client) == null ? void 0 : _a2.logger) != null ? _b : logger_default.defaultLogger;
  }
  get supportsAuthHeaders() {
    return this.platformHttp.supportsAuthHeaders;
  }
  get supportsLinkHeaders() {
    return this.platformHttp.supportsLinkHeaders;
  }
  _getHosts(client) {
    const connection = client.connection, connectionHost = connection && connection.connectionManager.host;
    if (connectionHost) {
      return [connectionHost].concat(defaults_default.getFallbackHosts(client.options));
    }
    return defaults_default.getHosts(client.options);
  }
  /**
   * This method will not throw any errors; rather, it will communicate any error by populating the {@link RequestResult.error} property of the returned {@link RequestResult}.
   */
  async do(method, path, headers, body, params) {
    try {
      const client = this.client;
      if (!client) {
        return { error: new ErrorInfo("http.do called without client", 5e4, 500) };
      }
      const uriFromHost = typeof path === "function" ? path : function(host) {
        return client.baseUri(host) + path;
      };
      const currentFallback = client._currentFallback;
      if (currentFallback) {
        if (currentFallback.validUntil > Date.now()) {
          const result = await this.doUri(method, uriFromHost(currentFallback.host), headers, body, params);
          if (result.error && this.platformHttp.shouldFallback(result.error)) {
            client._currentFallback = null;
            return this.do(method, path, headers, body, params);
          }
          return result;
        } else {
          client._currentFallback = null;
        }
      }
      const hosts = this._getHosts(client);
      if (hosts.length === 1) {
        return this.doUri(method, uriFromHost(hosts[0]), headers, body, params);
      }
      let tryAHostStartedAt = null;
      const tryAHost = async (candidateHosts, persistOnSuccess) => {
        const host = candidateHosts.shift();
        tryAHostStartedAt = tryAHostStartedAt != null ? tryAHostStartedAt : /* @__PURE__ */ new Date();
        const result = await this.doUri(method, uriFromHost(host), headers, body, params);
        if (result.error && this.platformHttp.shouldFallback(result.error) && candidateHosts.length) {
          const elapsedTime = Date.now() - tryAHostStartedAt.getTime();
          if (elapsedTime > client.options.timeouts.httpMaxRetryDuration) {
            return {
              error: new ErrorInfo(
                `Timeout for trying fallback hosts retries. Total elapsed time exceeded the ${client.options.timeouts.httpMaxRetryDuration}ms limit`,
                50003,
                500
              )
            };
          }
          return tryAHost(candidateHosts, true);
        }
        if (persistOnSuccess) {
          client._currentFallback = {
            host,
            validUntil: Date.now() + client.options.timeouts.fallbackRetryTimeout
          };
        }
        return result;
      };
      return tryAHost(hosts);
    } catch (err) {
      return { error: new ErrorInfo(`Unexpected error in Http.do: ${inspectError(err)}`, 500, 5e4) };
    }
  }
  /**
   * This method will not throw any errors; rather, it will communicate any error by populating the {@link RequestResult.error} property of the returned {@link RequestResult}.
   */
  async doUri(method, uri, headers, body, params) {
    try {
      logRequest(method, uri, body, params, this.logger);
      const result = await this.platformHttp.doUri(method, uri, headers, body, params);
      if (this.logger.shouldLog(logger_default.LOG_MICRO)) {
        logResult(result, method, uri, params, this.logger);
      }
      return result;
    } catch (err) {
      return { error: new ErrorInfo(`Unexpected error in Http.doUri: ${inspectError(err)}`, 500, 5e4) };
    }
  }
};

// src/common/lib/client/baseclient.ts
var BaseClient = class {
  constructor(options) {
    /**
     * These exports are for use by UMD plugins; reason being so that constructors and static methods can be accessed by these plugins without needing to import the classes directly and result in the class existing in both the plugin and the core library.
     */
    this.Platform = Platform;
    this.ErrorInfo = ErrorInfo;
    this.Logger = logger_default;
    this.Defaults = defaults_default;
    this.Utils = utils_exports;
    var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    this._additionalHTTPRequestImplementations = (_a2 = options.plugins) != null ? _a2 : null;
    this.logger = new logger_default();
    this.logger.setLog(options.logLevel, options.logHandler);
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MICRO,
      "BaseClient()",
      "initialized with clientOptions " + Platform.Config.inspect(options)
    );
    this._MsgPack = (_c = (_b = options.plugins) == null ? void 0 : _b.MsgPack) != null ? _c : null;
    const normalOptions = this.options = defaults_default.normaliseOptions(options, this._MsgPack, this.logger);
    if (normalOptions.key) {
      const keyMatch = normalOptions.key.match(/^([^:\s]+):([^:.\s]+)$/);
      if (!keyMatch) {
        const msg = "invalid key parameter";
        logger_default.logAction(this.logger, logger_default.LOG_ERROR, "BaseClient()", msg);
        throw new ErrorInfo(msg, 40400, 404);
      }
      normalOptions.keyName = keyMatch[1];
      normalOptions.keySecret = keyMatch[2];
    }
    if ("clientId" in normalOptions) {
      if (!(typeof normalOptions.clientId === "string" || normalOptions.clientId === null))
        throw new ErrorInfo("clientId must be either a string or null", 40012, 400);
      else if (normalOptions.clientId === "*")
        throw new ErrorInfo(
          'Can\u2019t use "*" as a clientId as that string is reserved. (To change the default token request behaviour to use a wildcard clientId, use {defaultTokenParams: {clientId: "*"}})',
          40012,
          400
        );
    }
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "BaseClient()", "started; version = " + defaults_default.version);
    this._currentFallback = null;
    this.serverTimeOffset = null;
    this.http = new Http(this);
    this.auth = new auth_default(this, normalOptions);
    this._rest = ((_d = options.plugins) == null ? void 0 : _d.Rest) ? new options.plugins.Rest(this) : null;
    this._Crypto = (_f = (_e = options.plugins) == null ? void 0 : _e.Crypto) != null ? _f : null;
    this.__FilteredSubscriptions = (_h = (_g = options.plugins) == null ? void 0 : _g.MessageInteractions) != null ? _h : null;
    this._Annotations = (_j = (_i = options.plugins) == null ? void 0 : _i.Annotations) != null ? _j : null;
  }
  get rest() {
    if (!this._rest) {
      throwMissingPluginError("Rest");
    }
    return this._rest;
  }
  get _FilteredSubscriptions() {
    if (!this.__FilteredSubscriptions) {
      throwMissingPluginError("MessageInteractions");
    }
    return this.__FilteredSubscriptions;
  }
  get channels() {
    return this.rest.channels;
  }
  get push() {
    return this.rest.push;
  }
  get device() {
    var _a2;
    if (!((_a2 = this.options.plugins) == null ? void 0 : _a2.Push) || !this.push.LocalDevice) {
      throwMissingPluginError("Push");
    }
    if (!this._device) {
      this._device = this.push.LocalDevice.load(this);
    }
    return this._device;
  }
  baseUri(host) {
    return defaults_default.getHttpScheme(this.options) + host + ":" + defaults_default.getPort(this.options, false);
  }
  async stats(params) {
    return this.rest.stats(params);
  }
  async time(params) {
    return this.rest.time(params);
  }
  async request(method, path, version2, params, body, customHeaders) {
    return this.rest.request(method, path, version2, params, body, customHeaders);
  }
  batchPublish(specOrSpecs) {
    return this.rest.batchPublish(specOrSpecs);
  }
  batchPresence(channels) {
    return this.rest.batchPresence(channels);
  }
  setLog(logOptions) {
    this.logger.setLog(logOptions.level, logOptions.handler);
  }
};
BaseClient.Platform = Platform;
var baseclient_default = BaseClient;

// src/common/lib/types/devicedetails.ts
var DeviceDetails = class _DeviceDetails {
  toJSON() {
    var _a2, _b, _c;
    return {
      id: this.id,
      deviceSecret: this.deviceSecret,
      platform: this.platform,
      formFactor: this.formFactor,
      clientId: this.clientId,
      metadata: this.metadata,
      deviceIdentityToken: this.deviceIdentityToken,
      push: {
        recipient: (_a2 = this.push) == null ? void 0 : _a2.recipient,
        state: (_b = this.push) == null ? void 0 : _b.state,
        error: (_c = this.push) == null ? void 0 : _c.error
      }
    };
  }
  toString() {
    var _a2, _b, _c, _d;
    let result = "[DeviceDetails";
    if (this.id)
      result += "; id=" + this.id;
    if (this.platform)
      result += "; platform=" + this.platform;
    if (this.formFactor)
      result += "; formFactor=" + this.formFactor;
    if (this.clientId)
      result += "; clientId=" + this.clientId;
    if (this.metadata)
      result += "; metadata=" + this.metadata;
    if (this.deviceIdentityToken)
      result += "; deviceIdentityToken=" + JSON.stringify(this.deviceIdentityToken);
    if ((_a2 = this.push) == null ? void 0 : _a2.recipient)
      result += "; push.recipient=" + JSON.stringify(this.push.recipient);
    if ((_b = this.push) == null ? void 0 : _b.state)
      result += "; push.state=" + this.push.state;
    if ((_c = this.push) == null ? void 0 : _c.error)
      result += "; push.error=" + JSON.stringify(this.push.error);
    if ((_d = this.push) == null ? void 0 : _d.metadata)
      result += "; push.metadata=" + this.push.metadata;
    result += "]";
    return result;
  }
  static toRequestBody(body, MsgPack, format) {
    return encodeBody(body, MsgPack, format);
  }
  static fromResponseBody(body, MsgPack, format) {
    if (format) {
      body = decodeBody(body, MsgPack, format);
    }
    if (Array.isArray(body)) {
      return _DeviceDetails.fromValuesArray(body);
    } else {
      return _DeviceDetails.fromValues(body);
    }
  }
  static fromValues(values) {
    values.error = values.error && ErrorInfo.fromValues(values.error);
    return Object.assign(new _DeviceDetails(), values);
  }
  static fromLocalDevice(device) {
    return Object.assign(new _DeviceDetails(), device);
  }
  static fromValuesArray(values) {
    const count = values.length, result = new Array(count);
    for (let i = 0; i < count; i++)
      result[i] = _DeviceDetails.fromValues(values[i]);
    return result;
  }
};
var devicedetails_default = DeviceDetails;

// src/common/lib/client/resource.ts
async function withAuthDetails(client, headers, params, opCallback) {
  if (client.http.supportsAuthHeaders) {
    const authHeaders = await client.auth.getAuthHeaders();
    return opCallback(mixin(authHeaders, headers), params);
  } else {
    const authParams = await client.auth.getAuthParams();
    return opCallback(headers, mixin(authParams, params));
  }
}
function unenvelope(result, MsgPack, format) {
  if (result.err && !result.body) {
    return { err: result.err };
  }
  if (result.statusCode === HttpStatusCodes_default.NoContent) {
    return __spreadProps(__spreadValues({}, result), { body: [], unpacked: true });
  }
  let body = result.body;
  if (!result.unpacked) {
    try {
      body = decodeBody(body, MsgPack, format);
    } catch (e) {
      if (isErrorInfoOrPartialErrorInfo(e)) {
        return { err: e };
      } else {
        return { err: new PartialErrorInfo(inspectError(e), null) };
      }
    }
  }
  if (!body) {
    return { err: new PartialErrorInfo("unenvelope(): Response body is missing", null) };
  }
  const { statusCode: wrappedStatusCode, response, headers: wrappedHeaders } = body;
  if (wrappedStatusCode === void 0) {
    return __spreadProps(__spreadValues({}, result), { body, unpacked: true });
  }
  if (wrappedStatusCode < 200 || wrappedStatusCode >= 300) {
    let wrappedErr = response && response.error || result.err;
    if (!wrappedErr) {
      wrappedErr = new Error("Error in unenveloping " + body);
      wrappedErr.statusCode = wrappedStatusCode;
    }
    return { err: wrappedErr, body: response, headers: wrappedHeaders, unpacked: true, statusCode: wrappedStatusCode };
  }
  return { err: result.err, body: response, headers: wrappedHeaders, unpacked: true, statusCode: wrappedStatusCode };
}
function logResult2(result, method, path, params, logger) {
  if (result.err) {
    logger_default.logAction(
      logger,
      logger_default.LOG_MICRO,
      "Resource." + method + "()",
      "Received Error; " + appendingParams(path, params) + "; Error: " + inspectError(result.err)
    );
  } else {
    logger_default.logAction(
      logger,
      logger_default.LOG_MICRO,
      "Resource." + method + "()",
      "Received; " + appendingParams(path, params) + "; Headers: " + paramString(result.headers) + "; StatusCode: " + result.statusCode + "; Body: " + (Platform.BufferUtils.isBuffer(result.body) ? " (Base64): " + Platform.BufferUtils.base64Encode(result.body) : ": " + Platform.Config.inspect(result.body))
    );
  }
}
var Resource = class _Resource {
  static async get(client, path, headers, params, envelope, throwError) {
    return _Resource.do(HttpMethods_default.Get, client, path, null, headers, params, envelope, throwError != null ? throwError : false);
  }
  static async delete(client, path, headers, params, envelope, throwError) {
    return _Resource.do(HttpMethods_default.Delete, client, path, null, headers, params, envelope, throwError);
  }
  static async post(client, path, body, headers, params, envelope, throwError) {
    return _Resource.do(HttpMethods_default.Post, client, path, body, headers, params, envelope, throwError);
  }
  static async patch(client, path, body, headers, params, envelope, throwError) {
    return _Resource.do(HttpMethods_default.Patch, client, path, body, headers, params, envelope, throwError);
  }
  static async put(client, path, body, headers, params, envelope, throwError) {
    return _Resource.do(HttpMethods_default.Put, client, path, body, headers, params, envelope, throwError);
  }
  static async do(method, client, path, body, headers, params, envelope, throwError) {
    if (envelope) {
      (params = params || {})["envelope"] = envelope;
    }
    const logger = client.logger;
    async function doRequest(headers2, params2) {
      var _a2;
      if (logger.shouldLog(logger_default.LOG_MICRO)) {
        let decodedBody = body;
        if (((_a2 = headers2["content-type"]) == null ? void 0 : _a2.indexOf("msgpack")) > 0) {
          try {
            if (!client._MsgPack) {
              throwMissingPluginError("MsgPack");
            }
            decodedBody = client._MsgPack.decode(body);
          } catch (decodeErr) {
            logger_default.logAction(
              logger,
              logger_default.LOG_MICRO,
              "Resource." + method + "()",
              "Sending MsgPack Decoding Error: " + inspectError(decodeErr)
            );
          }
        }
        logger_default.logAction(
          logger,
          logger_default.LOG_MICRO,
          "Resource." + method + "()",
          "Sending; " + appendingParams(path, params2) + "; Body: " + decodedBody
        );
      }
      const httpResult = await client.http.do(method, path, headers2, body, params2);
      if (httpResult.error && auth_default.isTokenErr(httpResult.error)) {
        await client.auth.authorize(null, null);
        return withAuthDetails(client, headers2, params2, doRequest);
      }
      return {
        err: httpResult.error,
        body: httpResult.body,
        headers: httpResult.headers,
        unpacked: httpResult.unpacked,
        statusCode: httpResult.statusCode
      };
    }
    let result = await withAuthDetails(client, headers, params, doRequest);
    if (envelope) {
      result = unenvelope(result, client._MsgPack, envelope);
    }
    if (logger.shouldLog(logger_default.LOG_MICRO)) {
      logResult2(result, method, path, params, logger);
    }
    if (throwError) {
      if (result.err) {
        throw result.err;
      } else {
        const response = __spreadValues({}, result);
        delete response.err;
        return response;
      }
    }
    return result;
  }
};
var resource_default = Resource;

// src/common/lib/client/paginatedresource.ts
function getRelParams(linkUrl) {
  const urlMatch = linkUrl.match(/^\.\/(\w+)\?(.*)$/);
  return urlMatch && urlMatch[2] && parseQueryString(urlMatch[2]);
}
function parseRelLinks(linkHeader) {
  if (typeof linkHeader == "string")
    linkHeader = linkHeader.split(",");
  const relParams = {};
  for (let i = 0; i < linkHeader.length; i++) {
    const linkMatch = linkHeader[i].match(/^\s*<(.+)>;\s*rel="(\w+)"$/);
    if (linkMatch) {
      const params = getRelParams(linkMatch[1]);
      if (params)
        relParams[linkMatch[2]] = params;
    }
  }
  return relParams;
}
function returnErrOnly(err, body, useHPR) {
  return !(useHPR && (body || typeof err.code === "number"));
}
var PaginatedResource = class {
  constructor(client, path, headers, envelope, bodyHandler, useHttpPaginatedResponse) {
    this.client = client;
    this.path = path;
    this.headers = headers;
    this.envelope = envelope != null ? envelope : null;
    this.bodyHandler = bodyHandler;
    this.useHttpPaginatedResponse = useHttpPaginatedResponse || false;
  }
  get logger() {
    return this.client.logger;
  }
  async get(params) {
    const result = await resource_default.get(this.client, this.path, this.headers, params, this.envelope, false);
    return this.handlePage(result);
  }
  async delete(params) {
    const result = await resource_default.delete(this.client, this.path, this.headers, params, this.envelope, false);
    return this.handlePage(result);
  }
  async post(params, body) {
    const result = await resource_default.post(this.client, this.path, body, this.headers, params, this.envelope, false);
    return this.handlePage(result);
  }
  async put(params, body) {
    const result = await resource_default.put(this.client, this.path, body, this.headers, params, this.envelope, false);
    return this.handlePage(result);
  }
  async patch(params, body) {
    const result = await resource_default.patch(this.client, this.path, body, this.headers, params, this.envelope, false);
    return this.handlePage(result);
  }
  async handlePage(result) {
    if (result.err && returnErrOnly(result.err, result.body, this.useHttpPaginatedResponse)) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_ERROR,
        "PaginatedResource.handlePage()",
        "Unexpected error getting resource: err = " + inspectError(result.err)
      );
      throw result.err;
    }
    let items, linkHeader, relParams;
    try {
      items = result.statusCode == HttpStatusCodes_default.NoContent ? [] : await this.bodyHandler(result.body, result.headers || {}, result.unpacked);
    } catch (e) {
      throw result.err || e;
    }
    if (result.headers && (linkHeader = result.headers["Link"] || result.headers["link"])) {
      relParams = parseRelLinks(linkHeader);
    }
    if (this.useHttpPaginatedResponse) {
      return new HttpPaginatedResponse(
        this,
        items,
        result.headers || {},
        result.statusCode,
        relParams,
        result.err
      );
    } else {
      return new PaginatedResult(this, items, relParams);
    }
  }
};
var PaginatedResult = class {
  constructor(resource, items, relParams) {
    this.resource = resource;
    this.items = items;
    const self2 = this;
    if (relParams) {
      if ("first" in relParams) {
        this.first = async function() {
          return self2.get(relParams.first);
        };
      }
      if ("current" in relParams) {
        this.current = async function() {
          return self2.get(relParams.current);
        };
      }
      this.next = async function() {
        if ("next" in relParams) {
          return self2.get(relParams.next);
        } else {
          return null;
        }
      };
      this.hasNext = function() {
        return "next" in relParams;
      };
      this.isLast = () => {
        var _a2;
        return !((_a2 = this.hasNext) == null ? void 0 : _a2.call(this));
      };
    }
  }
  /* We assume that only the initial request can be a POST, and that accessing
   * the rest of a multipage set of results can always be done with GET */
  async get(params) {
    const res = this.resource;
    const result = await resource_default.get(res.client, res.path, res.headers, params, res.envelope, false);
    return res.handlePage(result);
  }
};
var HttpPaginatedResponse = class extends PaginatedResult {
  constructor(resource, items, headers, statusCode, relParams, err) {
    super(resource, items, relParams);
    this.statusCode = statusCode;
    this.success = statusCode < 300 && statusCode >= 200;
    this.headers = headers;
    this.errorCode = err && err.code;
    this.errorMessage = err && err.message;
  }
  toJSON() {
    return {
      items: this.items,
      statusCode: this.statusCode,
      success: this.success,
      headers: this.headers,
      errorCode: this.errorCode,
      errorMessage: this.errorMessage
    };
  }
};
var paginatedresource_default = PaginatedResource;

// src/common/lib/types/pushchannelsubscription.ts
var _PushChannelSubscription = class _PushChannelSubscription {
  /**
   * Overload toJSON() to intercept JSON.stringify()
   * @return {*}
   */
  toJSON() {
    return {
      channel: this.channel,
      deviceId: this.deviceId,
      clientId: this.clientId
    };
  }
  toString() {
    let result = "[PushChannelSubscription";
    if (this.channel)
      result += "; channel=" + this.channel;
    if (this.deviceId)
      result += "; deviceId=" + this.deviceId;
    if (this.clientId)
      result += "; clientId=" + this.clientId;
    result += "]";
    return result;
  }
  static fromResponseBody(body, MsgPack, format) {
    if (format) {
      body = decodeBody(body, MsgPack, format);
    }
    if (Array.isArray(body)) {
      return _PushChannelSubscription.fromValuesArray(body);
    } else {
      return _PushChannelSubscription.fromValues(body);
    }
  }
  static fromValues(values) {
    return Object.assign(new _PushChannelSubscription(), values);
  }
  static fromValuesArray(values) {
    const count = values.length, result = new Array(count);
    for (let i = 0; i < count; i++)
      result[i] = _PushChannelSubscription.fromValues(values[i]);
    return result;
  }
};
_PushChannelSubscription.toRequestBody = encodeBody;
var PushChannelSubscription = _PushChannelSubscription;
var pushchannelsubscription_default = PushChannelSubscription;

// src/common/lib/client/push.ts
var Push = class {
  constructor(client) {
    var _a2;
    this.client = client;
    this.admin = new Admin(client);
    if (Platform.Config.push && ((_a2 = client.options.plugins) == null ? void 0 : _a2.Push)) {
      this.stateMachine = new client.options.plugins.Push.ActivationStateMachine(client);
      this.LocalDevice = client.options.plugins.Push.localDeviceFactory(devicedetails_default);
    }
  }
  async activate(registerCallback, updateFailedCallback) {
    await new Promise((resolve, reject) => {
      var _a2;
      if (!((_a2 = this.client.options.plugins) == null ? void 0 : _a2.Push)) {
        reject(createMissingPluginError("Push"));
        return;
      }
      if (!this.stateMachine) {
        reject(new ErrorInfo("This platform is not supported as a target of push notifications", 4e4, 400));
        return;
      }
      if (this.stateMachine.activatedCallback) {
        reject(new ErrorInfo("Activation already in progress", 4e4, 400));
        return;
      }
      this.stateMachine.activatedCallback = (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      };
      this.stateMachine.updateFailedCallback = updateFailedCallback;
      this.stateMachine.handleEvent(
        new this.client.options.plugins.Push.CalledActivate(this.stateMachine, registerCallback)
      );
    });
  }
  async deactivate(deregisterCallback) {
    await new Promise((resolve, reject) => {
      var _a2;
      if (!((_a2 = this.client.options.plugins) == null ? void 0 : _a2.Push)) {
        reject(createMissingPluginError("Push"));
        return;
      }
      if (!this.stateMachine) {
        reject(new ErrorInfo("This platform is not supported as a target of push notifications", 4e4, 400));
        return;
      }
      if (this.stateMachine.deactivatedCallback) {
        reject(new ErrorInfo("Deactivation already in progress", 4e4, 400));
        return;
      }
      this.stateMachine.deactivatedCallback = (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      };
      this.stateMachine.handleEvent(
        new this.client.options.plugins.Push.CalledDeactivate(this.stateMachine, deregisterCallback)
      );
    });
  }
};
var Admin = class {
  constructor(client) {
    this.client = client;
    this.deviceRegistrations = new DeviceRegistrations(client);
    this.channelSubscriptions = new ChannelSubscriptions(client);
  }
  async publish(recipient, payload) {
    const client = this.client;
    const format = client.options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */, headers = defaults_default.defaultPostHeaders(client.options, { format }), params = {};
    const body = mixin({ recipient }, payload);
    mixin(headers, client.options.headers);
    if (client.options.pushFullWait)
      mixin(params, { fullWait: "true" });
    const requestBody = encodeBody(body, client._MsgPack, format);
    await resource_default.post(client, "/push/publish", requestBody, headers, params, null, true);
  }
};
var DeviceRegistrations = class {
  constructor(client) {
    this.client = client;
  }
  async save(device) {
    const client = this.client;
    const body = devicedetails_default.fromValues(device);
    const format = client.options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */, headers = defaults_default.defaultPostHeaders(client.options, { format }), params = {};
    mixin(headers, client.options.headers);
    if (client.options.pushFullWait)
      mixin(params, { fullWait: "true" });
    const requestBody = encodeBody(body, client._MsgPack, format);
    const response = await resource_default.put(
      client,
      "/push/deviceRegistrations/" + encodeURIComponent(device.id),
      requestBody,
      headers,
      params,
      null,
      true
    );
    return devicedetails_default.fromResponseBody(
      response.body,
      client._MsgPack,
      response.unpacked ? void 0 : format
    );
  }
  async get(deviceIdOrDetails) {
    const client = this.client, format = client.options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */, headers = defaults_default.defaultGetHeaders(client.options, { format }), deviceId = deviceIdOrDetails.id || deviceIdOrDetails;
    if (typeof deviceId !== "string" || !deviceId.length) {
      throw new ErrorInfo(
        "First argument to DeviceRegistrations#get must be a deviceId string or DeviceDetails",
        4e4,
        400
      );
    }
    mixin(headers, client.options.headers);
    const response = await resource_default.get(
      client,
      "/push/deviceRegistrations/" + encodeURIComponent(deviceId),
      headers,
      {},
      null,
      true
    );
    return devicedetails_default.fromResponseBody(
      response.body,
      client._MsgPack,
      response.unpacked ? void 0 : format
    );
  }
  async list(params) {
    const client = this.client, format = client.options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */, envelope = this.client.http.supportsLinkHeaders ? void 0 : format, headers = defaults_default.defaultGetHeaders(client.options, { format });
    mixin(headers, client.options.headers);
    return new paginatedresource_default(client, "/push/deviceRegistrations", headers, envelope, async function(body, headers2, unpacked) {
      return devicedetails_default.fromResponseBody(
        body,
        client._MsgPack,
        unpacked ? void 0 : format
      );
    }).get(params);
  }
  async remove(deviceIdOrDetails) {
    const client = this.client, format = client.options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */, headers = defaults_default.defaultGetHeaders(client.options, { format }), params = {}, deviceId = deviceIdOrDetails.id || deviceIdOrDetails;
    if (typeof deviceId !== "string" || !deviceId.length) {
      throw new ErrorInfo(
        "First argument to DeviceRegistrations#remove must be a deviceId string or DeviceDetails",
        4e4,
        400
      );
    }
    mixin(headers, client.options.headers);
    if (client.options.pushFullWait)
      mixin(params, { fullWait: "true" });
    await resource_default["delete"](
      client,
      "/push/deviceRegistrations/" + encodeURIComponent(deviceId),
      headers,
      params,
      null,
      true
    );
  }
  async removeWhere(params) {
    const client = this.client, format = client.options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */, headers = defaults_default.defaultGetHeaders(client.options, { format });
    mixin(headers, client.options.headers);
    if (client.options.pushFullWait)
      mixin(params, { fullWait: "true" });
    await resource_default["delete"](client, "/push/deviceRegistrations", headers, params, null, true);
  }
};
var ChannelSubscriptions = class _ChannelSubscriptions {
  constructor(client) {
    /* ChannelSubscriptions have no unique id; removing one is equivalent to removeWhere by its properties */
    this.remove = _ChannelSubscriptions.prototype.removeWhere;
    this.client = client;
  }
  async save(subscription) {
    const client = this.client;
    const body = pushchannelsubscription_default.fromValues(subscription);
    const format = client.options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */, headers = defaults_default.defaultPostHeaders(client.options, { format }), params = {};
    mixin(headers, client.options.headers);
    if (client.options.pushFullWait)
      mixin(params, { fullWait: "true" });
    const requestBody = encodeBody(body, client._MsgPack, format);
    const response = await resource_default.post(
      client,
      "/push/channelSubscriptions",
      requestBody,
      headers,
      params,
      null,
      true
    );
    return pushchannelsubscription_default.fromResponseBody(
      response.body,
      client._MsgPack,
      response.unpacked ? void 0 : format
    );
  }
  async list(params) {
    const client = this.client, format = client.options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */, envelope = this.client.http.supportsLinkHeaders ? void 0 : format, headers = defaults_default.defaultGetHeaders(client.options, { format });
    mixin(headers, client.options.headers);
    return new paginatedresource_default(client, "/push/channelSubscriptions", headers, envelope, async function(body, headers2, unpacked) {
      return pushchannelsubscription_default.fromResponseBody(
        body,
        client._MsgPack,
        unpacked ? void 0 : format
      );
    }).get(params);
  }
  async removeWhere(params) {
    const client = this.client, format = client.options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */, headers = defaults_default.defaultGetHeaders(client.options, { format });
    mixin(headers, client.options.headers);
    if (client.options.pushFullWait)
      mixin(params, { fullWait: "true" });
    await resource_default["delete"](client, "/push/channelSubscriptions", headers, params, null, true);
  }
  async listChannels(params) {
    const client = this.client, format = client.options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */, envelope = this.client.http.supportsLinkHeaders ? void 0 : format, headers = defaults_default.defaultGetHeaders(client.options, { format });
    mixin(headers, client.options.headers);
    if (client.options.pushFullWait)
      mixin(params, { fullWait: "true" });
    return new paginatedresource_default(client, "/push/channels", headers, envelope, async function(body, headers2, unpacked) {
      const parsedBody = !unpacked && format ? decodeBody(body, client._MsgPack, format) : body;
      for (let i = 0; i < parsedBody.length; i++) {
        parsedBody[i] = String(parsedBody[i]);
      }
      return parsedBody;
    }).get(params);
  }
};
var push_default = Push;

// src/common/lib/types/protocolmessagecommon.ts
var actions = {
  HEARTBEAT: 0,
  ACK: 1,
  NACK: 2,
  CONNECT: 3,
  CONNECTED: 4,
  DISCONNECT: 5,
  DISCONNECTED: 6,
  CLOSE: 7,
  CLOSED: 8,
  ERROR: 9,
  ATTACH: 10,
  ATTACHED: 11,
  DETACH: 12,
  DETACHED: 13,
  PRESENCE: 14,
  MESSAGE: 15,
  SYNC: 16,
  AUTH: 17,
  ACTIVATE: 18,
  STATE: 19,
  STATE_SYNC: 20,
  ANNOTATION: 21
};
var ActionName = [];
Object.keys(actions).forEach(function(name) {
  ActionName[actions[name]] = name;
});
var flags = {
  /* Channel attach state flags */
  HAS_PRESENCE: 1 << 0,
  HAS_BACKLOG: 1 << 1,
  RESUMED: 1 << 2,
  TRANSIENT: 1 << 4,
  ATTACH_RESUME: 1 << 5,
  /* Channel mode flags */
  PRESENCE: 1 << 16,
  PUBLISH: 1 << 17,
  SUBSCRIBE: 1 << 18,
  PRESENCE_SUBSCRIBE: 1 << 19,
  ANNOTATION_PUBLISH: 1 << 21,
  ANNOTATION_SUBSCRIBE: 1 << 22
};
var flagNames = Object.keys(flags);
flags.MODE_ALL = flags.PRESENCE | flags.PUBLISH | flags.SUBSCRIBE | flags.PRESENCE_SUBSCRIBE | flags.ANNOTATION_PUBLISH | flags.ANNOTATION_SUBSCRIBE;
var channelModes = [
  "PRESENCE",
  "PUBLISH",
  "SUBSCRIBE",
  "PRESENCE_SUBSCRIBE",
  "ANNOTATION_PUBLISH",
  "ANNOTATION_SUBSCRIBE"
];

// src/common/lib/types/basemessage.ts
function normaliseContext(context) {
  if (!context || !context.channelOptions) {
    return {
      channelOptions: context,
      plugins: {},
      baseEncodedPreviousPayload: void 0
    };
  }
  return context;
}
function normalizeCipherOptions(Crypto2, logger, options) {
  if (options && options.cipher) {
    if (!Crypto2)
      throwMissingPluginError("Crypto");
    const cipher = Crypto2.getCipher(options.cipher, logger);
    return {
      cipher: cipher.cipherParams,
      channelCipher: cipher.cipher
    };
  }
  return options != null ? options : {};
}
async function encrypt(msg, options) {
  let data = msg.data, encoding = msg.encoding, cipher = options.channelCipher;
  encoding = encoding ? encoding + "/" : "";
  if (!Platform.BufferUtils.isBuffer(data)) {
    data = Platform.BufferUtils.utf8Encode(String(data));
    encoding = encoding + "utf-8/";
  }
  const ciphertext = await cipher.encrypt(data);
  msg.data = ciphertext;
  msg.encoding = encoding + "cipher+" + cipher.algorithm;
  return msg;
}
async function encode(msg, options) {
  const data = msg.data;
  const nativeDataType = typeof data == "string" || Platform.BufferUtils.isBuffer(data) || data === null || data === void 0;
  if (!nativeDataType) {
    if (isObject(data) || Array.isArray(data)) {
      msg.data = JSON.stringify(data);
      msg.encoding = msg.encoding ? msg.encoding + "/json" : "json";
    } else {
      throw new ErrorInfo("Data type is unsupported", 40013, 400);
    }
  }
  if (options != null && options.cipher) {
    return encrypt(msg, options);
  } else {
    return msg;
  }
}
async function decode(message, inputContext) {
  const context = normaliseContext(inputContext);
  let lastPayload = message.data;
  const encoding = message.encoding;
  if (encoding) {
    const xforms = encoding.split("/");
    let lastProcessedEncodingIndex, encodingsToProcess = xforms.length, data = message.data;
    let xform = "";
    try {
      while ((lastProcessedEncodingIndex = encodingsToProcess) > 0) {
        const match = xforms[--encodingsToProcess].match(/([-\w]+)(\+([\w-]+))?/);
        if (!match)
          break;
        xform = match[1];
        switch (xform) {
          case "base64":
            data = Platform.BufferUtils.base64Decode(String(data));
            if (lastProcessedEncodingIndex == xforms.length) {
              lastPayload = data;
            }
            continue;
          case "utf-8":
            data = Platform.BufferUtils.utf8Decode(data);
            continue;
          case "json":
            data = JSON.parse(data);
            continue;
          case "cipher":
            if (context.channelOptions != null && context.channelOptions.cipher && context.channelOptions.channelCipher) {
              const xformAlgorithm = match[3], cipher = context.channelOptions.channelCipher;
              if (xformAlgorithm != cipher.algorithm) {
                throw new Error("Unable to decrypt message with given cipher; incompatible cipher params");
              }
              data = await cipher.decrypt(data);
              continue;
            } else {
              throw new Error("Unable to decrypt message; not an encrypted channel");
            }
          case "vcdiff":
            if (!context.plugins || !context.plugins.vcdiff) {
              throw new ErrorInfo("Missing Vcdiff decoder (https://github.com/ably-forks/vcdiff-decoder)", 40019, 400);
            }
            if (typeof Uint8Array === "undefined") {
              throw new ErrorInfo(
                "Delta decoding not supported on this browser (need ArrayBuffer & Uint8Array)",
                40020,
                400
              );
            }
            try {
              let deltaBase = context.baseEncodedPreviousPayload;
              if (typeof deltaBase === "string") {
                deltaBase = Platform.BufferUtils.utf8Encode(deltaBase);
              }
              const deltaBaseBuffer = Platform.BufferUtils.toBuffer(deltaBase);
              data = Platform.BufferUtils.toBuffer(data);
              data = Platform.BufferUtils.arrayBufferViewToBuffer(context.plugins.vcdiff.decode(data, deltaBaseBuffer));
              lastPayload = data;
            } catch (e) {
              throw new ErrorInfo("Vcdiff delta decode failed with " + e, 40018, 400);
            }
            continue;
          default:
            throw new Error("Unknown encoding");
        }
      }
    } catch (e) {
      const err = e;
      throw new ErrorInfo(
        "Error processing the " + xform + " encoding, decoder returned \u2018" + err.message + "\u2019",
        err.code || 40013,
        400
      );
    } finally {
      message.encoding = lastProcessedEncodingIndex <= 0 ? null : xforms.slice(0, lastProcessedEncodingIndex).join("/");
      message.data = data;
    }
  }
  context.baseEncodedPreviousPayload = lastPayload;
}
function wireToJSON(...args) {
  let encoding = this.encoding;
  let data = this.data;
  if (data && Platform.BufferUtils.isBuffer(data)) {
    if (args.length > 0) {
      encoding = encoding ? encoding + "/base64" : "base64";
      data = Platform.BufferUtils.base64Encode(data);
    } else {
      data = Platform.BufferUtils.toBuffer(data);
    }
  }
  return Object.assign({}, this, { encoding, data });
}
function populateFieldsFromParent(parent) {
  const { id, connectionId, timestamp } = parent;
  let msgs;
  switch (parent.action) {
    case actions.MESSAGE: {
      msgs = parent.messages;
      break;
    }
    case actions.PRESENCE:
    case actions.SYNC:
      msgs = parent.presence;
      break;
    case actions.ANNOTATION:
      msgs = parent.annotations;
      break;
    default:
      throw new ErrorInfo("Unexpected action " + parent.action, 4e4, 400);
  }
  for (let i = 0; i < msgs.length; i++) {
    const msg = msgs[i];
    if (!msg.connectionId) {
      msg.connectionId = connectionId;
    }
    if (!msg.timestamp) {
      msg.timestamp = timestamp;
    }
    if (id && !msg.id) {
      msg.id = id + ":" + i;
    }
  }
}
function strMsg(m, cls) {
  let result = "[" + cls;
  for (const attr in m) {
    if (attr === "data") {
      if (typeof m.data == "string") {
        result += "; data=" + m.data;
      } else if (Platform.BufferUtils.isBuffer(m.data)) {
        result += "; data (buffer)=" + Platform.BufferUtils.base64Encode(m.data);
      } else {
        result += "; data (json)=" + JSON.stringify(m.data);
      }
    } else if (attr && (attr === "extras" || attr === "operation")) {
      result += "; " + attr + "=" + JSON.stringify(m[attr]);
    } else if (m[attr] !== void 0) {
      result += "; " + attr + "=" + m[attr];
    }
  }
  result += "]";
  return result;
}
var BaseMessage = class {
};

// src/common/lib/types/presencemessage.ts
var actions2 = ["absent", "present", "enter", "leave", "update"];
async function fromEncoded(logger, Crypto2, encoded, inputOptions) {
  const options = normalizeCipherOptions(Crypto2, logger, inputOptions != null ? inputOptions : null);
  const wpm = WirePresenceMessage.fromValues(encoded);
  return wpm.decode(options, logger);
}
async function fromEncodedArray(logger, Crypto2, encodedArray, options) {
  return Promise.all(
    encodedArray.map(function(encoded) {
      return fromEncoded(logger, Crypto2, encoded, options);
    })
  );
}
async function _fromEncoded(encoded, channel) {
  return WirePresenceMessage.fromValues(encoded).decode(channel.channelOptions, channel.logger);
}
async function _fromEncodedArray(encodedArray, channel) {
  return Promise.all(
    encodedArray.map(function(encoded) {
      return _fromEncoded(encoded, channel);
    })
  );
}
var PresenceMessage = class _PresenceMessage extends BaseMessage {
  /* Returns whether this presenceMessage is synthesized, i.e. was not actually
   * sent by the connection (usually means a leave event sent 15s after a
   * disconnection). This is useful because synthesized messages cannot be
   * compared for newness by id lexicographically - RTP2b1
   */
  isSynthesized() {
    if (!this.id || !this.connectionId) {
      return true;
    }
    return this.id.substring(this.connectionId.length, 0) !== this.connectionId;
  }
  /* RTP2b2 */
  parseId() {
    if (!this.id)
      throw new Error("parseId(): Presence message does not contain an id");
    const parts = this.id.split(":");
    return {
      connectionId: parts[0],
      msgSerial: parseInt(parts[1], 10),
      index: parseInt(parts[2], 10)
    };
  }
  async encode(options) {
    const res = Object.assign(new WirePresenceMessage(), this, {
      action: actions2.indexOf(this.action || "present")
    });
    return encode(res, options);
  }
  static fromValues(values) {
    return Object.assign(new _PresenceMessage(), values);
  }
  static fromValuesArray(values) {
    return values.map((v) => _PresenceMessage.fromValues(v));
  }
  static fromData(data) {
    if (data instanceof _PresenceMessage) {
      return data;
    }
    return _PresenceMessage.fromValues({
      data
    });
  }
  toString() {
    return strMsg(this, "PresenceMessage");
  }
};
var WirePresenceMessage = class _WirePresenceMessage extends BaseMessage {
  toJSON(...args) {
    return wireToJSON.call(this, ...args);
  }
  static fromValues(values) {
    return Object.assign(new _WirePresenceMessage(), values);
  }
  static fromValuesArray(values) {
    return values.map((v) => _WirePresenceMessage.fromValues(v));
  }
  async decode(channelOptions, logger) {
    const res = Object.assign(new PresenceMessage(), __spreadProps(__spreadValues({}, this), {
      action: actions2[this.action]
    }));
    try {
      await decode(res, channelOptions);
    } catch (e) {
      logger_default.logAction(logger, logger_default.LOG_ERROR, "WirePresenceMessage.decode()", inspectError(e));
    }
    return res;
  }
  toString() {
    return strMsg(this, "WirePresenceMessage");
  }
};
var presencemessage_default = PresenceMessage;

// src/common/lib/client/restpresence.ts
var RestPresence = class {
  constructor(channel) {
    this.channel = channel;
  }
  get logger() {
    return this.channel.logger;
  }
  async get(params) {
    logger_default.logAction(this.logger, logger_default.LOG_MICRO, "RestPresence.get()", "channel = " + this.channel.name);
    const client = this.channel.client, format = client.options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */, envelope = this.channel.client.http.supportsLinkHeaders ? void 0 : format, headers = defaults_default.defaultGetHeaders(client.options, { format });
    mixin(headers, client.options.headers);
    return new paginatedresource_default(
      client,
      this.channel.client.rest.presenceMixin.basePath(this),
      headers,
      envelope,
      async (body, headers2, unpacked) => {
        const decoded = unpacked ? body : decodeBody(body, client._MsgPack, format);
        return _fromEncodedArray(decoded, this.channel);
      }
    ).get(params);
  }
  async history(params) {
    logger_default.logAction(this.logger, logger_default.LOG_MICRO, "RestPresence.history()", "channel = " + this.channel.name);
    return this.channel.client.rest.presenceMixin.history(this, params);
  }
};
var restpresence_default = RestPresence;

// src/common/lib/types/message.ts
var actions3 = [
  "message.create",
  "message.update",
  "message.delete",
  "meta.occupancy",
  "message.summary"
];
function stringifyAction(action) {
  return actions3[action || 0] || "unknown";
}
function getMessageSize(msg) {
  let size = 0;
  if (msg.name) {
    size += msg.name.length;
  }
  if (msg.clientId) {
    size += msg.clientId.length;
  }
  if (msg.extras) {
    size += JSON.stringify(msg.extras).length;
  }
  if (msg.data) {
    size += dataSizeBytes(msg.data);
  }
  return size;
}
async function fromEncoded2(logger, Crypto2, encoded, inputOptions) {
  const options = normalizeCipherOptions(Crypto2, logger, inputOptions != null ? inputOptions : null);
  const wm = WireMessage.fromValues(encoded);
  return wm.decode(options, logger);
}
async function fromEncodedArray2(logger, Crypto2, encodedArray, options) {
  return Promise.all(
    encodedArray.map(function(encoded) {
      return fromEncoded2(logger, Crypto2, encoded, options);
    })
  );
}
async function _fromEncoded2(encoded, channel) {
  const wm = WireMessage.fromValues(encoded);
  return wm.decode(channel.channelOptions, channel.logger);
}
async function _fromEncodedArray2(encodedArray, channel) {
  return Promise.all(
    encodedArray.map(function(encoded) {
      return _fromEncoded2(encoded, channel);
    })
  );
}
async function encodeArray(messages, options) {
  return Promise.all(messages.map((message) => message.encode(options)));
}
var serialize = encodeBody;
function getMessagesSize(messages) {
  let msg, total = 0;
  for (let i = 0; i < messages.length; i++) {
    msg = messages[i];
    total += msg.size || (msg.size = getMessageSize(msg));
  }
  return total;
}
var Message = class _Message extends BaseMessage {
  // TODO improve typings after summary structure is finalised
  expandFields() {
    if (this.action === "message.create") {
      if (this.version && !this.serial) {
        this.serial = this.version;
      }
      if (this.timestamp && !this.createdAt) {
        this.createdAt = this.timestamp;
      }
    }
  }
  async encode(options) {
    const res = Object.assign(new WireMessage(), this, {
      action: actions3.indexOf(this.action || "message.create")
    });
    return encode(res, options);
  }
  static fromValues(values) {
    return Object.assign(new _Message(), values);
  }
  static fromValuesArray(values) {
    return values.map((v) => _Message.fromValues(v));
  }
  toString() {
    return strMsg(this, "Message");
  }
};
var WireMessage = class _WireMessage extends BaseMessage {
  // Overload toJSON() to intercept JSON.stringify()
  toJSON(...args) {
    return wireToJSON.call(this, ...args);
  }
  static fromValues(values) {
    return Object.assign(new _WireMessage(), values);
  }
  static fromValuesArray(values) {
    return values.map((v) => _WireMessage.fromValues(v));
  }
  // for contexts where some decoding errors need to be handled specially by the caller
  async decodeWithErr(inputContext, logger) {
    const res = Object.assign(new Message(), __spreadProps(__spreadValues({}, this), {
      action: stringifyAction(this.action)
    }));
    let err;
    try {
      await decode(res, inputContext);
    } catch (e) {
      logger_default.logAction(logger, logger_default.LOG_ERROR, "WireMessage.decode()", inspectError(e));
      err = e;
    }
    res.expandFields();
    return { decoded: res, err };
  }
  async decode(inputContext, logger) {
    const { decoded } = await this.decodeWithErr(inputContext, logger);
    return decoded;
  }
  toString() {
    return strMsg(this, "WireMessage");
  }
};
var message_default = Message;

// src/common/lib/client/restchannel.ts
var MSG_ID_ENTROPY_BYTES = 9;
function allEmptyIds(messages) {
  return messages.every(function(message) {
    return !message.id;
  });
}
var RestChannel = class {
  constructor(client, name, channelOptions) {
    this._annotations = null;
    var _a2, _b;
    logger_default.logAction(client.logger, logger_default.LOG_MINOR, "RestChannel()", "started; name = " + name);
    this.name = name;
    this.client = client;
    this.presence = new restpresence_default(this);
    this.channelOptions = normaliseChannelOptions((_a2 = client._Crypto) != null ? _a2 : null, this.logger, channelOptions);
    if ((_b = client.options.plugins) == null ? void 0 : _b.Push) {
      this._push = new client.options.plugins.Push.PushChannel(this);
    }
    if (client._Annotations) {
      this._annotations = new client._Annotations.RestAnnotations(this);
    }
  }
  get annotations() {
    if (!this._annotations) {
      throwMissingPluginError("Annotations");
    }
    return this._annotations;
  }
  get push() {
    if (!this._push) {
      throwMissingPluginError("Push");
    }
    return this._push;
  }
  get logger() {
    return this.client.logger;
  }
  setOptions(options) {
    var _a2;
    this.channelOptions = normaliseChannelOptions((_a2 = this.client._Crypto) != null ? _a2 : null, this.logger, options);
  }
  async history(params) {
    logger_default.logAction(this.logger, logger_default.LOG_MICRO, "RestChannel.history()", "channel = " + this.name);
    return this.client.rest.channelMixin.history(this, params);
  }
  async publish(...args) {
    const first = args[0], second = args[1];
    let messages;
    let params;
    if (typeof first === "string" || first === null) {
      messages = [message_default.fromValues({ name: first, data: second })];
      params = args[2];
    } else if (isObject(first)) {
      messages = [message_default.fromValues(first)];
      params = args[1];
    } else if (Array.isArray(first)) {
      messages = message_default.fromValuesArray(first);
      params = args[1];
    } else {
      throw new ErrorInfo(
        "The single-argument form of publish() expects a message object or an array of message objects",
        40013,
        400
      );
    }
    if (!params) {
      params = {};
    }
    const client = this.client, options = client.options, format = options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */, idempotentRestPublishing = client.options.idempotentRestPublishing, headers = defaults_default.defaultPostHeaders(client.options, { format });
    mixin(headers, options.headers);
    if (idempotentRestPublishing && allEmptyIds(messages)) {
      const msgIdBase = await randomString(MSG_ID_ENTROPY_BYTES);
      messages.forEach(function(message, index) {
        message.id = msgIdBase + ":" + index.toString();
      });
    }
    const wireMessages = await encodeArray(messages, this.channelOptions);
    const size = getMessagesSize(wireMessages), maxMessageSize = options.maxMessageSize;
    if (size > maxMessageSize) {
      throw new ErrorInfo(
        "Maximum size of messages that can be published at once exceeded ( was " + size + " bytes; limit is " + maxMessageSize + " bytes)",
        40009,
        400
      );
    }
    await this._publish(serialize(wireMessages, client._MsgPack, format), headers, params);
  }
  async _publish(requestBody, headers, params) {
    await resource_default.post(
      this.client,
      this.client.rest.channelMixin.basePath(this) + "/messages",
      requestBody,
      headers,
      params,
      null,
      true
    );
  }
  async status() {
    return this.client.rest.channelMixin.status(this);
  }
};
var restchannel_default = RestChannel;

// src/common/lib/types/stats.ts
var Stats = class _Stats {
  constructor(values) {
    this.entries = values && values.entries || void 0;
    this.schema = values && values.schema || void 0;
    this.appId = values && values.appId || void 0;
    this.inProgress = values && values.inProgress || void 0;
    this.unit = values && values.unit || void 0;
    this.intervalId = values && values.intervalId || void 0;
  }
  static fromValues(values) {
    return new _Stats(values);
  }
};
var stats_default = Stats;

// src/common/lib/client/restchannelmixin.ts
var RestChannelMixin = class {
  static basePath(channel) {
    return "/channels/" + encodeURIComponent(channel.name);
  }
  static history(channel, params) {
    const client = channel.client, format = client.options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */, envelope = channel.client.http.supportsLinkHeaders ? void 0 : format, headers = defaults_default.defaultGetHeaders(client.options, { format });
    mixin(headers, client.options.headers);
    return new paginatedresource_default(client, this.basePath(channel) + "/messages", headers, envelope, async function(body, headers2, unpacked) {
      const decoded = unpacked ? body : decodeBody(body, client._MsgPack, format);
      return _fromEncodedArray2(decoded, channel);
    }).get(params);
  }
  static async status(channel) {
    const format = channel.client.options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */;
    const headers = defaults_default.defaultPostHeaders(channel.client.options, { format });
    const response = await resource_default.get(
      channel.client,
      this.basePath(channel),
      headers,
      {},
      format,
      true
    );
    return response.body;
  }
};

// src/common/lib/client/restpresencemixin.ts
var RestPresenceMixin = class {
  static basePath(presence) {
    return RestChannelMixin.basePath(presence.channel) + "/presence";
  }
  static async history(presence, params) {
    const client = presence.channel.client, format = client.options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */, envelope = presence.channel.client.http.supportsLinkHeaders ? void 0 : format, headers = defaults_default.defaultGetHeaders(client.options, { format });
    mixin(headers, client.options.headers);
    return new paginatedresource_default(
      client,
      this.basePath(presence) + "/history",
      headers,
      envelope,
      async (body, headers2, unpacked) => {
        const decoded = unpacked ? body : decodeBody(body, client._MsgPack, format);
        return _fromEncodedArray(decoded, presence.channel);
      }
    ).get(params);
  }
};

// src/common/lib/client/rest.ts
var Rest = class {
  constructor(client) {
    this.channelMixin = RestChannelMixin;
    this.presenceMixin = RestPresenceMixin;
    // exposed for plugins but shouldn't be bundled with minimal realtime
    this.Resource = resource_default;
    this.DeviceDetails = devicedetails_default;
    this.client = client;
    this.channels = new Channels(this.client);
    this.push = new push_default(this.client);
  }
  async stats(params) {
    const headers = defaults_default.defaultGetHeaders(this.client.options), format = this.client.options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */, envelope = this.client.http.supportsLinkHeaders ? void 0 : format;
    mixin(headers, this.client.options.headers);
    return new paginatedresource_default(this.client, "/stats", headers, envelope, function(body, headers2, unpacked) {
      const statsValues = unpacked ? body : JSON.parse(body);
      for (let i = 0; i < statsValues.length; i++)
        statsValues[i] = stats_default.fromValues(statsValues[i]);
      return statsValues;
    }).get(params);
  }
  async time(params) {
    const headers = defaults_default.defaultGetHeaders(this.client.options);
    if (this.client.options.headers)
      mixin(headers, this.client.options.headers);
    const timeUri = (host) => {
      return this.client.baseUri(host) + "/time";
    };
    let { error, body, unpacked } = await this.client.http.do(
      HttpMethods_default.Get,
      timeUri,
      headers,
      null,
      params
    );
    if (error) {
      throw error;
    }
    if (!unpacked)
      body = JSON.parse(body);
    const time = body[0];
    if (!time) {
      throw new ErrorInfo("Internal error (unexpected result type from GET /time)", 5e4, 500);
    }
    this.client.serverTimeOffset = time - Date.now();
    return time;
  }
  async request(method, path, version2, params, body, customHeaders) {
    var _a2;
    const [encoder, decoder, format] = (() => {
      if (this.client.options.useBinaryProtocol) {
        if (!this.client._MsgPack) {
          throwMissingPluginError("MsgPack");
        }
        return [this.client._MsgPack.encode, this.client._MsgPack.decode, "msgpack" /* msgpack */];
      } else {
        return [JSON.stringify, JSON.parse, "json" /* json */];
      }
    })();
    const envelope = this.client.http.supportsLinkHeaders ? void 0 : format;
    params = params || {};
    const _method = method.toLowerCase();
    const headers = _method == "get" ? defaults_default.defaultGetHeaders(this.client.options, { format, protocolVersion: version2 }) : defaults_default.defaultPostHeaders(this.client.options, { format, protocolVersion: version2 });
    if (typeof body !== "string") {
      body = (_a2 = encoder(body)) != null ? _a2 : null;
    }
    mixin(headers, this.client.options.headers);
    if (customHeaders) {
      mixin(headers, customHeaders);
    }
    const paginatedResource = new paginatedresource_default(
      this.client,
      path,
      headers,
      envelope,
      async function(resbody, headers2, unpacked) {
        return ensureArray(unpacked ? resbody : decoder(resbody));
      },
      /* useHttpPaginatedResponse: */
      true
    );
    if (!Platform.Http.methods.includes(_method)) {
      throw new ErrorInfo("Unsupported method " + _method, 40500, 405);
    }
    if (Platform.Http.methodsWithBody.includes(_method)) {
      return paginatedResource[_method](params, body);
    } else {
      return paginatedResource[_method](params);
    }
  }
  async batchPublish(specOrSpecs) {
    let requestBodyDTO;
    let singleSpecMode;
    if (Array.isArray(specOrSpecs)) {
      requestBodyDTO = specOrSpecs;
      singleSpecMode = false;
    } else {
      requestBodyDTO = [specOrSpecs];
      singleSpecMode = true;
    }
    const format = this.client.options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */, headers = defaults_default.defaultPostHeaders(this.client.options, { format });
    if (this.client.options.headers)
      mixin(headers, this.client.options.headers);
    const requestBody = encodeBody(requestBodyDTO, this.client._MsgPack, format);
    const response = await resource_default.post(this.client, "/messages", requestBody, headers, {}, null, true);
    const batchResults = response.unpacked ? response.body : decodeBody(response.body, this.client._MsgPack, format);
    if (singleSpecMode) {
      return batchResults[0];
    } else {
      return batchResults;
    }
  }
  async batchPresence(channels) {
    const format = this.client.options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */, headers = defaults_default.defaultPostHeaders(this.client.options, { format });
    if (this.client.options.headers)
      mixin(headers, this.client.options.headers);
    const channelsParam = channels.join(",");
    const response = await resource_default.get(this.client, "/presence", headers, { channels: channelsParam }, null, true);
    return response.unpacked ? response.body : decodeBody(response.body, this.client._MsgPack, format);
  }
  async revokeTokens(specifiers, options) {
    if (useTokenAuth(this.client.options)) {
      throw new ErrorInfo("Cannot revoke tokens when using token auth", 40162, 401);
    }
    const keyName = this.client.options.keyName;
    let resolvedOptions = options != null ? options : {};
    const requestBodyDTO = __spreadValues({
      targets: specifiers.map((specifier) => `${specifier.type}:${specifier.value}`)
    }, resolvedOptions);
    const format = this.client.options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */, headers = defaults_default.defaultPostHeaders(this.client.options, { format });
    if (this.client.options.headers)
      mixin(headers, this.client.options.headers);
    const requestBody = encodeBody(requestBodyDTO, this.client._MsgPack, format);
    const response = await resource_default.post(
      this.client,
      `/keys/${keyName}/revokeTokens`,
      requestBody,
      headers,
      {},
      null,
      true
    );
    return response.unpacked ? response.body : decodeBody(response.body, this.client._MsgPack, format);
  }
};
var Channels = class {
  constructor(client) {
    this.client = client;
    this.all = /* @__PURE__ */ Object.create(null);
  }
  get(name, channelOptions) {
    name = String(name);
    let channel = this.all[name];
    if (!channel) {
      this.all[name] = channel = new restchannel_default(this.client, name, channelOptions);
    } else if (channelOptions) {
      channel.setOptions(channelOptions);
    }
    return channel;
  }
  /* Included to support certain niche use-cases; most users should ignore this.
   * Please do not use this unless you know what you're doing */
  release(name) {
    delete this.all[String(name)];
  }
};

// src/common/lib/client/baserest.ts
var BaseRest = class extends baseclient_default {
  /*
   * The public typings declare that this only accepts an object, but since we want to emit a good error message in the case where a non-TypeScript user does one of these things:
   *
   * 1. passes a string (which is quite likely if they’re e.g. migrating from the default variant to the modular variant)
   * 2. passes no argument at all
   *
   * tell the compiler that these cases are possible so that it forces us to handle them.
   */
  constructor(options) {
    super(defaults_default.objectifyOptions(options, false, "BaseRest", logger_default.defaultLogger, { Rest }));
  }
};

// src/common/lib/client/modularplugins.ts
var allCommonModularPlugins = { Rest };

// src/common/lib/types/defaultmessage.ts
var DefaultMessage = class extends message_default {
  static async fromEncoded(encoded, inputOptions) {
    return fromEncoded2(logger_default.defaultLogger, Platform.Crypto, encoded, inputOptions);
  }
  static async fromEncodedArray(encodedArray, options) {
    return fromEncodedArray2(logger_default.defaultLogger, Platform.Crypto, encodedArray, options);
  }
  static fromValues(values) {
    return message_default.fromValues(values);
  }
};

// src/common/lib/types/defaultpresencemessage.ts
var DefaultPresenceMessage = class extends presencemessage_default {
  static async fromEncoded(encoded, inputOptions) {
    return fromEncoded(logger_default.defaultLogger, Platform.Crypto, encoded, inputOptions);
  }
  static async fromEncodedArray(encodedArray, options) {
    return fromEncodedArray(logger_default.defaultLogger, Platform.Crypto, encodedArray, options);
  }
  static fromValues(values) {
    return presencemessage_default.fromValues(values);
  }
};

// src/common/lib/types/annotation.ts
var actions4 = ["annotation.create", "annotation.delete"];
async function fromEncoded3(logger, encoded, options) {
  const wa = WireAnnotation.fromValues(encoded);
  return wa.decode(options || {}, logger);
}
async function fromEncodedArray3(logger, encodedArray, options) {
  return Promise.all(
    encodedArray.map(function(encoded) {
      return fromEncoded3(logger, encoded, options);
    })
  );
}
async function _fromEncoded3(encoded, channel) {
  return WireAnnotation.fromValues(encoded).decode(channel.channelOptions, channel.logger);
}
async function _fromEncodedArray3(encodedArray, channel) {
  return Promise.all(
    encodedArray.map(function(encoded) {
      return _fromEncoded3(encoded, channel);
    })
  );
}
var Annotation = class _Annotation extends BaseMessage {
  async encode() {
    const res = Object.assign(new WireAnnotation(), this, {
      action: actions4.indexOf(this.action || "annotation.create")
    });
    return encode(res, {});
  }
  static fromValues(values) {
    return Object.assign(new _Annotation(), values);
  }
  static fromValuesArray(values) {
    return values.map((v) => _Annotation.fromValues(v));
  }
  toString() {
    return strMsg(this, "Annotation");
  }
};
var WireAnnotation = class _WireAnnotation extends BaseMessage {
  toJSON(...args) {
    return wireToJSON.call(this, ...args);
  }
  static fromValues(values) {
    return Object.assign(new _WireAnnotation(), values);
  }
  static fromValuesArray(values) {
    return values.map((v) => _WireAnnotation.fromValues(v));
  }
  async decode(channelOptions, logger) {
    const res = Object.assign(new Annotation(), __spreadProps(__spreadValues({}, this), {
      action: actions4[this.action]
    }));
    try {
      await decode(res, channelOptions);
    } catch (e) {
      logger_default.logAction(logger, logger_default.LOG_ERROR, "WireAnnotation.decode()", inspectError(e));
    }
    return res;
  }
  toString() {
    return strMsg(this, "WireAnnotation");
  }
};
var annotation_default = Annotation;

// src/common/lib/types/defaultannotation.ts
var DefaultAnnotation = class extends annotation_default {
  static async fromEncoded(encoded, inputOptions) {
    return fromEncoded3(logger_default.defaultLogger, encoded, inputOptions);
  }
  static async fromEncodedArray(encodedArray, options) {
    return fromEncodedArray3(logger_default.defaultLogger, encodedArray, options);
  }
  static fromValues(values) {
    return annotation_default.fromValues(values);
  }
};

// src/common/lib/util/eventemitter.ts
function callListener(logger, eventThis, listener, args) {
  try {
    listener.apply(eventThis, args);
  } catch (e) {
    logger_default.logAction(
      logger,
      logger_default.LOG_ERROR,
      "EventEmitter.emit()",
      "Unexpected listener exception: " + e + "; stack = " + (e && e.stack)
    );
  }
}
function removeListener(targetListeners, listener, eventFilter) {
  let listeners;
  let index;
  let eventName;
  for (let targetListenersIndex = 0; targetListenersIndex < targetListeners.length; targetListenersIndex++) {
    listeners = targetListeners[targetListenersIndex];
    if (eventFilter) {
      listeners = listeners[eventFilter];
    }
    if (Array.isArray(listeners)) {
      while ((index = listeners.indexOf(listener)) !== -1) {
        listeners.splice(index, 1);
      }
      if (eventFilter && listeners.length === 0) {
        delete targetListeners[targetListenersIndex][eventFilter];
      }
    } else if (isObject(listeners)) {
      for (eventName in listeners) {
        if (Object.prototype.hasOwnProperty.call(listeners, eventName) && Array.isArray(listeners[eventName])) {
          removeListener([listeners], listener, eventName);
        }
      }
    }
  }
}
var EventEmitter = class {
  constructor(logger) {
    this.logger = logger;
    this.any = [];
    this.events = /* @__PURE__ */ Object.create(null);
    this.anyOnce = [];
    this.eventsOnce = /* @__PURE__ */ Object.create(null);
  }
  on(...args) {
    if (args.length === 1) {
      const listener = args[0];
      if (typeof listener === "function") {
        this.any.push(listener);
      } else {
        throw new Error("EventListener.on(): Invalid arguments: " + Platform.Config.inspect(args));
      }
    }
    if (args.length === 2) {
      const [event, listener] = args;
      if (typeof listener !== "function") {
        throw new Error("EventListener.on(): Invalid arguments: " + Platform.Config.inspect(args));
      }
      if (isNil(event)) {
        this.any.push(listener);
      } else if (Array.isArray(event)) {
        event.forEach((eventName) => {
          this.on(eventName, listener);
        });
      } else {
        if (typeof event !== "string") {
          throw new Error("EventListener.on(): Invalid arguments: " + Platform.Config.inspect(args));
        }
        const listeners = this.events[event] || (this.events[event] = []);
        listeners.push(listener);
      }
    }
  }
  off(...args) {
    if (args.length == 0 || isNil(args[0]) && isNil(args[1])) {
      this.any = [];
      this.events = /* @__PURE__ */ Object.create(null);
      this.anyOnce = [];
      this.eventsOnce = /* @__PURE__ */ Object.create(null);
      return;
    }
    const [firstArg, secondArg] = args;
    let listener = null;
    let event = null;
    if (args.length === 1 || !secondArg) {
      if (typeof firstArg === "function") {
        listener = firstArg;
      } else {
        event = firstArg;
      }
    } else {
      if (typeof secondArg !== "function") {
        throw new Error("EventEmitter.off(): invalid arguments:" + Platform.Config.inspect(args));
      }
      [event, listener] = [firstArg, secondArg];
    }
    if (listener && isNil(event)) {
      removeListener([this.any, this.events, this.anyOnce, this.eventsOnce], listener);
      return;
    }
    if (Array.isArray(event)) {
      event.forEach((eventName) => {
        this.off(eventName, listener);
      });
      return;
    }
    if (typeof event !== "string") {
      throw new Error("EventEmitter.off(): invalid arguments:" + Platform.Config.inspect(args));
    }
    if (listener) {
      removeListener([this.events, this.eventsOnce], listener, event);
    } else {
      delete this.events[event];
      delete this.eventsOnce[event];
    }
  }
  /**
   * Get the array of listeners for a given event; excludes once events
   * @param event (optional) the name of the event, or none for 'any'
   * @return array of events, or null if none
   */
  listeners(event) {
    if (event) {
      const listeners = this.events[event] || [];
      if (this.eventsOnce[event])
        Array.prototype.push.apply(listeners, this.eventsOnce[event]);
      return listeners.length ? listeners : null;
    }
    return this.any.length ? this.any : null;
  }
  /**
   * Emit an event
   * @param event the event name
   * @param args the arguments to pass to the listener
   */
  emit(event, ...args) {
    const eventThis = { event };
    const listeners = [];
    if (this.anyOnce.length) {
      Array.prototype.push.apply(listeners, this.anyOnce);
      this.anyOnce = [];
    }
    if (this.any.length) {
      Array.prototype.push.apply(listeners, this.any);
    }
    const eventsOnceListeners = this.eventsOnce[event];
    if (eventsOnceListeners) {
      Array.prototype.push.apply(listeners, eventsOnceListeners);
      delete this.eventsOnce[event];
    }
    const eventsListeners = this.events[event];
    if (eventsListeners) {
      Array.prototype.push.apply(listeners, eventsListeners);
    }
    listeners.forEach((listener) => {
      callListener(this.logger, eventThis, listener, args);
    });
  }
  once(...args) {
    const argCount = args.length;
    if (argCount === 0 || argCount === 1 && typeof args[0] !== "function") {
      const event = args[0];
      return new Promise((resolve) => {
        this.once(event, resolve);
      });
    }
    const [firstArg, secondArg] = args;
    if (args.length === 1 && typeof firstArg === "function") {
      this.anyOnce.push(firstArg);
    } else if (isNil(firstArg)) {
      if (typeof secondArg !== "function") {
        throw new Error("EventEmitter.once(): Invalid arguments:" + Platform.Config.inspect(args));
      }
      this.anyOnce.push(secondArg);
    } else if (Array.isArray(firstArg)) {
      const self2 = this;
      const listenerWrapper = function() {
        const innerArgs = Array.prototype.slice.call(arguments);
        firstArg.forEach(function(eventName) {
          self2.off(eventName, listenerWrapper);
        });
        if (typeof secondArg !== "function") {
          throw new Error("EventEmitter.once(): Invalid arguments:" + Platform.Config.inspect(args));
        }
        secondArg.apply(this, innerArgs);
      };
      firstArg.forEach(function(eventName) {
        self2.on(eventName, listenerWrapper);
      });
    } else {
      if (typeof firstArg !== "string") {
        throw new Error("EventEmitter.once(): Invalid arguments:" + Platform.Config.inspect(args));
      }
      const listeners = this.eventsOnce[firstArg] || (this.eventsOnce[firstArg] = []);
      if (secondArg) {
        if (typeof secondArg !== "function") {
          throw new Error("EventEmitter.once(): Invalid arguments:" + Platform.Config.inspect(args));
        }
        listeners.push(secondArg);
      }
    }
  }
  /**
   * Listen for a single occurrence of a state event and fire immediately if currentState matches targetState
   * @param targetState the name of the state event to listen to
   * @param currentState the name of the current state of this object
   */
  async whenState(targetState, currentState) {
    if (typeof targetState !== "string" || typeof currentState !== "string") {
      throw new Error("whenState requires a valid state String argument");
    }
    if (targetState === currentState) {
      return null;
    } else {
      return this.once(targetState);
    }
  }
};
var eventemitter_default = EventEmitter;

// src/common/lib/client/restannotations.ts
function constructValidateAnnotation(msgOrSerial, annotationValues) {
  let messageSerial;
  switch (typeof msgOrSerial) {
    case "string":
      messageSerial = msgOrSerial;
      break;
    case "object":
      messageSerial = msgOrSerial.serial;
      break;
  }
  if (!messageSerial || typeof messageSerial !== "string") {
    throw new ErrorInfo("First argument of annotation.publish() must be either a Message (or at least an object with a string `serial` property) or a message serial (string)", 40003, 400);
  }
  if (!annotationValues || typeof annotationValues !== "object") {
    throw new ErrorInfo("Second argument of annotation.publish() must be an object (the intended annotation to publish)", 40003, 400);
  }
  const annotation = annotation_default.fromValues(annotationValues);
  annotation.messageSerial = messageSerial;
  if (!annotation.action) {
    annotation.action = "annotation.create";
  }
  return annotation;
}
function basePathForSerial(channel, serial) {
  return channel.client.rest.channelMixin.basePath(channel) + "/messages/" + encodeURIComponent(serial) + "/annotations";
}
var RestAnnotations = class {
  constructor(channel) {
    this.channel = channel;
  }
  async publish(msgOrSerial, annotationValues) {
    const annotation = constructValidateAnnotation(msgOrSerial, annotationValues);
    const wireAnnotation = await annotation.encode();
    const client = this.channel.client, options = client.options, format = options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */, headers = defaults_default.defaultPostHeaders(client.options, { format }), params = {};
    const requestBody = encodeBody([wireAnnotation], client._MsgPack, format);
    await resource_default.post(client, basePathForSerial(this.channel, annotation.messageSerial), requestBody, headers, params, null, true);
  }
  async get(serial, params) {
    const client = this.channel.client, format = client.options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */, envelope = client.http.supportsLinkHeaders ? void 0 : format, headers = defaults_default.defaultGetHeaders(client.options, { format });
    mixin(headers, client.options.headers);
    return new paginatedresource_default(
      client,
      basePathForSerial(this.channel, serial),
      headers,
      envelope,
      async (body, _, unpacked) => {
        const decoded = unpacked ? body : decodeBody(body, client._MsgPack, format);
        return _fromEncodedArray3(decoded, this.channel);
      }
    ).get(params);
  }
};
var restannotations_default = RestAnnotations;

// src/common/lib/types/protocolmessage.ts
var serialize2 = encodeBody;
function toStringArray(array) {
  const result = [];
  if (array) {
    for (let i = 0; i < array.length; i++) {
      result.push(array[i].toString());
    }
  }
  return "[ " + result.join(", ") + " ]";
}
function deserialize(serialized, MsgPack, presenceMessagePlugin, annotationsPlugin, format) {
  const deserialized = decodeBody(serialized, MsgPack, format);
  return fromDeserialized(deserialized, presenceMessagePlugin, annotationsPlugin);
}
function fromDeserialized(deserialized, presenceMessagePlugin, annotationsPlugin) {
  let error;
  if (deserialized.error) {
    error = ErrorInfo.fromValues(deserialized.error);
  }
  let messages;
  if (deserialized.messages) {
    messages = WireMessage.fromValuesArray(deserialized.messages);
  }
  let presence;
  if (presenceMessagePlugin && deserialized.presence) {
    presence = presenceMessagePlugin.WirePresenceMessage.fromValuesArray(
      deserialized.presence
    );
  }
  let annotations;
  if (annotationsPlugin && deserialized.annotations) {
    annotations = annotationsPlugin.WireAnnotation.fromValuesArray(
      deserialized.annotations
    );
  }
  return Object.assign(new ProtocolMessage(), __spreadProps(__spreadValues({}, deserialized), { presence, messages, annotations, error }));
}
function fromDeserializedIncludingDependencies(deserialized) {
  return fromDeserialized(
    deserialized,
    { PresenceMessage: presencemessage_default, WirePresenceMessage },
    { Annotation: annotation_default, WireAnnotation, RealtimeAnnotations: realtimeannotations_default, RestAnnotations: restannotations_default }
  );
}
function fromValues(values) {
  return Object.assign(new ProtocolMessage(), values);
}
function stringify(msg, presenceMessagePlugin, annotationsPlugin) {
  let result = "[ProtocolMessage";
  if (msg.action !== void 0)
    result += "; action=" + ActionName[msg.action] || msg.action;
  const simpleAttributes = ["id", "channel", "channelSerial", "connectionId", "count", "msgSerial", "timestamp"];
  let attribute;
  for (let attribIndex = 0; attribIndex < simpleAttributes.length; attribIndex++) {
    attribute = simpleAttributes[attribIndex];
    if (msg[attribute] !== void 0)
      result += "; " + attribute + "=" + msg[attribute];
  }
  if (msg.messages)
    result += "; messages=" + toStringArray(WireMessage.fromValuesArray(msg.messages));
  if (msg.presence && presenceMessagePlugin)
    result += "; presence=" + toStringArray(presenceMessagePlugin.WirePresenceMessage.fromValuesArray(msg.presence));
  if (msg.annotations && annotationsPlugin) {
    result += "; annotations=" + toStringArray(annotationsPlugin.WireAnnotation.fromValuesArray(msg.annotations));
  }
  if (msg.error)
    result += "; error=" + ErrorInfo.fromValues(msg.error).toString();
  if (msg.auth && msg.auth.accessToken)
    result += "; token=" + msg.auth.accessToken;
  if (msg.flags)
    result += "; flags=" + flagNames.filter(msg.hasFlag).join(",");
  if (msg.params) {
    let stringifiedParams = "";
    forInOwnNonNullProperties(msg.params, function(prop) {
      if (stringifiedParams.length > 0) {
        stringifiedParams += "; ";
      }
      stringifiedParams += prop + "=" + msg.params[prop];
    });
    if (stringifiedParams.length > 0) {
      result += "; params=[" + stringifiedParams + "]";
    }
  }
  result += "]";
  return result;
}
var ProtocolMessage = class {
  constructor() {
    this.hasFlag = (flag) => {
      return (this.flags & flags[flag]) > 0;
    };
  }
  setFlag(flag) {
    return this.flags = this.flags | flags[flag];
  }
  getMode() {
    return (this.flags || 0) & flags.MODE_ALL;
  }
  encodeModesToFlags(modes) {
    modes.forEach((mode) => this.setFlag(mode));
  }
  decodeModesFromFlags() {
    const modes = [];
    channelModes.forEach((mode) => {
      if (this.hasFlag(mode)) {
        modes.push(mode);
      }
    });
    return modes.length > 0 ? modes : void 0;
  }
};
var protocolmessage_default = ProtocolMessage;

// src/common/lib/client/channelstatechange.ts
var ChannelStateChange = class {
  constructor(previous, current, resumed, hasBacklog, reason) {
    this.previous = previous;
    this.current = current;
    if (current === "attached") {
      this.resumed = resumed;
      this.hasBacklog = hasBacklog;
    }
    if (reason)
      this.reason = reason;
  }
};
var channelstatechange_default = ChannelStateChange;

// src/common/lib/client/realtimechannel.ts
var noop = function() {
};
function validateChannelOptions(options) {
  if (options && "params" in options && !isObject(options.params)) {
    return new ErrorInfo("options.params must be an object", 4e4, 400);
  }
  if (options && "modes" in options) {
    if (!Array.isArray(options.modes)) {
      return new ErrorInfo("options.modes must be an array", 4e4, 400);
    }
    for (let i = 0; i < options.modes.length; i++) {
      const currentMode = options.modes[i];
      if (!currentMode || typeof currentMode !== "string" || !channelModes.includes(String.prototype.toUpperCase.call(currentMode))) {
        return new ErrorInfo("Invalid channel mode: " + currentMode, 4e4, 400);
      }
    }
  }
}
var RealtimeChannel = class _RealtimeChannel extends eventemitter_default {
  constructor(client, name, options) {
    var _a2, _b;
    super(client.logger);
    this._annotations = null;
    this._mode = 0;
    this.retryCount = 0;
    this.history = async function(params) {
      logger_default.logAction(this.logger, logger_default.LOG_MICRO, "RealtimeChannel.history()", "channel = " + this.name);
      const restMixin = this.client.rest.channelMixin;
      if (params && params.untilAttach) {
        if (this.state !== "attached") {
          throw new ErrorInfo("option untilAttach requires the channel to be attached", 4e4, 400);
        }
        if (!this.properties.attachSerial) {
          throw new ErrorInfo(
            "untilAttach was specified and channel is attached, but attachSerial is not defined",
            4e4,
            400
          );
        }
        delete params.untilAttach;
        params.from_serial = this.properties.attachSerial;
      }
      return restMixin.history(this, params);
    };
    this.whenState = (state) => {
      return eventemitter_default.prototype.whenState.call(this, state, this.state);
    };
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "RealtimeChannel()", "started; name = " + name);
    this.name = name;
    this.channelOptions = normaliseChannelOptions((_a2 = client._Crypto) != null ? _a2 : null, this.logger, options);
    this.client = client;
    this._presence = client._RealtimePresence ? new client._RealtimePresence.RealtimePresence(this) : null;
    if (client._Annotations) {
      this._annotations = new client._Annotations.RealtimeAnnotations(this);
    }
    this.connectionManager = client.connection.connectionManager;
    this.state = "initialized";
    this.subscriptions = new eventemitter_default(this.logger);
    this.syncChannelSerial = void 0;
    this.properties = {
      attachSerial: void 0,
      channelSerial: void 0
    };
    this.setOptions(options);
    this.errorReason = null;
    this._attachResume = false;
    this._decodingContext = {
      channelOptions: this.channelOptions,
      plugins: client.options.plugins || {},
      baseEncodedPreviousPayload: void 0
    };
    this._lastPayload = {
      messageId: null,
      protocolMessageChannelSerial: null,
      decodeFailureRecoveryInProgress: null
    };
    this._allChannelChanges = new eventemitter_default(this.logger);
    if ((_b = client.options.plugins) == null ? void 0 : _b.Push) {
      this._push = new client.options.plugins.Push.PushChannel(this);
    }
  }
  get presence() {
    if (!this._presence) {
      throwMissingPluginError("RealtimePresence");
    }
    return this._presence;
  }
  get annotations() {
    if (!this._annotations) {
      throwMissingPluginError("Annotations");
    }
    return this._annotations;
  }
  get push() {
    if (!this._push) {
      throwMissingPluginError("Push");
    }
    return this._push;
  }
  invalidStateError() {
    return new ErrorInfo(
      "Channel operation failed as channel state is " + this.state,
      90001,
      400,
      this.errorReason || void 0
    );
  }
  static processListenerArgs(args) {
    args = Array.prototype.slice.call(args);
    if (typeof args[0] === "function") {
      args.unshift(null);
    }
    return args;
  }
  async setOptions(options) {
    var _a2;
    const previousChannelOptions = this.channelOptions;
    const err = validateChannelOptions(options);
    if (err) {
      throw err;
    }
    this.channelOptions = normaliseChannelOptions((_a2 = this.client._Crypto) != null ? _a2 : null, this.logger, options);
    if (this._decodingContext)
      this._decodingContext.channelOptions = this.channelOptions;
    if (this._shouldReattachToSetOptions(options, previousChannelOptions)) {
      this.attachImpl();
      return new Promise((resolve, reject) => {
        this._allChannelChanges.once(
          ["attached", "update", "detached", "failed"],
          function(stateChange) {
            switch (this.event) {
              case "update":
              case "attached":
                resolve();
                break;
              default:
                reject(stateChange.reason);
            }
          }
        );
      });
    }
  }
  _shouldReattachToSetOptions(options, prevOptions) {
    if (!(this.state === "attached" || this.state === "attaching")) {
      return false;
    }
    if (options == null ? void 0 : options.params) {
      const requestedParams = omitAgent(options.params);
      const existingParams = omitAgent(prevOptions.params);
      if (Object.keys(requestedParams).length !== Object.keys(existingParams).length) {
        return true;
      }
      if (!shallowEquals(existingParams, requestedParams)) {
        return true;
      }
    }
    if (options == null ? void 0 : options.modes) {
      if (!prevOptions.modes || !arrEquals(options.modes, prevOptions.modes)) {
        return true;
      }
    }
    return false;
  }
  async publish(...args) {
    let messages;
    let argCount = args.length;
    if (argCount == 1) {
      if (isObject(args[0])) {
        messages = [message_default.fromValues(args[0])];
      } else if (Array.isArray(args[0])) {
        messages = message_default.fromValuesArray(args[0]);
      } else {
        throw new ErrorInfo(
          "The single-argument form of publish() expects a message object or an array of message objects",
          40013,
          400
        );
      }
    } else {
      messages = [message_default.fromValues({ name: args[0], data: args[1] })];
    }
    const maxMessageSize = this.client.options.maxMessageSize;
    const wireMessages = await encodeArray(messages, this.channelOptions);
    const size = getMessagesSize(wireMessages);
    if (size > maxMessageSize) {
      throw new ErrorInfo(
        "Maximum size of messages that can be published at once exceeded ( was " + size + " bytes; limit is " + maxMessageSize + " bytes)",
        40009,
        400
      );
    }
    this._throwIfUnpublishableState();
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MICRO,
      "RealtimeChannel.publish()",
      "sending message; channel state is " + this.state + ", message count = " + wireMessages.length
    );
    const pm = fromValues({ action: actions.MESSAGE, channel: this.name, messages: wireMessages });
    return this.sendMessage(pm);
  }
  _throwIfUnpublishableState() {
    if (!this.connectionManager.activeState()) {
      throw this.connectionManager.getError();
    }
    if (this.state === "failed" || this.state === "suspended") {
      throw this.invalidStateError();
    }
  }
  onEvent(messages) {
    logger_default.logAction(this.logger, logger_default.LOG_MICRO, "RealtimeChannel.onEvent()", "received message");
    const subscriptions = this.subscriptions;
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      subscriptions.emit(message.name, message);
    }
  }
  async attach() {
    if (this.state === "attached") {
      return null;
    }
    return new Promise((resolve, reject) => {
      this._attach(false, null, (err, result) => err ? reject(err) : resolve(result));
    });
  }
  _attach(forceReattach, attachReason, callback) {
    if (!callback) {
      callback = (err) => {
        if (err) {
          logger_default.logAction(
            this.logger,
            logger_default.LOG_ERROR,
            "RealtimeChannel._attach()",
            "Channel attach failed: " + err.toString()
          );
        }
      };
    }
    const connectionManager = this.connectionManager;
    if (!connectionManager.activeState()) {
      callback(connectionManager.getError());
      return;
    }
    if (this.state !== "attaching" || forceReattach) {
      this.requestState("attaching", attachReason);
    }
    this.once(function(stateChange) {
      switch (this.event) {
        case "attached":
          callback == null ? void 0 : callback(null, stateChange);
          break;
        case "detached":
        case "suspended":
        case "failed":
          callback == null ? void 0 : callback(
            stateChange.reason || connectionManager.getError() || new ErrorInfo("Unable to attach; reason unknown; state = " + this.event, 9e4, 500)
          );
          break;
        case "detaching":
          callback == null ? void 0 : callback(new ErrorInfo("Attach request superseded by a subsequent detach request", 9e4, 409));
          break;
      }
    });
  }
  attachImpl() {
    logger_default.logAction(this.logger, logger_default.LOG_MICRO, "RealtimeChannel.attachImpl()", "sending ATTACH message");
    const attachMsg = fromValues({
      action: actions.ATTACH,
      channel: this.name,
      params: this.channelOptions.params,
      // RTL4c1: Includes the channel serial to resume from a previous message
      // or attachment.
      channelSerial: this.properties.channelSerial
    });
    if (this.channelOptions.modes) {
      attachMsg.encodeModesToFlags(allToUpperCase(this.channelOptions.modes));
    }
    if (this._attachResume) {
      attachMsg.setFlag("ATTACH_RESUME");
    }
    if (this._lastPayload.decodeFailureRecoveryInProgress) {
      attachMsg.channelSerial = this._lastPayload.protocolMessageChannelSerial;
    }
    this.sendMessage(attachMsg).catch(noop);
  }
  async detach() {
    const connectionManager = this.connectionManager;
    if (!connectionManager.activeState()) {
      throw connectionManager.getError();
    }
    switch (this.state) {
      case "suspended":
        this.notifyState("detached");
        return;
      case "detached":
        return;
      case "failed":
        throw new ErrorInfo("Unable to detach; channel state = failed", 90001, 400);
      default:
        this.requestState("detaching");
      case "detaching":
        return new Promise((resolve, reject) => {
          this.once(function(stateChange) {
            switch (this.event) {
              case "detached":
                resolve();
                break;
              case "attached":
              case "suspended":
              case "failed":
                reject(
                  stateChange.reason || connectionManager.getError() || new ErrorInfo("Unable to detach; reason unknown; state = " + this.event, 9e4, 500)
                );
                break;
              case "attaching":
                reject(new ErrorInfo("Detach request superseded by a subsequent attach request", 9e4, 409));
                break;
            }
          });
        });
    }
  }
  detachImpl() {
    logger_default.logAction(this.logger, logger_default.LOG_MICRO, "RealtimeChannel.detach()", "sending DETACH message");
    const msg = fromValues({ action: actions.DETACH, channel: this.name });
    this.sendMessage(msg).catch(noop);
  }
  async subscribe(...args) {
    const [event, listener] = _RealtimeChannel.processListenerArgs(args);
    if (this.state === "failed") {
      throw ErrorInfo.fromValues(this.invalidStateError());
    }
    if (event && typeof event === "object" && !Array.isArray(event)) {
      this.client._FilteredSubscriptions.subscribeFilter(this, event, listener);
    } else {
      this.subscriptions.on(event, listener);
    }
    if (this.channelOptions.attachOnSubscribe !== false) {
      return this.attach();
    } else {
      return null;
    }
  }
  unsubscribe(...args) {
    var _a2;
    const [event, listener] = _RealtimeChannel.processListenerArgs(args);
    if (typeof event === "object" && !listener || ((_a2 = this.filteredSubscriptions) == null ? void 0 : _a2.has(listener))) {
      this.client._FilteredSubscriptions.getAndDeleteFilteredSubscriptions(this, event, listener).forEach((l) => this.subscriptions.off(l));
      return;
    }
    this.subscriptions.off(event, listener);
  }
  sync() {
    switch (this.state) {
      case "initialized":
      case "detaching":
      case "detached":
        throw new PartialErrorInfo("Unable to sync to channel; not attached", 4e4);
      default:
    }
    const connectionManager = this.connectionManager;
    if (!connectionManager.activeState()) {
      throw connectionManager.getError();
    }
    const syncMessage = fromValues({ action: actions.SYNC, channel: this.name });
    if (this.syncChannelSerial) {
      syncMessage.channelSerial = this.syncChannelSerial;
    }
    connectionManager.send(syncMessage);
  }
  async sendMessage(msg) {
    return new Promise((resolve, reject) => {
      this.connectionManager.send(msg, this.client.options.queueMessages, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  async sendPresence(presence) {
    const msg = fromValues({
      action: actions.PRESENCE,
      channel: this.name,
      presence
    });
    return this.sendMessage(msg);
  }
  // Access to this method is synchronised by ConnectionManager#processChannelMessage, in order to synchronise access to the state stored in _decodingContext.
  async processMessage(message) {
    if (message.action === actions.ATTACHED || message.action === actions.MESSAGE || message.action === actions.PRESENCE) {
      this.setChannelSerial(message.channelSerial);
    }
    let syncChannelSerial, isSync = false;
    switch (message.action) {
      case actions.ATTACHED: {
        this.properties.attachSerial = message.channelSerial;
        this._mode = message.getMode();
        this.params = message.params || {};
        const modesFromFlags = message.decodeModesFromFlags();
        this.modes = modesFromFlags && allToLowerCase(modesFromFlags) || void 0;
        const resumed = message.hasFlag("RESUMED");
        const hasPresence = message.hasFlag("HAS_PRESENCE");
        const hasBacklog = message.hasFlag("HAS_BACKLOG");
        if (this.state === "attached") {
          if (!resumed) {
            if (this._presence) {
              this._presence.onAttached(hasPresence);
            }
          }
          const change = new channelstatechange_default(this.state, this.state, resumed, hasBacklog, message.error);
          this._allChannelChanges.emit("update", change);
          if (!resumed || this.channelOptions.updateOnAttached) {
            this.emit("update", change);
          }
        } else if (this.state === "detaching") {
          this.checkPendingState();
        } else {
          this.notifyState("attached", message.error, resumed, hasPresence, hasBacklog);
        }
        break;
      }
      case actions.DETACHED: {
        const detachErr = message.error ? ErrorInfo.fromValues(message.error) : new ErrorInfo("Channel detached", 90001, 404);
        if (this.state === "detaching") {
          this.notifyState("detached", detachErr);
        } else if (this.state === "attaching") {
          this.notifyState("suspended", detachErr);
        } else if (this.state === "attached" || this.state === "suspended") {
          this.requestState("attaching", detachErr);
        }
        break;
      }
      case actions.SYNC:
        isSync = true;
        syncChannelSerial = this.syncChannelSerial = message.channelSerial;
        if (!message.presence)
          break;
      case actions.PRESENCE: {
        if (!message.presence) {
          break;
        }
        populateFieldsFromParent(message);
        const options = this.channelOptions;
        if (this._presence) {
          const presenceMessages = await Promise.all(
            message.presence.map((wpm) => {
              return wpm.decode(options, this.logger);
            })
          );
          this._presence.setPresence(presenceMessages, isSync, syncChannelSerial);
        }
        break;
      }
      case actions.MESSAGE: {
        if (this.state !== "attached") {
          logger_default.logAction(
            this.logger,
            logger_default.LOG_MAJOR,
            "RealtimeChannel.processMessage()",
            'Message "' + message.id + '" skipped as this channel "' + this.name + '" state is not "attached" (state is "' + this.state + '").'
          );
          return;
        }
        populateFieldsFromParent(message);
        const encoded = message.messages, firstMessage = encoded[0], lastMessage = encoded[encoded.length - 1];
        if (firstMessage.extras && firstMessage.extras.delta && firstMessage.extras.delta.from !== this._lastPayload.messageId) {
          const msg = 'Delta message decode failure - previous message not available for message "' + message.id + '" on this channel "' + this.name + '".';
          logger_default.logAction(this.logger, logger_default.LOG_ERROR, "RealtimeChannel.processMessage()", msg);
          this._startDecodeFailureRecovery(new ErrorInfo(msg, 40018, 400));
          break;
        }
        let messages = [];
        for (let i = 0; i < encoded.length; i++) {
          const { decoded, err } = await encoded[i].decodeWithErr(this._decodingContext, this.logger);
          messages[i] = decoded;
          if (err) {
            switch (err.code) {
              case 40018:
                this._startDecodeFailureRecovery(err);
                return;
              case 40019:
              case 40021:
                this.notifyState("failed", err);
                return;
              default:
            }
          }
        }
        this._lastPayload.messageId = lastMessage.id;
        this._lastPayload.protocolMessageChannelSerial = message.channelSerial;
        this.onEvent(messages);
        break;
      }
      case actions.ANNOTATION: {
        populateFieldsFromParent(message);
        const options = this.channelOptions;
        if (this._annotations) {
          const annotations = await Promise.all(
            (message.annotations || []).map((wpm) => {
              return wpm.decode(options, this.logger);
            })
          );
          this._annotations._processIncoming(annotations);
        }
        break;
      }
      case actions.ERROR: {
        const err = message.error;
        if (err && err.code == 80016) {
          this.checkPendingState();
        } else {
          this.notifyState("failed", ErrorInfo.fromValues(err));
        }
        break;
      }
      default:
        logger_default.logAction(
          this.logger,
          logger_default.LOG_MAJOR,
          "RealtimeChannel.processMessage()",
          "Protocol error: unrecognised message action (" + message.action + ")"
        );
    }
  }
  _startDecodeFailureRecovery(reason) {
    if (!this._lastPayload.decodeFailureRecoveryInProgress) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MAJOR,
        "RealtimeChannel.processMessage()",
        "Starting decode failure recovery process."
      );
      this._lastPayload.decodeFailureRecoveryInProgress = true;
      this._attach(true, reason, () => {
        this._lastPayload.decodeFailureRecoveryInProgress = false;
      });
    }
  }
  onAttached() {
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MINOR,
      "RealtimeChannel.onAttached",
      "activating channel; name = " + this.name
    );
  }
  notifyState(state, reason, resumed, hasPresence, hasBacklog) {
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MICRO,
      "RealtimeChannel.notifyState",
      "name = " + this.name + ", current state = " + this.state + ", notifying state " + state
    );
    this.clearStateTimer();
    if (["detached", "suspended", "failed"].includes(state)) {
      this.properties.channelSerial = null;
    }
    if (state === this.state) {
      return;
    }
    if (this._presence) {
      this._presence.actOnChannelState(state, hasPresence, reason);
    }
    if (state === "suspended" && this.connectionManager.state.sendEvents) {
      this.startRetryTimer();
    } else {
      this.cancelRetryTimer();
    }
    if (reason) {
      this.errorReason = reason;
    }
    const change = new channelstatechange_default(this.state, state, resumed, hasBacklog, reason);
    const action = 'Channel state for channel "' + this.name + '"';
    const message = state + (reason ? "; reason: " + reason : "");
    if (state === "failed") {
      logger_default.logAction(this.logger, logger_default.LOG_ERROR, action, message);
    } else {
      logger_default.logAction(this.logger, logger_default.LOG_MAJOR, action, message);
    }
    if (state !== "attaching" && state !== "suspended") {
      this.retryCount = 0;
    }
    if (state === "attached") {
      this.onAttached();
    }
    if (state === "attached") {
      this._attachResume = true;
    } else if (state === "detaching" || state === "failed") {
      this._attachResume = false;
    }
    this.state = state;
    this._allChannelChanges.emit(state, change);
    this.emit(state, change);
  }
  requestState(state, reason) {
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MINOR,
      "RealtimeChannel.requestState",
      "name = " + this.name + ", state = " + state
    );
    this.notifyState(state, reason);
    this.checkPendingState();
  }
  checkPendingState() {
    const cmState = this.connectionManager.state;
    if (!cmState.sendEvents) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MINOR,
        "RealtimeChannel.checkPendingState",
        "sendEvents is false; state is " + this.connectionManager.state.state
      );
      return;
    }
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MINOR,
      "RealtimeChannel.checkPendingState",
      "name = " + this.name + ", state = " + this.state
    );
    switch (this.state) {
      case "attaching":
        this.startStateTimerIfNotRunning();
        this.attachImpl();
        break;
      case "detaching":
        this.startStateTimerIfNotRunning();
        this.detachImpl();
        break;
      case "attached":
        this.sync();
        break;
      default:
        break;
    }
  }
  timeoutPendingState() {
    switch (this.state) {
      case "attaching": {
        const err = new ErrorInfo("Channel attach timed out", 90007, 408);
        this.notifyState("suspended", err);
        break;
      }
      case "detaching": {
        const err = new ErrorInfo("Channel detach timed out", 90007, 408);
        this.notifyState("attached", err);
        break;
      }
      default:
        this.checkPendingState();
        break;
    }
  }
  startStateTimerIfNotRunning() {
    if (!this.stateTimer) {
      this.stateTimer = setTimeout(() => {
        logger_default.logAction(this.logger, logger_default.LOG_MINOR, "RealtimeChannel.startStateTimerIfNotRunning", "timer expired");
        this.stateTimer = null;
        this.timeoutPendingState();
      }, this.client.options.timeouts.realtimeRequestTimeout);
    }
  }
  clearStateTimer() {
    const stateTimer = this.stateTimer;
    if (stateTimer) {
      clearTimeout(stateTimer);
      this.stateTimer = null;
    }
  }
  startRetryTimer() {
    if (this.retryTimer)
      return;
    this.retryCount++;
    const retryDelay = getRetryTime(this.client.options.timeouts.channelRetryTimeout, this.retryCount);
    this.retryTimer = setTimeout(() => {
      if (this.state === "suspended" && this.connectionManager.state.sendEvents) {
        this.retryTimer = null;
        logger_default.logAction(
          this.logger,
          logger_default.LOG_MINOR,
          "RealtimeChannel retry timer expired",
          "attempting a new attach"
        );
        this.requestState("attaching");
      }
    }, retryDelay);
  }
  cancelRetryTimer() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }
  /* @returns null (if can safely be released) | ErrorInfo (if cannot) */
  getReleaseErr() {
    const s = this.state;
    if (s === "initialized" || s === "detached" || s === "failed") {
      return null;
    }
    return new ErrorInfo(
      "Can only release a channel in a state where there is no possibility of further updates from the server being received (initialized, detached, or failed); was " + s,
      90001,
      400
    );
  }
  setChannelSerial(channelSerial) {
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MICRO,
      "RealtimeChannel.setChannelSerial()",
      "Updating channel serial; serial = " + channelSerial + "; previous = " + this.properties.channelSerial
    );
    if (channelSerial) {
      this.properties.channelSerial = channelSerial;
    }
  }
  async status() {
    return this.client.rest.channelMixin.status(this);
  }
};
function omitAgent(channelParams) {
  const _a2 = channelParams || {}, { agent: _ } = _a2, paramsWithoutAgent = __objRest(_a2, ["agent"]);
  return paramsWithoutAgent;
}
var realtimechannel_default = RealtimeChannel;

// src/common/lib/client/realtimeannotations.ts
var RealtimeAnnotations = class {
  constructor(channel) {
    this.channel = channel;
    this.logger = channel.logger;
    this.subscriptions = new eventemitter_default(this.logger);
  }
  async publish(msgOrSerial, annotationValues) {
    const channelName = this.channel.name;
    const annotation = constructValidateAnnotation(msgOrSerial, annotationValues);
    const wireAnnotation = await annotation.encode();
    this.channel._throwIfUnpublishableState();
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MICRO,
      "RealtimeAnnotations.publish()",
      "channelName = " + channelName + ", sending annotation with messageSerial = " + annotation.messageSerial + ", type = " + annotation.type
    );
    const pm = fromValues({
      action: actions.ANNOTATION,
      channel: channelName,
      annotations: [wireAnnotation]
    });
    return this.channel.sendMessage(pm);
  }
  async subscribe(..._args) {
    const args = realtimechannel_default.processListenerArgs(_args);
    const event = args[0];
    const listener = args[1];
    const channel = this.channel;
    if (channel.state === "failed") {
      throw ErrorInfo.fromValues(channel.invalidStateError());
    }
    await channel.attach();
    if ((this.channel._mode & flags.ANNOTATION_SUBSCRIBE) === 0) {
      throw new ErrorInfo(
        "You're trying to add an annotation listener, but you haven't requested the annotation_subscribe channel mode in ChannelOptions, so this won't do anything (we only deliver annotations to clients who have explicitly requested them)",
        93001,
        400
      );
    }
    this.subscriptions.on(event, listener);
  }
  unsubscribe(..._args) {
    const args = realtimechannel_default.processListenerArgs(_args);
    const event = args[0];
    const listener = args[1];
    this.subscriptions.off(event, listener);
  }
  _processIncoming(annotations) {
    for (const annotation of annotations) {
      this.subscriptions.emit(annotation.type || "", annotation);
    }
  }
  async get(serial, params) {
    return restannotations_default.prototype.get.call(this, serial, params);
  }
};
var realtimeannotations_default = RealtimeAnnotations;

// src/common/lib/client/defaultrest.ts
var _DefaultRest = class _DefaultRest extends BaseRest {
  // The public typings declare that this requires an argument to be passed, but since we want to emit a good error message in the case where a non-TypeScript user does not pass an argument, tell the compiler that this is possible so that it forces us to handle it.
  constructor(options) {
    var _a2, _b;
    const MsgPack = _DefaultRest._MsgPack;
    if (!MsgPack) {
      throw new Error("Expected DefaultRest._MsgPack to have been set");
    }
    super(
      defaults_default.objectifyOptions(options, true, "Rest", logger_default.defaultLogger, __spreadProps(__spreadValues({}, allCommonModularPlugins), {
        Crypto: (_a2 = _DefaultRest.Crypto) != null ? _a2 : void 0,
        MsgPack: (_b = _DefaultRest._MsgPack) != null ? _b : void 0,
        Annotations: {
          Annotation: annotation_default,
          WireAnnotation,
          RealtimeAnnotations: realtimeannotations_default,
          RestAnnotations: restannotations_default
        }
      }))
    );
  }
  static get Crypto() {
    if (this._Crypto === null) {
      throw new Error("Encryption not enabled; use ably.encryption.js instead");
    }
    return this._Crypto;
  }
  static set Crypto(newValue) {
    this._Crypto = newValue;
  }
};
_DefaultRest._Crypto = null;
_DefaultRest.Message = DefaultMessage;
_DefaultRest.PresenceMessage = DefaultPresenceMessage;
_DefaultRest.Annotation = DefaultAnnotation;
_DefaultRest._MsgPack = null;
// Used by tests
_DefaultRest._Http = Http;
var DefaultRest = _DefaultRest;

// src/common/lib/transport/messagequeue.ts
var MessageQueue = class extends eventemitter_default {
  constructor(logger) {
    super(logger);
    this.messages = [];
  }
  count() {
    return this.messages.length;
  }
  push(message) {
    this.messages.push(message);
  }
  shift() {
    return this.messages.shift();
  }
  last() {
    return this.messages[this.messages.length - 1];
  }
  copyAll() {
    return this.messages.slice();
  }
  append(messages) {
    this.messages.push.apply(this.messages, messages);
  }
  prepend(messages) {
    this.messages.unshift.apply(this.messages, messages);
  }
  completeMessages(serial, count, err) {
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MICRO,
      "MessageQueue.completeMessages()",
      "serial = " + serial + "; count = " + count
    );
    err = err || null;
    const messages = this.messages;
    if (messages.length === 0) {
      throw new Error("MessageQueue.completeMessages(): completeMessages called on any empty MessageQueue");
    }
    const first = messages[0];
    if (first) {
      const startSerial = first.message.msgSerial;
      const endSerial = serial + count;
      if (endSerial > startSerial) {
        const completeMessages = messages.splice(0, endSerial - startSerial);
        for (const message of completeMessages) {
          message.callback(err);
        }
      }
      if (messages.length == 0)
        this.emit("idle");
    }
  }
  completeAllMessages(err) {
    this.completeMessages(0, Number.MAX_SAFE_INTEGER || Number.MAX_VALUE, err);
  }
  resetSendAttempted() {
    for (let msg of this.messages) {
      msg.sendAttempted = false;
    }
  }
  clear() {
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MICRO,
      "MessageQueue.clear()",
      "clearing " + this.messages.length + " messages"
    );
    this.messages = [];
    this.emit("idle");
  }
};
var messagequeue_default = MessageQueue;

// src/common/lib/transport/protocol.ts
var PendingMessage = class {
  constructor(message, callback) {
    this.message = message;
    this.callback = callback;
    this.merged = false;
    const action = message.action;
    this.sendAttempted = false;
    this.ackRequired = action == actions.MESSAGE || action == actions.PRESENCE || action == actions.ANNOTATION;
  }
};
var Protocol = class extends eventemitter_default {
  constructor(transport) {
    super(transport.logger);
    this.transport = transport;
    this.messageQueue = new messagequeue_default(this.logger);
    transport.on("ack", (serial, count) => {
      this.onAck(serial, count);
    });
    transport.on("nack", (serial, count, err) => {
      this.onNack(serial, count, err);
    });
  }
  onAck(serial, count) {
    logger_default.logAction(this.logger, logger_default.LOG_MICRO, "Protocol.onAck()", "serial = " + serial + "; count = " + count);
    this.messageQueue.completeMessages(serial, count);
  }
  onNack(serial, count, err) {
    logger_default.logAction(
      this.logger,
      logger_default.LOG_ERROR,
      "Protocol.onNack()",
      "serial = " + serial + "; count = " + count + "; err = " + inspectError(err)
    );
    if (!err) {
      err = new ErrorInfo("Unable to send message; channel not responding", 50001, 500);
    }
    this.messageQueue.completeMessages(serial, count, err);
  }
  onceIdle(listener) {
    const messageQueue = this.messageQueue;
    if (messageQueue.count() === 0) {
      listener();
      return;
    }
    messageQueue.once("idle", listener);
  }
  send(pendingMessage) {
    if (pendingMessage.ackRequired) {
      this.messageQueue.push(pendingMessage);
    }
    if (this.logger.shouldLog(logger_default.LOG_MICRO)) {
      logger_default.logActionNoStrip(
        this.logger,
        logger_default.LOG_MICRO,
        "Protocol.send()",
        "sending msg; " + stringify(
          pendingMessage.message,
          this.transport.connectionManager.realtime._RealtimePresence,
          this.transport.connectionManager.realtime._Annotations
        )
      );
    }
    pendingMessage.sendAttempted = true;
    this.transport.send(pendingMessage.message);
  }
  getTransport() {
    return this.transport;
  }
  getPendingMessages() {
    return this.messageQueue.copyAll();
  }
  clearPendingMessages() {
    return this.messageQueue.clear();
  }
  finish() {
    const transport = this.transport;
    this.onceIdle(function() {
      transport.disconnect();
    });
  }
};
var protocol_default = Protocol;

// src/common/lib/client/connectionstatechange.ts
var ConnectionStateChange = class {
  constructor(previous, current, retryIn, reason) {
    this.previous = previous;
    this.current = current;
    if (retryIn)
      this.retryIn = retryIn;
    if (reason)
      this.reason = reason;
  }
};
var connectionstatechange_default = ConnectionStateChange;

// src/common/lib/transport/connectionerrors.ts
var ConnectionErrorCodes = {
  DISCONNECTED: 80003,
  SUSPENDED: 80002,
  FAILED: 8e4,
  CLOSING: 80017,
  CLOSED: 80017,
  UNKNOWN_CONNECTION_ERR: 50002,
  UNKNOWN_CHANNEL_ERR: 50001
};
var ConnectionErrors = {
  disconnected: () => ErrorInfo.fromValues({
    statusCode: 400,
    code: ConnectionErrorCodes.DISCONNECTED,
    message: "Connection to server temporarily unavailable"
  }),
  suspended: () => ErrorInfo.fromValues({
    statusCode: 400,
    code: ConnectionErrorCodes.SUSPENDED,
    message: "Connection to server unavailable"
  }),
  failed: () => ErrorInfo.fromValues({
    statusCode: 400,
    code: ConnectionErrorCodes.FAILED,
    message: "Connection failed or disconnected by server"
  }),
  closing: () => ErrorInfo.fromValues({
    statusCode: 400,
    code: ConnectionErrorCodes.CLOSING,
    message: "Connection closing"
  }),
  closed: () => ErrorInfo.fromValues({
    statusCode: 400,
    code: ConnectionErrorCodes.CLOSED,
    message: "Connection closed"
  }),
  unknownConnectionErr: () => ErrorInfo.fromValues({
    statusCode: 500,
    code: ConnectionErrorCodes.UNKNOWN_CONNECTION_ERR,
    message: "Internal connection error"
  }),
  unknownChannelErr: () => ErrorInfo.fromValues({
    statusCode: 500,
    code: ConnectionErrorCodes.UNKNOWN_CONNECTION_ERR,
    message: "Internal channel error"
  })
};
function isRetriable(err) {
  if (!err.statusCode || !err.code || err.statusCode >= 500) {
    return true;
  }
  return Object.values(ConnectionErrorCodes).includes(err.code);
}
var connectionerrors_default = ConnectionErrors;

// src/common/lib/transport/transport.ts
var closeMessage = fromValues({ action: actions.CLOSE });
var disconnectMessage = fromValues({ action: actions.DISCONNECT });
var Transport = class extends eventemitter_default {
  constructor(connectionManager, auth, params, forceJsonProtocol) {
    super(connectionManager.logger);
    if (forceJsonProtocol) {
      params.format = void 0;
      params.heartbeats = true;
    }
    this.connectionManager = connectionManager;
    this.auth = auth;
    this.params = params;
    this.timeouts = params.options.timeouts;
    this.format = params.format;
    this.isConnected = false;
    this.isFinished = false;
    this.isDisposed = false;
    this.maxIdleInterval = null;
    this.idleTimer = null;
    this.lastActivity = null;
  }
  connect() {
  }
  close() {
    if (this.isConnected) {
      this.requestClose();
    }
    this.finish("closed", connectionerrors_default.closed());
  }
  disconnect(err) {
    if (this.isConnected) {
      this.requestDisconnect();
    }
    this.finish("disconnected", err || connectionerrors_default.disconnected());
  }
  fail(err) {
    if (this.isConnected) {
      this.requestDisconnect();
    }
    this.finish("failed", err || connectionerrors_default.failed());
  }
  finish(event, err) {
    var _a2;
    if (this.isFinished) {
      return;
    }
    this.isFinished = true;
    this.isConnected = false;
    this.maxIdleInterval = null;
    clearTimeout((_a2 = this.idleTimer) != null ? _a2 : void 0);
    this.idleTimer = null;
    this.emit(event, err);
    this.dispose();
  }
  onProtocolMessage(message) {
    if (this.logger.shouldLog(logger_default.LOG_MICRO)) {
      logger_default.logActionNoStrip(
        this.logger,
        logger_default.LOG_MICRO,
        "Transport.onProtocolMessage()",
        "received on " + this.shortName + ": " + stringify(
          message,
          this.connectionManager.realtime._RealtimePresence,
          this.connectionManager.realtime._Annotations
        ) + "; connectionId = " + this.connectionManager.connectionId
      );
    }
    this.onActivity();
    switch (message.action) {
      case actions.HEARTBEAT:
        logger_default.logActionNoStrip(
          this.logger,
          logger_default.LOG_MICRO,
          "Transport.onProtocolMessage()",
          this.shortName + " heartbeat; connectionId = " + this.connectionManager.connectionId
        );
        this.emit("heartbeat", message.id);
        break;
      case actions.CONNECTED:
        this.onConnect(message);
        this.emit("connected", message.error, message.connectionId, message.connectionDetails, message);
        break;
      case actions.CLOSED:
        this.onClose(message);
        break;
      case actions.DISCONNECTED:
        this.onDisconnect(message);
        break;
      case actions.ACK:
        this.emit("ack", message.msgSerial, message.count);
        break;
      case actions.NACK:
        this.emit("nack", message.msgSerial, message.count, message.error);
        break;
      case actions.SYNC:
        this.connectionManager.onChannelMessage(message, this);
        break;
      case actions.ACTIVATE:
        break;
      case actions.AUTH:
        whenPromiseSettles(this.auth.authorize(), (err) => {
          if (err) {
            logger_default.logAction(
              this.logger,
              logger_default.LOG_ERROR,
              "Transport.onProtocolMessage()",
              "Ably requested re-authentication, but unable to obtain a new token: " + inspectError(err)
            );
          }
        });
        break;
      case actions.ERROR:
        logger_default.logAction(
          this.logger,
          logger_default.LOG_MINOR,
          "Transport.onProtocolMessage()",
          "received error action; connectionId = " + this.connectionManager.connectionId + "; err = " + Platform.Config.inspect(message.error) + (message.channel ? ", channel: " + message.channel : "")
        );
        if (message.channel === void 0) {
          this.onFatalError(message);
          break;
        }
        this.connectionManager.onChannelMessage(message, this);
        break;
      default:
        this.connectionManager.onChannelMessage(message, this);
    }
  }
  onConnect(message) {
    this.isConnected = true;
    if (!message.connectionDetails) {
      throw new Error("Transport.onConnect(): Connect message recieved without connectionDetails");
    }
    const maxPromisedIdle = message.connectionDetails.maxIdleInterval;
    if (maxPromisedIdle) {
      this.maxIdleInterval = maxPromisedIdle + this.timeouts.realtimeRequestTimeout;
      this.onActivity();
    }
  }
  onDisconnect(message) {
    const err = message && message.error;
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "Transport.onDisconnect()", "err = " + inspectError(err));
    this.finish("disconnected", err);
  }
  onFatalError(message) {
    const err = message && message.error;
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "Transport.onFatalError()", "err = " + inspectError(err));
    this.finish("failed", err);
  }
  onClose(message) {
    const err = message && message.error;
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "Transport.onClose()", "err = " + inspectError(err));
    this.finish("closed", err);
  }
  requestClose() {
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "Transport.requestClose()", "");
    this.send(closeMessage);
  }
  requestDisconnect() {
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "Transport.requestDisconnect()", "");
    this.send(disconnectMessage);
  }
  ping(id) {
    const msg = { action: actions.HEARTBEAT };
    if (id)
      msg.id = id;
    this.send(fromValues(msg));
  }
  dispose() {
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "Transport.dispose()", "");
    this.isDisposed = true;
    this.off();
  }
  onActivity() {
    if (!this.maxIdleInterval) {
      return;
    }
    this.lastActivity = this.connectionManager.lastActivity = Date.now();
    this.setIdleTimer(this.maxIdleInterval + 100);
  }
  setIdleTimer(timeout) {
    if (!this.idleTimer) {
      this.idleTimer = setTimeout(() => {
        this.onIdleTimerExpire();
      }, timeout);
    }
  }
  onIdleTimerExpire() {
    if (!this.lastActivity || !this.maxIdleInterval) {
      throw new Error("Transport.onIdleTimerExpire(): lastActivity/maxIdleInterval not set");
    }
    this.idleTimer = null;
    const sinceLast = Date.now() - this.lastActivity;
    const timeRemaining = this.maxIdleInterval - sinceLast;
    if (timeRemaining <= 0) {
      const msg = "No activity seen from realtime in " + sinceLast + "ms; assuming connection has dropped";
      logger_default.logAction(this.logger, logger_default.LOG_ERROR, "Transport.onIdleTimerExpire()", msg);
      this.disconnect(new ErrorInfo(msg, 80003, 408));
    } else {
      this.setIdleTimer(timeRemaining + 100);
    }
  }
  static tryConnect(transportCtor, connectionManager, auth, transportParams, callback) {
    const transport = new transportCtor(connectionManager, auth, transportParams);
    let transportAttemptTimer;
    const errorCb = function(err) {
      clearTimeout(transportAttemptTimer);
      callback({ event: this.event, error: err });
    };
    const realtimeRequestTimeout = connectionManager.options.timeouts.realtimeRequestTimeout;
    transportAttemptTimer = setTimeout(() => {
      transport.off(["preconnect", "disconnected", "failed"]);
      transport.dispose();
      errorCb.call(
        { event: "disconnected" },
        new ErrorInfo("Timeout waiting for transport to indicate itself viable", 5e4, 500)
      );
    }, realtimeRequestTimeout);
    transport.on(["failed", "disconnected"], errorCb);
    transport.on("preconnect", function() {
      logger_default.logAction(
        connectionManager.logger,
        logger_default.LOG_MINOR,
        "Transport.tryConnect()",
        "viable transport " + transport
      );
      clearTimeout(transportAttemptTimer);
      transport.off(["failed", "disconnected"], errorCb);
      callback(null, transport);
    });
    transport.connect();
    return transport;
  }
  static isAvailable() {
    throw new ErrorInfo("isAvailable not implemented for transport", 5e4, 500);
  }
};
var transport_default = Transport;

// src/common/constants/TransportName.ts
var TransportNames;
((TransportNames2) => {
  TransportNames2.WebSocket = "web_socket";
  TransportNames2.Comet = "comet";
  TransportNames2.XhrPolling = "xhr_polling";
})(TransportNames || (TransportNames = {}));

// src/common/lib/transport/connectionmanager.ts
var globalObject2 = typeof global !== "undefined" ? global : typeof window !== "undefined" ? window : self;
var haveWebStorage = () => {
  var _a2;
  return typeof Platform.WebStorage !== "undefined" && ((_a2 = Platform.WebStorage) == null ? void 0 : _a2.localSupported);
};
var haveSessionStorage = () => {
  var _a2;
  return typeof Platform.WebStorage !== "undefined" && ((_a2 = Platform.WebStorage) == null ? void 0 : _a2.sessionSupported);
};
var noop2 = function() {
};
var transportPreferenceName = "ably-transport-preference";
function bundleWith(dest, src, maxSize) {
  let action;
  if (dest.channel !== src.channel) {
    return false;
  }
  if ((action = dest.action) !== actions.PRESENCE && action !== actions.MESSAGE) {
    return false;
  }
  if (action !== src.action) {
    return false;
  }
  const kind = action === actions.PRESENCE ? "presence" : "messages", proposed = dest[kind].concat(src[kind]), size = getMessagesSize(proposed);
  if (size > maxSize) {
    return false;
  }
  if (!allSame(proposed, "clientId")) {
    return false;
  }
  if (!proposed.every(function(msg) {
    return !msg.id;
  })) {
    return false;
  }
  dest[kind] = proposed;
  return true;
}
function decodeRecoveryKey(recoveryKey) {
  try {
    return JSON.parse(recoveryKey);
  } catch (e) {
    return null;
  }
}
var TransportParams = class {
  constructor(options, host, mode, connectionKey) {
    this.options = options;
    this.host = host;
    this.mode = mode;
    this.connectionKey = connectionKey;
    this.format = options.useBinaryProtocol ? "msgpack" /* msgpack */ : "json" /* json */;
  }
  getConnectParams(authParams) {
    const params = authParams ? copy(authParams) : {};
    const options = this.options;
    switch (this.mode) {
      case "resume":
        params.resume = this.connectionKey;
        break;
      case "recover": {
        const recoveryContext = decodeRecoveryKey(options.recover);
        if (recoveryContext) {
          params.recover = recoveryContext.connectionKey;
        }
        break;
      }
      default:
    }
    if (options.clientId !== void 0) {
      params.clientId = options.clientId;
    }
    if (options.echoMessages === false) {
      params.echo = "false";
    }
    if (this.format !== void 0) {
      params.format = this.format;
    }
    if (this.stream !== void 0) {
      params.stream = this.stream;
    }
    if (this.heartbeats !== void 0) {
      params.heartbeats = this.heartbeats;
    }
    params.v = defaults_default.protocolVersion;
    params.agent = getAgentString(this.options);
    if (options.transportParams !== void 0) {
      mixin(params, options.transportParams);
    }
    return params;
  }
  toString() {
    let result = "[mode=" + this.mode;
    if (this.host) {
      result += ",host=" + this.host;
    }
    if (this.connectionKey) {
      result += ",connectionKey=" + this.connectionKey;
    }
    if (this.format) {
      result += ",format=" + this.format;
    }
    result += "]";
    return result;
  }
};
var ConnectionManager = class _ConnectionManager extends eventemitter_default {
  constructor(realtime, options) {
    super(realtime.logger);
    this.supportedTransports = {};
    this.disconnectedRetryCount = 0;
    this.pendingChannelMessagesState = { isProcessing: false, queue: [] };
    this.realtime = realtime;
    this.initTransports();
    this.options = options;
    const timeouts = options.timeouts;
    const connectingTimeout = timeouts.webSocketConnectTimeout + timeouts.realtimeRequestTimeout;
    this.states = {
      initialized: {
        state: "initialized",
        terminal: false,
        queueEvents: true,
        sendEvents: false,
        failState: "disconnected"
      },
      connecting: {
        state: "connecting",
        terminal: false,
        queueEvents: true,
        sendEvents: false,
        retryDelay: connectingTimeout,
        failState: "disconnected"
      },
      connected: {
        state: "connected",
        terminal: false,
        queueEvents: false,
        sendEvents: true,
        failState: "disconnected"
      },
      disconnected: {
        state: "disconnected",
        terminal: false,
        queueEvents: true,
        sendEvents: false,
        retryDelay: timeouts.disconnectedRetryTimeout,
        failState: "disconnected"
      },
      suspended: {
        state: "suspended",
        terminal: false,
        queueEvents: false,
        sendEvents: false,
        retryDelay: timeouts.suspendedRetryTimeout,
        failState: "suspended"
      },
      closing: {
        state: "closing",
        terminal: false,
        queueEvents: false,
        sendEvents: false,
        retryDelay: timeouts.realtimeRequestTimeout,
        failState: "closed"
      },
      closed: { state: "closed", terminal: true, queueEvents: false, sendEvents: false, failState: "closed" },
      failed: { state: "failed", terminal: true, queueEvents: false, sendEvents: false, failState: "failed" }
    };
    this.state = this.states.initialized;
    this.errorReason = null;
    this.queuedMessages = new messagequeue_default(this.logger);
    this.msgSerial = 0;
    this.connectionDetails = void 0;
    this.connectionId = void 0;
    this.connectionKey = void 0;
    this.connectionStateTtl = timeouts.connectionStateTtl;
    this.maxIdleInterval = null;
    this.transports = intersect(options.transports || defaults_default.defaultTransports, this.supportedTransports);
    this.transportPreference = null;
    if (this.transports.includes(TransportNames.WebSocket)) {
      this.webSocketTransportAvailable = true;
    }
    if (this.transports.includes(TransportNames.XhrPolling)) {
      this.baseTransport = TransportNames.XhrPolling;
    } else if (this.transports.includes(TransportNames.Comet)) {
      this.baseTransport = TransportNames.Comet;
    }
    this.httpHosts = defaults_default.getHosts(options);
    this.wsHosts = defaults_default.getHosts(options, true);
    this.activeProtocol = null;
    this.host = null;
    this.lastAutoReconnectAttempt = null;
    this.lastActivity = null;
    this.forceFallbackHost = false;
    this.connectCounter = 0;
    this.wsCheckResult = null;
    this.webSocketSlowTimer = null;
    this.webSocketGiveUpTimer = null;
    this.abandonedWebSocket = false;
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "Realtime.ConnectionManager()", "started");
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MICRO,
      "Realtime.ConnectionManager()",
      "requested transports = [" + (options.transports || defaults_default.defaultTransports) + "]"
    );
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MICRO,
      "Realtime.ConnectionManager()",
      "available transports = [" + this.transports + "]"
    );
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MICRO,
      "Realtime.ConnectionManager()",
      "http hosts = [" + this.httpHosts + "]"
    );
    if (!this.transports.length) {
      const msg = "no requested transports available";
      logger_default.logAction(this.logger, logger_default.LOG_ERROR, "realtime.ConnectionManager()", msg);
      throw new Error(msg);
    }
    const addEventListener = Platform.Config.addEventListener;
    if (addEventListener) {
      if (haveSessionStorage() && typeof options.recover === "function") {
        addEventListener("beforeunload", this.persistConnection.bind(this));
      }
      if (options.closeOnUnload === true) {
        addEventListener("beforeunload", () => {
          logger_default.logAction(
            this.logger,
            logger_default.LOG_MAJOR,
            "Realtime.ConnectionManager()",
            "beforeunload event has triggered the connection to close as closeOnUnload is true"
          );
          this.requestState({ state: "closing" });
        });
      }
      addEventListener("online", () => {
        var _a2;
        if (this.state == this.states.disconnected || this.state == this.states.suspended) {
          logger_default.logAction(
            this.logger,
            logger_default.LOG_MINOR,
            "ConnectionManager caught browser \u2018online\u2019 event",
            "reattempting connection"
          );
          this.requestState({ state: "connecting" });
        } else if (this.state == this.states.connecting) {
          (_a2 = this.pendingTransport) == null ? void 0 : _a2.off();
          this.disconnectAllTransports();
          this.startConnect();
        }
      });
      addEventListener("offline", () => {
        if (this.state == this.states.connected) {
          logger_default.logAction(
            this.logger,
            logger_default.LOG_MINOR,
            "ConnectionManager caught browser \u2018offline\u2019 event",
            "disconnecting active transport"
          );
          this.disconnectAllTransports();
        }
      });
    }
  }
  /*********************
   * transport management
   *********************/
  // Used by tests
  static supportedTransports(additionalImplementations) {
    const storage = { supportedTransports: {} };
    this.initTransports(additionalImplementations, storage);
    return storage.supportedTransports;
  }
  static initTransports(additionalImplementations, storage) {
    const implementations = __spreadValues(__spreadValues({}, Platform.Transports.bundledImplementations), additionalImplementations);
    [TransportNames.WebSocket, ...Platform.Transports.order].forEach((transportName) => {
      const transport = implementations[transportName];
      if (transport && transport.isAvailable()) {
        storage.supportedTransports[transportName] = transport;
      }
    });
  }
  initTransports() {
    _ConnectionManager.initTransports(this.realtime._additionalTransportImplementations, this);
  }
  createTransportParams(host, mode) {
    return new TransportParams(this.options, host, mode, this.connectionKey);
  }
  getTransportParams(callback) {
    const decideMode = (modeCb) => {
      if (this.connectionKey) {
        modeCb("resume");
        return;
      }
      if (typeof this.options.recover === "string") {
        modeCb("recover");
        return;
      }
      const recoverFn = this.options.recover, lastSessionData = this.getSessionRecoverData(), sessionRecoveryName = this.sessionRecoveryName();
      if (lastSessionData && typeof recoverFn === "function") {
        logger_default.logAction(
          this.logger,
          logger_default.LOG_MINOR,
          "ConnectionManager.getTransportParams()",
          "Calling clientOptions-provided recover function with last session data (recovery scope: " + sessionRecoveryName + ")"
        );
        recoverFn(lastSessionData, (shouldRecover) => {
          if (shouldRecover) {
            this.options.recover = lastSessionData.recoveryKey;
            modeCb("recover");
          } else {
            modeCb("clean");
          }
        });
        return;
      }
      modeCb("clean");
    };
    decideMode((mode) => {
      const transportParams = this.createTransportParams(null, mode);
      if (mode === "recover") {
        logger_default.logAction(
          this.logger,
          logger_default.LOG_MINOR,
          "ConnectionManager.getTransportParams()",
          "Transport recovery mode = recover; recoveryKey = " + this.options.recover
        );
        const recoveryContext = decodeRecoveryKey(this.options.recover);
        if (recoveryContext) {
          this.msgSerial = recoveryContext.msgSerial;
        }
      } else {
        logger_default.logAction(
          this.logger,
          logger_default.LOG_MINOR,
          "ConnectionManager.getTransportParams()",
          "Transport params = " + transportParams.toString()
        );
      }
      callback(transportParams);
    });
  }
  /**
   * Attempt to connect using a given transport
   * @param transportParams
   * @param candidate, the transport to try
   * @param callback
   */
  tryATransport(transportParams, candidate, callback) {
    logger_default.logAction(this.logger, logger_default.LOG_MICRO, "ConnectionManager.tryATransport()", "trying " + candidate);
    this.proposedTransport = transport_default.tryConnect(
      this.supportedTransports[candidate],
      this,
      this.realtime.auth,
      transportParams,
      (wrappedErr, transport) => {
        const state = this.state;
        if (state == this.states.closing || state == this.states.closed || state == this.states.failed) {
          if (transport) {
            logger_default.logAction(
              this.logger,
              logger_default.LOG_MINOR,
              "ConnectionManager.tryATransport()",
              "connection " + state.state + " while we were attempting the transport; closing " + transport
            );
            transport.close();
          }
          callback(true);
          return;
        }
        if (wrappedErr) {
          logger_default.logAction(
            this.logger,
            logger_default.LOG_MINOR,
            "ConnectionManager.tryATransport()",
            "transport " + candidate + " " + wrappedErr.event + ", err: " + wrappedErr.error.toString()
          );
          if (auth_default.isTokenErr(wrappedErr.error) && !(this.errorReason && auth_default.isTokenErr(this.errorReason))) {
            this.errorReason = wrappedErr.error;
            whenPromiseSettles(this.realtime.auth._forceNewToken(null, null), (err) => {
              if (err) {
                this.actOnErrorFromAuthorize(err);
                return;
              }
              this.tryATransport(transportParams, candidate, callback);
            });
          } else if (wrappedErr.event === "failed") {
            this.notifyState({ state: "failed", error: wrappedErr.error });
            callback(true);
          } else if (wrappedErr.event === "disconnected") {
            if (!isRetriable(wrappedErr.error)) {
              this.notifyState({ state: this.states.connecting.failState, error: wrappedErr.error });
              callback(true);
            } else {
              callback(false);
            }
          }
          return;
        }
        logger_default.logAction(
          this.logger,
          logger_default.LOG_MICRO,
          "ConnectionManager.tryATransport()",
          "viable transport " + candidate + "; setting pending"
        );
        this.setTransportPending(transport, transportParams);
        callback(null, transport);
      }
    );
  }
  /**
   * Called when a transport is indicated to be viable, and the ConnectionManager
   * expects to activate this transport as soon as it is connected.
   * @param transport
   * @param transportParams
   */
  setTransportPending(transport, transportParams) {
    const mode = transportParams.mode;
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MINOR,
      "ConnectionManager.setTransportPending()",
      "transport = " + transport + "; mode = " + mode
    );
    this.pendingTransport = transport;
    this.cancelWebSocketSlowTimer();
    this.cancelWebSocketGiveUpTimer();
    transport.once("connected", (error, connectionId, connectionDetails) => {
      this.activateTransport(error, transport, connectionId, connectionDetails);
      if (mode === "recover" && this.options.recover) {
        delete this.options.recover;
        this.unpersistConnection();
      }
    });
    const self2 = this;
    transport.on(["disconnected", "closed", "failed"], function(error) {
      self2.deactivateTransport(transport, this.event, error);
    });
    this.emit("transport.pending", transport);
  }
  /**
   * Called when a transport is connected, and the connectionmanager decides that
   * it will now be the active transport. Returns whether or not it activated
   * the transport (if the connection is closing/closed it will choose not to).
   * @param transport the transport instance
   * @param connectionId the id of the new active connection
   * @param connectionDetails the details of the new active connection
   */
  activateTransport(error, transport, connectionId, connectionDetails) {
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MINOR,
      "ConnectionManager.activateTransport()",
      "transport = " + transport
    );
    if (error) {
      logger_default.logAction(this.logger, logger_default.LOG_ERROR, "ConnectionManager.activateTransport()", "error = " + error);
    }
    if (connectionId) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MICRO,
        "ConnectionManager.activateTransport()",
        "connectionId =  " + connectionId
      );
    }
    if (connectionDetails) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MICRO,
        "ConnectionManager.activateTransport()",
        "connectionDetails =  " + JSON.stringify(connectionDetails)
      );
    }
    this.persistTransportPreference(transport);
    const existingState = this.state, connectedState = this.states.connected.state;
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MINOR,
      "ConnectionManager.activateTransport()",
      "current state = " + existingState.state
    );
    if (existingState.state == this.states.closing.state || existingState.state == this.states.closed.state || existingState.state == this.states.failed.state) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MINOR,
        "ConnectionManager.activateTransport()",
        "Disconnecting transport and abandoning"
      );
      transport.disconnect();
      return false;
    }
    delete this.pendingTransport;
    if (!transport.isConnected) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MINOR,
        "ConnectionManager.activateTransport()",
        "Declining to activate transport " + transport + " since it appears to no longer be connected"
      );
      return false;
    }
    const existingActiveProtocol = this.activeProtocol;
    this.activeProtocol = new protocol_default(transport);
    this.host = transport.params.host;
    const connectionKey = connectionDetails.connectionKey;
    if (connectionKey && this.connectionKey != connectionKey) {
      this.setConnection(connectionId, connectionDetails, !!error);
    }
    this.onConnectionDetailsUpdate(connectionDetails, transport);
    Platform.Config.nextTick(() => {
      transport.on(
        "connected",
        (connectedErr, _connectionId, connectionDetails2) => {
          this.onConnectionDetailsUpdate(connectionDetails2, transport);
          this.emit("update", new connectionstatechange_default(connectedState, connectedState, null, connectedErr));
        }
      );
    });
    if (existingState.state === this.states.connected.state) {
      if (error) {
        this.errorReason = this.realtime.connection.errorReason = error;
        this.emit("update", new connectionstatechange_default(connectedState, connectedState, null, error));
      }
    } else {
      this.notifyState({ state: "connected", error });
      this.errorReason = this.realtime.connection.errorReason = error || null;
    }
    this.emit("transport.active", transport);
    if (existingActiveProtocol) {
      if (existingActiveProtocol.messageQueue.count() > 0) {
        logger_default.logAction(
          this.logger,
          logger_default.LOG_ERROR,
          "ConnectionManager.activateTransport()",
          "Previous active protocol (for transport " + existingActiveProtocol.transport.shortName + ", new one is " + transport.shortName + ") finishing with " + existingActiveProtocol.messageQueue.count() + " messages still pending"
        );
      }
      if (existingActiveProtocol.transport === transport) {
        const msg = "Assumption violated: activating a transport that was also the transport for the previous active protocol; transport = " + transport.shortName + "; stack = " + new Error().stack;
        logger_default.logAction(this.logger, logger_default.LOG_ERROR, "ConnectionManager.activateTransport()", msg);
      } else {
        existingActiveProtocol.finish();
      }
    }
    return true;
  }
  /**
   * Called when a transport is no longer the active transport. This can occur
   * in any transport connection state.
   * @param transport
   */
  deactivateTransport(transport, state, error) {
    const currentProtocol = this.activeProtocol, wasActive = currentProtocol && currentProtocol.getTransport() === transport, wasPending = transport === this.pendingTransport, noTransportsScheduledForActivation = this.noTransportsScheduledForActivation();
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MINOR,
      "ConnectionManager.deactivateTransport()",
      "transport = " + transport
    );
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MINOR,
      "ConnectionManager.deactivateTransport()",
      "state = " + state + (wasActive ? "; was active" : wasPending ? "; was pending" : "") + (noTransportsScheduledForActivation ? "" : "; another transport is scheduled for activation")
    );
    if (error && error.message)
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MICRO,
        "ConnectionManager.deactivateTransport()",
        "reason =  " + error.message
      );
    if (wasActive) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MICRO,
        "ConnectionManager.deactivateTransport()",
        "Getting, clearing, and requeuing " + this.activeProtocol.messageQueue.count() + " pending messages"
      );
      this.queuePendingMessages(currentProtocol.getPendingMessages());
      currentProtocol.clearPendingMessages();
      this.activeProtocol = this.host = null;
    }
    this.emit("transport.inactive", transport);
    if (wasActive && noTransportsScheduledForActivation || wasActive && state === "failed" || state === "closed" || currentProtocol === null && wasPending) {
      if (state === "disconnected" && error && error.statusCode > 500 && this.httpHosts.length > 1) {
        this.unpersistTransportPreference();
        this.forceFallbackHost = true;
        this.notifyState({ state, error, retryImmediately: true });
        return;
      }
      const newConnectionState = state === "failed" && auth_default.isTokenErr(error) ? "disconnected" : state;
      this.notifyState({ state: newConnectionState, error });
      return;
    }
  }
  /* Helper that returns true if there are no transports which are pending,
   * have been connected, and are just waiting for onceNoPending to fire before
   * being activated */
  noTransportsScheduledForActivation() {
    return !this.pendingTransport || !this.pendingTransport.isConnected;
  }
  setConnection(connectionId, connectionDetails, hasConnectionError) {
    const prevConnId = this.connectionId, connIdChanged = prevConnId && prevConnId !== connectionId, recoverFailure = !prevConnId && hasConnectionError;
    if (connIdChanged || recoverFailure) {
      logger_default.logAction(this.logger, logger_default.LOG_MINOR, "ConnectionManager.setConnection()", "Resetting msgSerial");
      this.msgSerial = 0;
      this.queuedMessages.resetSendAttempted();
    }
    if (this.connectionId !== connectionId) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MINOR,
        "ConnectionManager.setConnection()",
        "New connectionId; reattaching any attached channels"
      );
    }
    this.realtime.connection.id = this.connectionId = connectionId;
    this.realtime.connection.key = this.connectionKey = connectionDetails.connectionKey;
  }
  clearConnection() {
    this.realtime.connection.id = this.connectionId = void 0;
    this.realtime.connection.key = this.connectionKey = void 0;
    this.msgSerial = 0;
    this.unpersistConnection();
  }
  createRecoveryKey() {
    if (!this.connectionKey) {
      return null;
    }
    return JSON.stringify({
      connectionKey: this.connectionKey,
      msgSerial: this.msgSerial,
      channelSerials: this.realtime.channels.channelSerials()
    });
  }
  checkConnectionStateFreshness() {
    if (!this.lastActivity || !this.connectionId) {
      return;
    }
    const sinceLast = Date.now() - this.lastActivity;
    if (sinceLast > this.connectionStateTtl + this.maxIdleInterval) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MINOR,
        "ConnectionManager.checkConnectionStateFreshness()",
        "Last known activity from realtime was " + sinceLast + "ms ago; discarding connection state"
      );
      this.clearConnection();
      this.states.connecting.failState = "suspended";
    }
  }
  /**
   * Called when the connectionmanager wants to persist transport
   * state for later recovery. Only applicable in the browser context.
   */
  persistConnection() {
    if (haveSessionStorage()) {
      const recoveryKey = this.createRecoveryKey();
      if (recoveryKey) {
        this.setSessionRecoverData({
          recoveryKey,
          disconnectedAt: Date.now(),
          location: globalObject2.location,
          clientId: this.realtime.auth.clientId
        });
      }
    }
  }
  /**
   * Called when the connectionmanager wants to persist transport
   * state for later recovery. Only applicable in the browser context.
   */
  unpersistConnection() {
    this.clearSessionRecoverData();
  }
  /*********************
   * state management
   *********************/
  getError() {
    if (this.errorReason) {
      const newError = PartialErrorInfo.fromValues(this.errorReason);
      newError.cause = this.errorReason;
      return newError;
    }
    return this.getStateError();
  }
  getStateError() {
    var _a2, _b;
    return (_b = (_a2 = connectionerrors_default)[this.state.state]) == null ? void 0 : _b.call(_a2);
  }
  activeState() {
    return this.state.queueEvents || this.state.sendEvents;
  }
  enactStateChange(stateChange) {
    const action = "Connection state";
    const message = stateChange.current + (stateChange.reason ? "; reason: " + stateChange.reason : "");
    if (stateChange.current === "failed") {
      logger_default.logAction(this.logger, logger_default.LOG_ERROR, action, message);
    } else {
      logger_default.logAction(this.logger, logger_default.LOG_MAJOR, action, message);
    }
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MINOR,
      "ConnectionManager.enactStateChange",
      "setting new state: " + stateChange.current + "; reason = " + (stateChange.reason && stateChange.reason.message)
    );
    const newState = this.state = this.states[stateChange.current];
    if (stateChange.reason) {
      this.errorReason = stateChange.reason;
      this.realtime.connection.errorReason = stateChange.reason;
    }
    if (newState.terminal || newState.state === "suspended") {
      this.clearConnection();
    }
    this.emit("connectionstate", stateChange);
  }
  /****************************************
   * ConnectionManager connection lifecycle
   ****************************************/
  startTransitionTimer(transitionState) {
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MINOR,
      "ConnectionManager.startTransitionTimer()",
      "transitionState: " + transitionState.state
    );
    if (this.transitionTimer) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MINOR,
        "ConnectionManager.startTransitionTimer()",
        "clearing already-running timer"
      );
      clearTimeout(this.transitionTimer);
    }
    this.transitionTimer = setTimeout(() => {
      if (this.transitionTimer) {
        this.transitionTimer = null;
        logger_default.logAction(
          this.logger,
          logger_default.LOG_MINOR,
          "ConnectionManager " + transitionState.state + " timer expired",
          "requesting new state: " + transitionState.failState
        );
        this.notifyState({ state: transitionState.failState });
      }
    }, transitionState.retryDelay);
  }
  cancelTransitionTimer() {
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "ConnectionManager.cancelTransitionTimer()", "");
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
  }
  startSuspendTimer() {
    if (this.suspendTimer)
      return;
    this.suspendTimer = setTimeout(() => {
      if (this.suspendTimer) {
        this.suspendTimer = null;
        logger_default.logAction(
          this.logger,
          logger_default.LOG_MINOR,
          "ConnectionManager suspend timer expired",
          "requesting new state: suspended"
        );
        this.states.connecting.failState = "suspended";
        this.notifyState({ state: "suspended" });
      }
    }, this.connectionStateTtl);
  }
  checkSuspendTimer(state) {
    if (state !== "disconnected" && state !== "suspended" && state !== "connecting")
      this.cancelSuspendTimer();
  }
  cancelSuspendTimer() {
    this.states.connecting.failState = "disconnected";
    if (this.suspendTimer) {
      clearTimeout(this.suspendTimer);
      this.suspendTimer = null;
    }
  }
  startRetryTimer(interval) {
    this.retryTimer = setTimeout(() => {
      logger_default.logAction(this.logger, logger_default.LOG_MINOR, "ConnectionManager retry timer expired", "retrying");
      this.retryTimer = null;
      this.requestState({ state: "connecting" });
    }, interval);
  }
  cancelRetryTimer() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }
  startWebSocketSlowTimer() {
    this.webSocketSlowTimer = setTimeout(() => {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MINOR,
        "ConnectionManager WebSocket slow timer",
        "checking connectivity"
      );
      this.checkWsConnectivity().then(() => {
        logger_default.logAction(
          this.logger,
          logger_default.LOG_MINOR,
          "ConnectionManager WebSocket slow timer",
          "ws connectivity check succeeded"
        );
        this.wsCheckResult = true;
      }).catch(() => {
        logger_default.logAction(
          this.logger,
          logger_default.LOG_MAJOR,
          "ConnectionManager WebSocket slow timer",
          "ws connectivity check failed"
        );
        this.wsCheckResult = false;
      });
      if (this.realtime.http.checkConnectivity) {
        whenPromiseSettles(this.realtime.http.checkConnectivity(), (err, connectivity) => {
          if (err || !connectivity) {
            logger_default.logAction(
              this.logger,
              logger_default.LOG_MAJOR,
              "ConnectionManager WebSocket slow timer",
              "http connectivity check failed"
            );
            this.cancelWebSocketGiveUpTimer();
            this.notifyState({
              state: "disconnected",
              error: new ErrorInfo("Unable to connect (network unreachable)", 80003, 404)
            });
          } else {
            logger_default.logAction(
              this.logger,
              logger_default.LOG_MINOR,
              "ConnectionManager WebSocket slow timer",
              "http connectivity check succeeded"
            );
          }
        });
      }
    }, this.options.timeouts.webSocketSlowTimeout);
  }
  cancelWebSocketSlowTimer() {
    if (this.webSocketSlowTimer) {
      clearTimeout(this.webSocketSlowTimer);
      this.webSocketSlowTimer = null;
    }
  }
  startWebSocketGiveUpTimer(transportParams) {
    this.webSocketGiveUpTimer = setTimeout(() => {
      var _a2, _b;
      if (!this.wsCheckResult) {
        logger_default.logAction(
          this.logger,
          logger_default.LOG_MINOR,
          "ConnectionManager WebSocket give up timer",
          "websocket connection took more than 10s; " + (this.baseTransport ? "trying base transport" : "")
        );
        if (this.baseTransport) {
          this.abandonedWebSocket = true;
          (_a2 = this.proposedTransport) == null ? void 0 : _a2.dispose();
          (_b = this.pendingTransport) == null ? void 0 : _b.dispose();
          this.connectBase(transportParams, ++this.connectCounter);
        } else {
          logger_default.logAction(
            this.logger,
            logger_default.LOG_MAJOR,
            "ConnectionManager WebSocket give up timer",
            "websocket connectivity appears to be unavailable but no other transports to try"
          );
        }
      }
    }, this.options.timeouts.webSocketConnectTimeout);
  }
  cancelWebSocketGiveUpTimer() {
    if (this.webSocketGiveUpTimer) {
      clearTimeout(this.webSocketGiveUpTimer);
      this.webSocketGiveUpTimer = null;
    }
  }
  notifyState(indicated) {
    var _a2, _b;
    const state = indicated.state;
    const retryImmediately = state === "disconnected" && (this.state === this.states.connected || indicated.retryImmediately || this.state === this.states.connecting && indicated.error && auth_default.isTokenErr(indicated.error) && !(this.errorReason && auth_default.isTokenErr(this.errorReason)));
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MINOR,
      "ConnectionManager.notifyState()",
      "new state: " + state + (retryImmediately ? "; will retry connection immediately" : "")
    );
    if (state == this.state.state)
      return;
    this.cancelTransitionTimer();
    this.cancelRetryTimer();
    this.cancelWebSocketSlowTimer();
    this.cancelWebSocketGiveUpTimer();
    this.checkSuspendTimer(indicated.state);
    if (state === "suspended" || state === "connected") {
      this.disconnectedRetryCount = 0;
    }
    if (this.state.terminal)
      return;
    const newState = this.states[indicated.state];
    let retryDelay = newState.retryDelay;
    if (newState.state === "disconnected") {
      this.disconnectedRetryCount++;
      retryDelay = getRetryTime(newState.retryDelay, this.disconnectedRetryCount);
    }
    const change = new connectionstatechange_default(
      this.state.state,
      newState.state,
      retryDelay,
      indicated.error || ((_b = (_a2 = connectionerrors_default)[newState.state]) == null ? void 0 : _b.call(_a2))
    );
    if (retryImmediately) {
      const autoReconnect = () => {
        if (this.state === this.states.disconnected) {
          this.lastAutoReconnectAttempt = Date.now();
          this.requestState({ state: "connecting" });
        }
      };
      const sinceLast = this.lastAutoReconnectAttempt && Date.now() - this.lastAutoReconnectAttempt + 1;
      if (sinceLast && sinceLast < 1e3) {
        logger_default.logAction(
          this.logger,
          logger_default.LOG_MICRO,
          "ConnectionManager.notifyState()",
          "Last reconnect attempt was only " + sinceLast + "ms ago, waiting another " + (1e3 - sinceLast) + "ms before trying again"
        );
        setTimeout(autoReconnect, 1e3 - sinceLast);
      } else {
        Platform.Config.nextTick(autoReconnect);
      }
    } else if (state === "disconnected" || state === "suspended") {
      this.startRetryTimer(retryDelay);
    }
    if (state === "disconnected" && !retryImmediately || state === "suspended" || newState.terminal) {
      Platform.Config.nextTick(() => {
        this.disconnectAllTransports();
      });
    }
    if (state == "connected" && !this.activeProtocol) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_ERROR,
        "ConnectionManager.notifyState()",
        "Broken invariant: attempted to go into connected state, but there is no active protocol"
      );
    }
    this.enactStateChange(change);
    if (this.state.sendEvents) {
      this.sendQueuedMessages();
    } else if (!this.state.queueEvents) {
      this.realtime.channels.propogateConnectionInterruption(state, change.reason);
      this.failQueuedMessages(change.reason);
    }
  }
  requestState(request) {
    var _a2, _b;
    const state = request.state;
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MINOR,
      "ConnectionManager.requestState()",
      "requested state: " + state + "; current state: " + this.state.state
    );
    if (state == this.state.state)
      return;
    this.cancelWebSocketSlowTimer();
    this.cancelWebSocketGiveUpTimer();
    this.cancelTransitionTimer();
    this.cancelRetryTimer();
    this.checkSuspendTimer(state);
    if (state == "connecting" && this.state.state == "connected")
      return;
    if (state == "closing" && this.state.state == "closed")
      return;
    const newState = this.states[state], change = new connectionstatechange_default(
      this.state.state,
      newState.state,
      null,
      request.error || ((_b = (_a2 = connectionerrors_default)[newState.state]) == null ? void 0 : _b.call(_a2))
    );
    this.enactStateChange(change);
    if (state == "connecting") {
      Platform.Config.nextTick(() => {
        this.startConnect();
      });
    }
    if (state == "closing") {
      this.closeImpl();
    }
  }
  startConnect() {
    if (this.state !== this.states.connecting) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MINOR,
        "ConnectionManager.startConnect()",
        "Must be in connecting state to connect, but was " + this.state.state
      );
      return;
    }
    const auth = this.realtime.auth;
    const connectCount = ++this.connectCounter;
    const connect = () => {
      this.checkConnectionStateFreshness();
      this.getTransportParams((transportParams) => {
        if (transportParams.mode === "recover" && transportParams.options.recover) {
          const recoveryContext = decodeRecoveryKey(transportParams.options.recover);
          if (recoveryContext) {
            this.realtime.channels.recoverChannels(recoveryContext.channelSerials);
          }
        }
        if (connectCount !== this.connectCounter) {
          return;
        }
        this.connectImpl(transportParams, connectCount);
      });
    };
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "ConnectionManager.startConnect()", "starting connection");
    this.startSuspendTimer();
    this.startTransitionTimer(this.states.connecting);
    if (auth.method === "basic") {
      connect();
    } else {
      const authCb = (err) => {
        if (connectCount !== this.connectCounter) {
          return;
        }
        if (err) {
          this.actOnErrorFromAuthorize(err);
        } else {
          connect();
        }
      };
      if (this.errorReason && auth_default.isTokenErr(this.errorReason)) {
        whenPromiseSettles(auth._forceNewToken(null, null), authCb);
      } else {
        whenPromiseSettles(auth._ensureValidAuthCredentials(false), authCb);
      }
    }
  }
  /*
   * there are, at most, two transports available with which a connection may
   * be attempted: web_socket and/or a base transport (xhr_polling in browsers,
   * comet in nodejs). web_socket is always preferred, and the base transport is
   * only used in case web_socket connectivity appears to be unavailable.
   *
   * connectImpl begins the transport selection process by checking which transports
   * are available, and if there is a cached preference. It then defers to the
   * transport-specific connect methods: connectWs and connectBase.
   *
   * It is also responsible for invalidating the cache in the case that a base
   * transport preference is stored but web socket connectivity is now available.
   *
   * handling of the case where we need to failover from web_socket to the base
   * transport is implemented in the connectWs method.
   */
  connectImpl(transportParams, connectCount) {
    const state = this.state.state;
    if (state !== this.states.connecting.state) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MINOR,
        "ConnectionManager.connectImpl()",
        "Must be in connecting state to connect, but was " + state
      );
      return;
    }
    const transportPreference = this.getTransportPreference();
    if (transportPreference && transportPreference === this.baseTransport && this.webSocketTransportAvailable) {
      this.checkWsConnectivity().then(() => {
        this.unpersistTransportPreference();
        if (this.state === this.states.connecting) {
          logger_default.logAction(
            this.logger,
            logger_default.LOG_MINOR,
            "ConnectionManager.connectImpl():",
            "web socket connectivity available, cancelling connection attempt with " + this.baseTransport
          );
          this.disconnectAllTransports();
          this.connectWs(transportParams, ++this.connectCounter);
        }
      }).catch(noop2);
    }
    if (transportPreference && transportPreference === this.baseTransport || this.baseTransport && !this.webSocketTransportAvailable) {
      this.connectBase(transportParams, connectCount);
    } else {
      this.connectWs(transportParams, connectCount);
    }
  }
  /*
   * connectWs starts two timers to monitor the success of a web_socket connection attempt:
   * - webSocketSlowTimer: if this timer fires before the connection succeeds,
   *   cm will simultaneously check websocket and http/xhr connectivity. if the http
   *   connectivity check fails, we give up the connection sequence entirely and
   *   transition to disconnected. if the websocket connectivity check fails then
   *   we assume no ws connectivity and failover to base transport. in the case that
   *   the checks succeed, we continue with websocket and wait for it to try fallback hosts
   *   and, if unsuccessful, ultimately transition to disconnected.
   * - webSocketGiveUpTimer: if this timer fires, and the preceding websocket
   *   connectivity check is still pending then we assume that there is an issue
   *   with the transport and fallback to base transport.
   */
  connectWs(transportParams, connectCount) {
    logger_default.logAction(this.logger, logger_default.LOG_MICRO, "ConnectionManager.connectWs()");
    this.wsCheckResult = null;
    this.abandonedWebSocket = false;
    this.startWebSocketSlowTimer();
    this.startWebSocketGiveUpTimer(transportParams);
    this.tryTransportWithFallbacks("web_socket", transportParams, true, connectCount, () => {
      return this.wsCheckResult !== false && !this.abandonedWebSocket;
    });
  }
  connectBase(transportParams, connectCount) {
    logger_default.logAction(this.logger, logger_default.LOG_MICRO, "ConnectionManager.connectBase()");
    if (this.baseTransport) {
      this.tryTransportWithFallbacks(this.baseTransport, transportParams, false, connectCount, () => true);
    } else {
      this.notifyState({
        state: "disconnected",
        error: new ErrorInfo("No transports left to try", 8e4, 404)
      });
    }
  }
  tryTransportWithFallbacks(transportName, transportParams, ws, connectCount, shouldContinue) {
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MICRO,
      "ConnectionManager.tryTransportWithFallbacks()",
      transportName
    );
    const giveUp = (err) => {
      this.notifyState({ state: this.states.connecting.failState, error: err });
    };
    const candidateHosts = ws ? this.wsHosts.slice() : this.httpHosts.slice();
    const hostAttemptCb = (fatal, transport) => {
      if (connectCount !== this.connectCounter) {
        return;
      }
      if (!shouldContinue()) {
        if (transport) {
          transport.dispose();
        }
        return;
      }
      if (!transport && !fatal) {
        tryFallbackHosts();
      }
    };
    const host = candidateHosts.shift();
    if (!host) {
      giveUp(new ErrorInfo("Unable to connect (no available host)", 80003, 404));
      return;
    }
    transportParams.host = host;
    const tryFallbackHosts = () => {
      if (!candidateHosts.length) {
        giveUp(new ErrorInfo("Unable to connect (and no more fallback hosts to try)", 80003, 404));
        return;
      }
      if (!this.realtime.http.checkConnectivity) {
        giveUp(new PartialErrorInfo("Internal error: Http.checkConnectivity not set", null, 500));
        return;
      }
      whenPromiseSettles(
        this.realtime.http.checkConnectivity(),
        (err, connectivity) => {
          if (connectCount !== this.connectCounter) {
            return;
          }
          if (!shouldContinue()) {
            return;
          }
          if (err) {
            giveUp(err);
            return;
          }
          if (!connectivity) {
            giveUp(new ErrorInfo("Unable to connect (network unreachable)", 80003, 404));
            return;
          }
          transportParams.host = arrPopRandomElement(candidateHosts);
          this.tryATransport(transportParams, transportName, hostAttemptCb);
        }
      );
    };
    if (this.forceFallbackHost && candidateHosts.length) {
      this.forceFallbackHost = false;
      tryFallbackHosts();
      return;
    }
    this.tryATransport(transportParams, transportName, hostAttemptCb);
  }
  closeImpl() {
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "ConnectionManager.closeImpl()", "closing connection");
    this.cancelSuspendTimer();
    this.startTransitionTimer(this.states.closing);
    if (this.pendingTransport) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MICRO,
        "ConnectionManager.closeImpl()",
        "Closing pending transport: " + this.pendingTransport
      );
      this.pendingTransport.close();
    }
    if (this.activeProtocol) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MICRO,
        "ConnectionManager.closeImpl()",
        "Closing active transport: " + this.activeProtocol.getTransport()
      );
      this.activeProtocol.getTransport().close();
    }
    this.notifyState({ state: "closed" });
  }
  onAuthUpdated(tokenDetails, callback) {
    var _a2;
    switch (this.state.state) {
      case "connected": {
        logger_default.logAction(
          this.logger,
          logger_default.LOG_MICRO,
          "ConnectionManager.onAuthUpdated()",
          "Sending AUTH message on active transport"
        );
        const activeTransport = (_a2 = this.activeProtocol) == null ? void 0 : _a2.getTransport();
        if (activeTransport && activeTransport.onAuthUpdated) {
          activeTransport.onAuthUpdated(tokenDetails);
        }
        const authMsg = fromValues({
          action: actions.AUTH,
          auth: {
            accessToken: tokenDetails.token
          }
        });
        this.send(authMsg);
        const successListener = () => {
          this.off(failureListener);
          callback(null, tokenDetails);
        };
        const failureListener = (stateChange) => {
          if (stateChange.current === "failed") {
            this.off(successListener);
            this.off(failureListener);
            callback(stateChange.reason || this.getStateError());
          }
        };
        this.once("connectiondetails", successListener);
        this.on("connectionstate", failureListener);
        break;
      }
      case "connecting":
        logger_default.logAction(
          this.logger,
          logger_default.LOG_MICRO,
          "ConnectionManager.onAuthUpdated()",
          "Aborting current connection attempts in order to start again with the new auth details"
        );
        this.disconnectAllTransports();
      default: {
        logger_default.logAction(
          this.logger,
          logger_default.LOG_MICRO,
          "ConnectionManager.onAuthUpdated()",
          "Connection state is " + this.state.state + "; waiting until either connected or failed"
        );
        const listener = (stateChange) => {
          switch (stateChange.current) {
            case "connected":
              this.off(listener);
              callback(null, tokenDetails);
              break;
            case "failed":
            case "closed":
            case "suspended":
              this.off(listener);
              callback(stateChange.reason || this.getStateError());
              break;
            default:
              break;
          }
        };
        this.on("connectionstate", listener);
        if (this.state.state === "connecting") {
          this.startConnect();
        } else {
          this.requestState({ state: "connecting" });
        }
      }
    }
  }
  disconnectAllTransports() {
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MINOR,
      "ConnectionManager.disconnectAllTransports()",
      "Disconnecting all transports"
    );
    this.connectCounter++;
    if (this.pendingTransport) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MICRO,
        "ConnectionManager.disconnectAllTransports()",
        "Disconnecting pending transport: " + this.pendingTransport
      );
      this.pendingTransport.disconnect();
    }
    delete this.pendingTransport;
    if (this.proposedTransport) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MICRO,
        "ConnectionManager.disconnectAllTransports()",
        "Disconnecting proposed transport: " + this.pendingTransport
      );
      this.proposedTransport.disconnect();
    }
    delete this.pendingTransport;
    if (this.activeProtocol) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MICRO,
        "ConnectionManager.disconnectAllTransports()",
        "Disconnecting active transport: " + this.activeProtocol.getTransport()
      );
      this.activeProtocol.getTransport().disconnect();
    }
  }
  /******************
   * event queueing
   ******************/
  send(msg, queueEvent, callback) {
    callback = callback || noop2;
    const state = this.state;
    if (state.sendEvents) {
      logger_default.logAction(this.logger, logger_default.LOG_MICRO, "ConnectionManager.send()", "sending event");
      this.sendImpl(new PendingMessage(msg, callback));
      return;
    }
    const shouldQueue = queueEvent && state.queueEvents;
    if (!shouldQueue) {
      const err = "rejecting event, queueEvent was " + queueEvent + ", state was " + state.state;
      logger_default.logAction(this.logger, logger_default.LOG_MICRO, "ConnectionManager.send()", err);
      callback(this.errorReason || new ErrorInfo(err, 9e4, 400));
      return;
    }
    if (this.logger.shouldLog(logger_default.LOG_MICRO)) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MICRO,
        "ConnectionManager.send()",
        "queueing msg; " + stringify(msg, this.realtime._RealtimePresence, this.realtime._Annotations)
      );
    }
    this.queue(msg, callback);
  }
  sendImpl(pendingMessage) {
    const msg = pendingMessage.message;
    if (pendingMessage.ackRequired && !pendingMessage.sendAttempted) {
      msg.msgSerial = this.msgSerial++;
    }
    try {
      this.activeProtocol.send(pendingMessage);
    } catch (e) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_ERROR,
        "ConnectionManager.sendImpl()",
        "Unexpected exception in transport.send(): " + e.stack
      );
    }
  }
  queue(msg, callback) {
    logger_default.logAction(this.logger, logger_default.LOG_MICRO, "ConnectionManager.queue()", "queueing event");
    const lastQueued = this.queuedMessages.last();
    const maxSize = this.options.maxMessageSize;
    if (lastQueued && !lastQueued.sendAttempted && bundleWith(lastQueued.message, msg, maxSize)) {
      if (!lastQueued.merged) {
        lastQueued.callback = multicaster_default.create(this.logger, [lastQueued.callback]);
        lastQueued.merged = true;
      }
      lastQueued.callback.push(callback);
    } else {
      this.queuedMessages.push(new PendingMessage(msg, callback));
    }
  }
  sendQueuedMessages() {
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MICRO,
      "ConnectionManager.sendQueuedMessages()",
      "sending " + this.queuedMessages.count() + " queued messages"
    );
    let pendingMessage;
    while (pendingMessage = this.queuedMessages.shift())
      this.sendImpl(pendingMessage);
  }
  queuePendingMessages(pendingMessages) {
    if (pendingMessages && pendingMessages.length) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MICRO,
        "ConnectionManager.queuePendingMessages()",
        "queueing " + pendingMessages.length + " pending messages"
      );
      this.queuedMessages.prepend(pendingMessages);
    }
  }
  failQueuedMessages(err) {
    const numQueued = this.queuedMessages.count();
    if (numQueued > 0) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_ERROR,
        "ConnectionManager.failQueuedMessages()",
        "failing " + numQueued + " queued messages, err = " + inspectError(err)
      );
      this.queuedMessages.completeAllMessages(err);
    }
  }
  onChannelMessage(message, transport) {
    this.pendingChannelMessagesState.queue.push({ message, transport });
    if (!this.pendingChannelMessagesState.isProcessing) {
      this.processNextPendingChannelMessage();
    }
  }
  processNextPendingChannelMessage() {
    if (this.pendingChannelMessagesState.queue.length > 0) {
      this.pendingChannelMessagesState.isProcessing = true;
      const pendingChannelMessage = this.pendingChannelMessagesState.queue.shift();
      this.processChannelMessage(pendingChannelMessage.message).catch((err) => {
        logger_default.logAction(
          this.logger,
          logger_default.LOG_ERROR,
          "ConnectionManager.processNextPendingChannelMessage() received error ",
          err
        );
      }).finally(() => {
        this.pendingChannelMessagesState.isProcessing = false;
        this.processNextPendingChannelMessage();
      });
    }
  }
  async processChannelMessage(message) {
    await this.realtime.channels.processChannelMessage(message);
  }
  async ping() {
    var _a2;
    if (this.state.state !== "connected") {
      throw new ErrorInfo("Unable to ping service; not connected", 4e4, 400);
    }
    const transport = (_a2 = this.activeProtocol) == null ? void 0 : _a2.getTransport();
    if (!transport) {
      throw this.getStateError();
    }
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "ConnectionManager.ping()", "transport = " + transport);
    const pingStart = Date.now();
    const id = cheapRandStr();
    return withTimeoutAsync(
      new Promise((resolve) => {
        const onHeartbeat = (responseId) => {
          if (responseId === id) {
            transport.off("heartbeat", onHeartbeat);
            resolve(Date.now() - pingStart);
          }
        };
        transport.on("heartbeat", onHeartbeat);
        transport.ping(id);
      }),
      this.options.timeouts.realtimeRequestTimeout,
      "Timeout waiting for heartbeat response"
    );
  }
  abort(error) {
    this.activeProtocol.getTransport().fail(error);
  }
  getTransportPreference() {
    var _a2, _b;
    return this.transportPreference || haveWebStorage() && ((_b = (_a2 = Platform.WebStorage) == null ? void 0 : _a2.get) == null ? void 0 : _b.call(_a2, transportPreferenceName));
  }
  persistTransportPreference(transport) {
    var _a2, _b;
    this.transportPreference = transport.shortName;
    if (haveWebStorage()) {
      (_b = (_a2 = Platform.WebStorage) == null ? void 0 : _a2.set) == null ? void 0 : _b.call(_a2, transportPreferenceName, transport.shortName);
    }
  }
  unpersistTransportPreference() {
    var _a2, _b;
    this.transportPreference = null;
    if (haveWebStorage()) {
      (_b = (_a2 = Platform.WebStorage) == null ? void 0 : _a2.remove) == null ? void 0 : _b.call(_a2, transportPreferenceName);
    }
  }
  /* This method is only used during connection attempts, so implements RSA4c1, RSA4c2,
   * and RSA4d. It is generally not invoked for serverside-triggered reauths or manual
   * reauths, so RSA4c3 does not apply, except (per per RSA4d1) in the case that the auth
   * server returns 403. */
  actOnErrorFromAuthorize(err) {
    if (err.code === 40171) {
      this.notifyState({ state: "failed", error: err });
    } else if (err.code === 40102) {
      this.notifyState({ state: "failed", error: err });
    } else if (err.statusCode === HttpStatusCodes_default.Forbidden) {
      const msg = "Client configured authentication provider returned 403; failing the connection";
      logger_default.logAction(this.logger, logger_default.LOG_ERROR, "ConnectionManager.actOnErrorFromAuthorize()", msg);
      this.notifyState({ state: "failed", error: new ErrorInfo(msg, 80019, 403, err) });
    } else {
      const msg = "Client configured authentication provider request failed";
      logger_default.logAction(this.logger, logger_default.LOG_MINOR, "ConnectionManager.actOnErrorFromAuthorize", msg);
      this.notifyState({ state: this.state.failState, error: new ErrorInfo(msg, 80019, 401, err) });
    }
  }
  onConnectionDetailsUpdate(connectionDetails, transport) {
    if (!connectionDetails) {
      return;
    }
    this.connectionDetails = connectionDetails;
    if (connectionDetails.maxMessageSize) {
      this.options.maxMessageSize = connectionDetails.maxMessageSize;
    }
    const clientId = connectionDetails.clientId;
    if (clientId) {
      const err = this.realtime.auth._uncheckedSetClientId(clientId);
      if (err) {
        logger_default.logAction(this.logger, logger_default.LOG_ERROR, "ConnectionManager.onConnectionDetailsUpdate()", err.message);
        transport.fail(err);
        return;
      }
    }
    const connectionStateTtl = connectionDetails.connectionStateTtl;
    if (connectionStateTtl) {
      this.connectionStateTtl = connectionStateTtl;
    }
    this.maxIdleInterval = connectionDetails.maxIdleInterval;
    this.emit("connectiondetails", connectionDetails);
  }
  checkWsConnectivity() {
    const wsConnectivityCheckUrl = this.options.wsConnectivityCheckUrl || defaults_default.wsConnectivityCheckUrl;
    const ws = new Platform.Config.WebSocket(wsConnectivityCheckUrl);
    return new Promise((resolve, reject) => {
      let finished = false;
      ws.onopen = () => {
        if (!finished) {
          finished = true;
          resolve();
          ws.close();
        }
      };
      ws.onclose = ws.onerror = () => {
        if (!finished) {
          finished = true;
          reject();
        }
      };
    });
  }
  sessionRecoveryName() {
    return this.options.recoveryKeyStorageName || "ably-connection-recovery";
  }
  getSessionRecoverData() {
    var _a2, _b;
    return haveSessionStorage() && ((_b = (_a2 = Platform.WebStorage) == null ? void 0 : _a2.getSession) == null ? void 0 : _b.call(_a2, this.sessionRecoveryName()));
  }
  setSessionRecoverData(value) {
    var _a2, _b;
    return haveSessionStorage() && ((_b = (_a2 = Platform.WebStorage) == null ? void 0 : _a2.setSession) == null ? void 0 : _b.call(_a2, this.sessionRecoveryName(), value));
  }
  clearSessionRecoverData() {
    var _a2, _b;
    return haveSessionStorage() && ((_b = (_a2 = Platform.WebStorage) == null ? void 0 : _a2.removeSession) == null ? void 0 : _b.call(_a2, this.sessionRecoveryName()));
  }
};
var connectionmanager_default = ConnectionManager;

// src/common/lib/client/connection.ts
var Connection = class extends eventemitter_default {
  constructor(ably, options) {
    super(ably.logger);
    this.whenState = (state) => {
      return eventemitter_default.prototype.whenState.call(this, state, this.state);
    };
    this.ably = ably;
    this.connectionManager = new connectionmanager_default(ably, options);
    this.state = this.connectionManager.state.state;
    this.key = void 0;
    this.id = void 0;
    this.errorReason = null;
    this.connectionManager.on("connectionstate", (stateChange) => {
      const state = this.state = stateChange.current;
      Platform.Config.nextTick(() => {
        this.emit(state, stateChange);
      });
    });
    this.connectionManager.on("update", (stateChange) => {
      Platform.Config.nextTick(() => {
        this.emit("update", stateChange);
      });
    });
  }
  connect() {
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "Connection.connect()", "");
    this.connectionManager.requestState({ state: "connecting" });
  }
  async ping() {
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "Connection.ping()", "");
    return this.connectionManager.ping();
  }
  close() {
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "Connection.close()", "connectionKey = " + this.key);
    this.connectionManager.requestState({ state: "closing" });
  }
  get recoveryKey() {
    this.logger.deprecationWarning(
      "The `Connection.recoveryKey` attribute has been replaced by the `Connection.createRecoveryKey()` method. Replace your usage of `recoveryKey` with the return value of `createRecoveryKey()`. `recoveryKey` will be removed in a future version."
    );
    return this.createRecoveryKey();
  }
  createRecoveryKey() {
    return this.connectionManager.createRecoveryKey();
  }
};
var connection_default = Connection;

// src/common/lib/client/baserealtime.ts
var _BaseRealtime = class _BaseRealtime extends baseclient_default {
  /*
   * The public typings declare that this only accepts an object, but since we want to emit a good error message in the case where a non-TypeScript user does one of these things:
   *
   * 1. passes a string (which is quite likely if they’re e.g. migrating from the default variant to the modular variant)
   * 2. passes no argument at all
   *
   * tell the compiler that these cases are possible so that it forces us to handle them.
   */
  constructor(options) {
    var _a2, _b;
    super(defaults_default.objectifyOptions(options, false, "BaseRealtime", logger_default.defaultLogger));
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "Realtime()", "");
    if (typeof EdgeRuntime === "string") {
      throw new ErrorInfo(
        `Ably.Realtime instance cannot be used in Vercel Edge runtime. If you are running Vercel Edge functions, please replace your "new Ably.Realtime()" with "new Ably.Rest()" and use Ably Rest API instead of the Realtime API. If you are server-rendering your application in the Vercel Edge runtime, please use the condition "if (typeof EdgeRuntime === 'string')" to prevent instantiating Ably.Realtime instance during SSR in the Vercel Edge runtime.`,
        4e4,
        400
      );
    }
    this._additionalTransportImplementations = _BaseRealtime.transportImplementationsFromPlugins(this.options.plugins);
    this._RealtimePresence = (_b = (_a2 = this.options.plugins) == null ? void 0 : _a2.RealtimePresence) != null ? _b : null;
    this.connection = new connection_default(this, this.options);
    this._channels = new Channels2(this);
    if (this.options.autoConnect !== false)
      this.connect();
  }
  static transportImplementationsFromPlugins(plugins) {
    const transports = {};
    if (plugins == null ? void 0 : plugins.WebSocketTransport) {
      transports[TransportNames.WebSocket] = plugins.WebSocketTransport;
    }
    if (plugins == null ? void 0 : plugins.XHRPolling) {
      transports[TransportNames.XhrPolling] = plugins.XHRPolling;
    }
    return transports;
  }
  get channels() {
    return this._channels;
  }
  connect() {
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "Realtime.connect()", "");
    this.connection.connect();
  }
  close() {
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "Realtime.close()", "");
    this.connection.close();
  }
};
// internal API to make EventEmitter usable in other SDKs
_BaseRealtime.EventEmitter = eventemitter_default;
var BaseRealtime = _BaseRealtime;
var Channels2 = class extends eventemitter_default {
  constructor(realtime) {
    super(realtime.logger);
    this.realtime = realtime;
    this.all = /* @__PURE__ */ Object.create(null);
    realtime.connection.connectionManager.on("transport.active", () => {
      this.onTransportActive();
    });
  }
  channelSerials() {
    let serials = {};
    for (const name of keysArray(this.all, true)) {
      const channel = this.all[name];
      if (channel.properties.channelSerial) {
        serials[name] = channel.properties.channelSerial;
      }
    }
    return serials;
  }
  // recoverChannels gets the given channels and sets their channel serials.
  recoverChannels(channelSerials) {
    for (const name of keysArray(channelSerials, true)) {
      const channel = this.get(name);
      channel.properties.channelSerial = channelSerials[name];
    }
  }
  // Access to this method is synchronised by ConnectionManager#processChannelMessage.
  async processChannelMessage(msg) {
    const channelName = msg.channel;
    if (channelName === void 0) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_ERROR,
        "Channels.processChannelMessage()",
        "received event unspecified channel, action = " + msg.action
      );
      return;
    }
    const channel = this.all[channelName];
    if (!channel) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_ERROR,
        "Channels.processChannelMessage()",
        "received event for non-existent channel: " + channelName
      );
      return;
    }
    await channel.processMessage(msg);
  }
  /* called when a transport becomes connected; reattempt attach/detach
   * for channels that are attaching or detaching. */
  onTransportActive() {
    for (const channelName in this.all) {
      const channel = this.all[channelName];
      if (channel.state === "attaching" || channel.state === "detaching") {
        channel.checkPendingState();
      } else if (channel.state === "suspended") {
        channel._attach(false, null);
      } else if (channel.state === "attached") {
        channel.requestState("attaching");
      }
    }
  }
  /* Connection interruptions (ie when the connection will no longer queue
   * events) imply connection state changes for any channel which is either
   * attached, pending, or will attempt to become attached in the future */
  propogateConnectionInterruption(connectionState, reason) {
    const connectionStateToChannelState = {
      closing: "detached",
      closed: "detached",
      failed: "failed",
      suspended: "suspended"
    };
    const fromChannelStates = ["attaching", "attached", "detaching", "suspended"];
    const toChannelState = connectionStateToChannelState[connectionState];
    for (const channelId in this.all) {
      const channel = this.all[channelId];
      if (fromChannelStates.includes(channel.state)) {
        channel.notifyState(toChannelState, reason);
      }
    }
  }
  get(name, channelOptions) {
    name = String(name);
    let channel = this.all[name];
    if (!channel) {
      channel = this.all[name] = new realtimechannel_default(this.realtime, name, channelOptions);
    } else if (channelOptions) {
      if (channel._shouldReattachToSetOptions(channelOptions, channel.channelOptions)) {
        throw new ErrorInfo(
          "Channels.get() cannot be used to set channel options that would cause the channel to reattach. Please, use RealtimeChannel.setOptions() instead.",
          4e4,
          400
        );
      }
      channel.setOptions(channelOptions);
    }
    return channel;
  }
  getDerived(name, deriveOptions, channelOptions) {
    if (deriveOptions.filter) {
      const filter = toBase64(deriveOptions.filter);
      const match = matchDerivedChannel(name);
      name = `[filter=${filter}${match.qualifierParam}]${match.channelName}`;
    }
    return this.get(name, channelOptions);
  }
  /* Included to support certain niche use-cases; most users should ignore this.
   * Please do not use this unless you know what you're doing */
  release(name) {
    name = String(name);
    const channel = this.all[name];
    if (!channel) {
      return;
    }
    const releaseErr = channel.getReleaseErr();
    if (releaseErr) {
      throw releaseErr;
    }
    delete this.all[name];
  }
};
var baserealtime_default = BaseRealtime;

// src/common/lib/client/presencemap.ts
function newerThan(item, existing) {
  if (item.isSynthesized() || existing.isSynthesized()) {
    return item.timestamp >= existing.timestamp;
  }
  const itemOrderings = item.parseId(), existingOrderings = existing.parseId();
  if (itemOrderings.msgSerial === existingOrderings.msgSerial) {
    return itemOrderings.index > existingOrderings.index;
  } else {
    return itemOrderings.msgSerial > existingOrderings.msgSerial;
  }
}
var PresenceMap = class extends eventemitter_default {
  constructor(presence, memberKey, newer = newerThan) {
    super(presence.logger);
    this.presence = presence;
    this.map = /* @__PURE__ */ Object.create(null);
    this.syncInProgress = false;
    this.residualMembers = null;
    this.memberKey = memberKey;
    this.newerThan = newer;
  }
  get(key) {
    return this.map[key];
  }
  getClient(clientId) {
    const map = this.map, result = [];
    for (const key in map) {
      const item = map[key];
      if (item.clientId == clientId && item.action != "absent")
        result.push(item);
    }
    return result;
  }
  list(params) {
    const map = this.map, clientId = params && params.clientId, connectionId = params && params.connectionId, result = [];
    for (const key in map) {
      const item = map[key];
      if (item.action === "absent")
        continue;
      if (clientId && clientId != item.clientId)
        continue;
      if (connectionId && connectionId != item.connectionId)
        continue;
      result.push(item);
    }
    return result;
  }
  put(item) {
    if (item.action === "enter" || item.action === "update") {
      item = presencemessage_default.fromValues(item);
      item.action = "present";
    }
    const map = this.map, key = this.memberKey(item);
    if (this.residualMembers)
      delete this.residualMembers[key];
    const existingItem = map[key];
    if (existingItem && !this.newerThan(item, existingItem)) {
      return false;
    }
    map[key] = item;
    return true;
  }
  values() {
    const map = this.map, result = [];
    for (const key in map) {
      const item = map[key];
      if (item.action != "absent")
        result.push(item);
    }
    return result;
  }
  remove(item) {
    const map = this.map, key = this.memberKey(item);
    const existingItem = map[key];
    if (existingItem && !this.newerThan(item, existingItem)) {
      return false;
    }
    if (this.syncInProgress) {
      item = presencemessage_default.fromValues(item);
      item.action = "absent";
      map[key] = item;
    } else {
      delete map[key];
    }
    return !!existingItem;
  }
  startSync() {
    const map = this.map, syncInProgress = this.syncInProgress;
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MINOR,
      "PresenceMap.startSync()",
      "channel = " + this.presence.channel.name + "; syncInProgress = " + syncInProgress
    );
    if (!this.syncInProgress) {
      this.residualMembers = copy(map);
      this.setInProgress(true);
    }
  }
  endSync() {
    const map = this.map, syncInProgress = this.syncInProgress;
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MINOR,
      "PresenceMap.endSync()",
      "channel = " + this.presence.channel.name + "; syncInProgress = " + syncInProgress
    );
    if (syncInProgress) {
      for (const memberKey in map) {
        const entry = map[memberKey];
        if (entry.action === "absent") {
          delete map[memberKey];
        }
      }
      this.presence._synthesizeLeaves(valuesArray(this.residualMembers));
      for (const memberKey in this.residualMembers) {
        delete map[memberKey];
      }
      this.residualMembers = null;
      this.setInProgress(false);
    }
    this.emit("sync");
  }
  waitSync(callback) {
    const syncInProgress = this.syncInProgress;
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MINOR,
      "PresenceMap.waitSync()",
      "channel = " + this.presence.channel.name + "; syncInProgress = " + syncInProgress
    );
    if (!syncInProgress) {
      callback();
      return;
    }
    this.once("sync", callback);
  }
  clear() {
    this.map = {};
    this.setInProgress(false);
    this.residualMembers = null;
  }
  setInProgress(inProgress) {
    logger_default.logAction(this.logger, logger_default.LOG_MICRO, "PresenceMap.setInProgress()", "inProgress = " + inProgress);
    this.syncInProgress = inProgress;
    this.presence.syncComplete = !inProgress;
  }
};

// src/common/lib/client/realtimepresence.ts
function getClientId(realtimePresence) {
  return realtimePresence.channel.client.auth.clientId;
}
function isAnonymousOrWildcard(realtimePresence) {
  const realtime = realtimePresence.channel.client;
  const clientId = realtime.auth.clientId;
  return (!clientId || clientId === "*") && realtime.connection.state === "connected";
}
function waitAttached(channel, callback, action) {
  switch (channel.state) {
    case "attached":
    case "suspended":
      action();
      break;
    case "initialized":
    case "detached":
    case "detaching":
    case "attaching":
      whenPromiseSettles(channel.attach(), function(err) {
        if (err)
          callback(err);
        else
          action();
      });
      break;
    default:
      callback(ErrorInfo.fromValues(channel.invalidStateError()));
  }
}
var RealtimePresence = class extends eventemitter_default {
  constructor(channel) {
    super(channel.logger);
    this.channel = channel;
    this.syncComplete = false;
    this.members = new PresenceMap(this, (item) => item.clientId + ":" + item.connectionId);
    this._myMembers = new PresenceMap(this, (item) => item.clientId);
    this.subscriptions = new eventemitter_default(this.logger);
    this.pendingPresence = [];
  }
  async enter(data) {
    if (isAnonymousOrWildcard(this)) {
      throw new ErrorInfo("clientId must be specified to enter a presence channel", 40012, 400);
    }
    return this._enterOrUpdateClient(void 0, void 0, data, "enter");
  }
  async update(data) {
    if (isAnonymousOrWildcard(this)) {
      throw new ErrorInfo("clientId must be specified to update presence data", 40012, 400);
    }
    return this._enterOrUpdateClient(void 0, void 0, data, "update");
  }
  async enterClient(clientId, data) {
    return this._enterOrUpdateClient(void 0, clientId, data, "enter");
  }
  async updateClient(clientId, data) {
    return this._enterOrUpdateClient(void 0, clientId, data, "update");
  }
  async _enterOrUpdateClient(id, clientId, data, action) {
    const channel = this.channel;
    if (!channel.connectionManager.activeState()) {
      throw channel.connectionManager.getError();
    }
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MICRO,
      "RealtimePresence." + action + "Client()",
      "channel = " + channel.name + ", id = " + id + ", client = " + (clientId || "(implicit) " + getClientId(this))
    );
    const presence = presencemessage_default.fromData(data);
    presence.action = action;
    if (id) {
      presence.id = id;
    }
    if (clientId) {
      presence.clientId = clientId;
    }
    const wirePresMsg = await presence.encode(channel.channelOptions);
    switch (channel.state) {
      case "attached":
        return channel.sendPresence([wirePresMsg]);
      case "initialized":
      case "detached":
        channel.attach();
      case "attaching":
        return new Promise((resolve, reject) => {
          this.pendingPresence.push({
            presence: wirePresMsg,
            callback: (err) => err ? reject(err) : resolve()
          });
        });
      default: {
        const err = new PartialErrorInfo(
          "Unable to " + action + " presence channel while in " + channel.state + " state",
          90001
        );
        err.code = 90001;
        throw err;
      }
    }
  }
  async leave(data) {
    if (isAnonymousOrWildcard(this)) {
      throw new ErrorInfo("clientId must have been specified to enter or leave a presence channel", 40012, 400);
    }
    return this.leaveClient(void 0, data);
  }
  async leaveClient(clientId, data) {
    const channel = this.channel;
    if (!channel.connectionManager.activeState()) {
      throw channel.connectionManager.getError();
    }
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MICRO,
      "RealtimePresence.leaveClient()",
      "leaving; channel = " + this.channel.name + ", client = " + clientId
    );
    const presence = presencemessage_default.fromData(data);
    presence.action = "leave";
    if (clientId) {
      presence.clientId = clientId;
    }
    const wirePresMsg = await presence.encode(channel.channelOptions);
    switch (channel.state) {
      case "attached":
        return channel.sendPresence([wirePresMsg]);
      case "attaching":
        return new Promise((resolve, reject) => {
          this.pendingPresence.push({
            presence: wirePresMsg,
            callback: (err) => err ? reject(err) : resolve()
          });
        });
      case "initialized":
      case "failed": {
        throw new PartialErrorInfo("Unable to leave presence channel (incompatible state)", 90001);
      }
      default:
        throw channel.invalidStateError();
    }
  }
  async get(params) {
    const waitForSync = !params || ("waitForSync" in params ? params.waitForSync : true);
    return new Promise((resolve, reject) => {
      function returnMembers(members) {
        resolve(params ? members.list(params) : members.values());
      }
      if (this.channel.state === "suspended") {
        if (waitForSync) {
          reject(
            ErrorInfo.fromValues({
              statusCode: 400,
              code: 91005,
              message: "Presence state is out of sync due to channel being in the SUSPENDED state"
            })
          );
        } else {
          returnMembers(this.members);
        }
        return;
      }
      waitAttached(
        this.channel,
        (err) => reject(err),
        () => {
          const members = this.members;
          if (waitForSync) {
            members.waitSync(function() {
              returnMembers(members);
            });
          } else {
            returnMembers(members);
          }
        }
      );
    });
  }
  async history(params) {
    logger_default.logAction(this.logger, logger_default.LOG_MICRO, "RealtimePresence.history()", "channel = " + this.name);
    const restMixin = this.channel.client.rest.presenceMixin;
    if (params && params.untilAttach) {
      if (this.channel.state === "attached") {
        delete params.untilAttach;
        params.from_serial = this.channel.properties.attachSerial;
      } else {
        throw new ErrorInfo(
          "option untilAttach requires the channel to be attached, was: " + this.channel.state,
          4e4,
          400
        );
      }
    }
    return restMixin.history(this, params);
  }
  setPresence(presenceSet, isSync, syncChannelSerial) {
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MICRO,
      "RealtimePresence.setPresence()",
      "received presence for " + presenceSet.length + " participants; syncChannelSerial = " + syncChannelSerial
    );
    let syncCursor, match;
    const members = this.members, myMembers = this._myMembers, broadcastMessages = [], connId = this.channel.connectionManager.connectionId;
    if (isSync) {
      this.members.startSync();
      if (syncChannelSerial && (match = syncChannelSerial.match(/^[\w-]+:(.*)$/))) {
        syncCursor = match[1];
      }
    }
    for (let presence of presenceSet) {
      switch (presence.action) {
        case "leave":
          if (members.remove(presence)) {
            broadcastMessages.push(presence);
          }
          if (presence.connectionId === connId && !presence.isSynthesized()) {
            myMembers.remove(presence);
          }
          break;
        case "enter":
        case "present":
        case "update":
          if (members.put(presence)) {
            broadcastMessages.push(presence);
          }
          if (presence.connectionId === connId) {
            myMembers.put(presence);
          }
          break;
      }
    }
    if (isSync && !syncCursor) {
      members.endSync();
      this.channel.syncChannelSerial = null;
    }
    for (let i = 0; i < broadcastMessages.length; i++) {
      const presence = broadcastMessages[i];
      this.subscriptions.emit(presence.action, presence);
    }
  }
  onAttached(hasPresence) {
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MINOR,
      "RealtimePresence.onAttached()",
      "channel = " + this.channel.name + ", hasPresence = " + hasPresence
    );
    if (hasPresence) {
      this.members.startSync();
    } else {
      this._synthesizeLeaves(this.members.values());
      this.members.clear();
    }
    this._ensureMyMembersPresent();
    const pendingPresence = this.pendingPresence, pendingPresCount = pendingPresence.length;
    if (pendingPresCount) {
      this.pendingPresence = [];
      const presenceArray = [];
      const multicaster = multicaster_default.create(this.logger);
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MICRO,
        "RealtimePresence.onAttached",
        "sending " + pendingPresCount + " queued presence messages"
      );
      for (let i = 0; i < pendingPresCount; i++) {
        const event = pendingPresence[i];
        presenceArray.push(event.presence);
        multicaster.push(event.callback);
      }
      this.channel.sendPresence(presenceArray).then(() => multicaster()).catch((err) => multicaster(err));
    }
  }
  actOnChannelState(state, hasPresence, err) {
    switch (state) {
      case "attached":
        this.onAttached(hasPresence);
        break;
      case "detached":
      case "failed":
        this._clearMyMembers();
        this.members.clear();
      case "suspended":
        this.failPendingPresence(err);
        break;
    }
  }
  failPendingPresence(err) {
    if (this.pendingPresence.length) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MINOR,
        "RealtimeChannel.failPendingPresence",
        "channel; name = " + this.channel.name + ", err = " + inspectError(err)
      );
      for (let i = 0; i < this.pendingPresence.length; i++)
        try {
          this.pendingPresence[i].callback(err);
        } catch (e) {
        }
      this.pendingPresence = [];
    }
  }
  _clearMyMembers() {
    this._myMembers.clear();
  }
  _ensureMyMembersPresent() {
    const myMembers = this._myMembers;
    const connId = this.channel.connectionManager.connectionId;
    for (const memberKey in myMembers.map) {
      const entry = myMembers.map[memberKey];
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MICRO,
        "RealtimePresence._ensureMyMembersPresent()",
        'Auto-reentering clientId "' + entry.clientId + '" into the presence set'
      );
      const id = entry.connectionId === connId ? entry.id : void 0;
      this._enterOrUpdateClient(id, entry.clientId, entry.data, "enter").catch((err) => {
        const wrappedErr = new ErrorInfo("Presence auto re-enter failed", 91004, 400, err);
        logger_default.logAction(
          this.logger,
          logger_default.LOG_ERROR,
          "RealtimePresence._ensureMyMembersPresent()",
          "Presence auto re-enter failed; reason = " + inspectError(err)
        );
        const change = new channelstatechange_default(this.channel.state, this.channel.state, true, false, wrappedErr);
        this.channel.emit("update", change);
      });
    }
  }
  _synthesizeLeaves(items) {
    const subscriptions = this.subscriptions;
    items.forEach(function(item) {
      const presence = presencemessage_default.fromValues({
        action: "leave",
        connectionId: item.connectionId,
        clientId: item.clientId,
        data: item.data,
        encoding: item.encoding,
        timestamp: Date.now()
      });
      subscriptions.emit("leave", presence);
    });
  }
  async subscribe(..._args) {
    const args = realtimechannel_default.processListenerArgs(_args);
    const event = args[0];
    const listener = args[1];
    const channel = this.channel;
    if (channel.state === "failed") {
      throw ErrorInfo.fromValues(channel.invalidStateError());
    }
    this.subscriptions.on(event, listener);
    if (channel.channelOptions.attachOnSubscribe !== false) {
      await channel.attach();
    }
  }
  unsubscribe(..._args) {
    const args = realtimechannel_default.processListenerArgs(_args);
    const event = args[0];
    const listener = args[1];
    this.subscriptions.off(event, listener);
  }
};
var realtimepresence_default = RealtimePresence;

// src/common/lib/transport/websockettransport.ts
var shortName = TransportNames.WebSocket;
function isNodeWebSocket(ws) {
  return !!ws.on;
}
var WebSocketTransport = class extends transport_default {
  constructor(connectionManager, auth, params) {
    super(connectionManager, auth, params);
    this.shortName = shortName;
    params.heartbeats = Platform.Config.useProtocolHeartbeats;
    this.wsHost = params.host;
  }
  static isAvailable() {
    return !!Platform.Config.WebSocket;
  }
  createWebSocket(uri, connectParams) {
    this.uri = uri + toQueryString(connectParams);
    return new Platform.Config.WebSocket(this.uri);
  }
  toString() {
    return "WebSocketTransport; uri=" + this.uri;
  }
  connect() {
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "WebSocketTransport.connect()", "starting");
    transport_default.prototype.connect.call(this);
    const self2 = this, params = this.params, options = params.options;
    const wsScheme = options.tls ? "wss://" : "ws://";
    const wsUri = wsScheme + this.wsHost + ":" + defaults_default.getPort(options) + "/";
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "WebSocketTransport.connect()", "uri: " + wsUri);
    whenPromiseSettles(
      this.auth.getAuthParams(),
      function(err, authParams) {
        if (self2.isDisposed) {
          return;
        }
        let paramStr = "";
        for (const param in authParams)
          paramStr += " " + param + ": " + authParams[param] + ";";
        logger_default.logAction(
          self2.logger,
          logger_default.LOG_MINOR,
          "WebSocketTransport.connect()",
          "authParams:" + paramStr + " err: " + err
        );
        if (err) {
          self2.disconnect(err);
          return;
        }
        const connectParams = params.getConnectParams(authParams);
        try {
          const wsConnection = self2.wsConnection = self2.createWebSocket(wsUri, connectParams);
          wsConnection.binaryType = Platform.Config.binaryType;
          wsConnection.onopen = function() {
            self2.onWsOpen();
          };
          wsConnection.onclose = function(ev) {
            self2.onWsClose(ev);
          };
          wsConnection.onmessage = function(ev) {
            self2.onWsData(ev.data);
          };
          wsConnection.onerror = function(ev) {
            self2.onWsError(ev);
          };
          if (isNodeWebSocket(wsConnection)) {
            wsConnection.on("ping", function() {
              self2.onActivity();
            });
          }
        } catch (e) {
          logger_default.logAction(
            self2.logger,
            logger_default.LOG_ERROR,
            "WebSocketTransport.connect()",
            "Unexpected exception creating websocket: err = " + (e.stack || e.message)
          );
          self2.disconnect(e);
        }
      }
    );
  }
  send(message) {
    const wsConnection = this.wsConnection;
    if (!wsConnection) {
      logger_default.logAction(this.logger, logger_default.LOG_ERROR, "WebSocketTransport.send()", "No socket connection");
      return;
    }
    try {
      wsConnection.send(
        serialize2(message, this.connectionManager.realtime._MsgPack, this.params.format)
      );
    } catch (e) {
      const msg = "Exception from ws connection when trying to send: " + inspectError(e);
      logger_default.logAction(this.logger, logger_default.LOG_ERROR, "WebSocketTransport.send()", msg);
      this.finish("disconnected", new ErrorInfo(msg, 5e4, 500));
    }
  }
  onWsData(data) {
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MICRO,
      "WebSocketTransport.onWsData()",
      "data received; length = " + data.length + "; type = " + typeof data
    );
    try {
      this.onProtocolMessage(
        deserialize(
          data,
          this.connectionManager.realtime._MsgPack,
          this.connectionManager.realtime._RealtimePresence,
          this.connectionManager.realtime._Annotations,
          this.format
        )
      );
    } catch (e) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_ERROR,
        "WebSocketTransport.onWsData()",
        "Unexpected exception handing channel message: " + e.stack
      );
    }
  }
  onWsOpen() {
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "WebSocketTransport.onWsOpen()", "opened WebSocket");
    this.emit("preconnect");
  }
  onWsClose(ev) {
    let wasClean, code;
    if (typeof ev == "object") {
      code = ev.code;
      wasClean = ev.wasClean || code === 1e3;
    } else {
      code = ev;
      wasClean = code == 1e3;
    }
    delete this.wsConnection;
    if (wasClean) {
      logger_default.logAction(this.logger, logger_default.LOG_MINOR, "WebSocketTransport.onWsClose()", "Cleanly closed WebSocket");
      const err = new ErrorInfo("Websocket closed", 80003, 400);
      this.finish("disconnected", err);
    } else {
      const msg = "Unclean disconnection of WebSocket ; code = " + code, err = new ErrorInfo(msg, 80003, 400);
      logger_default.logAction(this.logger, logger_default.LOG_MINOR, "WebSocketTransport.onWsClose()", msg);
      this.finish("disconnected", err);
    }
    this.emit("disposed");
  }
  onWsError(err) {
    logger_default.logAction(
      this.logger,
      logger_default.LOG_MINOR,
      "WebSocketTransport.onError()",
      "Error from WebSocket: " + err.message
    );
    Platform.Config.nextTick(() => {
      this.disconnect(Error(err.message));
    });
  }
  dispose() {
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "WebSocketTransport.dispose()", "");
    this.isDisposed = true;
    const wsConnection = this.wsConnection;
    if (wsConnection) {
      wsConnection.onmessage = function() {
      };
      delete this.wsConnection;
      Platform.Config.nextTick(() => {
        logger_default.logAction(this.logger, logger_default.LOG_MICRO, "WebSocketTransport.dispose()", "closing websocket");
        if (!wsConnection) {
          throw new Error("WebSocketTransport.dispose(): wsConnection is not defined");
        }
        wsConnection.close();
      });
    }
  }
};
var websockettransport_default = WebSocketTransport;

// src/common/lib/client/filteredsubscriptions.ts
var FilteredSubscriptions = class {
  static subscribeFilter(channel, filter, listener) {
    const filteredListener = (m) => {
      var _a2, _b, _c, _d, _e, _f;
      const mapping = {
        name: m.name,
        refTimeserial: (_b = (_a2 = m.extras) == null ? void 0 : _a2.ref) == null ? void 0 : _b.timeserial,
        refType: (_d = (_c = m.extras) == null ? void 0 : _c.ref) == null ? void 0 : _d.type,
        isRef: !!((_f = (_e = m.extras) == null ? void 0 : _e.ref) == null ? void 0 : _f.timeserial),
        clientId: m.clientId
      };
      if (Object.entries(filter).find(
        ([key, value]) => value !== void 0 ? mapping[key] !== value : false
      )) {
        return;
      }
      listener(m);
    };
    this.addFilteredSubscription(channel, filter, listener, filteredListener);
    channel.subscriptions.on(filteredListener);
  }
  // Adds a new filtered subscription
  static addFilteredSubscription(channel, filter, realListener, filteredListener) {
    var _a2;
    if (!channel.filteredSubscriptions) {
      channel.filteredSubscriptions = /* @__PURE__ */ new Map();
    }
    if (channel.filteredSubscriptions.has(realListener)) {
      const realListenerMap = channel.filteredSubscriptions.get(realListener);
      realListenerMap.set(filter, ((_a2 = realListenerMap == null ? void 0 : realListenerMap.get(filter)) == null ? void 0 : _a2.concat(filteredListener)) || [filteredListener]);
    } else {
      channel.filteredSubscriptions.set(
        realListener,
        /* @__PURE__ */ new Map([[filter, [filteredListener]]])
      );
    }
  }
  static getAndDeleteFilteredSubscriptions(channel, filter, realListener) {
    if (!channel.filteredSubscriptions) {
      return [];
    }
    if (!realListener && filter) {
      return Array.from(channel.filteredSubscriptions.entries()).map(([key, filterMaps]) => {
        var _a2;
        let listenerMaps = filterMaps.get(filter);
        filterMaps.delete(filter);
        if (filterMaps.size === 0) {
          (_a2 = channel.filteredSubscriptions) == null ? void 0 : _a2.delete(key);
        }
        return listenerMaps;
      }).reduce(
        (prev, cur) => cur ? prev.concat(...cur) : prev,
        []
      );
    }
    if (!realListener || !channel.filteredSubscriptions.has(realListener)) {
      return [];
    }
    const realListenerMap = channel.filteredSubscriptions.get(realListener);
    if (!filter) {
      const listeners2 = Array.from(realListenerMap.values()).reduce((prev, cur) => prev.concat(...cur), []);
      channel.filteredSubscriptions.delete(realListener);
      return listeners2;
    }
    let listeners = realListenerMap.get(filter);
    realListenerMap.delete(filter);
    return listeners || [];
  }
};

// src/common/lib/client/defaultrealtime.ts
var _DefaultRealtime = class _DefaultRealtime extends baserealtime_default {
  // The public typings declare that this requires an argument to be passed, but since we want to emit a good error message in the case where a non-TypeScript user does not pass an argument, tell the compiler that this is possible so that it forces us to handle it.
  constructor(options) {
    var _a2;
    const MsgPack = _DefaultRealtime._MsgPack;
    if (!MsgPack) {
      throw new Error("Expected DefaultRealtime._MsgPack to have been set");
    }
    super(
      defaults_default.objectifyOptions(options, true, "Realtime", logger_default.defaultLogger, __spreadProps(__spreadValues({}, allCommonModularPlugins), {
        Crypto: (_a2 = _DefaultRealtime.Crypto) != null ? _a2 : void 0,
        MsgPack,
        RealtimePresence: {
          RealtimePresence: realtimepresence_default,
          PresenceMessage: presencemessage_default,
          WirePresenceMessage
        },
        Annotations: {
          Annotation: annotation_default,
          WireAnnotation,
          RealtimeAnnotations: realtimeannotations_default,
          RestAnnotations: restannotations_default
        },
        WebSocketTransport: websockettransport_default,
        MessageInteractions: FilteredSubscriptions
      }))
    );
  }
  static get Crypto() {
    if (this._Crypto === null) {
      throw new Error("Encryption not enabled; use ably.encryption.js instead");
    }
    return this._Crypto;
  }
  static set Crypto(newValue) {
    this._Crypto = newValue;
  }
};
_DefaultRealtime.Utils = utils_exports;
_DefaultRealtime.ConnectionManager = connectionmanager_default;
_DefaultRealtime.ProtocolMessage = protocolmessage_default;
_DefaultRealtime._Crypto = null;
_DefaultRealtime.Message = DefaultMessage;
_DefaultRealtime.PresenceMessage = DefaultPresenceMessage;
_DefaultRealtime.Annotation = DefaultAnnotation;
_DefaultRealtime._MsgPack = null;
// Used by tests
_DefaultRealtime._Http = Http;
_DefaultRealtime._PresenceMap = PresenceMap;
var DefaultRealtime = _DefaultRealtime;

// src/platform/nodejs/lib/util/bufferutils.ts
var import_crypto = __toESM(require("crypto"));
var BufferUtils = class {
  constructor() {
    this.base64CharSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    this.hexCharSet = "0123456789abcdef";
  }
  base64Decode(string) {
    return Buffer.from(string, "base64");
  }
  base64Encode(buffer) {
    return this.toBuffer(buffer).toString("base64");
  }
  areBuffersEqual(buffer1, buffer2) {
    if (!buffer1 || !buffer2)
      return false;
    return this.toBuffer(buffer1).compare(this.toBuffer(buffer2)) == 0;
  }
  byteLength(buffer) {
    return buffer.byteLength;
  }
  hexDecode(string) {
    return Buffer.from(string, "hex");
  }
  hexEncode(buffer) {
    return this.toBuffer(buffer).toString("hex");
  }
  /* In node, BufferUtils methods that return binary objects return a Buffer
   * for historical reasons; the browser equivalents return ArrayBuffers */
  isBuffer(buffer) {
    return Buffer.isBuffer(buffer) || buffer instanceof ArrayBuffer || ArrayBuffer.isView(buffer);
  }
  toArrayBuffer(buffer) {
    const nodeBuffer = this.toBuffer(buffer);
    return nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength);
  }
  toBuffer(buffer) {
    if (Buffer.isBuffer(buffer)) {
      return buffer;
    }
    if (buffer instanceof ArrayBuffer) {
      return Buffer.from(buffer);
    }
    return Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }
  arrayBufferViewToBuffer(arrayBufferView) {
    return this.toBuffer(arrayBufferView);
  }
  utf8Decode(buffer) {
    if (!this.isBuffer(buffer)) {
      throw new Error("Expected input of utf8Decode to be a buffer, arraybuffer, or view");
    }
    return this.toBuffer(buffer).toString("utf8");
  }
  utf8Encode(string) {
    return Buffer.from(string, "utf8");
  }
  hmacSha256(message, key) {
    const messageBuffer = this.toBuffer(message);
    const keyBuffer = this.toBuffer(key);
    const hmac2 = import_crypto.default.createHmac("SHA256", keyBuffer);
    hmac2.update(messageBuffer);
    return hmac2.digest();
  }
};
var bufferutils_default = new BufferUtils();

// src/platform/nodejs/lib/util/crypto.ts
var import_crypto2 = __toESM(require("crypto"));
var import_util = __toESM(require("util"));
var createCryptoClass = function(bufferUtils) {
  var DEFAULT_ALGORITHM = "aes";
  var DEFAULT_KEYLENGTH = 256;
  var DEFAULT_MODE = "cbc";
  var DEFAULT_BLOCKLENGTH = 16;
  async function generateRandom(bytes) {
    return import_util.default.promisify(import_crypto2.default.randomBytes)(bytes);
  }
  function getPaddedLength(plaintextLength) {
    return plaintextLength + DEFAULT_BLOCKLENGTH & -DEFAULT_BLOCKLENGTH;
  }
  function validateCipherParams(params) {
    if (params.algorithm === "aes" && params.mode === "cbc") {
      if (params.keyLength === 128 || params.keyLength === 256) {
        return;
      }
      throw new Error(
        "Unsupported key length " + params.keyLength + " for aes-cbc encryption. Encryption key must be 128 or 256 bits (16 or 32 ASCII characters)"
      );
    }
  }
  function normaliseBase64(string) {
    return string.replace("_", "/").replace("-", "+");
  }
  function filledBuffer(length, value) {
    var result = Buffer.alloc(length);
    result.fill(value);
    return result;
  }
  var pkcs5Padding = [filledBuffer(16, 16)];
  for (var i = 1; i <= 16; i++)
    pkcs5Padding.push(filledBuffer(i, i));
  class CipherParams {
    constructor(algorithm, keyLength, mode, key) {
      this.algorithm = algorithm;
      this.keyLength = keyLength;
      this.mode = mode;
      this.key = key;
      this.iv = null;
    }
  }
  function isInstCipherParams(params) {
    return !!(params.algorithm && params.key && params.keyLength && params.mode);
  }
  class Crypto2 {
    /**
     * Obtain a complete CipherParams instance from the provided params, filling
     * in any not provided with default values, calculating a keyLength from
     * the supplied key, and validating the result.
     * @param params an object containing at a minimum a `key` key with value the
     * key, as either a binary or a base64-encoded string.
     * May optionally also contain: algorithm (defaults to AES),
     * mode (defaults to 'cbc')
     */
    static getDefaultParams(params) {
      var key;
      if (!params.key) {
        throw new Error("Crypto.getDefaultParams: a key is required");
      }
      if (typeof params.key === "string") {
        key = bufferUtils.base64Decode(normaliseBase64(params.key));
      } else if (params.key instanceof ArrayBuffer) {
        key = Buffer.from(params.key);
      } else {
        key = params.key;
      }
      var algorithm = params.algorithm || DEFAULT_ALGORITHM;
      var keyLength = key.length * 8;
      var mode = params.mode || DEFAULT_MODE;
      var cipherParams = new CipherParams(algorithm, keyLength, mode, key);
      if (params.keyLength && params.keyLength !== cipherParams.keyLength) {
        throw new Error(
          "Crypto.getDefaultParams: a keyLength of " + params.keyLength + " was specified, but the key actually has length " + cipherParams.keyLength
        );
      }
      validateCipherParams(cipherParams);
      return cipherParams;
    }
    /**
     * Generate a random encryption key from the supplied keylength (or the
     * default keyLength if none supplied) as a Buffer
     * @param keyLength (optional) the required keyLength in bits
     */
    static async generateRandomKey(keyLength) {
      try {
        return generateRandom((keyLength || DEFAULT_KEYLENGTH) / 8);
      } catch (err) {
        throw new ErrorInfo("Failed to generate random key: " + err.message, 500, 5e4, err);
      }
    }
    /**
     * Internal; get a ChannelCipher instance based on the given cipherParams
     * @param params either a CipherParams instance or some subset of its
     * fields that includes a key
     */
    static getCipher(params, logger) {
      var _a2;
      var cipherParams = isInstCipherParams(params) ? params : this.getDefaultParams(params);
      return {
        cipherParams,
        cipher: new CBCCipher(cipherParams, (_a2 = params.iv) != null ? _a2 : null, logger)
      };
    }
  }
  Crypto2.CipherParams = CipherParams;
  Crypto2;
  class CBCCipher {
    constructor(params, iv, logger) {
      this.logger = logger;
      this.encryptCipher = null;
      this.algorithm = params.algorithm + "-" + String(params.keyLength) + "-" + params.mode;
      this.key = params.key;
      this.iv = iv;
    }
    async encrypt(plaintext) {
      logger_default.logAction(this.logger, logger_default.LOG_MICRO, "CBCCipher.encrypt()", "");
      const iv = await this.getIv();
      if (!this.encryptCipher) {
        this.encryptCipher = import_crypto2.default.createCipheriv(this.algorithm, this.key, iv);
      }
      var plaintextBuffer = bufferUtils.toBuffer(plaintext);
      var plaintextLength = plaintextBuffer.length, paddedLength = getPaddedLength(plaintextLength);
      var cipherOut = this.encryptCipher.update(
        Buffer.concat([plaintextBuffer, pkcs5Padding[paddedLength - plaintextLength]])
      );
      var ciphertext = Buffer.concat([iv, cipherOut]);
      return ciphertext;
    }
    async decrypt(ciphertext) {
      var decryptCipher = import_crypto2.default.createDecipheriv(this.algorithm, this.key, ciphertext.slice(0, DEFAULT_BLOCKLENGTH)), plaintext = decryptCipher.update(ciphertext.slice(DEFAULT_BLOCKLENGTH)), final = decryptCipher.final();
      if (final && final.length)
        plaintext = Buffer.concat([plaintext, final]);
      return plaintext;
    }
    async getIv() {
      if (this.iv) {
        var iv = this.iv;
        this.iv = null;
        return iv;
      }
      var randomBlock = await generateRandom(DEFAULT_BLOCKLENGTH);
      if (!this.encryptCipher) {
        return randomBlock;
      } else {
        return this.encryptCipher.update(randomBlock);
      }
    }
  }
  return Crypto2;
};

// src/platform/nodejs/lib/util/http.ts
var import_got = __toESM(require("got"));
var import_http5 = __toESM(require("http"));
var import_https = __toESM(require("https"));
var globalAgentPool = [];
var _a;
var Http2 = (_a = class {
  constructor(client) {
    this.agent = null;
    this.supportsAuthHeaders = true;
    this.supportsLinkHeaders = true;
    this.checkConnectivity = async () => {
      var _a2, _b, _c, _d, _e;
      if ((_a2 = this.client) == null ? void 0 : _a2.options.disableConnectivityCheck) {
        return true;
      }
      const connectivityCheckUrl = ((_b = this.client) == null ? void 0 : _b.options.connectivityCheckUrl) || defaults_default.connectivityCheckUrl;
      const connectivityCheckParams = (_d = (_c = this.client) == null ? void 0 : _c.options.connectivityCheckParams) != null ? _d : null;
      const connectivityUrlIsDefault = !((_e = this.client) == null ? void 0 : _e.options.connectivityCheckUrl);
      const { error, statusCode, body } = await this.doUri(
        HttpMethods_default.Get,
        connectivityCheckUrl,
        null,
        null,
        connectivityCheckParams
      );
      if (!error && !connectivityUrlIsDefault) {
        return isSuccessCode(statusCode);
      }
      return !error && (body == null ? void 0 : body.toString().trim()) === "yes";
    };
    this.client = client != null ? client : null;
  }
  async doUri(method, uri, headers, body, params) {
    var _a2;
    const agentOptions = this.client && this.client.options.restAgentOptions || defaults_default.restAgentOptions;
    const doOptions = { headers: headers || void 0, responseType: "buffer" };
    if (!this.agent) {
      const persistedAgent = (_a2 = globalAgentPool.find((x) => shallowEquals(agentOptions, x.options))) == null ? void 0 : _a2.agents;
      if (persistedAgent) {
        this.agent = persistedAgent;
      } else {
        this.agent = {
          http: new import_http5.default.Agent(agentOptions),
          https: new import_https.default.Agent(agentOptions)
        };
        globalAgentPool.push({
          options: agentOptions,
          agents: this.agent
        });
      }
    }
    if (body) {
      doOptions.body = body;
    }
    if (params)
      doOptions.searchParams = params;
    doOptions.agent = this.agent;
    doOptions.url = uri;
    doOptions.timeout = {
      request: (this.client && this.client.options.timeouts || defaults_default.TIMEOUTS).httpRequestTimeout
    };
    doOptions.retry = { limit: 0 };
    try {
      const res = await import_got.default[method](doOptions);
      return this._handler(null, res, res.body);
    } catch (err) {
      if (err instanceof import_got.default.HTTPError) {
        return this._handler(null, err.response, err.response.body);
      }
      return this._handler(err);
    }
  }
  shouldFallback(err) {
    const { code, statusCode } = err;
    return code === "ENETUNREACH" || code === "EHOSTUNREACH" || code === "EHOSTDOWN" || code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT" || code === "ENOTFOUND" || code === "ECONNRESET" || code === "ECONNREFUSED" || statusCode >= 500 && statusCode <= 504;
  }
  _handler(err, response, body) {
    var _a2;
    if (err) {
      return { error: err };
    }
    const statusCode = response.statusCode, headers = response.headers;
    if (statusCode >= 300) {
      switch (headers["content-type"]) {
        case "application/json":
          body = JSON.parse(body);
          break;
        case "application/x-msgpack":
          if (!((_a2 = this.client) == null ? void 0 : _a2._MsgPack)) {
            return { error: createMissingPluginError("MsgPack") };
          }
          body = this.client._MsgPack.decode(body);
          break;
      }
      const error = body.error ? ErrorInfo.fromValues(body.error) : new ErrorInfo(
        headers["x-ably-errormessage"] || "Error response received from server: " + statusCode + " body was: " + Platform.Config.inspect(body),
        Number(headers["x-ably-errorcode"]),
        statusCode
      );
      return { error, body, headers, unpacked: true, statusCode };
    }
    return { error: null, body, headers, unpacked: false, statusCode };
  }
}, _a.methods = [HttpMethods_default.Get, HttpMethods_default.Delete, HttpMethods_default.Post, HttpMethods_default.Put, HttpMethods_default.Patch], _a.methodsWithoutBody = [HttpMethods_default.Get, HttpMethods_default.Delete], _a.methodsWithBody = [HttpMethods_default.Post, HttpMethods_default.Put, HttpMethods_default.Patch], _a);
var http_default = Http2;

// src/platform/nodejs/config.ts
var import_crypto3 = __toESM(require("crypto"));
var import_ws = __toESM(require("ws"));
var import_util2 = __toESM(require("util"));
var Config = {
  agent: "nodejs/" + process.versions.node,
  logTimestamps: true,
  userAgent: null,
  binaryType: "nodebuffer",
  WebSocket: import_ws.default,
  useProtocolHeartbeats: false,
  supportsBinary: true,
  preferBinary: true,
  nextTick: process.nextTick,
  inspect: import_util2.default.inspect,
  stringByteSize: Buffer.byteLength,
  inherits: import_util2.default.inherits,
  addEventListener: null,
  getRandomArrayBuffer: async function(byteLength) {
    return import_util2.default.promisify(import_crypto3.default.randomBytes)(byteLength);
  }
};
var config_default = Config;

// src/common/constants/XHRStates.ts
var XHRStates = /* @__PURE__ */ ((XHRStates2) => {
  XHRStates2[XHRStates2["REQ_SEND"] = 0] = "REQ_SEND";
  XHRStates2[XHRStates2["REQ_RECV"] = 1] = "REQ_RECV";
  XHRStates2[XHRStates2["REQ_RECV_POLL"] = 2] = "REQ_RECV_POLL";
  XHRStates2[XHRStates2["REQ_RECV_STREAM"] = 3] = "REQ_RECV_STREAM";
  return XHRStates2;
})(XHRStates || {});
var XHRStates_default = XHRStates;

// src/common/lib/transport/comettransport.ts
function shouldBeErrorAction(err) {
  const UNRESOLVABLE_ERROR_CODES = [80015, 80017, 80030];
  if (err.code) {
    if (auth_default.isTokenErr(err))
      return false;
    if (UNRESOLVABLE_ERROR_CODES.includes(err.code))
      return true;
    return err.code >= 4e4 && err.code < 5e4;
  } else {
    return false;
  }
}
function protocolMessageFromRawError(err) {
  if (shouldBeErrorAction(err)) {
    return [fromValues({ action: actions.ERROR, error: err })];
  } else {
    return [fromValues({ action: actions.DISCONNECTED, error: err })];
  }
}
var CometTransport = class extends transport_default {
  constructor(connectionManager, auth, params) {
    super(
      connectionManager,
      auth,
      params,
      /* binary not supported for comet so force JSON protocol */
      true
    );
    /* Historical comment, back from when we supported JSONP:
     *
     * > For comet, we could do the auth update by aborting the current recv and
     * > starting a new one with the new token, that'd be sufficient for realtime.
     * > Problem is JSONP - you can't cancel truly abort a recv once started. So
     * > we need to send an AUTH for jsonp. In which case it's simpler to keep all
     * > comet transports the same and do it for all of them. So we send the AUTH
     * > instead, and don't need to abort the recv
     *
     * Now that we’ve dropped JSONP support, we may be able to revisit the above;
     * see https://github.com/ably/ably-js/issues/1214.
     */
    this.onAuthUpdated = (tokenDetails) => {
      this.authParams = { access_token: tokenDetails.token };
    };
    this.stream = "stream" in params ? params.stream : true;
    this.sendRequest = null;
    this.recvRequest = null;
    this.pendingCallback = null;
    this.pendingItems = null;
  }
  connect() {
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "CometTransport.connect()", "starting");
    transport_default.prototype.connect.call(this);
    const params = this.params;
    const options = params.options;
    const host = defaults_default.getHost(options, params.host);
    const port = defaults_default.getPort(options);
    const cometScheme = options.tls ? "https://" : "http://";
    this.baseUri = cometScheme + host + ":" + port + "/comet/";
    const connectUri = this.baseUri + "connect";
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "CometTransport.connect()", "uri: " + connectUri);
    whenPromiseSettles(this.auth.getAuthParams(), (err, authParams) => {
      if (err) {
        this.disconnect(err);
        return;
      }
      if (this.isDisposed) {
        return;
      }
      this.authParams = authParams;
      const connectParams = this.params.getConnectParams(authParams);
      if ("stream" in connectParams)
        this.stream = connectParams.stream;
      logger_default.logAction(
        this.logger,
        logger_default.LOG_MINOR,
        "CometTransport.connect()",
        "connectParams:" + toQueryString(connectParams)
      );
      let preconnected = false;
      const connectRequest = this.recvRequest = this.createRequest(
        connectUri,
        null,
        connectParams,
        null,
        this.stream ? XHRStates_default.REQ_RECV_STREAM : XHRStates_default.REQ_RECV
      );
      connectRequest.on("data", (data) => {
        if (!this.recvRequest) {
          return;
        }
        if (!preconnected) {
          preconnected = true;
          this.emit("preconnect");
        }
        this.onData(data);
      });
      connectRequest.on("complete", (err2) => {
        if (!this.recvRequest) {
          err2 = err2 || new ErrorInfo("Request cancelled", 80003, 400);
        }
        this.recvRequest = null;
        if (!preconnected && !err2) {
          preconnected = true;
          this.emit("preconnect");
        }
        this.onActivity();
        if (err2) {
          if (err2.code) {
            this.onData(protocolMessageFromRawError(err2));
          } else {
            this.disconnect(err2);
          }
          return;
        }
        Platform.Config.nextTick(() => {
          this.recv();
        });
      });
      connectRequest.exec();
    });
  }
  requestClose() {
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "CometTransport.requestClose()");
    this._requestCloseOrDisconnect(true);
  }
  requestDisconnect() {
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "CometTransport.requestDisconnect()");
    this._requestCloseOrDisconnect(false);
  }
  _requestCloseOrDisconnect(closing) {
    const closeOrDisconnectUri = closing ? this.closeUri : this.disconnectUri;
    if (closeOrDisconnectUri) {
      const request = this.createRequest(closeOrDisconnectUri, null, this.authParams, null, XHRStates_default.REQ_SEND);
      request.on("complete", (err) => {
        if (err) {
          logger_default.logAction(
            this.logger,
            logger_default.LOG_ERROR,
            "CometTransport.request" + (closing ? "Close()" : "Disconnect()"),
            "request returned err = " + inspectError(err)
          );
          this.finish("disconnected", err);
        }
      });
      request.exec();
    }
  }
  dispose() {
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "CometTransport.dispose()", "");
    if (!this.isDisposed) {
      this.isDisposed = true;
      if (this.recvRequest) {
        logger_default.logAction(this.logger, logger_default.LOG_MINOR, "CometTransport.dispose()", "aborting recv request");
        this.recvRequest.abort();
        this.recvRequest = null;
      }
      this.finish("disconnected", connectionerrors_default.disconnected());
      Platform.Config.nextTick(() => {
        this.emit("disposed");
      });
    }
  }
  onConnect(message) {
    var _a2;
    if (this.isDisposed) {
      return;
    }
    const connectionStr = (_a2 = message.connectionDetails) == null ? void 0 : _a2.connectionKey;
    transport_default.prototype.onConnect.call(this, message);
    const baseConnectionUri = this.baseUri + connectionStr;
    logger_default.logAction(this.logger, logger_default.LOG_MICRO, "CometTransport.onConnect()", "baseUri = " + baseConnectionUri);
    this.sendUri = baseConnectionUri + "/send";
    this.recvUri = baseConnectionUri + "/recv";
    this.closeUri = baseConnectionUri + "/close";
    this.disconnectUri = baseConnectionUri + "/disconnect";
  }
  send(message) {
    if (this.sendRequest) {
      this.pendingItems = this.pendingItems || [];
      this.pendingItems.push(message);
      return;
    }
    const pendingItems = this.pendingItems || [];
    pendingItems.push(message);
    this.pendingItems = null;
    this.sendItems(pendingItems);
  }
  sendAnyPending() {
    const pendingItems = this.pendingItems;
    if (!pendingItems) {
      return;
    }
    this.pendingItems = null;
    this.sendItems(pendingItems);
  }
  sendItems(items) {
    const sendRequest = this.sendRequest = this.createRequest(
      this.sendUri,
      null,
      this.authParams,
      this.encodeRequest(items),
      XHRStates_default.REQ_SEND
    );
    sendRequest.on("complete", (err, data) => {
      if (err)
        logger_default.logAction(
          this.logger,
          logger_default.LOG_ERROR,
          "CometTransport.sendItems()",
          "on complete: err = " + inspectError(err)
        );
      this.sendRequest = null;
      if (err) {
        if (err.code) {
          this.onData(protocolMessageFromRawError(err));
        } else {
          this.disconnect(err);
        }
        return;
      }
      if (data) {
        this.onData(data);
      }
      if (this.pendingItems) {
        Platform.Config.nextTick(() => {
          if (!this.sendRequest) {
            this.sendAnyPending();
          }
        });
      }
    });
    sendRequest.exec();
  }
  recv() {
    if (this.recvRequest)
      return;
    if (!this.isConnected)
      return;
    const recvRequest = this.recvRequest = this.createRequest(
      this.recvUri,
      null,
      this.authParams,
      null,
      this.stream ? XHRStates_default.REQ_RECV_STREAM : XHRStates_default.REQ_RECV_POLL
    );
    recvRequest.on("data", (data) => {
      this.onData(data);
    });
    recvRequest.on("complete", (err) => {
      this.recvRequest = null;
      this.onActivity();
      if (err) {
        if (err.code) {
          this.onData(protocolMessageFromRawError(err));
        } else {
          this.disconnect(err);
        }
        return;
      }
      Platform.Config.nextTick(() => {
        this.recv();
      });
    });
    recvRequest.exec();
  }
  onData(responseData) {
    try {
      const items = this.decodeResponse(responseData);
      if (items && items.length)
        for (let i = 0; i < items.length; i++)
          this.onProtocolMessage(
            fromDeserialized(
              items[i],
              this.connectionManager.realtime._RealtimePresence,
              this.connectionManager.realtime._Annotations
            )
          );
    } catch (e) {
      logger_default.logAction(
        this.logger,
        logger_default.LOG_ERROR,
        "CometTransport.onData()",
        "Unexpected exception handing channel event: " + e.stack
      );
    }
  }
  encodeRequest(requestItems) {
    return JSON.stringify(requestItems);
  }
  decodeResponse(responseData) {
    if (typeof responseData == "string")
      return JSON.parse(responseData);
    return responseData;
  }
};
var comettransport_default = CometTransport;

// src/platform/nodejs/lib/transport/nodecomettransport.js
var import_http6 = __toESM(require("http"));
var import_https2 = __toESM(require("https"));
var import_url = __toESM(require("url"));
var import_util3 = __toESM(require("util"));
var noop3 = function() {
};
var shortName2 = TransportNames.Comet;
var NodeCometTransport = class extends comettransport_default {
  constructor(connectionManager, auth, params) {
    super(connectionManager, auth, params);
    this.httpAgent = null;
    this.httpsAgent = null;
    this.pendingRequests = 0;
    this.shortName = shortName2;
  }
  static isAvailable() {
    return true;
  }
  toString() {
    return "NodeCometTransport; uri=" + this.baseUri + "; isConnected=" + this.isConnected + "; format=" + this.format + "; stream=" + this.stream;
  }
  getAgent(tls) {
    var prop = tls ? "httpsAgent" : "httpAgent", agent2 = this[prop];
    if (!agent2)
      agent2 = this[prop] = new (tls ? import_https2.default : import_http6.default).Agent({ keepAlive: true });
    return agent2;
  }
  dispose() {
    var self2 = this;
    this.onceNoPending(function() {
      if (self2.httpAgent)
        self2.httpAgent.destroy();
      if (self2.httpsAgent)
        self2.httpsAgent.destroy();
    });
    comettransport_default.prototype.dispose.call(this);
  }
  /* valid in non-streaming mode only, or data only contains last update */
  request(uri, params, body, requestMode, callback) {
    var req = this.createRequest(uri, params, body, requestMode);
    req.once("complete", callback);
    req.exec();
    return req;
  }
  createRequest(uri, headers, params, body, requestMode) {
    return new Request(uri, headers, params, body, requestMode, this.format, this.timeouts, this);
  }
  addPending() {
    ++this.pendingRequests;
  }
  removePending() {
    if (--this.pendingRequests <= 0) {
      this.emit("nopending");
    }
  }
  onceNoPending(listener) {
    if (this.pendingRequests == 0) {
      listener();
      return;
    }
    this.once("nopending", listener);
  }
};
var Request = class extends eventemitter_default {
  constructor(uri, headers, params, body, requestMode, format, timeouts, transport) {
    super(transport.logger);
    if (typeof uri == "string")
      uri = import_url.default.parse(uri);
    var tls = uri.protocol == "https:";
    this.client = tls ? import_https2.default : import_http6.default;
    this.requestMode = requestMode;
    this.timeouts = timeouts;
    this.transport = transport;
    this.requestComplete = false;
    this.req = this.res = null;
    var method = "GET", contentType = format == "msgpack" ? "application/x-msgpack" : "application/json";
    headers = headers ? mixin({}, headers) : {};
    headers["accept"] = contentType;
    if (body) {
      method = "POST";
      if (!Buffer.isBuffer(body)) {
        if (typeof body == "object")
          body = JSON.stringify(body);
        body = Buffer.from(body);
      }
      this.body = body;
      headers["Content-Length"] = body.length;
      headers["Content-Type"] = contentType;
    }
    var requestOptions = this.requestOptions = {
      hostname: uri.hostname,
      port: uri.port,
      path: uri.path + toQueryString(params),
      method,
      headers
    };
    if (transport)
      requestOptions.agent = transport.getAgent(tls);
  }
  exec() {
    var timeout = this.requestMode == XHRStates_default.REQ_SEND ? this.timeouts.httpRequestTimeout : this.timeouts.recvTimeout, self2 = this;
    var timer = this.timer = setTimeout(function() {
      self2.abort();
    }, timeout), req = this.req = this.client.request(this.requestOptions);
    req.on(
      "error",
      this.onReqError = function(err) {
        err = new PartialErrorInfo("Request error: " + err.message, null, 400);
        clearTimeout(timer);
        self2.timer = null;
        self2.complete(err);
      }
    );
    req.on("response", function(res) {
      clearTimeout(timer);
      self2.timer = null;
      var statusCode = res.statusCode;
      if (statusCode == HttpStatusCodes_default.NoContent) {
        res.resume();
        self2.complete();
        return;
      }
      res.on(
        "error",
        self2.onResError = function(err) {
          err = new PartialErrorInfo("Response error: " + err.message, null, 400);
          self2.complete(err);
        }
      );
      self2.res = res;
      if (self2.requestMode == XHRStates_default.REQ_RECV_STREAM && statusCode < 400) {
        self2.readStream();
      } else {
        self2.readFully();
      }
    });
    if (this.transport)
      this.transport.addPending();
    req.end(this.body);
  }
  readStream() {
    var res = this.res, self2 = this;
    this.chunks = [];
    this.streamComplete = false;
    function onChunk(chunk) {
      try {
        chunk = JSON.parse(chunk);
      } catch (e) {
        var msg = "Malformed response body from server: " + e.message;
        logger_default.logAction(self2.logger, logger_default.LOG_ERROR, "NodeCometTransport.Request.readStream()", msg);
        self2.complete(new PartialErrorInfo(msg, null, 400));
        return;
      }
      self2.emit("data", chunk);
    }
    res.on(
      "data",
      this.ondata = function(data) {
        var newChunks = String(data).split("\n"), chunks = self2.chunks;
        if (newChunks.length > 1 && chunks.length > 0) {
          chunks.push(newChunks.shift());
          self2.chunks = [];
          onChunk(chunks.join(""));
        }
        var trailingNewChunk = newChunks.pop();
        if (trailingNewChunk.length) {
          self2.chunks.push(trailingNewChunk);
        }
        newChunks.map(onChunk);
      }
    );
    res.on("end", function() {
      self2.streamComplete = true;
      process.nextTick(function() {
        self2.complete();
      });
    });
  }
  readFully() {
    var res = this.res, chunks = [], self2 = this;
    res.on("data", function(chunk) {
      chunks.push(chunk);
    });
    res.on("end", function() {
      process.nextTick(function() {
        var body = Buffer.concat(chunks), statusCode = res.statusCode;
        try {
          body = JSON.parse(String(body));
        } catch (e) {
          var msg = "Malformed response body from server: " + e.message;
          logger_default.logAction(self2.logger, logger_default.LOG_ERROR, "NodeCometTransport.Request.readFully()", msg);
          self2.complete(new PartialErrorInfo(msg, null, 400));
          return;
        }
        if (statusCode < 400 || Array.isArray(body)) {
          self2.complete(null, body);
          return;
        }
        var err = body.error && ErrorInfo.fromValues(body.error);
        if (!err) {
          err = new PartialErrorInfo(
            "Error response received from server: " + statusCode + ", body was: " + import_util3.default.inspect(body),
            null,
            statusCode
          );
        }
        self2.complete(err);
      });
    });
  }
  complete(err, body) {
    if (!this.requestComplete) {
      this.requestComplete = true;
      if (body)
        this.emit("data", body);
      this.emit("complete", err, body);
      if (err) {
        if (this.ondata && !this.streamComplete) {
          if (this.ondata && this.res)
            this.res.removeListener("data", this.ondata);
        }
      }
      if (this.transport) {
        this.transport.removePending();
      }
    }
  }
  abort() {
    logger_default.logAction(this.logger, logger_default.LOG_MINOR, "NodeCometTransport.Request.abort()", "");
    var timer = this.timer;
    if (timer) {
      clearTimeout(timer);
      this.timer = null;
    }
    var req = this.req;
    if (req) {
      logger_default.logAction(this.logger, logger_default.LOG_MINOR, "NodeCometTransport.Request.abort()", "aborting request");
      req.removeListener("error", this.onReqError);
      req.on("error", noop3);
      req.abort();
      this.req = null;
    }
    this.complete({ statusCode: 400, code: 80003, message: "Cancelled" });
  }
};
var nodecomettransport_default = NodeCometTransport;

// src/platform/nodejs/lib/transport/index.ts
var transport_default2 = {
  order: [TransportNames.Comet],
  bundledImplementations: {
    [TransportNames.WebSocket]: websockettransport_default,
    [TransportNames.Comet]: nodecomettransport_default
  }
};

// src/platform/nodejs/lib/util/defaults.ts
var Defaults2 = {
  connectivityCheckUrl: "https://internet-up.ably-realtime.com/is-the-internet-up.txt",
  wsConnectivityCheckUrl: "wss://ws-up.ably-realtime.com",
  /* Note: order matters here: the base transport is the leftmost one in the
   * intersection of baseTransportOrder and the transports clientOption that's supported. */
  defaultTransports: [TransportNames.WebSocket],
  restAgentOptions: { maxSockets: 40, keepAlive: true }
};
var defaults_default2 = Defaults2;

// src/platform/nodejs/index.ts
var msgpack = require_msgpack();
var Crypto = createCryptoClass(bufferutils_default);
Platform.Crypto = Crypto;
Platform.BufferUtils = bufferutils_default;
Platform.Http = http_default;
Platform.Config = config_default;
Platform.Transports = transport_default2;
Platform.WebStorage = null;
for (const clientClass of [DefaultRest, DefaultRealtime]) {
  clientClass.Crypto = Crypto;
  clientClass._MsgPack = msgpack;
}
logger_default.initLogHandlers();
Platform.Defaults = getDefaults(defaults_default2);
if (Platform.Config.agent) {
  Platform.Defaults.agent += " " + Platform.Config.agent;
}
module.exports = {
  ErrorInfo,
  Rest: DefaultRest,
  Realtime: DefaultRealtime,
  msgpack: null,
  protocolMessageFromDeserialized: fromDeserializedIncludingDependencies
};
if (typeof module.exports == "object" && typeof exports == "object") {
  var __cp = (to, from, except, desc) => {
    if ((from && typeof from === "object") || typeof from === "function") {
      for (let key of Object.getOwnPropertyNames(from)) {
        if (!Object.prototype.hasOwnProperty.call(to, key) && key !== except)
        Object.defineProperty(to, key, {
          get: () => from[key],
          enumerable: !(desc = Object.getOwnPropertyDescriptor(from, key)) || desc.enumerable,
        });
      }
    }
    return to;
  };
  module.exports = __cp(module.exports, exports);
}
return module.exports;
}))
//# sourceMappingURL=ably-node.js.map
