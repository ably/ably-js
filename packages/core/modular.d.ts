/**
 * You are currently viewing the modular (tree-shakable) variant of the Ably JavaScript Client Library SDK. View the default variant {@link ably | here}.
 *
 * To get started with the Ably JavaScript Client Library SDK, follow the [Quickstart Guide](https://ably.com/docs/quick-start-guide) or view the introductions to the [realtime](https://ably.com/docs/realtime/usage) and [REST](https://ably.com/docs/rest/usage) interfaces.
 *
 * ## No `static` class functionality
 *
 * In contrast to the default variant of the SDK, the modular variant does not expose any functionality via the static methods of the `Crypto`, `Message`, `PresenceMessage` and `Annotation` classes, since they cannot be tree-shaken by module bundlers. Instead, it exports free-standing functions which provide the same functionality. These are:
 *
 * | `static` version                           | Replacement in modular variant                                                     |
 * | ------------------------------------------ | ---------------------------------------------------------------------------------- |
 * | `Crypto.generateRandomKey()`               | [`generateRandomKey()`](../functions/modular.generateRandomKey.html)               |
 * | `Crypto.getDefaultParams()`                | [`getDefaultCryptoParams()`](../functions/modular.getDefaultCryptoParams.html)     |
 * | `Message.fromEncoded()`                    | [`decodeMessage()`](../functions/modular.decodeMessage.html)                       |
 * | `Message.fromEncoded()`                    | [`decodeEncryptedMessage()`](../functions/modular.decodeEncryptedMessage.html)     |
 * | `Message.fromEncodedArray()`               | [`decodeMessages()`](../functions/modular.decodeMessages.html)                     |
 * | `Message.fromEncodedArray()`               | [`decodeEncryptedMessages()`](../functions/modular.decodeEncryptedMessages.html)   |
 * | `PresenceMessage.fromEncoded()`            | [`decodePresenceMessage()`](../functions/modular.decodePresenceMessage.html)       |
 * | `PresenceMessage.fromEncoded()`            | [`decodeEncryptedPresenceMessage()`](../functions/modular.decodeEncryptedPresenceMessage.html)       |
 * | `PresenceMessage.fromEncodedArray()`       | [`decodeEncryptedPresenceMessages()`](../functions/modular.decodeEncryptedPresenceMessages.html)     |
 * | `PresenceMessage.fromEncodedArray()`       | [`decodePresenceMessages()`](../functions/modular.decodePresenceMessages.html)     |
 * | `PresenceMessage.fromValues()`             | [`constructPresenceMessage()`](../functions/modular.constructPresenceMessage.html) |
 * | `Annotation.fromEncoded()`                 | [`decodeAnnotation()`](../functions/modular.decodeAnnotation.html)                 |
 * | `Annotation.fromEncodedArray()`            | [`decodeAnnotations()`](../functions/modular.decodeAnnotations.html)               |
 *
 * @module
 */

import {
  ErrorInfo,
  PubSubHttpClient,
  ClientOptions,
  Crypto as CryptoClass,
  Message as MessageClass,
  PresenceMessage as PresenceMessageClass,
  Annotation as AnnotationClass,
  PubSubRealtimeClient,
  Auth,
  Channels,
  Channel,
  HttpPaginatedResponse,
  StatsParams,
  PaginatedResult,
  Stats,
  BatchPublishSpec,
  BatchResult,
  BatchPublishSuccessResult,
  BatchPresenceFailureResult,
  BatchPresenceSuccessResult,
  BatchPublishFailureResult,
  Push,
  RealtimeChannel,
  Connection,
  CorePlugins,
  // The ESLint warning is triggered because we only use this type in a documentation comment.
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  AuthOptions,
  LocalDevice,
} from './ably';

export declare const generateRandomKey: typeof CryptoClass.generateRandomKey;
export declare const getDefaultCryptoParams: typeof CryptoClass.getDefaultParams;
export declare const decodeMessage: typeof MessageClass.fromEncoded;
export declare const decodeEncryptedMessage: typeof MessageClass.fromEncoded;
export declare const decodeMessages: typeof MessageClass.fromEncodedArray;
export declare const decodeEncryptedMessages: typeof MessageClass.fromEncodedArray;
export declare const decodePresenceMessage: typeof PresenceMessageClass.fromEncoded;
export declare const decodePresenceMessages: typeof PresenceMessageClass.fromEncodedArray;
export declare const decodeEncryptedPresenceMessage: typeof PresenceMessageClass.fromEncoded;
export declare const decodeEncryptedPresenceMessages: typeof PresenceMessageClass.fromEncodedArray;
export declare const constructPresenceMessage: typeof PresenceMessageClass.fromValues;
export declare const decodeAnnotation: typeof AnnotationClass.fromEncoded;
export declare const decodeAnnotations: typeof AnnotationClass.fromEncodedArray;

