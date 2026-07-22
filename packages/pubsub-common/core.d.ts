// Core shared type declarations for the Ably Pub/Sub SDK packages: auth, errors, events, pagination, batch, crypto, push data model and client options.
import type { ChannelStateChange, ConnectionStateChange } from './channels';
import type { Message, PresenceMessage } from './messages';

/**
 * HTTP Methods, used internally.
 */
declare namespace HTTPMethods {
  /**
   * Represents a HTTP POST request.
   */
  type POST = 'POST';
  /**
   * Represents a HTTP GET request.
   */
  type GET = 'GET';
}
/**
 * HTTP Methods, used internally.
 */
export type HTTPMethod = HTTPMethods.GET | HTTPMethods.POST;

/**
 * A type which specifies the valid transport names. [See here](https://faqs.ably.com/which-transports-are-supported) for more information.
 */
export type Transport = 'web_socket' | 'xhr_polling' | 'comet';

/**
 * A generic Ably error object that contains an Ably-specific status code, and a generic status code. Errors returned from the Ably server are compatible with the `ErrorInfo` structure and should result in errors that inherit from `ErrorInfo`.
 */
export interface ErrorInfo extends Error {
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
  cause?: ErrorInfo;
  /**
   * Optional map of string key-value pairs containing structured metadata associated with the error.
   */
  detail?: Record<string, string>;
  /**
   * Actionable guidance describing *how* to fix the error — distinct from
   * `message`, which summarises *what* went wrong. Written as prose suitable for an
   * agent or human to act on without further lookup (typically including the
   * canonical replacement call and a doc link where applicable). Present only on
   * SDK-originating errors that have meaningful remediation steps.
   */
  remediation?: string;
}

/**
 * The constructor signature of {@link ErrorInfo}. The constructable value itself is provided by the side packages; this package only describes its shape.
 */
export interface ErrorInfoConstructor {
  /**
   * Construct an ErrorInfo object.
   *
   * @param message - A string describing the error.
   * @param code - Ably [error code](https://github.com/ably/ably-common/blob/main/protocol/errors.json).
   * @param statusCode - HTTP Status Code corresponding to this error.
   * @param cause - The underlying cause of the error.
   * @param detail - Optional map of string key-value pairs containing structured metadata associated with the error.
   */
  new (
    message: string,
    code: number,
    statusCode: number,
    cause?: ErrorInfo,
    detail?: Record<string, string>,
  ): ErrorInfo;
}

/**
 * Passes authentication-specific properties in authentication requests to Ably. Properties set using `AuthOptions` are used instead of the default values set when the client library is instantiated, as opposed to being merged with them.
 */
export interface AuthOptions {
  /**
   * Called when a new token is required. The role of the callback is to obtain a fresh token, one of: an Ably Token string (in plain text format); a signed {@link TokenRequest}; a {@link TokenDetails} (in JSON format); an [Ably JWT](https://ably.com/docs/core-features/authentication.ably-jwt). See [the authentication documentation](https://ably.com/docs/realtime/authentication) for details of the Ably {@link TokenRequest} format and associated API calls.
   *
   * @param data - The parameters that should be used to generate the token.
   * @param callback - A function which, upon success, the `authCallback` should call with one of: an Ably Token string (in plain text format); a signed `TokenRequest`; a `TokenDetails` (in JSON format); an [Ably JWT](https://ably.com/docs/core-features/authentication#ably-jwt). Upon failure, the `authCallback` should call this function with information about the error.
   */
  authCallback?(
    data: TokenParams,
    /**
     * A function which, upon success, the `authCallback` should call with one of: an Ably Token string (in plain text format); a signed `TokenRequest`; a `TokenDetails` (in JSON format); an [Ably JWT](https://ably.com/docs/core-features/authentication#ably-jwt). Upon failure, the `authCallback` should call this function with information about the error.
     *
     * @param error - Should be `null` if the auth request completed successfully, or containing details of the error if not.
     * @param tokenRequestOrDetails - A valid `TokenRequest`, `TokenDetails` or Ably JWT to be used for authentication.
     */
    callback: (
      error: ErrorInfo | string | null,
      tokenRequestOrDetails: TokenDetails | TokenRequest | string | null,
    ) => void,
  ): void;

  /**
   * A set of key-value pair headers to be added to any request made to the `authUrl`. Useful when an application requires these to be added to validate the request or implement the response. If the `authHeaders` object contains an `authorization` key, then `withCredentials` is set on the XHR request.
   */
  authHeaders?: { [index: string]: string };

  /**
   * The HTTP verb to use for any request made to the `authUrl`, either `GET` or `POST`. The default value is `GET`.
   *
   * @defaultValue `HTTPMethod.GET`
   */
  authMethod?: HTTPMethod;

  /**
   * A set of key-value pair params to be added to any request made to the `authUrl`. When the `authMethod` is `GET`, query params are added to the URL, whereas when `authMethod` is `POST`, the params are sent as URL encoded form data. Useful when an application requires these to be added to validate the request or implement the response.
   */
  authParams?: { [index: string]: string };

  /**
   * A URL that the library may use to obtain a token string (in plain text format), or a signed {@link TokenRequest} or {@link TokenDetails} (in JSON format) from.
   */
  authUrl?: string;

