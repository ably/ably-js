import { Types, ErrorInfo } from './ably';

export declare const generateRandomKey: Types.Crypto['generateRandomKey'];
export declare const getDefaultCryptoParams: Types.Crypto['getDefaultParams'];
export declare const decodeMessage: Types.MessageStatic['fromEncoded'];
export declare const decodeEncryptedMessage: Types.MessageStatic['fromEncoded'];
export declare const decodeMessages: Types.MessageStatic['fromEncodedArray'];
export declare const decodeEncryptedMessages: Types.MessageStatic['fromEncodedArray'];
export declare const decodePresenceMessage: Types.PresenceMessageStatic['fromEncoded'];
export declare const decodePresenceMessages: Types.PresenceMessageStatic['fromEncodedArray'];
export declare const constructPresenceMessage: Types.PresenceMessageStatic['fromValues'];

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
 * - { @link Types.Push | push admin }
 * - { @link BaseRealtime.time | retrieving Ably service time }
 * - { @link BaseRealtime.stats | retrieving your application’s usage statistics }
 * - { @link BaseRealtime.request | making arbitrary REST requests }
 * - { @link BaseRealtime.batchPublish | batch publishing of messages }
 * - { @link BaseRealtime.batchPresence | batch retrieval of channel presence state }
 * - { @link Types.Auth.revokeTokens | requesting the revocation of tokens }
 * - { @link Types.RealtimeChannel.history | retrieving the message history of a channel }
 * - { @link Types.RealtimePresence.history | retrieving the presence history of a channel }
 *
 * If this module is not provided, then trying to use the above functionality will cause a runtime error.
 */
export declare const Rest: unknown;

/**
 * Provides a {@link BaseRest} or {@link BaseRealtime} instance with the ability to encrypt and decrypt {@link Types.Message} payloads.
 *
 * To create a client that includes this module, include it in the `ModulesMap` that you pass to the {@link BaseRealtime.constructor}:
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest, Crypto } from 'ably/modules';
 * const realtime = new BaseRealtime(options, { WebSocketTransport, FetchRequest, Crypto });
 * ```
 *
 * When provided, you can configure message encryption on a channel via the {@link Types.ChannelOptions.cipher} property of the `ChannelOptions` that you pass when {@link Types.Channels.get | fetching a channel}. If this module is not provided, then passing a `ChannelOptions` with a `cipher` property will cause a runtime error.
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
 * When provided, you can control whether the client uses MessagePack via the {@link Types.ClientOptions.useBinaryProtocol} client option. If you do not provide this module, then the library will always JSON format for encoding messages.
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
 * If you do not provide this module, then attempting to access a channel’s {@link Types.RealtimeChannel.presence} property will cause a runtime error.
 */
export declare const RealtimePresence: unknown;

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
 * Provides a {@link BaseRealtime} instance with the ability to filter channel subscriptions at runtime using { @link Types.RealtimeChannel.subscribe:WITH_MESSAGE_FILTER | the overload of `subscribe()` that accepts a `MessageFilter` }.
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
 */
export declare class BaseRest extends Types.Rest {
  /**
   * Construct a client object using an Ably {@link Types.ClientOptions} object.
   *
   * @param options - A {@link Types.ClientOptions} object to configure the client connection to Ably.
   * @param modules - An object which describes which functionality the client should offer. See the documentation for {@link ModulesMap}.
   *
   * You must provide at least one HTTP request implementation; that is, one of {@link FetchRequest} or {@link XHRRequest}. For minimum bundle size, favour `FetchRequest`.
   *
   * The {@link Rest} module is always implicitly included.
   */
  constructor(options: Types.ClientOptions, modules: ModulesMap);
}

/**
 * A client that extends the functionality of {@link BaseRest} and provides additional realtime-specific features.
 *
 * `BaseRealtime` is the equivalent, in the modular variant of the Ably Client Library SDK, of the [`Realtime`](../../default/classes/Realtime.html) class in the default variant of the SDK. The difference is that its constructor allows you to decide exactly which functionality the client should include. This allows unused functionality to be tree-shaken, reducing bundle size.
 */
export declare class BaseRealtime extends Types.Realtime {
  /**
   * Construct a client object using an Ably {@link Types.ClientOptions} object.
   *
   * @param options - A {@link Types.ClientOptions} object to configure the client connection to Ably.
   * @param modules - An object which describes which functionality the client should offer. See the documentation for {@link ModulesMap}.
   *
   * You must provide:
   *
   * - at least one HTTP request implementation; that is, one of {@link FetchRequest} or {@link XHRRequest} — for minimum bundle size, favour `FetchRequest`;
   * - at least one realtime transport implementation; that is, one of {@link WebSocketTransport}, {@link XHRStreaming}, or {@link XHRPolling} — for minimum bundle size, favour `WebSocketTransport`.
   */
  constructor(options: Types.ClientOptions, modules: ModulesMap);
}

export { Types, ErrorInfo };
