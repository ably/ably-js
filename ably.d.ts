// Type definitions for Ably Realtime and Rest client library 1.2
// Project: https://www.ably.com/
// Definitions by: Ably <https://github.com/ably/>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/**
 * You are currently viewing the default variant of the Ably JavaScript Client Library SDK. View the modular variant {@link modular | here}.
 *
 * To get started with the Ably JavaScript Client Library SDK, follow the [Quickstart Guide](https://ably.com/docs/quick-start-guide) or view the introductions to the [realtime](https://ably.com/docs/realtime/usage) and [REST](https://ably.com/docs/rest/usage) interfaces.
 *
 * @module
 */

/**
 * The `ChannelStates` namespace describes the possible values of the {@link ChannelState} type.
 */
declare namespace ChannelStates {
  /**
   * The channel has been initialized but no attach has yet been attempted.
   */
  type INITIALIZED = 'initialized';
  /**
   * An attach has been initiated by sending a request to Ably. This is a transient state, followed either by a transition to `ATTACHED`, `SUSPENDED`, or `FAILED`.
   */
  type ATTACHING = 'attaching';
  /**
   * The attach has succeeded. In the `ATTACHED` state a client may publish and subscribe to messages, or be present on the channel.
   */
  type ATTACHED = 'attached';
  /**
   * A detach has been initiated on an `ATTACHED` channel by sending a request to Ably. This is a transient state, followed either by a transition to `DETACHED` or `FAILED`.
   */
  type DETACHING = 'detaching';
  /**
   * The channel, having previously been `ATTACHED`, has been detached by the user.
   */
  type DETACHED = 'detached';
  /**
   * The channel, having previously been `ATTACHED`, has lost continuity, usually due to the client being disconnected from Ably for longer than two minutes. It will automatically attempt to reattach as soon as connectivity is restored.
   */
  type SUSPENDED = 'suspended';
  /**
   * An indefinite failure condition. This state is entered if a channel error has been received from the Ably service, such as an attempt to attach without the necessary access rights.
   */
  type FAILED = 'failed';
}
/**
 * Describes the possible states of a {@link Channel} or {@link RealtimeChannel} object.
 */
export type ChannelState =
  | ChannelStates.FAILED
  | ChannelStates.INITIALIZED
  | ChannelStates.SUSPENDED
  | ChannelStates.ATTACHED
  | ChannelStates.ATTACHING
  | ChannelStates.DETACHED
  | ChannelStates.DETACHING;

/**
 * The `ChannelEvents` namespace describes the possible values of the {@link ChannelEvent} type.
 */
declare namespace ChannelEvents {
  /**
   * The channel has been initialized but no attach has yet been attempted.
   */
  type INITIALIZED = 'initialized';
  /**
   * An attach has been initiated by sending a request to Ably. This is a transient state, followed either by a transition to `ATTACHED`, `SUSPENDED`, or `FAILED`.
   */
  type ATTACHING = 'attaching';
  /**
   * The attach has succeeded. In the `ATTACHED` state a client may publish and subscribe to messages, or be present on the channel.
   */
  type ATTACHED = 'attached';
  /**
   * A detach has been initiated on an `ATTACHED` channel by sending a request to Ably. This is a transient state, followed either by a transition to `DETACHED` or `FAILED`.
   */
  type DETACHING = 'detaching';
  /**
   * The channel, having previously been `ATTACHED`, has been detached by the user.
   */
  type DETACHED = 'detached';
  /**
   * The channel, having previously been `ATTACHED`, has lost continuity, usually due to the client being disconnected from Ably for longer than two minutes. It will automatically attempt to reattach as soon as connectivity is restored.
   */
  type SUSPENDED = 'suspended';
  /**
   * An indefinite failure condition. This state is entered if a channel error has been received from the Ably service, such as an attempt to attach without the necessary access rights.
   */
  type FAILED = 'failed';
  /**
   * An event for changes to channel conditions that do not result in a change in {@link ChannelState}.
   */
  type UPDATE = 'update';
}
/**
 * Describes the events emitted by a {@link Channel} or {@link RealtimeChannel} object. An event is either an `UPDATE` or a {@link ChannelState}.
 */
export type ChannelEvent =
  | ChannelEvents.FAILED
  | ChannelEvents.INITIALIZED
  | ChannelEvents.SUSPENDED
  | ChannelEvents.ATTACHED
  | ChannelEvents.ATTACHING
  | ChannelEvents.DETACHED
  | ChannelEvents.DETACHING
  | ChannelEvents.UPDATE;

/**
 * The `ConnectionStates` namespace describes the possible values of the {@link ConnectionState} type.
 */
declare namespace ConnectionStates {
  /**
   * A connection with this state has been initialized but no connection has yet been attempted.
   */
  type INITIALIZED = 'initialized';
  /**
   * A connection attempt has been initiated. The connecting state is entered as soon as the library has completed initialization, and is reentered each time connection is re-attempted following disconnection.
   */
  type CONNECTING = 'connecting';
  /**
   * A connection exists and is active.
   */
  type CONNECTED = 'connected';
  /**
   * A temporary failure condition. No current connection exists because there is no network connectivity or no host is available. The disconnected state is entered if an established connection is dropped, or if a connection attempt was unsuccessful. In the disconnected state the library will periodically attempt to open a new connection (approximately every 15 seconds), anticipating that the connection will be re-established soon and thus connection and channel continuity will be possible. In this state, developers can continue to publish messages as they are automatically placed in a local queue, to be sent as soon as a connection is reestablished. Messages published by other clients while this client is disconnected will be delivered to it upon reconnection, so long as the connection was resumed within 2 minutes. After 2 minutes have elapsed, recovery is no longer possible and the connection will move to the `SUSPENDED` state.
   */
  type DISCONNECTED = 'disconnected';
  /**
   * A long term failure condition. No current connection exists because there is no network connectivity or no host is available. The suspended state is entered after a failed connection attempt if there has then been no connection for a period of two minutes. In the suspended state, the library will periodically attempt to open a new connection every 30 seconds. Developers are unable to publish messages in this state. A new connection attempt can also be triggered by an explicit call to {@link Connection.connect | `connect()`}. Once the connection has been re-established, channels will be automatically re-attached. The client has been disconnected for too long for them to resume from where they left off, so if it wants to catch up on messages published by other clients while it was disconnected, it needs to use the [History API](https://ably.com/docs/realtime/history).
   */
  type SUSPENDED = 'suspended';
  /**
   * An explicit request by the developer to close the connection has been sent to the Ably service. If a reply is not received from Ably within a short period of time, the connection is forcibly terminated and the connection state becomes `CLOSED`.
   */
  type CLOSING = 'closing';
  /**
   * The connection has been explicitly closed by the client. In the closed state, no reconnection attempts are made automatically by the library, and clients may not publish messages. No connection state is preserved by the service or by the library. A new connection attempt can be triggered by an explicit call to {@link Connection.connect | `connect()`}, which results in a new connection.
   */
  type CLOSED = 'closed';
  /**
   * This state is entered if the client library encounters a failure condition that it cannot recover from. This may be a fatal connection error received from the Ably service, for example an attempt to connect with an incorrect API key, or a local terminal error, for example the token in use has expired and the library does not have any way to renew it. In the failed state, no reconnection attempts are made automatically by the library, and clients may not publish messages. A new connection attempt can be triggered by an explicit call to {@link Connection.connect | `connect()`}.
   */
  type FAILED = 'failed';
}
/**
 * Describes the realtime {@link Connection} object states.
 */
export type ConnectionState =
  | ConnectionStates.INITIALIZED
  | ConnectionStates.CONNECTED
  | ConnectionStates.CONNECTING
  | ConnectionStates.DISCONNECTED
  | ConnectionStates.SUSPENDED
  | ConnectionStates.CLOSED
  | ConnectionStates.CLOSING
  | ConnectionStates.FAILED;

/**
 * The `ConnectionEvents` namespace describes the possible values of the {@link ConnectionEvent} type.
 */
declare namespace ConnectionEvents {
  /**
   * A connection with this state has been initialized but no connection has yet been attempted.
   */
  type INITIALIZED = 'initialized';
  /**
   * A connection attempt has been initiated. The connecting state is entered as soon as the library has completed initialization, and is reentered each time connection is re-attempted following disconnection.
   */
  type CONNECTING = 'connecting';
  /**
   * A connection exists and is active.
   */
  type CONNECTED = 'connected';
  /**
   * A temporary failure condition. No current connection exists because there is no network connectivity or no host is available. The disconnected state is entered if an established connection is dropped, or if a connection attempt was unsuccessful. In the disconnected state the library will periodically attempt to open a new connection (approximately every 15 seconds), anticipating that the connection will be re-established soon and thus connection and channel continuity will be possible. In this state, developers can continue to publish messages as they are automatically placed in a local queue, to be sent as soon as a connection is reestablished. Messages published by other clients while this client is disconnected will be delivered to it upon reconnection, so long as the connection was resumed within 2 minutes. After 2 minutes have elapsed, recovery is no longer possible and the connection will move to the `SUSPENDED` state.
   */
  type DISCONNECTED = 'disconnected';
  /**
   * A long term failure condition. No current connection exists because there is no network connectivity or no host is available. The suspended state is entered after a failed connection attempt if there has then been no connection for a period of two minutes. In the suspended state, the library will periodically attempt to open a new connection every 30 seconds. Developers are unable to publish messages in this state. A new connection attempt can also be triggered by an explicit call to {@link Connection.connect | `connect()`}. Once the connection has been re-established, channels will be automatically re-attached. The client has been disconnected for too long for them to resume from where they left off, so if it wants to catch up on messages published by other clients while it was disconnected, it needs to use the [History API](https://ably.com/docs/realtime/history).
   */
  type SUSPENDED = 'suspended';
  /**
   * An explicit request by the developer to close the connection has been sent to the Ably service. If a reply is not received from Ably within a short period of time, the connection is forcibly terminated and the connection state becomes `CLOSED`.
   */
  type CLOSING = 'closing';
  /**
   * The connection has been explicitly closed by the client. In the closed state, no reconnection attempts are made automatically by the library, and clients may not publish messages. No connection state is preserved by the service or by the library. A new connection attempt can be triggered by an explicit call to {@link Connection.connect | `connect()`}, which results in a new connection.
   */
  type CLOSED = 'closed';
  /**
   * This state is entered if the client library encounters a failure condition that it cannot recover from. This may be a fatal connection error received from the Ably service, for example an attempt to connect with an incorrect API key, or a local terminal error, for example the token in use has expired and the library does not have any way to renew it. In the failed state, no reconnection attempts are made automatically by the library, and clients may not publish messages. A new connection attempt can be triggered by an explicit call to {@link Connection.connect | `connect()`}.
   */
  type FAILED = 'failed';
  /**
   * An event for changes to connection conditions for which the {@link ConnectionState} does not change.
   */
  type UPDATE = 'update';
}
/**
 * Describes the events emitted by a {@link Connection} object. An event is either an `UPDATE` or a {@link ConnectionState}.
 */
export type ConnectionEvent =
  | ConnectionEvents.INITIALIZED
  | ConnectionEvents.CONNECTED
  | ConnectionEvents.CONNECTING
  | ConnectionEvents.DISCONNECTED
  | ConnectionEvents.SUSPENDED
  | ConnectionEvents.CLOSED
  | ConnectionEvents.CLOSING
  | ConnectionEvents.FAILED
  | ConnectionEvents.UPDATE;

/**
 * The `PresenceActions` namespace describes the possible values of the {@link PresenceAction} type.
 */
declare namespace PresenceActions {
  /**
   * A member is not present in the channel.
   */
  type ABSENT = 'absent';
  /**
   * When subscribing to presence events on a channel that already has members present, this event is emitted for every member already present on the channel before the subscribe listener was registered.
   */
  type PRESENT = 'present';
  /**
   * A new member has entered the channel.
   */
  type ENTER = 'enter';
  /**
   * A member who was present has now left the channel. This may be a result of an explicit request to leave or implicitly when detaching from the channel. Alternatively, if a member's connection is abruptly disconnected and they do not resume their connection within a minute, Ably treats this as a leave event as the client is no longer present.
   */
  type LEAVE = 'leave';
  /**
   * An already present member has updated their member data. Being notified of member data updates can be very useful, for example, it can be used to update the status of a user when they are typing a message.
   */
  type UPDATE = 'update';
}
/**
 * Describes the possible actions members in the presence set can emit.
 */
export type PresenceAction =
  | PresenceActions.ABSENT
  | PresenceActions.PRESENT
  | PresenceActions.ENTER
  | PresenceActions.LEAVE
  | PresenceActions.UPDATE;

/**
 * The `StatsIntervalGranularities` namespace describes the possible values of the {@link StatsIntervalGranularity} type.
 */
declare namespace StatsIntervalGranularities {
  /**
   * Interval unit over which statistics are gathered as minutes.
   */
  type MINUTE = 'minute';
  /**
   * Interval unit over which statistics are gathered as hours.
   */
  type HOUR = 'hour';
  /**
   * Interval unit over which statistics are gathered as days.
   */
  type DAY = 'day';
  /**
   * Interval unit over which statistics are gathered as months.
   */
  type MONTH = 'month';
}
/**
 * Describes the interval unit over which statistics are gathered.
 */
export type StatsIntervalGranularity =
  | StatsIntervalGranularities.MINUTE
  | StatsIntervalGranularities.HOUR
  | StatsIntervalGranularities.DAY
  | StatsIntervalGranularities.MONTH;

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
 * Contains the details of a {@link Channel} or {@link RealtimeChannel} object such as its ID and {@link ChannelStatus}.
 */
export interface ChannelDetails {
  /**
   * The identifier of the channel.
   */
  channelId: string;
  /**
   * A {@link ChannelStatus} object.
   */
  status: ChannelStatus;
}

/**
 * Contains the status of a {@link Channel} or {@link RealtimeChannel} object such as whether it is active and its {@link ChannelOccupancy}.
 */
export interface ChannelStatus {
  /**
   * If `true`, the channel is active, otherwise `false`.
   */
  isActive: boolean;
  /**
   * A {@link ChannelOccupancy} object.
   */
  occupancy: ChannelOccupancy;
}

/**
 * Contains the metrics of a {@link Channel} or {@link RealtimeChannel} object.
 */
export interface ChannelOccupancy {
  /**
   * A {@link ChannelMetrics} object.
   */
  metrics: ChannelMetrics;
}

/**
 * Contains the metrics associated with a {@link Channel} or {@link RealtimeChannel}, such as the number of publishers, subscribers and connections it has.
 */
export interface ChannelMetrics {
  /**
   * The number of realtime connections attached to the channel.
   */
  connections: number;
  /**
   * The number of realtime connections attached to the channel with permission to enter the presence set, regardless of whether or not they have entered it. This requires the `presence` capability and for a client to not have specified a {@link ChannelMode} flag that excludes {@link ChannelModes.PRESENCE}.
   */
  presenceConnections: number;
  /**
   * The number of members in the presence set of the channel.
   */
  presenceMembers: number;
  /**
   * The number of realtime attachments receiving presence messages on the channel. This requires the `subscribe` capability and for a client to not have specified a {@link ChannelMode} flag that excludes {@link ChannelModes.PRESENCE_SUBSCRIBE}.
   */
  presenceSubscribers: number;
  /**
   * The number of realtime attachments permitted to publish messages to the channel. This requires the `publish` capability and for a client to not have specified a {@link ChannelMode} flag that excludes {@link ChannelModes.PUBLISH}.
   */
  publishers: number;
  /**
   * The number of realtime attachments receiving messages on the channel. This requires the `subscribe` capability and for a client to not have specified a {@link ChannelMode} flag that excludes {@link ChannelModes.SUBSCRIBE}.
   */
  subscribers: number;
}

/**
 * Passes additional client-specific properties to the REST constructor or the Realtime constructor.
 */
export interface ClientOptions<Plugins = CorePlugins> extends AuthOptions {
  /**
   * When `true`, the client connects to Ably as soon as it is instantiated. You can set this to `false` and explicitly connect to Ably using the {@link Connection.connect | `connect()`} method. The default is `true`.
   *
   * @defaultValue `true`
   */
  autoConnect?: boolean;

  /**
   * When a {@link TokenParams} object is provided, it overrides the client library defaults when issuing new Ably Tokens or Ably {@link TokenRequest | `TokenRequest`s}.
   */
  defaultTokenParams?: TokenParams;

  /**
   * If `false`, prevents messages originating from this connection being echoed back on the same connection. The default is `true`.
   *
   * @defaultValue `true`
   */
  echoMessages?: boolean;

  /**
   * Enables a [custom environment](https://ably.com/docs/platform-customization) to be used with the Ably service.
   */
  environment?: string;

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
   * If `false`, this disables the default behavior whereby the library queues messages on a connection in the disconnected or connecting states. The default behavior enables applications to submit messages immediately upon instantiating the library without having to wait for the connection to be established. Applications may use this option to disable queueing if they wish to have application-level control over the queueing. The default is `true`.
   *
   * @defaultValue `true`
   */
  queueMessages?: boolean;

  /**
   * Enables a non-default Ably host to be specified. For development environments only. The default value is `rest.ably.io`.
   *
   * @defaultValue `"rest.ably.io"`
   */
  restHost?: string;

  /**
   * Enables a non-default Ably host to be specified for realtime connections. For development environments only. The default value is `realtime.ably.io`.
   *
   * @defaultValue `"realtime.ably.io"`
   */
  realtimeHost?: string;

  /**
   * An array of fallback hosts to be used in the case of an error necessitating the use of an alternative host. If you have been provided a set of custom fallback hosts by Ably, please specify them here.
   *
   * @defaultValue `['a.ably-realtime.com', 'b.ably-realtime.com', 'c.ably-realtime.com', 'd.ably-realtime.com', 'e.ably-realtime.com']``
   */
  fallbackHosts?: string[];

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
   * Enables a connection to inherit the state of a previous connection that may have existed under a different instance of the Realtime library. This might typically be used by clients of the browser library to ensure connection state can be preserved when the user refreshes the page. A recovery key string can be explicitly provided, or alternatively if a callback function is provided, the client library will automatically persist the recovery key between page reloads and call the callback when the connection is recoverable. The callback is then responsible for confirming whether the connection should be recovered or not. See [connection state recovery](https://ably.com/docs/realtime/connection/#connection-state-recovery) for further information.
   */
  recover?: string | recoverConnectionCallback;

  /**
   * If specified, the SDK's internal persistence mechanism for storing the recovery key
   * over page loads (see the `recover` client option) will store the recovery key under
   * this identifier (in sessionstorage), so only another library instance which specifies
   * the same recoveryKeyStorageName will attempt to recover from it. This is useful if you have
   * multiple ably-js instances sharing a given origin (the origin being the scope of
   * sessionstorage), as otherwise the multiple instances will overwrite each other's
   * recovery keys, and after a reload they will all try and recover the same connection,
   * which is not permitted and will cause broken behaviour.
   */
  recoveryKeyStorageName?: string;

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
   * Override the URL used by the realtime client to check if the internet is available.
   *
   * In the event of a failure to connect to the primary endpoint, the client will send a
   * GET request to this URL to check if the internet is available. If this request returns
   * a success response the client will attempt to connect to a fallback host.
   */
  connectivityCheckUrl?: string;

  /**
   * Disable the check used by the realtime client to check if the internet
   * is available before connecting to a fallback host.
   */
  disableConnectivityCheck?: boolean;

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
   * When `true`, the client library will automatically send a close request to Ably whenever the `window` [`beforeunload` event](https://developer.mozilla.org/en-US/docs/Web/API/BeforeUnloadEvent) fires. By enabling this option, the close request sent to Ably ensures the connection state will not be retained and all channels associated with the channel will be detached. This is commonly used by developers who want presence leave events to fire immediately (that is, if a user navigates to another page or closes their browser, then enabling this option will result in the presence member leaving immediately). Without this option or an explicit call to the `close` method of the `Connection` object, Ably expects that the abruptly disconnected connection could later be recovered and therefore does not immediately remove the user from presence. Instead, to avoid “twitchy” presence behaviour an abruptly disconnected client is removed from channels in which they are present after 15 seconds, and the connection state is retained for two minutes. Defaults to `true`.
   */
  closeOnUnload?: boolean;

  /**
   * When `true`, enables idempotent publishing by assigning a unique message ID client-side, allowing the Ably servers to discard automatic publish retries following a failure such as a network fault. The default is `true`.
   *
   * @defaultValue `true`
   */
  idempotentRestPublishing?: boolean;

  /**
   * A set of key-value pairs that can be used to pass in arbitrary connection parameters, such as [`heartbeatInterval`](https://ably.com/docs/realtime/connection#heartbeats) or [`remainPresentFor`](https://ably.com/docs/realtime/presence#unstable-connections).
   */
  transportParams?: { [k: string]: string | number };

  /**
   * An array of transports to use, in descending order of preference. In the browser environment the available transports are: `web_socket` and `xhr`.
   */
  transports?: Transport[];

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

  /**
   * Timeout for the wait of acknowledgement for operations performed via a realtime connection, before the client library considers a request failed and triggers a failure condition. Operations include establishing a connection with Ably, or sending a `HEARTBEAT`, `CONNECT`, `ATTACH`, `DETACH` or `CLOSE` request. It is the equivalent of `httpRequestTimeout` but for realtime operations, rather than REST. The default is 10 seconds.
   *
   * @defaultValue 10s
   */
  realtimeRequestTimeout?: number;

  /**
   * A map between a plugin type and a plugin object.
   */
  plugins?: Plugins;

  /**
   * The maximum message size is an attribute of an Ably account which represents the largest permitted payload size of a single message or set of messages published in a single operation. Publish requests whose payload exceeds this limit are rejected by the server. `maxMessageSize` enables the client to enforce, or further restrict, the maximum size of a single message or set of messages published via REST. The default value is `65536` (64 KiB). In the case of a realtime connection, the server may indicate the associated maximum message size on connection establishment; this value takes precedence over the client's default `maxMessageSize`.
   *
   * @defaultValue 65536
   */
  maxMessageSize?: number;

  /**
   * A URL pointing to a service worker script which is used as the target for web push notifications.
   */
  pushServiceWorkerUrl?: string;
}

/**
 * Describes the {@link ClientOptions.plugins | plugins} accepted by all variants of the SDK.
 */
export interface CorePlugins {
  /**
   * A plugin capable of decoding `vcdiff`-encoded messages. For more information on how to configure a channel to use delta encoding, see the [documentation for the `@ably-forks/vcdiff-decoder` package](https://github.com/ably-forks/vcdiff-decoder#usage).
   */
  vcdiff?: any;

  /**
   * A plugin which allows the client to be the target of push notifications.
   */
  Push?: unknown;
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
 * [Channel Parameters](https://ably.com/docs/realtime/channels/channel-parameters/overview) used within {@link ChannelOptions}.
 */
export type ChannelParams = { [key: string]: string };

/**
 * The `ChannelModes` namespace describes the possible values of the {@link ChannelMode} type.
 */
declare namespace ChannelModes {
  /**
   * The client can publish messages.
   */
  type PUBLISH = 'PUBLISH';
  /**
   * The client can subscribe to messages.
   */
  type SUBSCRIBE = 'SUBSCRIBE';
  /**
   * The client can enter the presence set.
   */
  type PRESENCE = 'PRESENCE';
  /**
   * The client can receive presence messages.
   */
  type PRESENCE_SUBSCRIBE = 'PRESENCE_SUBSCRIBE';
  /**
   * The client is resuming an existing connection.
   */
  type ATTACH_RESUME = 'ATTACH_RESUME';
}

/**
 * Describes the possible flags used to configure client capabilities, using {@link ChannelOptions}.
 */
export type ChannelMode =
  | ChannelModes.PUBLISH
  | ChannelModes.SUBSCRIBE
  | ChannelModes.PRESENCE
  | ChannelModes.PRESENCE_SUBSCRIBE
  | ChannelModes.ATTACH_RESUME;

/**
 * Passes additional properties to a {@link Channel} or {@link RealtimeChannel} object, such as encryption, {@link ChannelMode} and channel parameters.
 */
export interface ChannelOptions {
  /**
   * Requests encryption for this channel when not null, and specifies encryption-related parameters (such as algorithm, chaining mode, key length and key). See [an example](https://ably.com/docs/realtime/encryption#getting-started). When running in a browser, encryption is only available when the current environment is a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts).
   */
  cipher?: CipherParamOptions | CipherParams;
  /**
   * [Channel Parameters](https://ably.com/docs/realtime/channels/channel-parameters/overview) that configure the behavior of the channel.
   */
  params?: ChannelParams;
  /**
   * An array of {@link ChannelMode} objects.
   */
  modes?: ChannelMode[];
}

/**
 * Passes additional properties to a {@link RealtimeChannel} name to produce a new derived channel
 */
export interface DeriveOptions {
  /**
   * The JMESPath Query filter string to be used to derive new channel.
   */
  filter?: string;
}

/**
 * The `RestHistoryParams` interface describes the parameters accepted by the following methods:
 *
 * - {@link Presence.history}
 * - {@link Channel.history}
 */
export interface RestHistoryParams {
  /**
   * The time from which messages are retrieved, specified as milliseconds since the Unix epoch.
   */
  start?: number;
  /**
   * The time until messages are retrieved, specified as milliseconds since the Unix epoch.
   *
   * @defaultValue The current time.
   */
  end?: number;
  /**
   * The order for which messages are returned in. Valid values are `'backwards'` which orders messages from most recent to oldest, or `'forwards'` which orders messages from oldest to most recent. The default is `'backwards'`.
   *
   * @defaultValue `'backwards'`
   */
  direction?: 'forwards' | 'backwards';
  /**
   * An upper limit on the number of messages returned. The default is 100, and the maximum is 1000.
   *
   * @defaultValue 100
   */
  limit?: number;
}

/**
 * The `RestPresenceParams` interface describes the parameters accepted by {@link Presence.get}.
 */
export interface RestPresenceParams {
  /**
   * An upper limit on the number of messages returned. The default is 100, and the maximum is 1000.
   *
   * @defaultValue 100
   */
  limit?: number;
  /**
   * Filters the list of returned presence members by a specific client using its ID.
   */
  clientId?: string;
  /**
   * Filters the list of returned presence members by a specific connection using its ID.
   */
  connectionId?: string;
}

/**
 * The `RealtimePresenceParams` interface describes the parameters accepted by {@link RealtimePresence.get}.
 */
export interface RealtimePresenceParams {
  /**
   * Sets whether to wait for a full presence set synchronization between Ably and the clients on the channel to complete before returning the results. Synchronization begins as soon as the channel is {@link ChannelStates.ATTACHED}. When set to `true` the results will be returned as soon as the sync is complete. When set to `false` the current list of members will be returned without the sync completing. The default is `true`.
   *
   * @defaultValue `true`
   */
  waitForSync?: boolean;
  /**
   * Filters the array of returned presence members by a specific client using its ID.
   */
  clientId?: string;
  /**
   * Filters the array of returned presence members by a specific connection using its ID.
   */
  connectionId?: string;
}

/**
 * The `RealtimeHistoryParams` interface describes the parameters accepted by the following methods:
 *
 * - {@link RealtimePresence.history}
 * - {@link RealtimeChannel.history}
 */
export interface RealtimeHistoryParams {
  /**
   * The time from which messages are retrieved, specified as milliseconds since the Unix epoch.
   */
  start?: number;
  /**
   * The time until messages are retrieved, specified as milliseconds since the Unix epoch.
   *
   * @defaultValue The current time.
   */
  end?: number;
  /**
   * The order for which messages are returned in. Valid values are `'backwards'` which orders messages from most recent to oldest, or `'forwards'` which orders messages from oldest to most recent. The default is `'backwards'`.
   *
   * @defaultValue `'backwards'`
   */
  direction?: 'forwards' | 'backwards';
  /**
   * An upper limit on the number of messages returned. The default is 100, and the maximum is 1000.
   *
   * @defaultValue 100
   */
  limit?: number;
  /**
   * When `true`, ensures message history is up until the point of the channel being attached. See [continuous history](https://ably.com/docs/realtime/history#continuous-history) for more info. Requires the `direction` to be `backwards`. If the channel is not attached, or if `direction` is set to `forwards`, this option results in an error.
   */
  untilAttach?: boolean;
}

/**
 * Contains state change information emitted by {@link Channel} and {@link RealtimeChannel} objects.
 */
export interface ChannelStateChange {
  /**
   * The new current {@link ChannelState}.
   */
  current: ChannelState;
  /**
   * The previous state. For the {@link ChannelEvents.UPDATE} event, this is equal to the `current` {@link ChannelState}.
   */
  previous: ChannelState;
  /**
   * An {@link ErrorInfo} object containing any information relating to the transition.
   */
  reason?: ErrorInfo;
  /**
   * Indicates whether message continuity on this channel is preserved, see [Nonfatal channel errors](https://ably.com/docs/realtime/channels#nonfatal-errors) for more info.
   */
  resumed: boolean;
  /**
   * Indicates whether the client can expect a backlog of messages from a rewind or resume.
   */
  hasBacklog?: boolean;
}

/**
 * Contains {@link ConnectionState} change information emitted by the {@link Connection} object.
 */
export interface ConnectionStateChange {
  /**
   * The new {@link ConnectionState}.
   */
  current: ConnectionState;
  /**
   * The previous {@link ConnectionState}. For the {@link ConnectionEvents.UPDATE} event, this is equal to the current {@link ConnectionState}.
   */
  previous: ConnectionState;
  /**
   * An {@link ErrorInfo} object containing any information relating to the transition.
   */
  reason?: ErrorInfo;
  /**
   * Duration in milliseconds, after which the client retries a connection where applicable.
   */
  retryIn?: number;
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
 * The `DeviceRegistrationParams` interface describes the parameters accepted by the following methods:
 *
 * - {@link PushDeviceRegistrations.list}
 * - {@link PushDeviceRegistrations.removeWhere}
 */
export interface DeviceRegistrationParams {
  /**
   * Filter to restrict to devices associated with a client ID.
   */
  clientId?: string;
  /**
   * Filter to restrict by the unique ID of the device.
   */
  deviceId?: string;
  /**
   * A limit on the number of devices returned, up to 1,000.
   */
  limit?: number;
  /**
   * Filter by the state of the device.
   */
  state?: DevicePushState;
}

/**
 * The `PushChannelSubscriptionParams` interface describes the parameters accepted by the following methods:
 *
 * - {@link PushChannelSubscriptions.list}
 * - {@link PushChannelSubscriptions.removeWhere}
 */
export interface PushChannelSubscriptionParams {
  /**
   * Filter to restrict to subscriptions associated with the given channel.
   */
  channel?: string;
  /**
   * Filter to restrict to devices associated with the given client identifier. Cannot be used with a deviceId param.
   */
  clientId?: string;
  /**
   * Filter to restrict to devices associated with that device identifier. Cannot be used with a clientId param.
   */
  deviceId?: string;
  /**
   * A limit on the number of devices returned, up to 1,000.
   */
  limit?: number;
}

/**
 * The `PushChannelsParams` interface describes the parameters accepted by {@link PushChannelSubscriptions.listChannels}.
 */
export interface PushChannelsParams {
  /**
   * A limit on the number of channels returned, up to 1,000.
   */
  limit?: number;
}

/**
 * The `StatsParams` interface describes the parameters accepted by the following methods:
 *
 * - {@link RestClient.stats}
 * - {@link RealtimeClient.stats}
 */
export interface StatsParams {
  /**
   * The time from which stats are retrieved, specified as milliseconds since the Unix epoch.
   *
   * @defaultValue The Unix epoch.
   */
  start?: number;
  /**
   * The time until stats are retrieved, specified as milliseconds since the Unix epoch.
   *
   * @defaultValue The current time.
   */
  end?: number;
  /**
   * The order for which stats are returned in. Valid values are `'backwards'` which orders stats from most recent to oldest, or `'forwards'` which orders stats from oldest to most recent. The default is `'backwards'`.
   *
   * @defaultValue `'backwards'`
   */
  direction?: 'backwards' | 'forwards';
  /**
   * An upper limit on the number of stats returned. The default is 100, and the maximum is 1000.
   *
   * @defaultValue 100
   */
  limit?: number;
  /**
   * Based on the unit selected, the given `start` or `end` times are rounded down to the start of the relevant interval depending on the unit granularity of the query.
   *
   * @defaultValue `StatsIntervalGranularity.MINUTE`
   */
  unit?: StatsIntervalGranularity;
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
 * The `TokenRevocationOptions` interface describes the additional options accepted by {@link Auth.revokeTokens}.
 */
export interface TokenRevocationOptions {
  /**
   * A Unix timestamp in milliseconds where only tokens issued before this time are revoked. The default is the current time. Requests with an `issuedBefore` in the future, or more than an hour in the past, will be rejected.
   */
  issuedBefore?: number;
  /**
   * If true, permits a token renewal cycle to take place without needing established connections to be dropped, by postponing enforcement to 30 seconds in the future, and sending any existing connections a hint to obtain (and upgrade the connection to use) a new token. The default is `false`, meaning that the effect is near-immediate.
   */
  allowReauthMargin?: boolean;
}

/**
 * Describes which tokens should be affected by a token revocation request.
 */
export interface TokenRevocationTargetSpecifier {
  /**
   * The type of token revocation target specifier. Valid values include `clientId`, `revocationKey` and `channel`.
   */
  type: string;
  /**
   * The value of the token revocation target specifier.
   */
  value: string;
}

/**
 * Contains information about the result of a successful token revocation request for a single target specifier.
 */
export interface TokenRevocationSuccessResult {
  /**
   * The target specifier.
   */
  target: string;
  /**
   * The time at which the token revocation will take effect, as a Unix timestamp in milliseconds.
   */
  appliesAt: number;
  /**
   * A Unix timestamp in milliseconds. Only tokens issued earlier than this time will be revoked.
   */
  issuedBefore: number;
}

/**
 * Contains information about the result of an unsuccessful token revocation request for a single target specifier.
 */
export interface TokenRevocationFailureResult {
  /**
   * The target specifier.
   */
  target: string;
  /**
   * Describes the reason for which token revocation failed for the given `target` as an {@link ErrorInfo} object.
   */
  error: ErrorInfo;
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
 * The callback used by {@link recoverConnectionCallback}.
 *
 * @param shouldRecover - Whether the connection should be recovered.
 */
export type recoverConnectionCompletionCallback = (shouldRecover: boolean) => void;
/**
 * Used in {@link ClientOptions} to configure connection recovery behaviour.
 *
 * @param lastConnectionDetails - Details of the connection used by the connection recovery process.
 * @param callback - A callback which is called when a connection recovery attempt is complete.
 */
export type recoverConnectionCallback = (
  lastConnectionDetails: {
    /**
     * The recovery key can be used by another client to recover this connection’s state in the `recover` client options property. See [connection state recover options](https://ably.com/documentation/realtime/connection/#connection-state-recover-options) for more information.
     */
    recoveryKey: string;
    /**
     * The time at which the previous client was abruptly disconnected before the page was unloaded. This is represented as milliseconds since Unix epoch.
     */
    disconnectedAt: number;
    /**
     * A clone of the `location` object of the previous page’s document object before the page was unloaded. A common use case for this attribute is to ensure that the previous page URL is the same as the current URL before allowing the connection to be recovered. For example, you may want the connection to be recovered only for page reloads, but not when a user navigates to a different page.
     */
    location: string;
    /**
     * The `clientId` of the client’s `Auth` object before the page was unloaded. A common use case for this attribute is to ensure that the current logged in user’s `clientId` matches the previous connection’s `clientId` before allowing the connection to be recovered. Ably prohibits changing a `clientId` for an existing connection, so any mismatch in `clientId` during a recover will result in the connection moving to the failed state.
     */
    clientId: string | null;
  },
  callback: recoverConnectionCompletionCallback,
) => void;

/**
 * A standard callback format which is invoked upon completion of a task.
 *
 * @param err - An error object if the task failed.
 * @param result - The result of the task, if any.
 */
type StandardCallback<T> = (err: ErrorInfo | null, result?: T) => void;

/**
 * A function passed to {@link Push.activate} in order to override the default implementation to register a device for push activation.
 *
 * @param device - A DeviceDetails object representing the local device
 * @param callback - A callback to be invoked when the registration is complete
 */
export type RegisterCallback = (device: DeviceDetails, callback: StandardCallback<DeviceDetails>) => void;

/**
 * A function passed to {@link Push.activate} in order to override the default implementation to deregister a device for push activation.
 *
 * @param device - A DeviceDetails object representing the local device
 * @param callback - A callback to be invoked when the deregistration is complete
 */
export type DeregisterCallback = (device: DeviceDetails, callback: StandardCallback<string>) => void;

/**
 * A callback which returns only an error, or null, when complete.
 *
 * @param error - The error if the task failed, or null not.
 */
export type ErrorCallback = (error: ErrorInfo | null) => void;

// Internal Interfaces

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

// Interfaces
/**
 * A client that offers a simple stateless API to interact directly with Ably's REST API.
 */
export declare interface RestClient {
  /**
   * An {@link Auth} object.
   */
  auth: Auth;
  /**
   * A {@link Channels} object.
   */
  channels: Channels<Channel>;
  /**
   * Makes a REST request to a provided path. This is provided as a convenience for developers who wish to use REST API functionality that is either not documented or is not yet included in the public API, without having to directly handle features such as authentication, paging, fallback hosts, MsgPack and JSON support.
   *
   * @param method - The request method to use, such as `GET`, `POST`.
   * @param path - The request path.
   * @param version - The version of the Ably REST API to use. See the [REST API reference](https://ably.com/docs/api/rest-api#versioning) for information on versioning.
   * @param params - The parameters to include in the URL query of the request. The parameters depend on the endpoint being queried. See the [REST API reference](https://ably.com/docs/api/rest-api) for the available parameters of each endpoint.
   * @param body - The JSON body of the request.
   * @param headers - Additional HTTP headers to include in the request.
   * @returns A promise which, upon success, will be fulfilled with an {@link HttpPaginatedResponse} response object returned by the HTTP request. This response object will contain an empty or JSON-encodable object. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  request<T = any>(
    method: string,
    path: string,
    version: number,
    params?: any,
    body?: any[] | any,
    headers?: any,
  ): Promise<HttpPaginatedResponse<T>>;
  /**
   * Queries the REST `/stats` API and retrieves your application's usage statistics. Returns a {@link PaginatedResult} object, containing an array of {@link Stats} objects. See the [Stats docs](https://ably.com/docs/general/statistics).
   *
   * @param params - A set of parameters which are used to specify which statistics should be retrieved. If you do not provide this argument, then this method will use the default parameters described in the {@link StatsParams} interface.
   * @returns A promise which, upon success, will be fulfilled with a {@link PaginatedResult} object containing an array of {@link Stats} objects. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  stats(params?: StatsParams): Promise<PaginatedResult<Stats>>;
  /**
   * Retrieves the time from the Ably service as milliseconds since the Unix epoch. Clients that do not have access to a sufficiently well maintained time source and wish to issue Ably {@link TokenRequest | `TokenRequest`s} with a more accurate timestamp should use the {@link ClientOptions.queryTime} property instead of this method.
   *
   * @returns A promise which, upon success, will be fulfilled with the time as milliseconds since the Unix epoch. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  time(): Promise<number>;

  /**
   * Publishes a {@link BatchPublishSpec} object to one or more channels, up to a maximum of 100 channels.
   *
   * @param spec - A {@link BatchPublishSpec} object.
   * @returns A promise which, upon success, will be fulfilled with a {@link BatchResult} object containing information about the result of the batch publish for each requested channel. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  batchPublish(spec: BatchPublishSpec): Promise<BatchResult<BatchPublishSuccessResult | BatchPublishFailureResult>>;
  /**
   * Publishes one or more {@link BatchPublishSpec} objects to one or more channels, up to a maximum of 100 channels.
   *
   * @param specs - An array of {@link BatchPublishSpec} objects.
   * @returns A promise which, upon success, will be fulfilled with an array of {@link BatchResult} objects containing information about the result of the batch publish for each requested channel for each provided {@link BatchPublishSpec}. This array is in the same order as the provided {@link BatchPublishSpec} array. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  batchPublish(
    specs: BatchPublishSpec[],
  ): Promise<BatchResult<BatchPublishSuccessResult | BatchPublishFailureResult>[]>;
  /**
   * Retrieves the presence state for one or more channels, up to a maximum of 100 channels. Presence state includes the `clientId` of members and their current {@link PresenceAction}.
   *
   * @param channels - An array of one or more channel names, up to a maximum of 100 channels.
   * @returns A promise which, upon success, will be fulfilled with a {@link BatchResult} object containing information about the result of the batch presence request for each requested channel. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  batchPresence(channels: string[]): Promise<BatchResult<BatchPresenceSuccessResult | BatchPresenceFailureResult>[]>;
  /**
   * A {@link Push} object.
   */
  push: Push;
}

/**
 * A client that extends the functionality of {@link RestClient} and provides additional realtime-specific features.
 */
export declare interface RealtimeClient {
  /**
   * A client ID, used for identifying this client when publishing messages or for presence purposes. The `clientId` can be any non-empty string, except it cannot contain a `*`. This option is primarily intended to be used in situations where the library is instantiated with a key. A `clientId` may also be implicit in a token used to instantiate the library; an error will be raised if a `clientId` specified here conflicts with the `clientId` implicit in the token.
   */
  clientId: string;
  /**
   * Calls {@link Connection.close | `connection.close()`} and causes the connection to close, entering the closing state. Once closed, the library will not attempt to re-establish the connection without an explicit call to {@link Connection.connect | `connect()`}.
   */
  close(): void;
  /**
   * Calls {@link Connection.connect | `connection.connect()`} and causes the connection to open, entering the connecting state. Explicitly calling `connect()` is unnecessary unless the {@link ClientOptions.autoConnect} property is disabled.
   */
  connect(): void;

  /**
   * An {@link Auth} object.
   */
  auth: Auth;
  /**
   * A {@link Channels} object.
   */
  channels: Channels<RealtimeChannel>;
  /**
   * A {@link Connection} object.
   */
  connection: Connection;
  /**
   * Makes a REST request to a provided path. This is provided as a convenience for developers who wish to use REST API functionality that is either not documented or is not yet included in the public API, without having to directly handle features such as authentication, paging, fallback hosts, MsgPack and JSON support.
   *
   * @param method - The request method to use, such as `GET`, `POST`.
   * @param path - The request path.
   * @param version - The version of the Ably REST API to use. See the [REST API reference](https://ably.com/docs/api/rest-api#versioning) for information on versioning.
   * @param params - The parameters to include in the URL query of the request. The parameters depend on the endpoint being queried. See the [REST API reference](https://ably.com/docs/api/rest-api) for the available parameters of each endpoint.
   * @param body - The JSON body of the request.
   * @param headers - Additional HTTP headers to include in the request.
   * @returns A promise which, upon success, will be fulfilled with the {@link HttpPaginatedResponse} response object returned by the HTTP request. This response object will contain an empty or JSON-encodable object. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  request<T = any>(
    method: string,
    path: string,
    version: number,
    params?: any,
    body?: any[] | any,
    headers?: any,
  ): Promise<HttpPaginatedResponse<T>>;
  /**
   * Queries the REST `/stats` API and retrieves your application's usage statistics. Returns a {@link PaginatedResult} object, containing an array of {@link Stats} objects. See the [Stats docs](https://ably.com/docs/general/statistics).
   *
   * @param params - A set of parameters which are used to specify which statistics should be retrieved. If you do not provide this argument, then this method will use the default parameters described in the {@link StatsParams} interface.
   * @returns A promise which, upon success, will be fulfilled with a {@link PaginatedResult} object containing an array of {@link Stats} objects. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  stats(params?: StatsParams): Promise<PaginatedResult<Stats>>;
  /**
   * Retrieves the time from the Ably service as milliseconds since the Unix epoch. Clients that do not have access to a sufficiently well maintained time source and wish to issue Ably {@link TokenRequest | `TokenRequest`s} with a more accurate timestamp should use the {@link ClientOptions.queryTime} property instead of this method.
   *
   * @returns A promise which, upon success, will be fulfilled with the time as milliseconds since the Unix epoch. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  time(): Promise<number>;
  /**
   * Publishes a {@link BatchPublishSpec} object to one or more channels, up to a maximum of 100 channels.
   *
   * @param spec - A {@link BatchPublishSpec} object.
   * @returns A promise which, upon success, will be fulfilled with a {@link BatchResult} object containing information about the result of the batch publish for each requested channel. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  batchPublish(spec: BatchPublishSpec): Promise<BatchResult<BatchPublishSuccessResult | BatchPublishFailureResult>>;
  /**
   * Publishes one or more {@link BatchPublishSpec} objects to one or more channels, up to a maximum of 100 channels.
   *
   * @param specs - An array of {@link BatchPublishSpec} objects.
   * @returns A promise which, upon success, will be fulfilled with an array of {@link BatchResult} objects containing information about the result of the batch publish for each requested channel for each provided {@link BatchPublishSpec}. This array is in the same order as the provided {@link BatchPublishSpec} array. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  batchPublish(
    specs: BatchPublishSpec[],
  ): Promise<BatchResult<BatchPublishSuccessResult | BatchPublishFailureResult>[]>;
  /**
   * Retrieves the presence state for one or more channels, up to a maximum of 100 channels. Presence state includes the `clientId` of members and their current {@link PresenceAction}.
   *
   * @param channels - An array of one or more channel names, up to a maximum of 100 channels.
   * @returns A promise which, upon success, will be fulfilled with a {@link BatchResult} object containing information about the result of the batch presence request for each requested channel. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  batchPresence(channels: string[]): Promise<BatchResult<BatchPresenceSuccessResult | BatchPresenceFailureResult>[]>;
  /**
   * A {@link Push} object.
   */
  push: Push;
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
  /**
   * Revokes the tokens specified by the provided array of {@link TokenRevocationTargetSpecifier}s. Only tokens issued by an API key that had revocable tokens enabled before the token was issued can be revoked. See the [token revocation docs](https://ably.com/docs/core-features/authentication#token-revocation) for more information.
   *
   * @param specifiers - An array of {@link TokenRevocationTargetSpecifier} objects.
   * @param options - A set of options which are used to modify the revocation request.
   * @returns A promise which, upon success, will be fulfilled with a {@link BatchResult} containing information about the result of the token revocation request for each provided [`TokenRevocationTargetSpecifier`]{@link TokenRevocationTargetSpecifier}. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  revokeTokens(
    specifiers: TokenRevocationTargetSpecifier[],
    options?: TokenRevocationOptions,
  ): Promise<BatchResult<TokenRevocationSuccessResult | TokenRevocationFailureResult>>;
}

/**
 * Enables the retrieval of the current and historic presence set for a channel.
 */
export declare interface Presence {
  /**
   * Retrieves the current members present on the channel and the metadata for each member, such as their {@link PresenceAction} and ID. Returns a {@link PaginatedResult} object, containing an array of {@link PresenceMessage} objects.
   *
   * @param params - A set of parameters which are used to specify which presence members should be retrieved.
   * @returns A promise which, upon success, will be fulfilled with a {@link PaginatedResult} object containing an array of {@link PresenceMessage} objects. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  get(params?: RestPresenceParams): Promise<PaginatedResult<PresenceMessage>>;
  /**
   * Retrieves a {@link PaginatedResult} object, containing an array of historical {@link PresenceMessage} objects for the channel. If the channel is configured to persist messages, then presence messages can be retrieved from history for up to 72 hours in the past. If not, presence messages can only be retrieved from history for up to two minutes in the past.
   *
   * @param params - A set of parameters which are used to specify which messages should be retrieved.
   * @returns A promise which, upon success, will be fulfilled with a {@link PaginatedResult} object containing an array of {@link PresenceMessage} objects. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  history(params?: RestHistoryParams): Promise<PaginatedResult<PresenceMessage>>;
}

/**
 * Enables the presence set to be entered and subscribed to, and the historic presence set to be retrieved for a channel.
 */
export declare interface RealtimePresence {
  /**
   * Indicates whether the presence set synchronization between Ably and the clients on the channel has been completed. Set to `true` when the sync is complete.
   */
  syncComplete: boolean;
  /**
   * Deregisters a specific listener that is registered to receive {@link PresenceMessage} on the channel for a given {@link PresenceAction}.
   *
   * @param presence - A specific {@link PresenceAction} to deregister the listener for.
   * @param listener - An event listener function.
   */
  unsubscribe(presence: PresenceAction, listener: messageCallback<PresenceMessage>): void;
  /**
   * Deregisters a specific listener that is registered to receive {@link PresenceMessage} on the channel for a given array of {@link PresenceAction} objects.
   *
   * @param presence - An array of {@link PresenceAction} objects to deregister the listener for.
   * @param listener - An event listener function.
   */
  unsubscribe(presence: Array<PresenceAction>, listener: messageCallback<PresenceMessage>): void;
  /**
   * Deregisters any listener that is registered to receive {@link PresenceMessage} on the channel for a specific {@link PresenceAction}
   *
   * @param presence - A specific {@link PresenceAction} to deregister the listeners for.
   */
  unsubscribe(presence: PresenceAction): void;
  /**
   * Deregisters any listener that is registered to receive {@link PresenceMessage} on the channel for an array of {@link PresenceAction} objects
   *
   * @param presence - An array of {@link PresenceAction} objects to deregister the listeners for.
   */
  unsubscribe(presence: Array<PresenceAction>): void;
  /**
   * Deregisters a specific listener that is registered to receive {@link PresenceMessage} on the channel.
   *
   * @param listener - An event listener function.
   */
  unsubscribe(listener: messageCallback<PresenceMessage>): void;
  /**
   * Deregisters all listeners currently receiving {@link PresenceMessage} for the channel.
   */
  unsubscribe(): void;

  /**
   * Retrieves the current members present on the channel and the metadata for each member, such as their {@link PresenceAction} and ID. Returns an array of {@link PresenceMessage} objects.
   *
   * @param params - A set of parameters which are used to specify which presence members should be retrieved.
   * @returns A promise which, upon success, will be fulfilled with an array of {@link PresenceMessage} objects. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  get(params?: RealtimePresenceParams): Promise<PresenceMessage[]>;
  /**
   * Retrieves a {@link PaginatedResult} object, containing an array of historical {@link PresenceMessage} objects for the channel. If the channel is configured to persist messages, then presence messages can be retrieved from history for up to 72 hours in the past. If not, presence messages can only be retrieved from history for up to two minutes in the past.
   *
   * @param params - A set of parameters which are used to specify which presence messages should be retrieved.
   * @returns A promise which, upon success, will be fulfilled with a {@link PaginatedResult} object containing an array of {@link PresenceMessage} objects. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  history(params?: RealtimeHistoryParams): Promise<PaginatedResult<PresenceMessage>>;
  /**
   * Registers a listener that is called each time a {@link PresenceMessage} matching a given {@link PresenceAction}, or an action within an array of {@link PresenceAction | `PresenceAction`s}, is received on the channel, such as a new member entering the presence set.
   *
   * @param action - A {@link PresenceAction} or an array of {@link PresenceAction | `PresenceAction`s} to register the listener for.
   * @param listener - An event listener function.
   * @returns A promise which resolves upon success of the channel {@link RealtimeChannel.attach | `attach()`} operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  subscribe(action: PresenceAction | Array<PresenceAction>, listener?: messageCallback<PresenceMessage>): Promise<void>;
  /**
   * Registers a listener that is called each time a {@link PresenceMessage} is received on the channel, such as a new member entering the presence set.
   *
   * @param listener - An event listener function.
   * @returns A promise which resolves upon success of the channel {@link RealtimeChannel.attach | `attach()`} operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  subscribe(listener?: messageCallback<PresenceMessage>): Promise<void>;
  /**
   * Enters the presence set for the channel, optionally passing a `data` payload. A `clientId` is required to be present on a channel.
   *
   * @param data - The payload associated with the presence member.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  enter(data?: any): Promise<void>;
  /**
   * Updates the `data` payload for a presence member. If called before entering the presence set, this is treated as an {@link PresenceActions.ENTER} event.
   *
   * @param data - The payload to update for the presence member.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  update(data?: any): Promise<void>;
  /**
   * Leaves the presence set for the channel. A client must have previously entered the presence set before they can leave it.
   *
   * @param data - The payload associated with the presence member.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  leave(data?: any): Promise<void>;
  /**
   * Enters the presence set of the channel for a given `clientId`. Enables a single client to update presence on behalf of any number of clients using a single connection. The library must have been instantiated with an API key or a token bound to a wildcard `clientId`.
   *
   * @param clientId - The ID of the client to enter into the presence set.
   * @param data - The payload associated with the presence member.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  enterClient(clientId: string, data?: any): Promise<void>;
  /**
   * Updates the `data` payload for a presence member using a given `clientId`. Enables a single client to update presence on behalf of any number of clients using a single connection. The library must have been instantiated with an API key or a token bound to a wildcard `clientId`.
   *
   * @param clientId - The ID of the client to update in the presence set.
   * @param data - The payload to update for the presence member.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  updateClient(clientId: string, data?: any): Promise<void>;
  /**
   * Leaves the presence set of the channel for a given `clientId`. Enables a single client to update presence on behalf of any number of clients using a single connection. The library must have been instantiated with an API key or a token bound to a wildcard `clientId`.
   *
   * @param clientId - The ID of the client to leave the presence set for.
   * @param data - The payload associated with the presence member.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  leaveClient(clientId: string, data?: any): Promise<void>;
}

/**
 * Enables devices to subscribe to push notifications for a channel.
 */
export declare interface PushChannel {
  /**
   * Subscribes the device to push notifications for the channel.
   */
  subscribeDevice(): Promise<void>;

  /**
   * Unsubscribes the device from receiving push notifications for the channel.
   */
  unsubscribeDevice(): Promise<void>;

  /**
   * Subscribes all devices associated with the current device's `clientId` to push notifications for the channel.
   */
  subscribeClient(): Promise<void>;

  /**
   * Unsubscribes all devices associated with the current device's `clientId` from receiving push notifications for the channel.
   */
  unsubscribeClient(): Promise<void>;

  /**
   * Retrieves all push subscriptions for the channel. Subscriptions can be filtered using a params object.
   *
   * @param params - An object containing key-value pairs to filter subscriptions by. Can contain `clientId`, `deviceId` or a combination of both, and a `limit` on the number of subscriptions returned, up to 1,000.
   * @returns a {@link PaginatedResult} object containing an array of {@link PushChannelSubscription} objects.
   */
  listSubscriptions(params?: Record<string, string>): Promise<PaginatedResult<PushChannelSubscription>>;
}

/**
 * Enables messages to be published and historic messages to be retrieved for a channel.
 */
export declare interface Channel {
  /**
   * The channel name.
   */
  name: string;

  /**
   * A {@link Presence} object.
   */
  presence: Presence;
  /**
   * A {@link PushChannel} object.
   */
  push: PushChannel;
  /**
   * Retrieves a {@link PaginatedResult} object, containing an array of historical {@link InboundMessage} objects for the channel. If the channel is configured to persist messages, then messages can be retrieved from history for up to 72 hours in the past. If not, messages can only be retrieved from history for up to two minutes in the past.
   *
   * @param params - A set of parameters which are used to specify which messages should be retrieved.
   * @returns A promise which, upon success, will be fulfilled with a {@link PaginatedResult} object containing an array of {@link InboundMessage} objects. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  history(params?: RestHistoryParams): Promise<PaginatedResult<InboundMessage>>;
  /**
   * Publishes an array of messages to the channel.
   *
   * @param messages - An array of {@link Message} objects.
   * @param options - Optional parameters, such as [`quickAck`](https://faqs.ably.com/why-are-some-rest-publishes-on-a-channel-slow-and-then-typically-faster-on-subsequent-publishes) sent as part of the query string.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  publish(messages: Message[], options?: PublishOptions): Promise<void>;
  /**
   * Publishes a message to the channel.
   *
   * @param message - A {@link Message} object.
   * @param options - Optional parameters, such as [`quickAck`](https://faqs.ably.com/why-are-some-rest-publishes-on-a-channel-slow-and-then-typically-faster-on-subsequent-publishes) sent as part of the query string.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  publish(message: Message, options?: PublishOptions): Promise<void>;
  /**
   * Publishes a single message to the channel with the given event name and payload.
   *
   * @param name - The name of the message.
   * @param data - The payload of the message.
   * @param options - Optional parameters, such as [`quickAck`](https://faqs.ably.com/why-are-some-rest-publishes-on-a-channel-slow-and-then-typically-faster-on-subsequent-publishes) sent as part of the query string.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  publish(name: string, data: any, options?: PublishOptions): Promise<void>;
  /**
   * Retrieves a {@link ChannelDetails} object for the channel, which includes status and occupancy metrics.
   *
   * @returns A promise which, upon success, will be fulfilled a {@link ChannelDetails} object. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  status(): Promise<ChannelDetails>;
}

/**
 * Enables messages to be published and subscribed to. Also enables historic messages to be retrieved and provides access to the {@link RealtimePresence} object of a channel.
 */
export declare interface RealtimeChannel extends EventEmitter<channelEventCallback, ChannelStateChange, ChannelEvent> {
  /**
   * The channel name.
   */
  readonly name: string;
  /**
   * An {@link ErrorInfo} object describing the last error which occurred on the channel, if any.
   */
  errorReason: ErrorInfo;
  /**
   * The current {@link ChannelState} of the channel.
   */
  readonly state: ChannelState;
  /**
   * Optional [channel parameters](https://ably.com/docs/realtime/channels/channel-parameters/overview) that configure the behavior of the channel.
   */
  params: ChannelParams;
  /**
   * An array of {@link ChannelMode} objects.
   */
  modes: ChannelMode[];
  /**
   * Deregisters the given listener for the specified event name. This removes an earlier event-specific subscription.
   *
   * @param event - The event name.
   * @param listener - An event listener function.
   */
  unsubscribe(event: string, listener: messageCallback<InboundMessage>): void;
  /**
   * Deregisters the given listener from all event names in the array.
   *
   * @param events - An array of event names.
   * @param listener - An event listener function.
   */
  unsubscribe(events: Array<string>, listener: messageCallback<InboundMessage>): void;
  /**
   * Deregisters all listeners for the given event name.
   *
   * @param event - The event name.
   */
  unsubscribe(event: string): void;
  /**
   * Deregisters all listeners for all event names in the array.
   *
   * @param events - An array of event names.
   */
  unsubscribe(events: Array<string>): void;
  /**
   * Deregisters all listeners to messages on this channel that match the supplied filter.
   *
   * @param filter - A {@link MessageFilter}.
   * @param listener - An event listener function.
   */
  unsubscribe(filter: MessageFilter, listener?: messageCallback<InboundMessage>): void;
  /**
   * Deregisters the given listener (for any/all event names). This removes an earlier subscription.
   *
   * @param listener - An event listener function.
   */
  unsubscribe(listener: messageCallback<InboundMessage>): void;
  /**
   * Deregisters all listeners to messages on this channel. This removes all earlier subscriptions.
   */
  unsubscribe(): void;

  /**
   * A {@link RealtimePresence} object.
   */
  presence: RealtimePresence;
  /**
   * Attach to this channel ensuring the channel is created in the Ably system and all messages published on the channel are received by any channel listeners registered using {@link RealtimeChannel.subscribe | `subscribe()`}. Any resulting channel state change will be emitted to any listeners registered using the {@link EventEmitter.on | `on()`} or {@link EventEmitter.once | `once()`} methods. As a convenience, `attach()` is called implicitly if {@link RealtimeChannel.subscribe | `subscribe()`} for the channel is called, or {@link RealtimePresence.enter | `enter()`} or {@link RealtimePresence.subscribe | `subscribe()`} are called on the {@link RealtimePresence} object for this channel.
   *
   * @returns A promise which, upon success, if the channel became attached will be fulfilled with a {@link ChannelStateChange} object. If the channel was already attached the promise will be fulfilled with `null`. Upon failure, the promise will be rejected with an {@link ErrorInfo} object.
   */
  attach(): Promise<ChannelStateChange | null>;
  /**
   * Detach from this channel. Any resulting channel state change is emitted to any listeners registered using the {@link EventEmitter.on | `on()`} or {@link EventEmitter.once | `once()`} methods. Once all clients globally have detached from the channel, the channel will be released in the Ably service within two minutes.
   *
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  detach(): Promise<void>;
  /**
   * Retrieves a {@link PaginatedResult} object, containing an array of historical {@link InboundMessage} objects for the channel. If the channel is configured to persist messages, then messages can be retrieved from history for up to 72 hours in the past. If not, messages can only be retrieved from history for up to two minutes in the past.
   *
   * @param params - A set of parameters which are used to specify which presence members should be retrieved.
   * @returns A promise which, upon success, will be fulfilled with a {@link PaginatedResult} object containing an array of {@link InboundMessage} objects. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  history(params?: RealtimeHistoryParams): Promise<PaginatedResult<InboundMessage>>;
  /**
   * Sets the {@link ChannelOptions} for the channel.
   *
   * @param options - A {@link ChannelOptions} object.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  setOptions(options: ChannelOptions): Promise<void>;
  /**
   * Registers a listener for messages with a given event name on this channel. The caller supplies a listener function, which is called each time one or more matching messages arrives on the channel.
   *
   * @param event - The event name.
   * @param listener - An event listener function.
   * @returns A promise which, upon successful attachment to the channel, will be fulfilled with a {@link ChannelStateChange} object. If the channel was already attached the promise will be resolved with `null`. Upon failure, the promise will be rejected with an {@link ErrorInfo} object.
   */
  subscribe(event: string, listener?: messageCallback<InboundMessage>): Promise<ChannelStateChange | null>;
  /**
   * Registers a listener for messages on this channel for multiple event name values.
   *
   * @param events - An array of event names.
   * @param listener - An event listener function.
   * @returns A promise which, upon successful attachment to the channel, will be fulfilled with a {@link ChannelStateChange} object. If the channel was already attached the promise will be resolved with `null`. Upon failure, the promise will be rejected with an {@link ErrorInfo} object.
   */
  subscribe(events: Array<string>, listener?: messageCallback<InboundMessage>): Promise<ChannelStateChange | null>;
  /**
   * {@label WITH_MESSAGE_FILTER}
   *
   * Registers a listener for messages on this channel that match the supplied filter.
   *
   * @param filter - A {@link MessageFilter}.
   * @param listener - An event listener function.
   * @returns A promise which, upon successful attachment to the channel, will be fulfilled with a {@link ChannelStateChange} object. If the channel was already attached the promise will be resolved with `null`. Upon failure, the promise will be rejected with an {@link ErrorInfo} object.
   */
  subscribe(filter: MessageFilter, listener?: messageCallback<InboundMessage>): Promise<ChannelStateChange | null>;
  /**
   * Registers a listener for messages on this channel. The caller supplies a listener function, which is called each time one or more messages arrives on the channel.
   *
   * @param callback - An event listener function.
   * @returns A promise which, upon successful attachment to the channel, will be fulfilled with a {@link ChannelStateChange} object. If the channel was already attached the promise will be resolved with `null`. Upon failure, the promise will be rejected with an {@link ErrorInfo} object.
   */
  subscribe(callback: messageCallback<InboundMessage>): Promise<ChannelStateChange | null>;
  /**
   * Publishes a single message to the channel with the given event name and payload. When publish is called with this client library, it won't attempt to implicitly attach to the channel, so long as [transient publishing](https://ably.com/docs/realtime/channels#transient-publish) is available in the library. Otherwise, the client will implicitly attach.
   *
   * @param name - The event name.
   * @param data - The message payload.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  publish(name: string, data: any): Promise<void>;
  /**
   * Publishes an array of messages to the channel. When publish is called with this client library, it won't attempt to implicitly attach to the channel.
   *
   * @param messages - An array of {@link Message} objects.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  publish(messages: Message[]): Promise<void>;
  /**
   * Publish a message to the channel. When publish is called with this client library, it won't attempt to implicitly attach to the channel.
   *
   * @param message - A {@link Message} object.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  publish(message: Message): Promise<void>;
  /**
   * If the channel is already in the given state, returns a promise which immediately resolves to `null`. Else, calls {@link EventEmitter.once | `once()`} to return a promise which resolves the next time the channel transitions to the given state.
   *
   * @param targetState - The channel state to wait for.
   */
  whenState(targetState: ChannelState): Promise<ChannelStateChange | null>;
}

/**
 * Optional parameters for message publishing.
 */
export type PublishOptions = {
  /**
   * See [here](https://faqs.ably.com/why-are-some-rest-publishes-on-a-channel-slow-and-then-typically-faster-on-subsequent-publishes).
   */
  quickAck?: boolean;
};

/**
 * Contains properties to filter messages with when calling {@link RealtimeChannel.subscribe | `RealtimeChannel.subscribe()`}.
 */
export type MessageFilter = {
  /**
   * Filters messages by a specific message `name`.
   */
  name?: string;
  /**
   * Filters messages by a specific `extras.ref.timeserial` value.
   */
  refTimeserial?: string;
  /**
   * Filters messages by a specific `extras.ref.type` value.
   */
  refType?: string;
  /**
   * Filters messages based on whether they contain an `extras.ref`.
   */
  isRef?: boolean;
  /**
   * Filters messages by a specific message `clientId`.
   */
  clientId: string;
};

/**
 * Creates and destroys {@link Channel} and {@link RealtimeChannel} objects.
 */
export declare interface Channels<T> {
  /**
   * Creates a new {@link Channel} or {@link RealtimeChannel} object, with the specified {@link ChannelOptions}, or returns the existing channel object.
   *
   * @param name - The channel name.
   * @param channelOptions - A {@link ChannelOptions} object.
   * @returns A {@link Channel} or {@link RealtimeChannel} object.
   */
  get(name: string, channelOptions?: ChannelOptions): T;
  /**
   * Creates a new {@link Channel} or {@link RealtimeChannel} object, with the specified channel {@link DeriveOptions}
   * and {@link ChannelOptions}, or returns the existing channel object.
   *
   * @experimental This is a preview feature and may change in a future non-major release.
   * This experimental method allows you to create custom realtime data feeds by selectively subscribing
   * to receive only part of the data from the channel.
   * See the [announcement post](https://pages.ably.com/subscription-filters-preview) for more information.
   *
   * @param name - The channel name.
   * @param deriveOptions - A {@link DeriveOptions} object.
   * @param channelOptions - A {@link ChannelOptions} object.
   * @returns A {@link RealtimeChannel} object.
   */
  getDerived(name: string, deriveOptions: DeriveOptions, channelOptions?: ChannelOptions): T;
  /**
   * Releases a {@link Channel} or {@link RealtimeChannel} object, deleting it, and enabling it to be garbage collected. To release a channel, the {@link ChannelState} must be `INITIALIZED`, `DETACHED`, or `FAILED`.
   *
   * @param name - The channel name.
   */
  release(name: string): void;
}

/**
 * Contains an individual message that is sent to, or received from, Ably.
 */
export interface Message {
  /**
   * The client ID of the publisher of this message.
   */
  clientId?: string;
  /**
   * The connection ID of the publisher of this message.
   */
  connectionId?: string;
  /**
   * The message payload, if provided.
   */
  data?: any;
  /**
   * This is typically empty, as all messages received from Ably are automatically decoded client-side using this value. However, if the message encoding cannot be processed, this attribute contains the remaining transformations not applied to the `data` payload.
   */
  encoding?: string;
  /**
   * A JSON object of arbitrary key-value pairs that may contain metadata, and/or ancillary payloads. Valid payloads include `push`, `delta`, `ref` and `headers`.
   */
  extras?: any;
  /**
   * Unique ID assigned by Ably to this message.
   */
  id?: string;
  /**
   * The event name.
   */
  name?: string;
  /**
   * Timestamp of when the message was received by Ably, as milliseconds since the Unix epoch.
   */
  timestamp?: number;
}

/**
 * A message received from Ably.
 */
export type InboundMessage = Message & Required<Pick<Message, 'id' | 'timestamp'>>;

/**
 * Static utilities related to messages.
 */
export interface MessageStatic {
  /**
   * A static factory method to create an `InboundMessage` object from a deserialized InboundMessage-like object encoded using Ably's wire protocol.
   *
   * @param JsonObject - A `InboundMessage`-like deserialized object.
   * @param channelOptions - A {@link ChannelOptions} object. If you have an encrypted channel, use this to allow the library to decrypt the data.
   * @returns A promise which will be fulfilled with an `InboundMessage` object.
   */
  fromEncoded: (JsonObject: any, channelOptions?: ChannelOptions) => Promise<InboundMessage>;
  /**
   * A static factory method to create an array of `InboundMessage` objects from an array of deserialized InboundMessage-like object encoded using Ably's wire protocol.
   *
   * @param JsonArray - An array of `InboundMessage`-like deserialized objects.
   * @param channelOptions - A {@link ChannelOptions} object. If you have an encrypted channel, use this to allow the library to decrypt the data.
   * @returns A promise which will be fulfilled with an array of {@link InboundMessage} objects.
   */
  fromEncodedArray: (JsonArray: any[], channelOptions?: ChannelOptions) => Promise<InboundMessage[]>;
}

/**
 * Contains an individual presence update sent to, or received from, Ably.
 */
export declare interface PresenceMessage {
  /**
   * The type of {@link PresenceAction} the `PresenceMessage` is for.
   */
  action: PresenceAction;
  /**
   * The ID of the client that published the `PresenceMessage`.
   */
  clientId: string;
  /**
   * The ID of the connection associated with the client that published the `PresenceMessage`.
   */
  connectionId: string;
  /**
   * The payload of the `PresenceMessage`.
   */
  data: any;
  /**
   * This will typically be empty as all presence messages received from Ably are automatically decoded client-side using this value. However, if the message encoding cannot be processed, this attribute will contain the remaining transformations not applied to the data payload.
   */
  encoding: string;
  /**
   * A JSON object of arbitrary key-value pairs that may contain metadata, and/or ancillary payloads. Valid payloads include `headers`.
   */
  extras: any;
  /**
   * A unique ID assigned to each `PresenceMessage` by Ably.
   */
  id: string;
  /**
   * The time the `PresenceMessage` was received by Ably, as milliseconds since the Unix epoch.
   */
  timestamp: number;
}

/**
 * Static utilities related to presence messages.
 */
export interface PresenceMessageStatic {
  /**
   * Decodes and decrypts a deserialized `PresenceMessage`-like object using the cipher in {@link ChannelOptions}. Any residual transforms that cannot be decoded or decrypted will be in the `encoding` property. Intended for users receiving messages from a source other than a REST or Realtime channel (for example a queue) to avoid having to parse the encoding string.
   *
   * @param JsonObject - The deserialized `PresenceMessage`-like object to decode and decrypt.
   * @param channelOptions - A {@link ChannelOptions} object containing the cipher.
   */
  fromEncoded: (JsonObject: any, channelOptions?: ChannelOptions) => Promise<PresenceMessage>;
  /**
   * Decodes and decrypts an array of deserialized `PresenceMessage`-like object using the cipher in {@link ChannelOptions}. Any residual transforms that cannot be decoded or decrypted will be in the `encoding` property. Intended for users receiving messages from a source other than a REST or Realtime channel (for example a queue) to avoid having to parse the encoding string.
   *
   * @param JsonArray - An array of deserialized `PresenceMessage`-like objects to decode and decrypt.
   * @param channelOptions - A {@link ChannelOptions} object containing the cipher.
   */
  fromEncodedArray: (JsonArray: any[], channelOptions?: ChannelOptions) => Promise<PresenceMessage[]>;

  /**
   * Initialises a `PresenceMessage` from a `PresenceMessage`-like object.
   *
   * @param values - The values to intialise the `PresenceMessage` from.
   * @param stringifyAction - Whether to convert the `action` field from a number to a string.
   */
  fromValues(values: PresenceMessage | Record<string, unknown>, stringifyAction?: boolean): PresenceMessage;
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
 * Enables the management of a connection to Ably.
 */
export declare interface Connection
  extends EventEmitter<connectionEventCallback, ConnectionStateChange, ConnectionEvent> {
  /**
   * An {@link ErrorInfo} object describing the last error received if a connection failure occurs.
   */
  errorReason: ErrorInfo;
  /**
   * A unique public identifier for this connection, used to identify this member.
   */
  id?: string;
  /**
   * A unique private connection key used to recover or resume a connection, assigned by Ably. This private connection key can also be used by other REST clients to publish on behalf of this client. See the [publishing over REST on behalf of a realtime client docs](https://ably.com/docs/rest/channels#publish-on-behalf) for more info. (If you want to explicitly recover a connection in a different SDK instance, see createRecoveryKey() instead)
   */
  key?: string;
  /**
   * createRecoveryKey method returns a string that can be used by another client to recover this connection's state in the recover client options property. See [connection state recover options](https://ably.com/docs/connect/states?lang=javascript#connection-state-recovery) for more information.
   */
  createRecoveryKey(): string | null;
  /**
   * The current {@link ConnectionState} of the connection.
   */
  readonly state: ConnectionState;
  /**
   * Causes the connection to close, entering the {@link ConnectionStates.CLOSING} state. Once closed, the library does not attempt to re-establish the connection without an explicit call to {@link Connection.connect | `connect()`}.
   */
  close(): void;
  /**
   * Explicitly calling `connect()` is unnecessary unless the `autoConnect` attribute of the {@link ClientOptions} object is `false`. Unless already connected or connecting, this method causes the connection to open, entering the {@link ConnectionStates.CONNECTING} state.
   */
  connect(): void;

  /**
   * When connected, sends a heartbeat ping to the Ably server and executes the callback with any error and the response time in milliseconds when a heartbeat ping request is echoed from the server. This can be useful for measuring true round-trip latency to the connected Ably server.
   *
   * @returns A promise which, upon success, will be fulfilled with the response time in milliseconds. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  ping(): Promise<number>;
  /**
   * If the connection is already in the given state, returns a promise which immediately resolves to `null`. Else, calls {@link EventEmitter.once | `once()`} to return a promise which resolves the next time the connection transitions to the given state.
   *
   * @param targetState - The connection state to wait for.
   */
  whenState(targetState: ConnectionState): Promise<ConnectionStateChange | null>;
}

/**
 * Contains application statistics for a specified time interval and time period.
 */
export declare interface Stats {
  /**
   * The UTC time at which the time period covered begins. If `unit` is set to `minute` this will be in the format `YYYY-mm-dd:HH:MM`, if `hour` it will be `YYYY-mm-dd:HH`, if `day` it will be `YYYY-mm-dd:00` and if `month` it will be `YYYY-mm-01:00`.
   */
  intervalId: string;
  /**
   * For entries that are still in progress, such as the current month: the last sub-interval included in this entry (in format yyyy-mm-dd:hh:mm:ss), else undefined.
   */
  inProgress?: string;
  /**
   * The statistics for this time interval and time period. See the JSON schema which the {@link Stats.schema | `schema`} property points to for more information.
   */
  entries: Partial<Record<string, number>>;
  /**
   * The URL of a [JSON Schema](https://json-schema.org/) which describes the structure of this `Stats` object.
   */
  schema: string;
  /**
   * The ID of the Ably application the statistics are for.
   */
  appId: string;
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
   * The headers of the response.
   */
  headers: any;
}

/**
 * Enables a device to be registered and deregistered from receiving push notifications.
 */
export declare interface Push {
  /**
   * A {@link PushAdmin} object.
   */
  admin: PushAdmin;

  /**
   * Activates the device for push notifications. Subsequently registers the device with Ably and stores the deviceIdentityToken in local storage.
   *
   * @param registerCallback - A function passed to override the default implementation to register the local device for push activation.
   * @param updateFailedCallback - A callback to be invoked when the device registration failed to update.
   */
  activate(registerCallback?: RegisterCallback, updateFailedCallback?: ErrorCallback): Promise<void>;

  /**
   * Deactivates the device from receiving push notifications.
   *
   * @param deregisterCallback - A function passed to override the default implementation to deregister the local device for push activation.
   */
  deactivate(deregisterCallback: DeregisterCallback): Promise<void>;
}

/**
 * Enables the management of device registrations and push notification subscriptions. Also enables the publishing of push notifications to devices.
 */
export declare interface PushAdmin {
  /**
   * A {@link PushDeviceRegistrations} object.
   */
  deviceRegistrations: PushDeviceRegistrations;
  /**
   * A {@link PushChannelSubscriptions} object.
   */
  channelSubscriptions: PushChannelSubscriptions;
  /**
   * Sends a push notification directly to a device, or a group of devices sharing the same `clientId`.
   *
   * @param recipient - A JSON object containing the recipient details using `clientId`, `deviceId` or the underlying notifications service.
   * @param payload - A JSON object containing the push notification payload.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  publish(recipient: any, payload: any): Promise<void>;
}

/**
 * Enables the management of push notification registrations with Ably.
 */
export declare interface PushDeviceRegistrations {
  /**
   * Registers or updates a {@link DeviceDetails} object with Ably. Returns the new, or updated {@link DeviceDetails} object.
   *
   * @param deviceDetails - The {@link DeviceDetails} object to create or update.
   * @returns A promise which, upon success, will be fulfilled with a {@link DeviceDetails} object. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  save(deviceDetails: DeviceDetails): Promise<DeviceDetails>;
  /**
   * Retrieves the {@link DeviceDetails} of a device registered to receive push notifications using its `deviceId`.
   *
   * @param deviceId - The unique ID of the device.
   * @returns A promise which, upon success, will be fulfilled with a {@link DeviceDetails} object. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  get(deviceId: string): Promise<DeviceDetails>;
  /**
   * Retrieves the {@link DeviceDetails} of a device registered to receive push notifications using the `id` property of a {@link DeviceDetails} object.
   *
   * @param deviceDetails - The {@link DeviceDetails} object containing the `id` property of the device.
   * @returns A promise which, upon success, will be fulfilled with a {@link DeviceDetails} object. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  get(deviceDetails: DeviceDetails): Promise<DeviceDetails>;
  /**
   * Retrieves all devices matching the filter `params` provided. Returns a {@link PaginatedResult} object, containing an array of {@link DeviceDetails} objects.
   *
   * @param params - An object containing key-value pairs to filter devices by.
   * @returns A promise which, upon success, will be fulfilled with a {@link PaginatedResult} object containing an array of {@link DeviceDetails} objects. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  list(params: DeviceRegistrationParams): Promise<PaginatedResult<DeviceDetails>>;
  /**
   * Removes a device registered to receive push notifications from Ably using its `deviceId`.
   *
   * @param deviceId - The unique ID of the device.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  remove(deviceId: string): Promise<void>;
  /**
   * Removes a device registered to receive push notifications from Ably using the `id` property of a {@link DeviceDetails} object.
   *
   * @param deviceDetails - The {@link DeviceDetails} object containing the `id` property of the device.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  remove(deviceDetails: DeviceDetails): Promise<void>;
  /**
   * Removes all devices registered to receive push notifications from Ably matching the filter `params` provided.
   *
   * @param params - An object containing key-value pairs to filter devices by. This object’s {@link DeviceRegistrationParams.limit} property will be ignored.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  removeWhere(params: DeviceRegistrationParams): Promise<void>;
}

/**
 * Enables device push channel subscriptions.
 */
export declare interface PushChannelSubscriptions {
  /**
   * Subscribes a device, or a group of devices sharing the same `clientId` to push notifications on a channel. Returns a {@link PushChannelSubscription} object.
   *
   * @param subscription - A {@link PushChannelSubscription} object.
   * @returns A promise which, upon success, will be fulfilled with a {@link PushChannelSubscription} object describing the new or updated subscriptions. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  save(subscription: PushChannelSubscription): Promise<PushChannelSubscription>;
  /**
   * Retrieves all push channel subscriptions matching the filter `params` provided. Returns a {@link PaginatedResult} object, containing an array of {@link PushChannelSubscription} objects.
   *
   * @param params - An object containing key-value pairs to filter subscriptions by.
   * @returns A promise which, upon success, will be fulfilled with a {@link PaginatedResult} object containing an array of {@link PushChannelSubscription} objects. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  list(params: PushChannelSubscriptionParams): Promise<PaginatedResult<PushChannelSubscription>>;
  /**
   * Retrieves all channels with at least one device subscribed to push notifications. Returns a {@link PaginatedResult} object, containing an array of channel names.
   *
   * @param params - An object containing key-value pairs to filter channels by.
   * @returns A promise which, upon success, will be fulfilled with a {@link PaginatedResult} object containing an array of channel names. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  listChannels(params: PushChannelsParams): Promise<PaginatedResult<string>>;
  /**
   * Unsubscribes a device, or a group of devices sharing the same `clientId` from receiving push notifications on a channel.
   *
   * @param subscription - A {@link PushChannelSubscription} object.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  remove(subscription: PushChannelSubscription): Promise<void>;
  /**
   * Unsubscribes all devices from receiving push notifications on a channel that match the filter `params` provided.
   *
   * @param params - An object containing key-value pairs to filter subscriptions by. Can contain `channel`, and optionally either `clientId` or `deviceId`.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  removeWhere(params: PushChannelSubscriptionParams): Promise<void>;
}

/**
 * A client that offers a simple stateless API to interact directly with Ably's REST API.
 */
export declare class Rest implements RestClient {
  /**
   * Construct a client object using an Ably {@link ClientOptions} object.
   *
   * @param options - A {@link ClientOptions} object to configure the client connection to Ably.
   */
  constructor(options: ClientOptions);
  /**
   * Constructs a client object using an Ably API key or token string.
   *
   * @param keyOrToken - The Ably API key or token string used to validate the client.
   */
  constructor(keyOrToken: string);
  /**
   * The cryptographic functions available in the library.
   */
  static Crypto: Crypto;
  /**
   * Static utilities related to messages.
   */
  static Message: MessageStatic;
  /**
   * Static utilities related to presence messages.
   */
  static PresenceMessage: PresenceMessageStatic;

  // Requirements of RestClient

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
}

/**
 * A client that extends the functionality of {@link Rest} and provides additional realtime-specific features.
 */
export declare class Realtime implements RealtimeClient {
  /**
   * Construct a client object using an Ably {@link ClientOptions} object.
   *
   * @param options - A {@link ClientOptions} object to configure the client connection to Ably.
   */
  constructor(options: ClientOptions);
  /**
   * Constructs a client object using an Ably API key or token string.
   *
   * @param keyOrToken - The Ably API key or token string used to validate the client.
   */
  constructor(keyOrToken: string);
  /**
   * The cryptographic functions available in the library.
   */
  static Crypto: Crypto;
  /**
   * Static utilities related to messages.
   */
  static Message: MessageStatic;
  /**
   * Static utilities related to presence messages.
   */
  static PresenceMessage: PresenceMessageStatic;

  // Requirements of RealtimeClient

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
}

/**
 * A generic Ably error object that contains an Ably-specific status code, and a generic status code. Errors returned from the Ably server are compatible with the `ErrorInfo` structure and should result in errors that inherit from `ErrorInfo`.
 */
export declare class ErrorInfo extends Error {
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