  /**
   * The full API key string, as obtained from the [Ably dashboard](https://ably.com/dashboard). Use this option if you wish to use Basic authentication, or wish to be able to issue Ably Tokens without needing to defer to a separate entity to sign Ably {@link TokenRequest | `TokenRequest`s}. Read more about [Basic authentication](https://ably.com/docs/core-features/authentication#basic-authentication).
   */
  key?: string;

  /**
   * If `true`, the library queries the Ably servers for the current time when issuing {@link TokenRequest | `TokenRequest`s} instead of relying on a locally-available time of day. Knowing the time accurately is needed to create valid signed Ably {@link TokenRequest | `TokenRequest`s}, so this option is useful for library instances on auth servers where for some reason the server clock cannot be kept synchronized through normal means, such as an [NTP daemon](https://en.wikipedia.org/wiki/Ntpd). The server is queried for the current time once per client library instance (which stores the offset from the local clock), so if using this option you should avoid instancing a new version of the library for each request. The default is `false`.
   *
   * @defaultValue `false`
   */
  queryTime?: boolean;

  /**
   * An authenticated token. This can either be a {@link TokenDetails} object or token string (obtained from the `token` property of a {@link TokenDetails} component of an Ably {@link TokenRequest} response, or a JSON Web Token satisfying [the Ably requirements for JWTs](https://ably.com/docs/core-features/authentication#ably-jwt)). This option is mostly useful for testing: since tokens are short-lived, in production you almost always want to use an authentication method that enables the client library to renew the token automatically when the previous one expires, such as `authUrl` or `authCallback`. Read more about [Token authentication](https://ably.com/docs/core-features/authentication#token-authentication).
   */
  token?: TokenDetails | string;

  /**
   * An authenticated {@link TokenDetails} object (most commonly obtained from an Ably Token Request response). This option is mostly useful for testing: since tokens are short-lived, in production you almost always want to use an authentication method that enables the client library to renew the token automatically when the previous one expires, such as `authUrl` or `authCallback`. Use this option if you wish to use Token authentication. Read more about [Token authentication](https://ably.com/docs/core-features/authentication#token-authentication).
   */
  tokenDetails?: TokenDetails;

  /**
   * When `true`, forces token authentication to be used by the library. If a `clientId` is not specified in the {@link ClientOptions} or {@link TokenParams}, then the Ably Token issued is [anonymous](https://ably.com/docs/core-features/authentication#identified-clients).
   */
  useTokenAuth?: boolean;

  /**
   * A client ID, used for identifying this client when publishing messages or for presence purposes. The `clientId` can be any non-empty string, except it cannot contain a `*`. This option is primarily intended to be used in situations where the library is instantiated with a key. Note that a `clientId` may also be implicit in a token used to instantiate the library. An error will be raised if a `clientId` specified here conflicts with the `clientId` implicit in the token. Find out more about [client identities](https://ably.com/documentation/how-ably-works#client-identity).
   */
  clientId?: string;
}

/**
 * Capabilities which are available for use within {@link TokenParams}.
 */
export type capabilityOp =
  | 'publish'
  | 'subscribe'
  | 'presence'
  | 'object-subscribe'
  | 'object-publish'
  | 'annotation-subscribe'
  | 'annotation-publish'
  | 'message-update-any'
  | 'message-update-own'
  | 'message-delete-any'
  | 'message-delete-own'
  | 'history'
  | 'stats'
  | 'channel-metadata'
  | 'push-subscribe'
  | 'push-admin'
  | 'privileged-headers';

/**
 * Capabilities which are available for use within {@link TokenParams}.
 */
export type CapabilityOp = capabilityOp;

/**
 * Defines the properties of an Ably Token.
 */
export interface TokenParams {
  /**
   * The capabilities associated with this Ably Token. The capabilities value is a JSON-encoded representation of the resource paths and associated operations. Read more about capabilities in the [capabilities docs](https://ably.com/docs/core-features/authentication/#capabilities-explained).
   *
   * @defaultValue `'{"*":["*"]}'`
   */
  capability?: { [key: string]: capabilityOp[] | ['*'] } | string;
  /**
   * A client ID, used for identifying this client when publishing messages or for presence purposes. The `clientId` can be any non-empty string, except it cannot contain a `*`. This option is primarily intended to be used in situations where the library is instantiated with a key. Note that a `clientId` may also be implicit in a token used to instantiate the library. An error is raised if a `clientId` specified here conflicts with the `clientId` implicit in the token. Find out more about [identified clients](https://ably.com/docs/core-features/authentication#identified-clients).
   */
  clientId?: string;
  /**
   * A cryptographically secure random string of at least 16 characters, used to ensure the {@link TokenRequest} cannot be reused.
   */
  nonce?: string;
  /**
   * The timestamp of this request as milliseconds since the Unix epoch. Timestamps, in conjunction with the `nonce`, are used to prevent requests from being replayed. `timestamp` is a "one-time" value, and is valid in a request, but is not validly a member of any default token params such as `ClientOptions.defaultTokenParams`.
   */
  timestamp?: number;
  /**
   * Requested time to live for the token in milliseconds. The default is 60 minutes.
   *
   * @defaultValue 60min
   */
  ttl?: number;
}

/**
 * Sets the properties to configure encryption for a {@link Channel} or {@link RealtimeChannel} object.
 */