/**
 * Provides REST-related functionality to a {@link BaseRealtime} client.
 *
 * To create a client that includes this plugin, include it in the client options that you pass to the {@link BaseRealtime.constructor}:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest, Http } from '@ably/pubsub-core/modular';
 * const realtime = new BaseRealtime({ ...options, plugins: { WebSocketTransport, FetchRequest, Http } });
 * ```
 *
 * When provided, the following functionality becomes available:
 *
 * - { @link ably!Push | push admin }
 * - { @link BaseRealtime.time | retrieving Ably service time }
 * - { @link ably!Auth.createTokenRequest | creating a token request } using the { @link ably!AuthOptions.queryTime } option
 * - { @link BaseRealtime.stats | retrieving your application’s usage statistics }
 * - { @link BaseRealtime.request | making arbitrary REST requests }
 * - { @link BaseRealtime.batchPublish | batch publishing of messages }
 * - { @link BaseRealtime.batchPresence | batch retrieval of channel presence state }
 * - { @link ably!Auth.revokeTokens | requesting the revocation of tokens }
 * - { @link ably!RealtimeChannel.history | retrieving the message history of a channel }
 * - { @link ably!RealtimePresence.history | retrieving the presence history of a channel }
 *
 * If this plugin is not provided, then trying to use the above functionality will cause a runtime error.
 */
export declare const Http: unknown;

/**
 * Provides a {@link BaseHttp} or {@link BaseRealtime} instance with the ability to encrypt and decrypt {@link ably!Message} payloads.
 *
 * To create a client that includes this plugin, include it in the client options that you pass to the {@link BaseRealtime.constructor}:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest, Crypto } from '@ably/pubsub-core/modular';
 * const realtime = new BaseRealtime({ ...options, plugins: { WebSocketTransport, FetchRequest, Crypto } });
 * ```
 *
 * When provided, you can configure message encryption on a channel via the {@link ably!ChannelOptions.cipher} property of the `ChannelOptions` that you pass when {@link ably!Channels.get | fetching a channel}. If this plugin is not provided, then passing a `ChannelOptions` with a `cipher` property will cause a runtime error.
 */
export declare const Crypto: unknown;

/**
 * Provides a {@link BaseHttp} or {@link BaseRealtime} instance with the ability to communicate with the Ably service using the more space-efficient [MessagePack](https://msgpack.org/index.html) format.
 *
 * To create a client that includes this plugin, include it in the client options that you pass to the {@link BaseRealtime.constructor}:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest, MsgPack } from '@ably/pubsub-core/modular';
 * const realtime = new BaseRealtime({ ...options, plugins: { WebSocketTransport, FetchRequest, MsgPack } });
 * ```
 *
 * When provided, you can control whether the client uses MessagePack via the {@link ClientOptions.useBinaryProtocol} client option. If you do not provide this plugin, then the library will always JSON format for encoding messages.
 */
export declare const MsgPack: unknown;

/**
 * Provides a {@link BaseRealtime} instance with the ability to interact with a channel’s presence set.
 *
 * To create a client that includes this plugin, include it in the client options that you pass to the {@link BaseRealtime.constructor}:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest, RealtimePresence } from '@ably/pubsub-core/modular';
 * const realtime = new BaseRealtime({ ...options, plugins: { WebSocketTransport, FetchRequest, RealtimePresence } });
 * ```
 *
 * If you do not provide this plugin, then attempting to access a channel’s {@link ably!RealtimeChannel.presence} property will cause a runtime error.
 */
export declare const RealtimePresence: unknown;

/**
 * Provides a {@link BaseRealtime} instance with the ability to interact with message
 * annotations.
 *
 * To create a client that includes this plugin, include it in the client options that you pass to the {@link BaseRealtime.constructor}:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest, Annotations } from '@ably/pubsub-core/modular';
 * const realtime = new BaseRealtime({ ...options, plugins: { WebSocketTransport, FetchRequest, Annotations } });
 * ```
 *
 * If you do not provide this plugin, then attempting to access a channel’s {@link ably!RealtimeChannel.annotations} property will cause a runtime error.
 */
export declare const Annotations: unknown;

/**
 * Provides a {@link BaseRealtime} instance with the ability to establish a connection with the Ably realtime service using a [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) connection.
 *
 * To create a client that includes this plugin, include it in the client options that you pass to the {@link BaseRealtime.constructor}:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest } from '@ably/pubsub-core/modular';
 * const realtime = new BaseRealtime({ ...options, plugins: { WebSocketTransport, FetchRequest } });
 * ```
 *
 * Note that network conditions, such as firewalls or proxies, might prevent the client from establishing a WebSocket connection. For this reason, you may wish to provide the `BaseRealtime` instance with the ability to alternatively establish a connection using long polling which is less susceptible to these external conditions. You do this by passing in the {@link XHRPolling} plugin, alongside `WebSocketTransport`:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest } from '@ably/pubsub-core/modular';
 * const realtime = new BaseRealtime({ ...options, plugins: { WebSocketTransport, XHRPolling, FetchRequest } });
 * ```
 */
