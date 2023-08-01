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
type OutputCiphertext = ArrayBuffer;
type InputCiphertext = CryptoDataTypes.InputCiphertext<MessagePackBinaryType, BufferUtilsOutput>;
type OutputPlaintext = ArrayBuffer;

var createCryptoClass = function (config: IPlatformConfig, bufferUtils: typeof BufferUtils) {
  var DEFAULT_ALGORITHM = 'aes';
  var DEFAULT_KEYLENGTH = 256; // bits
  var DEFAULT_MODE = 'cbc';
  var DEFAULT_BLOCKLENGTH = 16; // bytes
  var DEFAULT_BLOCKLENGTH_WORDS = 4; // 32-bit words
  var UINT32_SUP = 0x100000000;

  /**
   * Internal: generate an array of secure random data corresponding to the given length of bytes
   * @param bytes
   * @param callback
   */
  var generateRandom: (byteLength: number, callback: (error: Error | null, result: ArrayBuffer | null) => void) => void;
  if (config.getRandomArrayBuffer) {
    generateRandom = config.getRandomArrayBuffer;
  } else if (typeof Uint32Array !== 'undefined' && config.getRandomValues) {
    var blockRandomArray = new Uint32Array(DEFAULT_BLOCKLENGTH_WORDS);
    generateRandom = function (bytes, callback) {
      var words = bytes / 4,
        nativeArray = words == DEFAULT_BLOCKLENGTH_WORDS ? blockRandomArray : new Uint32Array(words);
      config.getRandomValues!(nativeArray, function (err) {
        if (typeof callback !== 'undefined') {
          callback(err, bufferUtils.toArrayBuffer(nativeArray));
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
        array = new Uint32Array(words);
      for (var i = 0; i < words; i++) {
        array[i] = Math.floor(Math.random() * UINT32_SUP);
      }

      callback(null, bufferUtils.toArrayBuffer(array));
    };
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
    key: ArrayBuffer;

    constructor(algorithm: string, keyLength: number, mode: string, key: ArrayBuffer) {
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
     * key, as either a binary or a base64-encoded string.
     * May optionally also contain: algorithm (defaults to AES),
     * mode (defaults to 'cbc')
     */
    static getDefaultParams(params: API.Types.CipherParamOptions) {
      var key: ArrayBuffer;

      if (!params.key) {
        throw new Error('Crypto.getDefaultParams: a key is required');
      }

      if (typeof params.key === 'string') {
        key = bufferUtils.toArrayBuffer(bufferUtils.base64Decode(normaliseBase64(params.key)));
      } else if (params.key instanceof ArrayBuffer) {
        key = params.key;
      } else {
        key = bufferUtils.toArrayBuffer(params.key);
      }

      var algorithm = params.algorithm || DEFAULT_ALGORITHM;
      var keyLength = key.byteLength * 8;
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
     * default keyLength if none supplied) as an ArrayBuffer
     * @param keyLength (optional) the required keyLength in bits
     */
    static async generateRandomKey(keyLength?: number): Promise<API.Types.CipherKey> {
      return new Promise((resolve, reject) => {
        generateRandom((keyLength || DEFAULT_KEYLENGTH) / 8, function (err, buf) {
          if (err) {
            const errorInfo = new ErrorInfo('Failed to generate random key: ' + err.message, 400, 50000, err);
            reject(errorInfo);
          } else {
            resolve(buf!);
          }
        });
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
        cipher: new CBCCipher(cipherParams, params.iv ?? null),
      };
    }
  }

  Crypto satisfies ICryptoStatic<IV, InputPlaintext, OutputCiphertext, InputCiphertext, OutputPlaintext>;

  class CBCCipher implements ICipher<InputPlaintext, OutputCiphertext, InputCiphertext, OutputPlaintext> {
    algorithm: string;
    webCryptoAlgorithm: string;
    key: ArrayBuffer;
    iv: ArrayBuffer | null;

    constructor(params: CipherParams, iv: IV | null) {
      if (!crypto.subtle) {
        if (isSecureContext) {
          throw new Error(
            'Crypto operations are not possible since the browser’s SubtleCrypto class is unavailable (reason unknown).'
          );
        } else {
          throw new Error(
            'Crypto operations are is not possible since the current environment is a non-secure context and hence the browser’s SubtleCrypto class is not available.'
          );
        }
      }

      this.algorithm = params.algorithm + '-' + String(params.keyLength) + '-' + params.mode;
      this.webCryptoAlgorithm = params.algorithm + '-' + params.mode;
      this.key = bufferUtils.toArrayBuffer(params.key);
      this.iv = iv ? bufferUtils.toArrayBuffer(iv) : null;
    }

    private concat(buffer1: Bufferlike, buffer2: Bufferlike) {
      const output = new ArrayBuffer(buffer1.byteLength + buffer2.byteLength);
      const outputView = new DataView(output);

      const buffer1View = new DataView(bufferUtils.toArrayBuffer(buffer1));
      for (let i = 0; i < buffer1View.byteLength; i++) {
        outputView.setInt8(i, buffer1View.getInt8(i));
      }

      const buffer2View = new DataView(bufferUtils.toArrayBuffer(buffer2));
      for (let i = 0; i < buffer2View.byteLength; i++) {
        outputView.setInt8(buffer1View.byteLength + i, buffer2View.getInt8(i));
      }

      return output;
    }

    encrypt(plaintext: InputPlaintext, callback: (error: Error | null, data: OutputCiphertext | null) => void) {
      Logger.logAction(Logger.LOG_MICRO, 'CBCCipher.encrypt()', '');

      const encryptAsync = async () => {
        const iv = await new Promise((resolve: (iv: IV) => void, reject: (error: Error) => void) => {
          this.getIv((error, iv) => {
            if (error) {
              reject(error);
            } else {
              resolve(iv!);
            }
          });
        });

        const cryptoKey = await crypto.subtle.importKey('raw', this.key, this.webCryptoAlgorithm, false, ['encrypt']);
        const ciphertext = await crypto.subtle.encrypt({ name: this.webCryptoAlgorithm, iv }, cryptoKey, plaintext);

        return this.concat(iv, ciphertext);
      };

      encryptAsync()
        .then((ciphertext) => {
          callback(null, ciphertext);
        })
        .catch((error) => {
          callback(error, null);
        });
    }

    async decrypt(ciphertext: InputCiphertext): Promise<OutputPlaintext> {
      Logger.logAction(Logger.LOG_MICRO, 'CBCCipher.decrypt()', '');

      const ciphertextArrayBuffer = bufferUtils.toArrayBuffer(ciphertext);
      const iv = ciphertextArrayBuffer.slice(0, DEFAULT_BLOCKLENGTH);
      const ciphertextBody = ciphertextArrayBuffer.slice(DEFAULT_BLOCKLENGTH);

      const cryptoKey = await crypto.subtle.importKey('raw', this.key, this.webCryptoAlgorithm, false, ['decrypt']);
      return crypto.subtle.decrypt({ name: this.webCryptoAlgorithm, iv }, cryptoKey, ciphertextBody);
    }

    getIv(callback: (error: Error | null, iv: ArrayBuffer | null) => void) {
      if (this.iv) {
        var iv = this.iv;
        this.iv = null;
        callback(null, iv);
        return;
      }

      /* Since the iv for a new block is the ciphertext of the last, this
       * sets a new iv (= aes(randomBlock XOR lastCipherText)) as well as
       * returning it */
      generateRandom(DEFAULT_BLOCKLENGTH, function (err, randomBlock) {
        if (err) {
          callback(err, null);
          return;
        }
        callback(null, bufferUtils.toArrayBuffer(randomBlock!));
      });
    }
  }

  return Crypto;
};

export { createCryptoClass };