export interface CipherParams {
  /**
   * The algorithm to use for encryption. Only `AES` is supported and is the default value.
   *
   * @defaultValue `"AES"`
   */
  algorithm: string;
  /**
   * The private key used to encrypt and decrypt payloads. You should not set this value directly; rather, you should pass a `key` of type {@link CipherKeyParam} to {@link Crypto.getDefaultParams}.
   */
  key: unknown;
  /**
   * The length of the key in bits; either 128 or 256.
   */
  keyLength: number;
  /**
   * The cipher mode. Only `CBC` is supported and is the default value.
   *
   * @defaultValue `"CBC"`
   */
  mode: string;
}

/**
 * Contains an Ably Token and its associated metadata.
 */
export interface TokenDetails {
  /**
   * The capabilities associated with this Ably Token. The capabilities value is a JSON-encoded representation of the resource paths and associated operations. Read more about capabilities in the [capabilities docs](https://ably.com/docs/core-features/authentication/#capabilities-explained).
   */
  capability: string;
  /**
   * The client ID, if any, bound to this Ably Token. If a client ID is included, then the Ably Token authenticates its bearer as that client ID, and the Ably Token may only be used to perform operations on behalf of that client ID. The client is then considered to be an [identified client](https://ably.com/docs/core-features/authentication#identified-clients).
   */
  clientId?: string;
  /**
   * The timestamp at which this token expires as milliseconds since the Unix epoch.
   */
  expires: number;
  /**
   * The timestamp at which this token was issued as milliseconds since the Unix epoch.
   */
  issued: number;
  /**
   * The [Ably Token](https://ably.com/docs/core-features/authentication#ably-tokens) itself. A typical Ably Token string appears with the form `xVLyHw.A-pwh7wicf3afTfgiw4k2Ku33kcnSA7z6y8FjuYpe3QaNRTEo4`.
   */
  token: string;
}

/**
 * Contains the properties of a request for a token to Ably. Tokens are generated using {@link Auth.requestToken}.
 */
export interface TokenRequest {
  /**
   * Capability of the requested Ably Token. If the Ably `TokenRequest` is successful, the capability of the returned Ably Token will be the intersection of this capability with the capability of the issuing key. The capabilities value is a JSON-encoded representation of the resource paths and associated operations. Read more about capabilities in the [capabilities docs](https://ably.com/docs/realtime/authentication).
   */
  capability: string;
  /**
   * The client ID to associate with the requested Ably Token. When provided, the Ably Token may only be used to perform operations on behalf of that client ID.
   */
  clientId?: string;
  /**
   * The name of the key against which this request is made. The key name is public, whereas the key secret is private.
   */
  keyName: string;
  /**
   * The Message Authentication Code for this request.
   */
  mac: string;
  /**
   * A cryptographically secure random string of at least 16 characters, used to ensure the `TokenRequest` cannot be reused.
   */
  nonce: string;
  /**
   * The timestamp of this request as milliseconds since the Unix epoch.
   */
  timestamp: number;
  /**
   * Requested time to live for the Ably Token in milliseconds. If the Ably `TokenRequest` is successful, the TTL of the returned Ably Token is less than or equal to this value, depending on application settings and the attributes of the issuing key. The default is 60 minutes.
   *
   * @defaultValue 60min
   */
  ttl?: number;
}

/**
 * Creates Ably {@link TokenRequest} objects and obtains Ably Tokens from Ably to subsequently issue to less trusted clients.
 */
export declare interface Auth {
  /**
   * A client ID, used for identifying this client when publishing messages or for presence purposes. The `clientId` can be any non-empty string, except it cannot contain a `*`. This option is primarily intended to be used in situations where the library is instantiated with a key. Note that a `clientId` may also be implicit in a token used to instantiate the library. An error is raised if a `clientId` specified here conflicts with the `clientId` implicit in the token. Find out more about [identified clients](https://ably.com/docs/core-features/authentication#identified-clients).
   */
  clientId: string;

