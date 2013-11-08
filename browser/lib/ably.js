(function() {
	window.Ably = {};
var ConnectionError = {
	disconnected: {
		statusCode: 408,
		code: 80003,
		reason: 'Connection to server temporarily unavailable'
	},
	suspended: {
		statusCode: 408,
		code: 80002,
		reason: 'Connection to server unavailable'
	},
	failed: {
		statusCode: 408,
		code: 80000,
		reason: 'Connection failed or disconnected by server'
	},
	unknownConnectionErr: {
		statusCode: 500,
		code: 50002,
		reason: 'Internal connection error'
	},
	unknownChannelErr: {
		statusCode: 500,
		code: 50001,
		reason: 'Internal channel error'
	}
};
var inherits = function(constructor, superConstructor, overrides) {
  function F() {}
  F.prototype = superConstructor.prototype;
  constructor.prototype = new F();
  if(overrides) {
    for(var prop in overrides)
      constructor.prototype[prop] = overrides[prop];
  }
};
/**
 * Support for handling 64-bit int numbers in Javascript (node.js)
 *
 * JS Numbers are IEEE-754 binary double-precision floats, which limits the
 * range of values that can be represented with integer precision to:
 *
 * 2^^53 <= N <= 2^53
 *
 * Int64 objects wrap a node Buffer that holds the 8-bytes of int64 data.  These
 * objects operate directly on the buffer which means that if they are created
 * using an existing buffer then setting the value will modify the Buffer, and
 * vice-versa.
 *
 * Internal Representation
 *
 * The internal buffer format is Big Endian.  I.e. the most-significant byte is
 * at buffer[0], the least-significant at buffer[7].  For the purposes of
 * converting to/from JS native numbers, the value is assumed to be a signed
 * integer stored in 2's complement form.
 *
 * For details about IEEE-754 see:
 * http://en.wikipedia.org/wiki/Double_precision_floating-point_format
 */

// Useful masks and values for bit twiddling
var MASK31 =  0x7fffffff, VAL31 = 0x80000000;
var MASK32 =  0xffffffff, VAL32 = 0x100000000;

// Map for converting hex octets to strings
var _HEX = [];
for (var i = 0; i < 256; i++) {
  _HEX[i] = (i > 0xF ? '' : '0') + i.toString(16);
}

//
// Int64
//

/**
 * Constructor accepts any of the following argument types:
 *
 * new Int64(buffer[, offset=0]) - Existing Array or Uint8Array with element offset
 * new Int64(string)             - Hex string (throws if n is outside int64 range)
 * new Int64(number)             - Number (throws if n is outside int64 range)
 * new Int64(hi, lo)             - Raw bits as two 32-bit values
 */
var Int64 = function(a1, a2) {
  if (a1 instanceof Array) {
    this.buffer = a1;
    this.offset = a2 || 0;
  } else {
    this.buffer = this.buffer || new Array(8);
    this.offset = 0;
    this.setValue.apply(this, arguments);
  }
};


// Max integer value that JS can accurately represent
Int64.MAX_INT = Math.pow(2, 53);

// Min integer value that JS can accurately represent
Int64.MIN_INT = -Math.pow(2, 53);

Int64.prototype = {
  /**
   * Do in-place 2's compliment.  See
   * http://en.wikipedia.org/wiki/Two's_complement
   */
  _2scomp: function() {
    var b = this.buffer, o = this.offset, carry = 1;
    for (var i = o + 7; i >= o; i--) {
      var v = (b[i] ^ 0xff) + carry;
      b[i] = v & 0xff;
      carry = v >> 8;
    }
  },

  /**
   * Set the value. Takes any of the following arguments:
   *
   * setValue(string) - A hexidecimal string
   * setValue(number) - Number (throws if n is outside int64 range)
   * setValue(hi, lo) - Raw bits as two 32-bit values
   */
  setValue: function(hi, lo) {
    var negate = false;
    if (arguments.length == 1) {
      if (typeof(hi) == 'number') {
        // Simplify bitfield retrieval by using abs() value.  We restore sign
        // later
        negate = hi < 0;
        hi = Math.abs(hi);
        lo = hi % VAL32;
        hi = hi / VAL32;
        if (hi > VAL32) throw new RangeError(hi  + ' is outside Int64 range');
        hi = hi | 0;
      } else if (typeof(hi) == 'string') {
        hi = (hi + '').replace(/^0x/, '');
        lo = hi.substr(-8);
        hi = hi.length > 8 ? hi.substr(0, hi.length - 8) : '';
        hi = parseInt(hi, 16);
        lo = parseInt(lo, 16);
      } else {
        throw new Error(hi + ' must be a Number or String');
      }
    }

    // Technically we should throw if hi or lo is outside int32 range here, but
    // it's not worth the effort. Anything past the 32'nd bit is ignored.

    // Copy bytes to buffer
    var b = this.buffer, o = this.offset;
    for (var i = 7; i >= 0; i--) {
      b[o+i] = lo & 0xff;
      lo = i == 4 ? hi : lo >>> 8;
    }

    // Restore sign of passed argument
    if (negate) this._2scomp();
  },

  /**
   * Convert to a native JS number.
   *
   * WARNING: Do not expect this value to be accurate to integer precision for
   * large (positive or negative) numbers!
   *
   * @param allowImprecise If true, no check is performed to verify the
   * returned value is accurate to integer precision.  If false, imprecise
   * numbers (very large positive or negative numbers) will be forced to +/-
   * Infinity.
   */
  toNumber: function(allowImprecise) {
    var b = this.buffer, o = this.offset;

    // Running sum of octets, doing a 2's complement
    var negate = b[0] & 0x80, x = 0, carry = 1;
    for (var i = 7, m = 1; i >= 0; i--, m *= 256) {
      var v = b[o+i];

      // 2's complement for negative numbers
      if (negate) {
        v = (v ^ 0xff) + carry;
        carry = v >> 8;
        v = v & 0xff;
      }

      x += v * m;
    }

    // Return Infinity if we've lost integer precision
    if (!allowImprecise && x >= Int64.MAX_INT) {
      return negate ? -Infinity : Infinity;
    }

    return negate ? -x : x;
  },

  /**
   * Convert to a JS Number. Returns +/-Infinity for values that can't be
   * represented to integer precision.
   */
  valueOf: function() {
    return this.toNumber(false);
  },

  /**
   * Return string value
   *
   * @param radix Just like Number#toString()'s radix
   */
  toString: function(radix) {
    return this.valueOf().toString(radix || 10);
  },

  /**
   * Return a string showing the buffer octets, with MSB on the left.
   *
   * @param sep separator string. default is '' (empty string)
   */
  toOctetString: function(sep) {
    var out = new Array(8);
    var b = this.buffer, o = this.offset;
    for (var i = 0; i < 8; i++) {
      out[i] = _HEX[b[o+i]];
    }
    return out.join(sep || '');
  },

  /**
   * Pretty output in console.log
   */
  inspect: function() {
    return '[Int64 value:' + this + ' octets:' + this.toOctetString(' ') + ']';
  }
};/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var Thrift = {
    Version: '0.8.0',
/*
    Description: 'JavaScript bindings for the Apache Thrift RPC system',
    License: 'http://www.apache.org/licenses/LICENSE-2.0',
    Homepage: 'http://thrift.apache.org',
    BugReports: 'https://issues.apache.org/jira/browse/THRIFT',
    Maintainer: 'dev@thrift.apache.org',
*/

    Type: {
        'STOP' : 0,
        'VOID' : 1,
        'BOOL' : 2,
        'BYTE' : 3,
        'I08' : 3,
        'DOUBLE' : 4,
        'I16' : 6,
        'I32' : 8,
        'I64' : 10,
        'STRING' : 11,
        'UTF7' : 11,
        'STRUCT' : 12,
        'MAP' : 13,
        'SET' : 14,
        'LIST' : 15,
        'UTF8' : 16,
        'UTF16' : 17
    },

    MessageType: {
        'CALL' : 1,
        'REPLY' : 2,
        'EXCEPTION' : 3
    },

    objectLength: function(obj) {
        var length = 0;
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                length++;
            }
        }

        return length;
    },

    inherits: function(constructor, superConstructor) {
      //Prototypal Inheritance http://javascript.crockford.com/prototypal.html
      function F() {}
      F.prototype = superConstructor.prototype;
      constructor.prototype = new F();
    }
};



Thrift.TException = function(message) {
    this.message = message;
};
Thrift.inherits(Thrift.TException, Error);
Thrift.TException.prototype.name = 'TException';

Thrift.TApplicationExceptionType = {
    'UNKNOWN' : 0,
    'UNKNOWN_METHOD' : 1,
    'INVALID_MESSAGE_TYPE' : 2,
    'WRONG_METHOD_NAME' : 3,
    'BAD_SEQUENCE_ID' : 4,
    'MISSING_RESULT' : 5,
    'INTERNAL_ERROR' : 6,
    'PROTOCOL_ERROR' : 7
};

Thrift.TApplicationException = function(message, code) {
    this.message = message;
    this.code = (code === null) ? 0 : code;
};
Thrift.inherits(Thrift.TApplicationException, Thrift.TException);
Thrift.TApplicationException.prototype.name = 'TApplicationException';

Thrift.TApplicationException.prototype.read = function(input) {
    while (1) {
        var ret = input.readFieldBegin();

        if (ret.ftype == Thrift.Type.STOP) {
            break;
        }

        var fid = ret.fid;

        switch (fid) {
            case 1:
                if (ret.ftype == Thrift.Type.STRING) {
                    ret = input.readString();
                    this.message = ret.value;
                } else {
                    ret = input.skip(ret.ftype);
                }
                break;
            case 2:
                if (ret.ftype == Thrift.Type.I32) {
                    ret = input.readI32();
                    this.code = ret.value;
                } else {
                    ret = input.skip(ret.ftype);
                }
                break;
           default:
                ret = input.skip(ret.ftype);
                break;
        }

        input.readFieldEnd();
    }

    input.readStructEnd();
};

Thrift.TApplicationException.prototype.write = function(output) {
    var xfer = 0;

    output.writeStructBegin('TApplicationException');

    if (this.message) {
        output.writeFieldBegin('message', Thrift.Type.STRING, 1);
        output.writeString(this.getMessage());
        output.writeFieldEnd();
    }

    if (this.code) {
        output.writeFieldBegin('type', Thrift.Type.I32, 2);
        output.writeI32(this.code);
        output.writeFieldEnd();
    }

    output.writeFieldStop();
    output.writeStructEnd();
};

Thrift.TApplicationException.prototype.getCode = function() {
    return this.code;
};

Thrift.TApplicationException.prototype.getMessage = function() {
    return this.message;
};

/**
 *If you do not specify a url then you must handle ajax on your own.
 *This is how to use js bindings in a async fashion.
 */
Thrift.TXHRTransport = function(url) {
    this.url = url;
    this.wpos = 0;
    this.rpos = 0;

    this.send_buf = '';
    this.recv_buf = '';
};

Thrift.TXHRTransport.prototype = {

    //Gets the browser specific XmlHttpRequest Object
    getXmlHttpRequestObject: function() {
        try { return new XMLHttpRequest(); } catch (e1) { }
        try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch (e2) { }
        try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch (e3) { }

        throw "Your browser doesn't support the XmlHttpRequest object.";
    },

    flush: function(async) {
        //async mode
        if (async || this.url === undefined || this.url === '') {
            return this.send_buf;
        }

        var xreq = this.getXmlHttpRequestObject();

        if (xreq.overrideMimeType) {
            xreq.overrideMimeType('application/json');
        }

        xreq.open('POST', this.url, false);
        xreq.send(this.send_buf);

        if (xreq.readyState != 4) {
            throw 'encountered an unknown ajax ready state: ' + xreq.readyState;
        }

        if (xreq.status != 200) {
            throw 'encountered a unknown request status: ' + xreq.status;
        }

        this.recv_buf = xreq.responseText;
        this.recv_buf_sz = this.recv_buf.length;
        this.wpos = this.recv_buf.length;
        this.rpos = 0;
    },

    jqRequest: function(client, postData, args, recv_method) {
        if (typeof jQuery === 'undefined' ||
            typeof jQuery.Deferred === 'undefined') {
            throw 'Thrift.js requires jQuery 1.5+ to use asynchronous requests';
        }

        // Deferreds
        var deferred = jQuery.Deferred();
        var completeDfd = jQuery._Deferred();
        var dfd = deferred.promise();
        dfd.success = dfd.done;
        dfd.error = dfd.fail;
        dfd.complete = completeDfd.done;

        var jqXHR = jQuery.ajax({
            url: this.url,
            data: postData,
            type: 'POST',
            cache: false,
            dataType: 'text',
            context: this,
            success: this.jqResponse,
            error: function(xhr, status, e) {
                deferred.rejectWith(client, jQuery.merge([e], xhr.tArgs));
            },
            complete: function(xhr, status) {
                completeDfd.resolveWith(client, [xhr, status]);
            }
        });

        deferred.done(jQuery.makeArray(args).pop()); //pop callback from args
        jqXHR.tArgs = args;
        jqXHR.tClient = client;
        jqXHR.tRecvFn = recv_method;
        jqXHR.tDfd = deferred;
        return dfd;
    },

    jqResponse: function(responseData, textStatus, jqXHR) {
      this.setRecvBuffer(responseData);
      try {
          var value = jqXHR.tRecvFn.call(jqXHR.tClient);
          jqXHR.tDfd.resolveWith(jqXHR, jQuery.merge([value], jqXHR.tArgs));
      } catch (ex) {
          jqXHR.tDfd.rejectWith(jqXHR, jQuery.merge([ex], jqXHR.tArgs));
      }
    },

    setRecvBuffer: function(buf) {
        this.recv_buf = buf;
        this.recv_buf_sz = this.recv_buf.length;
        this.wpos = this.recv_buf.length;
        this.rpos = 0;
    },

    isOpen: function() {
        return true;
    },

    open: function() {},

    close: function() {},

    read: function(len) {
        var avail = this.wpos - this.rpos;

        if (avail === 0) {
            return '';
        }

        var give = len;

        if (avail < len) {
            give = avail;
        }

        var ret = this.read_buf.substr(this.rpos, give);
        this.rpos += give;

        //clear buf when complete?
        return ret;
    },

    readAll: function() {
        return this.recv_buf;
    },

    write: function(buf) {
        this.send_buf = buf;
    },

    getSendBuffer: function() {
        return this.send_buf;
    }

};

Thrift.TStringTransport = function(recv_buf, callback) {
    this.send_buf = '';
    this.recv_buf = recv_buf || '';
    this.onFlush = callback;
};

Thrift.TStringTransport.prototype = {

    flush: function() {
      if(this.onFlush)
        this.onFlush(this.send_buf);
    },

    isOpen: function() {
        return true;
    },

    open: function() {},

    close: function() {},

    read: function(len) {
        return this.recv_buf;
    },

    readAll: function() {
        return this.recv_buf;
    },

    write: function(buf) {
        this.send_buf = buf;
    }

};

Thrift.Protocol = function(transport) {
    this.transport = transport;
};

Thrift.Protocol.Type = {};
Thrift.Protocol.Type[Thrift.Type.BOOL] = '"tf"';
Thrift.Protocol.Type[Thrift.Type.BYTE] = '"i8"';
Thrift.Protocol.Type[Thrift.Type.I16] = '"i16"';
Thrift.Protocol.Type[Thrift.Type.I32] = '"i32"';
Thrift.Protocol.Type[Thrift.Type.I64] = '"i64"';
Thrift.Protocol.Type[Thrift.Type.DOUBLE] = '"dbl"';
Thrift.Protocol.Type[Thrift.Type.STRUCT] = '"rec"';
Thrift.Protocol.Type[Thrift.Type.STRING] = '"str"';
Thrift.Protocol.Type[Thrift.Type.MAP] = '"map"';
Thrift.Protocol.Type[Thrift.Type.LIST] = '"lst"';
Thrift.Protocol.Type[Thrift.Type.SET] = '"set"';


Thrift.Protocol.RType = {};
Thrift.Protocol.RType.tf = Thrift.Type.BOOL;
Thrift.Protocol.RType.i8 = Thrift.Type.BYTE;
Thrift.Protocol.RType.i16 = Thrift.Type.I16;
Thrift.Protocol.RType.i32 = Thrift.Type.I32;
Thrift.Protocol.RType.i64 = Thrift.Type.I64;
Thrift.Protocol.RType.dbl = Thrift.Type.DOUBLE;
Thrift.Protocol.RType.rec = Thrift.Type.STRUCT;
Thrift.Protocol.RType.str = Thrift.Type.STRING;
Thrift.Protocol.RType.map = Thrift.Type.MAP;
Thrift.Protocol.RType.lst = Thrift.Type.LIST;
Thrift.Protocol.RType.set = Thrift.Type.SET;

Thrift.Protocol.Version = 1;

Thrift.Protocol.prototype = {

    getTransport: function() {
        return this.transport;
    },

    //Write functions
    writeMessageBegin: function(name, messageType, seqid) {
        this.tstack = [];
        this.tpos = [];

        this.tstack.push([Thrift.Protocol.Version, '"' +
            name + '"', messageType, seqid]);
    },

    writeMessageEnd: function() {
        var obj = this.tstack.pop();

        this.wobj = this.tstack.pop();
        this.wobj.push(obj);

        this.wbuf = '[' + this.wobj.join(',') + ']';

        this.transport.write(this.wbuf);
     },


    writeStructBegin: function(name) {
        this.tpos.push(this.tstack.length);
        this.tstack.push({});
    },

    writeStructEnd: function() {

        var p = this.tpos.pop();
        var struct = this.tstack[p];
        var str = '{';
        var first = true;
        for (var key in struct) {
            if (first) {
                first = false;
            } else {
                str += ',';
            }

            str += key + ':' + struct[key];
        }

        str += '}';
        this.tstack[p] = str;
    },

    writeFieldBegin: function(name, fieldType, fieldId) {
        this.tpos.push(this.tstack.length);
        this.tstack.push({ 'fieldId': '"' +
            fieldId + '"', 'fieldType': Thrift.Protocol.Type[fieldType]
        });

    },

    writeFieldEnd: function() {
        var value = this.tstack.pop();
        var fieldInfo = this.tstack.pop();

        this.tstack[this.tstack.length - 1][fieldInfo.fieldId] = '{' +
            fieldInfo.fieldType + ':' + value + '}';
        this.tpos.pop();
    },

    writeFieldStop: function() {
        //na
    },

    writeMapBegin: function(keyType, valType, size) {
        //size is invalid, we'll set it on end.
        this.tpos.push(this.tstack.length);
        this.tstack.push([Thrift.Protocol.Type[keyType],
            Thrift.Protocol.Type[valType], 0]);
    },

    writeMapEnd: function() {
        var p = this.tpos.pop();

        if (p == this.tstack.length) {
            return;
        }

        if ((this.tstack.length - p - 1) % 2 !== 0) {
            this.tstack.push('');
        }

        var size = (this.tstack.length - p - 1) / 2;

        this.tstack[p][this.tstack[p].length - 1] = size;

        var map = '}';
        var first = true;
        while (this.tstack.length > p + 1) {
            var v = this.tstack.pop();
            var k = this.tstack.pop();
            if (first) {
                first = false;
            } else {
                map = ',' + map;
            }

            if (! isNaN(k)) { k = '"' + k + '"'; } //json "keys" need to be strings
            map = k + ':' + v + map;
        }
        map = '{' + map;

        this.tstack[p].push(map);
        this.tstack[p] = '[' + this.tstack[p].join(',') + ']';
    },

    writeListBegin: function(elemType, size) {
        this.tpos.push(this.tstack.length);
        this.tstack.push([Thrift.Protocol.Type[elemType], size]);
    },

    writeListEnd: function() {
        var p = this.tpos.pop();

        while (this.tstack.length > p + 1) {
            var tmpVal = this.tstack[p + 1];
            this.tstack.splice(p + 1, 1);
            this.tstack[p].push(tmpVal);
        }

        this.tstack[p] = '[' + this.tstack[p].join(',') + ']';
    },

    writeSetBegin: function(elemType, size) {
        this.tpos.push(this.tstack.length);
        this.tstack.push([Thrift.Protocol.Type[elemType], size]);
    },

    writeSetEnd: function() {
        var p = this.tpos.pop();

        while (this.tstack.length > p + 1) {
            var tmpVal = this.tstack[p + 1];
            this.tstack.splice(p + 1, 1);
            this.tstack[p].push(tmpVal);
        }

        this.tstack[p] = '[' + this.tstack[p].join(',') + ']';
    },

    writeBool: function(value) {
        this.tstack.push(value ? 1 : 0);
    },

    writeByte: function(i8) {
        this.tstack.push(i8);
    },

    writeI16: function(i16) {
        this.tstack.push(i16);
    },

    writeI32: function(i32) {
        this.tstack.push(i32);
    },

    writeI64: function(i64) {
        this.tstack.push(i64);
    },

    writeDouble: function(dbl) {
        this.tstack.push(dbl);
    },

    writeString: function(str) {
        // We do not encode uri components for wire transfer:
        if (str === null) {
            this.tstack.push(null);
        } else {
            // concat may be slower than building a byte buffer
            var escapedString = '';
            for (var i = 0; i < str.length; i++) {
                var ch = str.charAt(i);      // a single double quote: "
                if (ch === '\"') {
                    escapedString += '\\\"'; // write out as: \"
                } else if (ch === '\\') {    // a single backslash: \
                    escapedString += '\\\\'; // write out as: \\
                /* Currently escaped forward slashes break TJSONProtocol.
                 * As it stands, we can simply pass forward slashes into
                 * our strings across the wire without being escaped.
                 * I think this is the protocol's bug, not thrift.js
                 * } else if(ch === '/') {   // a single forward slash: /
                 *  escapedString += '\\/';  // write out as \/
                 * }
                 */
                } else if (ch === '\b') {    // a single backspace: invisible
                    escapedString += '\\b';  // write out as: \b"
                } else if (ch === '\f') {    // a single formfeed: invisible
                    escapedString += '\\f';  // write out as: \f"
                } else if (ch === '\n') {    // a single newline: invisible
                    escapedString += '\\n';  // write out as: \n"
                } else if (ch === '\r') {    // a single return: invisible
                    escapedString += '\\r';  // write out as: \r"
                } else if (ch === '\t') {    // a single tab: invisible
                    escapedString += '\\t';  // write out as: \t"
                } else {
                    escapedString += ch;     // Else it need not be escaped
                }
            }
            this.tstack.push('"' + escapedString + '"');
        }
    },

    writeBinary: function(str) {
        this.writeString(str);
    },



    // Reading functions
    readMessageBegin: function(name, messageType, seqid) {
        this.rstack = [];
        this.rpos = [];

        if (typeof jQuery !== 'undefined') {
            this.robj = jQuery.parseJSON(this.transport.readAll());
        } else {
            this.robj = eval(this.transport.readAll());
        }

        var r = {};
        var version = this.robj.shift();

        if (version != Thrift.Protocol.Version) {
            throw 'Wrong thrift protocol version: ' + version;
        }

        r.fname = this.robj.shift();
        r.mtype = this.robj.shift();
        r.rseqid = this.robj.shift();


        //get to the main obj
        this.rstack.push(this.robj.shift());

        return r;
    },

    readMessageEnd: function() {
    },

    readStructBegin: function(name) {
        var r = {};
        r.fname = '';

        //incase this is an array of structs
        if (this.rstack[this.rstack.length - 1] instanceof Array) {
            this.rstack.push(this.rstack[this.rstack.length - 1].shift());
        }

        return r;
    },

    readStructEnd: function() {
        if (this.rstack[this.rstack.length - 2] instanceof Array) {
            this.rstack.pop();
        }
    },

    readFieldBegin: function() {
        var r = {};

        var fid = -1;
        var ftype = Thrift.Type.STOP;

        //get a fieldId
        for (var f in (this.rstack[this.rstack.length - 1])) {
            if (f === null) {
              continue;
            }

            fid = parseInt(f, 10);
            this.rpos.push(this.rstack.length);

            var field = this.rstack[this.rstack.length - 1][fid];

            //remove so we don't see it again
            delete this.rstack[this.rstack.length - 1][fid];

            this.rstack.push(field);

            break;
        }

        if (fid != -1) {

            //should only be 1 of these but this is the only
            //way to match a key
            for (var i in (this.rstack[this.rstack.length - 1])) {
                if (Thrift.Protocol.RType[i] === null) {
                    continue;
                }

                ftype = Thrift.Protocol.RType[i];
                this.rstack[this.rstack.length - 1] =
                    this.rstack[this.rstack.length - 1][i];
            }
        }

        r.fname = '';
        r.ftype = ftype;
        r.fid = fid;

        return r;
    },

    readFieldEnd: function() {
        var pos = this.rpos.pop();

        //get back to the right place in the stack
        while (this.rstack.length > pos) {
            this.rstack.pop();
        }

    },

    readMapBegin: function(keyType, valType, size) {
        var map = this.rstack.pop();

        var r = {};
        r.ktype = Thrift.Protocol.RType[map.shift()];
        r.vtype = Thrift.Protocol.RType[map.shift()];
        r.size = map.shift();


        this.rpos.push(this.rstack.length);
        this.rstack.push(map.shift());

        return r;
    },

    readMapEnd: function() {
        this.readFieldEnd();
    },

    readListBegin: function(elemType, size) {
        var list = this.rstack[this.rstack.length - 1];

        var r = {};
        r.etype = Thrift.Protocol.RType[list.shift()];
        r.size = list.shift();

        this.rpos.push(this.rstack.length);
        this.rstack.push(list);

        return r;
    },

    readListEnd: function() {
        this.readFieldEnd();
    },

    readSetBegin: function(elemType, size) {
        return this.readListBegin(elemType, size);
    },

    readSetEnd: function() {
        return this.readListEnd();
    },

    readBool: function() {
        var r = this.readI32();

        if (r !== null && r.value == '1') {
            r.value = true;
        } else {
            r.value = false;
        }

        return r;
    },

    readByte: function() {
        return this.readI32();
    },

    readI16: function() {
        return this.readI32();
    },

    readI32: function(f) {
        if (f === undefined) {
            f = this.rstack[this.rstack.length - 1];
        }

        var r = {};

        if (f instanceof Array) {
            if (f.length === 0) {
                r.value = undefined;
            } else {
                r.value = f.shift();
            }
        } else if (f instanceof Object) {
           for (var i in f) {
                if (i === null) {
                  continue;
                }
                this.rstack.push(f[i]);
                delete f[i];

                r.value = i;
                break;
           }
        } else {
            r.value = f;
            this.rstack.pop();
        }

        return r;
    },

    readI64: function() {
        return this.readI32();
    },

    readDouble: function() {
        return this.readI32();
    },

    readString: function() {
        var r = this.readI32();
        return r;
    },

    readBinary: function() {
        return this.readString();
    },


    //Method to arbitrarily skip over data.
    skip: function(type) {
        throw 'skip not supported yet';
    }
};

Thrift.TJSONProtocol = function(transport) {
    this.transport = transport;
    this.reset();
};

Thrift.TJSONProtocol.Type = {};
Thrift.TJSONProtocol.Type[Thrift.Type.BOOL] = 'tf';
Thrift.TJSONProtocol.Type[Thrift.Type.BYTE] = 'i8';
Thrift.TJSONProtocol.Type[Thrift.Type.I16] = 'i16';
Thrift.TJSONProtocol.Type[Thrift.Type.I32] = 'i32';
Thrift.TJSONProtocol.Type[Thrift.Type.I64] = 'i64';
Thrift.TJSONProtocol.Type[Thrift.Type.DOUBLE] = 'dbl';
Thrift.TJSONProtocol.Type[Thrift.Type.STRUCT] = 'rec';
Thrift.TJSONProtocol.Type[Thrift.Type.STRING] = 'str';
Thrift.TJSONProtocol.Type[Thrift.Type.MAP] = 'map';
Thrift.TJSONProtocol.Type[Thrift.Type.LIST] = 'lst';
Thrift.TJSONProtocol.Type[Thrift.Type.SET] = 'set';

Thrift.TJSONProtocol.getValueFromScope = function(scope) {
  var listvalue = scope.listvalue;
  return listvalue ? listvalue.shift() : scope.value;
};

Thrift.TJSONProtocol.getScopeFromScope = function(scope) {
  var listvalue = scope.listvalue;
  if(listvalue)
    scope = {value:listvalue.shift()};
  return scope;
};

