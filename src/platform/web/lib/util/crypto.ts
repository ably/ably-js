import WordArray from 'crypto-js/build/lib-typedarrays';
import CryptoJS from 'crypto-js/build';
import Logger from '../../../../common/lib/util/logger';
import ErrorInfo from 'common/lib/types/errorinfo';
import * as API from '../../../../../ably';
import ICrypto, { IGetCipherParams } from '../../../../common/types/ICrypto';
import ICipher from '../../../../common/types/ICipher';
import { CryptoDataTypes } from '../../../../common/types/cryptoDataTypes';
import BufferUtils, { Bufferlike, Output as BufferUtilsOutput } from './bufferutils';
import { IPlatformConfig } from 'common/types/IPlatformConfig';

// The type to which ./msgpack.ts deserializes elements of the `bin` or `ext` type
type MessagePackBinaryType = ArrayBuffer;

type IV = CryptoDataTypes.IV<BufferUtilsOutput>;
// TODO should Bufferlike be https://www.w3.org/TR/WebIDL-1/#common-BufferSource ?
type InputPlaintext = CryptoDataTypes.InputPlaintext<Bufferlike, BufferUtilsOutput>;
type OutputCiphertext = ArrayBuffer;
type InputCiphertext = CryptoDataTypes.InputCiphertext<MessagePackBinaryType, BufferUtilsOutput>;
type OutputPlaintext = ArrayBuffer;