  /**
   * Instructs the library to get a new token immediately. When using the realtime client, it upgrades the current realtime connection to use the new token, or if not connected, initiates a connection to Ably, once the new token has been obtained. Also stores any {@link TokenParams} and {@link AuthOptions} passed in as the new defaults, to be used for all subsequent implicit or explicit token requests. Any {@link TokenParams} and {@link AuthOptions} objects passed in entirely replace, as opposed to being merged with, the current client library saved values.
   *
   * @param tokenParams - A {@link TokenParams} object.
   * @param authOptions - An {@link AuthOptions} object.
   * @returns A promise which, upon success, will be fulfilled with a {@link TokenDetails} object. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  authorize(tokenParams?: TokenParams, authOptions?: AuthOptions): Promise<TokenDetails>;
  /**
   * Creates and signs an Ably {@link TokenRequest} based on the specified (or if none specified, the client library stored) {@link TokenParams} and {@link AuthOptions}. Note this can only be used when the API `key` value is available locally. Otherwise, the Ably {@link TokenRequest} must be obtained from the key owner. Use this to generate an Ably {@link TokenRequest} in order to implement an Ably Token request callback for use by other clients. Both {@link TokenParams} and {@link AuthOptions} are optional. When omitted or `null`, the default token parameters and authentication options for the client library are used, as specified in the {@link ClientOptions} when the client library was instantiated, or later updated with an explicit `authorize` request. Values passed in are used instead of, rather than being merged with, the default values. To understand why an Ably {@link TokenRequest} may be issued to clients in favor of a token, see [Token Authentication explained](https://ably.com/docs/core-features/authentication/#token-authentication).
   *
   * @param tokenParams - A {@link TokenParams} object.
   * @param authOptions - An {@link AuthOptions} object.
   * @returns A promise which, upon success, will be fulfilled with a {@link TokenRequest} object. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  createTokenRequest(tokenParams?: TokenParams, authOptions?: AuthOptions): Promise<TokenRequest>;
  /**
   * Calls the `requestToken` REST API endpoint to obtain an Ably Token according to the specified {@link TokenParams} and {@link AuthOptions}. Both {@link TokenParams} and {@link AuthOptions} are optional. When omitted or `null`, the default token parameters and authentication options for the client library are used, as specified in the {@link ClientOptions} when the client library was instantiated, or later updated with an explicit `authorize` request. Values passed in are used instead of, rather than being merged with, the default values. To understand why an Ably {@link TokenRequest} may be issued to clients in favor of a token, see [Token Authentication explained](https://ably.com/docs/core-features/authentication/#token-authentication).
   *
   * @param TokenParams - A {@link TokenParams} object.
   * @param authOptions - An {@link AuthOptions} object.
   * @returns A promise which, upon success, will be fulfilled with a {@link TokenDetails} object. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  requestToken(TokenParams?: TokenParams, authOptions?: AuthOptions): Promise<TokenDetails>;
}

// Common Listeners
/**
 * A callback which returns only a single argument, used for {@link RealtimeChannel} subscriptions.
 *
 * @param message - The message which triggered the callback.
 */
export type messageCallback<T> = (message: T) => void;
/**
 * The callback used for the events emitted by {@link RealtimeChannel}.
 *
 * @param changeStateChange - The state change that occurred.
 */
export type channelEventCallback = (changeStateChange: ChannelStateChange) => void;
/**
 * The callback used for the events emitted by {@link Connection}.
 *
 * @param connectionStateChange - The state change that occurred.
 */
export type connectionEventCallback = (connectionStateChange: ConnectionStateChange) => void;

/**
 * A callback which returns only an error, or null, when complete.
 *
 * @param error - The error if the task failed, or null not.
 */
export type ErrorCallback = (error: ErrorInfo | null) => void;

/**
 * A callback which returns only a single argument - an event object.
 *
 * @param event - The event which triggered the callback.
 */
export type EventCallback<T> = (event: T) => void;

/**
 * Represents a subscription that can be unsubscribed from.
 * This interface provides a way to clean up and remove subscriptions when they are no longer needed.
 *
 * @example
 * ```typescript
 * const s = someService.subscribe();
 * // Later when done with the subscription
 * s.unsubscribe();
 * ```
 */
export interface Subscription {
  /**
   * Deregisters the listener previously passed to the `subscribe` method.
   *
   * This method should be called when the subscription is no longer needed,
   * it will make sure no further events will be sent to the subscriber and
   * that references to the subscriber are cleaned up.
   */
  readonly unsubscribe: () => void;
}

/**
 * Represents a subscription to status change events that can be unsubscribed from.
 * This interface provides a way to clean up and remove subscriptions when they are no longer needed.
 *
 * @example
 * ```typescript
 * const s = someService.on();
 * // Later when done with the subscription
 * s.off();
 * ```
 */
export interface StatusSubscription {
  /**
   * Deregisters the listener previously passed to the `on` method.
   *
   * Unsubscribes from the status change events. It will ensure that no
   * further status change events will be sent to the subscriber and
   * that references to the subscriber are cleaned up.
   */
  readonly off: () => void;
}

// To allow a uniform (callback) interface between on and once even in the
// promisified version of the lib, but still allow once to be used in a way
// that returns a Promise if desired, EventEmitter uses method overloading to
// present both methods
/**
 * A generic interface for event registration and delivery used in a number of the types in the Realtime client library. For example, the {@link Connection} object emits events for connection state using the `EventEmitter` pattern.
 */
export declare interface EventEmitter<CallbackType, ResultType, EventType> {
  /**
   * Registers the provided listener for the specified event. If `on()` is called more than once with the same listener and event, the listener is added multiple times to its listener registry. Therefore, as an example, assuming the same listener is registered twice using `on()`, and an event is emitted once, the listener would be invoked twice.
   *
   * @param event - The named event to listen for.
   * @param callback - The event listener.
   */
  on(event: EventType, callback: CallbackType): void;
  /**
   * Registers the provided listener for the specified events. If `on()` is called more than once with the same listener and event, the listener is added multiple times to its listener registry. Therefore, as an example, assuming the same listener is registered twice using `on()`, and an event is emitted once, the listener would be invoked twice.
   *
   * @param events - The named events to listen for.
   * @param callback -  The event listener.
   */
  on(events: EventType[], callback: CallbackType): void;
  /**
   * Registers the provided listener all events. If `on()` is called more than once with the same listener and event, the listener is added multiple times to its listener registry. Therefore, as an example, assuming the same listener is registered twice using `on()`, and an event is emitted once, the listener would be invoked twice.
   *
   * @param callback - The event listener.
   */
  on(callback: CallbackType): void;
  /**
   * Registers the provided listener for the first occurrence of a single named event specified as the `Event` argument. If `once` is called more than once with the same listener, the listener is added multiple times to its listener registry. Therefore, as an example, assuming the same listener is registered twice using `once`, and an event is emitted once, the listener would be invoked twice. However, all subsequent events emitted would not invoke the listener as `once` ensures that each registration is only invoked once.
   *
   * @param event - The named event to listen for.
   * @param callback - The event listener.
   */
  once(event: EventType, callback: CallbackType): void;
  /**
   * Registers the provided listener for the first event that is emitted. If `once()` is called more than once with the same listener, the listener is added multiple times to its listener registry. Therefore, as an example, assuming the same listener is registered twice using `once()`, and an event is emitted once, the listener would be invoked twice. However, all subsequent events emitted would not invoke the listener as `once()` ensures that each registration is only invoked once.
   *
   * @param callback - The event listener.
   */
  once(callback: CallbackType): void;
  /**
   * Returns a promise which resolves upon the first occurrence of a single named event specified as the `Event` argument.
   *
   * @param event - The named event to listen for.
   * @returns A promise which resolves upon the first occurrence of the named event.
   */
  once(event: EventType): Promise<ResultType>;
  /**
   * Returns a promise which resolves upon the first occurrence of an event.
   *
   * @returns A promise which resolves upon the first occurrence of an event.
   */
  once(): Promise<ResultType>;
  /**
   * Removes all registrations that match both the specified listener and the specified event.
   *
   * @param event - The named event.
   * @param callback - The event listener.
   */
  off(event: EventType, callback: CallbackType): void;
  /**
   * Deregisters the specified listener. Removes all registrations matching the given listener, regardless of whether they are associated with an event or not.
   *
   * @param callback - The event listener.
   */
  off(callback: CallbackType): void;
  /**
   * Deregisters all registrations, for all events and listeners.
   */
  off(): void;
  /**
   * Returns the listeners for a specified `EventType`.
   *
   * @param eventName - The event name to retrieve the listeners for.
   */
  listeners(eventName?: EventType): CallbackType[] | null;
}

/**
 * Contains a page of results for message or presence history, stats, or REST presence requests. A `PaginatedResult` response from a REST API paginated query is also accompanied by metadata that indicates the relative queries available to the `PaginatedResult` object.
 */
export declare interface PaginatedResult<T> {
  /**
   * Contains the current page of results; for example, an array of {@link InboundMessage} or {@link PresenceMessage} objects for a channel history request.
   */
  items: T[];
  /**
   * Returns a new `PaginatedResult` for the first page of results.
   *
   * @returns A promise which, upon success, will be fulfilled with a page of results for message and presence history, stats, and REST presence requests. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  first(): Promise<PaginatedResult<T>>;
  /**
   * Returns a new `PaginatedResult` loaded with the next page of results. If there are no further pages, then `null` is returned.
   *
   * @returns A promise which, upon success, will be fulfilled with a page of results for message and presence history, stats, and REST presence requests. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  next(): Promise<PaginatedResult<T> | null>;
  /**
   * Returns the `PaginatedResult` for the current page of results.
   */
  current(): Promise<PaginatedResult<T>>;
  /**
   * Returns `true` if there are more pages available by calling next and returns `false` if this page is the last page available.
   *
   * @returns Whether or not there are more pages of results.
   */
  hasNext(): boolean;
  /**
   * Returns `true` if this page is the last page and returns `false` if there are more pages available by calling next available.
   *
   * @returns Whether or not this is the last page of results.
   */
  isLast(): boolean;
}

/**
 * A superset of {@link PaginatedResult} which represents a page of results plus metadata indicating the relative queries available to it. `HttpPaginatedResponse` additionally carries information about the response to an HTTP request.
 */
export declare interface HttpPaginatedResponse<T = any> extends PaginatedResult<T> {
  /**
   * The HTTP status code of the response.
   */
  statusCode: number;
  /**
   * Whether `statusCode` indicates success. This is equivalent to `200 <= statusCode < 300`.
   */
  success: boolean;
  /**
   * The error code if the `X-Ably-Errorcode` HTTP header is sent in the response.
   */
  errorCode: number;
  /**
   * The error message if the `X-Ably-Errormessage` HTTP header is sent in the response.
   */
  errorMessage: string;
  /**
   * Optional map of string key-value pairs containing structured error metadata, extracted from the response body when present.
   */
  errorDetail?: Record<string, string>;
  /**
   * The headers of the response.
   */
  headers: any;
}

/**
 * Contains information about the results of a batch operation.
 */
export interface BatchResult<T> {
  /**
   * The number of successful operations in the request.
   */
  successCount: number;
  /**
   * The number of unsuccessful operations in the request.
   */
  failureCount: number;
  /**
   * An array of results for the batch operation.
   */
  results: T[];
}

/**
 * Describes the messages that should be published by a batch publish operation, and the channels to which they should be published.
 */
export interface BatchPublishSpec {
  /**
   * The names of the channels to publish the `messages` to.
   */
  channels: string[];
  /**
   * An array of {@link Message} objects.
   */
  messages: Message[];
}

/**
 * Contains information about the result of successful publishes to a channel requested by a single {@link BatchPublishSpec}.
 */
export interface BatchPublishSuccessResult {
  /**
   * The name of the channel the message(s) was published to.
   */
  channel: string;
  /**
   * A unique ID prefixed to the {@link Message.id} of each published message.
   */
  messageId: string;
  /**
   * An array of message serials corresponding 1:1 to the messages that were published.
   * A serial may be null if the message was discarded due to a configured conflation rule.
   */
  serials: (string | null)[];
}

/**
 * Contains information about the result of unsuccessful publishes to a channel requested by a single {@link BatchPublishSpec}.
 */
export interface BatchPublishFailureResult {
  /**
   * The name of the channel the message(s) failed to be published to.
   */
  channel: string;
  /**
   * Describes the reason for which the message(s) failed to publish to the channel as an {@link ErrorInfo} object.
   */
  error: ErrorInfo;
}

/**
 * Contains information about the result of a successful batch presence request for a single channel.
 */
export interface BatchPresenceSuccessResult {
  /**
   * The channel name the presence state was retrieved for.
   */
  channel: string;
  /**
   * An array of {@link PresenceMessage}s describing members present on the channel.
   */
  presence: PresenceMessage[];
}

/**
 * Contains information about the result of an unsuccessful batch presence request for a single channel.
 */
export interface BatchPresenceFailureResult {
  /**
   * The channel name the presence state failed to be retrieved for.
   */
  channel: string;
  /**
   * Describes the reason for which presence state could not be retrieved for the channel as an {@link ErrorInfo} object.
   */
  error: ErrorInfo;
}

/**
 * Cipher Key used in {@link CipherParamOptions}. If set to a `string`, the value must be base64 encoded.
 */
export type CipherKeyParam = ArrayBuffer | Uint8Array | string; // if string must be base64-encoded
/**
 * The type of the key returned by {@link Crypto.generateRandomKey}. Typed differently depending on platform (`Buffer` in Node.js, `ArrayBuffer` elsewhere).
 */
export type CipherKey = ArrayBuffer | Buffer;

/**
 * Contains the properties used to generate a {@link CipherParams} object.
 */
export type CipherParamOptions = {
  /**
   * The private key used to encrypt and decrypt payloads.
   */
  key: CipherKeyParam;
  /**
   * The algorithm to use for encryption. Only `AES` is supported.
   */
  algorithm?: 'aes';
  /**
   * The length of the key in bits; for example 128 or 256.
   */
  keyLength?: number;
  /**
   * The cipher mode. Only `CBC` is supported.
   */
  mode?: 'cbc';
};

/**
 * Contains the properties required to configure the encryption of {@link Message} payloads.
 */
export interface Crypto {
  /**
   * Generates a random key to be used in the encryption of the channel. If the language cryptographic randomness primitives are blocking or async, a callback is used. The callback returns a generated binary key.
   *
   * @param keyLength - The length of the key, in bits, to be generated. If not specified, this is equal to the default `keyLength` of the default algorithm: for AES this is 256 bits.
   * @returns A promise which, upon success, will be fulfilled with the generated key as a binary, for example, a byte array. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  generateRandomKey(keyLength?: number): Promise<CipherKey>;
  /**
   * Returns a {@link CipherParams} object, using the default values for any fields not supplied by the {@link CipherParamOptions} object.
   *
   * @param params - A {@link CipherParamOptions} object.
   * @returns A {@link CipherParams} object, using the default values for any fields not supplied.
   */
  getDefaultParams(params: CipherParamOptions): CipherParams;
}

/**
 * The `DevicePlatforms` namespace describes the possible values of the {@link DevicePlatform} type.
 */
declare namespace DevicePlatforms {
  /**
   * The device platform is Android.
   */
  type ANDROID = 'android';
  /**
   * The device platform is iOS.
   */
  type IOS = 'ios';
  /**
   * The device platform is a web browser.
   */
  type BROWSER = 'browser';
}

/**
 * Describes the device receiving push notifications.
 */
export type DevicePlatform = DevicePlatforms.ANDROID | DevicePlatforms.IOS | DevicePlatforms.BROWSER;

/**
 * The `DeviceFormFactors` namespace describes the possible values of the {@link DeviceFormFactor} type.
 */
declare namespace DeviceFormFactors {
  /**
   * The device is a phone.
   */
  type PHONE = 'phone';
  /**
   * The device is tablet.
   */
  type TABLET = 'tablet';
  /**
   * The device is a desktop.
   */
  type DESKTOP = 'desktop';
  /**
   * The device is a TV.
   */
  type TV = 'tv';
  /**
   * The device is a watch.
   */
  type WATCH = 'watch';
  /**
   * The device is a car.
   */
  type CAR = 'car';
  /**
   * The device is embedded.
   */
  type EMBEDDED = 'embedded';
  /**
   * The device is other.
   */
  type OTHER = 'other';
}

/**
 * Describes the type of device receiving a push notification.
 */
export type DeviceFormFactor =
  | DeviceFormFactors.PHONE
  | DeviceFormFactors.TABLET
  | DeviceFormFactors.DESKTOP
  | DeviceFormFactors.TV
  | DeviceFormFactors.WATCH
  | DeviceFormFactors.CAR
  | DeviceFormFactors.EMBEDDED
  | DeviceFormFactors.OTHER;

/**
 * Contains the properties of a device registered for push notifications.
 */
export interface DeviceDetails {
  /**
   * A unique ID generated by the device.
   */
  id: string;
  /**
   * The client ID the device is connected to Ably with.
   */
  clientId?: string;
  /**
   * The {@link DevicePlatform} associated with the device. Describes the platform the device uses, such as `android` or `ios`.
   */
  platform: DevicePlatform;
  /**
   * The {@link DeviceFormFactor} object associated with the device. Describes the type of the device, such as `phone` or `tablet`.
   */
  formFactor: DeviceFormFactor;
  /**
   * A JSON object of key-value pairs that contains metadata for the device.
   */
  metadata?: any;
  /**
   * A unique device secret generated by the Ably SDK.
   */
  deviceSecret?: string;
  /**
   * The {@link DevicePushDetails} object associated with the device. Describes the details of the push registration of the device.
   */
  push: DevicePushDetails;
}

/**
 * Contains the subscriptions of a device, or a group of devices sharing the same `clientId`, has to a channel in order to receive push notifications.
 */
export interface PushChannelSubscription {
  /**
   * The channel the push notification subscription is for.
   */
  channel: string;
  /**
   * The unique ID of the device.
   */
  deviceId?: string;
  /**
   * The ID of the client the device, or devices are associated to.
   */
  clientId?: string;
}

/**
 * Valid states which a Push device may be in.
 */
export type DevicePushState = 'ACTIVE' | 'FAILING' | 'FAILED';

/**
 * Contains the details of the push registration of a device.
 */
export interface DevicePushDetails {
  /**
   * A JSON object of key-value pairs that contains of the push transport and address.
   */
  recipient: any;
  /**
   * The current state of the push registration.
   */
  state?: DevicePushState;
  /**
   * An {@link ErrorInfo} object describing the most recent error when the `state` is `Failing` or `Failed`.
   */
  error?: ErrorInfo;
}

/**
 * Describes the plugins accepted by the Pub/Sub SDK packages via {@link CommonClientOptions.plugins}.
 */
export interface ClientPlugins {
  /**
   * A plugin capable of decoding `vcdiff`-encoded messages. For more information on how to configure a channel to use delta encoding, see the [documentation for the `@ably-forks/vcdiff-decoder` package](https://github.com/ably-forks/vcdiff-decoder#usage).
   */
  vcdiff?: unknown;

