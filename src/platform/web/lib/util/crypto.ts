import WordArray from 'crypto-js/build/lib-typedarrays';
import { parse as parseBase64 } from 'crypto-js/build/enc-base64';
import CryptoJS from 'crypto-js/build';
import Logger from '../../../../common/lib/util/logger';
import ErrorInfo from 'common/lib/types/errorinfo';
import * as API from '../../../../../ably';
import ICryptoStatic, { IGetCipherParams } from '../../../../common/types/ICryptoStatic';
import ICipher from '../../../../common/types/ICipher';
import { CryptoDataTypes } from '../../../../common/types/cryptoDataTypes';
import BufferUtils, { Bufferlike, Output as BufferUtilsOutput } from './bufferutils';
import { IPlatformConfig } from 'common/types/IPlatformConfig';

// The type to which ./msgpack.ts deserializes elements of the `bin` or `ext` type
type MessagePackBinaryType = ArrayBuffer;

type IV = CryptoDataTypes.IV<BufferUtilsOutput>;
type InputPlaintext = CryptoDataTypes.InputPlaintext<Bufferlike, BufferUtilsOutput>;
type OutputCiphertext = WordArray;
type InputCiphertext = CryptoDataTypes.InputCiphertext<MessagePackBinaryType, BufferUtilsOutput>;
type OutputPlaintext = WordArray;

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
  if (config.getRandomWordArray) {
    generateRandom = config.getRandomWordArray;
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
    key: WordArray;

    constructor(algorithm: string, keyLength: number, mode: string, key: WordArray) {
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
  class Crypto {
    static CipherParams = CipherParams;

    /**
     * Obtain a complete CipherParams instance from the provided params, filling
     * in any not provided with default values, calculating a keyLength from
     * the supplied key, and validating the result.
     * @param params an object containing at a minimum a `key` key with value the
     * key, as either a binary (ArrayBuffer, Array, WordArray) or a
     * base64-encoded string. May optionally also contain: algorithm (defaults to
     * AES), mode (defaults to 'cbc')
     */
    static getDefaultParams(params: API.Types.CipherParamOptions) {
      var key: WordArray;

      if (!params.key) {
        throw new Error('Crypto.getDefaultParams: a key is required');
      }

      if (typeof params.key === 'string') {
        key = parseBase64(normaliseBase64(params.key));
      } else {
        key = bufferUtils.toWordArray(params.key); // Expect key to be an Array, ArrayBuffer, or WordArray at this point
      }

      var algorithm = params.algorithm || DEFAULT_ALGORITHM;
      var keyLength = key.words.length * (4 * 8);
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
    static generateRandomKey(keyLength?: number, callback?: API.Types.StandardCallback<API.Types.CipherKey>) {
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
    static getCipher(params: IGetCipherParams<IV>) {
      var cipherParams = isCipherParams(params) ? (params as CipherParams) : this.getDefaultParams(params);

      return {
        cipherParams: cipherParams,
        cipher: new CBCCipher(cipherParams, DEFAULT_BLOCKLENGTH_WORDS, params.iv ?? null),
      };
    }
  }

  Crypto satisfies ICryptoStatic<IV, InputPlaintext, OutputCiphertext, InputCiphertext, OutputPlaintext>;

  // This is the only way I could think of to get a reference to the Cipher type, which doesn’t seem to be exported by CryptoJS’s type definitions file.
  type CryptoJSCipher = ReturnType<typeof CryptoJS.algo.AES.createEncryptor>;

  class CBCCipher implements ICipher<InputPlaintext, OutputCiphertext, InputCiphertext, OutputPlaintext> {
    algorithm: string;
    // All of the keys in the CryptoJS.algo namespace whose value is a CipherStatic.
    cjsAlgorithm: 'AES' | 'DES' | 'TripleDES' | 'RC4' | 'RC4Drop' | 'Rabbit' | 'RabbitLegacy';
    key: WordArray;
    iv: WordArray | null;
    blockLengthWords: number;
    encryptCipher: CryptoJSCipher | null;

    constructor(params: CipherParams, blockLengthWords: number, iv: IV | null) {
      this.algorithm = params.algorithm + '-' + String(params.keyLength) + '-' + params.mode;
      // We trust that we can handle the algorithm specified by the user — this is the same as the pre-TypeScript behaviour.
      this.cjsAlgorithm = params.algorithm.toUpperCase().replace(/-\d+$/, '') as typeof this.cjsAlgorithm;
      this.key = bufferUtils.toWordArray(params.key);
      this.iv = iv ? bufferUtils.toWordArray(iv).clone() : null;
      this.blockLengthWords = blockLengthWords;
      this.encryptCipher = null;
    }

    encrypt(plaintext: InputPlaintext, callback: (error: Error | null, data: OutputCiphertext | null) => void) {
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
          callback(null, ciphertext);
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

    decrypt(ciphertext: InputCiphertext) {
      Logger.logAction(Logger.LOG_MICRO, 'CBCCipher.decrypt()', '');
      ciphertext = bufferUtils.toWordArray(ciphertext);
      var blockLengthWords = this.blockLengthWords,
        ciphertextWords = ciphertext.words,
        iv = WordArray.create(ciphertextWords.slice(0, blockLengthWords)),
        ciphertextBody = WordArray.create(ciphertextWords.slice(blockLengthWords));

      var decryptCipher = CryptoJS.algo[this.cjsAlgorithm].createDecryptor(this.key, { iv: iv });
      var plaintext = decryptCipher.process(ciphertextBody);
      var epilogue = decryptCipher.finalize();
      decryptCipher.reset();
      if (epilogue && epilogue.sigBytes) plaintext.concat(epilogue);
      return plaintext;
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

  return Crypto;
};

export default CryptoFactory;