Thrift.TJSONProtocol.prototype = {

    reset: function() {
      this.elementStack = [];
    },

    //Write functions
    writeMessageBegin: function(name, messageType, seqid) {
      throw new Error("TJSONProtocol: Message not supported");
    },

    writeMessageEnd: function() {
    },

    writeStructBegin: function(name) {
      var container = {};
      this.elementStack.unshift(container);
    },

    writeStructEnd: function() {
      var container = this.elementStack.shift();
      if(this.elementStack.length == 0)
        this.transport.write(JSON.stringify(container));
      else
        this.elementStack[0].value.push(container);
    },

    writeFieldBegin: function(name, fieldType, fieldId) {
      var field = {name:name, fieldType:Thrift.TJSONProtocol.Type[fieldType], fieldId:fieldId, value:[]};
      this.elementStack.unshift(field);
    },

    writeFieldEnd: function() {
      var field = this.elementStack.shift();
      var fieldValue = {};
      fieldValue[field.fieldType] = field.value[0];
      this.elementStack[0][field.fieldId] = fieldValue;
    },

    writeFieldStop: function() {
        //na
    },

    writeMapBegin: function(keyType, valType, size) {
      var map = {value:[
        Thrift.TJSONProtocol.Type[keyType],
        Thrift.TJSONProtocol.Type[valType],
        size
      ]};
      this.elementStack.unshift(map);
    },

    writeMapEnd: function() {
      var map = this.elementStack.shift();
      this.elementStack[0].value.push(map.value);
    },

    writeListBegin: function(elemType, size) {
      var list = {name:name, value:[
        Thrift.TJSONProtocol.Type[elemType],
        size
      ]};
      this.elementStack.unshift(list);
    },

    writeListEnd: function() {
      var list = this.elementStack.shift();
      this.elementStack[0].value.push(list.value);
    },

    writeSetBegin: function(elemType, size) {
      var set = {name:name, value:[
        Thrift.TJSONProtocol.Type[elemType],
        size
      ]};
      this.elementStack.unshift(set);
    },

    writeSetEnd: function() {
      var set = this.elementStack.shift();
      this.elementStack[0].value.push(set.value);
    },

    writeBool: function(value) {
      this.elementStack[0].value.push(value ? 1 : 0);
    },

    writeByte: function(i8) {
      this.elementStack[0].value.push(i8);
    },

    writeI16: function(i16) {
      this.elementStack[0].value.push(i16);
    },

    writeI32: function(i32) {
      this.elementStack[0].value.push(i32);
    },

    writeI64: function(i64) {
      this.elementStack[0].value.push(i64);
    },

    writeDouble: function(dbl) {
      this.elementStack[0].value.push(dbl);
    },

    writeString: function(str) {
      this.elementStack[0].value.push(str);
    },

    writeBinary: function(str) {
      this.elementStack[0].value.push(str);
    },

    // Reading functions
    readMessageBegin: function(name, messageType, seqid) {
      throw new Error("TJSONProtocol: Message not supported");
    },

    readMessageEnd: function() {
    },

    readStructBegin: function(name) {
      var value;
      if(this.elementStack.length == 0)
        value = JSON.parse(this.transport.readAll());
      else
        value = Thrift.TJSONProtocol.getValueFromScope(this.elementStack[0]);
        
      var fields = [];
      for(var field in value)
        fields.push(field);
      this.elementStack.unshift({
        fields:fields,
        value:value
      });
      return {
        fname:''
      }
    },

    readStructEnd: function() {
      this.elementStack.shift();
    },

    readFieldBegin: function() {
      var scope = this.elementStack[0];
      var scopeValue = Thrift.TJSONProtocol.getValueFromScope(scope);
      var fid = scope.fields.shift();
      if(!fid)
        return {fname:'', ftype:Thrift.Type.STOP};

      var fieldValue = scopeValue[fid];
      for(var soleMember in fieldValue) {
        this.elementStack.unshift({value:fieldValue[soleMember]});
        return {
          fname:'',
          fid:Number(fid),
          ftype:Thrift.Protocol.RType[soleMember]
        };
      }
      /* there are no members, which is a format error */
      throw new Error("TJSONProtocol: parse error reading field value");
    },

    readFieldEnd: function() {
      this.elementStack.shift();
    },

    readMapBegin: function(keyType, valType, size) {
      var scope = this.elementStack[0];
      var value = Thrift.TJSONProtocol.getValueFromScope(scope);
      var result = {
        ktype:Thrift.Protocol.RType[value.shift()],
        vtype:Thrift.Protocol.RType[value.shift()],
        size:value.shift()
      };
      this.elementStack.unshift({listvalue:value});
      return result;
    },

    readMapEnd: function() {
      this.elementStack.shift();
    },

    readListBegin: function(elemType, size) {
      var scope = this.elementStack[0];
      var value = Thrift.TJSONProtocol.getValueFromScope(scope);
      var result = {
        etype:Thrift.Protocol.RType[value.shift()],
        size:value.shift()
      };
      this.elementStack.unshift({listvalue:value});
      return result;
    },

    readListEnd: function() {
      this.elementStack.shift();
    },

    readSetBegin: function(elemType, size) {
      var scope = this.elementStack[0];
      var value = Thrift.TJSONProtocol.getValueFromScope(scope);
      var result = {
        etype:Thrift.Protocol.RType[value.shift()],
        size:value.shift()
      };
      this.elementStack.unshift({listvalue:value});
      return result;
    },

    readSetEnd: function() {
      this.elementStack.shift();
    },

    readBool: function() {
      return !!Thrift.TJSONProtocol.getValueFromScope(this.elementStack[0]);
    },

    readByte: function() {
      return Thrift.TJSONProtocol.getValueFromScope(this.elementStack[0]);
    },

    readI16: function() {
      return Thrift.TJSONProtocol.getValueFromScope(this.elementStack[0]);
    },

    readI32: function(f) {
      return Thrift.TJSONProtocol.getValueFromScope(this.elementStack[0]);
    },

    readI64: function() {
      return Thrift.TJSONProtocol.getValueFromScope(this.elementStack[0]);
    },

    readDouble: function() {
      return Thrift.TJSONProtocol.getValueFromScope(this.elementStack[0]);
    },

    readString: function() {
      return Thrift.TJSONProtocol.getValueFromScope(this.elementStack[0]);
    },

    readBinary: function() {
      return Thrift.TJSONProtocol.getValueFromScope(this.elementStack[0]);
    },

    flush: function() {
      this.transport.flush();
    }
};
var Utf8 = {
  encode: function(string, view, off) {
    var pos = off;
    for(var n = 0; n < string.length; n++) {
      var c = string.charCodeAt(n);
      if (c < 128) {
        view.setInt8(pos++, c);
      } else if((c > 127) && (c < 2048)) {
        view.setInt8(pos++, (c >> 6) | 192);
        view.setInt8(pos++, (c & 63) | 128);
      } else {
        view.setInt8(pos++, (c >> 12) | 224);
        view.setInt8(pos++, ((c >> 6) & 63) | 128);
        view.setInt8(pos++, (c & 63) | 128);
      }
    }
    return (pos - off);
  },
  decode : function(view, off, length) {
    var string = "";
    var i = off;
    length += off;
    var c = c1 = c2 = 0;
    while ( i < length ) {
      c = view.getInt8(i++);
      if (c < 128) {
        string += String.fromCharCode(c);
      } else if((c > 191) && (c < 224)) {
        c2 = view.getInt8(i++);
        string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
      } else {
        c2 = view.getInt8(i++);
        c3 = view.getInt8(i++);
        string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
      }
    }
    return string;
  }
}

/* constructor simply creates a buffer of a specified length */
var Buffer = function(length) {
  this.offset = 0;
  this.length = length;
  if(length) {
    var buf = this.buf = new ArrayBuffer(length);
    this.view = new DataView(buf);
  }
};

Buffer.prototype = {
  getArray: function() {
    if(!this.array)
      this.array = new Uint8Array(this.buf, this.offset, this.length);
    return this.array;
  },
  slice: function(start, end) {
    start = start || 0;
    end = end || this.length;
    var result = new Buffer();
    var length = result.length = end - start;
    var offset = result.offset = this.offset + start;
    var buf = result.buf = this.buf;
    result.view = new DataView(buf, offset, length);
    return result;
  },
  getInt8: function(off) {
    return this.view.getInt8(off);
  },
  getInt16: function(off) {
    return this.view.getInt16(off, false);
  },
  getInt32: function(off) {
    return this.view.getInt32(off, false);
  },
  getInt64: function(off) {
    var hi = this.view.getInt32(off, false);
    var lo = this.view.getUint32(off + 4, false);
    return new Int64(hi, lo);
  },
  getFloat64: function(off) {
    return this.view.getFloat64(off, false);
  },
  getUtf8String: function(off, utflen) {
    return Utf8.decode(this.view, off, utflen);
  },
  setInt8: function(off, v) {
    this.view.setInt8(off, v);
  },
  setInt16: function(off, v) {
    this.view.setInt16(off, v, false);
  },
  setInt32: function(off, v) {
    this.view.setInt32(off, v, false);
  },
  setInt64: function(off, v) {
    this.getArray().set(v.buffer, off);
  },
  setFloat64: function(off, v) {
    this.view.setFloat64(off, v, false);
  },
  setBuffer: function(off, v) {
    this.getArray().set(v.getArray(), off);
  },
  setUtf8String: function(off, v) {
    return Utf8.encode(v, this.view, off);
  },
  inspect: function() {
    var result = 'length: ' + this.length + '\n';
    var idx = 0;
    while(idx < this.length) {
      for(var i = 0; (idx < this.length) && (i < 32); i++)
        result += this.view.getInt8(idx++).toString(16) + ' ';
      result += '\n';
    }
    return result;
  }
};

var CheckedBuffer = Thrift.CheckedBuffer = function(length) {
  Buffer.call(this, length);
};
inherits(CheckedBuffer, Buffer, {
  grow: function(extra) {
    extra = extra || 0;
    var len = this.length + Math.max(extra, this.length*0.41);
    var src = getArray();
    this.buf = new ArrayBuffer(len);
    this.view = new DataView(this.buf);
    this.getArray().set(src);
    this.offset = 0;
    this.length = len;
  },
  checkAvailable: function(off, extra) {
    if(off + extra >= this.length)
      this.grow(extra);
  },
  setInt8: function(off, v) {
    this.checkAvailable(1);
    this.view.setInt8(off, v);
  },
  setInt16: function(off, v) {
    this.checkAvailable(2);
    this.view.setInt16(off, v, false);
  },
  setInt32: function(off, v) {
    this.checkAvailable(4);
    this.view.setInt32(off, v, false);
  },
  setInt64: function(off, v) {
    this.checkAvailable(8);
    this.getArray().set(v.buffer, off);
  },
  setFloat64: function(off, v) {
    this.checkAvailable(8);
    this.view.setFloat64(off, v, false);
  },
  setBuffer: function(off, v) {
    this.checkAvailable(v.length);
    this.getArray().set(v.getArray(), off);
  },
  setUtf8String: function(off, v) {
    while(true) {
      try {
        return Utf8.encode(v, this.view, off);
      } catch(e) {
        this.grow();
      }
    }
  }
});
/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var Type = Thrift.Type;

var UNKNOWN = 0,
    INVALID_DATA = 1,
    NEGATIVE_SIZE = 2,
    SIZE_LIMIT = 3,
    BAD_VERSION = 4;

var TProtocolException = function(type, message) {
  Error.call(this, message);
  this.name = 'TProtocolException';
  this.type = type;
};
inherits(TProtocolException, Error);

var TBinaryProtocol = Thrift.TBinaryProtocol = function(trans, strictRead, strictWrite) {
  this.trans = trans;
  this.strictRead = (strictRead !== undefined ? strictRead : false);
  this.strictWrite = (strictWrite !== undefined ? strictWrite : true);
};

TBinaryProtocol.prototype.flush = function() {
  return this.trans.flush();
};

// NastyHaxx. JavaScript forces hex constants to be
// positive, converting this into a long. If we hardcode the int value
// instead it'll stay in 32 bit-land.

var VERSION_MASK = -65536, // 0xffff0000
    VERSION_1 = -2147418112, // 0x80010000
    TYPE_MASK = 0x000000ff;

TBinaryProtocol.prototype.writeMessageBegin = function(name, type, seqid) {
    if (this.strictWrite) {
      this.writeI32(VERSION_1 | type);
      this.writeString(name);
      this.writeI32(seqid);
    } else {
      this.writeString(name);
      this.writeByte(type);
      this.writeI32(seqid);
    }
};

TBinaryProtocol.prototype.writeMessageEnd = function() {
};

TBinaryProtocol.prototype.writeStructBegin = function(name) {
};

TBinaryProtocol.prototype.writeStructEnd = function() {
};

TBinaryProtocol.prototype.writeFieldBegin = function(name, type, id) {
  this.writeByte(type);
  this.writeI16(id);
};

TBinaryProtocol.prototype.writeFieldEnd = function() {
};

TBinaryProtocol.prototype.writeFieldStop = function() {
  this.writeByte(Type.STOP);
};

TBinaryProtocol.prototype.writeMapBegin = function(ktype, vtype, size) {
  this.writeByte(ktype);
  this.writeByte(vtype);
  this.writeI32(size);
};

TBinaryProtocol.prototype.writeMapEnd = function() {
};

TBinaryProtocol.prototype.writeListBegin = function(etype, size) {
  this.writeByte(etype);
  this.writeI32(size);
};

TBinaryProtocol.prototype.writeListEnd = function() {
};

TBinaryProtocol.prototype.writeSetBegin = function(etype, size) {
  this.writeByte(etype);
  this.writeI32(size);
};

TBinaryProtocol.prototype.writeSetEnd = function() {
};

TBinaryProtocol.prototype.writeBool = function(bool) {
  this.writeByte(bool ? 1 : 0);
};

TBinaryProtocol.prototype.writeByte = function(i8) {
  this.trans.writeByte(i8);
};

TBinaryProtocol.prototype.writeI16 = function(i16) {
  this.trans.writeI16(i16);
};

TBinaryProtocol.prototype.writeI32 = function(i32) {
  this.trans.writeI32(i32);
};

TBinaryProtocol.prototype.writeI64 = function(i64) {
  if (i64.buffer) {
    this.trans.writeI64(i64);
  } else {
    this.trans.writeI64(new Int64(i64))
  }
};

TBinaryProtocol.prototype.writeDouble = function(dub) {
  this.trans.writeDouble(dub);
};

TBinaryProtocol.prototype.writeString = function(arg) {
  this.trans.writeWithLength(arg);
};

TBinaryProtocol.prototype.writeBinary = function(arg) {
  this.trans.writeWithLength(arg);
};

TBinaryProtocol.prototype.readMessageBegin = function() {
  var sz = this.readI32();
  var type, name, seqid;

  if (sz < 0) {
    var version = sz & VERSION_MASK;
    if (version != VERSION_1) {
      console.log("BAD: " + version);
      throw TProtocolException(BAD_VERSION, "Bad version in readMessageBegin: " + sz);
    }
    type = sz & TYPE_MASK;
    name = this.readString();
    seqid = this.readI32();
  } else {
    if (this.strictRead) {
      throw TProtocolException(BAD_VERSION, "No protocol version header");
    }
    name = this.trans.read(sz);
    type = this.readByte();
    seqid = this.readI32();
  }
  return {fname: name, mtype: type, rseqid: seqid};
};

TBinaryProtocol.prototype.readMessageEnd = function() {
};

TBinaryProtocol.prototype.readStructBegin = function() {
  return {fname: ''}
};

TBinaryProtocol.prototype.readStructEnd = function() {
};

TBinaryProtocol.prototype.readFieldBegin = function() {
  var type = this.readByte();
  if (type == Type.STOP) {
    return {fname: null, ftype: type, fid: 0};
  }
  var id = this.readI16();
  return {fname: null, ftype: type, fid: id};
};

TBinaryProtocol.prototype.readFieldEnd = function() {
};

TBinaryProtocol.prototype.readMapBegin = function() {
  var ktype = this.readByte();
  var vtype = this.readByte();
  var size = this.readI32();
  return {ktype: ktype, vtype: vtype, size: size};
};

TBinaryProtocol.prototype.readMapEnd = function() {
};

TBinaryProtocol.prototype.readListBegin = function() {
  var etype = this.readByte();
  var size = this.readI32();
  return {etype: etype, size: size};
};

TBinaryProtocol.prototype.readListEnd = function() {
};

TBinaryProtocol.prototype.readSetBegin = function() {
  var etype = this.readByte();
  var size = this.readI32();
  return {etype: etype, size: size};
};

TBinaryProtocol.prototype.readSetEnd = function() {
};

TBinaryProtocol.prototype.readBool = function() {
  var i8 = this.readByte();
  if (i8 == 0) {
    return false;
  }
  return true;
};

TBinaryProtocol.prototype.readByte = function() {
  return this.trans.readByte();
};

TBinaryProtocol.prototype.readI16 = function() {
  return this.trans.readI16();
};

TBinaryProtocol.prototype.readI32 = function() {
  return this.trans.readI32();
};

TBinaryProtocol.prototype.readI64 = function() {
  return this.trans.readI64();
};

TBinaryProtocol.prototype.readDouble = function() {
  return this.trans.readDouble();
};

TBinaryProtocol.prototype.readBinary = function() {
  var len = this.readI32();
  return this.trans.read(len);
};

TBinaryProtocol.prototype.readString = function() {
  var len = this.readI32();
  return this.trans.readString(len);
};

TBinaryProtocol.prototype.getTransport = function() {
  return this.trans;
};

TBinaryProtocol.prototype.skip = function(type) {
  // console.log("skip: " + type);
  switch (type) {
    case Type.STOP:
      return;
    case Type.BOOL:
      this.readBool();
      break;
    case Type.BYTE:
      this.readByte();
      break;
    case Type.I16:
      this.readI16();
      break;
    case Type.I32:
      this.readI32();
      break;
    case Type.I64:
      this.readI64();
      break;
    case Type.DOUBLE:
      this.readDouble();
      break;
    case Type.STRING:
      this.readString();
      break;
    case Type.STRUCT:
      this.readStructBegin();
      while (true) {
        var r = this.readFieldBegin();
        if (r.ftype === Type.STOP) {
          break;
        }
        this.skip(r.ftype);
        this.readFieldEnd();
      }
      this.readStructEnd();
      break;
    case Type.MAP:
      var r = this.readMapBegin();
      for (var i = 0; i < r.size; ++i) {
        this.skip(r.ktype);
        this.skip(r.vtype);
      }
      this.readMapEnd();
      break;
    case Type.SET:
      var r = this.readSetBegin();
      for (var i = 0; i < r.size; ++i) {
        this.skip(r.etype);
      }
      this.readSetEnd();
      break;
    case Type.LIST:
      var r = this.readListBegin();
      for (var i = 0; i < r.size; ++i) {
        this.skip(r.etype);
      }
      this.readListEnd();
      break;
    default:
      throw Error("Invalid type: " + type);
  }
};
var emptyBuf = new Buffer(0);

var InputBufferUnderrunError = function() {
};

var TTransport = Thrift.TTransport = function(buffer, callback) {
  this.buf = buffer || emptyBuf;
  this.onFlush = callback;
  this.reset();
};

TTransport.receiver = function(callback) {
  return function(data) {
    callback(new TTransport(data));
  };
};

TTransport.prototype = {
  commitPosition: function(){},
  rollbackPosition: function(){},

  reset: function() {
    this.pos = 0;
  },

  // TODO: Implement open/close support
  isOpen: function() {return true;},
  open: function() {},
  close: function() {},

  read: function(len) { // this function will be used for each frames.
    var end = this.pos + len;

    if (this.buf.length < end) {
      throw new Error('read(' + len + ') failed - not enough data');
    }

    var buf = this.buf.slice(this.pos, end);
    this.pos = end;
    return buf;
  },

  readByte: function() {
    return this.buf.getInt8(this.pos++);
  },

  readI16: function() {
    var i16 = this.buf.getInt16(this.pos);
    this.pos += 2;
    return i16;
  },

  readI32: function() {
    var i32 = this.buf.getInt32(this.pos);
    this.pos += 4;
    return i32;
  },

  readDouble: function() {
    var d = this.buf.getFloat64(this.pos);
    this.pos += 8;
    return d;
  },

  readString: function(len) {
    var str = this.buf.getUtf8String(this.pos, len);
    this.pos += len;
    return str;
  },

  readAll: function() {
    return this.buf;
  },
  
  writeByte: function(v) {
    this.buf.setInt8(this.pos++, v);
  },

  writeI16: function(v) {
    this.buf.setInt16(this.pos, v);
    this.pos += 2;
  },

  writeI32: function(v) {
    this.buf.setInt32(this.pos, v);
    this.pos += 4;
  },

  writeI64: function(v) {
    this.buf.setInt64(this.pos, v);
    this.pos += 8;
  },

  writeDouble: function(v) {
    this.buf.setFloat64(this.pos, v);
    this.pos += 8;
  },

  write: function(buf) {
    if (typeof(buf) === 'string') {
      this.pos += this.setUtf8String(this.pos, buf);
    } else {
      this.setBuffer(this.pos, buf);
      this.pos += buf.length;
    }
  },

  writeWithLength: function(buf) {
    var len;
    if (typeof(buf) === 'string') {
      len = this.buf.setUtf8String(this.pos + 4, buf);
    } else {
      this.setBuffer(this.pos + 4, buf);
      len = buf.length;
    }
    this.buf.setInt32(this.pos, len);
    this.pos += len + 4;
  },

  flush: function(flushCallback) {
    flushCallback = flushCallback || this.onFlush;
    if(flushCallback) {
      var out = this.buf.slice(0, this.pos);
      flushCallback(out);
    }
  }
};

var TFramedTransport = Thrift.TFramedTransport = function(buffer, callback) {
  TTransport.call(this, buffer, callback);
};

TFramedTransport.receiver = function(callback) {
  var frameLeft = 0,
      framePos = 0,
      frame = null;
  var residual = null;

  return function(data) {
    // Prepend any residual data from our previous read
    if (residual) {
      var dat = new Buffer(data.length + residual.length);
      residual.copy(dat, 0, 0);
      data.copy(dat, residual.length, 0);
      residual = null;
    }

    // framed transport
    while (data.length) {
      if (frameLeft === 0) {
        // TODO assumes we have all 4 bytes
        if (data.length < 4) {
          console.log("Expecting > 4 bytes, found only " + data.length);
          residual = data;
          break;
          //throw Error("Expecting > 4 bytes, found only " + data.length);
        }
        frameLeft = binary.readI32(data, 0);
        frame = new Buffer(frameLeft);
        framePos = 0;
        data = data.slice(4, data.length);
      }

      if (data.length >= frameLeft) {
        data.copy(frame, framePos, 0, frameLeft);
        data = data.slice(frameLeft, data.length);

        frameLeft = 0;
        callback(new TFramedTransport(frame));
      } else if (data.length) {
        data.copy(frame, framePos, 0, data.length);
        frameLeft -= data.length;
        framePos += data.length;
        data = data.slice(data.length, data.length);
      }
    }
  };
};

inherits(TFramedTransport, TTransport, {
  flush: function() {
    var that = this;
    // TODO: optimize this better, allocate one buffer instead of both:
    var framedBuffer = function(out) {
      if(that.onFlush) {
        var msg = new Buffer(out.length + 4);
        binary.writeI32(msg, out.length);
        out.copy(msg, 4, 0, out.length);
        that.onFlush(msg);
      }
    };
    TTransport.prototype.flush.call(this, framedBuffer);
  }
});
/* declarations to ensure these variables do not go into global scope */
var TData, TPresence, TMessage, TChannelMessage, TProtocolMessage;
var clientmessage_types = {
	TData: TData,
	TPresence: TPresence,
	TMessage: TMessage,
	TChannelMessage: TChannelMessage,
	TProtocolMessage: TProtocolMessage
};
//
// Autogenerated by Thrift Compiler (0.8.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//

