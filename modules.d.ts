/**
 * You are currently viewing the modular (tree-shakable) variant of the Ably JavaScript Client Library SDK. View the default variant {@link ably | here}.
 *
 * To get started with the Ably JavaScript Client Library SDK, follow the [Quickstart Guide](https://ably.com/docs/quick-start-guide) or view the introductions to the [realtime](https://ably.com/docs/realtime/usage) and [REST](https://ably.com/docs/rest/usage) interfaces.
 *
 * ## No `static` class functionality
 *
 * In contrast to the default variant of the SDK, the modular variant does not expose any functionality via `static` class properties or methods, since they cannot be tree-shaken by module bundlers. Instead, it exports free-standing functions which provide the same functionality. These are:
 *
 * | `static` version                           | Replacement in modular variant                                                     |
 * | ------------------------------------------ | ---------------------------------------------------------------------------------- |
 * | `Crypto.generateRandomKey()`               | [`generateRandomKey()`](../functions/modules.generateRandomKey.html)               |
 * | `Crypto.getDefaultParams()`                | [`getDefaultCryptoParams()`](../functions/modules.getDefaultCryptoParams.html)     |
 * | `MessageStatic.fromEncoded()`              | [`decodeMessage()`](../functions/modules.decodeMessage.html)                       |
 * | `MessageStatic.fromEncoded()`              | [`decodeEncryptedMessage()`](../functions/modules.decodeEncryptedMessage.html)     |
 * | `MessageStatic.fromEncodedArray()`         | [`decodeMessages()`](../functions/modules.decodeMessages.html)                     |
 * | `MessageStatic.fromEncodedArray()`         | [`decodeEncryptedMessages()`](../functions/modules.decodeEncryptedMessages.html)   |
 * | `PresenceMessageStatic.fromEncoded()`      | [`decodePresenceMessage()`](../functions/modules.decodePresenceMessage.html)       |
 * | `PresenceMessageStatic.fromEncodedArray()` | [`decodePresenceMessages()`](../functions/modules.decodePresenceMessages.html)     |
 * | `PresenceMessageStatic.fromValues()`       | [`constructPresenceMessage()`](../functions/modules.constructPresenceMessage.html) |
 *
 * @module
 */

import {
  ErrorInfo,
  RestClient,
  ClientOptions,
  Crypto as CryptoClass,
  MessageStatic,
  PresenceMessageStatic,
  RealtimeClient,
  Auth,
  Channels,
  ChannelGroups as ChannelGroupsImpl,
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
  // The ESLint warning is triggered because we only use this type in a documentation comment.
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  AuthOptions,
} from './ably';

export declare const generateRandomKey: CryptoClass['generateRandomKey'];
export declare const getDefaultCryptoParams: CryptoClass['getDefaultParams'];
export declare const decodeMessage: MessageStatic['fromEncoded'];
export declare const decodeEncryptedMessage: MessageStatic['fromEncoded'];
export declare const decodeMessages: MessageStatic['fromEncodedArray'];
export declare const decodeEncryptedMessages: MessageStatic['fromEncodedArray'];
export declare const decodePresenceMessage: PresenceMessageStatic['fromEncoded'];
export declare const decodePresenceMessages: PresenceMessageStatic['fromEncodedArray'];
export declare const constructPresenceMessage: PresenceMessageStatic['fromValues'];

/**
 * Provides REST-related functionality to a {@link BaseRealtime} client.
 *
 * To create a client that includes this module, include it in the `ModulesMap` that you pass to the {@link BaseRealtime.constructor}:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest, Rest } from 'ably/modules';
 * const realtime = new BaseRealtime(options, { WebSocketTransport, FetchRequest, Rest });
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
 * If this module is not provided, then trying to use the above functionality will cause a runtime error.
 */
export declare const Rest: unknown;

/**
 * Provides a {@link BaseRest} or {@link BaseRealtime} instance with the ability to encrypt and decrypt {@link ably!Message} payloads.
 *
 * To create a client that includes this module, include it in the `ModulesMap` that you pass to the {@link BaseRealtime.constructor}:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest, Crypto } from 'ably/modules';
 * const realtime = new BaseRealtime(options, { WebSocketTransport, FetchRequest, Crypto });
 * ```
 *
 * When provided, you can configure message encryption on a channel via the {@link ably!ChannelOptions.cipher} property of the `ChannelOptions` that you pass when {@link ably!Channels.get | fetching a channel}. If this module is not provided, then passing a `ChannelOptions` with a `cipher` property will cause a runtime error.
 */
export declare const Crypto: unknown;

