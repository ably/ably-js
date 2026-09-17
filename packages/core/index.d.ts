/**
 * `@ably/pubsub-core`: the Pub/Sub API that `@ably/pubsub-device` and `@ably/pubsub-server`
 * implement, plus the runtime classes they share with the SDKs layered on Pub/Sub.
 *
 * Applications should install `@ably/pubsub-device` or `@ably/pubsub-server` instead. This package
 * carries no client implementation.
 */
import { ErrorInfo as ApiErrorInfo } from './ably';
import type { ErrorInfoValues, IConvertibleToErrorInfo } from './build/index';

export * from './ably';

/**
 * The runtime `ErrorInfo`, of which there is exactly one copy, here, so that an error raised by
 * any Pub/Sub package or any SDK layered on it passes `instanceof ErrorInfo` against the class
 * imported from any other.
 *
 * Its instances are exactly the API's `ErrorInfo`, so an error read off a client is assignable to
 * it. It adds the factories that the SDKs layered on Pub/Sub build their own errors with.
 */
export declare class ErrorInfo extends ApiErrorInfo {
  /**
   * Builds an error an SDK is raising itself, with `code` checked against the registered Ably
   * error codes, and `href` defaulted to the code's help page.
   */
  static fromValues(values: ErrorInfoValues): ErrorInfo;

  /**
   * Builds an error out of data received from the server, whose `code` this version may not know
   * about, and so is not checked. `href` is defaulted as {@link ErrorInfo.fromValues} defaults it.
   */
  static fromWireValues(values: IConvertibleToErrorInfo): ErrorInfo;
}

// The other runtime classes. Named explicitly so that they take precedence over the star
// re-export above: the runtime `EventEmitter` class replaces the API's generic `EventEmitter`
// interface, which remains available from `@ably/pubsub-core/api`.
export { PartialErrorInfo, EventEmitter } from './build/index';
export type {
  IPartialErrorInfo,
  IConvertibleToErrorInfo,
  IConvertibleToPartialErrorInfo,
  ErrorInfoValues,
  PartialErrorInfoValues,
  EventEmitterOptions,
  ErrorCode,
} from './build/index';

// Declared as classes by the API, but implemented only by `@ably/pubsub-device` and
// `@ably/pubsub-server`. Re-exported here as types alone, so that importing one of them as a value
// from this package fails to compile rather than yielding `undefined` at runtime.
export type { Message, PresenceMessage, Annotation, Crypto } from './ably';
