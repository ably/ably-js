(function() {
	window.Ably = {};

var ConnectionError = {
	disconnected: {
		statusCode: 408,
		code: 80003,
		message: 'Connection to server temporarily unavailable'
	},
	suspended: {
		statusCode: 408,
		code: 80002,
		message: 'Connection to server unavailable'
	},
	failed: {
		statusCode: 408,
		code: 80000,
		message: 'Connection failed or disconnected by server'
	},
	unknownConnectionErr: {
		statusCode: 500,
		code: 50002,
		message: 'Internal connection error'
	},
	unknownChannelErr: {
		statusCode: 500,
		code: 50001,
		message: 'Internal channel error'
	}
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
	protocolVersion:          1,
	HOST:                     'rest.ably.io',
	WS_HOST:                  'realtime.ably.io',
	FALLBACK_HOSTS:           ['A.ably-realtime.com', 'B.ably-realtime.com', 'C.ably-realtime.com', 'D.ably-realtime.com', 'E.ably-realtime.com'],
	PORT:                     80,
	TLS_PORT:                 443,
	connectTimeout:           15000,
	disconnectTimeout:        30000,
	suspendedTimeout:         120000,
	recvTimeout:              90000,
	sendTimeout:              10000,
	connectionPersistTimeout: 15000,
	httpTransports:           ['xhr', 'iframe', 'jsonp'],
	transports:               ['web_socket', 'flash_socket', 'xhr', 'iframe', 'jsonp'],
	flashTransport:           {swfLocation: (typeof window !== 'undefined' ? window.location.protocol : 'https:') + '//cdn.ably.io/lib/swf/WebSocketMainInsecure-0.9.swf'}
};

Defaults.getHost = function(options, host, ws) {
	host = host || options.host || Defaults.HOST;
	if(ws)
		host = ((host == options.host) && (options.wsHost || host))
			|| ((host == Defaults.HOST) && (Defaults.WS_HOST || host))
			|| host;
	return host;
};

Defaults.getPort = function(options, tls) {
	return (tls || options.tls) ? (options.tlsPort || Defaults.TLS_PORT) : (options.port || Defaults.PORT);
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
}
var Http = (function() {
	var noop = function() {};

	function Http() {}

	/**
	 * Perform an HTTP GET request for a given path against prime and fallback Ably hosts
	 * @param rest
	 * @param path the full path of the POST request
	 * @param headers optional hash of headers
	 * @param params optional hash of params
	 * @param callback (err, response)
	 */
	Http.get = function(rest, path, headers, params, callback) {
		callback = callback || noop;
		var uri = (typeof(path) == 'function') ? path : function(host) { return rest.baseUri(host) + path; };
		var binary = (headers && headers.accept != 'application/json');

		var hosts, connection = rest.connection;
		if(connection && connection.state == 'connected')
			hosts = [connection.connectionManager.host];
		else
			hosts = Defaults.getHosts(rest.options);

		/* if there is only one host do it */
		if(hosts.length == 1) {
			Http.getUri(rest, uri(hosts[0]), headers, params, callback);
			return;
		}

		/* hosts is an array with preferred host plus at least one fallback */
		Http.getUri(rest, uri(hosts.shift()), headers, params, function(err) {
			if(err) {
				var code = err.code;
				if(code =='ENETUNREACH' || code == 'EHOSTUNREACH' || code == 'EHOSTDOWN') {
					/* we should use a fallback host if available */
					Http.getUri(rest, uri(hosts.shift()), headers, params, callback);
					return;
				}
			}
			callback.apply(null, arguments);
		});
	};

	/**
	 * Perform an HTTP GET request for a given resolved URI
	 * @param rest
	 * @param the full path of the POST request
	 * @param headers optional hash of headers
	 * @param params optional hash of params
	 * @param callback (err, response)
	 */
	Http.getUri = function(rest, uri, headers, params, callback) {
		callback = callback || noop;
		var binary = (headers && headers.accept != 'application/json');

		Http.Request(uri, headers, params, null, binary, callback);
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
	Http.post = function(rest, path, headers, body, params, callback) {
		callback = callback || noop;
		var uri = (typeof(path) == 'function') ? path : function(host) { return rest.baseUri(host) + path; };
		var binary = (headers && headers.accept != 'application/json');

		var hosts, connection = rest.connection;
		if(connection && connection.state == 'connected')
			hosts = [connection.connectionManager.host];
		else
			hosts = Defaults.getHosts(rest.options);

		/* if there is only one host do it */
		if(hosts.length == 1) {
			Http.postUri(rest, uri(hosts[0]), headers, body, params, callback);
			return;
		}

		/* hosts is an array with preferred host plus at least one fallback */
		Http.postUri(rest, uri(hosts.shift()), headers, body, params, function(err) {
			if(err) {
				var code = err.code;
				if(code =='ENETUNREACH' || code == 'EHOSTUNREACH' || code == 'EHOSTDOWN') {
					/* we should use a fallback host if available */
					Http.postUri(rest, uri(hosts.shift()), headers, body, params, callback);
					return;
				}
			}
			callback.apply(null, arguments);
		});
	};

	/**
	 * Perform an HTTP POST request for a given resolved URI
	 * @param rest
	 * @param the full path of the POST request
	 * @param headers optional hash of headers
	 * @param body object or buffer containing request body
	 * @param params optional hash of params
	 * @param callback (err, response)
	 */
	Http.postUri = function(rest, uri, headers, body, params, callback) {
		callback = callback || noop;
		var binary = (headers && headers.accept != 'application/json');

		Http.Request(uri, headers, params, body, binary, callback);
	};

	Http.supportsAuthHeaders = false;
	Http.supportsLinkHeaders = false;
	return Http;
})();

var Crypto = Ably.Crypto = window.CryptoJS && (function() {
	var DEFAULT_ALGORITHM = "aes";
	var DEFAULT_KEYLENGTH = 128; // bits
	var DEFAULT_BLOCKLENGTH = 16; // bytes
	var DEFAULT_BLOCKLENGTH_WORDS = 4; // 32-bit words
	var VAL32 = 0x100000000;

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
		generateRandom = function(bytes, callback) {
			console.log('Ably.Crypto.generateRandom(): WARNING: using insecure Math.random() to generate key or iv; see http://ably.io/documentation for how to fix this');
			var words = bytes / 4, array = new Array(words);
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
		if(key) {
			if (typeof(key) === 'string')
				key = CryptoJS.enc.Hex.parse(key);
			else if (!key.words)
				key = CryptoJS.lib.WordArray.create(key);   // Expect key to be an array at this point
		} else {
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
		params.algorithm = DEFAULT_ALGORITHM + '-' + String(key.words.length * (4 * 8));
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
		var algorithm = this.algorithm = params.algorithm.toUpperCase().replace(/-\d+$/, '');
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
		Logger.logAction(Logger.LOG_MICRO, 'CBCCipher.decrypt()', '');
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

	Data.asBase64 = function(ciphertext) {
		return CryptoJS.enc.Base64.stringify(ciphertext);
	};

	Data.fromBase64 = function(encoded) {
		return CryptoJS.enc.Base64.parse(encoded);
	};

	Data.utf8Encode = function(string) {
		return CryptoJS.enc.Utf8.stringify(string);
	};

	Data.utf8Decode = function(buf) {
		return CryptoJS.enc.Utf8.parse(buf);
	};

	return Crypto;
})();
var DomEvent = (function() {
	function DomEvent() {}

	DomEvent.addListener = function(target, event, listener) {
		if(target.addEventListener) {
			target.addEventListener(event, listener, false);
		} else {
			target.attachEvent('on'+event, listener);
		}
	};

	DomEvent.removeListener = function(target, event, listener) {
		if(target.removeEventListener) {
			target.removeEventListener(event, listener, false);
		} else {
			target.detachEvent('on'+event, listener);
		}
	};

	DomEvent.addMessageListener = function(target, listener) {
		DomEvent.addListener(target, 'message', listener);
	};

	DomEvent.removeMessageListener = function(target, listener) {
		DomEvent.removeListener(target, 'message', listener);
	};

	DomEvent.addUnloadListener = function(listener) {
		DomEvent.addListener(window, 'unload', listener);
	};

	return DomEvent;
})();
( // Module boilerplate to support browser globals and browserify and AMD.
		typeof define === "function" ? function (m) { define("msgpack-js", m); } :
		typeof exports === "object" ? function (m) { module.exports = m(); } :
	function(m){ this.msgpack = m(); }
	)(function () {
	"use strict";

	var exports = {};

	exports.inspect = inspect;
	function inspect(buffer) {
		if (buffer === undefined) return "undefined";
		var view;
		var type;
		if (buffer instanceof ArrayBuffer) {
			type = "ArrayBuffer";
			view = new DataView(buffer);
		}
		else if (buffer instanceof DataView) {
			type = "DataView";
			view = buffer;
		}
		if (!view) return JSON.stringify(buffer);
		var bytes = [];
		for (var i = 0; i < buffer.byteLength; i++) {
			if (i > 20) {
				bytes.push("...");
				break;
			}
			var byte_ = view.getUint8(i).toString(16);
			if (byte_.length === 1) byte_ = "0" + byte_;
			bytes.push(byte_);
		}
		return "<" + type + " " + bytes.join(" ") + ">";
	}

// Encode string as utf8 into dataview at offset
	exports.utf8Write = utf8Write;
	function utf8Write(view, offset, string) {
		var byteLength = view.byteLength;
		for(var i = 0, l = string.length; i < l; i++) {
			var codePoint = string.charCodeAt(i);

			// One byte of UTF-8
			if (codePoint < 0x80) {
				view.setUint8(offset++, codePoint >>> 0 & 0x7f | 0x00);
				continue;
			}

			// Two bytes of UTF-8
			if (codePoint < 0x800) {
				view.setUint8(offset++, codePoint >>> 6 & 0x1f | 0xc0);
				view.setUint8(offset++, codePoint >>> 0 & 0x3f | 0x80);
				continue;
			}

			// Three bytes of UTF-8.
			if (codePoint < 0x10000) {
				view.setUint8(offset++, codePoint >>> 12 & 0x0f | 0xe0);
				view.setUint8(offset++, codePoint >>> 6  & 0x3f | 0x80);
				view.setUint8(offset++, codePoint >>> 0  & 0x3f | 0x80);
				continue;
			}

			// Four bytes of UTF-8
			if (codePoint < 0x110000) {
				view.setUint8(offset++, codePoint >>> 18 & 0x07 | 0xf0);
				view.setUint8(offset++, codePoint >>> 12 & 0x3f | 0x80);
				view.setUint8(offset++, codePoint >>> 6  & 0x3f | 0x80);
				view.setUint8(offset++, codePoint >>> 0  & 0x3f | 0x80);
				continue;
			}
			throw new Error("bad codepoint " + codePoint);
		}
	}

	exports.utf8Read = utf8Read;
	function utf8Read(view, offset, length) {
		var string = "";
		for (var i = offset, end = offset + length; i < end; i++) {
			var byte_ = view.getUint8(i);
			// One byte character
			if ((byte_ & 0x80) === 0x00) {
				string += String.fromCharCode(byte_);
				continue;
			}
			// Two byte character
			if ((byte_ & 0xe0) === 0xc0) {
				string += String.fromCharCode(
						((byte_ & 0x0f) << 6) |
						(view.getUint8(++i) & 0x3f)
				);
				continue;
			}
			// Three byte character
			if ((byte_ & 0xf0) === 0xe0) {
				string += String.fromCharCode(
						((byte_ & 0x0f) << 12) |
						((view.getUint8(++i) & 0x3f) << 6) |
						((view.getUint8(++i) & 0x3f) << 0)
				);
				continue;
			}
			// Four byte character
			if ((byte_ & 0xf8) === 0xf0) {
				string += String.fromCharCode(
						((byte_ & 0x07) << 18) |
						((view.getUint8(++i) & 0x3f) << 12) |
						((view.getUint8(++i) & 0x3f) << 6) |
						((view.getUint8(++i) & 0x3f) << 0)
				);
				continue;
			}
			throw new Error("Invalid byte " + byte_.toString(16));
		}
		return string;
	}

	exports.utf8ByteCount = utf8ByteCount;
	function utf8ByteCount(string) {
		var count = 0;
		for(var i = 0, l = string.length; i < l; i++) {
			var codePoint = string.charCodeAt(i);
			if (codePoint < 0x80) {
				count += 1;
				continue;
			}
			if (codePoint < 0x800) {
				count += 2;
				continue;
			}
			if (codePoint < 0x10000) {
				count += 3;
				continue;
			}
			if (codePoint < 0x110000) {
				count += 4;
				continue;
			}
			throw new Error("bad codepoint " + codePoint);
		}
		return count;
	}

	exports.encode = function (value) {
		var buffer = new ArrayBuffer(sizeof(value));
		var view = new DataView(buffer);
		encode(value, view, 0);
		return buffer;
	}

	exports.decode = decode;

// http://wiki.msgpack.org/display/MSGPACK/Format+specification
// I've extended the protocol to have two new types that were previously reserved.
//   buffer 16  11011000  0xd8
//   buffer 32  11011001  0xd9
// These work just like raw16 and raw32 except they are node buffers instead of strings.
//
// Also I've added a type for `undefined`
//   undefined  11000100  0xc4

	function Decoder(view, offset) {
		this.offset = offset || 0;
		this.view = view;
	}
	Decoder.prototype.map = function (length) {
		var value = {};
		for (var i = 0; i < length; i++) {
			var key = this.parse();
			value[key] = this.parse();
		}
		return value;
	};
	Decoder.prototype.buf = function (length) {
		var value = new ArrayBuffer(length);
		(new Uint8Array(value)).set(new Uint8Array(this.view.buffer, this.offset, length), 0);
		this.offset += length;
		return value;
	};
	Decoder.prototype.raw = function (length) {
		var value = utf8Read(this.view, this.offset, length);
		this.offset += length;
		return value;
	};
	Decoder.prototype.array = function (length) {
		var value = new Array(length);
		for (var i = 0; i < length; i++) {
			value[i] = this.parse();
		}
		return value;
	};
	Decoder.prototype.parse = function () {
		var type = this.view.getUint8(this.offset);
		var value, length;
		// FixRaw
		if ((type & 0xe0) === 0xa0) {
			length = type & 0x1f;
			this.offset++;
			return this.raw(length);
		}
		// FixMap
		if ((type & 0xf0) === 0x80) {
			length = type & 0x0f;
			this.offset++;
			return this.map(length);
		}
		// FixArray
		if ((type & 0xf0) === 0x90) {
			length = type & 0x0f;
			this.offset++;
			return this.array(length);
		}
		// Positive FixNum
		if ((type & 0x80) === 0x00) {
			this.offset++;
			return type;
		}
		// Negative Fixnum
		if ((type & 0xe0) === 0xe0) {
			value = this.view.getInt8(this.offset);
			this.offset++;
			return value;
		}
		switch (type) {
			// raw 16
			case 0xda:
				length = this.view.getUint16(this.offset + 1);
				this.offset += 3;
				return this.raw(length);
			// raw 32
			case 0xdb:
				length = this.view.getUint32(this.offset + 1);
				this.offset += 5;
				return this.raw(length);
			// nil
			case 0xc0:
				this.offset++;
				return null;
			// false
			case 0xc2:
				this.offset++;
				return false;
			// true
			case 0xc3:
				this.offset++;
				return true;
			// undefined
			case 0xc4:
				this.offset++;
				return undefined;
			// uint8
			case 0xcc:
				value = this.view.getUint8(this.offset + 1);
				this.offset += 2;
				return value;
			// uint 16
			case 0xcd:
				value = this.view.getUint16(this.offset + 1);
				this.offset += 3;
				return value;
			// uint 32
			case 0xce:
				value = this.view.getUint32(this.offset + 1);
				this.offset += 5;
				return value;
			// int 8
			case 0xd0:
				value = this.view.getInt8(this.offset + 1);
				this.offset += 2;
				return value;
			// int 16
			case 0xd1:
				value = this.view.getInt16(this.offset + 1);
				this.offset += 3;
				return value;
			// int 32
			case 0xd2:
				value = this.view.getInt32(this.offset + 1);
				this.offset += 5;
				return value;
			// map 16
			case 0xde:
				length = this.view.getUint16(this.offset + 1);
				this.offset += 3;
				return this.map(length);
			// map 32
			case 0xdf:
				length = this.view.getUint32(this.offset + 1);
				this.offset += 5;
				return this.map(length);
			// array 16
			case 0xdc:
				length = this.view.getUint16(this.offset + 1);
				this.offset += 3;
				return this.array(length);
			// array 32
			case 0xdd:
				length = this.view.getUint32(this.offset + 1);
				this.offset += 5;
				return this.array(length);
			// buffer 16
			case 0xd8:
				length = this.view.getUint16(this.offset + 1);
				this.offset += 3;
				return this.buf(length);
			// buffer 32
			case 0xd9:
				length = this.view.getUint32(this.offset + 1);
				this.offset += 5;
				return this.buf(length);
			// float
			case 0xca:
				value = this.view.getFloat32(this.offset + 1);
				this.offset += 5;
				return value;
			// double
			case 0xcb:
				value = this.view.getFloat64(this.offset + 1);
				this.offset += 9;
				return value;
		}
		throw new Error("Unknown type 0x" + type.toString(16));
	};
	function decode(buffer) {
		var view = new DataView(buffer);
		var decoder = new Decoder(view);
		var value = decoder.parse();
		if (decoder.offset !== buffer.byteLength) throw new Error((buffer.byteLength - decoder.offset) + " trailing bytes");
		return value;
	}

	function encode(value, view, offset) {
		var type = typeof value;

		// Strings Bytes
		if (type === "string") {
			var length = utf8ByteCount(value);
			// fix raw
			if (length < 0x20) {
				view.setUint8(offset, length | 0xa0);
				utf8Write(view, offset + 1, value);
				return 1 + length;
			}
			// raw 16
			if (length < 0x10000) {
				view.setUint8(offset, 0xda);
				view.setUint16(offset + 1, length);
				utf8Write(view, offset + 3, value);
				return 3 + length;
			}
			// raw 32
			if (length < 0x100000000) {
				view.setUint8(offset, 0xdb);
				view.setUint32(offset + 1, length);
				utf8Write(view, offset + 5, value);
				return 5 + length;
			}
		}

		if (value instanceof ArrayBuffer) {
			var length = value.byteLength;
			// buffer 16
			if (length < 0x10000) {
				view.setUint8(offset, 0xd8);
				view.setUint16(offset + 1, length);
				(new Uint8Array(view.buffer)).set(new Uint8Array(value), offset + 3);
				return 3 + length;
			}
			// buffer 32
			if (length < 0x100000000) {
				view.setUint8(offset, 0xd9);
				view.setUint32(offset + 1, length);
				(new Uint8Array(view.buffer)).set(new Uint8Array(value), offset + 5);
				return 5 + length;
			}
		}

		if (type === "number") {
			// Floating Point
			if ((value << 0) !== value) {
				view.setUint8(offset, 0xcb);
				view.setFloat64(offset + 1, value);
				return 9;
			}

			// Integers
			if (value >=0) {
				// positive fixnum
				if (value < 0x80) {
					view.setUint8(offset, value);
					return 1;
				}
				// uint 8
				if (value < 0x100) {
					view.setUint8(offset, 0xcc);
					view.setUint8(offset + 1, value);
					return 2;
				}
				// uint 16
				if (value < 0x10000) {
					view.setUint8(offset, 0xcd);
					view.setUint16(offset + 1, value);
					return 3;
				}
				// uint 32
				if (value < 0x100000000) {
					view.setUint8(offset, 0xce);
					view.setUint32(offset + 1, value);
					return 5;
				}
				throw new Error("Number too big 0x" + value.toString(16));
			}
			// negative fixnum
			if (value >= -0x20) {
				view.setInt8(offset, value);
				return 1;
			}
			// int 8
			if (value >= -0x80) {
				view.setUint8(offset, 0xd0);
				view.setInt8(offset + 1, value);
				return 2;
			}
			// int 16
			if (value >= -0x8000) {
				view.setUint8(offset, 0xd1);
				view.setInt16(offset + 1, value);
				return 3;
			}
			// int 32
			if (value >= -0x80000000) {
				view.setUint8(offset, 0xd2);
				view.setInt32(offset + 1, value);
				return 5;
			}
			throw new Error("Number too small -0x" + (-value).toString(16).substr(1));
		}

		// undefined
		if (type === "undefined") {
			view.setUint8(offset, 0xc4);
			return 1;
		}

		// null
		if (value === null) {
			view.setUint8(offset, 0xc0);
			return 1;
		}

		// Boolean
		if (type === "boolean") {
			view.setUint8(offset, value ? 0xc3 : 0xc2);
			return 1;
		}

		// Container Types
		if (type === "object") {
			var length, size = 0;
			var isArray = Array.isArray(value);

			if (isArray) {
				length = value.length;
			}
			else {
				var keys = Object.keys(value);
				length = keys.length;
			}

			var size;
			if (length < 0x10) {
				view.setUint8(offset, length | (isArray ? 0x90 : 0x80));
				size = 1;
			}
			else if (length < 0x10000) {
				view.setUint8(offset, isArray ? 0xdc : 0xde);
				view.setUint16(offset + 1, length);
				size = 3;
			}
			else if (length < 0x100000000) {
				view.setUint8(offset, isArray ? 0xdd : 0xdf);
				view.setUint32(offset + 1, length);
				size = 5;
			}

			if (isArray) {
				for (var i = 0; i < length; i++) {
					size += encode(value[i], view, offset + size);
				}
			}
			else {
				for (var i = 0; i < length; i++) {
					var key = keys[i];
					size += encode(key, view, offset + size);
					size += encode(value[key], view, offset + size);
				}
			}

			return size;
		}
		throw new Error("Unknown type " + type);
	}

	function sizeof(value) {
		var type = typeof value;

		// Raw Bytes
		if (type === "string") {
			var length = utf8ByteCount(value);
			if (length < 0x20) {
				return 1 + length;
			}
			if (length < 0x10000) {
				return 3 + length;
			}
			if (length < 0x100000000) {
				return 5 + length;
			}
		}

		if (value instanceof ArrayBuffer) {
			var length = value.byteLength;
			if (length < 0x10000) {
				return 3 + length;
			}
			if (length < 0x100000000) {
				return 5 + length;
			}
		}

		if (type === "number") {
			// Floating Point
			// double
			if (value << 0 !== value) return 9;

			// Integers
			if (value >=0) {
				// positive fixnum
				if (value < 0x80) return 1;
				// uint 8
				if (value < 0x100) return 2;
				// uint 16
				if (value < 0x10000) return 3;
				// uint 32
				if (value < 0x100000000) return 5;
				// uint 64
				if (value < 0x10000000000000000) return 9;
				throw new Error("Number too big 0x" + value.toString(16));
			}
			// negative fixnum
			if (value >= -0x20) return 1;
			// int 8
			if (value >= -0x80) return 2;
			// int 16
			if (value >= -0x8000) return 3;
			// int 32
			if (value >= -0x80000000) return 5;
			// int 64
			if (value >= -0x8000000000000000) return 9;
			throw new Error("Number too small -0x" + value.toString(16).substr(1));
		}

		// Boolean, null, undefined
		if (type === "boolean" || type === "undefined" || value === null) return 1;

		// Container Types
		if (type === "object") {
			var length, size = 0;
			if (Array.isArray(value)) {
				length = value.length;
				for (var i = 0; i < length; i++) {
					size += sizeof(value[i]);
				}
			}
			else {
				var keys = Object.keys(value);
				length = keys.length;
				for (var i = 0; i < length; i++) {
					var key = keys[i];
					size += sizeof(key) + sizeof(value[key]);
				}
			}
			if (length < 0x10) {
				return 1 + size;
			}
			if (length < 0x10000) {
				return 3 + size;
			}
			if (length < 0x100000000) {
				return 5 + size;
			}
			throw new Error("Array or object too long 0x" + length.toString(16));
		}
		throw new Error("Unknown type " + type);
	}

	return exports;

});
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
				if(!(listeners = this.any) || (idx = Utils.arrIndexOf(listeners, listener)) == -1) {
					if(listeners = this.anyOnce)
						idx = Utils.arrIndexOf(listeners, listener);
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
			if(!(listeners = this.events[event]) || (idx = Utils.arrIndexOf(listeners, listener)) == -1) {
				if(listeners = this.eventsOnce[event])
					idx = Utils.arrIndexOf(listeners, listener);
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

		/* wrap the try/catch in a function improves performance by 30% */
		function callListener(listener) {
			try { listener.apply(eventThis, args); } catch(e) {
				Logger.logAction(Logger.LOG_ERROR, 'EventEmitter.emit()', 'Unexpected listener exception: ' + e + '; stack = ' + e.stack);
			}
		}
		if(this.anyOnce.length) {
			var listeners = this.anyOnce;
			this.anyOnce = [];
			for(var i = 0; i < listeners.length; i++)
				callListener((listeners[i]));
		}
		for(var i = 0; i < this.any.length; i++)
			this.any[i].apply(eventThis, args);
		var listeners = this.eventsOnce[event];
		if(listeners) {
			delete this.eventsOnce[event];
			for(var i = 0; i < listeners.length; i++)
				callListener((listeners[i]));
		}
		var listeners = this.events[event];
		if(listeners)
			for(var i = 0; i < listeners.length; i++)
				callListener((listeners[i]));
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
		logHandler = handler || function(msg) { console.log(msg); };
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
	Utils.mixin = function(target, src) {
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
	Utils.inherits = (typeof(require) !== 'undefined' && require('util').inherits) || function(ctor, superCtor) {
		ctor.super_ = superCtor;
		ctor.prototype = Utils.prototypicalClone(superCtor.prototype, { constructor: ctor });
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

	Utils.intersect = function(arr, ob) { return Utils.isArray(ob) ? Utils.arrIntersect(arr, ob) : Utils.arrIntersectOb(arr, ob); };

	Utils.isArray = Array.isArray ? Array.isArray : function(arr) { return Object.prototype.toString.call(arr) === '[object Array]'; };

	Utils.arrIntersect = function(arr1, arr2) {
		var result = [];
		for(var i = 0; i < arr1.length; i++) {
			var member = arr1[i];
			if(Utils.arrIndexOf(arr2, member) != -1)
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
			if(Utils.arrIndexOf(arr2, element) == -1)
				result.push(element);
		}
		return result;
	};

	Utils.arrIndexOf = Array.prototype.indexOf
		? function(arr, elem, fromIndex) {
			return arr.indexOf(elem,  fromIndex);
		}
		: function(arr, elem, fromIndex) {
			fromIndex = fromIndex || 0;
			var len = arr.length;
			for(;fromIndex < len; fromIndex++) {
				if(arr[fromIndex] === elem) {
					return fromIndex;
				}
			}
			return -1;
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
		msgpack: 'application/x-msgpack'
	};

	Utils.defaultGetHeaders = function(format) {
		format = format || 'json';
		var accept = (format === 'json') ? contentTypes.json : contentTypes[format] + ',' + contentTypes.json;
		return { accept: accept };
	};

	Utils.defaultPostHeaders = function(format) {
		format = format || 'json';
		var accept = (format === 'json') ? contentTypes.json : contentTypes[format] + ',' + contentTypes.json,
			contentType = (format === 'json') ? contentTypes.json : contentTypes[format];

		return {
			accept: accept,
			'content-type': contentType
		};
	};

	Utils.arrRandomElement = function(arr) {
		return arr.splice(Math.floor(Math.random() * arr.length));
	};

	Utils.toQueryString = function(params) {
		var parts = [];
		if(params) {
			for(var key in params)
				parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
		}
		return parts.length ? '?' + parts.join('&') : '';
	};

	Utils.parseQueryString = function(query) {
		var match,
			search = /([^?&=]+)=?([^&]*)/g,
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

		var handler = function() {
			for(var i = 0; i < members.length; i++) {
				var member = members[i];
				try { member.apply(null, arguments); } catch(e){} };
			};

		handler.push = function() {
			Array.prototype.push.apply(members, arguments);
		};
		return handler;
	};

	return Multicaster;
})();

var ConnectionManager = (function() {
	var readCookie = (typeof(Cookie) !== 'undefined' && Cookie.read);
	var createCookie = (typeof(Cookie) !== 'undefined' && Cookie.create);
	var connectionIdCookie = 'ably-connection-id';
	var connectionSerialCookie = 'ably-connection-serial';
	var supportsBinary = BufferUtils.supportsBinary;
	var actions = ProtocolMessage.Action;

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
		this.host = host;
		this.mode = mode;
		this.connectionId = connectionId;
		this.connectionSerial = connectionSerial;
		this.format = options.useBinaryProtocol ? 'msgpack' : 'json';
		if(options.transportParams && options.transportParams.stream !== undefined)
			this.stream = options.transportParams.stream;
	}

	TransportParams.prototype.getConnectParams = function(params) {
		params = params ? Utils.prototypicalClone(params) : {};
		var options = this.options;
		switch(this.mode) {
			case 'upgrade':
				params.upgrade = this.connectionId;
				if(this.connectionSerial !== undefined)
					params.connection_serial = this.connectionSerial;
				break;
			case 'resume':
				params.resume = this.connectionId;
				if(this.connectionSerial !== undefined)
					params.connection_serial = this.connectionSerial;
				break;
			case 'recover':
				if(options.recover === true) {
					var connectionId = readCookie(connectionIdCookie),
						connectionSerial = readCookie(connectionSerialCookie);
					if(connectionId !== null && connectionSerial !== null) {
						params.recover = connectionId;
						params.connection_serial = connectionSerial;
					}
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
		if(options.echoMessages === false)
			params.echo = 'false';
		params.format = this.format;
		if(this.stream !== undefined)
			params.stream = this.stream;
		return params;
	};

	function PendingMessage(msg, callback) {
		this.msg = msg;
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
		if(createCookie && options.recover === true && window.addEventListener)
			window.addEventListener('beforeunload', this.persistConnection.bind(this));
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
				httpTransport.once('connected', function(error, connectionId) {
					/* we allow other event handlers, including activating the transport, to run first */
					Utils.nextTick(function() {
						Logger.logAction(Logger.LOG_MAJOR, 'ConnectionManager.chooseTransport()', 'upgrading ... connectionId = ' + connectionId);
						transportParams = new TransportParams(self.options, transportParams.host, 'upgrade', connectionId);
						self.chooseTransportForHost(transportParams, self.upgradeTransports.slice(), noop);
					});
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
			return function(error, connectionId, connectionSerial) {
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.setTransportPending', 'on state = ' + state);
				if(error && error.message)
					Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.setTransportPending', 'reason =  ' + error.message);
				if(connectionId)
					Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.setTransportPending', 'connectionId =  ' + connectionId);
				if(connectionSerial !== undefined)
					Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.setTransportPending', 'connectionSerial =  ' + connectionSerial);

				/* handle activity transition */
				var notifyState;
				if(state == 'connected') {
					self.activateTransport(transport, connectionId, connectionSerial);
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
	ConnectionManager.prototype.activateTransport = function(transport, connectionId, connectionSerial) {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.activateTransport()', 'transport = ' + transport + '; connectionId = ' + connectionId + '; connectionSerial = ' + connectionSerial);
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
			this.connectionSerial = (connectionSerial === undefined) ? -1 : connectionSerial;
			if(createCookie && this.options.recover === true)
				this.persistConnection();
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
				err.message = 'Unable to send message; channel not responding';
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
		var wasActive = (this.transport === transport),
			wasPending = (this.transport === null) && (this.pendingTransport === transport);
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.deactivateTransport()', 'transport = ' + transport);
		transport.off('ack');
		transport.off('nack');
		if(wasActive)
			this.transport = this.host = null;
		else if(wasPending)
			this.pendingTransport = null;

		this.emit('transport.inactive', transport);
		return wasActive || wasPending;
	};

	/**
	 * Called when the connectionmanager wants to persist transport
	 * state for later recovery. Only applicable in the browser context.
	 */
	ConnectionManager.prototype.persistConnection = function() {
		if(createCookie) {
			if(this.connectionId && this.connectionSerial !== undefined) {
				createCookie(connectionIdCookie, this.connectionId, Defaults.connectionPersistTimeout);
				createCookie(connectionSerialCookie, this.connectionSerial, Defaults.connectionPersistTimeout);
			}
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
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.enactStateChange', 'setting new state: ' + stateChange.current + '; reason = ' + (stateChange.reason && stateChange.reason.message));
		this.state = states[stateChange.current];
		if(this.state.terminal)
			this.error = stateChange.reason;
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
		else
			this.realtime.channels.setSuspended(change.reason);
	};

	ConnectionManager.prototype.requestState = function(request) {
		/* kill running timers, as this request supersedes them */
		this.cancelConnectTimer();
		this.cancelRetryTimer();
		if(request.state == this.state.state)
			return; /* silently do nothing */
		if(this.state.terminal)
			throw new Error(this.error.message);
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
			auth.authorise(null, null, function(err) {
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
				Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.send()', 'rejecting event; state = ' + state.state);
console.log('send: ' + (new Error()).stack);
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
				lastQueued.callback = Multicaster([lastQueued.callback]);
				lastQueued.merged = true;
			}
			lastQueued.callback.push(callback);
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
		/* do not update connectionSerial for messages received
		 * on transports that are no longer the current transport */
		if(transport === this.transport) {
			var connectionSerial = message.connectionSerial;
			if(connectionSerial !== undefined)
				this.connectionSerial = connectionSerial;
		}
		this.realtime.channels.onChannelMessage(message);
	};

	return ConnectionManager;
})();

var Transport = (function() {
	var actions = ProtocolMessage.Action;
	var closeMessage = ProtocolMessage.fromValues({action: actions.CLOSE});

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
		this.format = params.format;
		this.isConnected = false;
	}
	Utils.inherits(Transport, EventEmitter);

	Transport.prototype.connect = function() {};

	Transport.prototype.close = function(closing) {
		if(this.isConnected) {
			this.isConnected = false;
			this.sendClose(closing);
		}
		this.emit('closed', ConnectionError.closed);
		this.dispose();
	};

	Transport.prototype.abort = function(error) {
		if(this.isConnected) {
			this.isConnected = false;
			this.sendClose(true);
		}
		this.emit('failed', error);
		this.dispose();
	};

	Transport.prototype.onChannelMessage = function(message) {
		switch(message.action) {
		case actions.HEARTBEAT:
			Logger.logAction(Logger.LOG_MICRO, 'Transport.onChannelMessage()', 'heartbeat; connectionId = ' + this.connectionManager.connectionId);
			this.emit('heartbeat');
			break;
		case actions.CONNECTED:
			this.onConnect(message);
			this.emit('connected', null, message.connectionId, message.connectionSerial);
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
			var msgErr = message.error;
			Logger.logAction(Logger.LOG_ERROR, 'Transport.onChannelMessage()', 'error; connectionId = ' + this.connectionManager.connectionId + '; err = ' + JSON.stringify(msgErr));
			if(!message.channel) {
				/* a transport error */
				var err = {
					statusCode: msgErr.statusCode,
					code: msgErr.code,
					message: msgErr.message
				};
				this.abort(err);
				break;
			}
			/* otherwise it's a channel-specific error, so handle it in the channel */
		default:
			this.connectionManager.onChannelMessage(message, this);
		}
	};

	Transport.prototype.onConnect = function(message) {
		/* the connectionId in a comet connected response is really
		 * <instId>-<connectionId>; handle generically here */
		this.connectionId = message.connectionId = message.connectionId.split('-').pop();
		this.isConnected = true;
	};

	Transport.prototype.onDisconnect = function() {};

	Transport.prototype.onClose = function(wasClean, message) {
		/* if the connectionmanager already thinks we're closed
		 * then we probably initiated it */
		if(this.connectionManager.state.state == 'closed')
			return;
		var newState = wasClean ?  'disconnected' : 'failed';
		this.isConnected = false;
		var error = Utils.copy(ConnectionError[newState]);
		if(message) error.message = message;
		this.emit(newState, error);
	};

	Transport.prototype.sendClose = function(closing) {
		if(closing)
			this.send(closeMessage);
	};

	Transport.prototype.dispose = function() {
		this.off();
	};

	return Transport;
})();

var WebSocketTransport = (function() {
	var isBrowser = (typeof(window) == 'object');
	var WebSocket = isBrowser ? (window.WebSocket || window.MozWebSocket) : require('ws');

	/* public constructor */
	function WebSocketTransport(connectionManager, auth, params) {
		Transport.call(this, connectionManager, auth, params);
		this.wsHost = Defaults.getHost(params.options, params.host, true);
	}
	Utils.inherits(WebSocketTransport, Transport);

	WebSocketTransport.isAvailable = function() {
		return !!WebSocket;
	};

	if(WebSocketTransport.isAvailable())
		ConnectionManager.transports['web_socket'] = WebSocketTransport;

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
		var wsScheme = options.tls ? 'wss://' : 'ws://';
		var wsUri = wsScheme + this.wsHost + ':' + Defaults.getPort(options) + '/';
		Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.connect()', 'uri: ' + wsUri);
		this.auth.getAuthParams(function(err, authParams) {
			var paramStr = ''; for(var param in authParams) paramStr += ' ' + param + ': ' + authParams[param] + ';';
			Logger.logAction(Logger.LOG_MINOR, 'WebSocketTransport.connect()', 'authParams:' + paramStr);
			if(err) {
				self.abort(err);
				return;
			}
			var connectParams = params.getConnectParams(authParams);
			try {
				var wsConnection = self.wsConnection = self.createWebSocket(wsUri, connectParams);
				wsConnection.binaryType = 'arraybuffer';
				wsConnection.onopen = function() { self.onWsOpen(); };
				wsConnection.onclose = function(ev, wsReason) { self.onWsClose(ev, wsReason); };
				wsConnection.onmessage = function(ev) { self.onWsData(ev.data); };
				wsConnection.onerror = function(ev) { self.onWsError(ev); };
			} catch(e) { self.onWsError(e); }
		});
	};

	WebSocketTransport.prototype.send = function(message) {
		this.wsConnection.send(ProtocolMessage.encode(message, this.params.format));
	};

	WebSocketTransport.prototype.onWsData = function(data) {
		Logger.logAction(Logger.LOG_MICRO, 'WebSocketTransport.onWsData()', 'data received; length = ' + data.length + '; type = ' + typeof(data));
		try {
			this.onChannelMessage(ProtocolMessage.decode(data, this.format));
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

	var REQ_SEND = 0,
		REQ_RECV = 1,
		REQ_RECV_POLL = 2,
		REQ_RECV_STREAM = 3;

	/*
	 * A base comet transport class
	 */
	function CometTransport(connectionManager, auth, params) {
		/* binary not supported for comet */
		params.format = 'json';
		Transport.call(this, connectionManager, auth, params);
		/* streaming defaults to true */
		this.stream = ('stream' in params) ? params.stream : true;
		this.sendRequest = null;
		this.recvRequest = null;
		this.pendingCallback = null;
		this.pendingItems = null;
	}
	Utils.inherits(CometTransport, Transport);

	CometTransport.REQ_SEND = REQ_SEND;
	CometTransport.REQ_RECV = REQ_RECV;
	CometTransport.REQ_RECV_POLL = REQ_RECV_POLL;
	CometTransport.REQ_RECV_STREAM = REQ_RECV_STREAM;

	/* public instance methods */
	CometTransport.prototype.connect = function() {
		Logger.logAction(Logger.LOG_MINOR, 'CometTransport.connect()', 'starting');
		Transport.prototype.connect.call(this);
		var self = this, params = this.params, options = params.options;
		var host = Defaults.getHost(options, params.host);
		var port = Defaults.getPort(options);
		var cometScheme = options.tls ? 'https://' : 'http://';

		this.baseUri = cometScheme + host + ':' + port + '/comet/';
		var connectUri = this.baseUri + 'connect';
		Logger.logAction(Logger.LOG_MINOR, 'CometTransport.connect()', 'uri: ' + connectUri);
		this.auth.getAuthParams(function(err, authParams) {
			if(err) {
				self.abort(err);
				return;
			}
			self.authParams = authParams;
			var connectParams = self.params.getConnectParams(authParams);
			Logger.logAction(Logger.LOG_MINOR, 'CometTransport.connect()', 'connectParams:' + Utils.toQueryString(connectParams));

			/* this will be the 'recvRequest' so this connection can stream messages */
			var preconnected = false,
				connectRequest = self.recvRequest = self.createRequest(connectUri, null, connectParams, null, (self.stream ? REQ_RECV_STREAM : REQ_RECV));

			connectRequest.on('data', function(data) {
				if(!preconnected) {
					preconnected = true;
					self.emit('preconnect');
				}
				self.onData(data);
			});
			connectRequest.on('complete', function(err) {
				self.recvRequest = null;
				if(err) {
					self.emit('error', err);
					return;
				}
			});
			connectRequest.exec();
		});
	};

	CometTransport.prototype.sendClose = function(closing) {
		var closeUri = this.closeUri,
			self = this;

		if(!closeUri) {
			callback({message:'Unable to close; not connected', code:80000, statusCode:400});
			return;
		}

		var closeRequest = this.createRequest(closeUri(closing), null, this.authParams, null, REQ_SEND);
		closeRequest.on('complete', function(err) {
			if(err) {
				self.emit('error', err);
				return;
			}
		});
		closeRequest.exec();
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
		Transport.prototype.onConnect.call(this, message);

		var baseConnectionUri =  this.baseUri + connectionStr;
		Logger.logAction(Logger.LOG_MICRO, 'CometTransport.onConnect()', 'baseUri = ' + baseConnectionUri + '; connectionId = ' + message.connectionId);
		this.sendUri = baseConnectionUri + '/send';
		this.recvUri = baseConnectionUri + '/recv';
		this.closeUri = function(closing) { return baseConnectionUri + (closing ? '/close' : '/disconnect'); };

		var self = this;
		Utils.nextTick(function() {
			self.recv();
		})
	};

	CometTransport.prototype.send = function(msg, callback) {
		if(this.sendRequest) {
			/* there is a pending send, so queue this message */
			this.pendingItems = this.pendingItems || [];
			this.pendingItems.push(msg);

			this.pendingCallback = this.pendingCallback || Multicaster();
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
		var self = this,
			sendRequest = this.sendRequest = self.createRequest(self.sendUri, null, self.authParams, this.encodeRequest(items), REQ_SEND);

		sendRequest.on('complete', function(err, data) {
			if(err) Logger.logAction(Logger.LOG_ERROR, 'CometTransport.sendItems()', 'on complete: err = ' + err);
			self.sendRequest = null;
			if(data) self.onData(data);

			var pendingItems = self.pendingItems;
			if(pendingItems) {
				self.pendingItems = null;
				var pendingCallback = self.pendingCallback;
				self.pendingCallback = null;
				Utils.nextTick(function() {
					self.sendItems(pendingItems, pendingCallback);
				});
			}
			callback(err);
		});
		sendRequest.exec();
	};

	CometTransport.prototype.recv = function() {
		/* do nothing if there is an active request, which might be streaming */
		if(this.recvRequest)
			return;

		/* If we're no longer connected, do nothing */
		if(!this.isConnected)
			return;

		var self = this,
			recvRequest = this.recvRequest = this.createRequest(this.recvUri, null, this.authParams, null, (self.stream ? REQ_RECV_STREAM : REQ_RECV_POLL));

		recvRequest.on('data', function(data) {
			self.onData(data);
		});
		recvRequest.on('complete', function(err) {
			self.recvRequest = null;
			if(err) {
				self.emit('error', err);
				return;
			}
			Utils.nextTick(function() {
				self.recv();
			});
		});
		recvRequest.exec();
	};

	CometTransport.prototype.onData = function(responseData) {
		try {
			var items = this.decodeResponse(responseData);
			if(items && items.length)
				for(var i = 0; i < items.length; i++)
					this.onChannelMessage(items[i]);
		} catch (e) {
			Logger.logAction(Logger.LOG_ERROR, 'CometTransport.onData()', 'Unexpected exception handing channel event: ' + e.stack);
		}
	};

	CometTransport.prototype.encodeRequest = function(requestItems) {
		return JSON.stringify(requestItems);
	};

	CometTransport.prototype.decodeResponse = function(responseData) {
		if(typeof(responseData) == 'string')
			responseData = JSON.parse(responseData);
		return responseData;
	};

	return CometTransport;
})();

this.Data = (function() {

	function Data() {}

	/* ensure a user-supplied data value has appropriate (string or buffer) type */
	Data.toData = function(data) {
		return BufferUtils.isBuffer(data) ? data : String(data);
	};

	/* get a data value from the value received inbound */
	Data.fromEncoded = function(data, msg) {
		if(typeof(data) == 'string') {
			var xform = msg.xform, match;
			if(xform && (match = xform.match(/((.+)\/)?(\w+)$/)) && (match[3] == 'base64')) {
				data = BufferUtils.decodeBase64(data);
				msg.xform = match[2];
			}
		}
		return data;
	};

	return Data;
})();

var Message = (function() {
	var msgpack = (typeof(window) == 'object') ? window.msgpack : require('msgpack-js');

	function Message() {
		this.name = undefined;
		this.id = undefined;
		this.timestamp = undefined;
		this.clientId = undefined;
		this.data = undefined;
		this.xform = undefined;
	}

	/**
	 * Overload toJSON() to intercept JSON.stringify()
	 * @return {*}
	 */
	Message.prototype.toJSON = function() {
		var result = {
			name: this.name,
			clientId: this.clientId,
			timestamp: this.timestamp,
			xform: this.xform
		};

		/* encode to base64 if we're returning real JSON;
		 * although msgpack calls toJSON(), we know it is a stringify()
		 * call if it passes on the stringify arguments */
		var data = this.data;
		if(arguments.length > 0 && BufferUtils.isBuffer(data)) {
			var xform = this.xform;
			result.xform = xform ? (xform + '/base64') : 'base64';
			data = BufferUtils.base64Encode(data);
		}
		result.data = data;
		return result;
	};

	Message.encrypt = function(msg, options) {
		var data = msg.data, xform = msg.xform;
		if(!BufferUtils.isBuffer(data)) {
			data = Crypto.Data.utf8Encode(String(data));
			xform = xform ? (xform + '/utf-8') : 'utf-8';
		}
		msg.data = options.cipher.encrypt(data);
		msg.xform = xform ? (xform + '/cipher') : 'cipher';
	};

	Message.encode = function(msg, options) {
		if(options != null && options.encrypted)
			Message.encrypt(msg, options);
	};

	Message.toRequestBody = function(messages, options, format) {
		for (var i = 0; i < messages.length; i++)
			Message.encode(messages[i], options);

		return (format == 'msgpack') ? msgpack.encode(messages, true): JSON.stringify(messages);
	};

	Message.decode = function(message, options) {
		var xform = message.xform;
		if(xform) {
			var i = 0, j = xform.length, data = message.data;
			try {
				while((i = j) >= 0) {
					j = xform.lastIndexOf('/', i - 1);
					var subXform = xform.substring(j + 1, i);
					if(subXform == 'base64') {
						data = BufferUtils.base64Decode(String(data));
						continue;
					}
					if(subXform == 'utf-8') {
						data = Crypto.Data.utf8Decode(data);
						continue;
					}
					if(subXform == 'cipher' && options != null && options.encrypted) {
						data = options.cipher.decrypt(data);
						continue;
					}
					/* FIXME: can we do anything generically with msgpack here? */
					break;
				}
			} finally {
				message.xform = (i <= 0) ? null : xform.substring(0, i);
				message.data = data;
			}
		}
	};

	Message.fromResponseBody = function(encoded, options, format) {
		var decoded = (format == 'msgpack') ? msgpack.decode(encoded) : JSON.parse(String(encoded));
		for(var i = 0; i < decoded.length; i++) {
			var msg = decoded[i] = Message.fromDecoded(decoded[i]);
			Message.decode(msg, options);
		}
	};

	Message.fromDecoded = function(values) {
		return Utils.mixin(new Message(), values);
	};

	Message.fromValues = function(values) {
		var result = Utils.mixin(new Message(), values);
		result.data = Data.toData(result.data);
		result.timestamp = result.timestamp || Date.now();
		return result;
	};

	Message.fromValuesArray = function(values) {
		var count = values.length, result = new Array(count);
		for(var i = 0; i < count; i++) result[i] = Message.fromValues(values[i]);
		return result;
	};

	return Message;
})();

var PresenceMessage = (function() {
	var msgpack = (typeof(window) == 'object') ? window.msgpack : require('msgpack-js');

	function PresenceMessage() {
		this.action = undefined;
		this.id = undefined;
		this.timestamp = undefined;
		this.clientId = undefined;
		this.clientData = undefined;
		this.xform = undefined;
		this.memberId = undefined;
		this.inheritMemberId = undefined;
	}

	PresenceMessage.Action = {
		'ENTER' : 0,
		'LEAVE' : 1,
		'UPDATE' : 2
	};

	/**
	 * Overload toJSON() to intercept JSON.stringify()
	 * @return {*}
	 */
	PresenceMessage.prototype.toJSON = function() {
		var result = {
			name: this.name,
			clientId: this.clientId,
			memberId: this.memberId,
			timestamp: this.timestamp,
			action: this.action,
			xform: this.xform
		};

		/* encode to base64 if we're returning real JSON;
		 * although msgpack calls toJSON(), we know it is a stringify()
		 * call if it passes on the stringify arguments */
		var clientData = this.clientData;
		if(arguments.length > 0 && BufferUtils.isBuffer(clientData)) {
			var xform = this.xform;
			result.xform = xform ? (xform + '/base64') : 'base64';
			clientData = clientData.toString('base64');
		}
		result.clientData = clientData;
		return result;
	};

	PresenceMessage.encrypt = function(msg, options) {
		var data = msg.clientData, xform = msg.xform;
		if(!BufferUtils.isBuffer(data)) {
			data = Crypto.Data.utf8Encode(String(data));
			xform = xform ? (xform + '/utf-8') : 'utf-8';
		}
		msg.clientData = options.cipher.encrypt(data);
		msg.xform = xform ? (xform + '/cipher') : 'cipher';
	};

	PresenceMessage.encode = function(msg, options) {
		if(options != null && options.encrypted)
			PresenceMessage.encrypt(msg, options);
	};

	PresenceMessage.decode = function(message, options) {
		var xform = message.xform;
		if(xform) {
			var i = 0, j = xform.length, data = message.clientData;
			try {
				while((i = j) >= 0) {
					j = xform.lastIndexOf('/', i - 1);
					var subXform = xform.substring(j + 1, i);
					if(subXform == 'base64') {
						data = BufferUtils.base64Decode(String(data));
						continue;
					}
					if(subXform == 'utf-8') {
						data = Crypto.Data.utf8Decode(data);
						continue;
					}
					if(subXform == 'cipher' && options != null && options.encrypted) {
						data = options.cipher.decrypt(data);
						continue;
					}
					/* FIXME: can we do anything generically with msgpack here? */
					break;
				}
			} finally {
				this.xform = (i <= 0) ? null : xform.substring(0, i);
				this.clientData = data;
			}
		}
	};

	PresenceMessage.fromResponseBody = function(encoded, options, format) {
		var decoded = (format == 'msgpack') ? msgpack.decode(encoded) : JSON.parse(String(encoded));
		for(var i = 0; i < decoded.length; i++) {
			var msg = decoded[i] = PresenceMessage.fromDecoded(decoded[i]);
			PresenceMessage.decode(msg, options);
		}
	};

	PresenceMessage.fromDecoded = function(values) {
		return Utils.mixin(new PresenceMessage(), values);
	};

	PresenceMessage.fromValues = function(values) {
		var result = Utils.mixin(new PresenceMessage(), values);
		result.clientData = Data.toData(result.clientData);
		result.timestamp = result.timestamp || Date.now();
		return result;
	};

	PresenceMessage.fromValuesArray = function(values) {
		var count = values.length, result = new Array(count);
		for(var i = 0; i < count; i++) result[i] = PresenceMessage.fromValues(values[i]);
		return result;
	};

	return PresenceMessage;
})();

var ProtocolMessage = (function() {
	var msgpack = (typeof(window) == 'object') ? window.msgpack : require('msgpack-js');

	function ProtocolMessage() {
		this.action = undefined;
		this.id = undefined;
		this.timestamp = undefined;
		this.count = undefined;
		this.error = undefined;
		this.connectionId = undefined;
		this.connectionSerial = undefined;
		this.channel = undefined;
		this.channelSerial = undefined;
		this.msgSerial = undefined;
		this.messages = undefined;
		this.presence = undefined;
	}

	ProtocolMessage.Action = {
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

	ProtocolMessage.encode = function(msg, format) {
		return (format == 'msgpack') ? msgpack.encode(msg, true): JSON.stringify(msg);
	};

	ProtocolMessage.decode = function(encoded, format) {
		var decoded = (format == 'msgpack') ? msgpack.decode(encoded) : JSON.parse(String(encoded));
		return ProtocolMessage.fromDecoded(decoded);
	};

	ProtocolMessage.fromDecoded = function(decoded) {
		var error = decoded.error;
		if(error) decoded.error = ErrorInfo.fromValues(error);
		var messages = decoded.messages;
		if(messages) for(var i = 0; i < messages.length; i++) messages[i] = Message.fromDecoded(messages[i]);
		var presence = decoded.presence;
		if(presence) for(var i = 0; i < presence.length; i++) presence[i] = PresenceMessage.fromDecoded(presence[i]);
		return Utils.mixin(new ProtocolMessage(), decoded);
	};

	ProtocolMessage.fromValues = function(values) {
		return Utils.mixin(new ProtocolMessage(), values);
	};

	return ProtocolMessage;
})();

var Resource = (function() {
	function Resource() {}

	function withAuthDetails(rest, headers, params, errCallback, opCallback) {
		if (Http.supportsAuthHeaders) {
			rest.auth.getAuthHeaders(function(err, authHeaders) {
				if(err)
					errCallback(err);
				else
					opCallback(Utils.mixin(authHeaders, headers), params);
			});
		} else {
			rest.auth.getAuthParams(function(err, authParams) {
				if(err)
					errCallback(err);
				else
					opCallback(headers, Utils.mixin(authParams, params));
			});
		}
	}

	function unenvelope(callback) {
		return function(err, res) {
			if(err) {
				callback(err);
				return;
			}

			var statusCode = res.statusCode,
				response = res.response,
				headers = res.headers;

			if(statusCode < 200 || statusCode >= 300) {
				/* handle wrapped errors */
				var err = response && response.error;
				if(!err) {
					err = new Error(String(res));
					err.statusCode = statusCode;
				}
				callback(err);
				return;
			}

			callback(null, response, headers);
		};
	}

	Resource.get = function(rest, path, origheaders, origparams, envelope, callback) {
		if(envelope) {
			callback = (callback && unenvelope(callback));
			(origparams = (origparams || {}))['envelope'] = 'true';
		}

		function doGet(headers, params) {
			Http.get(rest, path, headers, params, function(err, res, headers) {
				if(err && err.code == 40140) {
					/* token has expired, so get a new one */
					rest.auth.authorise({force:true}, null, function(err) {
						if(err) {
							callback(err);
							return;
						}
						/* retry ... */
						withAuthDetails(rest, origheaders, origparams, callback, doGet);
					});
					return;
				}
				callback(err, res, headers);
			});
		}
		withAuthDetails(rest, origheaders, origparams, callback, doGet);
	};

	Resource.post = function(rest, path, body, origheaders, origparams, envelope, callback) {
		if(envelope) {
			callback = unenvelope(callback);
			origparams['envelope'] = 'true';
		}

		function doPost(headers, params) {
			Http.post(rest, path, headers, body, params, function(err, res, headers) {
				if(err && err.code == 40140) {
					/* token has expired, so get a new one */
					rest.auth.authorise({force:true}, null, function(err) {
						if(err) {
							callback(err);
							return;
						}
						/* retry ... */
						withAuthDetails(rest, origheaders, origparams, callback, doPost);
					});
					return;
				}
				callback(err, res, headers);
			});
		}
		withAuthDetails(rest, origheaders, origparams, callback, doPost);
	};

	return Resource;
})();

var PaginatedResource = (function() {

	function getRelParams(linkUrl) {
		var urlMatch = linkUrl.match(/^\.\/(\w+)\?(.*)$/);
		return urlMatch && Utils.parseQueryString(urlMatch[2]);
	}

	function parseRelLinks(linkHeader) {
		if(typeof(linkHeader) == 'string')
			linkHeader = linkHeader.split(',');

		var relParams = {};
		for(var i = 0; i < linkHeader.length; i++) {
			var linkMatch = linkHeader[i].match(/^\s*<(.+)>;\s*rel="(\w+)"$/);
			if(linkMatch) {
				var params = getRelParams(linkMatch[1]);
				if(params)
					relParams[linkMatch[2]] = params;
			}
		}
		return relParams;
	}

	function PaginatedResource(rest, path, headers, params, envelope, bodyHandler) {
		this.rest = rest;
		this.path = path;
		this.headers = headers;
		this.params = params;
		this.envelope = envelope;
		this.bodyHandler = bodyHandler;
	}

	PaginatedResource.prototype.get = function(callback) {
		var self = this;
		Resource.get(this.rest, this.path, this.headers, this.params, this.envelope, function(err, body, headers) {
			if(err) {
				Logger.logAction(Logger.LOG_ERROR, 'PaginatedResource.get()', 'Unexpected error getting resource: err = ' + JSON.stringify(err));
				return;
			}
			var current, linkHeader, relLinks;
			try {
				current = self.bodyHandler(body);
			} catch(e) {
				callback(e);
				return;
			}

			if(headers && (linkHeader = (headers['Link'] || headers['link'])))
				relLinks = parseRelLinks(linkHeader);

			callback(null, current, relLinks);
		});
	};

	return PaginatedResource;
})();
var Auth = (function() {
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

		/* tokenParams contains the parameters that may be used in
		 * token requests */
		var tokenParams = this.tokenParams = {},
			keyId = options.keyId;

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
		} else if(options.authUrl) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth()', 'using token auth with authUrl');
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
	 * @param authOptions
	 * an object containing the request params:
	 * - keyId:      (optional) the id of the key to use; if not specified, a key id
	 *               passed in constructing the Rest interface may be used
	 *
	 * - keyValue:   (optional) the secret of the key to use; if not specified, a key
	 *               value passed in constructing the Rest interface may be used
	 *
	 * - queryTime   (optional) boolean indicating that the Ably system should be
	 *               queried for the current time when none is specified explicitly.
	 *
	 * - force       (optional) boolean indicating that a new token should be requested,
	 *               even if a current token is still valid.
	 *
	 * @param tokenParams
	 * an object containing the parameters for the requested token:
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
	 * - client_id:   (optional) a client Id to associate with the token
	 *
	 * - timestamp:  (optional) the time in seconds since the epoch. If none is specified,
	 *               the system will be queried for a time value to use.
	 *
	 * @param callback (err, tokenDetails)
	 */
	Auth.prototype.authorise = function(authOptions, tokenParams, callback) {
		var token = this.token;
		if(token) {
			if(token.expires === undefined || (token.expires > this.getTimestamp())) {
				if(!(authOptions && authOptions.force)) {
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
		this.requestToken(authOptions, tokenParams, function(err, tokenResponse) {
			if(err) {
				callback(err);
				return;
			}
			callback(null, (self.token = tokenResponse));
		});
	};

	/**
	 * Request an access token
	 * @param authOptions
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
	 * - queryTime      (optional) boolean indicating that the ably system should be
	 *                  queried for the current time when none is specified explicitly
	 *
	 * - requestHeaders (optional, unsuported, for testing only) extra headers to add to the
	 *                  requestToken request
	 *
	 * @param tokenParams
	 * an object containing the parameters for the requested token:
	 * - ttl:       (optional) the requested life of the token in seconds. If none is specified
	 *                  a default of 1 hour is provided. The maximum lifetime is 24hours; any request
	 *                  exceeeding that lifetime will be rejected with an error.
	 *
	 * - capability:    (optional) the capability to associate with the access token.
	 *                  If none is specified, a token will be requested with all of the
	 *                  capabilities of the specified key.
	 *
	 * - client_id:      (optional) a client Id to associate with the token; if not
	 *                  specified, a clientId passed in constructing the Rest interface will be used
	 *
	 * - timestamp:     (optional) the time in seconds since the epoch. If none is specified,
	 *                  the system will be queried for a time value to use.
	 *
	 * @param callback (err, tokenDetails)
	 */
	Auth.prototype.requestToken = function(authOptions, tokenParams, callback) {
		/* shuffle and normalise arguments as necessary */
		if(typeof(authOptions) == 'function' && !callback) {
			callback = authOptions;
			authOptions = tokenParams = null;
		}
		else if(typeof(tokenParams) == 'function' && !callback) {
			callback = tokenParams;
			tokenParams = authOptions;
			authOptions = null;
		}

		/* merge supplied options with the already-known options */
		authOptions = Utils.mixin(Utils.copy(this.rest.options), authOptions);
		tokenParams = tokenParams || Utils.copy(this.tokenParams);
		callback = callback || noop;

		/* first set up whatever callback will be used to get signed
		 * token requests */
		var tokenRequestCallback, rest = this.rest;
		if(authOptions.authCallback) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with auth_callback');
			tokenRequestCallback = authOptions.authCallback;
		} else if(authOptions.authUrl) {
			Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with auth_url');
			tokenRequestCallback = function(params, cb) {
				var authHeaders = Utils.mixin({accept: 'application/json'}, authOptions.authHeaders);
				Http.getUri(rest, authOptions.authUrl, authHeaders || {}, Utils.mixin(params, authOptions.authParams), cb);
			};
		} else if(authOptions.keyValue) {
			var self = this;
			Logger.logAction(Logger.LOG_MINOR, 'Auth.requestToken()', 'using token auth with client-side signing');
			tokenRequestCallback = function(params, cb) { self.createTokenRequest(authOptions, params, cb); };
		} else {
			throw new Error('Auth.requestToken(): authOptions must include valid authentication parameters');
		}

		/* normalise token params */
		if('capability' in tokenParams)
			tokenParams.capability = c14n(tokenParams.capability);

		var rest = this.rest;
		var tokenRequest = function(signedTokenParams, tokenCb) {
			var requestHeaders,
				tokenUri = function(host) { return rest.baseUri(host) + '/keys/' + signedTokenParams.id + '/requestToken';};

			if(Http.post) {
				requestHeaders = Utils.defaultPostHeaders();
				if(authOptions.requestHeaders) Utils.mixin(requestHeaders, authOptions.requestHeaders);
				Http.post(rest, tokenUri, requestHeaders, signedTokenParams, null, tokenCb);
			} else {
				requestHeaders = Utils.defaultGetHeaders();
				if(authOptions.requestHeaders) Utils.mixin(requestHeaders, authOptions.requestHeaders);
				Http.get(rest, tokenUri, requestHeaders, signedTokenParams, tokenCb);
			}
		};
		tokenRequestCallback(tokenParams, function(err, tokenRequestOrDetails) {
			if(err) {
				Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', 'token request signing call returned error; err = ' + err);
				if(!('code' in err))
					err.code = 40170;
				if(!('statusCode' in err))
					err.statusCode = 401;
				callback(err);
				return;
			}
			/* the response from the callback might be a signed request or a token details */
			if('issued_at' in tokenRequestOrDetails) {
				callback(null, tokenRequestOrDetails);
				return;
			}
			tokenRequest(tokenRequestOrDetails, function(err, tokenResponse) {
				if(err) {
					Logger.logAction(Logger.LOG_ERROR, 'Auth.requestToken()', 'token request API call returned error; err = ' + err);
					callback(err);
					return;
				}
				if(typeof(tokenResponse) === 'string') tokenResponse = JSON.parse(tokenResponse);
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
	 * @param authOptions
	 * an object containing the request options:
	 * - keyId:         the id of the key to use.
	 *
	 * - keyValue:      (optional) the secret value of the key; if not
	 *                  specified, a key passed in constructing the Rest interface will be used; or
	 *                  if no key is available, a token request callback or url will be used.
	 *
	 * - queryTime      (optional) boolean indicating that the ably system should be
	 *                  queried for the current time when none is specified explicitly
	 *
	 * - requestHeaders (optional, unsuported, for testing only) extra headers to add to the
	 *                  requestToken request
	 *
	 * @param tokenParams
	 * an object containing the parameters for the requested token:
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
	 */
	Auth.prototype.createTokenRequest = function(authOptions, tokenParams, callback) {
		authOptions = authOptions || this.rest.options;
		tokenParams = tokenParams || Utils.copy(this.tokenParams);

		var keyId = authOptions.keyId;
		var keyValue = authOptions.keyValue;
		if(!keyId || !keyValue) {
			callback(new Error('No key specified'));
			return;
		}
		var request = { id: keyId };
		var clientId = tokenParams.client_id || '';
		if(clientId)
			request.client_id = clientId;

		var ttl = tokenParams.ttl || '';
		if(ttl)
			request.ttl = ttl;

		var capability = tokenParams.capability || '';
		if(capability)
			request.capability = capability;

		var rest = this.rest, self = this;
		(function(authoriseCb) {
			if(tokenParams.timestamp) {
				authoriseCb();
				return;
			}
			if(authOptions.queryTime) {
				rest.time(function(err, time) {
					if(err) {callback(err); return;}
					tokenParams.timestamp = Math.floor(time/1000);
					authoriseCb();
				});
				return;
			}
			tokenParams.timestamp = self.getTimestamp();
			authoriseCb();
		})(function() {
			/* nonce */
			/* NOTE: there is no expectation that the client
			 * specifies the nonce; this is done by the library
			 * However, this can be overridden by the client
			 * simply for testing purposes. */
			var nonce = request.nonce = (tokenParams.nonce || random());

			var timestamp = request.timestamp = tokenParams.timestamp;

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
			request.mac = tokenParams.mac || hmac(signText, keyValue);

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
			this.authorise(null, null, function(err, token) {
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
			this.authorise(null, null, function(err, token) {
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

		if (typeof(this.options.useBinaryProtocol) === 'undefined')
			this.options.useBinaryProtocol = BufferUtils.supportsBinary;

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

		if(!('tls' in options))
			options.tls = true;

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
		var headers = Utils.copy(Utils.defaultGetHeaders()),
			envelope = !Http.supportsLinkHeaders;

		if(this.options.headers)
			Utils.mixin(headers, this.options.headers);

		(new PaginatedResource(this, '/stats', headers, params, envelope, function(body) {
			return (typeof(body) === 'string') ? JSON.parse(body) : body;
		})).get(callback);
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
			if (typeof(res) === 'string') res = JSON.parse(res);
			var time = res[0];
			if(!time) {
				err = new Error('Internal error (unexpected result type from GET /time)');
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
})();
var Realtime = (function() {

	function Realtime(options) {
		Logger.logAction(Logger.LOG_MINOR, 'Realtime()', '');
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
		for(var channelId in this.attached)
			this.attached[channelId].checkPendingState();
	};

	Channels.prototype.setSuspended = function(err) {
		for(var channelId in this.attached) {
			var channel = this.attached[channelId];
			channel.setSuspended(err);
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
		EventEmitter.prototype.on.apply(this, arguments);
		if(this.state == state && callback)
			try {
				callback(new ConnectionStateChange(undefined, state));
			} catch(e) {}
	};

	Connection.prototype.connect = function() {
		Logger.logAction(Logger.LOG_MAJOR, 'Connection.connect()', '');
		this.connectionManager.requestState({state: 'connecting'});
	};

	Connection.prototype.close = function() {
		Logger.logAction(Logger.LOG_MAJOR, 'Connection.close()', 'connectionId = ' + this.id);
		this.connectionManager.requestState({state: 'closed'});
	};

	return Connection;
})();

var Channel = (function() {
	function noop() {}

	var defaultOptions = {};

	/* public constructor */
	function Channel(rest, name, options) {
		Logger.logAction(Logger.LOG_MINOR, 'Channel()', 'started; name = ' + name);
		EventEmitter.call(this);
		this.rest = rest;
		this.name = name;
		this.basePath = '/channels/' + encodeURIComponent(name);
		this.presence = new Presence(this);
		this.setOptions(options);
	}
	Utils.inherits(Channel, EventEmitter);

	Channel.prototype.setOptions = function(options, callback) {
		callback = callback || noop;
		options = this.options = Utils.prototypicalClone(defaultOptions, options);
		if(options.encrypted) {
			Crypto.getCipher(options, function(err, cipher) {
				options.cipher = cipher;
				callback(null);
			});
		} else {
			callback(null, (options.cipher = null));
		}
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
			envelope = !Http.supportsLinkHeaders,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			headers = Utils.copy(Utils.defaultGetHeaders(format)),
			options = this.options;

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		(new PaginatedResource(rest, this.basePath + '/messages', headers, params, envelope, function(body) {
			return Message.fromResponseBody(body, options, format);
		})).get(callback);
	};

	Channel.prototype.publish = function(name, data, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Channel.publish()', 'channel = ' + this.name + '; name = ' + name);
		callback = callback || noop;
		var rest = this.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			msg = Message.fromValues({name:name, data:data}),
			options = this.options;

		var requestBody = Message.toRequestBody([msg], options, format);
		var headers = Utils.copy(Utils.defaultPostHeaders(format));
		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);
		Resource.post(rest, this.basePath + '/messages', requestBody, headers, null, false, callback);
	};

	function Presence(channel) {
		this.channel = channel;
		this.basePath = channel.basePath + '/presence';
	}

	Presence.prototype.get = function(params, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Channel.presence.get()', 'channel = ' + this.channel.name);
		/* params and callback are optional; see if params contains the callback */
		if(callback === undefined) {
			if(typeof(params) == 'function') {
				callback = params;
				params = null;
			} else {
				callback = noop;
			}
		}
		var rest = this.channel.rest,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			headers = Utils.copy(Utils.defaultGetHeaders(format)),
			options = this.channel.options;

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		Resource.get(rest, this.basePath, headers, params, false, function(err, res) {
			if(err) {
				callback(err);
				return;
			}
			callback(null, PresenceMessage.fromResponseBody(res, options, format));
		});
	};

	Presence.prototype.history = function(params, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Channel.presence.history()', 'channel = ' + this.channel.name);
		/* params and callback are optional; see if params contains the callback */
		if(callback === undefined) {
			if(typeof(params) == 'function') {
				callback = params;
				params = null;
			} else {
				callback = noop;
			}
		}
		var rest = this.channel.rest,
			envelope = !Http.supportsLinkHeaders,
			format = rest.options.useBinaryProtocol ? 'msgpack' : 'json',
			headers = Utils.copy(Utils.defaultGetHeaders(format)),
			options = this.channel.options;

		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);

		(new PaginatedResource(rest, this.basePath + '/history', headers, params, envelope, function(body) {
			return PresenceMessage.fromResponseBody(body, options, format);
		})).get(callback);
	};

	return Channel;
})();

var RealtimeChannel = (function() {
	var actions = ProtocolMessage.Action;
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
    	this.state = 'initialized';
    	this.subscriptions = new EventEmitter();
    	this.pendingEvents = [];
		this.setOptions(options);
	}
	Utils.inherits(RealtimeChannel, Channel);

	RealtimeChannel.invalidStateError = {
		statusCode: 400,
		code: 90001,
		message: 'Channel operation failed (invalid channel state)'
	};

	RealtimeChannel.channelDetachedErr = {
		statusCode: 409,
		code: 90006,
		message: 'Channel is detached'
	};

	RealtimeChannel.prototype.setOptions = function(options, callback) {
		callback = callback || noop;
		options = this.options = Utils.prototypicalClone(defaultOptions, options);
		if(options.encrypted) {
			Crypto.getCipher(options, function(err, cipher) {
				options.cipher = cipher;
				callback(null);
			});
		} else {
			callback(null, (options.cipher = null));
		}
	};

	RealtimeChannel.prototype.publish = function() {
		var argCount = arguments.length,
			messages = arguments[0],
			callback = arguments[argCount - 1],
			options = this.options;

		if(typeof(callback) !== 'function') {
			callback = noop;
			++argCount;
		}
		var connectionManager = this.connectionManager;
		if(!ConnectionManager.activeState(connectionManager.state)) {
			callback(connectionManager.getStateError());
			return;
		}
		if(argCount == 2) {
			if(!Utils.isArray(messages))
				messages = [messages];
			messages = Message.fromValuesArray(messages);
		} else {
			messages = [Message.fromValues({name: arguments[0], data: arguments[1]})];
		}
		for(var i = 0; i < messages.length; i++)
			Message.encode(messages[i], options);

		this._publish(messages, callback);
	};

	RealtimeChannel.prototype._publish = function(messages, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.publish()', 'message count = ' + messages.length);
		switch(this.state) {
			case 'attached':
				Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.publish()', 'sending message');
				var msg = new ProtocolMessage();
				msg.action = actions.MESSAGE;
				msg.channel = this.name;
				msg.messages = messages;
				this.sendMessage(msg, callback);
				break;
			default:
				this.attach();
			case 'attaching':
				Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.publish()', 'queueing message');
				this.pendingEvents.push({messages: messages, callback: callback});
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
		this.setPendingState('attaching');
    };

    RealtimeChannel.prototype.attachImpl = function(callback) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.attachImpl()', 'sending ATTACH message');
    	var msg = ProtocolMessage.fromValues({action: actions.ATTACH, channel: this.name});
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
		this.setPendingState('detaching');
		this.setSuspended(RealtimeChannel.channelDetachedErr, true);
	};

	RealtimeChannel.prototype.detachImpl = function(callback) {
		Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.detach()', 'sending DETACH message');
    	var msg = ProtocolMessage.fromValues({action: actions.DETACH, channel: this.name});
    	this.sendMessage(msg, (callback || noop));
	};

	RealtimeChannel.prototype.subscribe = function(/* [event], listener, [callback] */) {
		var args = Array.prototype.slice.call(arguments);
		if(args.length == 1 && typeof(args[0]) == 'function')
			args.unshift(null);

		var event = args[0];
		var listener = args[1];
		var callback = (args[2] || (args[2] = noop));
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
		var msg = ProtocolMessage.fromValues({
			action: actions.PRESENCE,
			channel: this.name,
			presence: [PresenceMessage.fromValues(presence)]
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
			var presence = message.presence,
				id = message.id,
				timestamp = message.timestamp,
				options = this.options;

			for(var i = 0; i < presence.length; i++) {
				try {
					var presenceMsg = presence[i];
					PresenceMessage.decode(presenceMsg, options);
				} catch (e) {
					/* decrypt failed .. the most likely cause is that we have the wrong key */
					var errmsg = 'Unexpected error decrypting message; err = ' + e;
					Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.onMessage()', errmsg);
					var err = new Error(errmsg);
					this.emit('error', err);
				}
				if(!presenceMsg.id) presenceMsg.id = id + ':' + i;
				if(!presenceMsg.timestamp) presenceMsg.timestamp = timestamp;
			}
			this.presence.setPresence(presence, true);
			break;

		case actions.MESSAGE:
			var messages = message.messages,
				id = message.id,
				timestamp = message.timestamp,
				options = this.options;

			for(var i = 0; i < messages.length; i++) {
				try {
					var msg = messages[i];
					Message.decode(msg, options);
				} catch (e) {
					/* decrypt failed .. the most likely cause is that we have the wrong key */
					var errmsg = 'Unexpected error decrypting message; err = ' + e;
					Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.onMessage()', errmsg);
					var err = new Error(errmsg);
					this.emit('error', err);
				}
				if(!msg.id) msg.id = id + ':' + i;
				if(!msg.timestamp) msg.timestamp = timestamp;
			}
			this.onEvent(messages);
			break;

		case actions.ERROR:
			/* there was a channel-specific error */
			var err = message.error;
			if(err && err.code == 80016) {
				/* attach/detach operation attempted on superseded transport handle */
				this.checkPendingState();
			} else {
				this.setDetached(message);
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
		this.clearStateTimer();

		/* update any presence included with this message */
		if(message.presence)
			this.presence.setPresence(message.presence, false);

		/* ensure we don't transition multiple times */
		if(this.state != 'attaching')
			return;

		this.state = 'attached';
		var pendingEvents = this.pendingEvents, pendingCount = pendingEvents.length;
		if(pendingCount) {
			this.pendingEvents = [];
			var msg = ProtocolMessage.fromValues({action: actions.MESSAGE, channel: this.name, messages: []});
			var multicaster = Multicaster();
			Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.setAttached', 'sending ' + pendingCount + ' queued messages');
			for(var i = 0; i < pendingCount; i++) {
				var event = pendingEvents[i];
				Array.prototype.push.apply(msg.messages, event.messages);
				multicaster.push(event.callback);
			}
			this.sendMessage(msg, multicaster);
		}
		this.presence.setAttached();
		this.emit('attached');
	};

	RealtimeChannel.prototype.setDetached = function(message) {
		this.clearStateTimer();

		var msgErr = message.error;
		if(msgErr) {
			/* this is an error message */
			this.state = 'failed';
			var err = {statusCode: msgErr.statusCode, code: msgErr.code, message: msgErr.message};
			this.failPendingMessages(err);
			this.emit('failed', err);
		} else {
			this.failPendingMessages({statusCode: 404, code: 90001, message: 'Channel detached'});
			if(this.state !== 'detached') {
				this.state = 'detached';
				this.emit('detached');
			}
		}
	};

	RealtimeChannel.prototype.setSuspended = function(err, suppressEvent) {
		Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.setSuspended', 'deactivating channel; name = ' + this.name + ', err ' + (err ? err.message : 'none'));
		this.clearStateTimer();
		this.failPendingMessages(err);
		this.presence.setSuspended(err);
		if (!suppressEvent)
			this.emit('detached');
	};

	RealtimeChannel.prototype.setPendingState = function(state) {
		Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.setPendingState', 'name = ' + this.name + ', state = ' + state);
		this.state = state;
		this.clearStateTimer();

		/* if not currently connected, do nothing */
		if(this.connectionManager.state.state != 'connected') {
			Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.setPendingState', 'not connected');
			return;
		}

		/* send the event and await response */
		this.checkPendingState();

		/* set a timer to handle no response */
		var self = this;
		this.stateTimer = setTimeout(function() {
			Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.setPendingState', 'timer expired');
			self.stateTimer = null;
			/* retry */
			self.checkPendingState();
		}, Defaults.sendTimeout)
	};

	RealtimeChannel.prototype.checkPendingState = function() {
		var result = false;
		switch(this.state) {
			case 'attaching':
				this.attachImpl();
				result = true;
				break;
			case 'detaching':
				this.detachImpl();
				result = true;
				break;
			default:
				break;
		}
		return result;
	};

	RealtimeChannel.prototype.clearStateTimer = function() {
		var stateTimer = this.stateTimer;
		if(stateTimer) {
			clearTimeout(stateTimer);
			this.stateTimer = null;
		}
	};

	RealtimeChannel.prototype.failPendingMessages = function(err) {
		Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.failPendingMessages', 'channel; name = ' + this.name + ', err = ' + err);
		for(var i = 0; i < this.pendingEvents.length; i++)
			try {
				this.pendingEvents[i].callback(err);
			} catch(e) {}
		this.pendingEvents = [];
	};

	return RealtimeChannel;
})();

var Presence = (function() {
	var presenceAction = PresenceMessage.Action;
	var presenceActionToEvent = ['enter', 'leave', 'update'];

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
		if (!callback && (typeof(clientData)==='function')) {
			callback = clientData;
			clientData = '';
		}
		if(!this.clientId)
			throw new Error('clientId must be specified to enter a presence channel');
		this.enterClient(this.clientId, clientData, callback);
	};

	Presence.prototype.enterClient = function(clientId, clientData, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Presence.enterClient()', 'entering; channel = ' + this.channel.name + ', client = ' + clientId);
		var presence = PresenceMessage.fromValues({
			action : presenceAction.ENTER,
			clientId : clientId,
			clientData: Data.toData(clientData)
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
		var presence = PresenceMessage.fromValues({
			action : presenceAction.LEAVE,
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
			var key = memberKey(presence.clientId, presence.memberId);
			switch(presence.action) {
				case presenceAction.LEAVE:
					delete this.members[key];
					break;
				case presenceAction.UPDATE:
					if(presence.inheritMemberId)
						delete this.members[memberKey(presence.clientId, presence.inheritMemberId)];
				case presenceAction.ENTER:
					this.members[key] = presence;
					break;
			}
			if(broadcast)
				this.emit(presenceActionToEvent[presence.action], presence);
		}
	};

	Presence.prototype.setAttached = function() {
		var pendingPresence = this.pendingPresence;
		if(pendingPresence) {
			var presence = pendingPresence.presence, callback = pendingPresence.callback;
			Logger.logAction(Logger.LOG_MICRO, 'Presence.setAttached', 'sending queued presence; action = ' + presence.action);
			this.channel.sendPresence(presence, callback);
			this.pendingPresence = null;
		}
	};

	Presence.prototype.setSuspended = function(err) {
		var pendingPresence = this.pendingPresence;
		if(pendingPresence) {
			pendingPresence.callback(err);
			this.pendingPresence = null;
		}
	};

	return Presence;
})();

var JSONPTransport = (function() {
	var noop = function() {};
	var _ = window.Ably._ = function(id) { return _[id] || noop; };
	var idCounter = 1;
	var head = document.getElementsByTagName('head')[0];

	/* public constructor */
	function JSONPTransport(connectionManager, auth, params) {
		params.stream = false;
		CometTransport.call(this, connectionManager, auth, params);
	}
	Utils.inherits(JSONPTransport, CometTransport);

	JSONPTransport.isAvailable = function() { return true; };
	ConnectionManager.httpTransports['jsonp'] = ConnectionManager.transports['jsonp'] = JSONPTransport;

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
		request('http://internet-up.ably.io.s3-website-us-east-1.amazonaws.com/is-the-internet-up.js', null, null, null, false, function(err, response) {
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

	var createRequest = JSONPTransport.prototype.createRequest = function(uri, headers, params, body, requestMode) {
		return new Request(undefined, uri, headers, params, body, requestMode);
	}

	function Request(id, uri, headers, params, body, requestMode) {
		EventEmitter.call(this);
		if(id === undefined) id = idCounter++;
		this.id = id;
		this.uri = uri;
		this.params = params || {};
		this.body = body;
		this.requestMode = requestMode;
		this.requestComplete = false;
	}
	Utils.inherits(Request, EventEmitter);

	Request.prototype.exec = function() {
		var id = this.id,
			body = this.body,
			uri = this.uri,
			params = this.params,
			self = this;

		params.callback = 'Ably._(' + id + ')';
		if(body)
			params.body = encodeURIComponent(body);
		else
			delete params.body;

		var script = this.script = document.createElement('script');
		script.src = uri + Utils.toQueryString(params);
		script.async = true;
		script.type = 'text/javascript';
		script.charset = 'UTF-8';
		script.onerror = function(err) {
			err.code = 80000;
			self.complete(err);
		};

		_[id] = function(message) {
			self.complete(null, message);
		};

		var timeout = (this.requestMode == CometTransport.REQ_SEND) ? Defaults.sendTimeout : Defaults.recvTimeout;
		this.timer = setTimeout(function() { self.abort(); }, timeout);
		head.insertBefore(script, head.firstChild);
	};

	Request.prototype.complete = function(err, body) {
		if(!this.requestComplete) {
			this.requestComplete = true;
			if(body)
				this.emit('data', body);
			this.emit('complete', err, body);
			this.dispose();
		}
	};

	Request.prototype.abort = function() {
		this.dispose();
	};

	Request.prototype.dispose = function() {
		var timer = this.timer;
		if(timer) {
			clearTimeout(timer);
			this.timer = null;
		}
		var script = this.script;
		if(script.parentNode) script.parentNode.removeChild(script);
		delete _[this.id];
	};

	var request = Http.Request = function(uri, headers, params, body, format, callback) {
		var req = createRequest(uri, headers, params, body, CometTransport.REQ_SEND);
		req.once('complete', callback);
		req.exec();
		return req;
	};

	return JSONPTransport;
})();

var XHRRequest = (function() {
	var noop = function() {};
	var idCounter = 0;
	var pendingRequests = {};

	/* duplicated here; because this is included standalone in iframe.js */
	var REQ_SEND = 0,
		REQ_RECV = 1,
		REQ_RECV_POLL = 2,
		REQ_RECV_STREAM = 3;

	function clearPendingRequests() {
		for(var id in pendingRequests)
			pendingRequests[id].dispose();
	}

	var isIE = window.XDomainRequest;
	var xhrSupported, xdrSupported;
	function isAvailable() {
		if(window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest()) {
			return (xhrSupported = true);
		}

		if(isIE && document.domain && (window.location.protocol == 'https:')) {
			return (xdrSupported = true);
		}

		return false;
	};

	function responseHeaders(xhr) {
		var headers = {};
		if(xhr.getResponseHeader) {
			var contentType = xhr.getResponseHeader('Content-Type');
			if(contentType)
				headers['Content-Type'] = contentType;
		}
		return headers;
	}

	function XHRRequest(uri, headers, params, body, requestMode) {
		EventEmitter.call(this);
		params = params || {};
		params.rnd = String(Math.random()).substr(2);
		this.uri = uri + Utils.toQueryString(params);
		this.headers = headers || {};
		this.body = body;
		this.requestMode = requestMode;
		this.requestComplete = false;
		pendingRequests[this.id = String(++idCounter)] = this;
	}
	Utils.inherits(XHRRequest, EventEmitter);
	XHRRequest.isAvailable = isAvailable;

	var createRequest = XHRRequest.createRequest = function(uri, headers, params, body, requestMode) {
		return xhrSupported ? new XHRRequest(uri, headers, params, body, requestMode) : new XDRRequest(uri, headers, params, body, requestMode);
	};

	XHRRequest.prototype.complete = function(err, body) {
		if(!this.requestComplete) {
			this.requestComplete = true;
			var xhr = this.xhr;
			if(body)
				this.emit('data', body);
			this.emit('complete', err, body, (xhr && responseHeaders(xhr)));
			this.dispose();
		}
	};

	XHRRequest.prototype.abort = function() {
		this.dispose();
	};

	XHRRequest.prototype.exec = function() {
		var timeout = (this.requestMode == REQ_SEND) ? Defaults.sendTimeout : Defaults.recvTimeout,
			timer = this.timer = setTimeout(function() { xhr.abort(); }, timeout),
			body = this.body,
			method = body ? 'POST' : 'GET',
			contentType = 'application/json',
			headers = this.headers,
			xhr = this.xhr = new XMLHttpRequest(),
			self = this;

		headers['accept'] = (headers['accept'] || contentType);
		if(body) {
			if(typeof(body) == 'object') body = JSON.stringify(body);
			headers['content-type'] = (headers['content-type'] || contentType);
		}

		xhr.open(method, this.uri, true);
		xhr.withCredentials = 'true';
		for(var h in headers)
			xhr.setRequestHeader(h, headers[h]);

		var onerror = xhr.onerror = function(err) {
			err.code = 80000;
			self.complete(err);
		};
		xhr.onabort = function() {
			var err = new Error('Request cancelled');
			err.statusCode = 400;
			onerror(err);
		};
		xhr.ontimeout = function() {
			var err = new Error('Request timed out');
			err.statusCode = 408;
			onerror(err);
		};

		var streaming,
			statusCode,
			responseBody,
			successResponse,
			streamPos = 0;

		function onResponse() {
			clearTimeout(timer);
			successResponse = (statusCode < 400);
			if(statusCode == 204) {
				self.complete();
				return;
			}
			streaming = (self.requestMode == REQ_RECV_STREAM && successResponse);
		}

		function onEnd() {
			try {
				responseBody = xhr.responseText;
				if(!responseBody || !responseBody.length) {
					if(status != 204) {
						err = new Error('Incomplete response body from server');
						err.statusCode = 400;
						self.complete(err);
					}
					return;
				}
				responseBody = JSON.parse(String(responseBody));
			} catch(e) {
				var err = new Error('Malformed response body from server: ' + e.message);
				err.statusCode = 400;
				self.complete(err);
				return;
			}

			if(successResponse) {
				self.complete(null, responseBody);
				return;
			}

			var err = responseBody.error;
			if(!err) {
				err = new Error('Error response received from server: ' + statusCode);
				err.statusCode = statusCode;
			}
			self.complete(err);
		}

		function onProgress() {
			responseBody = xhr.responseText;
			var bodyEnd = responseBody.length - 1, idx, chunk;
			while((streamPos < bodyEnd) && (idx = responseBody.indexOf('\n', streamPos)) > -1) {
				chunk = responseBody.slice(streamPos, idx);
				streamPos = idx + 1;
				onChunk(chunk);
			}
		}

		function onChunk(chunk) {
			try {
				chunk = JSON.parse(chunk);
			} catch(e) {
				err = new Error('Malformed response body from server: ' + e.message);
				err.statusCode = 400;
				self.complete(err);
				return;
			}
			self.emit('data', chunk);
		}

		function onStreamEnd() {
			onProgress();
			self.streamComplete = true;
			Utils.nextTick(function() {
				self.complete();
			});
		}

		xhr.onreadystatechange = function() {
			var readyState = xhr.readyState;
			if(readyState < 3) return;
			if(xhr.status !== 0) {
				if(statusCode === undefined) {
					statusCode = xhr.status;
					/* IE returns 1223 for 204: http://bugs.jquery.com/ticket/1450 */
					if(statusCode === 1223) statusCode = 204;
					onResponse();
				}
				if(readyState == 3 && streaming) {
					onProgress();
				} else if(readyState == 4) {
					if(streaming)
						onStreamEnd();
					else
						onEnd();
				}
			}
		};
		xhr.send(body);
	};

	XHRRequest.prototype.dispose = function() {
		var xhr = this.xhr;
		if(xhr) {
			xhr.onreadystatechange = xhr.onerror = xhr.onabort = xhr.ontimeout = noop;
			this.xhr = null;
			var timer = this.timer;
			if(timer) {
				clearTimeout(timer);
				this.timer = null;
			}
			if(!this.requestComplete)
				xhr.abort();
		}
		delete pendingRequests[this.id];
	};

	function XDRRequest(uri, headers, params, body, requestMode) {
		params.ua = 'xdr';
		XHRRequest.call(this, uri, headers, params, body, requestMode);
	}
	Utils.inherits(XDRRequest, XHRRequest);

   /**
	* References:
	* http://ajaxian.com/archives/100-line-ajax-wrapper
	* http://msdn.microsoft.com/en-us/library/cc288060(v=VS.85).aspx
	*/
	XDRRequest.prototype.exec = function() {
		var timeout = (this.requestMode == REQ_SEND) ? Defaults.sendTimeout : Defaults.recvTimeout,
			timer = this.timer = setTimeout(function() { xhr.abort(); }, timeout),
			body = this.body,
			method = body ? 'POST' : 'GET',
			xhr = this.xhr = new XDomainRequest(),
			self = this;

		if(body)
			if(typeof(body) == 'object') body = JSON.stringify(body);

		var onerror = xhr.onerror = function() {
			Logger.logAction(Logger.LOG_ERROR, 'Request.onerror()', '');
			var err = new Error('Error response');
			err.statusCode = 400;
			err.code = 80000;
			self.complete(err);
		};
		xhr.onabort = function() {
			Logger.logAction(Logger.LOG_ERROR, 'Request.onabort()', '');
			var err = new Error('Request cancelled');
			err.statusCode = 400;
			onerror(err);
		};
		xhr.ontimeout = function() {
			Logger.logAction(Logger.LOG_ERROR, 'Request.timeout()', '');
			var err = new Error('Request timed out');
			err.statusCode = 408;
			onerror(err);
		};

		var streaming,
			statusCode,
			responseBody,
			streamPos = 0;

		function onResponse() {
			clearTimeout(timer);
			responseBody = xhr.responseText;
			//Logger.logAction(Logger.LOG_MICRO, 'onResponse: ', responseBody);
			if(responseBody) {
				var idx = responseBody.length - 1;
				if(responseBody[idx] == '\n' || (idx = responseBody.indexOf('\n') > -1)) {
					var chunk = responseBody.slice(0, idx);
					try {
						chunk = JSON.parse(chunk);
						var err = chunk.error;
						if(err) {
							statusCode = err.statusCode || 500;
							self.complete(err);
						} else {
							statusCode = responseBody ? 201 : 200;
							streaming = (self.requestMode == REQ_RECV_STREAM);
							if(streaming) {
								streamPos = idx;
								if(!Utils.isEmpty(chunk)) {
									self.emit('data', chunk);
								}
							}
						}
					} catch(e) {
						err = new Error('Malformed response body from server: ' + e.message);
						err.statusCode = 400;
						self.complete(err);
						return;
					}
				}
			}
		}

		function onEnd() {
			try {
				responseBody = xhr.responseText;
				//Logger.logAction(Logger.LOG_MICRO, 'onEnd: ', responseBody);
				if(!responseBody || !responseBody.length) {
					if(status != 204) {
						err = new Error('Incomplete response body from server');
						err.statusCode = 400;
						self.complete(err);
					}
					return;
				}
				responseBody = JSON.parse(String(responseBody));
			} catch(e) {
				var err = new Error('Malformed response body from server: ' + e.message);
				err.statusCode = 400;
				self.complete(err);
				return;
			}
			self.complete(null, responseBody);
		}

		function onProgress() {
			responseBody = xhr.responseText;
			//Logger.logAction(Logger.LOG_MICRO, 'onProgress: ', responseBody);
			var bodyEnd = responseBody.length - 1, idx, chunk;
			while((streamPos < bodyEnd) && (idx = responseBody.indexOf('\n', streamPos)) > -1) {
				chunk = responseBody.slice(streamPos, idx);
				streamPos = idx + 1;
				onChunk(chunk);
			}
		}

		function onChunk(chunk) {
			try {
				chunk = JSON.parse(chunk);
			} catch(e) {
				err = new Error('Malformed response body from server: ' + e.message);
				err.statusCode = 400;
				self.complete(err);
				return;
			}
			self.emit('data', chunk);
		}

		function onStreamEnd() {
			onProgress();
			self.streamComplete = true;
			Utils.nextTick(function() {
				self.complete();
			});
		}

		xhr.onprogress = function() {
			if(statusCode === undefined)
				onResponse();
			else if(streaming)
				onProgress();
		};

		xhr.onload = function() {
			if(statusCode === undefined) {
				onResponse();
				if(self.requestComplete)
					return;
			}
			if(streaming)
				onStreamEnd();
			else
				onEnd();
		};

		try {
			xhr.open(method, this.uri);
			xhr.send(body);
		} catch(e) {
			Logger.logAction(Logger.LOG_ERROR, 'Request.onStreamEnd()', 'Unexpected send exception; err = ' + e);
			onerror(e);
		}
	};

	XDRRequest.prototype.dispose = function() {
		var xhr = this.xhr;
		if(xhr) {
			xhr.onprogress = xhr.onload = xhr.onerror = xhr.onabort = xhr.ontimeout = noop;
			this.xhr = null;
			var timer = this.timer;
			if(timer) {
				clearTimeout(timer);
				this.timer = null;
			}
			if(!this.requestComplete)
				xhr.abort();
		}
		delete pendingRequests[this.id];
	};

	var isAvailable = XHRRequest.isAvailable();
	if(isAvailable) {
		DomEvent.addUnloadListener(clearPendingRequests);
		if(typeof(Http) !== 'undefined') {
			Http.supportsAuthHeaders = xhrSupported;
			Http.Request = function(uri, headers, params, body, format, callback) {
				var req = createRequest(uri, headers, params, body, REQ_SEND);
				req.once('complete', callback);
				req.exec();
				return req;
			};
		}
	}

	return XHRRequest;
})();

var XHRTransport = (function() {

	/* public constructor */
	function XHRTransport(connectionManager, auth, params) {
		CometTransport.call(this, connectionManager, auth, params);
	}
	Utils.inherits(XHRTransport, CometTransport);

	XHRTransport.isAvailable = XHRRequest.isAvailable;

	XHRTransport.checkConnectivity = function(callback) {
		Http.request('http://internet-up.ably.io.s3-website-us-east-1.amazonaws.com/is-the-internet-up.txt', null, null, null, false, function(err, responseText) {
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

	XHRTransport.prototype.toString = function() {
		return 'XHRTransport; uri=' + this.baseUri + '; isConnected=' + this.isConnected;
	};

	XHRTransport.prototype.createRequest = XHRRequest.createRequest;

	if(typeof(ConnectionManager) !== 'undefined' && XHRTransport.isAvailable()) {
		ConnectionManager.httpTransports['xhr'] = ConnectionManager.transports['xhr'] = XHRTransport;
	}

	return XHRTransport;
})();

var IframeTransport = (function() {
	var origin = location.origin || location.protocol + "//" + location.hostname + (location.port ? ':' + location.port: '');

	/* public constructor */
	function IframeTransport(connectionManager, auth, params) {
		params.binary = false;
		Transport.call(this, connectionManager, auth, params);
		this.wrapIframe = null;
		this.wrapWindow = null;
		this.destWindow = null;
		this.destOrigin = null;
	}
	Utils.inherits(IframeTransport, Transport);

	IframeTransport.isAvailable = function() {
		return (window.postMessage !== undefined);
	};

	if(IframeTransport.isAvailable())
		ConnectionManager.httpTransports['iframe'] = ConnectionManager.transports['iframe'] = IframeTransport;

	IframeTransport.tryConnect = function(connectionManager, auth, params, callback) {
		var transport = new IframeTransport(connectionManager, auth, params);
		var errorCb = callback;
		transport.on('iferror', errorCb);
		transport.on('ifopen', function() {
			Logger.logAction(Logger.LOG_MINOR, 'IframeTransport.tryConnect()', 'viable transport ' + transport);
			transport.off('iferror', errorCb);
			callback(null, transport);
		});
		transport.connect();
	};

	IframeTransport.prototype.toString = function() {
		return 'IframeTransport; uri=' + this.uri;
	};

	IframeTransport.prototype.connect = function() {
		Logger.logAction(Logger.LOG_MINOR, 'IframeTransport.connect()', 'starting');
		Transport.prototype.connect.call(this);
		var self = this;

		this.auth.getAuthParams(function(err, authParams) {
			if(err) {
				self.abort(err);
				return;
			}
			var connectParams = self.params.getConnectParams(authParams);
			connectParams.origin = origin;
			self.createIframe(connectParams, function(err) {
				if(err) {
					self.emit('iferror', err);
					return;
				}
				self.emit('ifopen');
			});
		});
	};

	IframeTransport.prototype.send = function(message) {
		var destWindow = this.destWindow;
		if(destWindow)
			destWindow.postMessage(JSON.stringify(message), this.destOrigin);
	};

	IframeTransport.prototype.createIframe = function(params, callback) {
		var wrapIframe = this.wrapIframe = document.createElement('iframe'),
			options = this.params.options,
			destOrigin = this.destOrigin = 'https://' + Defaults.getHost(options) + ':' + Defaults.getPort(options, true),
			destUri = destOrigin + '/static/iframe.html' + Utils.toQueryString(params),
			iframeComplete = false,
			wrapWindow = null,
			self = this;

		Logger.logAction(Logger.LOG_MINOR, 'IframeTransport.createIframe()', 'destUri: ' + destUri);
		DomEvent.addUnloadListener(clearIframe);

		function clearIframe() {
			self.dispose();
		}

		function onload() {
			self.destWindow = wrapWindow.destWindow;
			DomEvent.addMessageListener(wrapWindow, self.messageListener = messageListener);
			iframeComplete = true;
			callback(null, wrapIframe);
		};

		function onerror(e) {
			clearIframe();
			if(!iframeComplete) {
				iframeComplete = true;
				e = e || new Error('Unknown error loading iframe');
				callback(e);
			}
		};

		function messageListener(ev) {
			self.onData(ev.data);
		};

		wrapIframe.style.display = 'none';
		wrapIframe.style.position = 'absolute';
		wrapIframe.onerror = onerror;

		DomEvent.addListener(wrapIframe, 'load', (self.onloadListener = onload));
		document.body.appendChild(wrapIframe);
		wrapWindow = self.wrapWindow = wrapIframe.contentWindow;

		var wrapDocument = wrapWindow.document;
		wrapDocument.open();
		wrapDocument.write(wrapIframeContent(destUri));
		wrapDocument.close();
	};

	IframeTransport.prototype.onData = function(data) {
		Logger.logAction(Logger.LOG_MICRO, 'IframeTransport.onData()', 'length = ' + data.length);
		try {
			var items = JSON.parse(String(data));
			if(items && items.length)
				for(var i = 0; i < items.length; i++)
					this.onChannelMessage(items[i]);
		} catch (e) {
			Logger.logAction(Logger.LOG_ERROR, 'IframeTransport.onData()', 'Unexpected exception handing channel event: ' + e);
		}
	};

	IframeTransport.prototype.dispose = function() {
		Logger.logAction(Logger.LOG_MICRO, 'IframeTransport.dispose()', '');

		var messageListener = this.messageListener;
		if(messageListener) {
			DomEvent.removeMessageListener(this.wrapWindow, messageListener);
			this.messageListener = null;
		}

		var wrapIframe = this.wrapIframe;
		if(wrapIframe) {
			var onloadListener = this.onloadListener;
			if(onloadListener)
				DomEvent.removeListener(wrapIframe, 'load', onloadListener);

			wrapIframe.onerror = null;
			this.wrapIframe = null;
			/* This timeout makes chrome fire onbeforeunload event
			 * within iframe. Without the timeout it goes straight to
			 * addUnloadListener. */
			setTimeout(function() {
				wrapIframe.parentNode.removeChild(wrapIframe);
			}, 0);
		}
	};

	function wrapIframeContent(src) {
		return '<!DOCTYPE html>\n'
			+	'<html>\n'
			+	'  <head>\n'
			+	'    <script type="text/javascript">\n'
			+	'    var destWindow;\n'
			+	'    function onIframeLoaded() {\n'
			+	'      destWindow = document.getElementById("dest").contentWindow;\n'
			+	'    }\n'
			+	'    </script>\n'
			+	'  </head>\n'
			+	'  <body>\n'
			+	'    <iframe id="dest" src="' + src + '" onload="onIframeLoaded();">\n'
			+	'    </iframe>\n'
			+	'  </body>\n'
			+	'</html>\n';
	}

	return IframeTransport;
})();

window.Ably.Realtime = Realtime;
Realtime.ConnectionManager = ConnectionManager;
Realtime.Crypto = Crypto;
Rest.Crypto = Crypto;
})();