  /**
   * A plugin which allows the client to use LiveObjects functionality at `RealtimeChannel.object`.
   */
  LiveObjects?: unknown;
}

/**
 * Client options shared by every Ably Pub/Sub SDK package, covering authentication, endpoint selection, logging, transport security and protocol behaviour.
 */
export interface CommonClientOptions extends AuthOptions {
  /**
   * Set a routing policy or FQDN to connect to Ably. See [platform customization](https://ably.com/docs/platform-customization).
   */
  endpoint?: string;

  /**
   * Controls the verbosity of the logs output from the library. Valid values are: 0 (no logs), 1 (errors only), 2 (errors plus connection and channel state changes), 3 (high-level debug output), and 4 (full debug output).
   */
  logLevel?: number;

  /**
   * Controls the log output of the library. This is a function to handle each line of log output. If you do not set this value, then `console.log` will be used.
   *
   * @param msg - The log message emitted by the library.
   * @param level - The level of the log. Values are one of: 0 (no logs), 1 (errors only), 2 (errors plus connection and channel state changes), 3 (high-level debug output), and 4 (full debug output).
   */
  logHandler?: (msg: string, level: number) => void;

  /**
   * Enables a non-default Ably port to be specified. For development environments only. The default value is 80.
   *
   * @defaultValue 80
   */
  port?: number;