export declare const WebSocketTransport: unknown;

/**
 * Provides a {@link BaseRealtime} instance with the ability to establish a connection with the Ably realtime service using the browser’s [XMLHttpRequest API](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest).
 *
 * `XHRPolling` uses HTTP long polling; that is, it will make a new HTTP request each time a message is received from Ably.
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest } from '@ably/pubsub-core/modular';
 * const realtime = new BaseRealtime({ ...options, plugins: { XHRPolling, FetchRequest } });
 * ```
 *
 * Provide this plugin if, for example, you wish the client to have an alternative mechanism for connecting to Ably if it’s unable to establish a WebSocket connection.
 */
export declare const XHRPolling: unknown;

/**
 * Provides a {@link BaseHttp} or {@link BaseRealtime} instance with the ability to make HTTP requests using the browser’s [XMLHttpRequest API](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest).
 *
 * To create a client that includes this plugin, include it in the client options that you pass to the {@link BaseRealtime.constructor}:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, XHRRequest } from '@ably/pubsub-core/modular';
 * const realtime = new BaseRealtime({ ...options, plugins: { WebSocketTransport, XHRRequest } });
 * ```
 */
export declare const XHRRequest: unknown;

/**
 * Provides a {@link BaseHttp} or {@link BaseRealtime} instance with the ability to make HTTP requests using the browser’s [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).
 *
 * To create a client that includes this plugin, include it in the client options that you pass to the {@link BaseRealtime.constructor}:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest } from '@ably/pubsub-core/modular';
 * const realtime = new BaseRealtime({ ...options, plugins: { WebSocketTransport, FetchRequest } });
 * ```
 */
export declare const FetchRequest: unknown;

/**
 * Provides a {@link BaseRealtime} instance with the ability to filter channel subscriptions at runtime using { @link ably!RealtimeChannel.subscribe:WITH_MESSAGE_FILTER | the overload of `subscribe()` that accepts a `MessageFilter` }.
 *
 * To create a client that includes this plugin, include it in the client options that you pass to the {@link BaseRealtime.constructor}:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest, MessageInteractions } from '@ably/pubsub-core/modular';
 * const realtime = new BaseRealtime({ ...options, plugins: { WebSocketTransport, FetchRequest, MessageInteractions } });
 * ```
 *
 * If you do not provide this plugin, then attempting to use this overload of `subscribe()` will cause a runtime error.
 */
export declare const MessageInteractions: unknown;

/**
 * Pass a `ModularPlugins` in the {@link ClientOptions.plugins} property of the options that you pass to { @link BaseHttp.constructor | the constructor of BaseHttp } or {@link BaseRealtime.constructor | that of BaseRealtime} to specify which functionality should be made available to that client.
 */
export interface ModularPlugins {
  /**
   * See {@link Http | documentation for the `Http` plugin}.
   */
  Http?: typeof Http;

  /**
   * See {@link Crypto | documentation for the `Crypto` plugin}.
   */
  Crypto?: typeof Crypto;

  /**
   * See {@link MsgPack | documentation for the `MsgPack` plugin}.
   */
  MsgPack?: typeof MsgPack;

  /**
   * See {@link RealtimePresence | documentation for the `RealtimePresence` plugin}.
   */
  RealtimePresence?: typeof RealtimePresence;

  /**
   * See {@link Annotations | documentation for the `Annotations` plugin}.
   */
  Annotations?: typeof Annotations;

  /**
   * See {@link WebSocketTransport | documentation for the `WebSocketTransport` plugin}.
   */
  WebSocketTransport?: typeof WebSocketTransport;

  /**
   * See {@link XHRPolling | documentation for the `XHRPolling` plugin}.
   */
  XHRPolling?: typeof XHRPolling;

  /**
   * See {@link XHRRequest | documentation for the `XHRRequest` plugin}.
   */
  XHRRequest?: typeof XHRRequest;

  /**
   * See {@link FetchRequest | documentation for the `FetchRequest` plugin}.
   */
  FetchRequest?: typeof FetchRequest;

  /**
   * See {@link MessageInteractions | documentation for the `MessageInteractions` plugin}.
   */
  MessageInteractions?: typeof MessageInteractions;
}