var CryptoFactory = function (config: IPlatformConfig, bufferUtils: typeof BufferUtils) {
  var DEFAULT_ALGORITHM = 'aes';
  var DEFAULT_KEYLENGTH = 256; // bits
  var DEFAULT_MODE = 'cbc';
  var DEFAULT_BLOCKLENGTH = 16; // bytes
  var DEFAULT_BLOCKLENGTH_WORDS = 4; // 32-bit words
  var UINT32_SUP = 0x100000000;
  var INT32_SUP = 0x80000000;

  /**
   * Internal: generate an array of secure random words corresponding to the given length of bytes
   * @param bytes
   * @param callback
   */
  var generateRandom: (byteLength: number, callback: (error: Error | null, result: WordArray | null) => void) => void;
  if (config.getRandomArrayBuffer) {
    generateRandom = (byteLength, callback) => {
      config.getRandomArrayBuffer!(byteLength, (error, result) => {
        callback(error, result ? bufferUtils.toWordArray(result) : null);
      });
    };
  } else if (typeof Uint32Array !== 'undefined' && config.getRandomValues) {
    var blockRandomArray = new Uint32Array(DEFAULT_BLOCKLENGTH_WORDS);
    generateRandom = function (bytes, callback) {
      var words = bytes / 4,
        nativeArray = words == DEFAULT_BLOCKLENGTH_WORDS ? blockRandomArray : new Uint32Array(words);
      config.getRandomValues!(nativeArray, function (err) {
        if (typeof callback !== 'undefined') {
          callback(err, bufferUtils.toWordArray(nativeArray));
        }
      });
    };
  } else {
    generateRandom = function (bytes, callback) {
      Logger.logAction(
        Logger.LOG_MAJOR,
        'Ably.Crypto.generateRandom()',
        'Warning: the browser you are using does not support secure cryptographically secure randomness generation; falling back to insecure Math.random()'
      );
      var words = bytes / 4,
        array = new Array(words);
      for (var i = 0; i < words; i++) {
        /* cryptojs wordarrays use signed ints. When WordArray.create is fed a
         * Uint32Array unsigned are converted to signed automatically, but when
         * fed a normal array they aren't, so need to do so ourselves by
         * subtracting INT32_SUP */
        array[i] = Math.floor(Math.random() * UINT32_SUP) - INT32_SUP;
      }

      callback(null, WordArray.create(array));
    };
  }

  /**
   * Internal: calculate the padded length of a given plaintext
   * using PKCS5.
   * @param plaintextLength
   * @return
   */
  function getPaddedLength(plaintextLength: number) {
    return (plaintextLength + DEFAULT_BLOCKLENGTH) & -DEFAULT_BLOCKLENGTH;
  }

  /**
   * Internal: checks that the cipherParams are a valid combination. Currently
   * just checks that the calculated keyLength is a valid one for aes-cbc
   */
  function validateCipherParams(params: API.Types.CipherParams) {
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

  function normaliseBase64(string: string) {
    /* url-safe base64 strings use _ and - instread of / and + */
    return string.replace('_', '/').replace('-', '+');
  }

  /**
   * Internal: obtain the pkcs5 padding string for a given padded length;
   */
  var pkcs5Padding = [
    WordArray.create([0x10101010, 0x10101010, 0x10101010, 0x10101010], 16),
    WordArray.create([0x01000000], 1),
    WordArray.create([0x02020000], 2),
    WordArray.create([0x03030300], 3),
    WordArray.create([0x04040404], 4),
    WordArray.create([0x05050505, 0x05000000], 5),
    WordArray.create([0x06060606, 0x06060000], 6),
    WordArray.create([0x07070707, 0x07070700], 7),
    WordArray.create([0x08080808, 0x08080808], 8),
    WordArray.create([0x09090909, 0x09090909, 0x09000000], 9),
    WordArray.create([0x0a0a0a0a, 0x0a0a0a0a, 0x0a0a0000], 10),
    WordArray.create([0x0b0b0b0b, 0x0b0b0b0b, 0x0b0b0b00], 11),
    WordArray.create([0x0c0c0c0c, 0x0c0c0c0c, 0x0c0c0c0c], 12),
    WordArray.create([0x0d0d0d0d, 0x0d0d0d0d, 0x0d0d0d0d, 0x0d000000], 13),
    WordArray.create([0x0e0e0e0e, 0x0e0e0e0e, 0x0e0e0e0e, 0x0e0e0000], 14),
    WordArray.create([0x0f0f0f0f, 0x0f0f0f0f, 0x0f0f0f0f, 0x0f0f0f0f], 15),
    WordArray.create([0x10101010, 0x10101010, 0x10101010, 0x10101010], 16),
  ];

  function isCipherParams(
    params: API.Types.CipherParams | API.Types.CipherParamOptions
  ): params is API.Types.CipherParams {
    // Although API.Types.CipherParams is an interface, the documentation for its `key` property makes it clear that the only valid way to form one is by using getDefaultParams. The implementation of getDefaultParams returns an instance of CipherParams.
    return params instanceof CipherParams;
  }

  /**
   * A class encapsulating the client-specifiable parameters for
   * the cipher.
   *
   * algorithm is the name of the algorithm in the default system provider,
   * or the lower-cased version of it; eg "aes" or "AES".
   *
   * Clients are recommended to not call this directly, but instead to use the
   * Crypto.getDefaultParams helper, which will fill in any fields not supplied
   * with default values and validation the result.
   */
  class CipherParams implements API.Types.CipherParams {
    algorithm: string;
    keyLength: number;
    mode: string;
    key: Bufferlike;

    constructor(algorithm: string, keyLength: number, mode: string, key: Bufferlike) {
      this.algorithm = algorithm;
      this.keyLength = keyLength;
      this.mode = mode;
      this.key = key;
    }
  }

  /**
   * Utility classes and interfaces for message payload encryption.
   *
   * This class supports AES/CBC/PKCS5 with a default keylength of 128 bits
   * but supporting other keylengths. Other algorithms and chaining modes are
   * not supported directly, but supportable by extending/implementing the base
   * classes and interfaces here.
   *-
   * Secure random data for creation of Initialization Vectors (IVs) and keys
   * is obtained from window.crypto.getRandomValues if available, or from
   * Math.random() if not. Clients who do not want to depend on Math.random()
   * should polyfill window.crypto.getRandomValues with a library that seeds
   * a PRNG with real entropy.
   *
   * Each message payload is encrypted with an IV in CBC mode, and the IV is
   * concatenated with the resulting raw ciphertext to construct the "ciphertext"
   * data passed to the recipient.
   */
  class Crypto implements ICrypto<IV, InputPlaintext, OutputCiphertext, InputCiphertext, OutputPlaintext> {
    CipherParams = CipherParams;

    /**
     * Obtain a complete CipherParams instance from the provided params, filling
     * in any not provided with default values, calculating a keyLength from
     * the supplied key, and validating the result.
     * @param params an object containing at a minimum a `key` key with value the
     * key, as either a binary (ArrayBuffer, Array, WordArray) or a
     * base64-encoded string. May optionally also contain: algorithm (defaults to
     * AES), mode (defaults to 'cbc')
     */
    getDefaultParams(params: API.Types.CipherParamOptions) {
      var key: Bufferlike;

      if (!params.key) {
        throw new Error('Crypto.getDefaultParams: a key is required');
      }

      if (typeof params.key === 'string') {
        key = bufferUtils.base64Decode(normaliseBase64(params.key));
      } else {
        key = params.key;
      }

      var algorithm = params.algorithm || DEFAULT_ALGORITHM;
      var keyLength = bufferUtils.byteLength(key) * 8;
      var mode = params.mode || DEFAULT_MODE;
      var cipherParams = new CipherParams(algorithm, keyLength, mode, key);

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
    }

    /**
     * Generate a random encryption key from the supplied keylength (or the
     * default keyLength if none supplied) as a CryptoJS WordArray
     * @param keyLength (optional) the required keyLength in bits
     * @param callback (optional) (err, key)
     */
    generateRandomKey(keyLength?: number, callback?: API.Types.StandardCallback<API.Types.CipherKey>) {
      if (arguments.length == 1 && typeof keyLength == 'function') {
        callback = keyLength;
        keyLength = undefined;
      }

      generateRandom((keyLength || DEFAULT_KEYLENGTH) / 8, function (err, buf) {
        if (callback !== undefined) {
          callback(err ? ErrorInfo.fromValues(err) : null, buf);
        }
      });
    }

    /**
     * Internal; get a ChannelCipher instance based on the given cipherParams
     * @param params either a CipherParams instance or some subset of its
     * fields that includes a key
     */
    getCipher(params: IGetCipherParams<IV>) {
      var cipherParams = isCipherParams(params) ? (params as CipherParams) : this.getDefaultParams(params);

      return {
        cipherParams: cipherParams,
        cipher: new CBCCipher(cipherParams, DEFAULT_BLOCKLENGTH_WORDS, params.iv ?? null),
      };
    }
  }

  class CBCCipher implements ICipher<InputPlaintext, OutputCiphertext, InputCiphertext, OutputPlaintext> {
    algorithm: string;
    cjsAlgorithm: 'AES';
    key: WordArray;
    iv: WordArray | null;
    blockLengthWords: number;
    encryptCipher: ReturnType<typeof CryptoJS.algo.AES.createEncryptor> | null;

    constructor(params: CipherParams, blockLengthWords: number, iv: IV | null) {
      this.algorithm = params.algorithm + '-' + String(params.keyLength) + '-' + params.mode;
      const cjsAlgorithm = params.algorithm.toUpperCase().replace(/-\d+$/, '');
      if (cjsAlgorithm != 'AES') {
        throw new Error('AES is the only supported encryption algorithm');
      }
      this.cjsAlgorithm = cjsAlgorithm;
      this.key = bufferUtils.isWordArray(params.key) ? params.key : bufferUtils.toWordArray(params.key);
      this.iv = iv ? bufferUtils.toWordArray(iv).clone() : null;
      this.blockLengthWords = blockLengthWords;
      this.encryptCipher = null;
    }

    encrypt(plaintext: InputPlaintext, callback: (error: Error | null, data: OutputPlaintext | null) => void) {
      Logger.logAction(Logger.LOG_MICRO, 'CBCCipher.encrypt()', '');
      const plaintextWordArray = bufferUtils.toWordArray(plaintext);
      var plaintextLength = plaintextWordArray.sigBytes,
        paddedLength = getPaddedLength(plaintextLength),
        self = this;

      var then = function () {
        self.getIv(function (err, iv) {
          if (err) {
            callback(err, null);
            return;
          }
          var cipherOut = self.encryptCipher!.process(
            plaintextWordArray.concat(pkcs5Padding[paddedLength - plaintextLength])
          );
          var ciphertext = iv!.concat(cipherOut);
          callback(null, bufferUtils.toArrayBuffer(ciphertext));
        });
      };

      if (!this.encryptCipher) {
        if (this.iv) {
          this.encryptCipher = CryptoJS.algo[this.cjsAlgorithm].createEncryptor(this.key, { iv: this.iv });
          then();
        } else {
          generateRandom(DEFAULT_BLOCKLENGTH, function (err, iv) {
            if (err) {
              callback(err, null);
              return;
            }
            self.encryptCipher = CryptoJS.algo[self.cjsAlgorithm].createEncryptor(self.key, { iv: iv! });
            self.iv = iv;
            then();
          });
        }
      } else {
        then();
      }
    }

    // according to https://www.w3.org/TR/WebCryptoAPI/#subtlecrypto-interface we can pass data of type BufferSource, which is defined in https://www.w3.org/TR/WebIDL-1/#common-BufferSource ("used to represent objects that are either themselves an ArrayBuffer or which provide a view on to an ArrayBuffer")
    async decrypt(ciphertext: InputCiphertext): Promise<OutputPlaintext> {
      Logger.logAction(Logger.LOG_MICRO, 'CBCCipher.decrypt()', '');

      // TODO remove all of the usage of WordArray

      const ciphertextWordArray = bufferUtils.toWordArray(ciphertext);
      var blockLengthWords = this.blockLengthWords,
        ciphertextWords = ciphertextWordArray.words, // "the array of 32-bit words";
        // this gives the first blockLengthWords elements of cipherTextWords
        iv = bufferUtils.toArrayBuffer(WordArray.create(ciphertextWords.slice(0, blockLengthWords))),
        // this gives the remaining elements of cipherTextWords
        ciphertextBody = bufferUtils.toArrayBuffer(WordArray.create(ciphertextWords.slice(blockLengthWords)));

      const keyArrayBuffer = bufferUtils.toArrayBuffer(this.key);

      const cryptoKey = await crypto.subtle.importKey('raw', keyArrayBuffer, 'AES-CBC', false, ['encrypt', 'decrypt']);

      // TODO link to the mode etc passed in
      return crypto.subtle.decrypt({ name: 'AES-CBC', iv }, cryptoKey, ciphertextBody);

      /*
         TODO what was all this stuff?
      var decryptCipher = CryptoJS.algo[this.cjsAlgorithm].createDecryptor(this.key, { iv: iv });
      var plaintext = decryptCipher.process(ciphertextBody);
      var epilogue = decryptCipher.finalize();
      decryptCipher.reset();
      if (epilogue && epilogue.sigBytes) plaintext.concat(epilogue);
      return bufferUtils.toArrayBuffer(plaintext);
     */
    }

    getIv(callback: (error: Error | null, iv: WordArray | null) => void) {
      if (this.iv) {
        var iv = this.iv;
        this.iv = null;
        callback(null, iv);
        return;
      }

      /* Since the iv for a new block is the ciphertext of the last, this
       * sets a new iv (= aes(randomBlock XOR lastCipherText)) as well as
       * returning it */
      var self = this;
      generateRandom(DEFAULT_BLOCKLENGTH, function (err, randomBlock) {
        if (err) {
          callback(err, null);
          return;
        }
        callback(null, self.encryptCipher!.process(randomBlock!));
      });
    }
  }

  return new Crypto();
};

export default CryptoFactory;