  /**
   * When `false`, the client will use an insecure connection. The default is `true`, meaning a TLS connection will be used to connect to Ably.
   *
   * @defaultValue `true`
   */
  tls?: boolean;

  /**
   * Enables a non-default Ably TLS port to be specified. For development environments only. The default value is 443.
   *
   * @defaultValue 443
   */
  tlsPort?: number;

  /**
   * When `true`, the more efficient MsgPack binary encoding is used. When `false`, JSON text encoding is used. The default is `true` for Node.js, and `false` for all other platforms.
   *
   * @defaultValue `true` for Node.js, `false` for all other platforms
   */
  useBinaryProtocol?: boolean;

  /**
   * The maximum message size is an attribute of an Ably account which represents the largest permitted payload size of a single message or set of messages published in a single operation. Publish requests whose payload exceeds this limit are rejected by the server. `maxMessageSize` enables the client to enforce, or further restrict, the maximum size of a single message or set of messages published via REST. The default value is `65536` (64 KiB). In the case of a realtime connection, the server may indicate the associated maximum message size on connection establishment; this value takes precedence over the client's default `maxMessageSize`.
   *
   * @defaultValue 65536
   */
  maxMessageSize?: number;

  /**
   * When a {@link TokenParams} object is provided, it overrides the client library defaults when issuing new Ably Tokens or Ably {@link TokenRequest | `TokenRequest`s}.
   */
  defaultTokenParams?: TokenParams;