/**
 * Provides a {@link BaseRest} or {@link BaseRealtime} instance with the ability to communicate with the Ably service using the more space-efficient [MessagePack](https://msgpack.org/index.html) format.
 *
 * To create a client that includes this module, include it in the `ModulesMap` that you pass to the {@link BaseRealtime.constructor}:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest, MsgPack } from 'ably/modules';
 * const realtime = new BaseRealtime(options, { WebSocketTransport, FetchRequest, MsgPack });
 * ```
 *
 * When provided, you can control whether the client uses MessagePack via the {@link ClientOptions.useBinaryProtocol} client option. If you do not provide this module, then the library will always JSON format for encoding messages.
 */
export declare const MsgPack: unknown;

/**
 * Provides a {@link BaseRealtime} instance with the ability to interact with a channel’s presence set.
 *
 * To create a client that includes this module, include it in the `ModulesMap` that you pass to the {@link BaseRealtime.constructor}:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest, RealtimePresence } from 'ably/modules';
 * const realtime = new BaseRealtime(options, { WebSocketTransport, FetchRequest, RealtimePresence });
 * ```
 *
 * If you do not provide this module, then attempting to access a channel’s {@link ably!RealtimeChannel.presence} property will cause a runtime error.
 */
export declare const RealtimePresence: unknown;

/**
 * The module is experimental and the API is subject to change.
 *
 * Provides a {@link BaseRealtime} instance with the ability to interact with the experiemental channel groups feature.
 *
 * To create a client that includes this module, include it in the `ModulesMap` that you pass to the {@link BaseRealtime.constructor}:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest, RealtimePresence, ChannelGroups } from 'ably/modules';
 * const realtime = new BaseRealtime(options, { WebSocketTransport, FetchRequest, RealtimePresence, ChannelGroups });
 * ```
 *
 * If you do not provide this module, then attempting to use the functionality of channel groups will cause a runtime error.
 *
 * Note that in the experimental client-side simulation of ChannelGroups, you must provide the RealtimePresence module
 * which is required for internal coordination among consumers.
 */
export declare const ChannelGroups: unknown;

/**
 * Provides a {@link BaseRealtime} instance with the ability to establish a connection with the Ably realtime service using a [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) connection.
 *
 * To create a client that includes this module, include it in the `ModulesMap` that you pass to the {@link BaseRealtime.constructor}:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest } from 'ably/modules';
 * const realtime = new BaseRealtime(options, { WebSocketTransport, FetchRequest });
 * ```
 *
 * Note that network conditions, such as firewalls or proxies, might prevent the client from establishing a WebSocket connection. For this reason, you may wish to provide the `BaseRealtime` instance with the ability to alternatively establish a connection using a transport that is less susceptible to these external conditions. You do this by passing one or more alternative transport modules, namely {@link XHRStreaming} and/or {@link XHRPolling}, alongside `WebSocketTransport`:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest } from 'ably/modules';
 * const realtime = new BaseRealtime(options, { WebSocketTransport, XHRStreaming, FetchRequest });
 * ```
 */
export declare const WebSocketTransport: unknown;

/**
 * Provides a {@link BaseRealtime} instance with the ability to establish a connection with the Ably realtime service using the browser’s [XMLHttpRequest API](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest).
 *
 * `XHRPolling` uses HTTP long polling; that is, it will make a new HTTP request each time a message is received from Ably. This is less efficient than {@link XHRStreaming}, but is also more likely to succeed in the presence of certain network conditions such as firewalls or proxies.
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest } from 'ably/modules';
 * const realtime = new BaseRealtime(options, { XHRPolling, FetchRequest });
 * ```
 *
 * Provide this module if, for example, you wish the client to have an alternative mechanism for connecting to Ably if it’s unable to establish a WebSocket connection.
 */
export declare const XHRPolling: unknown;

/**
 * Provides a {@link BaseRealtime} instance with the ability to establish a connection with the Ably realtime service using the browser’s [XMLHttpRequest API](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest).
 *
 * `XHRStreaming` uses HTTP streaming; that is, in contrast to {@link XHRPolling}, it does not need to make a new HTTP request each time a message is received from Ably. This is more efficient than `XHRPolling`, but is more likely to be blocked by certain network conditions such as firewalls or proxies.
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest } from 'ably/modules';
 * const realtime = new BaseRealtime(options, { XHRStreaming, FetchRequest });
 * ```
 *
 * Provide this module if, for example, you wish the client to have an alternative mechanism for connecting to Ably if it’s unable to establish a WebSocket connection.
 */
export declare const XHRStreaming: unknown;

