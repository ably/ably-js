// Type definitions for Ably Realtime and Rest client library 1.2
// Project: https://www.ably.com/
// Definitions by: Ably <https://github.com/ably/>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

import { Types } from './types';

/**
 * A client that offers a simple stateless API to interact directly with Ably's REST API.
 */
export declare class Rest extends Types.AbstractRest {
  /**
   * Construct a client object using an Ably {@link Types.ClientOptions} object.
   *
   * @param options - A {@link Types.ClientOptions} object to configure the client connection to Ably.
   */
  constructor(options: Types.ClientOptions);
  /**
   * Constructs a client object using an Ably API key or token string.
   *
   * @param keyOrToken - The Ably API key or token string used to validate the client.
   */
  constructor(keyOrToken: string);
  /**
   * The cryptographic functions available in the library.
   */
  static Crypto: Types.Crypto;
  /**
   * Static utilities related to messages.
   */
  static Message: Types.MessageStatic;
  /**
   * Static utilities related to presence messages.
   */
  static PresenceMessage: Types.PresenceMessageStatic;
}

/**
 * A client that extends the functionality of {@link Rest} and provides additional realtime-specific features.
 */
export declare class Realtime extends Types.AbstractRealtime {
  /**
   * Construct a client object using an Ably {@link Types.ClientOptions} object.
   *
   * @param options - A {@link Types.ClientOptions} object to configure the client connection to Ably.
   */
  constructor(options: Types.ClientOptions);
  /**
   * Constructs a client object using an Ably API key or token string.
   *
   * @param keyOrToken - The Ably API key or token string used to validate the client.
   */
  constructor(keyOrToken: string);
  /**
   * The cryptographic functions available in the library.
   */
  static Crypto: Types.Crypto;
  /**
   * Static utilities related to messages.
   */
  static Message: Types.MessageStatic;
  /**
   * Static utilities related to presence messages.
   */
  static PresenceMessage: Types.PresenceMessageStatic;
}

/**
 * A generic Ably error object that contains an Ably-specific status code, and a generic status code. Errors returned from the Ably server are compatible with the `ErrorInfo` structure and should result in errors that inherit from `ErrorInfo`.
 */
export declare class ErrorInfo {
  /**
   * Ably [error code](https://github.com/ably/ably-common/blob/main/protocol/errors.json).
   */
  code: number;
  /**
   * Additional message information, where available.
   */
  message: string;
  /**
   * HTTP Status Code corresponding to this error, where applicable.
   */
  statusCode: number;
  /**
   * The underlying cause of the error, where applicable.
   */
  cause?: string | Error | ErrorInfo;

  /**
   * Construct an ErrorInfo object.
   *
   * @param message - A string describing the error.
   * @param code - Ably [error code](https://github.com/ably/ably-common/blob/main/protocol/errors.json).
   * @param statusCode - HTTP Status Code corresponding to this error.
   * @param cause - The underlying cause of the error.
   */
  constructor(message: string, code: number, statusCode: number, cause?: string | Error | ErrorInfo);
}

export { Types };
