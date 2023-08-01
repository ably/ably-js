'use strict';
import Logger from '../../../../common/lib/util/logger';
import crypto from 'crypto';
import ErrorInfo from '../../../../common/lib/types/errorinfo';
import * as API from '../../../../../ably';
import ICryptoStatic, { IGetCipherParams } from '../../../../common/types/ICryptoStatic';
import ICipher from '../../../../common/types/ICipher';
import { CryptoDataTypes } from '../../../../common/types/cryptoDataTypes';
import { Cipher as NodeCipher, CipherKey as NodeCipherKey } from 'crypto';
import BufferUtils, { Bufferlike, Output as BufferUtilsOutput } from './bufferutils';

// The type to which ably-forks/msgpack-js deserializes elements of the `bin` or `ext` type
type MessagePackBinaryType = Buffer;

type IV = CryptoDataTypes.IV<BufferUtilsOutput>;
type InputPlaintext = CryptoDataTypes.InputPlaintext<Bufferlike, BufferUtilsOutput>;
type OutputCiphertext = Buffer;
type InputCiphertext = CryptoDataTypes.InputCiphertext<MessagePackBinaryType, BufferUtilsOutput>;
type OutputPlaintext = Buffer;

var createCryptoClass = function (bufferUtils: typeof BufferUtils) {
  var DEFAULT_ALGORITHM = 'aes';
  var DEFAULT_KEYLENGTH = 256; // bits
  var DEFAULT_MODE = 'cbc';
  var DEFAULT_BLOCKLENGTH = 16; // bytes

  /**
   * Internal: generate a buffer of secure random bytes of the given length
   * @param bytes
   * @param callback (optional)
   */
  function generateRandom(bytes: number): Buffer;
  function generateRandom(bytes: number, callback: (err: Error | null, buf: Buffer) => void): void;
  function generateRandom(bytes: number, callback?: (err: Error | null, buf: Buffer) => void) {
    return callback === undefined ? crypto.randomBytes(bytes) : crypto.randomBytes(bytes, callback);
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
  function filledBuffer(length: number, value: number) {
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
  function toBuffer(bufferOrString: Buffer | string) {
    return typeof bufferOrString == 'string' ? Buffer.from(bufferOrString, 'binary') : bufferOrString;
  }

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
  class CipherParams implements API.Types.CipherParams {
    algorithm: string;
    keyLength: number;
    mode: string;
    key: NodeCipherKey;
    iv: unknown;

    constructor(algorithm: string, keyLength: number, mode: string, key: NodeCipherKey) {
      this.algorithm = algorithm;
      this.keyLength = keyLength;
      this.mode = mode;
      this.key = key;
      this.iv = null;
    }
  }

  function isInstCipherParams(
    params: API.Types.CipherParams | API.Types.CipherParamOptions
  ): params is API.Types.CipherParams {
    /* In node, can't use instanceof CipherParams due to the vm context problem (see
     * https://github.com/nwjs/nw.js/wiki/Differences-of-JavaScript-contexts).
     * So just test for presence of all necessary attributes */
    return !!(params.algorithm && params.key && params.keyLength && params.mode);
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
      var key: NodeCipherKey;

      if (!params.key) {
        throw new Error('Crypto.getDefaultParams: a key is required');
      }

      if (typeof params.key === 'string') {
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
     * default keyLength if none supplied) as a Buffer
     * @param keyLength (optional) the required keyLength in bits
     * @param callback (optional) (err, key)
     */
    static async generateRandomKey(keyLength?: number): Promise<API.Types.CipherKey> {
      return new Promise((resolve, reject) => {
        generateRandom((keyLength || DEFAULT_KEYLENGTH) / 8, function (err, buf) {
          if (err) {
            const errorInfo = new ErrorInfo('Failed to generate random key: ' + err.message, 500, 50000, err);
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
      var cipherParams = isInstCipherParams(params) ? (params as CipherParams) : this.getDefaultParams(params);

      var iv = params.iv || generateRandom(DEFAULT_BLOCKLENGTH);
      return {
        cipherParams: cipherParams,
        cipher: new CBCCipher(cipherParams, iv),
      };
    }
  }

  Crypto satisfies ICryptoStatic<IV, InputPlaintext, OutputCiphertext, InputCiphertext, OutputPlaintext>;

  class CBCCipher implements ICipher<InputPlaintext, OutputCiphertext, InputCiphertext, OutputPlaintext> {
    algorithm: string;
    key: NodeCipherKey;
    iv: Buffer | null;
    encryptCipher: NodeCipher;
    blockLength: number;

    constructor(params: CipherParams, iv: Buffer) {
      this.algorithm = params.algorithm + '-' + String(params.keyLength) + '-' + params.mode;
      this.key = params.key;
      this.iv = iv;
      this.encryptCipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
      this.blockLength = this.iv.length;
    }

    encrypt(plaintext: InputPlaintext, callback: (error: Error | null, data: OutputCiphertext | null) => void) {
      Logger.logAction(Logger.LOG_MICRO, 'CBCCipher.encrypt()', '');
      var plaintextBuffer = bufferUtils.toBuffer(plaintext);
      var plaintextLength = plaintextBuffer.length,
        paddedLength = getPaddedLength(plaintextLength),
        iv = this.getIv();
      var cipherOut = this.encryptCipher.update(
        Buffer.concat([plaintextBuffer, pkcs5Padding[paddedLength - plaintextLength]])
      );
      var ciphertext = Buffer.concat([iv, toBuffer(cipherOut)]);
      return callback(null, ciphertext);
    }

    async decrypt(ciphertext: InputCiphertext): Promise<OutputPlaintext> {
      var blockLength = this.blockLength,
        decryptCipher = crypto.createDecipheriv(this.algorithm, this.key, ciphertext.slice(0, blockLength)),
        plaintext = toBuffer(decryptCipher.update(ciphertext.slice(blockLength))),
        final = decryptCipher.final();
      if (final && final.length) plaintext = Buffer.concat([plaintext, toBuffer(final)]);
      return plaintext;
    }

    getIv() {
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
    }
  }

  return Crypto;
};

export { createCryptoClass };