/**
 * Provides a {@link BaseRest} or {@link BaseRealtime} instance with the ability to make HTTP requests using the browser’s [XMLHttpRequest API](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest).
 *
 * To create a client that includes this module, include it in the `ModulesMap` that you pass to the {@link BaseRealtime.constructor}:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, XHRRequest } from 'ably/modules';
 * const realtime = new BaseRealtime(options, { WebSocketTransport, XHRRequest });
 * ```
 */
export declare const XHRRequest: unknown;

/**
 * Provides a {@link BaseRest} or {@link BaseRealtime} instance with the ability to make HTTP requests using the browser’s [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).
 *
 * To create a client that includes this module, include it in the `ModulesMap` that you pass to the {@link BaseRealtime.constructor}:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest } from 'ably/modules';
 * const realtime = new BaseRealtime(options, { WebSocketTransport, FetchRequest });
 * ```
 */
export declare const FetchRequest: unknown;

/**
 * Provides a {@link BaseRealtime} instance with the ability to filter channel subscriptions at runtime using { @link ably!RealtimeChannel.subscribe:WITH_MESSAGE_FILTER | the overload of `subscribe()` that accepts a `MessageFilter` }.
 *
 * To create a client that includes this module, include it in the `ModulesMap` that you pass to the {@link BaseRealtime.constructor}:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest, MessageInteractions } from 'ably/modules';
 * const realtime = new BaseRealtime(options, { WebSocketTransport, FetchRequest, MessageInteractions });
 * ```
 *
 * If you do not provide this module, then attempting to use this overload of `subscribe()` will cause a runtime error.
 */
export declare const MessageInteractions: unknown;

/**
 * Provides a {@link BaseRealtime} instance with the ability to use [delta compression](https://www.ably.com/docs/realtime/channels/channel-parameters/deltas).
 *
 * To create a client that includes this module, include it in the `ModulesMap` that you pass to the {@link BaseRealtime.constructor}:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest, Vcdiff } from 'ably/modules';
 * const realtime = new BaseRealtime(options, { WebSocketTransport, FetchRequest, Vcdiff });
 * ```
 *
 * For information on how to configure a channel to use delta encoding, see [the documentation in the `README`](https://github.com/ably/ably-js/blob/main/README.md#configuring-a-channel-to-operate-in-delta-mode).
 */
export declare const Vcdiff: unknown;

/**
 * Pass a `ModulesMap` to { @link BaseRest.constructor | the constructor of BaseRest } or {@link BaseRealtime.constructor | that of BaseRealtime} to specify which functionality should be made available to that client.
 */
export interface ModulesMap {
  /**
   * See {@link Rest | documentation for the `Rest` module}.
   */
  Rest?: typeof Rest;

  /**
   * See {@link Crypto | documentation for the `Crypto` module}.
   */
  Crypto?: typeof Crypto;

  /**
   * See {@link MsgPack | documentation for the `MsgPack` module}.
   */
  MsgPack?: typeof MsgPack;

  /**
   * See {@link RealtimePresence | documentation for the `RealtimePresence` module}.
   */
  RealtimePresence?: typeof RealtimePresence;

  /**
   * See {@link ChannelGroups | documentation for the `ChannelGroups` module}.
   */
  ChannelGroups?: typeof ChannelGroups;

  /**
   * See {@link WebSocketTransport | documentation for the `WebSocketTransport` module}.
   */
  WebSocketTransport?: typeof WebSocketTransport;

  /**
   * See {@link XHRPolling | documentation for the `XHRPolling` module}.
   */
  XHRPolling?: typeof XHRPolling;

  /**
   * See {@link XHRStreaming | documentation for the `XHRStreaming` module}.
   */
  XHRStreaming?: typeof XHRStreaming;

  /**
   * See {@link XHRRequest | documentation for the `XHRRequest` module}.
   */
  XHRRequest?: typeof XHRRequest;

  /**
   * See {@link FetchRequest | documentation for the `FetchRequest` module}.
   */
  FetchRequest?: typeof FetchRequest;

  /**
   * See {@link MessageInteractions | documentation for the `MessageInteractions` module}.
   */
  MessageInteractions?: typeof MessageInteractions;

  /**
   * See {@link Vcdiff | documentation for the `Vcdiff` module}.
   */
  Vcdiff?: typeof Vcdiff;
}