  /**
   * When `true`, operations that would otherwise fail silently, such as those gated on a channel mode, reject with an {@link ErrorInfo} whose {@link ErrorInfo.remediation | `remediation`} describes the cause and how to fix it. When `false`, the same paths emit a warning log and return their legacy silent value. The default is `false`. A future major version will make the strict behaviour unconditional.
   *
   * @defaultValue `false`
   */
  strictMode?: boolean;

  /**
   * An array of fallback hosts to be used in the case of an error necessitating the use of an alternative host. If you have been provided a set of custom fallback hosts by Ably, please specify them here.
   *
   * @defaultValue `['a.ably-realtime.com', 'b.ably-realtime.com', 'c.ably-realtime.com', 'd.ably-realtime.com', 'e.ably-realtime.com']``
   */
  fallbackHosts?: string[];

  /**
   * A map between a plugin type and a plugin object.
   */
  plugins?: ClientPlugins;
}

/**
 * Client options controlling the behaviour of HTTP requests made to Ably.
 */
export interface HttpOptions {
  /**
   * Set of configurable options to set on the HTTP(S) agent used for REST requests.
   *
   * See the [NodeJS docs](https://nodejs.org/api/http.html#new-agentoptions) for descriptions of these options.
   */
  restAgentOptions?: {
    /**
     * See [NodeJS docs](https://nodejs.org/api/http.html#new-agentoptions)
     */
    maxSockets?: number;
    /**
     * See [NodeJS docs](https://nodejs.org/api/http.html#new-agentoptions)
     */
    keepAlive?: boolean;
  };