TAction = {
'HEARTBEAT' : 0,
'ACK' : 1,
'NACK' : 2,
'CONNECT' : 3,
'CONNECTED' : 4,
'DISCONNECT' : 5,
'DISCONNECTED' : 6,
'CLOSE' : 7,
'CLOSED' : 8,
'ERROR' : 9,
'ATTACH' : 10,
'ATTACHED' : 11,
'DETACH' : 12,
'DETACHED' : 13,
'PRESENCE' : 14,
'MESSAGE' : 15
};
TType = {
'NONE' : 0,
'TRUE' : 1,
'FALSE' : 2,
'INT32' : 3,
'INT64' : 4,
'DOUBLE' : 5,
'STRING' : 6,
'BUFFER' : 7,
'JSONARRAY' : 8,
'JSONOBJECT' : 9
};
TFlags = {
'SYNC_TIME' : 0
};
TPresenceState = {
'ENTER' : 0,
'LEAVE' : 1,
'UPDATE' : 2
};
TError = function(args) {
  this.statusCode = undefined;
  this.code = undefined;
  this.reason = undefined;
  if (args) {
    if (args.statusCode !== undefined) {
      this.statusCode = args.statusCode;
    }
    if (args.code !== undefined) {
      this.code = args.code;
    }
    if (args.reason !== undefined) {
      this.reason = args.reason;
    }
  }
};
TError.prototype = {};
TError.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.I16) {
        this.statusCode = input.readI16();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.I16) {
        this.code = input.readI16();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.STRING) {
        this.reason = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

TError.prototype.write = function(output) {
  output.writeStructBegin('TError');
  if (this.statusCode !== undefined) {
    output.writeFieldBegin('statusCode', Thrift.Type.I16, 1);
    output.writeI16(this.statusCode);
    output.writeFieldEnd();
  }
  if (this.code !== undefined) {
    output.writeFieldBegin('code', Thrift.Type.I16, 2);
    output.writeI16(this.code);
    output.writeFieldEnd();
  }
  if (this.reason !== undefined) {
    output.writeFieldBegin('reason', Thrift.Type.STRING, 3);
    output.writeString(this.reason);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

TData = function(args) {
  this.type = undefined;
  this.i32Data = undefined;
  this.i64Data = undefined;
  this.doubleData = undefined;
  this.stringData = undefined;
  this.binaryData = undefined;
  this.cipherData = undefined;
  if (args) {
    if (args.type !== undefined) {
      this.type = args.type;
    }
    if (args.i32Data !== undefined) {
      this.i32Data = args.i32Data;
    }
    if (args.i64Data !== undefined) {
      this.i64Data = args.i64Data;
    }
    if (args.doubleData !== undefined) {
      this.doubleData = args.doubleData;
    }
    if (args.stringData !== undefined) {
      this.stringData = args.stringData;
    }
    if (args.binaryData !== undefined) {
      this.binaryData = args.binaryData;
    }
    if (args.cipherData !== undefined) {
      this.cipherData = args.cipherData;
    }
  }
};
TData.prototype = {};
TData.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.I32) {
        this.type = input.readI32();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.I32) {
        this.i32Data = input.readI32();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.I64) {
        this.i64Data = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.DOUBLE) {
        this.doubleData = input.readDouble();
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.STRING) {
        this.stringData = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 6:
      if (ftype == Thrift.Type.STRING) {
        this.binaryData = input.readBinary();
      } else {
        input.skip(ftype);
      }
      break;
      case 7:
      if (ftype == Thrift.Type.STRING) {
        this.cipherData = input.readBinary();
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

TData.prototype.write = function(output) {
  output.writeStructBegin('TData');
  if (this.type !== undefined) {
    output.writeFieldBegin('type', Thrift.Type.I32, 1);
    output.writeI32(this.type);
    output.writeFieldEnd();
  }
  if (this.i32Data !== undefined) {
    output.writeFieldBegin('i32Data', Thrift.Type.I32, 2);
    output.writeI32(this.i32Data);
    output.writeFieldEnd();
  }
  if (this.i64Data !== undefined) {
    output.writeFieldBegin('i64Data', Thrift.Type.I64, 3);
    output.writeI64(this.i64Data);
    output.writeFieldEnd();
  }
  if (this.doubleData !== undefined) {
    output.writeFieldBegin('doubleData', Thrift.Type.DOUBLE, 4);
    output.writeDouble(this.doubleData);
    output.writeFieldEnd();
  }
  if (this.stringData !== undefined) {
    output.writeFieldBegin('stringData', Thrift.Type.STRING, 5);
    output.writeString(this.stringData);
    output.writeFieldEnd();
  }
  if (this.binaryData !== undefined) {
    output.writeFieldBegin('binaryData', Thrift.Type.STRING, 6);
    output.writeString(this.binaryData);
    output.writeFieldEnd();
  }
  if (this.cipherData !== undefined) {
    output.writeFieldBegin('cipherData', Thrift.Type.STRING, 7);
    output.writeString(this.cipherData);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

TPresence = function(args) {
  this.state = undefined;
  this.clientId = undefined;
  this.clientData = undefined;
  this.memberId = undefined;
  this.inheritMemberId = undefined;
  this.connectionId = undefined;
  this.instanceId = undefined;
  if (args) {
    if (args.state !== undefined) {
      this.state = args.state;
    }
    if (args.clientId !== undefined) {
      this.clientId = args.clientId;
    }
    if (args.clientData !== undefined) {
      this.clientData = args.clientData;
    }
    if (args.memberId !== undefined) {
      this.memberId = args.memberId;
    }
    if (args.inheritMemberId !== undefined) {
      this.inheritMemberId = args.inheritMemberId;
    }
    if (args.connectionId !== undefined) {
      this.connectionId = args.connectionId;
    }
    if (args.instanceId !== undefined) {
      this.instanceId = args.instanceId;
    }
  }
};
TPresence.prototype = {};
TPresence.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.I32) {
        this.state = input.readI32();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.clientId = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.STRUCT) {
        this.clientData = new TData();
        this.clientData.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.STRING) {
        this.memberId = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.STRING) {
        this.inheritMemberId = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 6:
      if (ftype == Thrift.Type.STRING) {
        this.connectionId = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 7:
      if (ftype == Thrift.Type.STRING) {
        this.instanceId = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

TPresence.prototype.write = function(output) {
  output.writeStructBegin('TPresence');
  if (this.state !== undefined) {
    output.writeFieldBegin('state', Thrift.Type.I32, 1);
    output.writeI32(this.state);
    output.writeFieldEnd();
  }
  if (this.clientId !== undefined) {
    output.writeFieldBegin('clientId', Thrift.Type.STRING, 2);
    output.writeString(this.clientId);
    output.writeFieldEnd();
  }
  if (this.clientData !== undefined) {
    output.writeFieldBegin('clientData', Thrift.Type.STRUCT, 3);
    this.clientData.write(output);
    output.writeFieldEnd();
  }
  if (this.memberId !== undefined) {
    output.writeFieldBegin('memberId', Thrift.Type.STRING, 4);
    output.writeString(this.memberId);
    output.writeFieldEnd();
  }
  if (this.inheritMemberId !== undefined) {
    output.writeFieldBegin('inheritMemberId', Thrift.Type.STRING, 5);
    output.writeString(this.inheritMemberId);
    output.writeFieldEnd();
  }
  if (this.connectionId !== undefined) {
    output.writeFieldBegin('connectionId', Thrift.Type.STRING, 6);
    output.writeString(this.connectionId);
    output.writeFieldEnd();
  }
  if (this.instanceId !== undefined) {
    output.writeFieldBegin('instanceId', Thrift.Type.STRING, 7);
    output.writeString(this.instanceId);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

TPresenceArray = function(args) {
  this.items = undefined;
  if (args) {
    if (args.items !== undefined) {
      this.items = args.items;
    }
  }
};
TPresenceArray.prototype = {};
TPresenceArray.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.LIST) {
        var _size0 = 0;
        var _rtmp34;
        this.items = [];
        var _etype3 = 0;
        _rtmp34 = input.readListBegin();
        _etype3 = _rtmp34.etype;
        _size0 = _rtmp34.size;
        for (var _i5 = 0; _i5 < _size0; ++_i5)
        {
          var elem6 = undefined;
          elem6 = new TPresence();
          elem6.read(input);
          this.items.push(elem6);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

TPresenceArray.prototype.write = function(output) {
  output.writeStructBegin('TPresenceArray');
  if (this.items !== undefined) {
    output.writeFieldBegin('items', Thrift.Type.LIST, 1);
    output.writeListBegin(Thrift.Type.STRUCT, this.items.length);
    for (var iter7 in this.items)
    {
      if (this.items.hasOwnProperty(iter7))
      {
        iter7 = this.items[iter7];
        iter7.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

TMessage = function(args) {
  this.name = undefined;
  this.clientId = undefined;
  this.timestamp = undefined;
  this.data = undefined;
  this.tags = undefined;
  if (args) {
    if (args.name !== undefined) {
      this.name = args.name;
    }
    if (args.clientId !== undefined) {
      this.clientId = args.clientId;
    }
    if (args.timestamp !== undefined) {
      this.timestamp = args.timestamp;
    }
    if (args.data !== undefined) {
      this.data = args.data;
    }
    if (args.tags !== undefined) {
      this.tags = args.tags;
    }
  }
};
TMessage.prototype = {};
TMessage.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRING) {
        this.name = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.clientId = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.I64) {
        this.timestamp = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.STRUCT) {
        this.data = new TData();
        this.data.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.LIST) {
        var _size8 = 0;
        var _rtmp312;
        this.tags = [];
        var _etype11 = 0;
        _rtmp312 = input.readListBegin();
        _etype11 = _rtmp312.etype;
        _size8 = _rtmp312.size;
        for (var _i13 = 0; _i13 < _size8; ++_i13)
        {
          var elem14 = undefined;
          elem14 = input.readString();
          this.tags.push(elem14);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

TMessage.prototype.write = function(output) {
  output.writeStructBegin('TMessage');
  if (this.name !== undefined) {
    output.writeFieldBegin('name', Thrift.Type.STRING, 1);
    output.writeString(this.name);
    output.writeFieldEnd();
  }
  if (this.clientId !== undefined) {
    output.writeFieldBegin('clientId', Thrift.Type.STRING, 2);
    output.writeString(this.clientId);
    output.writeFieldEnd();
  }
  if (this.timestamp !== undefined) {
    output.writeFieldBegin('timestamp', Thrift.Type.I64, 3);
    output.writeI64(this.timestamp);
    output.writeFieldEnd();
  }
  if (this.data !== undefined) {
    output.writeFieldBegin('data', Thrift.Type.STRUCT, 4);
    this.data.write(output);
    output.writeFieldEnd();
  }
  if (this.tags !== undefined) {
    output.writeFieldBegin('tags', Thrift.Type.LIST, 5);
    output.writeListBegin(Thrift.Type.STRING, this.tags.length);
    for (var iter15 in this.tags)
    {
      if (this.tags.hasOwnProperty(iter15))
      {
        iter15 = this.tags[iter15];
        output.writeString(iter15);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

TMessageArray = function(args) {
  this.items = undefined;
  if (args) {
    if (args.items !== undefined) {
      this.items = args.items;
    }
  }
};
TMessageArray.prototype = {};
TMessageArray.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.LIST) {
        var _size16 = 0;
        var _rtmp320;
        this.items = [];
        var _etype19 = 0;
        _rtmp320 = input.readListBegin();
        _etype19 = _rtmp320.etype;
        _size16 = _rtmp320.size;
        for (var _i21 = 0; _i21 < _size16; ++_i21)
        {
          var elem22 = undefined;
          elem22 = new TMessage();
          elem22.read(input);
          this.items.push(elem22);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

TMessageArray.prototype.write = function(output) {
  output.writeStructBegin('TMessageArray');
  if (this.items !== undefined) {
    output.writeFieldBegin('items', Thrift.Type.LIST, 1);
    output.writeListBegin(Thrift.Type.STRUCT, this.items.length);
    for (var iter23 in this.items)
    {
      if (this.items.hasOwnProperty(iter23))
      {
        iter23 = this.items[iter23];
        iter23.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

TProtocolMessage = function(args) {
  this.action = undefined;
  this.flags = undefined;
  this.count = undefined;
  this.error = undefined;
  this.applicationId = undefined;
  this.connectionId = undefined;
  this.connectionSerial = undefined;
  this.channel = undefined;
  this.channelSerial = undefined;
  this.msgSerial = undefined;
  this.timestamp = undefined;
  this.messages = undefined;
  this.presence = undefined;
  if (args) {
    if (args.action !== undefined) {
      this.action = args.action;
    }
    if (args.flags !== undefined) {
      this.flags = args.flags;
    }
    if (args.count !== undefined) {
      this.count = args.count;
    }
    if (args.error !== undefined) {
      this.error = args.error;
    }
    if (args.applicationId !== undefined) {
      this.applicationId = args.applicationId;
    }
    if (args.connectionId !== undefined) {
      this.connectionId = args.connectionId;
    }
    if (args.connectionSerial !== undefined) {
      this.connectionSerial = args.connectionSerial;
    }
    if (args.channel !== undefined) {
      this.channel = args.channel;
    }
    if (args.channelSerial !== undefined) {
      this.channelSerial = args.channelSerial;
    }
    if (args.msgSerial !== undefined) {
      this.msgSerial = args.msgSerial;
    }
    if (args.timestamp !== undefined) {
      this.timestamp = args.timestamp;
    }
    if (args.messages !== undefined) {
      this.messages = args.messages;
    }
    if (args.presence !== undefined) {
      this.presence = args.presence;
    }
  }
};
TProtocolMessage.prototype = {};
TProtocolMessage.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.I32) {
        this.action = input.readI32();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.BYTE) {
        this.flags = input.readByte();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.I32) {
        this.count = input.readI32();
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.STRUCT) {
        this.error = new TError();
        this.error.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.STRING) {
        this.applicationId = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 6:
      if (ftype == Thrift.Type.STRING) {
        this.connectionId = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 7:
      if (ftype == Thrift.Type.I64) {
        this.connectionSerial = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 8:
      if (ftype == Thrift.Type.STRING) {
        this.channel = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 9:
      if (ftype == Thrift.Type.STRING) {
        this.channelSerial = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 10:
      if (ftype == Thrift.Type.I64) {
        this.msgSerial = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 11:
      if (ftype == Thrift.Type.I64) {
        this.timestamp = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 12:
      if (ftype == Thrift.Type.LIST) {
        var _size24 = 0;
        var _rtmp328;
        this.messages = [];
        var _etype27 = 0;
        _rtmp328 = input.readListBegin();
        _etype27 = _rtmp328.etype;
        _size24 = _rtmp328.size;
        for (var _i29 = 0; _i29 < _size24; ++_i29)
        {
          var elem30 = undefined;
          elem30 = new TMessage();
          elem30.read(input);
          this.messages.push(elem30);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 13:
      if (ftype == Thrift.Type.LIST) {
        var _size31 = 0;
        var _rtmp335;
        this.presence = [];
        var _etype34 = 0;
        _rtmp335 = input.readListBegin();
        _etype34 = _rtmp335.etype;
        _size31 = _rtmp335.size;
        for (var _i36 = 0; _i36 < _size31; ++_i36)
        {
          var elem37 = undefined;
          elem37 = new TPresence();
          elem37.read(input);
          this.presence.push(elem37);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

TProtocolMessage.prototype.write = function(output) {
  output.writeStructBegin('TProtocolMessage');
  if (this.action !== undefined) {
    output.writeFieldBegin('action', Thrift.Type.I32, 1);
    output.writeI32(this.action);
    output.writeFieldEnd();
  }
  if (this.flags !== undefined) {
    output.writeFieldBegin('flags', Thrift.Type.BYTE, 2);
    output.writeByte(this.flags);
    output.writeFieldEnd();
  }
  if (this.count !== undefined) {
    output.writeFieldBegin('count', Thrift.Type.I32, 3);
    output.writeI32(this.count);
    output.writeFieldEnd();
  }
  if (this.error !== undefined) {
    output.writeFieldBegin('error', Thrift.Type.STRUCT, 4);
    this.error.write(output);
    output.writeFieldEnd();
  }
  if (this.applicationId !== undefined) {
    output.writeFieldBegin('applicationId', Thrift.Type.STRING, 5);
    output.writeString(this.applicationId);
    output.writeFieldEnd();
  }
  if (this.connectionId !== undefined) {
    output.writeFieldBegin('connectionId', Thrift.Type.STRING, 6);
    output.writeString(this.connectionId);
    output.writeFieldEnd();
  }
  if (this.connectionSerial !== undefined) {
    output.writeFieldBegin('connectionSerial', Thrift.Type.I64, 7);
    output.writeI64(this.connectionSerial);
    output.writeFieldEnd();
  }
  if (this.channel !== undefined) {
    output.writeFieldBegin('channel', Thrift.Type.STRING, 8);
    output.writeString(this.channel);
    output.writeFieldEnd();
  }
  if (this.channelSerial !== undefined) {
    output.writeFieldBegin('channelSerial', Thrift.Type.STRING, 9);
    output.writeString(this.channelSerial);
    output.writeFieldEnd();
  }
  if (this.msgSerial !== undefined) {
    output.writeFieldBegin('msgSerial', Thrift.Type.I64, 10);
    output.writeI64(this.msgSerial);
    output.writeFieldEnd();
  }
  if (this.timestamp !== undefined) {
    output.writeFieldBegin('timestamp', Thrift.Type.I64, 11);
    output.writeI64(this.timestamp);
    output.writeFieldEnd();
  }
  if (this.messages !== undefined) {
    output.writeFieldBegin('messages', Thrift.Type.LIST, 12);
    output.writeListBegin(Thrift.Type.STRUCT, this.messages.length);
    for (var iter38 in this.messages)
    {
      if (this.messages.hasOwnProperty(iter38))
      {
        iter38 = this.messages[iter38];
        iter38.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.presence !== undefined) {
    output.writeFieldBegin('presence', Thrift.Type.LIST, 13);
    output.writeListBegin(Thrift.Type.STRUCT, this.presence.length);
    for (var iter39 in this.presence)
    {
      if (this.presence.hasOwnProperty(iter39))
      {
        iter39 = this.presence[iter39];
        iter39.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

TMessageBundle = function(args) {
  this.items = undefined;
  if (args) {
    if (args.items !== undefined) {
      this.items = args.items;
    }
  }
};
TMessageBundle.prototype = {};
TMessageBundle.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.LIST) {
        var _size40 = 0;
        var _rtmp344;
        this.items = [];
        var _etype43 = 0;
        _rtmp344 = input.readListBegin();
        _etype43 = _rtmp344.etype;
        _size40 = _rtmp344.size;
        for (var _i45 = 0; _i45 < _size40; ++_i45)
        {
          var elem46 = undefined;
          elem46 = new TProtocolMessage();
          elem46.read(input);
          this.items.push(elem46);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

TMessageBundle.prototype.write = function(output) {
  output.writeStructBegin('TMessageBundle');
  if (this.items !== undefined) {
    output.writeFieldBegin('items', Thrift.Type.LIST, 1);
    output.writeListBegin(Thrift.Type.STRUCT, this.items.length);
    for (var iter47 in this.items)
    {
      if (this.items.hasOwnProperty(iter47))
      {
        iter47 = this.items[iter47];
        iter47.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

SMessageCount = function(args) {
  this.count = undefined;
  this.data = undefined;
  if (args) {
    if (args.count !== undefined) {
      this.count = args.count;
    }
    if (args.data !== undefined) {
      this.data = args.data;
    }
  }
};
SMessageCount.prototype = {};
SMessageCount.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.DOUBLE) {
        this.count = input.readDouble();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.DOUBLE) {
        this.data = input.readDouble();
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

SMessageCount.prototype.write = function(output) {
  output.writeStructBegin('SMessageCount');
  if (this.count !== undefined) {
    output.writeFieldBegin('count', Thrift.Type.DOUBLE, 1);
    output.writeDouble(this.count);
    output.writeFieldEnd();
  }
  if (this.data !== undefined) {
    output.writeFieldBegin('data', Thrift.Type.DOUBLE, 2);
    output.writeDouble(this.data);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

SMessageTypes = function(args) {
  this.all = undefined;
  this.messages = undefined;
  this.presence = undefined;
  if (args) {
    if (args.all !== undefined) {
      this.all = args.all;
    }
    if (args.messages !== undefined) {
      this.messages = args.messages;
    }
    if (args.presence !== undefined) {
      this.presence = args.presence;
    }
  }
};
SMessageTypes.prototype = {};
SMessageTypes.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.all = new SMessageCount();
        this.all.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRUCT) {
        this.messages = new SMessageCount();
        this.messages.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.STRUCT) {
        this.presence = new SMessageCount();
        this.presence.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

SMessageTypes.prototype.write = function(output) {
  output.writeStructBegin('SMessageTypes');
  if (this.all !== undefined) {
    output.writeFieldBegin('all', Thrift.Type.STRUCT, 1);
    this.all.write(output);
    output.writeFieldEnd();
  }
  if (this.messages !== undefined) {
    output.writeFieldBegin('messages', Thrift.Type.STRUCT, 2);
    this.messages.write(output);
    output.writeFieldEnd();
  }
  if (this.presence !== undefined) {
    output.writeFieldBegin('presence', Thrift.Type.STRUCT, 3);
    this.presence.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

SResourceCount = function(args) {
  this.opened = undefined;
  this.peak = undefined;
  this.mean = undefined;
  this.min = undefined;
  this.refused = undefined;
  this.sample_count = undefined;
  this.sample_sum = undefined;
  if (args) {
    if (args.opened !== undefined) {
      this.opened = args.opened;
    }
    if (args.peak !== undefined) {
      this.peak = args.peak;
    }
    if (args.mean !== undefined) {
      this.mean = args.mean;
    }
    if (args.min !== undefined) {
      this.min = args.min;
    }
    if (args.refused !== undefined) {
      this.refused = args.refused;
    }
    if (args.sample_count !== undefined) {
      this.sample_count = args.sample_count;
    }
    if (args.sample_sum !== undefined) {
      this.sample_sum = args.sample_sum;
    }
  }
};
SResourceCount.prototype = {};
SResourceCount.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.DOUBLE) {
        this.opened = input.readDouble();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.DOUBLE) {
        this.peak = input.readDouble();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.DOUBLE) {
        this.mean = input.readDouble();
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.DOUBLE) {
        this.min = input.readDouble();
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.DOUBLE) {
        this.refused = input.readDouble();
      } else {
        input.skip(ftype);
      }
      break;
      case 10:
      if (ftype == Thrift.Type.DOUBLE) {
        this.sample_count = input.readDouble();
      } else {
        input.skip(ftype);
      }
      break;
      case 11:
      if (ftype == Thrift.Type.DOUBLE) {
        this.sample_sum = input.readDouble();
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

SResourceCount.prototype.write = function(output) {
  output.writeStructBegin('SResourceCount');
  if (this.opened !== undefined) {
    output.writeFieldBegin('opened', Thrift.Type.DOUBLE, 1);
    output.writeDouble(this.opened);
    output.writeFieldEnd();
  }
  if (this.peak !== undefined) {
    output.writeFieldBegin('peak', Thrift.Type.DOUBLE, 2);
    output.writeDouble(this.peak);
    output.writeFieldEnd();
  }
  if (this.mean !== undefined) {
    output.writeFieldBegin('mean', Thrift.Type.DOUBLE, 3);
    output.writeDouble(this.mean);
    output.writeFieldEnd();
  }
  if (this.min !== undefined) {
    output.writeFieldBegin('min', Thrift.Type.DOUBLE, 4);
    output.writeDouble(this.min);
    output.writeFieldEnd();
  }
  if (this.refused !== undefined) {
    output.writeFieldBegin('refused', Thrift.Type.DOUBLE, 5);
    output.writeDouble(this.refused);
    output.writeFieldEnd();
  }
  if (this.sample_count !== undefined) {
    output.writeFieldBegin('sample_count', Thrift.Type.DOUBLE, 10);
    output.writeDouble(this.sample_count);
    output.writeFieldEnd();
  }
  if (this.sample_sum !== undefined) {
    output.writeFieldBegin('sample_sum', Thrift.Type.DOUBLE, 11);
    output.writeDouble(this.sample_sum);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

SConnectionTypes = function(args) {
  this.all = undefined;
  this.plain = undefined;
  this.tls = undefined;
  if (args) {
    if (args.all !== undefined) {
      this.all = args.all;
    }
    if (args.plain !== undefined) {
      this.plain = args.plain;
    }
    if (args.tls !== undefined) {
      this.tls = args.tls;
    }
  }
};
SConnectionTypes.prototype = {};
SConnectionTypes.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.all = new SResourceCount();
        this.all.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRUCT) {
        this.plain = new SResourceCount();
        this.plain.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.STRUCT) {
        this.tls = new SResourceCount();
        this.tls.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

SConnectionTypes.prototype.write = function(output) {
  output.writeStructBegin('SConnectionTypes');
  if (this.all !== undefined) {
    output.writeFieldBegin('all', Thrift.Type.STRUCT, 1);
    this.all.write(output);
    output.writeFieldEnd();
  }
  if (this.plain !== undefined) {
    output.writeFieldBegin('plain', Thrift.Type.STRUCT, 2);
    this.plain.write(output);
    output.writeFieldEnd();
  }
  if (this.tls !== undefined) {
    output.writeFieldBegin('tls', Thrift.Type.STRUCT, 3);
    this.tls.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

SMessageTraffic = function(args) {
  this.all = undefined;
  this.realtime = undefined;
  this.rest = undefined;
  this.push = undefined;
  this.httpStream = undefined;
  if (args) {
    if (args.all !== undefined) {
      this.all = args.all;
    }
    if (args.realtime !== undefined) {
      this.realtime = args.realtime;
    }
    if (args.rest !== undefined) {
      this.rest = args.rest;
    }
    if (args.push !== undefined) {
      this.push = args.push;
    }
    if (args.httpStream !== undefined) {
      this.httpStream = args.httpStream;
    }
  }
};
SMessageTraffic.prototype = {};
SMessageTraffic.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.all = new SMessageTypes();
        this.all.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRUCT) {
        this.realtime = new SMessageTypes();
        this.realtime.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.STRUCT) {
        this.rest = new SMessageTypes();
        this.rest.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.STRUCT) {
        this.push = new SMessageTypes();
        this.push.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.STRUCT) {
        this.httpStream = new SMessageTypes();
        this.httpStream.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

SMessageTraffic.prototype.write = function(output) {
  output.writeStructBegin('SMessageTraffic');
  if (this.all !== undefined) {
    output.writeFieldBegin('all', Thrift.Type.STRUCT, 1);
    this.all.write(output);
    output.writeFieldEnd();
  }
  if (this.realtime !== undefined) {
    output.writeFieldBegin('realtime', Thrift.Type.STRUCT, 2);
    this.realtime.write(output);
    output.writeFieldEnd();
  }
  if (this.rest !== undefined) {
    output.writeFieldBegin('rest', Thrift.Type.STRUCT, 3);
    this.rest.write(output);
    output.writeFieldEnd();
  }
  if (this.push !== undefined) {
    output.writeFieldBegin('push', Thrift.Type.STRUCT, 4);
    this.push.write(output);
    output.writeFieldEnd();
  }
  if (this.httpStream !== undefined) {
    output.writeFieldBegin('httpStream', Thrift.Type.STRUCT, 5);
    this.httpStream.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

SRequestCount = function(args) {
  this.succeeded = undefined;
  this.failed = undefined;
  this.refused = undefined;
  if (args) {
    if (args.succeeded !== undefined) {
      this.succeeded = args.succeeded;
    }
    if (args.failed !== undefined) {
      this.failed = args.failed;
    }
    if (args.refused !== undefined) {
      this.refused = args.refused;
    }
  }
};
SRequestCount.prototype = {};
SRequestCount.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.DOUBLE) {
        this.succeeded = input.readDouble();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.DOUBLE) {
        this.failed = input.readDouble();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.DOUBLE) {
        this.refused = input.readDouble();
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

SRequestCount.prototype.write = function(output) {
  output.writeStructBegin('SRequestCount');
  if (this.succeeded !== undefined) {
    output.writeFieldBegin('succeeded', Thrift.Type.DOUBLE, 1);
    output.writeDouble(this.succeeded);
    output.writeFieldEnd();
  }
  if (this.failed !== undefined) {
    output.writeFieldBegin('failed', Thrift.Type.DOUBLE, 2);
    output.writeDouble(this.failed);
    output.writeFieldEnd();
  }
  if (this.refused !== undefined) {
    output.writeFieldBegin('refused', Thrift.Type.DOUBLE, 3);
    output.writeDouble(this.refused);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

SStats = function(args) {
  this.all = undefined;
  this.inbound = undefined;
  this.outbound = undefined;
  this.persisted = undefined;
  this.connections = undefined;
  this.channels = undefined;
  this.apiRequests = undefined;
  this.tokenRequests = undefined;
  this.inProgress = undefined;
  this.count = undefined;
  if (args) {
    if (args.all !== undefined) {
      this.all = args.all;
    }
    if (args.inbound !== undefined) {
      this.inbound = args.inbound;
    }
    if (args.outbound !== undefined) {
      this.outbound = args.outbound;
    }
    if (args.persisted !== undefined) {
      this.persisted = args.persisted;
    }
    if (args.connections !== undefined) {
      this.connections = args.connections;
    }
    if (args.channels !== undefined) {
      this.channels = args.channels;
    }
    if (args.apiRequests !== undefined) {
      this.apiRequests = args.apiRequests;
    }
    if (args.tokenRequests !== undefined) {
      this.tokenRequests = args.tokenRequests;
    }
    if (args.inProgress !== undefined) {
      this.inProgress = args.inProgress;
    }
    if (args.count !== undefined) {
      this.count = args.count;
    }
  }
};
SStats.prototype = {};
SStats.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.all = new SMessageTypes();
        this.all.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRUCT) {
        this.inbound = new SMessageTraffic();
        this.inbound.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.STRUCT) {
        this.outbound = new SMessageTraffic();
        this.outbound.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.STRUCT) {
        this.persisted = new SMessageTypes();
        this.persisted.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.STRUCT) {
        this.connections = new SConnectionTypes();
        this.connections.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 6:
      if (ftype == Thrift.Type.STRUCT) {
        this.channels = new SResourceCount();
        this.channels.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 7:
      if (ftype == Thrift.Type.STRUCT) {
        this.apiRequests = new SRequestCount();
        this.apiRequests.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 8:
      if (ftype == Thrift.Type.STRUCT) {
        this.tokenRequests = new SRequestCount();
        this.tokenRequests.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 10:
      if (ftype == Thrift.Type.STRING) {
        this.inProgress = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 11:
      if (ftype == Thrift.Type.I32) {
        this.count = input.readI32();
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

SStats.prototype.write = function(output) {
  output.writeStructBegin('SStats');
  if (this.all !== undefined) {
    output.writeFieldBegin('all', Thrift.Type.STRUCT, 1);
    this.all.write(output);
    output.writeFieldEnd();
  }
  if (this.inbound !== undefined) {
    output.writeFieldBegin('inbound', Thrift.Type.STRUCT, 2);
    this.inbound.write(output);
    output.writeFieldEnd();
  }
  if (this.outbound !== undefined) {
    output.writeFieldBegin('outbound', Thrift.Type.STRUCT, 3);
    this.outbound.write(output);
    output.writeFieldEnd();
  }
  if (this.persisted !== undefined) {
    output.writeFieldBegin('persisted', Thrift.Type.STRUCT, 4);
    this.persisted.write(output);
    output.writeFieldEnd();
  }
  if (this.connections !== undefined) {
    output.writeFieldBegin('connections', Thrift.Type.STRUCT, 5);
    this.connections.write(output);
    output.writeFieldEnd();
  }
  if (this.channels !== undefined) {
    output.writeFieldBegin('channels', Thrift.Type.STRUCT, 6);
    this.channels.write(output);
    output.writeFieldEnd();
  }
  if (this.apiRequests !== undefined) {
    output.writeFieldBegin('apiRequests', Thrift.Type.STRUCT, 7);
    this.apiRequests.write(output);
    output.writeFieldEnd();
  }
  if (this.tokenRequests !== undefined) {
    output.writeFieldBegin('tokenRequests', Thrift.Type.STRUCT, 8);
    this.tokenRequests.write(output);
    output.writeFieldEnd();
  }
  if (this.inProgress !== undefined) {
    output.writeFieldBegin('inProgress', Thrift.Type.STRING, 10);
    output.writeString(this.inProgress);
    output.writeFieldEnd();
  }
  if (this.count !== undefined) {
    output.writeFieldBegin('count', Thrift.Type.I32, 11);
    output.writeI32(this.count);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

SStatsArray = function(args) {
  this.items = undefined;
  if (args) {
    if (args.items !== undefined) {
      this.items = args.items;
    }
  }
};
SStatsArray.prototype = {};
SStatsArray.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.LIST) {
        var _size48 = 0;
        var _rtmp352;
        this.items = [];
        var _etype51 = 0;
        _rtmp352 = input.readListBegin();
        _etype51 = _rtmp352.etype;
        _size48 = _rtmp352.size;
        for (var _i53 = 0; _i53 < _size48; ++_i53)
        {
          var elem54 = undefined;
          elem54 = new SStats();
          elem54.read(input);
          this.items.push(elem54);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

SStatsArray.prototype.write = function(output) {
  output.writeStructBegin('SStatsArray');
  if (this.items !== undefined) {
    output.writeFieldBegin('items', Thrift.Type.LIST, 1);
    output.writeListBegin(Thrift.Type.STRUCT, this.items.length);
    for (var iter55 in this.items)
    {
      if (this.items.hasOwnProperty(iter55))
      {
        iter55 = this.items[iter55];
        iter55.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

WWebhookMessage = function(args) {
  this.name = undefined;
  this.webhookId = undefined;
  this.timestamp = undefined;
  this.serial = undefined;
  this.data = undefined;
  if (args) {
    if (args.name !== undefined) {
      this.name = args.name;
    }
    if (args.webhookId !== undefined) {
      this.webhookId = args.webhookId;
    }
    if (args.timestamp !== undefined) {
      this.timestamp = args.timestamp;
    }
    if (args.serial !== undefined) {
      this.serial = args.serial;
    }
    if (args.data !== undefined) {
      this.data = args.data;
    }
  }
};
WWebhookMessage.prototype = {};
WWebhookMessage.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRING) {
        this.name = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.webhookId = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.I64) {
        this.timestamp = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.STRING) {
        this.serial = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.STRUCT) {
        this.data = new TData();
        this.data.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

WWebhookMessage.prototype.write = function(output) {
  output.writeStructBegin('WWebhookMessage');
  if (this.name !== undefined) {
    output.writeFieldBegin('name', Thrift.Type.STRING, 1);
    output.writeString(this.name);
    output.writeFieldEnd();
  }
  if (this.webhookId !== undefined) {
    output.writeFieldBegin('webhookId', Thrift.Type.STRING, 2);
    output.writeString(this.webhookId);
    output.writeFieldEnd();
  }
  if (this.timestamp !== undefined) {
    output.writeFieldBegin('timestamp', Thrift.Type.I64, 3);
    output.writeI64(this.timestamp);
    output.writeFieldEnd();
  }
  if (this.serial !== undefined) {
    output.writeFieldBegin('serial', Thrift.Type.STRING, 4);
    output.writeString(this.serial);
    output.writeFieldEnd();
  }
  if (this.data !== undefined) {
    output.writeFieldBegin('data', Thrift.Type.STRUCT, 5);
    this.data.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

WWebhookMessageArray = function(args) {
  this.items = undefined;
  if (args) {
    if (args.items !== undefined) {
      this.items = args.items;
    }
  }
};
WWebhookMessageArray.prototype = {};
WWebhookMessageArray.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.LIST) {
        var _size56 = 0;
        var _rtmp360;
        this.items = [];
        var _etype59 = 0;
        _rtmp360 = input.readListBegin();
        _etype59 = _rtmp360.etype;
        _size56 = _rtmp360.size;
        for (var _i61 = 0; _i61 < _size56; ++_i61)
        {
          var elem62 = undefined;
          elem62 = new WWebhookMessage();
          elem62.read(input);
          this.items.push(elem62);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

WWebhookMessageArray.prototype.write = function(output) {
  output.writeStructBegin('WWebhookMessageArray');
  if (this.items !== undefined) {
    output.writeFieldBegin('items', Thrift.Type.LIST, 1);
    output.writeListBegin(Thrift.Type.STRUCT, this.items.length);
    for (var iter63 in this.items)
    {
      if (this.items.hasOwnProperty(iter63))
      {
        iter63 = this.items[iter63];
        iter63.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var clientmessage_refs = {
	TAction: TAction,
	TFlags: TFlags,
	TType: TType,
	TData: TData,
	TPresence: TPresence,
	TMessage: TMessage,
	TChannelMessage: TChannelMessage,
	TProtocolMessage: TProtocolMessage
};
this.Cookie = (function() {
	var isBrowser = (typeof(window) == 'object');
	function noop() {}

	function Cookie() {}

	if(isBrowser) {
		Cookie.create = function(name, value, ttl) {
			var expires = '';
			if(ttl) {
				var date = new Date();
				date.setTime(date.getTime() + ttl);
				expires = '; expires=' + date.toGMTString();
			}
			document.cookie = name + '=' + value + expires + '; path=/';
		};

		Cookie.read = function(name) {
			var nameEQ = name + '=';
			var ca = document.cookie.split(';');
			for(var i=0; i < ca.length; i++) {
				var c = ca[i];
				while(c.charAt(0)==' ') c = c.substring(1, c.length);
				if(c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
			}
			return null;
		};

		Cookie.erase = function(name) {
			createCookie(name, '', -1 * 3600 * 1000);
		};
	}

	return Cookie;
})();
var Defaults = {
	protocolVersion:   1,
	HOST:              'rest.ably.io',
	WS_HOST:           'realtime.ably.io',
	FALLBACK_HOSTS:    ['A.ably-realtime.com', 'B.ably-realtime.com', 'C.ably-realtime.com', 'D.ably-realtime.com', 'E.ably-realtime.com'],
	PORT:              80,
	TLS_PORT:          443,
	connectTimeout:    15000,
	disconnectTimeout: 30000,
	suspendedTimeout:  120000,
	cometRecvTimeout:  90000,
	cometSendTimeout:  10000,
	httpTransports:    ['xhr', 'jsonp'],
	transports:        ['web_socket', 'flash_socket', 'xhr', 'jsonp'],
	flashTransport:    {swfLocation: (typeof window !== 'undefined' ? window.location.protocol : 'https:') + '//cdn.ably.io/lib/swf/WebSocketMainInsecure-0.9.swf', policyPort: '80'}
};

Defaults.getHost = function(options, host, ws) {
	host = host || options.host || Defaults.HOST;
	if(ws)
		host = ((host == options.host) && (options.wsHost || host))
			|| ((host == Defaults.HOST) && (Defaults.WS_HOST || host))
			|| host;
	return host;
};

Defaults.getPort = function(options) {
	return options.encrypted ? (options.tlsPort || Defaults.TLS_PORT) : (options.port || Defaults.PORT);
};

Defaults.getHosts = function(options) {
	var hosts;
	if(options.host) {
		hosts = [options.host];
		if(options.fallbackHosts)
			hosts.concat(options.fallbackHosts);
	} else {
		hosts = [Defaults.HOST].concat(Defaults.FALLBACK_HOSTS);
	}
	return hosts;
};

if (typeof exports !== 'undefined' && this.exports !== exports) {
	exports.defaults = Defaults;
}this.Http = (function() {
	var noop = function() {};

	function Http() {}

	/**
	 * Perform an HTTP GET request
	 * @param realtime
	 * @param the full path of the POST request
	 * @param headers optional hash of headers
	 * @param params optional hash of params
	 * @param callback (err, response)
	 */
	Http.get = function(realtime, path, headers, params, callback) {
		callback = callback || noop;
		var uri = (typeof(path) == 'function') ? path : function(host) { return realtime.baseUri(host) + path; };
		var binary = (headers && headers.accept != 'application/json');

		function tryGet(uri, cb) {
			Http.Request(uri, params, null, binary, cb);
		}

		/* if we have an absolute url, we just try once */
		if(typeof(uri) == 'string') {
			tryGet(uri, callback);
			return;
		}

		var hosts, connection = realtime.connection;
		if(connection && connection.state == 'connected')
			hosts = [connection.connectionManager.host];
		else
			hosts = Defaults.getHosts(realtime.options);

		/* if there is only one host do it */
		if(hosts.length == 1) {
			tryGet(uri(hosts[0]), callback);
			return;
		}

		/* hosts is an array with preferred host plus at least one fallback */
		tryGet(hosts.shift(), function(err, statusCode, body) {
			if(err) {
				var code = err.code;
				if(code =='ENETUNREACH' || code == 'EHOSTUNREACH' || code == 'EHOSTDOWN') {
					/* we should use a fallback host if available */
					tryGet(hosts, callback);
					return;
				}
			}
			callback.apply(null, arguments);
		});
	};

	/**
	 * Perform an HTTP POST request
	 * @param rest
	 * @param the full path of the POST request
	 * @param headers optional hash of headers
	 * @param body object or buffer containing request body
	 * @param params optional hash of params
	 * @param callback (err, response)
	 */
	Http.post = function(realtime, path, headers, body, params, callback) {
		callback = callback || noop;
		var uri = (typeof(path) == 'function') ? path : function(host) { return realtime.baseUri(host) + path; };
		var binary = (headers && headers.accept != 'application/json');

		function tryPost(uri, cb) {
			Http.Request(uri, params, body, binary, cb);
		}

		/* if we have an absolute url, we just try once */
		if(typeof(uri) == 'string') {
			tryGet(uri, callback);
			return;
		}

		var hosts, connection = realtime.connection;
		if(connection && connection.state == 'connected')
			hosts = [connection.connectionManager.host];
		else
			hosts = Defaults.getHosts(realtime.options);

		/* if there is only one host do it */
		if(hosts.length == 1) {
			tryPost(uri(hosts[0]), callback);
			return;
		}

		/* hosts is an array with preferred host plus at least one fallback */
		tryPost(hosts.shift(), function(err, statusCode, body) {
			if(err) {
				var code = err.code;
				if(code =='ENETUNREACH' || code == 'EHOSTUNREACH' || code == 'EHOSTDOWN') {
					/* we should use a fallback host if available */
					tryPost(hosts, callback);
					return;
				}
			}
			callback.apply(null, arguments);
		});
	};

	return Http;
})();
this.ThriftUtil = (function() {
	var thriftTransport = new Thrift.TTransport();
	var thriftProtocol = new Thrift.TBinaryProtocol(thriftTransport);
	var defaultBufferSize = 16384;

	var buffers = [];

	function createBuffer(len) { return new Buffer(len || defaultBufferSize); }
	function getBuffer(len) {
		var len = len || 0;
		if(buffers.length) {
			var buf = buffers.shift();
			if(buf.length >= len)
				return buf;
		}
		return createBuffer(len);
	}

	function releaseBuffer(buf) { buffers.unshift(buf); }

	function ThriftUtil() {}

	ThriftUtil.encode = function(ob, callback) {
		try {
			callback(null, ThriftUtil.encodeSync(ob));
		} catch(e) {
			var msg = 'Unexpected exception encoding Thrift; exception = ' + e;
			Logger.logAction(Logger.LOG_ERROR, 'ThriftUtil.encode()', msg, e);
			var err = new Error(msg);
			err.statusCode = 400;
			callback(err);
		}
	};

	ThriftUtil.encodeSync = function(ob) {
		var result = undefined;
		if(ob) {
			var buf = getBuffer();
			thriftTransport.reset(buf, function(encoded) {
				result = encoded;
			});
			ob.write(thriftProtocol);
			thriftProtocol.flush();
			releaseBuffer(buf);
		}
		return result;
	};

	ThriftUtil.decode = function(ob, encoded, callback) {
		var err = ThriftUtil.decodeSync(ob, encoded);
		if(err) callback(err);
		else callback(null, ob, encoded);
	};

	ThriftUtil.decodeSync = function(ob, encoded) {
		try {
			thriftTransport.reset(encoded);
			ob.read(thriftProtocol);
			return ob;
		} catch(e) {
			var msg = 'Unexpected exception decoding thrift message; exception = ' + e;
			Logger.logAction(Logger.LOG_ERROR, 'ThriftUtil.decode()', msg, e);
			var err = new Error(msg);
			err.statusCode = 400;
			throw err;
		}
	};

})();
/*
 Copyright (c) 2008 Fred Palmer fred.palmer_at_gmail.com

 Permission is hereby granted, free of charge, to any person
 obtaining a copy of this software and associated documentation
 files (the "Software"), to deal in the Software without
 restriction, including without limitation the rights to use,
 copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the
 Software is furnished to do so, subject to the following
 conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 OTHER DEALINGS IN THE SOFTWARE.
 */
this.Base64 = (function() {
	function StringBuffer()
	{
		this.buffer = [];
	}

	StringBuffer.prototype.append = function append(string)
	{
		this.buffer.push(string);
		return this;
	};

	StringBuffer.prototype.toString = function toString()
	{
		return this.buffer.join("");
	};

	var Base64 =
	{
		codex : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

		encode : function (input)
		{
			var output = new StringBuffer();
			var codex = Base64.codex;

			var enumerator = new Utf8EncodeEnumerator(input);
			while (enumerator.moveNext())
			{
				var chr1 = enumerator.current;

				enumerator.moveNext();
				var chr2 = enumerator.current;

				enumerator.moveNext();
				var chr3 = enumerator.current;

				var enc1 = chr1 >> 2;
				var enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
				var enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
				var enc4 = chr3 & 63;

				if (isNaN(chr2))
				{
					enc3 = enc4 = 64;
				}
				else if (isNaN(chr3))
				{
					enc4 = 64;
				}

				output.append(codex.charAt(enc1) + codex.charAt(enc2) + codex.charAt(enc3) + codex.charAt(enc4));
			}

			return output.toString();
		},

		decode : function (input)
		{
			var output = new StringBuffer();

			var enumerator = new Base64DecodeEnumerator(input);
			while (enumerator.moveNext())
			{
				var charCode = enumerator.current;

				if (charCode < 128)
					output.append(String.fromCharCode(charCode));
				else if ((charCode > 191) && (charCode < 224))
				{
					enumerator.moveNext();
					var charCode2 = enumerator.current;

					output.append(String.fromCharCode(((charCode & 31) << 6) | (charCode2 & 63)));
				}
				else
				{
					enumerator.moveNext();
					var charCode2 = enumerator.current;

					enumerator.moveNext();
					var charCode3 = enumerator.current;

					output.append(String.fromCharCode(((charCode & 15) << 12) | ((charCode2 & 63) << 6) | (charCode3 & 63)));
				}
			}

			return output.toString();
		}
	};

	function Utf8EncodeEnumerator(input)
	{
		this._input = input;
		this._index = -1;
		this._buffer = [];
	}

	Utf8EncodeEnumerator.prototype =
	{
		current: Number.NaN,

		moveNext: function()
		{
			if (this._buffer.length > 0)
			{
				this.current = this._buffer.shift();
				return true;
			}
			else if (this._index >= (this._input.length - 1))
			{
				this.current = Number.NaN;
				return false;
			}
			else
			{
				var charCode = this._input.charCodeAt(++this._index);

				// "\r\n" -> "\n"
				//
				if ((charCode == 13) && (this._input.charCodeAt(this._index + 1) == 10))
				{
					charCode = 10;
					this._index += 2;
				}

				if (charCode < 128)
				{
					this.current = charCode;
				}
				else if ((charCode > 127) && (charCode < 2048))
				{
					this.current = (charCode >> 6) | 192;
					this._buffer.push((charCode & 63) | 128);
				}
				else
				{
					this.current = (charCode >> 12) | 224;
					this._buffer.push(((charCode >> 6) & 63) | 128);
					this._buffer.push((charCode & 63) | 128);
				}

				return true;
			}
		}
	};

	function Base64DecodeEnumerator(input)
	{
		this._input = input;
		this._index = -1;
		this._buffer = [];
	}

	Base64DecodeEnumerator.prototype =
	{
		current: 64,

		moveNext: function()
		{
			if (this._buffer.length > 0)
			{
				this.current = this._buffer.shift();
				return true;
			}
			else if (this._index >= (this._input.length - 1))
			{
				this.current = 64;
				return false;
			}
			else
			{
				var enc1 = Base64.codex.indexOf(this._input.charAt(++this._index));
				var enc2 = Base64.codex.indexOf(this._input.charAt(++this._index));
				var enc3 = Base64.codex.indexOf(this._input.charAt(++this._index));
				var enc4 = Base64.codex.indexOf(this._input.charAt(++this._index));

				var chr1 = (enc1 << 2) | (enc2 >> 4);
				var chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
				var chr3 = ((enc3 & 3) << 6) | enc4;

				this.current = chr1;

				if (enc3 != 64)
					this._buffer.push(chr2);

				if (enc4 != 64)
					this._buffer.push(chr3);

				return true;
			}
		}
	};

	return Base64;
})();
Ably.Crypto = window.CryptoJS && (function() {
	var messagetypes = clientmessage_refs;
	var TData = messagetypes.TData;
	var TType = messagetypes.TType;
	var DEFAULT_ALGORITHM = "AES";
	var DEFAULT_KEYLENGTH = 128; // bits
	var DEFAULT_BLOCKLENGTH = 16; // bytes
	var DEFAULT_BLOCKLENGTH_WORDS = 4; // 32-bit words
	var VAL32 = 0x100000000;

	/* FIXME: there's no fallback support here for browsers that don't support arraybuffer */
	function DoubleToIEEE(f) {
		var buf = new ArrayBuffer(8);
		(new Float64Array(buf))[0] = f;
		return new Uint32Array(buf);
	}

	function IEEEToDouble(wordArray) {
		var buf = new ArrayBuffer(8),
			intArray = new Uint32Array(buf);
		intArray[0] = wordArray[0];
		intArray[1] = wordArray[1];
		return (new  Float64Array(buf))[0];
	}

	/**
	 * Internal: generate a WordArray of secure random words corresponding to the given length of bytes
	 * @param bytes
	 * @param callback
	 */
	var generateRandom;
	if(window.Uint32Array && window.crypto && window.crypto.getRandomValues) {
		var blockRandomArray = new Uint32Array(DEFAULT_BLOCKLENGTH_WORDS);
		generateRandom = function(bytes, callback) {
			var words = bytes / 4, nativeArray = (words == DEFAULT_BLOCKLENGTH_WORDS) ? blockRandomArray : new Uint32Array(words);
			window.crypto.getRandomValues(nativeArray);
			var array = new Array(words);
			for(var i = 0; i < words; i++) array[i] = nativeArray[i];
			callback(null, CryptoJS.lib.WordArray.create(array));
		};
	} else {
		var blockRandomArray = new Array(DEFAULT_BLOCKLENGTH_WORDS);
		generateRandom = function(bytes, callback) {
			var words = bytes / 4, array = (words == DEFAULT_BLOCKLENGTH_WORDS) ? blockRandomArray : new Array(words);
			for(var i = 0; i < words; i++)
				array[i] = Math.floor(Math.random() * VAL32);

			callback(null, CryptoJS.lib.WordArray.create(array));
		};
	}

	/**
	 * Internal: calculate the padded length of a given plaintext
	 * using PKCS5.
	 * @param plaintextLength
	 * @return
	 */
	function getPaddedLength(plaintextLength) {
		return (plaintextLength + DEFAULT_BLOCKLENGTH) & -DEFAULT_BLOCKLENGTH;
	}

	/**
	 * Internal: a block containing zeros
	 */
	var emptyBlock = CryptoJS.lib.WordArray.create([0,0,0,0]);

	/**
	 * Internal: obtain the pkcs5 padding string for a given padded length;
	 */
	var pkcs5Padding = [
		CryptoJS.lib.WordArray.create([0x10101010,0x10101010,0x10101010,0x10101010], 16),
		CryptoJS.lib.WordArray.create([0x01000000], 1),
		CryptoJS.lib.WordArray.create([0x02020000], 2),
		CryptoJS.lib.WordArray.create([0x03030300], 3),
		CryptoJS.lib.WordArray.create([0x04040404], 4),
		CryptoJS.lib.WordArray.create([0x05050505,0x05000000], 5),
		CryptoJS.lib.WordArray.create([0x06060606,0x06060000], 6),
		CryptoJS.lib.WordArray.create([0x07070707,0x07070700], 7),
		CryptoJS.lib.WordArray.create([0x08080808,0x08080808], 8),
		CryptoJS.lib.WordArray.create([0x09090909,0x09090909,0x09000000], 9),
		CryptoJS.lib.WordArray.create([0x0a0a0a0a,0x0a0a0a0a,0x0a0a0000], 10),
		CryptoJS.lib.WordArray.create([0x0b0b0b0b,0x0b0b0b0b,0x0b0b0b00], 11),
		CryptoJS.lib.WordArray.create([0x0c0c0c0c,0x0c0c0c0c,0x0c0c0c0c], 12),
		CryptoJS.lib.WordArray.create([0x0d0d0d0d,0x0d0d0d0d,0x0d0d0d0d,0x0d000000], 13),
		CryptoJS.lib.WordArray.create([0x0e0e0e0e,0x0e0e0e0e,0x0e0e0e0e,0x0e0e0000], 14),
		CryptoJS.lib.WordArray.create([0x0f0f0f0f,0x0f0f0f0f,0x0f0f0f0f,0x0f0f0f0f], 15),
		CryptoJS.lib.WordArray.create([0x10101010,0x10101010,0x10101010,0x10101010], 16)
	];

	/**
	 * Utility classes and interfaces for message payload encryption.
	 *
	 * This class supports AES/CBC/PKCS5 with a default keylength of 128 bits
	 * but supporting other keylengths. Other algorithms and chaining modes are
	 * not supported directly, but supportable by extending/implementing the base
	 * classes and interfaces here.
	 *
	 * Secure random data for creation of Initialisation Vectors (IVs) and keys
	 * is obtained from window.crypto.getRandomValues if available, or from
	 * Math.random() if not. Clients who do not want to depend on Math.random()
	 * should polyfill window.crypto.getRandomValues with a library that seeds
	 * a PRNG with real entropy.
	 *
	 * Each message payload is encrypted with an IV in CBC mode, and the IV is
	 * concatenated with the resulting raw ciphertext to construct the "ciphertext"
	 * data passed to the recipient.
	 */
	function Crypto() {}
	Crypto.generateRandom = generateRandom;

	/**
	 * A class encapsulating the client-specifiable parameters for
	 * the cipher.
	 *
	 * algorithm is the name of the algorithm in the default system provider,
	 * or the lower-cased version of it; eg "aes" or "AES".
	 *
	 * Clients may instance a CipherParams directly and populate it, or may
	 * query the implementation to obtain a default system CipherParams.
	 */
	function CipherParams() {
		this.algorithm = null;
		this.key = null;
		this.iv = null;
	}
	Crypto.CipherParams = CipherParams;

	/**
	 * Obtain a default CipherParams. This uses default algorithm, mode and
	 * padding. If a key is specified this is used; otherwise a new key is generated
	 * for the default key length. An IV is generated using the default
	 * system SecureRandom.
	 * A generated key may be obtained from the returned CipherParams
	 * for out-of-band distribution to other clients.
	 * @param key (optional) buffer containing key
	 * @param callback (err, params)
	 */
	Crypto.getDefaultParams = function(key, callback) {
		if(arguments.length == 1 && typeof(key) == 'function') {
			callback = key;
			key = undefined;
		}
		if(!key) {
			generateRandom(DEFAULT_KEYLENGTH / 8, function(err, buf) {
				if(err) {
					callback(err);
					return;
				}
				Crypto.getDefaultParams(buf, callback);
			});
			return;
		}

		var params = new CipherParams();
		params.algorithm = DEFAULT_ALGORITHM;
		params.key = key;
		generateRandom(DEFAULT_BLOCKLENGTH, function(err, buf) {
			params.iv = buf;
			callback(null, params);
		});
	};

	/**
	 * A class that encapsulates the payload of an encrypted message. The
	 * message payload is a combination of the ciphertext (including prepended
	 * IV) and a type, used when reconstructing a payload value from recovered
	 * plaintext.
	 *
	 */
	function CipherData(cipherData, type) {
		this.cipherData = cipherData;
		this.type = type;
	}
	Crypto.CipherData = CipherData;

	/**
	 * Internal; get a ChannelCipher instance based on the given ChannelOptions
	 * @param channelOpts a ChannelOptions instance
	 * @param callback (err, cipher)
	 */
	Crypto.getCipher = function(channelOpts, callback) {
		var params = channelOpts && channelOpts.cipherParams;
		if(params) {
			if(params instanceof CipherParams)
				callback(null, new CBCCipher(params));
			else
				callback(new Error("ChannelOptions not supported"));
			return;
		}
		Crypto.getDefaultParams(function(err, params) {
			if(err) {
				callback(err);
				return;
			}
			callback(null, new CBCCipher(params));
		});
	};

	function CBCCipher(params) {
		var algorithm = this.algorithm = params.algorithm.toUpperCase();
		var key = this.key = params.key;
		var iv = this.iv = params.iv;
		this.encryptCipher = CryptoJS.algo[algorithm].createEncryptor(key, { iv: iv });
		this.blockLengthWords = iv.words.length;
	}

	CBCCipher.prototype.encrypt = function(plaintext) {
		Logger.logAction(Logger.LOG_MICRO, 'CBCCipher.encrypt()', '');
		//console.log('encrypt: plaintext:');
		//console.log(CryptoJS.enc.Hex.stringify(plaintext));
		var plaintextLength = plaintext.sigBytes,
			paddedLength = getPaddedLength(plaintextLength),
			iv = this.getIv().clone();
		var cipherOut = this.encryptCipher.process(plaintext.concat(pkcs5Padding[paddedLength - plaintextLength]));
		var ciphertext = iv.concat(cipherOut);
		//console.log('encrypt: ciphertext:');
		//console.log(CryptoJS.enc.Hex.stringify(ciphertext));
		return ciphertext;
	};

	CBCCipher.prototype.decrypt = function(ciphertext) {
		//console.log('decrypt: ciphertext:');
		//console.log(CryptoJS.enc.Hex.stringify(ciphertext));
		var blockLengthWords = this.blockLengthWords,
			ciphertextWords = ciphertext.words,
			iv = CryptoJS.lib.WordArray.create(ciphertextWords.slice(0, blockLengthWords)),
			ciphertextBody = CryptoJS.lib.WordArray.create(ciphertextWords.slice(blockLengthWords));

		var decryptCipher = CryptoJS.algo[this.algorithm].createDecryptor(this.key, { iv: iv });
		var plaintext = decryptCipher.process(ciphertextBody);
		var epilogue = decryptCipher.finalize();
		decryptCipher.reset();
		if(epilogue && epilogue.sigBytes) plaintext.concat(epilogue);
		//console.log('decrypt: plaintext:');
		//console.log(CryptoJS.enc.Hex.stringify(plaintext));
		return plaintext;
	};

	CBCCipher.prototype.getIv = function() {
		if(!this.iv)
			return this.encryptCipher.process(emptyBlock);

		var result = this.iv;
		this.iv = null;
		return result;
	};

	var Data = Crypto.Data = {};

	Data.asPlaintext = function(tData) {
		var result;
		switch(tData.type) {
			case TType.STRING:
			case TType.JSONOBJECT:
			case TType.JSONARRAY:
				result = CryptoJS.enc.Utf8.parse((tData.stringData));
				break;
			case TType.NONE:
			case TType.TRUE:
			case TType.FALSE:
				break;
			case TType.INT32:
				result = CryptoJS.lib.WordArray.create(1);
				result[0] = tData.i32Data;
				break;
			case TType.INT64:
				result = CryptoJS.lib.WordArray.create(2);
				result[0] = tData.i64Data / VAL32;
				result[1] = tData.i64Data % VAL32;
				break;
			case TType.DOUBLE:
				result = DoubleToIEEE(tData.doubleData);
				break;
			case TType.BUFFER:
				result = tData.binaryData;
				break;
		}
		return result;
	};

	Data.fromPlaintext = function(plaintext, type) {
		var result = new TData();
		result.type = type;
		switch(type) {
			case TType.INT32:
				result.i32Data = plaintext[0];
				break;
			case TType.INT64:
				result.i64Data = plaintext[0] * VAL32 + plaintext[1];
				break;
			case TType.DOUBLE:
				result.doubleData = IEEEToDouble(plaintext);
				break;
			case TType.JSONOBJECT:
			case TType.JSONARRAY:
			case TType.STRING:
				result.stringData = CryptoJS.enc.Utf8.stringify(plaintext);
				break;
			case TType.BUFFER:
				result.binaryData = plaintext;
				break;
			/*	case TType.NONE:
			 case TType.TRUE:
			 case TType.FALSE: */
			default:
		}
		return result;
	};

	Data.asBase64 = function(ciphertext) {
		return CryptoJS.enc.Base64.stringify(ciphertext);
	};

	Data.fromBase64 = function(encoded) {
		return CryptoJS.enc.Base64.parse(encoded);
	};

	return Crypto;
})();/*	SWFObject v2.2 <http://code.google.com/p/swfobject/> 
	is released under the MIT License <http://www.opensource.org/licenses/mit-license.php> 
*/
var swfobject=function(){var D="undefined",r="object",S="Shockwave Flash",W="ShockwaveFlash.ShockwaveFlash",q="application/x-shockwave-flash",R="SWFObjectExprInst",x="onreadystatechange",O=window,j=document,t=navigator,T=false,U=[h],o=[],N=[],I=[],l,Q,E,B,J=false,a=false,n,G,m=true,M=function(){var aa=typeof j.getElementById!=D&&typeof j.getElementsByTagName!=D&&typeof j.createElement!=D,ah=t.userAgent.toLowerCase(),Y=t.platform.toLowerCase(),ae=Y?/win/.test(Y):/win/.test(ah),ac=Y?/mac/.test(Y):/mac/.test(ah),af=/webkit/.test(ah)?parseFloat(ah.replace(/^.*webkit\/(\d+(\.\d+)?).*$/,"$1")):false,X=!+"\v1",ag=[0,0,0],ab=null;if(typeof t.plugins!=D&&typeof t.plugins[S]==r){ab=t.plugins[S].description;if(ab&&!(typeof t.mimeTypes!=D&&t.mimeTypes[q]&&!t.mimeTypes[q].enabledPlugin)){T=true;X=false;ab=ab.replace(/^.*\s+(\S+\s+\S+$)/,"$1");ag[0]=parseInt(ab.replace(/^(.*)\..*$/,"$1"),10);ag[1]=parseInt(ab.replace(/^.*\.(.*)\s.*$/,"$1"),10);ag[2]=/[a-zA-Z]/.test(ab)?parseInt(ab.replace(/^.*[a-zA-Z]+(.*)$/,"$1"),10):0}}else{if(typeof O.ActiveXObject!=D){try{var ad=new ActiveXObject(W);if(ad){ab=ad.GetVariable("$version");if(ab){X=true;ab=ab.split(" ")[1].split(",");ag=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}}catch(Z){}}}return{w3:aa,pv:ag,wk:af,ie:X,win:ae,mac:ac}}(),k=function(){if(!M.w3){return}if((typeof j.readyState!=D&&j.readyState=="complete")||(typeof j.readyState==D&&(j.getElementsByTagName("body")[0]||j.body))){f()}if(!J){if(typeof j.addEventListener!=D){j.addEventListener("DOMContentLoaded",f,false)}if(M.ie&&M.win){j.attachEvent(x,function(){if(j.readyState=="complete"){j.detachEvent(x,arguments.callee);f()}});if(O==top){(function(){if(J){return}try{j.documentElement.doScroll("left")}catch(X){setTimeout(arguments.callee,0);return}f()})()}}if(M.wk){(function(){if(J){return}if(!/loaded|complete/.test(j.readyState)){setTimeout(arguments.callee,0);return}f()})()}s(f)}}();function f(){if(J){return}try{var Z=j.getElementsByTagName("body")[0].appendChild(C("span"));Z.parentNode.removeChild(Z)}catch(aa){return}J=true;var X=U.length;for(var Y=0;Y<X;Y++){U[Y]()}}function K(X){if(J){X()}else{U[U.length]=X}}function s(Y){if(typeof O.addEventListener!=D){O.addEventListener("load",Y,false)}else{if(typeof j.addEventListener!=D){j.addEventListener("load",Y,false)}else{if(typeof O.attachEvent!=D){i(O,"onload",Y)}else{if(typeof O.onload=="function"){var X=O.onload;O.onload=function(){X();Y()}}else{O.onload=Y}}}}}function h(){if(T){V()}else{H()}}function V(){var X=j.getElementsByTagName("body")[0];var aa=C(r);aa.setAttribute("type",q);var Z=X.appendChild(aa);if(Z){var Y=0;(function(){if(typeof Z.GetVariable!=D){var ab=Z.GetVariable("$version");if(ab){ab=ab.split(" ")[1].split(",");M.pv=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}else{if(Y<10){Y++;setTimeout(arguments.callee,10);return}}X.removeChild(aa);Z=null;H()})()}else{H()}}function H(){var ag=o.length;if(ag>0){for(var af=0;af<ag;af++){var Y=o[af].id;var ab=o[af].callbackFn;var aa={success:false,id:Y};if(M.pv[0]>0){var ae=c(Y);if(ae){if(F(o[af].swfVersion)&&!(M.wk&&M.wk<312)){w(Y,true);if(ab){aa.success=true;aa.ref=z(Y);ab(aa)}}else{if(o[af].expressInstall&&A()){var ai={};ai.data=o[af].expressInstall;ai.width=ae.getAttribute("width")||"0";ai.height=ae.getAttribute("height")||"0";if(ae.getAttribute("class")){ai.styleclass=ae.getAttribute("class")}if(ae.getAttribute("align")){ai.align=ae.getAttribute("align")}var ah={};var X=ae.getElementsByTagName("param");var ac=X.length;for(var ad=0;ad<ac;ad++){if(X[ad].getAttribute("name").toLowerCase()!="movie"){ah[X[ad].getAttribute("name")]=X[ad].getAttribute("value")}}P(ai,ah,Y,ab)}else{p(ae);if(ab){ab(aa)}}}}}else{w(Y,true);if(ab){var Z=z(Y);if(Z&&typeof Z.SetVariable!=D){aa.success=true;aa.ref=Z}ab(aa)}}}}}function z(aa){var X=null;var Y=c(aa);if(Y&&Y.nodeName=="OBJECT"){if(typeof Y.SetVariable!=D){X=Y}else{var Z=Y.getElementsByTagName(r)[0];if(Z){X=Z}}}return X}function A(){return !a&&F("6.0.65")&&(M.win||M.mac)&&!(M.wk&&M.wk<312)}function P(aa,ab,X,Z){a=true;E=Z||null;B={success:false,id:X};var ae=c(X);if(ae){if(ae.nodeName=="OBJECT"){l=g(ae);Q=null}else{l=ae;Q=X}aa.id=R;if(typeof aa.width==D||(!/%$/.test(aa.width)&&parseInt(aa.width,10)<310)){aa.width="310"}if(typeof aa.height==D||(!/%$/.test(aa.height)&&parseInt(aa.height,10)<137)){aa.height="137"}j.title=j.title.slice(0,47)+" - Flash Player Installation";var ad=M.ie&&M.win?"ActiveX":"PlugIn",ac="MMredirectURL="+O.location.toString().replace(/&/g,"%26")+"&MMplayerType="+ad+"&MMdoctitle="+j.title;if(typeof ab.flashvars!=D){ab.flashvars+="&"+ac}else{ab.flashvars=ac}if(M.ie&&M.win&&ae.readyState!=4){var Y=C("div");X+="SWFObjectNew";Y.setAttribute("id",X);ae.parentNode.insertBefore(Y,ae);ae.style.display="none";(function(){if(ae.readyState==4){ae.parentNode.removeChild(ae)}else{setTimeout(arguments.callee,10)}})()}u(aa,ab,X)}}function p(Y){if(M.ie&&M.win&&Y.readyState!=4){var X=C("div");Y.parentNode.insertBefore(X,Y);X.parentNode.replaceChild(g(Y),X);Y.style.display="none";(function(){if(Y.readyState==4){Y.parentNode.removeChild(Y)}else{setTimeout(arguments.callee,10)}})()}else{Y.parentNode.replaceChild(g(Y),Y)}}function g(ab){var aa=C("div");if(M.win&&M.ie){aa.innerHTML=ab.innerHTML}else{var Y=ab.getElementsByTagName(r)[0];if(Y){var ad=Y.childNodes;if(ad){var X=ad.length;for(var Z=0;Z<X;Z++){if(!(ad[Z].nodeType==1&&ad[Z].nodeName=="PARAM")&&!(ad[Z].nodeType==8)){aa.appendChild(ad[Z].cloneNode(true))}}}}}return aa}function u(ai,ag,Y){var X,aa=c(Y);if(M.wk&&M.wk<312){return X}if(aa){if(typeof ai.id==D){ai.id=Y}if(M.ie&&M.win){var ah="";for(var ae in ai){if(ai[ae]!=Object.prototype[ae]){if(ae.toLowerCase()=="data"){ag.movie=ai[ae]}else{if(ae.toLowerCase()=="styleclass"){ah+=' class="'+ai[ae]+'"'}else{if(ae.toLowerCase()!="classid"){ah+=" "+ae+'="'+ai[ae]+'"'}}}}}var af="";for(var ad in ag){if(ag[ad]!=Object.prototype[ad]){af+='<param name="'+ad+'" value="'+ag[ad]+'" />'}}aa.outerHTML='<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"'+ah+">"+af+"</object>";N[N.length]=ai.id;X=c(ai.id)}else{var Z=C(r);Z.setAttribute("type",q);for(var ac in ai){if(ai[ac]!=Object.prototype[ac]){if(ac.toLowerCase()=="styleclass"){Z.setAttribute("class",ai[ac])}else{if(ac.toLowerCase()!="classid"){Z.setAttribute(ac,ai[ac])}}}}for(var ab in ag){if(ag[ab]!=Object.prototype[ab]&&ab.toLowerCase()!="movie"){e(Z,ab,ag[ab])}}aa.parentNode.replaceChild(Z,aa);X=Z}}return X}function e(Z,X,Y){var aa=C("param");aa.setAttribute("name",X);aa.setAttribute("value",Y);Z.appendChild(aa)}function y(Y){var X=c(Y);if(X&&X.nodeName=="OBJECT"){if(M.ie&&M.win){X.style.display="none";(function(){if(X.readyState==4){b(Y)}else{setTimeout(arguments.callee,10)}})()}else{X.parentNode.removeChild(X)}}}function b(Z){var Y=c(Z);if(Y){for(var X in Y){if(typeof Y[X]=="function"){Y[X]=null}}Y.parentNode.removeChild(Y)}}function c(Z){var X=null;try{X=j.getElementById(Z)}catch(Y){}return X}function C(X){return j.createElement(X)}function i(Z,X,Y){Z.attachEvent(X,Y);I[I.length]=[Z,X,Y]}function F(Z){var Y=M.pv,X=Z.split(".");X[0]=parseInt(X[0],10);X[1]=parseInt(X[1],10)||0;X[2]=parseInt(X[2],10)||0;return(Y[0]>X[0]||(Y[0]==X[0]&&Y[1]>X[1])||(Y[0]==X[0]&&Y[1]==X[1]&&Y[2]>=X[2]))?true:false}function v(ac,Y,ad,ab){if(M.ie&&M.mac){return}var aa=j.getElementsByTagName("head")[0];if(!aa){return}var X=(ad&&typeof ad=="string")?ad:"screen";if(ab){n=null;G=null}if(!n||G!=X){var Z=C("style");Z.setAttribute("type","text/css");Z.setAttribute("media",X);n=aa.appendChild(Z);if(M.ie&&M.win&&typeof j.styleSheets!=D&&j.styleSheets.length>0){n=j.styleSheets[j.styleSheets.length-1]}G=X}if(M.ie&&M.win){if(n&&typeof n.addRule==r){n.addRule(ac,Y)}}else{if(n&&typeof j.createTextNode!=D){n.appendChild(j.createTextNode(ac+" {"+Y+"}"))}}}function w(Z,X){if(!m){return}var Y=X?"visible":"hidden";if(J&&c(Z)){c(Z).style.visibility=Y}else{v("#"+Z,"visibility:"+Y)}}function L(Y){var Z=/[\\\"<>\.;]/;var X=Z.exec(Y)!=null;return X&&typeof encodeURIComponent!=D?encodeURIComponent(Y):Y}var d=function(){if(M.ie&&M.win){window.attachEvent("onunload",function(){var ac=I.length;for(var ab=0;ab<ac;ab++){I[ab][0].detachEvent(I[ab][1],I[ab][2])}var Z=N.length;for(var aa=0;aa<Z;aa++){y(N[aa])}for(var Y in M){M[Y]=null}M=null;for(var X in swfobject){swfobject[X]=null}swfobject=null})}}();return{registerObject:function(ab,X,aa,Z){if(M.w3&&ab&&X){var Y={};Y.id=ab;Y.swfVersion=X;Y.expressInstall=aa;Y.callbackFn=Z;o[o.length]=Y;w(ab,false)}else{if(Z){Z({success:false,id:ab})}}},getObjectById:function(X){if(M.w3){return z(X)}},embedSWF:function(ab,ah,ae,ag,Y,aa,Z,ad,af,ac){var X={success:false,id:ah};if(M.w3&&!(M.wk&&M.wk<312)&&ab&&ah&&ae&&ag&&Y){w(ah,false);K(function(){ae+="";ag+="";var aj={};if(af&&typeof af===r){for(var al in af){aj[al]=af[al]}}aj.data=ab;aj.width=ae;aj.height=ag;var am={};if(ad&&typeof ad===r){for(var ak in ad){am[ak]=ad[ak]}}if(Z&&typeof Z===r){for(var ai in Z){if(typeof am.flashvars!=D){am.flashvars+="&"+ai+"="+Z[ai]}else{am.flashvars=ai+"="+Z[ai]}}}if(F(Y)){var an=u(aj,am,ah);if(aj.id==ah){w(ah,true)}X.success=true;X.ref=an}else{if(aa&&A()){aj.data=aa;P(aj,am,ah,ac);return}else{w(ah,true)}}if(ac){ac(X)}})}else{if(ac){ac(X)}}},switchOffAutoHideShow:function(){m=false},ua:M,getFlashPlayerVersion:function(){return{major:M.pv[0],minor:M.pv[1],release:M.pv[2]}},hasFlashPlayerVersion:F,createSWF:function(Z,Y,X){if(M.w3){return u(Z,Y,X)}else{return undefined}},showExpressInstall:function(Z,aa,X,Y){if(M.w3&&A()){P(Z,aa,X,Y)}},removeSWF:function(X){if(M.w3){y(X)}},createCSS:function(aa,Z,Y,X){if(M.w3){v(aa,Z,Y,X)}},addDomLoadEvent:K,addLoadEvent:s,getQueryParamValue:function(aa){var Z=j.location.search||j.location.hash;if(Z){if(/\?/.test(Z)){Z=Z.split("?")[1]}if(aa==null){return L(Z)}var Y=Z.split("&");for(var X=0;X<Y.length;X++){if(Y[X].substring(0,Y[X].indexOf("="))==aa){return L(Y[X].substring((Y[X].indexOf("=")+1)))}}}return""},expressInstallCallback:function(){if(a){var X=c(R);if(X&&l){X.parentNode.replaceChild(l,X);if(Q){w(Q,true);if(M.ie&&M.win){l.style.display="block"}}if(E){E(B)}}a=false}}}}();// Copyright: Hiroshi Ichikawa <http://gimite.net/en/>
// License: New BSD License
// Reference: http://dev.w3.org/html5/websockets/
// Reference: http://tools.ietf.org/html/rfc6455

var FlashWebSocket = (function() {
  window.WebSocket = window.WebSocket || {};

  if (window.console && window.console.log && window.console.error) {
    // In some environment, console is defined but console.log or console.error is missing.
	logger = window.console;
  } else {
	logger = {log: function(){ }, error: function(){ }};
  }

  /**
   * Our own implementation of WebSocket class using Flash.
   * @param {string} url
   * @param {array or string} protocols
   * @param {string} proxyHost
   * @param {int} proxyPort
   * @param {string} headers
   */
  var WebSocket = function(url, protocols, proxyHost, proxyPort, headers) {
    var self = this;
    self.__id = WebSocket.__nextId++;
    WebSocket.__instances[self.__id] = self;
    self.readyState = WebSocket.CONNECTING;
    self.bufferedAmount = 0;
    self.__events = {};
    if (!protocols) {
      protocols = [];
    } else if (typeof protocols == "string") {
      protocols = [protocols];
    }
    // Uses setTimeout() to make sure __createFlash() runs after the caller sets ws.onopen etc.
    // Otherwise, when onopen fires immediately, onopen is called before it is set.
    self.__createTask = setTimeout(function() {
      WebSocket.__addTask(function() {
        self.__createTask = null;
        WebSocket.__flash.create(
            self.__id, url, protocols, proxyHost || null, proxyPort || 0, headers || null);
      });
    }, 0);
  };

  /**
   * Send data to the web socket.
   * @param {string} data  The data to send to the socket.
   * @return {boolean}  True for success, false for failure.
   */
  WebSocket.prototype.send = function(data) {
    if (this.readyState == WebSocket.CONNECTING) {
      throw "INVALID_STATE_ERR: Web Socket connection has not been established";
    }
    // We use encodeURIComponent() here, because FABridge doesn't work if
    // the argument includes some characters. We don't use escape() here
    // because of this:
    // https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Functions#escape_and_unescape_Functions
    // But it looks decodeURIComponent(encodeURIComponent(s)) doesn't
    // preserve all Unicode characters either e.g. "\uffff" in Firefox.
    // Note by wtritch: Hopefully this will not be necessary using ExternalInterface.  Will require
    // additional testing.
    var result = WebSocket.__flash.send(this.__id, encodeURIComponent(data));
    if (result < 0) { // success
      return true;
    } else {
      this.bufferedAmount += result;
      return false;
    }
  };

  /**
   * Close this web socket gracefully.
   */
  WebSocket.prototype.close = function() {
    if (this.__createTask) {
      clearTimeout(this.__createTask);
      this.__createTask = null;
      this.readyState = WebSocket.CLOSED;
      return;
    }
    if (this.readyState == WebSocket.CLOSED || this.readyState == WebSocket.CLOSING) {
      return;
    }
    this.readyState = WebSocket.CLOSING;
    WebSocket.__flash.close(this.__id);
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {string} type
   * @param {function} listener
   * @param {boolean} useCapture
   * @return void
   */
  WebSocket.prototype.addEventListener = function(type, listener, useCapture) {
    if (!(type in this.__events)) {
      this.__events[type] = [];
    }
    this.__events[type].push(listener);
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {string} type
   * @param {function} listener
   * @param {boolean} useCapture
   * @return void
   */
  WebSocket.prototype.removeEventListener = function(type, listener, useCapture) {
    if (!(type in this.__events)) return;
    var events = this.__events[type];
    for (var i = events.length - 1; i >= 0; --i) {
      if (events[i] === listener) {
        events.splice(i, 1);
        break;
      }
    }
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {Event} event
   * @return void
   */
  WebSocket.prototype.dispatchEvent = function(event) {
    var events = this.__events[event.type] || [];
    for (var i = 0; i < events.length; ++i) {
      events[i](event);
    }
    var handler = this["on" + event.type];
    if (handler) handler.apply(this, [event]);
  };

  /**
   * Handles an event from Flash.
   * @param {Object} flashEvent
   */
  WebSocket.prototype.__handleEvent = function(flashEvent) {
    
    if ("readyState" in flashEvent) {
      this.readyState = flashEvent.readyState;
    }
    if ("protocol" in flashEvent) {
      this.protocol = flashEvent.protocol;
    }
    
    var jsEvent;
    if (flashEvent.type == "open" || flashEvent.type == "error") {
      jsEvent = this.__createSimpleEvent(flashEvent.type);
    } else if (flashEvent.type == "close") {
      jsEvent = this.__createSimpleEvent("close");
      jsEvent.wasClean = flashEvent.wasClean ? true : false;
      jsEvent.code = flashEvent.code;
      jsEvent.reason = flashEvent.reason;
    } else if (flashEvent.type == "message") {
      var data = decodeURIComponent(flashEvent.message);
      jsEvent = this.__createMessageEvent("message", data);
    } else {
      throw "unknown event type: " + flashEvent.type;
    }
    
    this.dispatchEvent(jsEvent);
    
  };
  
  WebSocket.prototype.__createSimpleEvent = function(type) {
    if (document.createEvent && window.Event) {
      var event = document.createEvent("Event");
      event.initEvent(type, false, false);
      return event;
    } else {
      return {type: type, bubbles: false, cancelable: false};
    }
  };
  
  WebSocket.prototype.__createMessageEvent = function(type, data) {
    if (document.createEvent && window.MessageEvent && !window.opera) {
      var event = document.createEvent("MessageEvent");
      event.initMessageEvent("message", false, false, data, null, null, window, null);
      return event;
    } else {
      // IE and Opera, the latter one truncates the data parameter after any 0x00 bytes.
      return {type: type, data: data, bubbles: false, cancelable: false};
    }
  };
  
  /**
   * Define the WebSocket readyState enumeration.
   */
  WebSocket.CONNECTING = 0;
  WebSocket.OPEN = 1;
  WebSocket.CLOSING = 2;
  WebSocket.CLOSED = 3;

  // Field to check implementation of WebSocket.
  WebSocket.__isFlashImplementation = true;
  WebSocket.__initialized = false;
  WebSocket.__flash = null;
  WebSocket.__instances = {};
  WebSocket.__tasks = [];
  WebSocket.__nextId = 0;
  
  /**
   * Load a new flash security policy file.
   * @param {string} url
   */
  WebSocket.loadFlashPolicyFile = function(url){
    WebSocket.__addTask(function() {
      WebSocket.__flash.loadManualPolicyFile(url);
    });
  };

  /**
   * Loads WebSocketMain.swf and creates WebSocketMain object in Flash.
   */
  WebSocket.__initialize = function(swfLocation) {
    
    if (WebSocket.__initialized) return;
    WebSocket.__initialized = true;
    
    var container = document.createElement("div");
    container.id = "webSocketContainer";
    // Hides Flash box. We cannot use display: none or visibility: hidden because it prevents
    // Flash from loading at least in IE. So we move it out of the screen at (-100, -100).
    // But this even doesn't work with Flash Lite (e.g. in Droid Incredible). So with Flash
    // Lite, we put it at (0, 0). This shows 1x1 box visible at left-top corner but this is
    // the best we can do as far as we know now.
    container.style.position = "absolute";
    if (WebSocket.__isFlashLite()) {
      container.style.left = "0px";
      container.style.top = "0px";
    } else {
      container.style.left = "-100px";
      container.style.top = "-100px";
    }
    var holder = document.createElement("div");
    holder.id = "webSocketFlash";
    container.appendChild(holder);
    document.body.appendChild(container);
    // See this article for hasPriority:
    // http://help.adobe.com/en_US/as3/mobile/WS4bebcd66a74275c36cfb8137124318eebc6-7ffd.html
    swfobject.embedSWF(
      swfLocation,
      "webSocketFlash",
      "1" /* width */,
      "1" /* height */,
      "10.0.0" /* SWF version */,
      null,
      null,
      {hasPriority: true, swliveconnect : true, allowScriptAccess: "always"},
      null,
      function(e) {
        if (!e.success) {
          logger.error("[WebSocket] swfobject.embedSWF failed");
        }
      }
    );
    
  };
  
  /**
   * Called by Flash to notify JS that it's fully loaded and ready
   * for communication.
   */
  window.WebSocket.__onFlashInitialized = WebSocket.__onFlashInitialized = function() {
    // We need to set a timeout here to avoid round-trip calls
    // to flash during the initialization process.
    setTimeout(function() {
      WebSocket.__flash = document.getElementById("webSocketFlash");
      WebSocket.__flash.setCallerUrl(location.href);
      WebSocket.__flash.setDebug(!!window.WEB_SOCKET_DEBUG);
      for (var i = 0; i < WebSocket.__tasks.length; ++i) {
        WebSocket.__tasks[i]();
      }
      WebSocket.__tasks = [];
    }, 0);
  };
  
  /**
   * Called by Flash to notify WebSockets events are fired.
   */
  window.WebSocket.__onFlashEvent = WebSocket.__onFlashEvent = function() {
    setTimeout(function() {
      try {
        // Gets events using receiveEvents() instead of getting it from event object
        // of Flash event. This is to make sure to keep message order.
        // It seems sometimes Flash events don't arrive in the same order as they are sent.
        var events = WebSocket.__flash.receiveEvents();
        for (var i = 0; i < events.length; ++i) {
          WebSocket.__instances[events[i].webSocketId].__handleEvent(events[i]);
        }
      } catch (e) {
        logger.error(e);
      }
    }, 0);
    return true;
  };
  
  // Called by Flash.
  window.WebSocket.__log = WebSocket.__log = function(message) {
    logger.log(decodeURIComponent(message));
  };
  
  // Called by Flash.
  window.WebSocket.__error = WebSocket.__error = function(message) {
    logger.error(decodeURIComponent(message));
  };
  
  WebSocket.__addTask = function(task) {
    if (WebSocket.__flash) {
      task();
    } else {
      WebSocket.__tasks.push(task);
    }
  };
  
  /**
   * Test if the browser is running flash lite.
   * @return {boolean} True if flash lite is running, false otherwise.
   */
  WebSocket.__isFlashLite = function() {
    if (!window.navigator || !window.navigator.mimeTypes) {
      return false;
    }
    var mimeType = window.navigator.mimeTypes["application/x-shockwave-flash"];
    if (!mimeType || !mimeType.enabledPlugin || !mimeType.enabledPlugin.filename) {
      return false;
    }
    return mimeType.enabledPlugin.filename.match(/flashlite/i) ? true : false;
  };

  return WebSocket;
})();
var EventEmitter = (function() {

	/* public constructor */
	function EventEmitter() {
		this.any = [];
		this.events = {};
		this.anyOnce = [];
		this.eventsOnce = {};
	}

	/**
	 * Add an event listener
	 * @param event (optional) the name of the event to listen to
	 *        if not supplied, all events trigger a call to the listener
	 * @param listener the listener to be called
	 */
	EventEmitter.prototype.on = function(event, listener) {
		if(arguments.length == 1 && typeof(event) == 'function') {
			this.any.push(event);
		} else if(event === null) {
			this.any.push(listener);
		} else {
			var listeners = this.events[event] = this.events[event] || [];
			listeners.push(listener);
		}
	};

	/**
	 * Remove one or more event listeners
	 * @param event (optional) the name of the event whose listener
	 *        is to be removed. If not supplied, the listener is
	 *        treated as an 'any' listener
	 * @param listener (optional) the listener to remove. If not
	 *        supplied, all listeners are removed.
	 */
	EventEmitter.prototype.off = function(event, listener) {
		if(arguments.length == 0) {
			this.any = [];
			this.events = {};
			this.anyOnce = [];
			this.eventsOnce = {};
			return;
		}
		if(arguments.length == 1) {
			if(typeof(event) == 'function') {
				/* we take this to be the listener and treat the event as "any" .. */
				listener = event;
				event = null;
			}
			/* ... or we take event to be the actual event name and listener to be all */
		}
		var listeners, idx = -1;
		if(event === null) {
			/* "any" case */
			if(listener) {
				if(!(listeners = this.any) || (idx = listeners.indexOf(listener)) == -1) {
					if(listeners = this.anyOnce)
						idx = listeners.indexOf(listener);
				}
				if(idx > -1)
					listeners.splice(idx, 1);
			} else {
				this.any = [];
				this.anyOnce = [];
			}
			return;
		}
		/* "normal* case where event is an actual event */
		if(listener) {
			var listeners, idx = -1;
			if(!(listeners = this.events[event]) || (idx = listeners.indexOf(listener)) == -1) {
				if(listeners = this.eventsOnce[event])
					idx = listeners.indexOf(listener);
			}
			if(idx > -1)
				listeners.splice(idx, 1);
		} else {
			delete this.events[event];
			delete this.eventsOnce[event];
		}
	};

	/**
	 * Get the array of listeners for a given event; excludes once events
	 * @param event (optional) the name of the event, or none for 'any'
	 * @return array of events, or null if none
	 */
	EventEmitter.prototype.listeners = function(event) {
		if(event) {
			var listeners = (this.events[event] || []);
			if(this.eventsOnce[event])
				Array.prototype.push.apply(listeners, this.eventsOnce[event]);
			return listeners.length ? listeners : null;
		}
		return this.any.length ? this.any : null;
	};

	/**
	 * Emit an event
	 * @param event the event name
	 * @param args the arguments to pass to the listener
	 */
	EventEmitter.prototype.emit = function(event  /* , args... */) {
		var args = Array.prototype.slice.call(arguments, 1);
		var eventThis = {event:event};
		if(this.anyOnce.length) {
			var listeners = this.anyOnce;
			this.anyOnce = [];
			for(var i = 0; i < listeners.length; i++)
				listeners[i].apply(eventThis, args);
		}
		for(var i = 0; i < this.any.length; i++)
			this.any[i].apply(eventThis, args);
		var listeners = this.eventsOnce[event];
		if(listeners) {
			delete this.eventsOnce[event];
			for(var i = 0; i < listeners.length; i++)
				listeners[i].apply(eventThis, args);
		}
		var listeners = this.events[event];
		if(listeners)
			for(var i = 0; i < listeners.length; i++)
				listeners[i].apply(eventThis, args);
	};

	/**
	 * Listen for a single occurrence of an event
	 * @param event the name of the event to listen to
	 * @param listener the listener to be called
	 */
	EventEmitter.prototype.once = function(event, listener) {
		if(arguments.length == 1 && typeof(event) == 'function') {
			this.anyOnce.push(event);
		} else if(event === null) {
			this.anyOnce.push(listener);
		} else {
			var listeners = this.eventsOnce[event] = (this.eventsOnce[event] || []);
			listeners.push(listener);
		}
	};

	return EventEmitter;
})();
var Logger = (function() {
	var noop = function() {};

	var LOG_NONE  = 0,
	LOG_ERROR = 1,
	LOG_MAJOR = 2,
	LOG_MINOR = 3,
	LOG_MICRO = 4;

	var LOG_DEFAULT = LOG_MINOR,
	LOG_DEBUG   = LOG_MICRO;

	var logLevel = LOG_MICRO;
	var logHandler = noop;

	/* public constructor */
	function Logger(args) {}

	/* public constants */
	Logger.LOG_NONE    = LOG_NONE,
	Logger.LOG_ERROR   = LOG_ERROR,
	Logger.LOG_MAJOR   = LOG_MAJOR,
	Logger.LOG_MINOR   = LOG_MINOR,
	Logger.LOG_MICRO   = LOG_MICRO;

	Logger.LOG_DEFAULT = LOG_DEFAULT,
	Logger.LOG_DEBUG   = LOG_DEBUG;

	/* public static functions */
	Logger.logAction = function(level, action, message) {
		if(level <= logLevel) {
			logHandler('Ably: ' + action + ': ' + message);
		}
	};

	Logger.setLog = function(level, handler) {
		logLevel = level || LOG_DEFAULT;
		logHandler = handler || console.log.bind(console);
	};

	return Logger;
})();
var Utils = (function() {
	var isBrowser = (typeof(window) == 'object');

	function Utils() {}

	/*
	 * Add a set of properties to a target object
	 * target: the target object
	 * props:  an object whose enumerable properties are
	 *         added, by reference only
	 */
	Utils.addProperties = Utils.mixin = function(target, src) {
		for(var prop in src)
			target[prop] = src[prop];
		return target;
	};

	/*
	 * Add a set of properties to a target object
	 * target: the target object
	 * props:  an object whose enumerable properties are
	 *         added, by reference only
	 */
	Utils.copy = function(src) {
		return Utils.mixin({}, src);
	};

	/*
	 * Determine whether or not a given object is
	 * an array.
	 */
	Utils.isArray = function(ob) {
		return Object.prototype.toString.call(ob) == '[object Array]';
	};

	/*
	 * Determine whether or not an object contains
	 * any enumerable properties.
	 * ob: the object
	 */
	Utils.isEmpty = function(ob) {
		for(var prop in ob)
			return false;
		return true;
	};

	/*
	 * Perform a simple shallow clone of an object.
	 * Result is an object irrespective of whether
	 * the input is an object or array. All
	 * enumerable properties are copied.
	 * ob: the object
	 */
	Utils.shallowClone = function(ob) {
		var result = new Object();
		for(var prop in ob)
			result[prop] = ob[prop];
		return result;
	};

	/*
	 * Clone an object by creating a new object with the
	 * given object as its prototype. Optionally
	 * a set of additional own properties can be
	 * supplied to be added to the newly created clone.
	 * ob:            the object to be cloned
	 * ownProperties: optional object with additional
	 *                properties to add
	 */
	Utils.prototypicalClone = function(ob, ownProperties) {
		function F() {}
		F.prototype = ob;
		var result = new F();
		if(ownProperties)
			Utils.mixin(result, ownProperties);
		return result;
	};

	/*
	 * Declare a constructor to represent a subclass
	 * of another constructor
	 * See node.js util.inherits
	 */
	Utils.inherits = function(ctor, superCtor) {
		ctor.super_ = superCtor;
		ctor.prototype = Object.create(superCtor.prototype, {
			constructor: {
				value: ctor,
				enumerable: false,
				writable: true,
				configurable: true
			}
		});
	};

	/*
	 * Determine whether or not an object has an enumerable
	 * property whose value equals a given value.
	 * ob:  the object
	 * val: the value to find
	 */
	Utils.containsValue = function(ob, val) {
		for(var i in ob) {
			if(ob[i] == val)
				return true;
		}
		return false;
	};

	Utils.intersect = function(arr, ob) { return Array.isArray(ob) ? Utils.arrIntersect(arr, ob) : Utils.arrIntersectOb(arr, ob); };

	Utils.arrIntersect = function(arr1, arr2) {
		var result = [];
		for(var i = 0; i < arr1.length; i++) {
			var member = arr1[i];
			if(arr2.indexOf(member) != -1)
				result.push(member);
		}
		return result;
	};

	Utils.arrIntersectOb = function(arr, ob) {
		var result = [];
		for(var i = 0; i < arr.length; i++) {
			var member = arr[i];
			if(member in ob)
				result.push(member);
		}
		return result;
	};

	Utils.arrSubtract = function(arr1, arr2) {
		var result = [];
		for(var i = 0; i < arr1.length; i++) {
			var element = arr1[i];
			if(arr2.indexOf(element) == -1)
				result.push(element);
		}
		return result;
	};

	/*
	 * Construct an array of the keys of the enumerable
	 * properties of a given object, optionally limited
	 * to only the own properties.
	 * ob:      the object
	 * ownOnly: boolean, get own properties only
	 */
	Utils.keysArray = function(ob, ownOnly) {
		var result = [];
		for(var prop in ob) {
			if(ownOnly && !ob.hasOwnProperty(prop)) continue;
			result.push(prop);
		}
		return result.length ? result : undefined;
	};

	/*
	 * Construct an array of the values of the enumerable
	 * properties of a given object, optionally limited
	 * to only the own properties.
	 * ob:      the object
	 * ownOnly: boolean, get own properties only
	 */
	Utils.valuesArray = function(ob, ownOnly) {
		var result = [];
		for(var prop in ob) {
			if(ownOnly && !ob.hasOwnProperty(prop)) continue;
			result.push(ob[prop]);
		}
		return result.length ? result : undefined;
	};

	Utils.nextTick = isBrowser ? function(f) { setTimeout(f, 0); } : process.nextTick;

	var contentTypes = {
		json:   'application/json',
		jsonp:  'application/javascript',
		xml:    'application/xml',
		html:   'text/html',
		thrift: 'application/x-thrift'
	};

	Utils.defaultGetHeaders = function(binary) {
		var accept = binary ? contentTypes.thrift + ',' + contentTypes.json : contentTypes.json;
		return {
			accept: accept
		};
	};

	Utils.defaultPostHeaders = function(binary) {
		var accept = binary ? contentTypes.thrift + ',' + contentTypes.json : contentTypes.json;
		return {
			accept: accept,
			'content-type': binary ? contentTypes.thrift : contentTypes.json
		};
	};

	Utils.arrRandomElement = function(arr) {
		return arr.splice(Math.floor(Math.random() * arr.length));
	};

	Utils.parseQueryString = function(query) {
		var match,
			search = /([^&=]+)=?([^&]*)/g,
			result = {};

		while (match = search.exec(query))
			result[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);

 		return result;
	};

	return Utils;
})();
var Multicaster = (function() {

	function Multicaster(members) {
		members = members || [];
		var multi = function(err, data) { for(var i = 0; i < members.length; i++) try { members[i](err, data); } catch(e){} };
		multi.__proto__ = this.__proto__;
		multi.members = members;
		return multi;
	}
	Utils.inherits(Multicaster, Function);

	Multicaster.prototype.push = function() { Array.prototype.push.apply(this.members, arguments); };

	return Multicaster;
})();
var ConnectionManager = (function() {
	var readCookie = (typeof(Cookie) !== 'undefined' && Cookie.read);
	var createCookie = (typeof(Cookie) !== 'undefined' && Cookie.create);
	var connectionIdCookie = 'ably-connection-id';
	var connectionSerialCookie = 'ably-connection-serial';
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');
	var actions = messagetypes.TAction;

	var noop = function() {};

	var states = {
		initialized:  {state: 'initialized',  terminal: false, queueEvents: true,  sendEvents: false},
		connecting:   {state: 'connecting',   terminal: false, queueEvents: true,  sendEvents: false, retryDelay: Defaults.connectTimeout, failState: 'disconnected'},
		connected:    {state: 'connected',    terminal: false, queueEvents: false, sendEvents: true, failState: 'disconnected'},
		disconnected: {state: 'disconnected', terminal: false, queueEvents: true,  sendEvents: false, retryDelay: Defaults.disconnectTimeout},
		suspended:    {state: 'suspended',    terminal: false, queueEvents: false, sendEvents: false, retryDelay: Defaults.suspendedTimeout},
		closed:       {state: 'closed',       terminal: false, queueEvents: false, sendEvents: false},
		failed:       {state: 'failed',       terminal: true,  queueEvents: false, sendEvents: false}
	};

	var channelMessage = function(msg) {
		var action = msg.action;
		return (action == actions.MESSAGE || action == actions.PRESENCE);
	};

	function TransportParams(options, host, mode, connectionId, connectionSerial) {
		this.options = options;
		this.binary = !options.useTextProtocol;
		this.host = host;
		this.mode = mode;
		this.connectionId = connectionId;
		this.connectionSerial = connectionSerial;
	}

	TransportParams.prototype.getConnectParams = function(params) {
		params = params ? Utils.prototypicalClone(params) : {};
		var options = this.options;
		switch(this.mode) {
			case 'resume':
				params.resume = this.connectionId;
				if(this.connectionSerial !== undefined)
					params.connection_serial = this.connectionSerial;
				break;
			case 'recover':
				if(options.recover === true) {
					params.recover = readCookie(connectionIdCookie);
					params.connection_serial = readCookie(connectionSerialCookie);
				} else {
					var match = options.recover.match(/^(\w+):(\w+)$/);
					if(match) {
						params.recover = match[1];
						params.connection_serial = match[2];
					}
				}
				break;
			default:
		}
		params.binary = this.binary;
		params.timestamp = Date.now();
		return params;
	};

	function PendingMessage(msg, callback) {
		this.msg = msg;
		var action = msg.action;
		this.ackRequired = channelMessage(msg);
		this.callback = callback;
		this.merged = false;
	}

	/* public constructor */
	function ConnectionManager(realtime, options) {
		EventEmitter.call(this);
		this.realtime = realtime;
		this.options = options;
		this.state = states.initialized;
		this.error = null;

		this.queuedMessages = [];
		this.pendingMessages = [];
		this.msgSerial = 0;
		this.connectionId = undefined;
		this.connectionSerial = undefined;

		this.httpTransports = Utils.intersect((options.transports || Defaults.httpTransports), ConnectionManager.httpTransports);
		this.transports = Utils.intersect((options.transports || Defaults.transports), ConnectionManager.transports);
		this.upgradeTransports = Utils.arrSubtract(this.transports, this.httpTransports);

		this.httpHosts = Defaults.getHosts(options);
		this.transport = null;
		this.pendingTransport = null;
		this.host = null;

		Logger.logAction(Logger.LOG_MINOR, 'Realtime.ConnectionManager()', 'started');
		Logger.logAction(Logger.LOG_MICRO, 'Realtime.ConnectionManager()', 'requested transports = [' + (options.transports || Defaults.transports) + ']');
		Logger.logAction(Logger.LOG_MICRO, 'Realtime.ConnectionManager()', 'available http transports = [' + this.httpTransports + ']');
		Logger.logAction(Logger.LOG_MICRO, 'Realtime.ConnectionManager()', 'available transports = [' + this.transports + ']');
		Logger.logAction(Logger.LOG_MICRO, 'Realtime.ConnectionManager()', 'http hosts = [' + this.httpHosts + ']');

		if(!this.transports.length) {
			var msg = 'no requested transports available';
			Logger.logAction(Logger.LOG_ERROR, 'realtime.ConnectionManager()', msg);
			throw new Error(msg);
		}

		/* intercept close event in browser to persist connection id if requested */
		if(createCookie && options.recover)
			window.addEventListener('beforeunload', function() { self.persistConnection(); });
	}
	Utils.inherits(ConnectionManager, EventEmitter);

	/*********************
	 * transport management
	 *********************/

	ConnectionManager.httpTransports = {};
	ConnectionManager.transports = {};

	ConnectionManager.prototype.chooseTransport = function(callback) {
		Logger.logAction(Logger.LOG_MAJOR, 'ConnectionManager.chooseTransport()', '');
		/* if there's already a transport, we're done */
		if(this.transport) {
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.chooseTransport()', 'Transport already established');
			callback(null, this.transport);
			return;
		}

		/* set up the transport params */
		/* first attempt the main host; no need to check for general connectivity first.
		 * Inherit any connection state */
		var mode = this.connectionId ? 'resume' : (this.options.recover ? 'recover' : 'clean');
		var transportParams = new TransportParams(this.options, null, mode, this.connectionId, this.connectionSerial);
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.chooseTransport()', 'Transport recovery mode = ' + mode + (mode == 'clean' ? '' : '; connectionId = ' + this.connectionId + '; connectionSerial = ' + this.connectionSerial));
		var self = this;

		/* if there are no http transports, just choose from the available transports,
		 * falling back to the first host only;
		 * NOTE: this behaviour will never apply with a default configuration. */
		if(!this.httpTransports.length) {
			transportParams.host = this.httpHosts[0];
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.chooseTransport()', 'No http transports available; ignoring fallback hosts');
			this.chooseTransportForHost(transportParams, self.transports.slice(), callback);
			return;
		}

		/* first try to establish an http transport */
		this.chooseHttpTransport(transportParams, function(err, httpTransport) {
			if(err) {
				Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.chooseTransport()', 'Unexpected error establishing transport; err = ' + err);
				/* http failed, so nothing's going to work */
				callback(err);
				return;
			}
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.chooseTransport()', 'Establishing http transport: ' + httpTransport);
			callback(null, httpTransport);
			/* we have the http transport; if there is a potential upgrade
			 * transport, lets see if we can upgrade to that. We won't
			  * be trying any fallback hosts, so we know the host to use */
			if(self.upgradeTransports.length) {
				/* we can't initiate the selection of the upgrade transport until we have
				 * the actual connection, since we need the connectionId */
				httpTransport.on('connected', function(error, connectionId) {
					Logger.logAction(Logger.LOG_MAJOR, 'ConnectionManager.chooseTransport()', 'upgrading ... connectionId = ' + connectionId);
					transportParams = new TransportParams(self.options, transportParams.host, 'resume', connectionId, self.connectionSerial);
					self.chooseTransportForHost(transportParams, self.upgradeTransports.slice(), noop);
				});
			}
  		});
	};

	/**
	 * Attempt to connect to a specified host using a given
	 * list of candidate transports in descending priority order
	 * @param transportParams
	 * @param candidateTransports
	 * @param callback
	 */
	ConnectionManager.prototype.chooseTransportForHost = function(transportParams, candidateTransports, callback) {
		var candidate = candidateTransports.shift();
		if(!candidate) {
			var err = new Error('Unable to connect (no available transport)');
			err.statusCode = 404;
			err.code = 80000;
			callback(err);
			return;
		}
		var self = this;
		Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.chooseTransportForHost()', 'trying ' + candidate);
		(ConnectionManager.transports[candidate]).tryConnect(this, this.realtime.auth, transportParams, function(err, transport) {
			if(err) {
				self.chooseTransportForHost(transportParams, candidateTransports, callback);
				return;
			}
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.chooseTransport()', 'transport ' + candidate + ' connecting');
			self.setTransportPending(transport);
			callback(null, transport);
		});
	};

	/**
	 * Try to establish a transport on an http transport, checking for
	 * network connectivity and trying fallback hosts if applicable
	 * @param transportParams
	 * @param callback
	 */
	ConnectionManager.prototype.chooseHttpTransport = function(transportParams, callback) {
		var candidateHosts = this.httpHosts.slice();
		/* first try to establish a connection with the priority host with http transport */
		var host = candidateHosts.shift();
		if(!host) {
			var err = new Error('Unable to connect (no available host)');
			err.statusCode = 404;
			err.code = 80000;
			callback(err);
			return;
		}
		transportParams.host = host;
		var self = this;

		/* this is what we'll be doing if the attempt for the main host fails */
		function tryFallbackHosts() {
			/* if there aren't any fallback hosts, fail */
			if(!candidateHosts.length) {
				var err = new Error('Unable to connect (no available host)');
				err.statusCode = 404;
				err.code = 80000;
				callback(err);
				return;
			}
			/* before trying any fallback (or any remaining fallback) we decide if
			 * there is a problem with the ably host, or there is a general connectivity
			 * problem */
			ConnectionManager.httpTransports[self.httpTransports[0]].checkConnectivity(function(err, connectivity) {
				/* we know err won't happen but handle it here anyway */
				if(err) {
					callback(err);
					return;
				}
				if(!connectivity) {
					/* the internet isn't reachable, so don't try the fallback hosts */
					var err = new Error('Unable to connect (network unreachable)');
					err.statusCode = 404;
					err.code = 80000;
					callback(err);
					return;
				}
				/* the network is there, so there's a problem with the main host, or
				 * its dns. Try the fallback hosts. We could try them simultaneously but
				 * that would potentially cause a huge spike in load on the load balancer */
				transportParams.host = Utils.arrRandomElement(candidateHosts);
				self.chooseTransportForHost(transportParams, self.httpTransports.slice(), function(err, httpTransport) {
					if(err) {
						tryFallbackHosts();
						return;
					}
					/* succeeded */
					callback(null, httpTransport);
				});
			});
		}

		this.chooseTransportForHost(transportParams, this.httpTransports.slice(), function(err, httpTransport) {
			if(err) {
				tryFallbackHosts();
				return;
			}
			/* succeeded */
			callback(null, httpTransport);
		});
	};

	/**
	 * Called when a transport is indicated to be viable, and the connectionmanager
	 * expects to activate this transport as soon as it is connected.
	 * @param host
	 * @param transport
	 */
	ConnectionManager.prototype.setTransportPending = function(transport) {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.setTransportPending()', 'transport = ' + transport);
		if(this.state == states.closed) {
			/* the connection was closed when we were away
			 * attempting this transport so close */
			transport.close(true);
			return;
 		}
		/* if there was already a pending transport, abandon it */
		if(this.pendingTransport)
			this.pendingTransport.close(false);

		/* this is now the pending transport */
		this.pendingTransport = transport;

		var self = this;
		var handleTransportEvent = function(state) {
			return function(error, connectionId) {
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.setTransportPending', 'on state = ' + state);
				if(error && error.reason)
					Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.setTransportPending', 'reason =  ' + error.reason);
				if(connectionId)
					Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.setTransportPending', 'connectionId =  ' + connectionId);

				/* handle activity transition */
				var notifyState;
				if(state == 'connected') {
					self.activateTransport(transport, connectionId);
					notifyState = true;
				} else {
					notifyState = self.deactivateTransport(transport);
				}

				/* if this is the active transport, notify clients */
				if(notifyState)
					self.notifyState({state:state, error:error});
			};
		};
		var events = ['connected', 'disconnected', 'closed', 'failed'];
		for(var i = 0; i < events.length; i++) {
			var event = events[i];
			transport.on(event, handleTransportEvent(event));
		}
		this.emit('transport.pending', transport);
	};

	/**
	 * Called when a transport is connected, and the connectionmanager decides that
	 * it will now be the active transport.
	 * @param transport the transport instance
	 * @param connectionId the id of the new active connection
	 * @param mode the nature of the activation:
	 *   'clean': new connection;
	 *   'recover': new connection with recoverable messages;
	 *   'resume': uninterrupted resumption of connection without loss of messages
	 */
	ConnectionManager.prototype.activateTransport = function(transport, connectionId) {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.activateTransport()', 'transport = ' + transport + '; connectionId = ' + connectionId);
		/* if the connectionmanager moved to the closed state before this
		 * connection event, then we won't activate this transport */
		if(this.state == states.closed)
			return;

 		/* Terminate any existing transport */
		var existingTransport = this.transport;
 		if(existingTransport) {
			 this.transport = null;
			 existingTransport.close(false);
		}
		existingTransport = this.pendingTransport;
		if(existingTransport)
			this.pendingTransport = null;

		/* the given transport is connected; this will immediately
		 * take over as the active transport */
		this.transport = transport;
		this.host = transport.params.host;
		if(connectionId && this.connectionId != connectionId)  {
			this.realtime.connection.id = this.connectionId = connectionId;
			this.msgSerial = 0;
		}

 		/* set up handler for events received on this transport */
		var self = this;
		transport.on('ack', function(serial, count) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager on(ack)', 'serial = ' + serial + '; count = ' + count);
			self.ackMessage(serial, count);
		});
		transport.on('nack', function(serial, count, err) {
			Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager on(nack)', 'serial = ' + serial + '; count = ' + count + '; err = ' + err);
			if(!err) {
				err = new Error('Unknown error');
				err.statusCode = 500;
				err.code = 50001;
				err.reason = 'Unable to send message; channel not responding';
			}
			self.ackMessage(serial, count, err);
		});
		this.emit('transport.active', transport, connectionId, transport.params);
	};

	/**
	 * Called when a transport is no longer the active transport. This can occur
	 * in any transport connection state.
	 * @param transport
	 */
	ConnectionManager.prototype.deactivateTransport = function(transport) {
		var wasActive = this.transport === transport;
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.deactivateTransport()', 'transport = ' + transport);
		transport.off('ack');
		transport.off('nack');
		if(wasActive)
			this.transport = this.host = null;
		else if(this.pendingTransport === transport)
			this.pendingTransport = null;

		this.emit('transport.inactive', transport);
		return wasActive;
	};

	/**
	 * Called when the connectionmanager wants to persist transport
	 * state for later recovery
	 */
	ConnectionManager.prototype.persistConnection = function() {
		if(createCookie) {
			if(this.connectionId)
				createCookie(connectionIdCookie, this.connectionId);
			if(this.connectionSerial)
				createCookie(connectionSerialCookie, this.connectionSerial);
		}
	};

	/*********************
	 * state management
	 *********************/

	ConnectionManager.prototype.getStateError = function() {
		return ConnectionError[this.state.state];
	};

	ConnectionManager.activeState = function(state) {
		return state.queueEvents || state.sendEvents;
	};

	ConnectionManager.prototype.enactStateChange = function(stateChange) {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.enactStateChange', 'setting new state: ' + stateChange.current);
		this.state = states[stateChange.current];
		if(this.state.terminal)
			this.error = stateChange.error;
		this.emit('connectionstate', stateChange, this.transport);
	};

	/****************************************
	 * ConnectionManager connection lifecycle
	 ****************************************/

	ConnectionManager.prototype.startConnectTimer = function() {
		var self = this;
		this.connectTimer = setTimeout(function() {
			if(self.connectTimer) {
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager connect timer expired', 'requesting new state: ' + states.connecting.failState);
				self.notifyState({state: states.connecting.failState});
			}
		}, Defaults.connectTimeout);
	};

	ConnectionManager.prototype.cancelConnectTimer = function() {
		if(this.connectTimer) {
			clearTimeout(this.connectTimer);
			this.connectTimer = undefined;
		}
	};

	ConnectionManager.prototype.startSuspendTimer = function() {
		var self = this;
		if(this.suspendTimer)
			return;
		this.suspendTimer = setTimeout(function() {
			if(self.suspendTimer) {
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager suspend timer expired', 'requesting new state: suspended');
				states.connecting.failState = 'suspended';
				states.connecting.queueEvents = false;
				self.notifyState({state: 'suspended'});
			}
		}, Defaults.suspendedTimeout);
	};

	ConnectionManager.prototype.cancelSuspendTimer = function() {
		states.connecting.failState = 'disconnected';
		states.connecting.queueEvents = true;
		if(this.suspendTimer) {
			clearTimeout(this.suspendTimer);
			delete this.suspendTimer;
		}
	};

	ConnectionManager.prototype.startRetryTimer = function(interval) {
		var self = this;
		this.retryTimer = setTimeout(function() {
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager retry timer expired', 'retrying');
			self.requestState({state: 'connecting'});
		}, interval);
	};

	ConnectionManager.prototype.cancelRetryTimer = function() {
		if(this.retryTimer) {
			clearTimeout(this.retryTimer);
			delete this.retryTimer;
		}
	};

	ConnectionManager.prototype.notifyState = function(indicated) {
		/* do nothing if we're already in the indicated state
		 * or we're unable to move from the current state*/
		if(this.state.terminal || indicated.state == this.state.state)
			return; /* silently do nothing */

		/* if we consider the transport to have failed
		 * (perhaps temporarily) then remove it, so we
		 * can re-select when we re-attempt connection */
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.notifyState()', 'new state: ' + indicated.state);
		var newState = states[indicated.state];
		if(!newState.sendEvents) {
			if(this.transport) {
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.notifyState()', 'deleting transport ' + this.transport);
				this.transport.dispose();
				delete this.transport;
			}
		}

		/* kill running timers, including suspend if connected */
		this.cancelConnectTimer();
		this.cancelRetryTimer();
		if(indicated.state == 'connected') {
			this.cancelSuspendTimer();
		}

		/* set up retry and suspended timers */
		var change = new ConnectionStateChange(this.state.state, newState.state, newState.retryDelay, (indicated.error || ConnectionError[newState.state]));
		if(newState.retryDelay)
			this.startRetryTimer(newState.retryDelay);

		/* implement the change and notify */
		this.enactStateChange(change);
		if(this.state.sendEvents)
			this.sendQueuedMessages();
		else if(this.state.queueEvents)
			this.queuePendingMessages();
	};

	ConnectionManager.prototype.requestState = function(request) {
		/* kill running timers, as this request supersedes them */
		this.cancelConnectTimer();
		this.cancelRetryTimer();
		if(request.state == this.state.state)
			return; /* silently do nothing */
		if(this.state.terminal)
			throw new Error(this.error.reason);
		if(request.state == 'connecting') {
			if(this.state.state == 'connected')
				return; /* silently do nothing */
			this.connectImpl();
		} else {
			if(this.pendingTransport) {
				this.pendingTransport.close(true);
				this.pendingTransport = null;
			}
			if(request.state == 'failed') {
				if(this.transport) {
					this.transport.abort(request.reason);
					this.transport = null;
				}
			} else if(request.state = 'closed') {
				this.cancelConnectTimer();
				this.cancelRetryTimer();
				this.cancelSuspendTimer();
				if(this.transport) {
					this.transport.close(true);
					this.transport = null;
				}
			}
		}
		if(request.state != this.state.state) {
			var newState = states[request.state];
			var change = new ConnectionStateChange(this.state.state, newState.state, newState.retryIn, (request.error || ConnectionError[newState.state]));
			this.enactStateChange(change);
		}
	};

	ConnectionManager.prototype.connectImpl = function() {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.connectImpl()', 'starting connection');
		this.startSuspendTimer();
		this.startConnectTimer();

		var self = this;
		var auth = this.realtime.auth;
		var connectErr = function(err) {
			Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.connectImpl()', err);
			if(err.statusCode == 401 && err.message.indexOf('expire') != -1 && auth.method == 'token') {
				/* re-get a token */
				auth.getToken(true, function(err) {
					if(err) {
						connectErr(err);
						return;
					}
					self.connectImpl();
				});
			}
			/* FIXME: decide if fatal */
			var fatal = false;
			if(fatal)
				self.notifyState({state: 'failed', error: err});
			else
				self.notifyState({state: states.connecting.failState, error: err});
		};

		var tryConnect = function() {
			self.chooseTransport(function(err, transport) {
				if(err) {
					connectErr(err);
					return;
				}
				/* nothing to do .. as transport connection is initiated
				 * in chooseTransport() */
			});
		};

		if(auth.method == 'basic') {
			tryConnect();
		} else {
			auth.authorise(false, function(err) {
				if(err)
					connectErr(err);
				else
					tryConnect();
			});
		}
	};

	/******************
	 * event queueing
	 ******************/

	ConnectionManager.prototype.send = function(msg, queueEvents, callback) {
		callback = callback || noop;
		var state = this.state;

		if(state.sendEvents) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.send()', 'sending event');
			this.sendImpl(new PendingMessage(msg, callback));
			return;
		}
		if(state.queueEvents) {
			if(queueEvents) {
				this.queue(msg, callback);
			} else {
				Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.send()', 'rejecting event');
				callback(this.error);
			}
		}
	};

	ConnectionManager.prototype.sendImpl = function(pendingMessage) {
		var msg = pendingMessage.msg;
		if(pendingMessage.ackRequired) {
			msg.msgSerial = this.msgSerial++;
			this.pendingMessages.push(pendingMessage);
		}
		try {
			this.transport.send(msg, function(err) {
				/* FIXME: schedule a retry directly if we get an error */
			});
		} catch(e) {
			Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.sendQueuedMessages()', 'Unexpected exception in transport.send(): ' + e);
		}
	};

	ConnectionManager.prototype.ackMessage = function(serial, count, err) {
		Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.ackMessage()', 'serial = ' + serial + '; count = ' + count);
		err = err || null;
		var pendingMessages = this.pendingMessages;
		var firstPending = pendingMessages[0];
		if(firstPending) {
			var startSerial = firstPending.msg.msgSerial;
			var ackSerial = serial + count; /* the serial of the first message that is *not* the subject of this call */
			if(ackSerial > startSerial) {
				var ackMessages = pendingMessages.splice(0, (ackSerial - startSerial));
				for(var i = 0; i < ackMessages.length; i++) {
					ackMessages[i].callback(err);
				}
			}
		}
	};

	ConnectionManager.prototype.queue = function(msg, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.queue()', 'queueing event');
		var lastQueued = this.queuedMessages[this.queuedMessages.length - 1];
		if(lastQueued && RealtimeChannel.mergeTo(lastQueued.msg, msg)) {
			if(!lastQueued.merged) {
				lastQueued.callback = new Multicaster([lastQueued.callback]);
				lastQueued.merged = true;
			}
			lastQueued.listener.push(callback);
		} else {
			this.queuedMessages.push(new PendingMessage(msg, callback));
		}
	};

	ConnectionManager.prototype.sendQueuedMessages = function() {
		Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.sendQueuedMessages()', 'sending ' + this.queuedMessages.length + ' queued messages');
		var pendingMessage;
		while(pendingMessage = this.queuedMessages.shift())
			this.sendImpl(pendingMessage);
	};

	ConnectionManager.prototype.queuePendingMessages = function() {
		Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.queuePendingMessages()', 'queueing ' + this.pendingMessages.length + ' pending messages');
		this.queuedMessages = this.pendingMessages.concat(this.queuedMessages);
		this.pendingMessages = [];
	};

	ConnectionManager.prototype.onChannelMessage = function(message, transport) {
		/* ignore messages received on transports that are no longer
		 * the current transport. Pending operations will have been
		 * retried when the new transport became active */
		if(transport === this.transport) {
			this.connectionSerial = message.connectionSerial;
			this.realtime.channels.onChannelMessage(message);
		}
	};

	return ConnectionManager;
})();
var Transport = (function() {
	var isBrowser = (typeof(window) == 'object');
	var messagetypes = isBrowser ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');
	var actions = messagetypes.TAction;
	var flags = messagetypes.TFlags;
	var noop = function() {};

	/*
	 * EventEmitter, generates the following events:
	 * 
	 * event name       data
	 * closed           error
	 * failed           error
	 * connected        null error, connectionId
	 * event            channel message object
	 */

	/* public constructor */
	function Transport(connectionManager, auth, params) {
		EventEmitter.call(this);
		this.connectionManager = connectionManager;
		this.auth = auth;
		this.params = params;
		this.isConnected = false;
	}
	Utils.inherits(Transport, EventEmitter);

	Transport.prototype.connect = function() {};

	Transport.prototype.close = function(closing) {
		this.isConnected = false;
		this.emit('closed', ConnectionError.closed);
		this.sendClose(closing);
		this.dispose();
	};

	Transport.prototype.abort = function(error) {
		this.isConnected = false;
		this.emit('failed', error);
		this.sendClose(true);
		this.dispose();
	};

	Transport.prototype.onChannelMessage = function(message) {
		switch(message.action) {
		case actions.HEARTBEAT:
			this.emit('heartbeat');
			break;
		case actions.CONNECTED:
			this.onConnect(message);
			this.emit('connected', null, this.connectionId, message.flags);
			break;
		case actions.CLOSED:
		case actions.DISCONNECTED:
			this.isConnected = false;
			this.onDisconnect();
			/* FIXME: do we need to emit an event here? */
			break;
		case actions.ACK:
			this.emit('ack', message.msgSerial, message.count);
			break;
		case actions.NACK:
			this.emit('nack', message.msgSerial, message.count, message.error);
			break;
		case actions.ERROR:
			var err = {
				statusCode: message.statusCode,
				code: message.code,
				reason: message.reason
			};
			this.abort(err);
			break;
		default:
			this.connectionManager.onChannelMessage(message, this);
		}
	};

	Transport.prototype.onConnect = function(message) {
		this.connectionId = message.connectionId;
		this.isConnected = true;
		/* if the connected message asks us to sync the time with the server, make the request */
		/* FIXME: deprecated behaviour? probably remove
		if(message.flags && (message.flags & (1 << flags.SYNC_TIME))) {
			var self = this;
			Utils.nextTick(function() {
				self.connectionManager.realtime.time({connection_id:message.connectionId});
			});
		}
		*/
	};

	Transport.prototype.onDisconnect = function() {};

	Transport.prototype.onClose = function(wasClean, reason) {
		/* if the connectionmanager already thinks we're closed
		 * then we probably initiated it */
		if(this.connectionManager.state.state == 'closed')
			return;
		var newState = wasClean ?  'disconnected' : 'failed';
		this.isConnected = false;
		var error = Utils.copy(ConnectionError[newState]);
		if(reason) error.reason = reason;
		this.emit(newState, error);
	};

	Transport.prototype.dispose = function() {
		this.off();
	};

	return Transport;
})();
var WebSocketTransport = (function() {
	var isBrowser = (typeof(window) == 'object');
	var messagetypes = isBrowser ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');
	var WebSocket = isBrowser ? (window.WebSocket || window.MozWebSocket) : require('ws');
//	var hasBuffer = isBrowser ? !!window.ArrayBuffer : !!Buffer;
	var hasBuffer = isBrowser ? false : !!Buffer;
	var noop = function() {};

	/* public constructor */
	function WebSocketTransport(connectionManager, auth, params) {
		var binary = params.binary = params.binary && hasBuffer;
		Transport.call(this, connectionManager, auth, params);
	}
	Utils.inherits(WebSocketTransport, Transport);

	WebSocketTransport.isAvailable = function() {
		return !!WebSocket;
	};

	if(WebSocketTransport.isAvailable())
		ConnectionManager.transports.web_socket = WebSocketTransport;

	WebSocketTransport.tryConnect = function(connectionManager, auth, params, callback) {
		var transport = new WebSocketTransport(connectionManager, auth, params);
		var errorCb = function(err) { callback(err); };
		transport.on('wserror', errorCb);
		transport.on('wsopen', function() {
			Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.tryConnect()', 'viable transport ' + transport);
			transport.off('wserror', errorCb);
			callback(null, transport);
		});
		transport.connect();
	};

	WebSocketTransport.prototype.createWebSocket = function(uri, connectParams) {
		var paramCount = 0;
		if(connectParams) {
			for(var key in connectParams)
				uri += (paramCount++ ? '&' : '?') + key + '=' + connectParams[key];
		}
		this.uri = uri;
		return new WebSocket(uri);
	};

	WebSocketTransport.prototype.toString = function() {
		return 'WebSocketTransport; uri=' + this.uri;
	};

	WebSocketTransport.prototype.connect = function() {
		Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.connect()', 'starting');
		Transport.prototype.connect.call(this);
		var self = this, params = this.params, options = params.options;
		var host = Defaults.getHost(options, params.host, true);
		var port = Defaults.getPort(options);
		var wsScheme = options.encrypted ? 'wss://' : 'ws://';
		var wsUri = wsScheme + host + ':' + port + '/';
		Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.connect()', 'uri: ' + wsUri);
		this.auth.getAuthParams(function(err, authParams) {
			var paramStr = ''; for(var param in authParams) paramStr += ' ' + param + ': ' + authParams[param] + ';';
			Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.connect()', 'authParams:' + paramStr);
			if(err) {
				self.abort(UIMessages.FAIL_REASON_REFUSED);
				return;
			}
			var connectParams = params.getConnectParams(authParams);
			try {
				var wsConnection = self.wsConnection = self.createWebSocket(wsUri, connectParams);
				wsConnection.binaryType = 'arraybuffer';
				wsConnection.onopen = function() { self.onWsOpen(); };
				wsConnection.onclose = function(ev, wsReason) { self.onWsClose(ev, wsReason); };
				wsConnection.onmessage = function(ev) { self.onWsData(ev.data, typeof(ev.data) != 'string'); };
				wsConnection.onerror = function(ev) { self.onWsError(ev); };
			} catch(e) { self.onWsError(e); }
		});
	};

	WebSocketTransport.prototype.send = function(message, callback) {
		try {
			this.wsConnection.send(Serialize.TProtocolMessage.encode(message, this.params.binary));
		} catch (e) {
			var msg = 'Unexpected send exception: ' + e;
			Logger.logAction(Logger.LOG_ERROR, 'WebSocketTransport.send()', msg);
			callback(new Error(msg));
		}
	};

	WebSocketTransport.prototype.sendClose = function(closing) {
		if(closing)
			this.send(new messagetypes.TProtocolMessage({action: messagetypes.TAction.CLOSE}), noop);
	};

	WebSocketTransport.prototype.onWsData = function(data, binary) {
		Logger.logAction(Logger.LOG_MICRO, 'WebSocketTransport.onWsData()', 'data received; length = ' + data.length + '; type = ' + typeof(data) + '; binary = ' + binary);
		try {
			this.onChannelMessage(Serialize.TProtocolMessage.decode(data, binary));
		} catch (e) {
			Logger.logAction(Logger.LOG_ERROR, 'WebSocketTransport.onWsData()', 'Unexpected exception handing channel message: ' + e.stack);
		}
	};

	WebSocketTransport.prototype.onWsOpen = function() {
		Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.onWsOpen()', 'opened WebSocket');
		this.emit('wsopen');
	};

	WebSocketTransport.prototype.onWsClose = function(ev, wsReason) {
		var wasClean, code, reason;
		if(typeof(ev) == 'object') {
			/* W3C spec-compatible */
			wasClean = ev.wasClean;
			code = ev.code;
			reason = ev.reason;
		} else /*if(typeof(ev) == 'number')*/ {
			/* ws in node */
			code = ev;
			reason = wsReason || '';
			wasClean = (code == 1000);
		}
		Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.onWsClose()', 'closed WebSocket; wasClean = ' + wasClean + '; code = ' + code);
		delete this.wsConnection;
		Transport.prototype.onClose.call(this, wasClean, reason);
	};

	WebSocketTransport.prototype.onWsError = function(err) {
		Logger.logAction(Logger.LOG_ERROR, 'WebSocketTransport.onError()', 'Unexpected error from WebSocket: ' + err);
		this.emit('wserror', err);
		/* FIXME: this should not be fatal */
		this.abort();
	};

	WebSocketTransport.prototype.dispose = function() {
		if(this.wsConnection) {
			this.wsConnection.close();
			delete this.wsConnection;
		}
	};

	return WebSocketTransport;
})();
var CometTransport = (function() {
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');

	/*
	 * A base comet transport class
	 */
	function CometTransport(connectionManager, auth, params) {
		Transport.call(this, connectionManager, auth, params);
		this.binary = this.params.binary;
		this.sendRequest = null;
		this.recvRequest = null;
		this.pendingCallback = null;
		this.pendingItems = null;
	}
	(Utils || require('util')).inherits(CometTransport, Transport);

	CometTransport.paramStr = function(params, baseUri) {
		var paramCount = 0, result = baseUri || '';
		if(params) {
			for(var key in params)
				result += (paramCount++ ? '&' : '?') + key + '=' + params[key];
		}
		return result;
	};

	/* public instance methods */
	CometTransport.prototype.connect = function() {
		Logger.logAction(Logger.LOG_MINOR, 'CometTransport.connect()', 'starting');
		Transport.prototype.connect.call(this);
		var self = this, params = this.params, options = params.options;
		var host = Defaults.getHost(options, params.host);
		var port = Defaults.getPort(options);
		var cometScheme = options.encrypted ? 'https://' : 'http://';

		this.baseUri = cometScheme + host + ':' + port + '/comet/';
		var connectUri = this.baseUri + 'connect';
		Logger.logAction(Logger.LOG_MINOR, 'CometTransport.connect()', 'uri: ' + connectUri);
		this.auth.getAuthParams(function(err, authParams) {
			if(err) {
				self.abort(UIMessages.FAIL_REASON_REFUSED);
				return;
			}
			self.authParams = authParams;
			var connectParams = self.params.getConnectParams(authParams);
			Logger.logAction(Logger.LOG_MINOR, 'CometTransport.connect()', 'connectParams:' + CometTransport.paramStr(connectParams));
			try {
				self.request(connectUri, connectParams, null, false, function(err, response) {
					if(err) {
						self.emit('error', err);
						return;
					}
					self.emit('preconnect');
					self.onResponseData(response);
				});
			} catch(e) { self.emit('error', e); }
		});
	};

	CometTransport.prototype.sendClose = function(closing) {
		if(this.closeUri) {
			var self = this;
			this.request(this.closeUri(closing), this.authParams, null, false, function(err, response) {
				if(err) {
					self.emit('error', err);
					return;
				}
			});
		}
	};

	CometTransport.prototype.dispose = function() {
		if(this.recvRequest) {
			this.recvRequest.abort();
			this.recvRequest = null;
		}
	};

	CometTransport.prototype.onConnect = function(message) {
		/* the connectionId in a comet connected response is really
		 * <instId>-<connectionId> */
		var connectionStr = message.connectionId;
		message.connectionId = connectionStr.split('-').pop();
		Transport.prototype.onConnect.call(this, message);

		var baseConnectionUri =  this.baseUri + connectionStr;
		Logger.logAction(Logger.LOG_MICRO, 'CometTransport.onConnect()', 'baseUri = ' + baseConnectionUri + '; connectionId = ' + message.connectionId);
		this.sendUri = baseConnectionUri + '/send';
		this.recvUri = baseConnectionUri + '/recv';
		this.closeUri = function(closing) { return baseConnectionUri + (closing ? '/close' : '/disconnect'); };
		this.recv();
	};

	CometTransport.prototype.send = function(msg, callback) {
		if(this.sendRequest) {
			/* there is a pending send, so queue this message */
			this.pendingItems = this.pendingItems || [];
			this.pendingItems.push(msg);

			this.pendingCallback = this.pendingCallback || new Multicaster();
			this.pendingCallback.push(callback);
			return;
		}
		/* send this, plus any pending, now */
		var pendingItems = this.pendingItems || [];
		pendingItems.push(msg);
		this.pendingItems = null;

		var pendingCallback = this.pendingCallback;
		if(pendingCallback) {
			pendingCallback.push(callback);
			callback = pendingCallback;
			this.pendingCallback = null;
		}

		this.sendItems(pendingItems, callback);
	};

	CometTransport.prototype.sendItems = function(items, callback) {
		var self = this;
		try {
			this.sendRequest = self.request(self.sendUri, self.authParams, this.encodeRequest(items), false, function(err, response) {
				self.sendRequest = null;
				if(self.pendingItems) {
					self.sendItems(self.pendingItems, self.pendingCallback);
					self.pendingItems = null;
					self.pendingCallback = null;
				}
				if(err) {
					callback(err);
					return;
				}
				self.onResponseData(response);
				callback(null);
			});
		} catch (e) {
			var msg = 'Unexpected send exception: ' + e;
			Logger.logAction(Logger.LOG_ERROR, 'CometTransport.sendItems()', msg);
			callback(new Error(msg));
		}
	};

	CometTransport.prototype.recv = function() {
		if(this.recvRequest) {
			this.recvRequest.abort();
			this.recvRequest = null;
		}

		if(!this.isConnected)
			return;

		var self = this;
		this.recvRequest = this.request(this.recvUri, this.authParams, null, true, function(err, response) {
			if(err) {
				self.emit('error', err);
				return;
			}
			self.onRecvResponse(response);
			self.recvRequest = null;
			self.recv();
		});
	};

	CometTransport.prototype.onResponseData = function(responseData) {
		try {
			var items = this.decodeResponse(responseData);
			if(items && items.length)
				for(var i = 0; i < items.length; i++)
					this.onChannelMessage(items[i]);
		} catch (e) {
			Logger.logAction(Logger.LOG_ERROR, 'CometTransport.onResponseData()', 'Unexpected exception handing channel event: ' + e.stack);
		}
	};

	CometTransport.prototype.onRecvResponse = function(responseData) {
		this.onResponseData(responseData);
	};

	CometTransport.prototype.encodeRequest = function(requestItems) {
		return Serialize.TMessageBundle.encode(requestItems, this.binary);
	};

	CometTransport.prototype.decodeResponse = function(responseData) {
		return Serialize.TMessageBundle.decode(responseData, this.binary);
	};

	return CometTransport;
})();
this.Data = (function() {
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');
	var TData = messagetypes.TData;
	var TType = messagetypes.TType;

	var resolveObjects = {
		'[object Null]': function(msg, data) {
			msg.type = messagetypes.TType.NONE;
			return true;
		},
		'[object Buffer]': function(msg, data) {
			msg.type = messagetypes.TType.BUFFER;
			msg.binaryData = data;
			return true;
		},
		'[object ArrayBuffer]': function(msg, data) {
			msg.type = messagetypes.TType.BUFFER;
			msg.binaryData = data;
			return true;
		},
		'[object Array]': function(msg, data) {
			msg.type = messagetypes.TType.JSONARRAY;
			msg.stringData = JSON.stringify(data);
			return true;
		},
		'[object String]': function(msg, data) {
			msg.type = messagetypes.TType.STRING;
			msg.stringData = data.valueOf();
			return true;
		},
		'[object Number]': function(msg, data) {
			msg.type = messagetypes.TType.DOUBLE;
			msg.doubleData = data.valueOf();
			return true;
		},
		'[object Boolean]': function(msg, data) {
			msg.type = data.valueOf() ? messagetypes.TType.TRUE : messagetypes.TType.FALSE;
			return true;
		},
		'[object Object]': function(msg, data) {
			if(typeof(Buffer) !== 'undefined' && Buffer.isBuffer(data)) {
				msg.type = messagetypes.TType.BUFFER;
				msg.binaryData = data;
			} else {
				msg.type = messagetypes.TType.JSONOBJECT;
				msg.stringData = JSON.stringify(data);
			}
			return true;
		},
		'[object Function]': function(msg, data) {
			msg.type = messagetypes.TType.JSONOBJECT;
			msg.stringData = JSON.stringify(data);
			return true;
		}
	};

	var resolveTypes = {
		'undefined': function(msg, data) {
			msg.type = messagetypes.TType.NONE;
			return true;
		},
		'boolean': function(msg, data) {
			msg.type = data ? messagetypes.TType.TRUE : messagetypes.TType.FALSE;
			return true;
		},
		'string': function(msg, data) {
			msg.type = messagetypes.TType.STRING;
			msg.stringData = data;
			return true;
		},
		'number': function(msg, data) {
			msg.type = messagetypes.TType.DOUBLE;
			msg.doubleData = data;
			return true;
		},
		'object': function(msg, data) {
			var func = resolveObjects[Object.prototype.toString.call(data)];
			return (func && func(msg, data));
		}
	};

	function Data() {}

	Data.isCipherData = function(tData) {
		return tData.cipherData;
	};

	Data.fromTData = function(tData) {
		var result = undefined;
		if(tData) {
			if(tData.cipherData)
				return new Crypto.CipherData(tData.cipherData, tData.type);

			switch(tData.type) {
				case 1: /* TRUE */
					result = true;
					break;
				case 2: /* FALSE */
					result = false;
					break;
				case 3: /* INT32 */
					result = tData.i32Data;
					break;
				case 4: /* INT64 */
					result = tData.i64Data;
					break;
				case 5: /* DOUBLE */
					result = tData.doubleData;
					break;
				case 6: /* STRING */
					result = tData.stringData;
					break;
				case 7: /* BUFFER */
					result = tData.binaryData;
					break;
				case 8: /* JSONARRAY */
				case 9: /* JSONOBJECT */
					result = JSON.parse(tData.stringData);
					break;
				case 0: /* NONE */
			}
		}
		return result;
	};

	Data.toTData = function(value) {
		var result = new messagetypes.TData();
		var func = resolveTypes[typeof(value)];
		if(func && func(result, value))
			return result;
		throw new Error('Unsupported data type: ' + Object.prototype.toString.call(value));
	};

	return Data;
})();
var Message = (function() {
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');
	var TData = messagetypes.TData;

	/* public constructor */
	function Message(channelSerial, timestamp, name, data) {
		this.channelSerial = channelSerial;
		this.timestamp = timestamp;
		this.name = name;
		this.data = data;
	}

	Message.encrypt = function(msg, cipher) {
		var cipherData = new TData(), data = msg.data;
		cipherData.cipherData = cipher.encrypt(Crypto.Data.asPlaintext(data));
		cipherData.type = data.type;
		msg.data = cipherData;
	};

	Message.decrypt = function(msg, cipher) {
		var data = msg.data;
		if(data.cipherData)
			msg.data = Crypto.Data.fromPlaintext(cipher.decrypt(data.cipherData), data.type);
	};

	return Message;
})();
var PresenceMessage = (function() {

	/* public constructor */
	function PresenceMessage(clientId, clientData, memberId) {
		this.clientId = clientId;
		this.clientData = clientData;
		this.memberId = memberId;
	}

	return PresenceMessage;
})();
this.Serialize = (function() {
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');

	function Serialize() {}

	var TData = Serialize.TData = {},
		TMessage = Serialize.TMessage = {},
		TPresence = Serialize.TPresence = {},
		TProtocolMessage = Serialize.TProtocolMessage = {},
		TMessageArray = Serialize.TMessageArray = {},
		TMessageBundle = Serialize.TMessageBundle = {},
		BUFFER = messagetypes.TType.BUFFER;

	/**
	 * Overload toJSON() to intercept JSON.stringify()
	 * @return {*}
	 */
	messagetypes.TMessage.prototype.toJSON = function() {
		var tData = this.data, result = {
			name: this.name,
			clientId: this.clientId,
			timestamp: this.timestamp,
			tags: this.tags
		};

		var value;
		if(value = Data.isCipherData(tData)) {
			result.encoding = 'cipher+base64';
			value = Crypto.Data.asBase64(value);
			result.type = tData.type;
		} else {
			value = Data.fromTData(tData);
			if(tData.type == BUFFER) {
				result.encoding = 'base64';
				value = value.toString('base64');
			}
		}
		result.data = value;
		return result;
	};

	/**
	 * Overload toJSON() to intercept JSON.stringify()
	 * @return {*}
	 */
	messagetypes.TPresence.prototype.toJSON = function() {
		var tData = this.clientData, result = {
			name: this.name,
			clientId: this.clientId,
			timestamp: this.timestamp,
			tags: this.tags
		};
		var value = Data.fromTData(tData);
		if(tData.type == BUFFER) {
			result.encoding = 'base64'
			value = value.toString('base64');
		}
		result.clientData = value;
		return result;
	};

	TData.fromREST = function(jsonObject, jsonData) {
		var tData, encoding = jsonObject.encoding;
		switch(encoding) {
			case 'cipher+base64':
				tData = new messagetypes.TData();
				tData.type = jsonObject.type;
				tData.cipherData = Crypto.Data.fromBase64(jsonData);
				break;
			case 'base64':
				tData = new messagetypes.TData();
				tData.type = BUFFER;
				tData.binaryData = new Buffer(jsonData, 'base64');
				break;
			default:
				tData = Data.toTData(jsonData);
		}
		return tData;
	};

	TMessage.fromJSON = function(jsonObject) {
		jsonObject.data = TData.fromREST(jsonObject, jsonObject.data);
		return new messagetypes.TMessage(jsonObject);
	};

	TPresence.fromJSON = function(jsonObject) {
		jsonObject.clientData = TData.fromREST(jsonObject, jsonObject.clientData);
		return new messagetypes.TPresence(jsonObject);
	};

	TProtocolMessage.fromJSON = function(jsonObject) {
		var elements;
		if(elements = jsonObject.messages) {
			var count = elements.length;
			var messages = jsonObject.messages = new Array(count);
			for(var i = 0; i < count; i++) messages[i] = TMessage.fromJSON(elements[i]);
		}
		if(elements = jsonObject.presence) {
			var count = elements.length;
			var presence = jsonObject.presence = new Array(count);
			for(var i = 0; i < count; i++) presence[i] = TPresence.fromJSON(elements[i]);
		}
		return new messagetypes.TProtocolMessage(jsonObject);
	};

	TProtocolMessage.decode = function(encoded, binary) {
		var result, err;
		if(binary) {
			if(err = ThriftUtil.decodeSync((result = new messagetypes.TProtocolMessage()), encoded)) throw err;
		} else {
			result = TProtocolMessage.fromJSON(JSON.parse(encoded));
		}
		return result;
	};

	/* NOTE: decodes to items */
	TMessageBundle.decode = function(encoded, binary) {
		var items = null, err;
		if(encoded) {
			if(binary) {
				var ob;
				if(err = ThriftUtil.decodeSync((ob = new messagetypes.TMessageBundle()), encoded)) throw err;
				items = ob.items;
			} else {
				var elements = JSON.parse(encoded), count = elements.length;
				items = new Array(count);
				for(var i = 0; i < count; i++) items[i] = TProtocolMessage.fromJSON(elements[i]);
			}
		}
		return items;
	};

	TProtocolMessage.encode = function(message, binary) {
		return binary ? ThriftUtil.encodeSync(message) : JSON.stringify(message);
	};

	TMessageBundle.encode = function(items, binary) {
		return binary ? ThriftUtil.encodeSync(new messagetypes.TMessageBundle({items:items})) : JSON.stringify(items);
	};

	TMessageArray.encode = function(items, binary) {
		return binary
			? ThriftUtil.encodeSync(new messagetypes.TMessageArray({items:items.map(TMessage.fromJSON)}))
			: JSON.stringify(items);
	};

	TMessageArray.decode = function(encoded, binary) {
		var items = null, err;
		if(encoded) {
			if(binary) {
				var ob;
				if(err = ThriftUtil.decodeSync((ob = new messagetypes.TMessageArray()), encoded)) throw err;
				items = ob.items;
			} else {
				var elements = JSON.parse(encoded), count = elements.length;
				items = new Array(count);
				for(var i = 0; i < count; i++) items[i] = TMessage.fromJSON(elements[i]);
			}
		}
		return items;
	};

	return Serialize;
})();
var Resource = (function() {

	function Resource() {}

	Resource.get = function(rest, path, headers, params, callback) {
		function tryGet() {
			rest.auth.getAuthHeaders(function(err, authHeaders) {
				if(err) {
					callback(err);
					return;
				}
				Http.get(rest, path, Utils.mixin(authHeaders, headers), params, function(err, res, headers) {
					if(err && err.code == 40140) {
						/* token has expired, so get a new one */
						rest.auth.authorise({force:true}, function(err) {
							if(err) {
								callback(err);
								return;
							}
							/* retry ... */
							tryGet();
						});
						return;
					}
					callback(err, res, headers);
				});
			});
		}
		tryGet();
	};

	Resource.post = function(rest, path, body, headers, params, callback) {
		function tryPost() {
			rest.auth.getAuthHeaders(function(err, authHeaders) {
				if(err) {
					callback(err);
					return;
				}
				Http.post(rest, path, Utils.mixin(authHeaders, headers), body, params, function(err, res, headers) {
					if(err && err.code == 40140) {
						/* token has expired, so get a new one */
						rest.auth.authorise({force:true}, function(err) {
							if(err) {
								callback(err);
								return;
							}
							/* retry ... */
							tryPost();
						});
						return;
					}
					callback(err, res, headers);
				});
			});
		}
		tryPost();
	};

	return Resource;
})();
var PaginatedResource = (function() {

	function PaginatedResource(rest, path, headers, params, bodyHandler) {
		this.rest = rest;
		this.path = path;
		this.headers = headers;
		this.params = params;
		this.bodyHandler = bodyHandler;
		this.basePath = path.substr(0, path.lastIndexOf('/') + 1);
		this.current = null;
	}

	PaginatedResource.prototype.get = function(callback) {
		var self = this;
		Resource.get(this.rest, this.path, this.headers, this.params, function(err, body, headers) {
			if(err) {
				Logger.logAction(Logger.LOG_ERROR, 'PaginatedResource.get()', 'Unexpected error getting resource: err = ' + err);
				return;
			}
			var current = self.current = self.bodyHandler(body);
			var linkHeaders, relLinks;
			if(headers && (linkHeaders = (headers['Link'] || headers['link'])))
				relLinks = self.parseRelLinks(linkHeaders.split(','));

			callback(null, current, relLinks);
		});
	};

	PaginatedResource.prototype.parseRelLinks = function(linkHeaders) {
		var relLinks = {}, self = this;
		for(var i = 0; i < linkHeaders.length; i++) {
			var linkMatch = linkHeaders[i].match(/^\s*<(.+)>;\s*rel="(\w+)"$/);
			if(linkMatch) {
				var relLink = self.getRel(linkMatch[1]);
				if(relLink)
					relLinks[linkMatch[2]] = relLink;
			}
		}
		return relLinks;
	};

	PaginatedResource.prototype.getRel = function(linkUrl) {
		var urlMatch = linkUrl.match(/^\.\/(\w+)\?(.*)$/);
		if(!urlMatch) return null;

		var self = this;
		return function(callback) {
			(new PaginatedResource(self.rest, self.basePath + urlMatch[1], self.headers, Utils.parseQueryString(urlMatch[2]), self.bodyHandler)).get(callback);
		};
	};

	return PaginatedResource;
})();var Auth = (function() {
	var isBrowser = (typeof(window) == 'object');
	var crypto = isBrowser ? null : require('crypto');
	function noop() {}
	function random() { return ('000000' + Math.floor(Math.random() * 1E16)).slice(-16); }

	var hmac, toBase64 = undefined;
	if(isBrowser) {
		toBase64 = Base64.encode;
		if(window.CryptoJS && CryptoJS.HmacSHA256 && CryptoJS.enc.Base64) {
			hmac = function(text, key) {
				return CryptoJS.HmacSHA256(text, key).toString(CryptoJS.enc.Base64);
			};
		}
	} else {
		toBase64 = function(str) { return (new Buffer(str, 'ascii')).toString('base64'); };
		hmac = function(text, key) {
			var inst = crypto.createHmac('SHA256', key);
			inst.update(text);
			return inst.digest('base64');
		};
	}

	function c14n(capability) {
		if(!capability)
			return '';

		if(typeof(capability) == 'string')
			capability = JSON.parse(capability);

		var c14nCapability = {};
		var keys = Utils.keysArray(capability, true);
		if(!keys)
			return '';
		keys.sort();
		for(var i = 0; i < keys.length; i++) {
			c14nCapability[keys[i]] = capability[keys[i]].sort();
		}
		return JSON.stringify(c14nCapability);
	}

	function Auth(rest, options) {
		this.rest = rest;

		/* tokenOptions contains the parameters that may be used in
		 * token requests */
		var tokenOptions = this.tokenOptions = {};
		if(options.keyId) var keyId = tokenOptions.keyId = options.keyId;
		if(options.keyValue) tokenOptions.keyValue = options.keyValue;

		/* decide default auth method */
		if(options.keyValue) {
			if(!options.clientId) {
				/* we have the key and do not need to authenticate the client,
				 * so default to using basic auth */
				Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'anonymous, using basic auth');
				this.method = 'basic';
				this.basicKey = toBase64(options.key || (options.keyId + ':' + options.keyValue));
				this.keyId = options.keyId;
				this.keyValue = options.keyValue;
				return;
			}
			/* token auth, but we have the key so we can authorise
			 * ourselves */
			if(!hmac) {
				var msg = 'client-side token request signing not supported';
				Logger.logAction(Logger.LOG_ERROR, 'Auth()', msg);
				throw new Error(msg);
			}
		}
		/* using token auth, but decide the method */
		this.method = 'token';
		if(options.authToken)
			this.token = {id: options.authToken};
		if(options.authCallback) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with authCallback');
			tokenOptions.authCallback = options.authCallback;
		} else if(options.authUrl) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with authUrl');
			tokenOptions.authUrl = options.authUrl;
		} else if(options.keyValue) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with client-side signing');
		} else if(this.token) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with supplied token only');
		} else {
			var msg = 'options must include valid authentication parameters';
			Logger.logAction(Logger.LOG_ERROR, 'Auth()', msg);
			throw new Error(msg);
		}
	}

	/**
	 * Ensure valid auth credentials are present. This may rely in an already-known
	 * and valid token, and will obtain a new token if necessary or explicitly
	 * requested.
	 * Authorisation will use the parameters supplied on construction except
	 * where overridden with the options supplied in the call.
	 * @param params
	 * an object containing the request params:
	 * - keyId:      (optional) the id of the key to use; if not specified, a key id
	 *               passed in constructing the Rest interface may be used
	 *
	 * - keyValue:   (optional) the secret of the key to use; if not specified, a key
	 *               value passed in constructing the Rest interface may be used
	 *
	 * - ttl:    (optional) the requested life of any new token in seconds. If none
	 *               is specified a default of 1 hour is provided. The maximum lifetime
	 *               is 24hours; any request exceeeding that lifetime will be rejected
	 *               with an error.
	 *
	 * - capability: (optional) the capability to associate with the access token.
	 *               If none is specified, a token will be requested with all of the
	 *               capabilities of the specified key.
	 *
	 * - clientId:   (optional) a client Id to associate with the token
	 *
	 * - timestamp:  (optional) the time in seconds since the epoch. If none is specified,
	 *               the system will be queried for a time value to use.
	 *
	 * - queryTime   (optional) boolean indicating that the Ably system should be
	 *               queried for the current time when none is specified explicitly.
	 *
	 * - force       (optional) boolean indicating that a new token should be requested,
	 *               even if a current token is still valid.
	 *
	 * @param callback (err, tokenDetails)
	 */
	Auth.prototype.authorise = function(options, callback) {
		var token = this.token;
		if(token) {
			if(token.expires === undefined || (token.expires > this.getTimestamp())) {
				if(!options.force) {
					Logger.logAction(Logger.LOG_MINOR, 'Auth.getToken()', 'using cached token; expires = ' + token.expires);
					callback(null, token);
					return;
				}
			} else {
				/* expired, so remove */
				Logger.logAction(Logger.LOG_MINOR, 'Auth.getToken()', 'deleting expired token');
				this.token = null;
			}
		}
		var self = this;
		this.requestToken(options, function(err, tokenResponse) {
			if(err) {
				callback(err);
				return;
			}
			callback(null, (self.token = tokenResponse.access_token));
		});
	};

	/**
	 * Request an access token
	 * @param options
	 * an object containing the request options:
	 * - keyId:         the id of the key to use.
	 *
	 * - keyValue:      (optional) the secret value of the key; if not
	 *                  specified, a key passed in constructing the Rest interface will be used; or
	 *                  if no key is available, a token request callback or url will be used.
	 *
	 * - authCallback:  (optional) a javascript callback to be used, passing a set of token
	 *                  request params, to get a signed token request.
	 *
	 * - authUrl:       (optional) a URL to be used to GET or POST a set of token request
	 *                  params, to obtain a signed token request.
	 *
	 * - authHeaders:   (optional) a set of application-specific headers to be added to any request
	 *                  made to the authUrl.
	 *
	 * - authParams:    (optional) a set of application-specific query params to be added to any
	 *                  request made to the authUrl.
	 *
	 * - ttl:       (optional) the requested life of the token in seconds. If none is specified
	 *                  a default of 1 hour is provided. The maximum lifetime is 24hours; any request
	 *                  exceeeding that lifetime will be rejected with an error.
	 *
	 * - capability:    (optional) the capability to associate with the access token.
	 *                  If none is specified, a token will be requested with all of the
	 *                  capabilities of the specified key.
	 *
	 * - clientId:      (optional) a client Id to associate with the token; if not
	 *                  specified, a clientId passed in constructing the Rest interface will be used
	 *
	 * - timestamp:     (optional) the time in seconds since the epoch. If none is specified,
	 *                  the system will be queried for a time value to use.
	 *
	 * - queryTime      (optional) boolean indicating that the ably system should be
	 *                  queried for the current time when none is specified explicitly
	 *
	 * @param callback (err, tokenDetails)
	 */
	Auth.prototype.requestToken = function(options, callback) {
		/* shuffle and normalise arguments as necessary */
		if(typeof(options) == 'function' && !callback) {
			callback = options;
			options = {};
		}
		options = options || {};
		callback = callback || noop;

		/* merge supplied options with the already-known options */
		options = Utils.mixin(Utils.copy(this.tokenOptions), options);

		/* first set up whatever callback will be used to get signed
		 * token requests */
		var tokenRequestCallback, rest = this.rest;
		if(options.authCallback) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with auth_callback');
			tokenRequestCallback = options.authCallback;
		} else if(options.authUrl) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with auth_url');
			tokenRequestCallback = function(params, cb) {
				Http.get(rest, options.authUrl, options.authHeaders || {}, Utils.mixin(params, options.authParams), cb);
			};
		} else if(options.keyValue) {
			var self = this;
			Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with client-side signing');
			tokenRequestCallback = function(params, cb) { self.createTokenRequest(Utils.mixin(Utils.copy(options), params), cb); };
		} else {
			throw new Error('Auth.requestToken(): options must include valid authentication parameters');
		}

		/* now set up the request params */
		var requestParams = {};
		var clientId = options.clientId || this.rest.clientId;
		if(clientId)
			requestParams.client_id = clientId;

		var ttl = options.ttl || '';
		if('ttl' in options)
			requestParams.ttl = ttl;

		if('capability' in options)
			requestParams.capability = c14n(options.capability);

		var rest = this.rest, tokenUri = function(host) { return rest.baseUri(host) + '/keys/' + options.keyId + '/requestToken'; };
		var tokenRequest = function(ob, tokenCb) {
			if(Http.post)
				Http.post(rest, tokenUri, Utils.defaultPostHeaders(), ob, null, tokenCb);
			else
				Http.get(rest, tokenUri, Utils.defaultGetHeaders(), ob, tokenCb);
		};
		tokenRequestCallback(requestParams, function(err, signedRequest) {
			if(err) {
				Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', 'token request signing call returned error; err = ' + err);
				callback(err);
				return;
			}
			tokenRequest(signedRequest, function(err, tokenResponse) {
				if(err) {
					Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', 'token request API call returned error; err = ' + err);
					callback(err);
					return;
				}
				Logger.logAction(Logger.LOG_MINOR, 'Auth.getToken()', 'token received');
				callback(null, tokenResponse.access_token);
			});
		});
	};

	/**
	 * Create and sign a token request based on the given options.
	 * NOTE this can only be used when the key value is available locally.
	 * Otherwise, signed token requests must be obtained from the key
	 * owner (either using the token request callback or url).
	 *
	 * Valid token request options are:
	 * - keyId:         the id of the key to use.
	 *
	 * - keyValue:      the secret value of the key to use.
	 *
	 * - ttl:       (optional) the requested life of the token in seconds. If none is specified
	 *                  a default of 1 hour is provided. The maximum lifetime is 24hours; any request
	 *                  exceeeding that lifetime will be rejected with an error.
	 *
	 * - capability:    (optional) the capability to associate with the access token.
	 *                  If none is specified, a token will be requested with all of the
	 *                  capabilities of the specified key.
	 *
	 * - clientId:      (optional) a client Id to associate with the token; if not
	 *                  specified, a clientId passed in constructing the Rest interface will be used
	 *
	 * - timestamp:     (optional) the time in seconds since the epoch. If none is specified,
	 *                  the system will be queried for a time value to use.
	 *
	 * - queryTime      (optional) boolean indicating that the ably system should be
	 *                  queried for the current time when none is specified explicitly
	 */
	Auth.prototype.createTokenRequest = function(options, callback) {
		var keyId = options.keyId;
		var keyValue = options.keyValue;
		if(!keyId || !keyValue) {
			callback(new Error('No key specified'));
			return;
		}
		var request = { id: keyId };
		var clientId = options.clientId || '';
		if(clientId)
			request.client_id = options.clientId;

		var ttl = options.ttl || '';
		if(ttl)
			request.ttl = ttl;

		var capability = options.capability || '';
		if(capability)
			request.capability = capability;

		var rest = this.rest, self = this;
		(function(authoriseCb) {
			if(options.timestamp) {
				authoriseCb();
				return;
			}
			if(options.queryTime) {
				rest.time(function(err, time) {
					if(err) {callback(err); return;}
					options.timestamp = Math.floor(time/1000);
					authoriseCb();
				});
				return;
			}
			options.timestamp = self.getTimestamp();
			authoriseCb();
		})(function() {
			/* nonce */
			/* NOTE: there is no expectation that the client
			 * specifies the nonce; this is done by the library
			 * However, this can be overridden by the client
			 * simply for testing purposes. */
			var nonce = request.nonce = (options.nonce || random());

			var timestamp = request.timestamp = options.timestamp;

			var signText
			=	request.id + '\n'
			+	ttl + '\n'
			+	capability + '\n'
			+	clientId + '\n'
			+	timestamp + '\n'
			+	nonce + '\n';
			/* mac */
			/* NOTE: there is no expectation that the client
			 * specifies the mac; this is done by the library
			 * However, this can be overridden by the client
			 * simply for testing purposes. */
			request.mac = options.mac || hmac(signText, keyValue);

			Logger.logAction(Logger.LOG_MINOR, 'Auth.getTokenRequest()', 'generated signed request');
			callback(null, request);
		});
	};

	/**
	 * Get the auth query params to use for a websocket connection,
	 * based on the current auth parameters
	 */
	Auth.prototype.getAuthParams = function(callback) {
		if(this.method == 'basic')
			callback(null, {key_id: this.keyId, key_value: this.keyValue});
		else
			this.authorise({}, function(err, token) {
				if(err) {
					callback(err);
					return;
				}
				callback(null, {access_token:token.id});
			});
	};

	/**
	 * Get the authorization header to use for a REST or comet request,
	 * based on the current auth parameters
	 */
	Auth.prototype.getAuthHeaders = function(callback) {
		if(this.method == 'basic') {
			callback(null, {authorization: 'Basic ' + this.basicKey});
		} else {
			this.authorise({}, function(err, token) {
				if(err) {
					callback(err);
					return;
				}
				callback(null, {authorization: 'Bearer ' + toBase64(token.id)});
			});
		}
	};

	Auth.prototype.getTimestamp = function() {
		var time = Date.now() + (this.rest.serverTimeOffset || 0);
		return Math.floor(time / 1000);
	};

	return Auth;
})();
var Rest = (function() {
	var noop = function() {};
	var identity = function(x) { return x; }

	function Rest(options) {
		/* normalise options */
		if(!options) {
			var msg = 'no options provided';
			Logger.logAction(Logger.LOG_ERROR, 'Rest()', msg);
			throw new Error(msg);
		}
		if(typeof(options) == 'string')
			options = {key: options};
		this.options = options;

		/* process options */
		if(options.key) {
			var keyMatch = options.key.match(/^([^:\s]+):([^:.\s]+)$/);
			if(!keyMatch) {
				var msg = 'invalid key parameter';
				Logger.logAction(Logger.LOG_ERROR, 'Rest()', msg);
				throw new Error(msg);
			}
			options.keyId = keyMatch[1];
			options.keyValue = keyMatch[2];
		}
		if(options.log)
			Logger.setLog(options.log.level, options.log.handler);
		Logger.logAction(Logger.LOG_MINOR, 'Rest()', 'started');
		this.clientId = options.clientId;

		if((typeof(window) == 'object') && (window.location.protocol == 'https:') && !('encrypted' in options))
			options.encrypted = true;

		this.serverTimeOffset = null;
		var authority = this.authority = function(host) { return 'https://' + host + ':' + (options.tlsPort || Defaults.TLS_PORT); };
		this.baseUri = authority;

		this.auth = new Auth(this, options);
		this.channels = new Channels(this);
	}

	Rest.prototype.stats = function(params, callback) {
		/* params and callback are optional; see if params contains the callback */
		if(callback === undefined) {
			if(typeof(params) == 'function') {
				callback = params;
				params = null;
			} else {
				callback = noop;
			}
		}
		var headers = Utils.copy(Utils.defaultGetHeaders());
		if(this.options.headers)
			Utils.mixin(headers, this.options.headers);
		(new PaginatedResource(this, '/stats', headers, params, identity)).get(callback);
	};

	Rest.prototype.time = function(params, callback) {
		/* params and callback are optional; see if params contains the callback */
		if(callback === undefined) {
			if(typeof(params) == 'function') {
				callback = params;
				params = null;
			} else {
				callback = noop;
			}
		}
		var headers = Utils.copy(Utils.defaultGetHeaders());
		if(this.options.headers)
			Utils.mixin(headers, this.options.headers);
		var self = this;
		var timeUri = function(host) { return self.authority(host) + '/time' };
		Http.get(this, timeUri, headers, params, function(err, res) {
			if(err) {
				callback(err);
				return;
			}
			var time = res[0];
			if(!time) {
				err = new Error('Internal error (unexpected result type from GET /time');
				err.statusCode = 500;
				callback(err);
				return;
			}
			self.serverTimeOffset = (time - Date.now());
			callback(null, time);
		});
	};

	function Channels(rest) {
		this.rest = rest;
		this.attached = {};
	}

	Channels.prototype.get = function(name) {
		name = String(name);
		var channel = this.attached[name];
		if(!channel) {
			this.attached[name] = channel = new Channel(this.rest, name);
		}
		return channel;
	};

	return Rest;
})();var Realtime = (function() {

	function Realtime(options) {
		Rest.call(this, options);
		this.connection = new Connection(this, options);
		this.channels = new Channels(this);
		this.connection.connect();
	}
	Utils.inherits(Realtime, Rest);

	Realtime.prototype.close = function() {
		Logger.logAction(Logger.LOG_MINOR, 'Realtime.close()', '');
		this.connection.close();
	};

	function Channels(realtime) {
		this.realtime = realtime;
		this.attached = {};
		var self = this;
		realtime.connection.connectionManager.on('transport.active', function(transport) { self.onTransportActive(transport); });
	}

	Channels.prototype.onChannelMessage = function(msg) {
		var channelName = msg.channel;
		if(!channelName) {
			Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager on(channelmessage)', 'received event unspecified channel: ' + channelName);
			return;
		}
		var channel = this.attached[channelName];
		if(!channel) {
			Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager on(channelmessage)', 'received event for non-existent channel: ' + channelName);
			return;
		}
		channel.onMessage(msg);
	};

	/* called when a transport becomes connected; reattempt attach()
	 * for channels that were pending from a previous transport */
	Channels.prototype.onTransportActive = function() {
		for(var channelId in this.attached) {
			var channel = this.attached[channelId];
			if(channel.state == 'attaching')
				channel.attachImpl();
			else if(channel.state == 'detaching')
				channel.detachImpl();
		}
	};

	Channels.prototype.get = function(name) {
		name = String(name);
		var channel = this.attached[name];
		if(!channel) {
			this.attached[name] = channel = new RealtimeChannel(this.realtime, name, this.realtime.options);
		}
		return channel;
	};

	return Realtime;
})();
var ConnectionStateChange = (function() {

	/* public constructor */
	function ConnectionStateChange(previous, current, retryIn, reason) {
		this.previous = previous;
		this.current = current;
		if(retryIn) this.retryIn = retryIn;
		if(reason) this.reason = reason;
	}

	return ConnectionStateChange;
})();
var Connection = (function() {

	/* public constructor */
	function Connection(ably, options) {
		EventEmitter.call(this);
		this.ably = ably;
		this.connectionManager = new ConnectionManager(ably, options);
		this.state = this.connectionManager.state.state;
		this.id = undefined;

		var self = this;
		this.connectionManager.on('connectionstate', function(stateChange) {
			var state = self.state = stateChange.current;
			Utils.nextTick(function() {
				self.emit(state, stateChange);
			});
		});
	}
	Utils.inherits(Connection, EventEmitter);

	/* public instance methods */
	Connection.prototype.on = function(state, callback) {
		EventEmitter.prototype.on.call(this, state, callback);
		if(this.state == state && callback)
			try {
				callback(new ConnectionStateChange(undefined, state));
			} catch(e) {}
	};

	Connection.prototype.connect = function() {
		this.connectionManager.requestState({state: 'connecting'});
	};

	Connection.prototype.close = function() {
		this.connectionManager.requestState({state: 'closed'});
	};

	return Connection;
})();
var Channel = (function() {
	function noop() {}

	/* public constructor */
	function Channel(rest, name, options) {
		Logger.logAction(Logger.LOG_MINOR, 'Channel()', 'started; name = ' + name);
		EventEmitter.call(this);
		this.rest = rest;
    	this.name = name;
		this.cipher = null;
	}
	Utils.inherits(Channel, EventEmitter);

	Channel.prototype.setOptions = function(channelOpts, callback) {
		if(channelOpts && channelOpts.encrypted)
			this.cipher = Crypto.getCipher(channelOpts, callback);
		else
			callback(null, this.cipher = null);
	};

	Channel.prototype.presence = function(params, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Channel.presence()', 'channel = ' + this.name);
		/* params and callback are optional; see if params contains the callback */
		if(callback === undefined) {
			if(typeof(params) == 'function') {
				callback = params;
				params = null;
			} else {
				callback = noop;
			}
		}
		var rest = this.rest, binary = !rest.options.useTextProtocol;
		var headers = Utils.copy(Utils.defaultGetHeaders(binary));
		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);
		Resource.get(rest, '/channels/' + this.name + '/presence', headers, params, function(err, res) {
			if(err) {
				callback(err);
				return;
			}
			if(binary) PresenceMessage.decodeTPresenceArray(res, callback);
			else callback(null, res);
		});
	};

	Channel.prototype.history = function(params, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Channel.history()', 'channel = ' + this.name);
		/* params and callback are optional; see if params contains the callback */
		if(callback === undefined) {
			if(typeof(params) == 'function') {
				callback = params;
				params = null;
			} else {
				callback = noop;
			}
		}
		var rest = this.rest,
			binary = !rest.options.useTextProtocol,
			headers = Utils.copy(Utils.defaultGetHeaders(binary)),
			cipher = this.cipher;

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);
		Resource.get(rest, '/channels/' + this.name + '/history', headers, params, function(err, res) {
			if(err) {
				callback(err);
				return;
			}
			try {
				var messages = Serialize.TMessageArray.decode(res, binary);
				if(cipher)
					for(var i = 0; i < messages.length; i++)
						Message.decrypt(messages[i], cipher);

				callback(null, messages);
			} catch(err) {
				callback(err);
			}
		});
	};

	Channel.prototype.publish = function(name, data, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Channel.publish()', 'channel = ' + this.name + '; name = ' + name);
		callback = callback || noop;
		var rest = this.rest,
			binary = !rest.options.useTextProtocol,
			msg = {name:name, data:data},
			cipher = this.cipher;
		if(cipher)
			Message.encrypt(msg, cipher);
		var requestBody = Serialize.TMessageArray.encode([msg], binary);
		var headers = Utils.copy(Utils.defaultPostHeaders(binary));
		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);
		Resource.post(rest, '/channels/' + this.name + '/publish', requestBody, headers, null, callback);
	};

	return Channel;
})();
var RealtimeChannel = (function() {
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');
	var actions = messagetypes.TAction;
	var noop = function() {};

	var defaultOptions = {
		queueEvents: true
	};

	/* public constructor */
	function RealtimeChannel(realtime, name, options) {
		Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel()', 'started; name = ' + name);
		Channel.call(this, realtime, name, options);
    	this.presence = new Presence(this, options);
    	this.connectionManager = realtime.connection.connectionManager;
    	this.options = Utils.prototypicalClone(defaultOptions, options);
    	this.state = 'initialized';
    	this.subscriptions = new EventEmitter();
    	this.pendingEvents = [];
	}
	Utils.inherits(RealtimeChannel, Channel);

	RealtimeChannel.invalidStateError = {
		statusCode: 400,
		code: 90001,
		reason: 'Channel operation failed (invalid channel state)'
	};

	RealtimeChannel.prototype.setOptions = function(channelOpts, callback) {
		callback = callback || noop;
		if(channelOpts && channelOpts.encrypted) {
			var self = this;
			Crypto.getCipher(channelOpts, function(err, cipher) {
				self.cipher = cipher;
				callback(null);
			});
		} else {
			callback(null, this.cipher = null);
		}
	};

	RealtimeChannel.prototype.publish = function(name, data, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.publish()', 'name = ' + name);
		callback = callback || noop;
		var connectionManager = this.connectionManager;
    	if(!ConnectionManager.activeState(connectionManager.state)) {
			callback(connectionManager.getStateError());
			return;
		}
    	var message = new messagetypes.TMessage(),
			cipher = this.cipher;
    	message.name = name;
    	message.data = Data.toTData(data);
		if(cipher)
			Message.encrypt(message, cipher);

		switch(this.state) {
			case 'attached':
				Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.publish()', 'sending message');
				var msg = new messagetypes.TProtocolMessage();
				msg.action = messagetypes.TAction.MESSAGE;
				msg.channel = this.name;
				msg.messages = [message];
				this.sendMessage(msg, callback);
				break;
			default:
				this.attach();
			case 'attaching':
				Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.publish()', 'queueing message');
				this.pendingEvents.push({message: message, listener: callback});
				break;
		}
	};

	RealtimeChannel.prototype.onEvent = function(messages) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.onEvent()', 'received message');
		var subscriptions = this.subscriptions;
    	for(var i = 0; i < messages.length; i++) {
    		var message = messages[i];
    		subscriptions.emit(message.name, message);
    	}
    };

    RealtimeChannel.prototype.attach = function(callback) {
    	callback = callback || noop;
    	var connectionManager = this.connectionManager;
    	var connectionState = connectionManager.state;
    	if(!ConnectionManager.activeState(connectionState)) {
			callback(connectionManager.getStateError());
			return;
		}
		if(this.state == 'attached') {
			callback();
			return;
		}
		if(this.state == 'failed') {
			callback(connectionManager.getStateError());
			return;
		}
		this.once(function(err) {
			switch(this.event) {
			case 'attached':
				callback();
				break;
			case 'detached':
			case 'failed':
				callback(err || connectionManager.getStateError());
			}
		});
		this.attachImpl();
    };

    RealtimeChannel.prototype.attachImpl = function(callback) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.attachImpl()', 'sending ATTACH message');
		this.state = 'attaching';
    	var msg = new messagetypes.TProtocolMessage({action: messagetypes.TAction.ATTACH, channel: this.name});
    	this.sendMessage(msg, (callback || noop));
	};

    RealtimeChannel.prototype.detach = function(callback) {
    	callback = callback || noop;
    	var connectionManager = this.connectionManager;
    	var connectionState = connectionManager.state;
    	if(!ConnectionManager.activeState(connectionState)) {
			callback(connectionManager.getStateError());
			return;
		}
		if(this.state == 'detached') {
			callback();
			return;
		}
		this.once(function(err) {
			switch(this.event) {
			case 'detached':
				callback();
				break;
			case 'attached':
				/* this shouldn't happen ... */
				callback(ConnectionError.unknownChannelErr);
				break;
			case 'failed':
				callback(err || connectionManager.getStateError());
				break;
			}
		});
		this.detachImpl();
	};

	RealtimeChannel.prototype.detachImpl = function(callback) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.attach()', 'sending DETACH message');
		this.state = 'detaching';
    	var msg = new messagetypes.TProtocolMessage({action: messagetypes.TAction.DETACH, channel: this.name});
    	this.sendMessage(msg, (callback || noop));
	};

	RealtimeChannel.prototype.subscribe = function(/* [event], listener */) {
		var args = Array.prototype.slice.call(arguments);
		if(args.length == 1 && typeof(args[0]) == 'function')
			args.unshift(null);

		var event = args[0];
		var listener = args[1];
		var callback = args[2] = (args[2] || noop);
		var subscriptions = this.subscriptions;

		if(event === null || !Utils.isArray(event))
			subscriptions.on(event, listener);
		else
			for(var i = 0; i < event.length; i++)
				subscriptions.on(event[i], listener);

		this.attach(callback);
	};

	RealtimeChannel.prototype.unsubscribe = function(/* [event], listener */) {
		var args = Array.prototype.slice.call(arguments);
		if(args.length == 1 && typeof(args[0]) == 'function')
			args.unshift(null);

		var event = args[0];
		var listener = args[1];
		var subscriptions = this.subscriptions;

		if(event === null || !Utils.isArray(event))
			subscriptions.off(event, listener);
		else
			for(var i = 0; i < event.length; i++)
				subscriptions.off(event[i], listener);
	};

	RealtimeChannel.prototype.sendMessage = function(msg, callback) {
		this.connectionManager.send(msg, this.options.queueEvents, callback);
	};

	RealtimeChannel.prototype.sendPresence = function(presence, callback) {
		var msg = new messagetypes.TProtocolMessage({
			action: messagetypes.TAction.PRESENCE,
			channel: this.name,
			presence: [presence]
		});
		this.sendMessage(msg, callback);
	};

	RealtimeChannel.prototype.onMessage = function(message) {
		switch(message.action) {
		case actions.ATTACHED:
			this.setAttached(message);
			break;
		case actions.DETACHED:
			this.setDetached(message);
			break;
		case actions.PRESENCE:
			this.presence.setPresence(message.presence, true);
			break;
		case actions.MESSAGE:
			var tMessages = message.messages;
			if(tMessages) {
				var messages = new Array(tMessages.length),
					cipher = this.cipher;
				for(var i = 0; i < messages.length; i++) {
					var tMessage = tMessages[i];
					if(cipher) {
						try {
							Message.decrypt(tMessage, cipher);
						} catch(e) {
							/* decrypt failed .. the most likely cause is that we have the wrong key */
							var msg = 'Unexpected error decrypting message; err = ' + e;
							Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.onMessage()', msg);
							var err = new Error(msg);
							this.emit('error', err);
						}
					}
					messages[i] = new Message(
						tMessage.channelSerial,
						tMessage.timestamp,
						tMessage.name,
						Data.fromTData(tMessage.data)
					);
				}
				this.onEvent(messages);
			}
			break;
		default:
			Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.onMessage()', 'Fatal protocol error: unrecognised action (' + message.action + ')');
			this.connectionManager.abort(ConnectionError.unknownChannelErr);
		}
	};

	RealtimeChannel.mergeTo = function(dest, src) {
		var result = false;
		var action;
		if(dest.channel == src.channel) {
			if((action = dest.action) == src.action) {
				switch(action) {
				case actions.MESSAGE:
					for(var i = 0; i < src.messages.length; i++)
						dest.messages.push(src.messages[i]);
					result = true;
					break;
				case actions.PRESENCE:
					for(var i = 0; i < src.presence.length; i++)
						dest.presence.push(src.presence[i]);
					result = true;
					break;
				default:
				}
			}
		}
		return result;
	};

	RealtimeChannel.prototype.setAttached = function(message) {
		Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.setAttached', 'activating channel; name = ' + this.name);
		/* update any presence included with this message */
		if(message.presence)
			this.presence.setPresence(message.presence, false);

		/* ensure we don't transition multiple times */
		if(this.state != 'attaching')
			return;

		this.state = 'attached';
		this.emit('attached');
		try {
			if(this.pendingEvents.length) {
				var msg = new messagetypes.TProtocolMessage({action: messagetypes.TAction.MESSAGE, channel: this.name, messages: []});
				var multicaster = new Multicaster();
				Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.setAttached', 'sending ' + this.pendingEvents.length + ' queued messages');
				for(var i = 0; i < this.pendingEvents.length; i++) {
					var event = this.pendingEvents[i];
					msg.messages.push(event.message);
					multicaster.push(event.callback);
				}
				this.sendMessage(msg, multicaster);
			}
			this.presence.setAttached();
		} catch(e) {
			Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.setAttached()', 'Unexpected exception sending pending messages: ' + e.stack);
		}
	};

	RealtimeChannel.prototype.setDetached = function(message) {
		if(message.code) {
			/* this is an error message */
			this.state = 'failed';
			var err = {statusCode: message.statusCode, code: message.code, reason: message.reason};
			this.emit('failed', err);
		} else {
			this.state = 'detached';
			this.emit('detached');
		}
	};

	RealtimeChannel.prototype.setSuspended = function(connectionState) {
		Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.setSuspended', 'deactivating channel; name = ' + this.name);
		this.state = 'detached';
		for(var i = 0; i < this.pendingEvents.length; i++)
			try {
				this.pendingEvents[i].callback(connectionState.defaultMessage);
			} catch(e) {}
		this.pendingEvents = [];
		this.presence.setSuspended(connectionState);
		this.emit('detached');
	};

	return RealtimeChannel;
})();
var Presence = (function() {
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');
	var presenceState = messagetypes.TPresenceState;
	var presenceStateToEvent = ['enter', 'leave', 'update'];

	function memberKey(clientId, memberId) {
		return clientId + ':' + memberId;
	}

	function Presence(channel, options) {
		EventEmitter.call(this);
		this.channel = channel;
		this.clientId = options.clientId;
		this.members = {};
	}
	Utils.inherits(Presence, EventEmitter);

	Presence.prototype.enter = function(clientData, callback) {
		if(!this.clientId)
			throw new Error('clientId must be specified to enter a presence channel');
		this.enterClient(this.clientId, clientData, callback);
	};

	Presence.prototype.enterClient = function(clientId, clientData, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Presence.enterClient()', 'entering; channel = ' + this.channel.name + ', client = ' + clientId);
		var presence = new messagetypes.TPresence({
			state : presenceState.ENTER,
			clientId : clientId,
			clientData: Data.toTData(clientData)
		});
		var channel = this.channel;
		switch(channel.state) {
			case 'attached':
				channel.sendPresence(presence, callback);
				break;
			case 'initialized':
				channel.attach();
			case 'attaching':
				this.pendingPresence = {
					presence : presence,
					callback : callback
				};
				break;
			default:
				var err = new Error('Unable to enter presence channel (incompatible state)');
				err.code = 90001;
				callback(err);
		}
	};

	Presence.prototype.leave = function(callback) {
		if(!this.clientId)
			throw new Error('clientId must have been specified to enter or leave a presence channel');
		this.leaveClient(this.clientId, callback);
	};

	Presence.prototype.leaveClient = function(clientId, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Presence.leaveClient()', 'leaving; channel = ' + this.channel.name + ', client = ' + clientId);
		var presence = new messagetypes.TPresence({
			state : presenceState.LEAVE,
			clientId : clientId
		});
		var channel = this.channel;
		switch(channel.state) {
			case 'attached':
				channel.sendPresence(presence, callback);
				break;
			case 'attaching':
				this.pendingPresence = {
					presence : presence,
					callback : callback
				};
				break;
			case 'initialized':
				/* we're not attached; therefore we let any entered status
				 * timeout by itself instead of attaching just in order to leave */
				this.pendingPresence = null;
				var err = new Error('Unable to enter presence channel (incompatible state)');
				err.code = 90001;
				callback(err);
				break
			default:
				/* there is no connection; therefore we let
				 * any entered status will timeout by itself */
				this.pendingPresence = null;
				callback(ConnectionError.failed);
		}
	};

	Presence.prototype.get = function(key) {
		return key ? this.members[key] : Utils.valuesArray(this.members, true);
	};

	Presence.prototype.setPresence = function(presenceSet, broadcast) {
		Logger.logAction(Logger.LOG_MICRO, 'Presence.setPresence()', 'received presence for ' + presenceSet.length + ' participants');
		for(var i = 0; i < presenceSet.length; i++) {
			var presence = presenceSet[i];
			var key = memberKey.call(presence.clientId, presence.memberId);
			var member = new PresenceMessage(presence.clientId, Data.fromTData(presence.clientData), presence.memberId);
			switch(presence.state) {
				case presenceState.LEAVE:
					delete this.members[key];
					break;
				case presenceState.UPDATE:
					if(presence.inheritMemberId)
						delete this.members[memberKey.call(presence.clientId, presence.inheritMemberId)];
				case presenceState.ENTER:
					clientData = this.members[key] = member;
					break;
			}
			if(broadcast)
				this.emit(presenceStateToEvent[presence.state], member);
		}
	};

	Presence.prototype.setAttached = function() {
		if(this.pendingPresence) {
			Logger.logAction(Logger.LOG_MICRO, 'Presence.setAttached', 'sending queued presence; state = ' + this.state);
			this.channel.sendPresence(this.pendingPresence.presence, this.pendingPresence.callback);
			this.pendingPresence = null;
		}
	};

	Presence.prototype.setSuspended = function(connectionState) {
		if(this.pendingPresence) {
			this.pendingPresence.callback(ConnectionError[connectionState.state]);
			this.pendingPresence = null;
		}
	};

	return Presence;
})();
var JSONPTransport = (function() {
	var noop = function() {};
	var _ = window.Ably._ = function(id) { var f = _[id]; return f ? f : noop; };
	var requestId = 0;

	/* public constructor */
	function JSONPTransport(connectionManager, auth, params) {
		params.binary = false;
		CometTransport.call(this, connectionManager, auth, params);
	}
	Utils.inherits(JSONPTransport, CometTransport);

	JSONPTransport.isAvailable = function() { return true; };
	ConnectionManager.httpTransports.jsonp = ConnectionManager.transports.jsonp = JSONPTransport;

	/* connectivity check; since this has a hard-coded callback id,
	 * we just make sure that we handle concurrent requests (but the
	 * connectionmanager should ensure this doesn't happen anyway */
	var checksInProgress = null;
	JSONPTransport.checkConnectivity = function(callback) {
		if(checksInProgress) {
			checksInProgress.push(callback);
			return;
		}
		checksInProgress = [callback];
		(new JSONPTransport.Request('isTheInternetUp')).send('http://live.cdn.ably-realtime.com/is-the-internet-up.js', null, null, false, false, function(err, response) {
			var result = !err && response;
			for(var i = 0; i < checksInProgress.length; i++) checksInProgress[i](null, result);
			checksInProgress = null;
		});
	};

	JSONPTransport.tryConnect = function(connectionManager, auth, params, callback) {
		var transport = new JSONPTransport(connectionManager, auth, params);
		var errorCb = function(err) { callback(err); };
		transport.on('error', errorCb);
		transport.on('preconnect', function() {
			Logger.logAction(Logger.LOG_MINOR, 'JSONPTransport.tryConnect()', 'viable transport ' + transport);
			transport.off('error', errorCb);
			callback(null, transport);
		});
		transport.connect();
	};

	JSONPTransport.prototype.toString = function() {
		return 'JSONPTransport; uri=' + this.baseUri + '; isConnected=' + this.isConnected;
	};

	JSONPTransport.prototype.request = function(uri, params, body, expectToBlock, callback) {
		return (new JSONPTransport.Request()).send(uri, params, body, expectToBlock, false, callback);
	};

	JSONPTransport.Request = function(id) {
		this.requestId = id || requestId++
	};

	JSONPTransport.Request.prototype.send = function(uri, params, body, expectToBlock, binary /* ignored */, callback) {
		this.callback = callback;
		var id = this.requestId;

		var timeout = expectToBlock ? Defaults.cometRecvTimeout : Defaults.cometSendTimeout;
		var timer = this.timer = setTimeout(timeout, function() { self.abort(); });

		params = params || {};
		params.callback = 'Ably._(' + id + ')';
		if(body)
			params.body = encodeURIComponent(body);
		else
			delete params.body;

		var script = document.createElement('script');
		script.async = true;
		script.onerror = function(e) {  self.abort(); };
		script.src = CometTransport.paramStr(params, uri);

		var _finish = this._finish = function() {
			clearTimeout(timer);
			if(script.parentNode) script.parentNode.removeChild(script);
			delete _[id];
		}

		var self = this;
		_[id] = function(message) {
			_finish();
			if(!self.aborted)
				callback(null, message);
		};

		var insertAt = document.getElementsByTagName('script')[0];
	    insertAt.parentNode.insertBefore(script, insertAt);
	};

	JSONPTransport.Request.prototype.abort = function() {
		/* No abort possible, but flag this request
		 * so no action occurs if it does complete */
		this.aborted = true;
 		this._finish();
		this.callback(new Error('JSONPTransport: requestId ' + this.requestId + ' aborted'));
	};

	Http.Request = function(uri, params, body, binary, callback) {
		(new JSONPTransport.Request()).send(uri, params, body, false, binary, callback);
	};

	return JSONPTransport;
})();
var XHRTransport = (function() {

	var createXHR = function() {
		var result = new XMLHttpRequest();
		if ('withCredentials' in result)
			return result;

		if(typeof XDomainRequest !== "undefined")
			/* Use IE-specific "CORS" code with XDR */
			return new XDomainRequest();

		return null;
	};

	/* public constructor */
	function XHRTransport(connectionManager, auth, params) {
		params.binary = params.binary && XHRTransport.binary;
		CometTransport.call(this, connectionManager, auth, params);
	}
	Utils.inherits(XHRTransport, CometTransport);

	var isAvailable;
	XHRTransport.isAvailable = function() {
		var xhr = createXHR();
		if(!xhr)return false;
//		XHRTransport.binary = (window.ArrayBuffer && xhr.responseType);
		XHRTransport.binary = false;
		return true;
	};

	XHRTransport.checkConnectivity = function(callback) {
		(new XHRTransport.Request()).send('http://live.cdn.ably-realtime.com/is-the-internet-up.txt', null, null, false, function(err, responseText) {
			callback(null, (!err && responseText == 'yes'));
		});
	};

	XHRTransport.tryConnect = function(connectionManager, auth, params, callback) {
		var transport = new XHRTransport(connectionManager, auth, params);
		var errorCb = function(err) { callback(err); };
		transport.on('error', errorCb);
		transport.on('preconnect', function() {
			Logger.logAction(Logger.LOG_MINOR, 'XHRTransport.tryConnect()', 'viable transport ' + transport);
			transport.off('error', errorCb);
			callback(null, transport);
		});
		transport.connect();
	};

	XHRTransport.prototype.request = function(uri, params, body, expectToBlock, callback) {
		(new XHRTransport.Request()).send(uri, params, body, expectToBlock, this.binary, callback);
	};

	XHRTransport.prototype.toString = function() {
		return 'XHRTransport; uri=' + this.baseUri + '; isConnected=' + this.isConnected;
	};

	XHRTransport.Request = function() {};

	XHRTransport.Request.prototype.send = function(uri, params, body, expectToBlock, binary, callback) {
		uri = CometTransport.paramStr(params, uri);
		var successCode, method, err, timedout;
		if(body) method = 'POST', successCode = 201;
		else method = 'GET', successCode = 200;

		var xhr = this.xhr = createXHR();
		if(binary)
			xhr.responseType = 'arraybuffer';

		var timeout = expectToBlock ? Defaults.cometRecvTimeout : Defaults.cometSendTimeout;
		var timer = setTimeout(timeout, function() { timedout = true; xhr.abort(); });
		xhr.open(method, uri, true);
		xhr.setRequestHeader('Accept', binary ? 'application/x-thrift' : 'application/json');
		xhr.onerror = function(err) {
			err = err;
			err.code = 80000;
			callback(err);
		};
		xhr.onabort = function() {
			err = new Error(timedout ? 'Request timed out' : 'Request cancelled');
			err.statusCode = 404;
			err.code = 80000;
			callback(err);
		};
		xhr.onreadystatechange = function() {
			if(xhr.readyState == 4) {
				clearTimeout(timer);
				if(err) {
					callback(err);
					return;
				}
				if(xhr.status == successCode) {
					var responseBody = null;
					if(binary) {
						if(xhr.response) {
							responseBody = new Buffer();
							responseBody.buf = xhr.response;
							responseBody.view = new DataView(responseBody.buf);
						}
					} else {
						responseBody = xhr.responseText;
					}
					callback(null, responseBody);
					return;
				}
				if(xhr.status != 0) {
					err = new Error('Unexpected response: statusCode = ' + xhr.status);
					err.statusCode = xhr.status;
					err.code = 80000;
					err.statusText = xhr.statusText;
					callback(err);
					return;
				}
				/* statusCode is 0, so expect either an onerror or onabort callback */
			}
		};
		xhr.send(body);
	};

	XHRTransport.Request.prototype.abort = function() {
		if(this.xhr)
			this.xhr.abort();
	};

	if(XHRTransport.isAvailable()) {
		ConnectionManager.httpTransports.xhr = ConnectionManager.transports.xhr = XHRTransport;
		Http.Request = function(uri, params, body, binary, callback) {
			(new XHRTransport.Request()).send(uri, params, body, false, binary, callback);
		};
	}

	return XHRTransport;
})();
var FlashTransport = (function() {
	var isBrowser = (typeof(window) == 'object');

	/* public constructor */
	function FlashTransport(connectionManager, auth, params) {
		params.binary = false;
		WebSocketTransport.call(this, connectionManager, auth, params);
	}
	Utils.inherits(FlashTransport, WebSocketTransport);

	FlashTransport.isAvailable = function() {
		return isBrowser && swfobject && swfobject.getFlashPlayerVersion().major >= 10 && FlashWebSocket;
	};

	if(FlashTransport.isAvailable())
		ConnectionManager.transports.flash_socket = FlashTransport;

	FlashTransport.tryConnect = function(connectionManager, auth, params, callback) {
		/* load the swf if not already loaded */
		var swfLocation = Defaults.flashTransport.swfLocation,
				policyPort = Defaults.flashTransport.policyPort;
		if (connectionManager.options.flashTransport) {
			if (connectionManager.options.flashTransport.swfLocation)
				swfLocation = connectionManager.options.flashTransport.swfLocation;
			if (connectionManager.options.flashTransport.policyPort)
				swfLocation = connectionManager.options.flashTransport.swfLocation;
		}
		FlashWebSocket.__initialize(swfLocation);
		if(policyPort)
			FlashWebSocket.loadFlashPolicyFile('xmlsocket://' + params.host + ':' + policyPort);
		var transport = new FlashTransport(connectionManager, auth, params);
		errorCb = function(err) { callback(err); };
		transport.on('wserror', errorCb);
		transport.on('wsopen', function() {
			Logger.logAction(Logger.LOG_MINOR, 'FlashTransport.tryConnect()', 'viable transport ' + transport);
			transport.off('wserror', errorCb);
			callback(null, transport);
		});
		transport.connect();
	};

	FlashTransport.prototype.createWebSocket = function(uri, connectParams) {
		var paramCount = 0;
		if(connectParams) {
			for(var key in connectParams)
				uri += (paramCount++ ? '&' : '?') + key + '=' + connectParams[key];
		}
		this.uri = uri;
		var options = this.params.options;
		return new FlashWebSocket(uri, [], options.proxyHost, options.proxyPort);
	};

	FlashTransport.prototype.toString = function() {
		return 'FlashTransport; uri=' + this.uri;
	};

	return FlashTransport;
})();
window.Ably.Realtime = Realtime;
})();