/**
 * A client that offers a simple stateless API to interact directly with Ably's REST API.
 *
 * `BaseHttp` is the equivalent, in the modular variant of the Ably Client Library SDK, of the {@link PubSubHttpClient} that `createHttpClient()` from `@ably/pubsub-server` returns. The difference is that its constructor allows you to decide exactly which functionality the client should include. This allows unused functionality to be tree-shaken, reducing bundle size.
 *
 * > **Note**
 * >
 * > In order to further reduce bundle size, `BaseHttp` performs less logging than the HTTP client of the default variant of the SDK. It only logs:
 * >
 * > - messages that have a {@link ClientOptions.logLevel | `logLevel`} of 1 (that is, errors)
 * > - a small number of other network events
 * >
 * > If you need more verbose logging, use the default variant of the SDK.
 */
export declare class BaseHttp implements PubSubHttpClient {
  /**
   * Construct a client object using an Ably {@link ClientOptions} object.
   *
   * @param options - A {@link ClientOptions} object to configure the client connection to Ably. Its {@link ClientOptions.plugins} property should be an object describing which functionality the client should offer. See the documentation for {@link ModularPlugins}.
   *
   * You must provide at least one HTTP request implementation; that is, one of {@link FetchRequest} or {@link XHRRequest}. For minimum bundle size, favour `FetchRequest`.
   *
   * The {@link Http} plugin is always implicitly included.
   */
  constructor(options: ClientOptions<CorePlugins & ModularPlugins>);

  // Requirements of PubSubHttpClient

  auth: Auth;
  channels: Channels<Channel>;
  request<T = any>(
    method: string,
    path: string,
    version: number,
    params?: any,
    body?: any[] | any,
    headers?: any,
  ): Promise<HttpPaginatedResponse<T>>;
  stats(params?: StatsParams): Promise<PaginatedResult<Stats>>;
  time(): Promise<number>;
  batchPublish(spec: BatchPublishSpec): Promise<BatchResult<BatchPublishSuccessResult | BatchPublishFailureResult>>;
  batchPublish(
    specs: BatchPublishSpec[],
  ): Promise<BatchResult<BatchPublishSuccessResult | BatchPublishFailureResult>[]>;
  batchPresence(channels: string[]): Promise<BatchResult<BatchPresenceSuccessResult | BatchPresenceFailureResult>[]>;
  push: Push;
  getDevice(): Promise<LocalDevice>;
}

/**
 * A client that extends the functionality of {@link BaseHttp} and provides additional realtime-specific features.
 *
 * `BaseRealtime` is the equivalent, in the modular variant of the Ably Client Library SDK, of the {@link PubSubRealtimeClient} that the realtime factories of `@ably/pubsub-device` and `@ably/pubsub-server` return. The difference is that its constructor allows you to decide exactly which functionality the client should include. This allows unused functionality to be tree-shaken, reducing bundle size.
 *
 * > **Note**
 * >
 * > In order to further reduce bundle size, `BaseRealtime` performs less logging than the realtime client of the default variant of the SDK. It only logs:
 * >
 * > - messages that have a {@link ClientOptions.logLevel | `logLevel`} of 1 (that is, errors)
 * > - a small number of other network events
 * >
 * > If you need more verbose logging, use the default variant of the SDK.
 */
export declare class BaseRealtime implements PubSubRealtimeClient {
  /**
   * Construct a client object using an Ably {@link ClientOptions} object.
   *
   * @param options - A {@link ClientOptions} object to configure the client connection to Ably. Its {@link ClientOptions.plugins} property should be an object describing which functionality the client should offer. See the documentation for {@link ModularPlugins}.
   *
   * You must provide:
   *
   * - at least one HTTP request implementation; that is, one of {@link FetchRequest} or {@link XHRRequest} — for minimum bundle size, favour `FetchRequest`;
   * - at least one realtime transport implementation; that is, one of {@link WebSocketTransport} or {@link XHRPolling} — for minimum bundle size, favour `WebSocketTransport`.
   */
  constructor(options: ClientOptions<CorePlugins & ModularPlugins>);

  // Requirements of PubSubRealtimeClient

  clientId: string;
  close(): void;
  connect(): void;
  auth: Auth;
  channels: Channels<RealtimeChannel>;
  connection: Connection;
  request<T = any>(
    method: string,
    path: string,
    version: number,
    params?: any,
    body?: any[] | any,
    headers?: any,
  ): Promise<HttpPaginatedResponse<T>>;
  stats(params?: StatsParams): Promise<PaginatedResult<Stats>>;
  time(): Promise<number>;
  batchPublish(spec: BatchPublishSpec): Promise<BatchResult<BatchPublishSuccessResult | BatchPublishFailureResult>>;
  batchPublish(
    specs: BatchPublishSpec[],
  ): Promise<BatchResult<BatchPublishSuccessResult | BatchPublishFailureResult>[]>;
  batchPresence(channels: string[]): Promise<BatchResult<BatchPresenceSuccessResult | BatchPresenceFailureResult>[]>;
  push: Push;
  getDevice(): Promise<LocalDevice>;
}

export { ErrorInfo };