  /**
   * When `true`, enables idempotent publishing by assigning a unique message ID client-side, allowing the Ably servers to discard automatic publish retries following a failure such as a network fault. The default is `true`.
   *
   * @defaultValue `true`
   */
  idempotentRestPublishing?: boolean;

  /**
   * The maximum number of fallback hosts to use as a fallback when an HTTP request to the primary host is unreachable or indicates that it is unserviceable. The default value is 3.
   *
   * @defaultValue 3
   */
  httpMaxRetryCount?: number;

  /**
   * The maximum elapsed time in milliseconds in which fallback host retries for HTTP requests will be attempted. The default is 15 seconds.
   *
   * @defaultValue 15s
   */
  httpMaxRetryDuration?: number;

  /**
   * Timeout in milliseconds for opening a connection to Ably to initiate an HTTP request. The default is 4 seconds.
   *
   * @defaultValue 4s
   */
  httpOpenTimeout?: number;

  /**
   * Timeout in milliseconds for a client performing a complete HTTP request to Ably, including the connection phase. The default is 10 seconds.
   *
   * @defaultValue 10s
   */
  httpRequestTimeout?: number;
}

/**
 * Client options controlling the behaviour of a realtime connection to Ably.
 */
export interface RealtimeOptions {
  /**
   * When `true`, the client connects to Ably as soon as it is instantiated. You can set this to `false` and explicitly connect to Ably using the {@link Connection.connect | `connect()`} method. The default is `true`.
   *
   * @defaultValue `true`
   */
  autoConnect?: boolean;

  /**
   * If `false`, prevents messages originating from this connection being echoed back on the same connection. The default is `true`.
   *
   * @defaultValue `true`
   */
  echoMessages?: boolean;

  /**
   * If `false`, this disables the default behavior whereby the library queues messages on a connection in the disconnected or connecting states. The default behavior enables applications to submit messages immediately upon instantiating the library without having to wait for the connection to be established. Applications may use this option to disable queueing if they wish to have application-level control over the queueing. The default is `true`.
   *
   * @defaultValue `true`
   */
  queueMessages?: boolean;

  /**
   * If the connection is still in the {@link ConnectionStates.DISCONNECTED} state after this delay in milliseconds, the client library will attempt to reconnect automatically. The default is 15 seconds.
   *
   * @defaultValue 15s
   */
  disconnectedRetryTimeout?: number;

  /**
   * When the connection enters the {@link ConnectionStates.SUSPENDED} state, after this delay in milliseconds, if the state is still {@link ConnectionStates.SUSPENDED | `SUSPENDED`}, the client library attempts to reconnect automatically. The default is 30 seconds.
   *
   * @defaultValue 30s
   */
  suspendedRetryTimeout?: number;

  /**
   * A set of key-value pairs that can be used to pass in arbitrary connection parameters, such as [`heartbeatInterval`](https://ably.com/docs/realtime/connection#heartbeats) or [`remainPresentFor`](https://ably.com/docs/realtime/presence#unstable-connections).
   */
  transportParams?: { [k: string]: string | number | boolean };

  /**
   * An array of transports to use, in descending order of preference. In the browser environment the available transports are: `web_socket` and `xhr`.
   */
  transports?: Transport[];

  /**
   * Timeout for the wait of acknowledgement for operations performed via a realtime connection, before the client library considers a request failed and triggers a failure condition. Operations include establishing a connection with Ably, or sending a `HEARTBEAT`, `CONNECT`, `ATTACH`, `DETACH` or `CLOSE` request. It is the equivalent of `httpRequestTimeout` but for realtime operations, rather than REST. The default is 10 seconds.
   *
   * @defaultValue 10s
   */
  realtimeRequestTimeout?: number;

  /**
   * Override the URL used by the realtime client to check if the internet is available.
   *
   * In the event of a failure to connect to the primary endpoint, the client will send a
   * GET request to this URL to check if the internet is available. If this request returns
   * a success response the client will attempt to connect to a fallback host.
   */
  connectivityCheckUrl?: string;

  /**
   * Override the URL used by the realtime client to check if WebSocket connections are available.
   *
   * If the client suspects that WebSocket connections are unavailable on the current network,
   * it will attempt to open a WebSocket connection to this URL to check WebSocket connectivity.
   * If this fails, the client will attempt to connect to Ably systems using fallback transports, if available.
   */
  wsConnectivityCheckUrl?: string;

  /**
   * Disable the check used by the realtime client to check if the internet
   * is available before connecting to a fallback host.
   */
  disableConnectivityCheck?: boolean;
}
