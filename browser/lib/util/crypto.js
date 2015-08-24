var Crypto = (function() {
	var DEFAULT_ALGORITHM = 'aes';
	var DEFAULT_KEYLENGTH = 128; // bits
	var DEFAULT_BLOCKLENGTH = 16; // bytes
	var DEFAULT_BLOCKLENGTH_WORDS = 4; // 32-bit words
	var VAL32 = 0x100000000;
	var WordArray = CryptoJS.lib.WordArray;

	/**
	 * Internal: generate an array of secure random words corresponding to the given length of bytes
	 * @param bytes
	 * @param callback
	 */
	var generateRandom;
	var browsercrypto = window.crypto || window.msCrypto; // mscrypto for IE11
	if(window.Uint32Array && browsercrypto && browsercrypto.getRandomValues) {
		var blockRandomArray = new Uint32Array(DEFAULT_BLOCKLENGTH_WORDS);
		generateRandom = function(bytes, callback) {
			var words = bytes / 4, nativeArray = (words == DEFAULT_BLOCKLENGTH_WORDS) ? blockRandomArray : new Uint32Array(words);
			browsercrypto.getRandomValues(nativeArray);
			callback(null, BufferUtils.toWordArray(nativeArray));
		};
	} else {
		generateRandom = function(bytes, callback) {
			console.log('Ably.Crypto.generateRandom(): WARNING: using insecure Math.random() to generate key or iv; see http://ably.io/documentation for how to fix this');
			var words = bytes / 4, array = new Array(words);
			for(var i = 0; i < words; i++)
				array[i] = Math.floor(Math.random() * VAL32);

			callback(null, WordArray.create(array));
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
	var emptyBlock = WordArray.create([0,0,0,0]);

	/**
	 * Internal: obtain the pkcs5 padding string for a given padded length;
	 */
	var pkcs5Padding = [
		WordArray.create([0x10101010,0x10101010,0x10101010,0x10101010], 16),
		WordArray.create([0x01000000], 1),
		WordArray.create([0x02020000], 2),
		WordArray.create([0x03030300], 3),
		WordArray.create([0x04040404], 4),
		WordArray.create([0x05050505,0x05000000], 5),
		WordArray.create([0x06060606,0x06060000], 6),
		WordArray.create([0x07070707,0x07070700], 7),
		WordArray.create([0x08080808,0x08080808], 8),
		WordArray.create([0x09090909,0x09090909,0x09000000], 9),
		WordArray.create([0x0a0a0a0a,0x0a0a0a0a,0x0a0a0000], 10),
		WordArray.create([0x0b0b0b0b,0x0b0b0b0b,0x0b0b0b00], 11),
		WordArray.create([0x0c0c0c0c,0x0c0c0c0c,0x0c0c0c0c], 12),
		WordArray.create([0x0d0d0d0d,0x0d0d0d0d,0x0d0d0d0d,0x0d000000], 13),
		WordArray.create([0x0e0e0e0e,0x0e0e0e0e,0x0e0e0e0e,0x0e0e0000], 14),
		WordArray.create([0x0f0f0f0f,0x0f0f0f0f,0x0f0f0f0f,0x0f0f0f0f], 15),
		WordArray.create([0x10101010,0x10101010,0x10101010,0x10101010], 16)
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
	 * @param key (optional) ArrayBuffer, Array, WordArray or base64 string, containing key
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
		if (typeof(key) === 'string')
			key = CryptoJS.enc.Hex.parse(key);
		else
			key = BufferUtils.toWordArray(key);   // Expect key to be an Array, ArrayBuffer, or WordArray at this point

		var params = new CipherParams();
		params.algorithm = DEFAULT_ALGORITHM + '-' + String(key.words.length * (4 * 8));
		params.key = key;
		generateRandom(DEFAULT_BLOCKLENGTH, function(err, buf) {
			params.iv = buf;
			callback(null, params);
		});
	};

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
		this.algorithm = params.algorithm + '-cbc';
		var cjsAlgorithm = this.cjsAlgorithm = params.algorithm.toUpperCase().replace(/-\d+$/, '');
		var key = this.key = BufferUtils.toWordArray(params.key);
		var iv = this.iv = BufferUtils.toWordArray(params.iv);
		this.encryptCipher = CryptoJS.algo[cjsAlgorithm].createEncryptor(key, { iv: iv });
		this.blockLengthWords = iv.words.length;
	}

	CBCCipher.prototype.encrypt = function(plaintext) {
		Logger.logAction(Logger.LOG_MICRO, 'CBCCipher.encrypt()', '');
		plaintext = BufferUtils.toWordArray(plaintext);
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
		ciphertext = BufferUtils.toWordArray(ciphertext);
		//console.log('decrypt: ciphertext:');
		//console.log(CryptoJS.enc.Hex.stringify(ciphertext));
		var blockLengthWords = this.blockLengthWords,
			ciphertextWords = ciphertext.words,
			iv = WordArray.create(ciphertextWords.slice(0, blockLengthWords)),
			ciphertextBody = WordArray.create(ciphertextWords.slice(blockLengthWords));

		var decryptCipher = CryptoJS.algo[this.cjsAlgorithm].createDecryptor(this.key, { iv: iv });
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

	return Crypto;
})();