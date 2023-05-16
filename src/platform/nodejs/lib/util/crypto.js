'use strict';
import Logger from '../../../../common/lib/util/logger';
import Platform from '../../../../common/platform';
import crypto from 'crypto';
import ErrorInfo from '../../../../common/lib/types/errorinfo';

var Crypto = (function () {
  var DEFAULT_ALGORITHM = 'aes';
  var DEFAULT_KEYLENGTH = 256; // bits
  var DEFAULT_MODE = 'cbc';
  var DEFAULT_BLOCKLENGTH = 16; // bytes

  /**
   * Internal: generate a buffer of secure random bytes of the given length
   * @param bytes
   * @param callback (optional)
   */
  function generateRandom(bytes, callback) {
    return callback === undefined ? crypto.randomBytes(bytes) : crypto.randomBytes(bytes, callback);
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
    if (params.algorithm === 'aes' && params.mode === 'cbc') {
      if (params.keyLength === 128 || params.keyLength === 256) {
        return;
      }
      throw new Error(
        'Unsupported key length ' +
          params.keyLength +
          ' for aes-cbc encryption. Encryption key must be 128 or 256 bits (16 or 32 ASCII characters)'
      );
    }
  }

  function normaliseBase64(string) {
    /* url-safe base64 strings use _ and - instread of / and + */
    return string.replace('_', '/').replace('-', '+');
  }

  /**
   * Internal: obtain the pkcs5 padding string for a given padded length;
   */
  function filledBuffer(length, value) {
    var result = Buffer.alloc(length);
    result.fill(value);
    return result;
  }
  var pkcs5Padding = [filledBuffer(16, 16)];
  for (var i = 1; i <= 16; i++) pkcs5Padding.push(filledBuffer(i, i));

  /**
   * Internal: convert a binary string to Buffer (for node 0.8.x)
   * @param bufferOrString
   * @returns {Buffer}
   */
  function toBuffer(bufferOrString) {
    return typeof bufferOrString == 'string' ? Buffer.from(bufferOrString, 'binary') : bufferOrString;
  }

  /**
   * Utility classes and interfaces for message payload encryption.
   *
   * This class supports AES/CBC/PKCS5 with a default keylength of 128 bits
   * but supporting other keylengths. Other algorithms and chaining modes are
   * not supported directly, but supportable by extending/implementing the base
   * classes and interfaces here.
   *
   * Secure random data for creation of Initialization Vectors (IVs) and keys
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
  Crypto.getDefaultParams = function (params) {
    var key;
    /* Backward compatibility */
    if (typeof params === 'function' || typeof params === 'string') {
      Logger.deprecated('Crypto.getDefaultParams(key, callback)', 'Crypto.getDefaultParams({key: key})');
      if (typeof params === 'function') {
        Crypto.generateRandomKey(function (key) {
          params(null, Crypto.getDefaultParams({ key: key }));
        });
      } else if (typeof arguments[1] === 'function') {
        arguments[1](null, Crypto.getDefaultParams({ key: params }));
      } else {
        throw new Error('Invalid arguments for Crypto.getDefaultParams');
      }
      return;
    }

    if (!params.key) {
      throw new Error('Crypto.getDefaultParams: a key is required');
    }

    if (typeof params.key === 'string') {
      key = Platform.BufferUtils.base64Decode(normaliseBase64(params.key));
    } else if (Platform.BufferUtils.isArrayBuffer(params.key)) {
      key = Buffer.from(params.key);
    } else {
      key = params.key;
    }

    var cipherParams = new CipherParams();
    cipherParams.key = key;
    cipherParams.algorithm = params.algorithm || DEFAULT_ALGORITHM;
    cipherParams.keyLength = key.length * 8;
    cipherParams.mode = params.mode || DEFAULT_MODE;

    if (params.keyLength && params.keyLength !== cipherParams.keyLength) {
      throw new Error(
        'Crypto.getDefaultParams: a keyLength of ' +
          params.keyLength +
          ' was specified, but the key actually has length ' +
          cipherParams.keyLength
      );
    }

    validateCipherParams(cipherParams);
    return cipherParams;
  };

  /**
   * Generate a random encryption key from the supplied keylength (or the
   * default keyLength if none supplied) as a Buffer
   * @param keyLength (optional) the required keyLength in bits
   * @param callback (optional) (err, key)
   */
  Crypto.generateRandomKey = function (keyLength, callback) {
    if (arguments.length == 1 && typeof keyLength == 'function') {
      callback = keyLength;
      keyLength = undefined;
    }

    generateRandom((keyLength || DEFAULT_KEYLENGTH) / 8, function (err, buf) {
      if (callback !== undefined) {
        callback(err ? ErrorInfo.fromValues(err) : null, buf);
      }
    });
  };

  /**
   * Internal; get a ChannelCipher instance based on the given cipherParams
   * @param params either a CipherParams instance or some subset of its
   * fields that includes a key
   */
  Crypto.getCipher = function (params) {
    var cipherParams = isInstCipherParams(params) ? params : Crypto.getDefaultParams(params);

    var iv = params.iv || generateRandom(DEFAULT_BLOCKLENGTH);
    return { cipherParams: cipherParams, cipher: new CBCCipher(cipherParams, iv) };
  };

  function CBCCipher(params, iv) {
    var algorithm = (this.algorithm = params.algorithm + '-' + String(params.keyLength) + '-' + params.mode);
    var key = (this.key = params.key);
    // eslint-disable-next-line no-redeclare
    var iv = (this.iv = iv);
    this.encryptCipher = crypto.createCipheriv(algorithm, key, iv);
    this.blockLength = iv.length;
  }

  CBCCipher.prototype.encrypt = function (plaintext, callback) {
    Logger.logAction(Logger.LOG_MICRO, 'CBCCipher.encrypt()', '');
    var plaintextBuffer = Platform.BufferUtils.toBuffer(plaintext);
    var plaintextLength = plaintextBuffer.length,
      paddedLength = getPaddedLength(plaintextLength),
      iv = this.getIv();
    var cipherOut = this.encryptCipher.update(
      Buffer.concat([plaintextBuffer, pkcs5Padding[paddedLength - plaintextLength]])
    );
    var ciphertext = Buffer.concat([iv, toBuffer(cipherOut)]);
    return callback(null, ciphertext);
  };

  CBCCipher.prototype.decrypt = function (ciphertext) {
    var blockLength = this.blockLength,
      decryptCipher = crypto.createDecipheriv(this.algorithm, this.key, ciphertext.slice(0, blockLength)),
      plaintext = toBuffer(decryptCipher.update(ciphertext.slice(blockLength))),
      final = decryptCipher.final();
    if (final && final.length) plaintext = Buffer.concat([plaintext, toBuffer(final)]);
    return plaintext;
  };

  CBCCipher.prototype.getIv = function () {
    if (this.iv) {
      var iv = this.iv;
      this.iv = null;
      return iv;
    }

    var randomBlock = generateRandom(DEFAULT_BLOCKLENGTH);
    /* Since the iv for a new block is the ciphertext of the last, this
     * sets a new iv (= aes(randomBlock XOR lastCipherText)) as well as
     * returning it */
    return toBuffer(this.encryptCipher.update(randomBlock));
  };

  return Crypto;
})();

export default Crypto;
