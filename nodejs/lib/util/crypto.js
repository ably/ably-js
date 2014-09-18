"use strict";
var Crypto = (function() {
	var messagetypes = require('../nodejs/lib/protocol/clientmessage_types');
	var TData = messagetypes.TData;
	var TType = messagetypes.TType;
	var crypto = require('crypto');
	var hexy = require('hexy');
	var util = require('util');

	var DEFAULT_ALGORITHM = "aes";
	var DEFAULT_KEYLENGTH = 128; // bits
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
		params.algorithm = DEFAULT_ALGORITHM + '-' + String(key.length * 8);
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
		var algorithm = this.algorithm = params.algorithm + '-cbc';
		var key = this.key = params.key;
		var iv = this.iv = params.iv;
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

	var Data = Crypto.Data = {};

	Data.asPlaintext = function(tData) {
		var result;
		switch(tData.type) {
			case TType.STRING:
			case TType.JSONOBJECT:
			case TType.JSONARRAY:
				result = new Buffer(tData.stringData);
				break;
			case TType.NONE:
			case TType.TRUE:
			case TType.FALSE:
				break;
			case TType.INT32:
				result = new Buffer(4);
				result.writeInt32BE(tData.i32Data, 0, true);
				break;
			case TType.INT64:
				result = new Buffer(8);
				result.writeInt64BE(tData.i64Data, 0, true);
				break;
			case TType.DOUBLE:
				result = new Buffer(8);
				result.writeDoubleBE(tData.doubleData, 0, true);
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
				result.i32Data = plaintext.readInt32BE(0, true);
				break;
			case TType.INT64:
				result.i64Data = plaintext.readInt64BE(0, true);
				break;
			case TType.DOUBLE:
				result.doubleData = plaintext.readDoubleBE(0, true);
				break;
			case TType.JSONOBJECT:
			case TType.JSONARRAY:
			case TType.STRING:
				result.stringData = plaintext.toString();
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
		return ciphertext.toString('base64');
	};

	Data.fromBase64 = function(encoded) {
		return new Buffer(encoded, 'base64');
	};

	return Crypto;
})();