/**
 * A client that offers a simple stateless API to interact directly with Ably's REST API.
 *
 * `BaseRest` is the equivalent, in the modular variant of the Ably Client Library SDK, of the [`Rest`](../../default/classes/Rest.html) class in the default variant of the SDK. The difference is that its constructor allows you to decide exactly which functionality the client should include. This allows unused functionality to be tree-shaken, reducing bundle size.
 *
 * > **Note**
 * >
 * > In order to further reduce bundle size, `BaseRest` performs less logging than the `Rest` class exported by the default variant of the SDK. It only logs:
 * >
 * > - messages that have a {@link ClientOptions.logLevel | `logLevel`} of 1 (that is, errors)
 * > - a small number of other network events
 * >
 * > If you need more verbose logging, use the default variant of the SDK.
 */
export declare class BaseRest implements RestClient {
  /**
   * Construct a client object using an Ably {@link ClientOptions} object.
   *
   * @param options - A {@link ClientOptions} object to configure the client connection to Ably.
   * @param modules - An object which describes which functionality the client should offer. See the documentation for {@link ModulesMap}.
   *
   * You must provide at least one HTTP request implementation; that is, one of {@link FetchRequest} or {@link XHRRequest}. For minimum bundle size, favour `FetchRequest`.
   *
   * The {@link Rest} module is always implicitly included.
   */
  constructor(options: ClientOptions, modules: ModulesMap);

  // Requirements of RestClient

  auth: Auth;
  channels: Channels<Channel>;
  request<T = any>(
    method: string,
    path: string,
    version: number,
    params?: any,
    body?: any[] | any,
    headers?: any
  ): Promise<HttpPaginatedResponse<T>>;
  stats(params?: StatsParams | any): Promise<PaginatedResult<Stats>>;
  time(): Promise<number>;
  batchPublish(spec: BatchPublishSpec): Promise<BatchResult<BatchPublishSuccessResult | BatchPublishFailureResult>>;
  batchPublish(
    specs: BatchPublishSpec[]
  ): Promise<BatchResult<BatchPublishSuccessResult | BatchPublishFailureResult>[]>;
  batchPresence(channels: string[]): Promise<BatchResult<BatchPresenceSuccessResult | BatchPresenceFailureResult>[]>;
  push: Push;
}

/**
 * A client that extends the functionality of {@link BaseRest} and provides additional realtime-specific features.
 *
 * `BaseRealtime` is the equivalent, in the modular variant of the Ably Client Library SDK, of the [`Realtime`](../../default/classes/Realtime.html) class in the default variant of the SDK. The difference is that its constructor allows you to decide exactly which functionality the client should include. This allows unused functionality to be tree-shaken, reducing bundle size.
 *
 * > **Note**
 * >
 * > In order to further reduce bundle size, `BaseRealtime` performs less logging than the `Realtime` class exported by the default variant of the SDK. It only logs:
 * >
 * > - messages that have a {@link ClientOptions.logLevel | `logLevel`} of 1 (that is, errors)
 * > - a small number of other network events
 * >
 * > If you need more verbose logging, use the default variant of the SDK.
 */
export declare class BaseRealtime implements RealtimeClient {
  /**
   * Construct a client object using an Ably {@link ClientOptions} object.
   *
   * @param options - A {@link ClientOptions} object to configure the client connection to Ably.
   * @param modules - An object which describes which functionality the client should offer. See the documentation for {@link ModulesMap}.
   *
   * You must provide:
   *
   * - at least one HTTP request implementation; that is, one of {@link FetchRequest} or {@link XHRRequest} — for minimum bundle size, favour `FetchRequest`;
   * - at least one realtime transport implementation; that is, one of {@link WebSocketTransport}, {@link XHRStreaming}, or {@link XHRPolling} — for minimum bundle size, favour `WebSocketTransport`.
   */
  constructor(options: ClientOptions, modules: ModulesMap);

  // Requirements of RealtimeClient

  clientId: string;
  close(): void;
  connect(): void;
  auth: Auth;
  channels: Channels<RealtimeChannel>;
  /**
   * This is a preview feature and may change in a future non-major release.
   */
  channelGroups: ChannelGroupsImpl;
  connection: Connection;
  request<T = any>(
    method: string,
    path: string,
    version: number,
    params?: any,
    body?: any[] | any,
    headers?: any
  ): Promise<HttpPaginatedResponse<T>>;
  stats(params?: StatsParams | any): Promise<PaginatedResult<Stats>>;
  time(): Promise<number>;
  batchPublish(spec: BatchPublishSpec): Promise<BatchResult<BatchPublishSuccessResult | BatchPublishFailureResult>>;
  batchPublish(
    specs: BatchPublishSpec[]
  ): Promise<BatchResult<BatchPublishSuccessResult | BatchPublishFailureResult>[]>;
  batchPresence(channels: string[]): Promise<BatchResult<BatchPresenceSuccessResult | BatchPresenceFailureResult>[]>;
  push: Push;
}

export { ErrorInfo };
