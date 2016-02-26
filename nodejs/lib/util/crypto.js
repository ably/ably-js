"use strict";
var Crypto = (function() {
	var crypto = require('crypto');
	var hexy = require('hexy');
	var util = require('util');

	var DEFAULT_ALGORITHM = 'aes';
	var DEFAULT_KEYLENGTH = 256; // bits
	var DEFAULT_MODE = 'cbc';
	var DEFAULT_BLOCKLENGTH = 16; // bytes

	/**
	 * Internal: generate a buffer of secure random bytes of the given length
	 * @param bytes
	 * @param callback
	 */
	function generateRandom(bytes, callback) {
		return crypto.randomBytes(bytes, callback);
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
	 * Internal: checks that the cipherParams are a valid combination. Currently
	 * just checks that the calculated keyLength is a valid one for aes-cbc
	 */
	function validateCipherParams(params) {
		if(params.algorithm === 'aes' && params.mode === 'cbc') {
			if(params.keyLength === 128 || params.keyLength === 256) {
				return;
			}
			throw new Error('Unsupported key length ' + params.keyLength + ' for aes-cbc encryption. Encryption key must be 128 or 256 bits (16 or 32 ASCII characters)');
		}
	}

	function normaliseBase64(string) {
		/* url-safe base64 strings use _ and - instread of / and + */
		return string.replace('_', '/').replace('-', '+');
	}

	/**
	 * Internal: a block containing zeros
	 */
	var emptyBlock = new Buffer(DEFAULT_BLOCKLENGTH);

	/**
	 * Internal: obtain the pkcs5 padding string for a given padded length;
	 */
	function filledBuffer(length, value) { var result = new Buffer(length); result.fill(value); return result; }
	var pkcs5Padding = [ filledBuffer(16, 16) ];
	for(var i = 1; i <= 16; i++) pkcs5Padding.push(filledBuffer(i, i));

	/**
	 * Internal: convert a binary string to Buffer (for node 0.8.x)
	 * @param bufferOrString
	 * @returns {Buffer}
	 */
	function toBuffer(bufferOrString) {
		return (typeof(bufferOrString) == 'string') ? new Buffer(bufferOrString, 'binary') : bufferOrString;
	}

	/**
	 * Utility classes and interfaces for message payload encryption.
	 *
	 * This class supports AES/CBC/PKCS5 with a default keylength of 128 bits
	 * but supporting other keylengths. Other algorithms and chaining modes are
	 * not supported directly, but supportable by extending/implementing the base
	 * classes and interfaces here.
	 *
	 * Secure random data for creation of Initialisation Vectors (IVs) and keys
	 * is obtained from the default system SecureRandom. Future extensions of this
	 * class might make the SecureRandom pluggable or at least seedable with
	 * client-provided entropy.
	 *
	 * Each message payload is encrypted with an IV in CBC mode, and the IV is
	 * concatenated with the resulting raw ciphertext to construct the "ciphertext"
	 * data passed to the recipient.
	 */
	function Crypto() {}

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
		this.keyLength = null;
		this.mode = null;
		this.key = null;
		this.iv = null;
	}
	Crypto.CipherParams = CipherParams;

	function isInstCipherParams(params) {
		/* In node, can't use instanceof CipherParams due to the vm context problem (see
		* https://github.com/nwjs/nw.js/wiki/Differences-of-JavaScript-contexts).
		* So just test for presence of all necessary attributes */
		return params.algorithm && params.key && params.keyLength && params.mode;
	}

	/**
	 * Obtain a complete CipherParams instance from the provided params, filling
	 * in any not provided with default values, calculating a keyLength from
	 * the supplied key, and validating the result.
	 * @param params an object containing at a minimum a `key` key with value the
	 * key, as either a binary (ArrayBuffer, Array, WordArray) or a
	 * base64-encoded string. May optionally also contain: algorithm (defaults to
	 * AES), mode (defaults to 'cbc')
	 */
	Crypto.getDefaultParams = function(params) {
		var key;
		/* Backward compatibility */
		if((typeof(params) === 'function') || (typeof(params) === 'string')) {
			Logger.deprecated('Crypto.getDefaultParams(key, callback)', 'Crypto.getDefaultParams({key: key})');
			if(typeof(params) === 'function') {
				Crypto.generateRandomKey(function(key) {
					params(null, Crypto.getDefaultParams({key: key}));
				})
			} else {
				callback = arguments[1];
				callback(null, Crypto.getDefaultParams({key: params}));
			}
			return;
		}

		if(!params.key) {
			throw new Error('Crypto.getDefaultParams: a key is required');
		}

		if (typeof(params.key) === 'string') {
			key = BufferUtils.base64Decode(normaliseBase64(params.key));
		} else {
			key = params.key;
		}

		var cipherParams = new CipherParams();
		cipherParams.key = key;
		cipherParams.algorithm = params.algorithm || DEFAULT_ALGORITHM;
		cipherParams.keyLength = key.length * 8;
		cipherParams.mode = params.mode || DEFAULT_MODE;
		validateCipherParams(cipherParams);
		return cipherParams;
	};

	/**
	 * Generate a random encryption key from the supplied keylength (or the
	 * default keyLength if none supplied) as a Buffer
	 * @param keyLength (optional) the required keyLength in bits
	 * @param callback (err, key)
	 */
	Crypto.generateRandomKey = function(keyLength, callback) {
		if(arguments.length == 1 && typeof(keyLength) == 'function') {
			callback = keyLength;
			keyLength = undefined;
		}
		generateRandom((keyLength || DEFAULT_KEYLENGTH) / 8, callback);
	};

	/**
	 * Internal; get a ChannelCipher instance based on the given cipherParams
	 * @param params either a CipherParams instance or some subset of its
	 * fields that includes a key
	 * @param callback (err, cipherParams, channelCipher)
	 */
	Crypto.getCipher = function(params, callback) {
		var cipherParams = (isInstCipherParams(params)) ?
		                   params :
		                   Crypto.getDefaultParams(params);

		if(params.iv) {
			callback(null, cipherParams, new CBCCipher(cipherParams, params.iv));
		} else {
			generateRandom(DEFAULT_BLOCKLENGTH, function(err, iv) {
				callback(null, cipherParams, new CBCCipher(cipherParams, iv));
			});
		}
	};

	function CBCCipher(params, iv) {
		var algorithm = this.algorithm = params.algorithm + '-' + String(params.keyLength) + '-' + params.mode;
		var key = this.key = params.key;
		var iv = this.iv = iv;
		var key = this.key = params.key;
		this.encryptCipher = crypto.createCipheriv(algorithm, key, iv);
		this.blockLength = iv.length;
	}

	CBCCipher.prototype.encrypt = function(plaintext) {
		Logger.logAction(Logger.LOG_MICRO, 'CBCCipher.encrypt()', '');
		//console.log('encrypt: plaintext:');
		//console.log(hexy.hexy(plaintext));
		var plaintextLength = plaintext.length,
			paddedLength = getPaddedLength(plaintextLength),
			iv = this.getIv();
		var cipherOut = this.encryptCipher.update(Buffer.concat([plaintext, pkcs5Padding[paddedLength - plaintextLength]]));
		var ciphertext = Buffer.concat([iv, toBuffer(cipherOut)]);
		//console.log('encrypt: ciphertext:');
		//console.log(hexy.hexy(ciphertext));
		return ciphertext;
	};

	CBCCipher.prototype.decrypt = function(ciphertext) {
		//console.log('decrypt: ciphertext:');
		//console.log(hexy.hexy(ciphertext));
		var blockLength = this.blockLength,
			decryptCipher = crypto.createDecipheriv(this.algorithm, this.key, ciphertext.slice(0, blockLength)),
			plaintext = toBuffer(decryptCipher.update(ciphertext.slice(blockLength))),
			final = decryptCipher.final();
		if(final && final.length)
			plaintext = Buffer.concat([plaintext, toBuffer(final)]);
		//console.log('decrypt: plaintext:');
		//console.log(hexy.hexy(plaintext));
		return plaintext;
	};

	CBCCipher.prototype.getIv = function() {
		if(!this.iv)
			return toBuffer(this.encryptCipher.update(emptyBlock));

		var result = this.iv;
		this.iv = null;
		return result;
	};

	return Crypto;
})();
