// Type definitions for Ably Realtime and Rest client library 1.2
// Project: https://www.ably.com/
// Definitions by: Ably <https://github.com/ably/>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/**
 * Not yet documented.
 */
declare namespace Types {
  /**
   * Not yet documented.
   */
  namespace ChannelState {
    /**
     * BEGIN CANONICAL DOCSTRING
     * The channel has been initialized but no attach has yet been attempted.
     * END CANONICAL DOCSTRING
     */
    type INITIALIZED = 'initialized';
    /**
     * BEGIN CANONICAL DOCSTRING
     * An attach has been initiated by sending a request to Ably. This is a transient state, followed either by a transition to `ATTACHED`, `SUSPENDED`, or `FAILED`.
     * END CANONICAL DOCSTRING
     */
    type ATTACHING = 'attaching';
    /**
     * BEGIN CANONICAL DOCSTRING
     * The attach has succeeded. In the `ATTACHED` state a client may publish and subscribe to messages, or be present on the channel.
     * END CANONICAL DOCSTRING
     */
    type ATTACHED = 'attached';
    /**
     * BEGIN CANONICAL DOCSTRING
     * A detach has been initiated on an `ATTACHED` channel by sending a request to Ably. This is a transient state, followed either by a transition to `DETACHED` or `FAILED`.
     * END CANONICAL DOCSTRING
     */
    type DETACHING = 'detaching';
    /**
     * BEGIN CANONICAL DOCSTRING
     * The channel, having previously been `ATTACHED`, has been detached by the user.
     * END CANONICAL DOCSTRING
     */
    type DETACHED = 'detached';
    /**
     * BEGIN CANONICAL DOCSTRING
     * The channel, having previously been `ATTACHED`, has lost continuity, usually due to the client being disconnected from Ably for longer than two minutes. It will automatically attempt to reattach as soon as connectivity is restored.
     * END CANONICAL DOCSTRING
     */
    type SUSPENDED = 'suspended';
    /**
     * BEGIN CANONICAL DOCSTRING
     * An indefinite failure condition. This state is entered if a channel error has been received from the Ably service, such as an attempt to attach without the necessary access rights.
     * END CANONICAL DOCSTRING
     */
    type FAILED = 'failed';
  }
  /**
   * BEGIN CANONICAL DOCSTRING
   * Describes the possible states of a [`RestChannel`]{@link RestChannel} or [`RealtimeChannel`]{@link RealtimeChannel} object.
   * END CANONICAL DOCSTRING
   */
  type ChannelState =
    | ChannelState.FAILED
    | ChannelState.INITIALIZED
    | ChannelState.SUSPENDED
    | ChannelState.ATTACHED
    | ChannelState.ATTACHING
    | ChannelState.DETACHED
    | ChannelState.DETACHING;

  /**
   * Not yet documented.
   */
  namespace ChannelEvent {
    /**
     * BEGIN CANONICAL DOCSTRING
     * The channel has been initialized but no attach has yet been attempted.
     * END CANONICAL DOCSTRING
     */
    type INITIALIZED = 'initialized';
    /**
     * BEGIN CANONICAL DOCSTRING
     * An attach has been initiated by sending a request to Ably. This is a transient state, followed either by a transition to `ATTACHED`, `SUSPENDED`, or `FAILED`.
     * END CANONICAL DOCSTRING
     */
    type ATTACHING = 'attaching';
    /**
     * BEGIN CANONICAL DOCSTRING
     * The attach has succeeded. In the `ATTACHED` state a client may publish and subscribe to messages, or be present on the channel.
     * END CANONICAL DOCSTRING
     */
    type ATTACHED = 'attached';
    /**
     * BEGIN CANONICAL DOCSTRING
     * A detach has been initiated on an `ATTACHED` channel by sending a request to Ably. This is a transient state, followed either by a transition to `DETACHED` or `FAILED`.
     * END CANONICAL DOCSTRING
     */
    type DETACHING = 'detaching';
    /**
     * BEGIN CANONICAL DOCSTRING
     * The channel, having previously been `ATTACHED`, has been detached by the user.
     * END CANONICAL DOCSTRING
     */
    type DETACHED = 'detached';
    /**
     * BEGIN CANONICAL DOCSTRING
     * The channel, having previously been `ATTACHED`, has lost continuity, usually due to the client being disconnected from Ably for longer than two minutes. It will automatically attempt to reattach as soon as connectivity is restored.
     * END CANONICAL DOCSTRING
     */
    type SUSPENDED = 'suspended';
    /**
     * BEGIN CANONICAL DOCSTRING
     * An indefinite failure condition. This state is entered if a channel error has been received from the Ably service, such as an attempt to attach without the necessary access rights.
     * END CANONICAL DOCSTRING
     */
    type FAILED = 'failed';
    /**
     * BEGIN CANONICAL DOCSTRING
     * An event for changes to channel conditions that do not result in a change in [`ChannelState`]{@link ChannelState}.
     * END CANONICAL DOCSTRING
     */
    type UPDATE = 'update';
  }
  /**
   * BEGIN CANONICAL DOCSTRING
   * Describes the events emitted by a [`RestChannel`]{@link RestChannel} or [`RealtimeChannel`]{@link RealtimeChannel} object. An event is either an `UPDATE` or a [`ChannelState`]{@link ChannelState}.
   * END CANONICAL DOCSTRING
   */
  type ChannelEvent =
    | ChannelEvent.FAILED
    | ChannelEvent.INITIALIZED
    | ChannelEvent.SUSPENDED
    | ChannelEvent.ATTACHED
    | ChannelEvent.ATTACHING
    | ChannelEvent.DETACHED
    | ChannelEvent.DETACHING
    | ChannelEvent.UPDATE;

  /**
   * Not yet documented.
   */
  namespace ConnectionState {
    /**
     * BEGIN CANONICAL DOCSTRING
     * A connection with this state has been initialized but no connection has yet been attempted.
     * END CANONICAL DOCSTRING
     */
    type INITIALIZED = 'initialized';
    /**
     * BEGIN CANONICAL DOCSTRING
     * A connection attempt has been initiated. The connecting state is entered as soon as the library has completed initialization, and is reentered each time connection is re-attempted following disconnection.
     * END CANONICAL DOCSTRING
     */
    type CONNECTING = 'connecting';
    /**
     * BEGIN CANONICAL DOCSTRING
     * A connection exists and is active.
     * END CANONICAL DOCSTRING
     */
    type CONNECTED = 'connected';
    /**
     * BEGIN CANONICAL DOCSTRING
     * A temporary failure condition. No current connection exists because there is no network connectivity or no host is available. The disconnected state is entered if an established connection is dropped, or if a connection attempt was unsuccessful. In the disconnected state the library will periodically attempt to open a new connection (approximately every 15 seconds), anticipating that the connection will be re-established soon and thus connection and channel continuity will be possible. In this state, developers can continue to publish messages as they are automatically placed in a local queue, to be sent as soon as a connection is reestablished. Messages published by other clients while this client is disconnected will be delivered to it upon reconnection, so long as the connection was resumed within 2 minutes. After 2 minutes have elapsed, recovery is no longer possible and the connection will move to the `SUSPENDED` state.
     * END CANONICAL DOCSTRING
     */
    type DISCONNECTED = 'disconnected';
    /**
     * BEGIN CANONICAL DOCSTRING
     * A long term failure condition. No current connection exists because there is no network connectivity or no host is available. The suspended state is entered after a failed connection attempt if there has then been no connection for a period of two minutes. In the suspended state, the library will periodically attempt to open a new connection every 30 seconds. Developers are unable to publish messages in this state. A new connection attempt can also be triggered by an explicit call to [`connect()`]{@link Connection#connect}. Once the connection has been re-established, channels will be automatically re-attached. The client has been disconnected for too long for them to resume from where they left off, so if it wants to catch up on messages published by other clients while it was disconnected, it needs to use the [History API](https://ably.com/docs/realtime/history).
     * END CANONICAL DOCSTRING
     */
    type SUSPENDED = 'suspended';
    /**
     * BEGIN CANONICAL DOCSTRING
     * An explicit request by the developer to close the connection has been sent to the Ably service. If a reply is not received from Ably within a short period of time, the connection is forcibly terminated and the connection state becomes `CLOSED`.
     * END CANONICAL DOCSTRING
     */
    type CLOSING = 'closing';
    /**
     * BEGIN CANONICAL DOCSTRING
     * The connection has been explicitly closed by the client. In the closed state, no reconnection attempts are made automatically by the library, and clients may not publish messages. No connection state is preserved by the service or by the library. A new connection attempt can be triggered by an explicit call to [`connect()`]{@link Connection#connect}, which results in a new connection.
     * END CANONICAL DOCSTRING
     */
    type CLOSED = 'closed';
    /**
     * BEGIN CANONICAL DOCSTRING
     * This state is entered if the client library encounters a failure condition that it cannot recover from. This may be a fatal connection error received from the Ably service, for example an attempt to connect with an incorrect API key, or a local terminal error, for example the token in use has expired and the library does not have any way to renew it. In the failed state, no reconnection attempts are made automatically by the library, and clients may not publish messages. A new connection attempt can be triggered by an explicit call to [`connect()`]{@link Connection#connect}.
     * END CANONICAL DOCSTRING
     */
    type FAILED = 'failed';
  }
  /**
   * BEGIN CANONICAL DOCSTRING
   * Describes the realtime [`Connection`]{@link Connection} object states.
   * END CANONICAL DOCSTRING
   */
  type ConnectionState =
    | ConnectionState.INITIALIZED
    | ConnectionState.CONNECTED
    | ConnectionState.CONNECTING
    | ConnectionState.DISCONNECTED
    | ConnectionState.SUSPENDED
    | ConnectionState.CLOSED
    | ConnectionState.CLOSING
    | ConnectionState.FAILED;

  /**
   * Not yet documented.
   */
  namespace ConnectionEvent {
    /**
     * BEGIN CANONICAL DOCSTRING
     * A connection with this state has been initialized but no connection has yet been attempted.
     * END CANONICAL DOCSTRING
     */
    type INITIALIZED = 'initialized';
    /**
     * BEGIN CANONICAL DOCSTRING
     * A connection attempt has been initiated. The connecting state is entered as soon as the library has completed initialization, and is reentered each time connection is re-attempted following disconnection.
     * END CANONICAL DOCSTRING
     */
    type CONNECTING = 'connecting';
    /**
     * BEGIN CANONICAL DOCSTRING
     * A connection exists and is active.
     * END CANONICAL DOCSTRING
     */
    type CONNECTED = 'connected';
    /**
     * BEGIN CANONICAL DOCSTRING
     * A temporary failure condition. No current connection exists because there is no network connectivity or no host is available. The disconnected state is entered if an established connection is dropped, or if a connection attempt was unsuccessful. In the disconnected state the library will periodically attempt to open a new connection (approximately every 15 seconds), anticipating that the connection will be re-established soon and thus connection and channel continuity will be possible. In this state, developers can continue to publish messages as they are automatically placed in a local queue, to be sent as soon as a connection is reestablished. Messages published by other clients while this client is disconnected will be delivered to it upon reconnection, so long as the connection was resumed within 2 minutes. After 2 minutes have elapsed, recovery is no longer possible and the connection will move to the `SUSPENDED` state.
     * END CANONICAL DOCSTRING
     */
    type DISCONNECTED = 'disconnected';
    /**
     * BEGIN CANONICAL DOCSTRING
     * A long term failure condition. No current connection exists because there is no network connectivity or no host is available. The suspended state is entered after a failed connection attempt if there has then been no connection for a period of two minutes. In the suspended state, the library will periodically attempt to open a new connection every 30 seconds. Developers are unable to publish messages in this state. A new connection attempt can also be triggered by an explicit call to [`connect()`]{@link Connection#connect}. Once the connection has been re-established, channels will be automatically re-attached. The client has been disconnected for too long for them to resume from where they left off, so if it wants to catch up on messages published by other clients while it was disconnected, it needs to use the [History API](https://ably.com/docs/realtime/history).
     * END CANONICAL DOCSTRING
     */
    type SUSPENDED = 'suspended';
    /**
     * BEGIN CANONICAL DOCSTRING
     * An explicit request by the developer to close the connection has been sent to the Ably service. If a reply is not received from Ably within a short period of time, the connection is forcibly terminated and the connection state becomes `CLOSED`.
     * END CANONICAL DOCSTRING
     */
    type CLOSING = 'closing';
    /**
     * BEGIN CANONICAL DOCSTRING
     * The connection has been explicitly closed by the client. In the closed state, no reconnection attempts are made automatically by the library, and clients may not publish messages. No connection state is preserved by the service or by the library. A new connection attempt can be triggered by an explicit call to [`connect()`]{@link Connection#connect}, which results in a new connection.
     * END CANONICAL DOCSTRING
     */
    type CLOSED = 'closed';
    /**
     * BEGIN CANONICAL DOCSTRING
     * This state is entered if the client library encounters a failure condition that it cannot recover from. This may be a fatal connection error received from the Ably service, for example an attempt to connect with an incorrect API key, or a local terminal error, for example the token in use has expired and the library does not have any way to renew it. In the failed state, no reconnection attempts are made automatically by the library, and clients may not publish messages. A new connection attempt can be triggered by an explicit call to [`connect()`]{@link Connection#connect}.
     * END CANONICAL DOCSTRING
     */
    type FAILED = 'failed';
    /**
     * BEGIN CANONICAL DOCSTRING
     * An event for changes to connection conditions for which the [`ConnectionState`]{@link ConnectionState} does not change.
     * END CANONICAL DOCSTRING
     */
    type UPDATE = 'update';
  }
  /**
   * BEGIN CANONICAL DOCSTRING
   * Describes the events emitted by a [`Connection`]{@link} object. An event is either an `UPDATE` or a [`ConnectionState`]{@link ConnectionState}.
   * END CANONICAL DOCSTRING
   */
  type ConnectionEvent =
    | ConnectionEvent.INITIALIZED
    | ConnectionEvent.CONNECTED
    | ConnectionEvent.CONNECTING
    | ConnectionEvent.DISCONNECTED
    | ConnectionEvent.SUSPENDED
    | ConnectionEvent.CLOSED
    | ConnectionEvent.CLOSING
    | ConnectionEvent.FAILED
    | ConnectionEvent.UPDATE;

  /**
   * Not yet documented.
   */
  namespace PresenceAction {
    /**
     * BEGIN CANONICAL DOCSTRING
     * A member is not present in the channel.
     * END CANONICAL DOCSTRING
     */
    type ABSENT = 'absent';
    /**
     * BEGIN CANONICAL DOCSTRING
     * When subscribing to presence events on a channel that already has members present, this event is emitted for every member already present on the channel before the subscribe listener was registered.
     * END CANONICAL DOCSTRING
     */
    type PRESENT = 'present';
    /**
     * BEGIN CANONICAL DOCSTRING
     * A new member has entered the channel.
     * END CANONICAL DOCSTRING
     */
    type ENTER = 'enter';
    /**
     * BEGIN CANONICAL DOCSTRING
     * A member who was present has now left the channel. This may be a result of an explicit request to leave or implicitly when detaching from the channel. Alternatively, if a member's connection is abruptly disconnected and they do not resume their connection within a minute, Ably treats this as a leave event as the client is no longer present.
     * END CANONICAL DOCSTRING
     */
    type LEAVE = 'leave';
    /**
     * BEGIN CANONICAL DOCSTRING
     * An already present member has updated their member data. Being notified of member data updates can be very useful, for example, it can be used to update the status of a user when they are typing a message.
     * END CANONICAL DOCSTRING
     */
    type UPDATE = 'update';
  }
  /**
   * BEGIN CANONICAL DOCSTRING
   * Describes the possible actions members in the presence set can emit.
   * END CANONICAL DOCSTRING
   */
  type PresenceAction =
    | PresenceAction.ABSENT
    | PresenceAction.PRESENT
    | PresenceAction.ENTER
    | PresenceAction.LEAVE
    | PresenceAction.UPDATE;

  /**
   * Not yet documented.
   */
  namespace StatsIntervalGranularity {
    /**
     * BEGIN CANONICAL DOCSTRING
     * Interval unit over which statistics are gathered as minutes.
     * END CANONICAL DOCSTRING
     */
    type MINUTE = 'minute';
    /**
     * BEGIN CANONICAL DOCSTRING
     * Interval unit over which statistics are gathered as hours.
     * END CANONICAL DOCSTRING
     */
    type HOUR = 'hour';
    /**
     * BEGIN CANONICAL DOCSTRING
     * Interval unit over which statistics are gathered as days.
     * END CANONICAL DOCSTRING
     */
    type DAY = 'day';
    /**
     * BEGIN CANONICAL DOCSTRING
     * Interval unit over which statistics are gathered as months.
     * END CANONICAL DOCSTRING
     */
    type MONTH = 'month';
  }
  /**
   * BEGIN CANONICAL DOCSTRING
   * Describes the interval unit over which statistics are gathered.
   * END CANONICAL DOCSTRING
   */
  type StatsIntervalGranularity =
    | StatsIntervalGranularity.MINUTE
    | StatsIntervalGranularity.HOUR
    | StatsIntervalGranularity.DAY
    | StatsIntervalGranularity.MONTH;

  /**
   * Not yet documented.
   */
  namespace HTTPMethods {
    /**
     * Not yet documented.
     */
    type POST = 'POST';
    /**
     * Not yet documented.
     */
    type GET = 'GET';
  }
  /**
   * Not yet documented.
   */
  type HTTPMethods = HTTPMethods.GET | HTTPMethods.POST;

  /**
   * Not yet documented.
   */
  type Transport = 'web_socket' | 'xhr_streaming' | 'xhr_polling' | 'jsonp' | 'comet';

  /**
   * BEGIN CANONICAL DOCSTRING
   * Contains the details of a [`RestChannel`]{@link RestChannel} or [`RealtimeChannel`]{@link RealtimeChannel} object such as its ID and [`ChannelStatus`]{@link ChannelStatus}.
   * END CANONICAL DOCSTRING
   */
  interface ChannelDetails {
    /**
     * BEGIN CANONICAL DOCSTRING
     * The identifier of the channel.
     * END CANONICAL DOCSTRING
     */
    channelId: string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * A [`ChannelStatus`]{@link ChannelStatus} object.
     * END CANONICAL DOCSTRING
     */
    status: ChannelStatus;
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * Contains the status of a [`RestChannel`]{@link RestChannel} or [`RealtimeChannel`]{@link RealtimeChannel} object such as whether it is active and its [`ChannelOccupancy`]{@link ChannelOccupancy}.
   * END CANONICAL DOCSTRING
   */
  interface ChannelStatus {
    /**
     * BEGIN CANONICAL DOCSTRING
     * If `true`, the channel is active, otherwise `false`.
     * END CANONICAL DOCSTRING
     */
    isActive: boolean;
    /**
     * BEGIN CANONICAL DOCSTRING
     * A [`ChannelOccupancy`]{@link ChannelOccupancy} object.
     * END CANONICAL DOCSTRING
     */
    occupancy: ChannelOccupancy;
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * Contains the metrics of a [`RestChannel`]{@link RestChannel} or [`RealtimeChannel`]{@link RealtimeChannel} object.
   * END CANONICAL DOCSTRING
   */
  interface ChannelOccupancy {
    /**
     * BEGIN CANONICAL DOCSTRING
     * A [`ChannelMetrics`]{@link ChannelMetrics} object.
     * END CANONICAL DOCSTRING
     */
    metrics: ChannelMetrics;
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * Contains the metrics associated with a [`RestChannel`]{@link RestChannel} or [`RealtimeChannel`]{@link RealtimeChannel}, such as the number of publishers, subscribers and connections it has.
   * END CANONICAL DOCSTRING
   */
  interface ChannelMetrics {
    /**
     * BEGIN CANONICAL DOCSTRING
     * The number of realtime connections attached to the channel.
     * END CANONICAL DOCSTRING
     */
    connections: number;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The number of realtime connections attached to the channel with permission to enter the presence set, regardless of whether or not they have entered it. This requires the `presence` capability and for a client to not have specified a [`ChannelMode`]{@link ChannelMode} flag that excludes [`PRESENCE`]{@link ChannelMode#PRESENCE}.
     * END CANONICAL DOCSTRING
     */
    presenceConnections: number;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The number of members in the presence set of the channel.
     * END CANONICAL DOCSTRING
     */
    presenceMembers: number;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The number of realtime attachments receiving presence messages on the channel. This requires the `subscribe` capability and for a client to not have specified a [`ChannelMode`]{@link ChannelMode} flag that excludes [`PRESENCE_SUBSCRIBE`]{@link ChannelMode#PRESENCE_SUBSCRIBE}.
     * END CANONICAL DOCSTRING
     */
    presenceSubscribers: number;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The number of realtime attachments permitted to publish messages to the channel. This requires the `publish` capability and for a client to not have specified a [`ChannelMode`]{@link ChannelMode} flag that excludes [`PUBLISH`]{@link ChannelMode#PUBLISH}.
     * END CANONICAL DOCSTRING
     */
    publishers: number;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The number of realtime attachments receiving messages on the channel. This requires the `subscribe` capability and for a client to not have specified a [`ChannelMode`]{@link ChannelMode} flag that excludes [`SUBSCRIBE`]{@link ChannelMode#SUBSCRIBE}.
     * END CANONICAL DOCSTRING
     */
    subscribers: number;
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * Passes additional client-specific properties to the REST [`constructor()`]{@link RestClient#constructor} or the Realtime [`constructor()`]{@link RealtimeClient#constructor}.
   * END CANONICAL DOCSTRING
   *
   * BEGIN LEGACY DOCSTRING
   * Configuration options for the creation of a new client.
   * END LEGACY DOCSTRING
   */
  interface ClientOptions extends AuthOptions {
    /**
     * BEGIN CANONICAL DOCSTRING
     * When `true`, the client connects to Ably as soon as it is instantiated. You can set this to `false` and explicitly connect to Ably using the [`connect()`]{@link Connection#connect} method. The default is `true`.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default true
     * END CANONICAL DEFAULT INFO
     *
     * BEGIN LEGACY DOCSTRING
     * When true as soon as the client is instantiated it will connect to Ably. You can optionally set this to false and explicitly connect to Ably when require using the `connect` method. Defaults to `true`.
     * END LEGACY DOCSTRING
     */
    autoConnect?: boolean;

    /**
     * BEGIN CANONICAL DOCSTRING
     * When a [`TokenParams`]{@link TokenParams} object is provided, it overrides the client library defaults when issuing new Ably Tokens or Ably [`TokenRequest`s]{@link TokenRequest}.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * When a `TokenParams` object is provided, it will override the client library defaults when issuing new Ably Tokens or Ably TokenRequests.
     * END LEGACY DOCSTRING
     */
    defaultTokenParams?: TokenParams;

    /**
     * BEGIN CANONICAL DOCSTRING
     * If `false`, prevents messages originating from this connection being echoed back on the same connection. The default is `true`.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default true
     * END CANONICAL DEFAULT INFO
     *
     * BEGIN LEGACY DOCSTRING
     * If false, prevents messages originating from this connection being echoed back on the same connection. Defaults to `true`.
     * END LEGACY DOCSTRING
     */
    echoMessages?: boolean;

    /**
     * BEGIN CANONICAL DOCSTRING
     * Enables a [custom environment](https://ably.com/docs/platform-customization) to be used with the Ably service.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Allows a [custom environment](https://faqs.ably.com/steps-to-set-up-custom-environments-dedicated-clusters-and-regional-restrictions-for-your-account), region or cluster to be used with the Ably service. Please [contact us](https://ably.com/contact) if you require a custom environment. Note that once a custom environment is specified, the [fallback host functionality](https://faqs.ably.com/routing-around-network-and-dns-issues) is disabled by default.
     * END LEGACY DOCSTRING
     */
    environment?: string;

    /**
     * BEGIN LEGACY DOCSTRING
     * Parameters to control the log output of the library.
     * END LEGACY DOCSTRING
     */
    log?: LogInfo;

    /**
     * BEGIN CANONICAL DOCSTRING
     * Enables a non-default Ably port to be specified. For development environments only. The default value is 80.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default 80
     * END CANONICAL DEFAULT INFO
     *
     * BEGIN LEGACY DOCSTRING
     * For development environments only; allows a non-default Ably port to be specified.
     * END LEGACY DOCSTRING
     */
    port?: number;

    /**
     * BEGIN CANONICAL DOCSTRING
     * If `false`, this disables the default behavior whereby the library queues messages on a connection in the disconnected or connecting states. The default behavior enables applications to submit messages immediately upon instantiating the library without having to wait for the connection to be established. Applications may use this option to disable queueing if they wish to have application-level control over the queueing. The default is `true`.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default true
     * END CANONICAL DEFAULT INFO
     *
     * BEGIN LEGACY DOCSTRING
     * If false, this disables the default behavior whereby the library queues messages on a connection in the disconnected or connecting states. The default behavior allows applications to submit messages immediately upon instancing the library without having to wait for the connection to be established. Applications may use this option to disable queueing if they wish to have application-level control over the queueing under those conditions.
     * END LEGACY DOCSTRING
     */
    queueMessages?: boolean;

    /**
     * BEGIN CANONICAL DOCSTRING
     * Enables a non-default Ably host to be specified. For development environments only. The default value is `rest.ably.io`.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default "rest.ably.io"
     * END CANONICAL DEFAULT INFO
     *
     * BEGIN LEGACY DOCSTRING
     * For development environments only; allows a non-default Ably host to be specified.
     * END LEGACY DOCSTRING
     */
    restHost?: string;

    /**
     * BEGIN CANONICAL DOCSTRING
     * Enables a non-default Ably host to be specified for realtime connections. For development environments only. The default value is `realtime.ably.io`.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default "realtime.ably.io"
     * END CANONICAL DEFAULT INFO
     *
     * BEGIN LEGACY DOCSTRING
     * For development environments only; allows a non-default Ably host to be specified for realtime connections.
     * END LEGACY DOCSTRING
     */
    realtimeHost?: string;

    /**
     * BEGIN CANONICAL DOCSTRING
     * An array of fallback hosts to be used in the case of an error necessitating the use of an alternative host. If you have been provided a set of custom fallback hosts by Ably, please specify them here.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default nil
     * END CANONICAL DEFAULT INFO
     *
     * BEGIN LEGACY DOCSTRING
     * An array of fallback hosts to be used in the case of an error necessitating the use of an alternative host.
     *
     * When a custom environment is specified, the [fallback host functionality](https://faqs.ably.com/routing-around-network-and-dns-issues) is disabled. If your customer success manager has provided you with a set of custom fallback hosts, please specify them here.
     * END LEGACY DOCSTRING
     */
    fallbackHosts?: string[];

    /**
     * BEGIN CANONICAL DOCSTRING
     * DEPRECATED: this property is deprecated and will be removed in a future version. Enables default fallback hosts to be used.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * If true, the library will use default fallbackHosts even when overriding environment or restHost/realtimeHost.
     * END LEGACY DOCSTRING
     */
    fallbackHostsUseDefault?: boolean;

    /**
     * BEGIN LEGACY DOCSTRING
     * Set of configurable options to set on the HTTP(S) agent used for REST requests.
     *
     * See the [NodeJS docs](https://nodejs.org/api/http.html#new-agentoptions) for descriptions of these options.
     * END LEGACY DOCSTRING
     */
    restAgentOptions?: {
      /**
       * Not yet documented.
       */
      maxSockets?: number;
      /**
       * Not yet documented.
       */
      keepAlive?: boolean;
    };

    /**
     * BEGIN CANONICAL DOCSTRING
     * Enables a connection to inherit the state of a previous connection that may have existed under a different instance of the Realtime library. This might typically be used by clients of the browser library to ensure connection state can be preserved when the user refreshes the page. A recovery key string can be explicitly provided, or alternatively if a callback function is provided, the client library will automatically persist the recovery key between page reloads and call the callback when the connection is recoverable. The callback is then responsible for confirming whether the connection should be recovered or not. See [connection state recovery](https://ably.com/docs/realtime/connection/#connection-state-recovery) for further information.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * This option allows a connection to inherit the state of a previous connection that may have existed under a different instance of the Realtime library. This might typically be used by clients of the browser library to ensure connection state can be preserved when the user refreshes the page. A recovery key string can be explicitly provided, or alternatively if a callback function is provided, the client library will automatically persist the recovery key between page reloads and call the callback when the connection is recoverable. The callback is then responsible for confirming whether the connection should be recovered or not. See [connection state recovery](https://ably.com/documentation/realtime/connection/#connection-state-recovery) for further information.
     * END LEGACY DOCSTRING
     */
    recover?: string | recoverConnectionCallback;

    /**
     * BEGIN CANONICAL DOCSTRING
     * When `false`, the client will use an insecure connection. The default is `true`, meaning a TLS connection will be used to connect to Ably.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default true
     * END CANONICAL DEFAULT INFO
     *
     * BEGIN LEGACY DOCSTRING
     * Use a non-secure connection. By default, a TLS connection is used to connect to Ably
     * END LEGACY DOCSTRING
     */
    tls?: boolean;

    /**
     * BEGIN CANONICAL DOCSTRING
     * Enables a non-default Ably TLS port to be specified. For development environments only. The default value is 443.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default 443
     * END CANONICAL DEFAULT INFO
     *
     * BEGIN LEGACY DOCSTRING
     * For development environments only; allows a non-default Ably TLS port to be specified.
     * END LEGACY DOCSTRING
     */
    tlsPort?: number;

    /**
     * BEGIN CANONICAL DOCSTRING
     * When `true`, the more efficient MsgPack binary encoding is used. When `false`, JSON text encoding is used. The default is `true`.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default true
     * END CANONICAL DEFAULT INFO
     *
     * BEGIN LEGACY DOCSTRING
     * When true, the more efficient MsgPack binary encoding is used.
     * When false, JSON text encoding is used.
     * END LEGACY DOCSTRING
     */
    useBinaryProtocol?: boolean;

    /**
     * BEGIN CANONICAL DOCSTRING
     * If the connection is still in the [`DISCONNECTED`]{@link ConnectionState#disconnected} state after this delay, the client library will attempt to reconnect automatically. The default is 15 seconds.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default 15s
     * END CANONICAL DEFAULT INFO
     *
     * BEGIN LEGACY DOCSTRING
     * When the connection enters the `DISCONNECTED` state, after this delay in milliseconds, if the state is still `DISCONNECTED`, the client library will attempt to reconnect automatically. Defaults to 15,000ms.
     * END LEGACY DOCSTRING
     */
    disconnectedRetryTimeout?: number;

    /**
     * BEGIN CANONICAL DOCSTRING
     * When the connection enters the [`SUSPENDED`]{@link ConnectionState#suspended} state, after this delay, if the state is still [`SUSPENDED`]{@link ConnectionState#suspended}, the client library attempts to reconnect automatically. The default is 30 seconds.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default 30s
     * END CANONICAL DEFAULT INFO
     *
     * BEGIN LEGACY DOCSTRING
     * When the connection enters the `SUSPENDED` state, after this delay in milliseconds, if the state is still `SUSPENDED`, the client library will attempt to reconnect automatically.
     * END LEGACY DOCSTRING
     */
    suspendedRetryTimeout?: number;

    /**
     * BEGIN LEGACY DOCSTRING
     * When `true`, the client library will automatically send a close request to Ably whenever the `window` [`beforeunload` event](https://developer.mozilla.org/en-US/docs/Web/API/BeforeUnloadEvent) fires. By enabling this option, the close request sent to Ably ensures the connection state will not be retained and all channels associated with the channel will be detached. This is commonly used by developers who want presence leave events to fire immediately (that is, if a user navigates to another page or closes their browser, then enabling this option will result in the presence member leaving immediately). Without this option or an explicit call to the `close` method of the `Connection` object, Ably expects that the abruptly disconnected connection could later be recovered and therefore does not immediately remove the user from presence. Instead, to avoid “twitchy” presence behaviour an abruptly disconnected client is removed from channels in which they are present after 15 seconds, and the connection state is retained for two minutes. Defaults to `true`.
     * END LEGACY DOCSTRING
     */
    closeOnUnload?: boolean;

    /**
     * BEGIN CANONICAL DOCSTRING
     * When `true`, enables idempotent publishing by assigning a unique message ID client-side, allowing the Ably servers to discard automatic publish retries following a failure such as a network fault. The default is `true`.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default true
     * END CANONICAL DEFAULT INFO
     *
     * BEGIN LEGACY DOCSTRING
     * When true, enables idempotent publishing by assigning a unique message ID client-side, allowing the Ably servers to discard automatic publish retries following a failure such as a network fault. We recommend you enable this by default. In version 1.2 onwards, idempotent publishing for retries will be enabled by default.
     * END LEGACY DOCSTRING
     */
    idempotentRestPublishing?: boolean;

    /**
     * BEGIN CANONICAL DOCSTRING
     * A set of key-value pairs that can be used to pass in arbitrary connection parameters, such as [`heartbeatInterval`](https://ably.com/docs/realtime/connection#heartbeats) or [`remainPresentFor`](https://ably.com/docs/realtime/presence#unstable-connections).
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Can be used to pass in arbitrary connection parameters.
     * END LEGACY DOCSTRING
     */
    transportParams?: { [k: string]: string | number };

    /**
     * BEGIN LEGACY DOCSTRING
     * An array of transports to use, in descending order of preference. In the browser environment the available transports are: `web_socket`, `xhr`, and `jsonp`.
     * END LEGACY DOCSTRING
     */
    transports?: Transport[];

    /**
     * BEGIN CANONICAL DOCSTRING
     * The maximum number of fallback hosts to use as a fallback when an HTTP request to the primary host is unreachable or indicates that it is unserviceable. The default value is 3.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default 3
     * END CANONICAL DEFAULT INFO
     *
     * BEGIN LEGACY DOCSTRING
     * Maximum number of fallback hosts to use as a fallback when an HTTP request to the primary host is unreachable or indicates that it is unserviceable.
     * END LEGACY DOCSTRING
     */
    httpMaxRetryCount?: number;

    /**
     * BEGIN CANONICAL DOCSTRING
     * The maximum elapsed time in which fallback host retries for HTTP requests will be attempted. The default is 15 seconds.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default 15s
     * END CANONICAL DEFAULT INFO
     *
     * BEGIN LEGACY DOCSTRING
     * Maximum elapsed time in which fallback host retries for HTTP requests will be attempted.
     * END LEGACY DOCSTRING
     */
    httpMaxRetryDuration?: number;

    /**
     * BEGIN CANONICAL DOCSTRING
     * Timeout for opening a connection to Ably to initiate an HTTP request. The default is 4 seconds.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default 4s
     * END CANONICAL DEFAULT INFO
     *
     * BEGIN LEGACY DOCSTRING
     * Timeout for opening the connection, available in the client library if supported by the transport.
     * END LEGACY DOCSTRING
     */
    httpOpenTimeout?: number;

    /**
     * BEGIN CANONICAL DOCSTRING
     * Timeout for a client performing a complete HTTP request to Ably, including the connection phase. The default is 10 seconds.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default 10s
     * END CANONICAL DEFAULT INFO
     *
     * BEGIN LEGACY DOCSTRING
     * Timeout for any single HTTP request and response.
     * END LEGACY DOCSTRING
     */
    httpRequestTimeout?: number;

    /**
     * BEGIN CANONICAL DOCSTRING
     * Timeout for the wait of acknowledgement for operations performed via a realtime connection, before the client library considers a request failed and triggers a failure condition. Operations include establishing a connection with Ably, or sending a `HEARTBEAT`, `CONNECT`, `ATTACH`, `DETACH` or `CLOSE` request. It is the equivalent of `httpRequestTimeout` but for realtime operations, rather than REST. The default is 10 seconds.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default 10s
     * END CANONICAL DEFAULT INFO
     */
    realtimeRequestTimeout?: number;

    /**
     * BEGIN CANONICAL DOCSTRING
     * A map between a [`PluginType`]{@link PluginType} and a `Plugin` object.
     * END CANONICAL DOCSTRING
     */
    plugins?: {
      /**
       * Not yet documented.
       */
      vcdiff?: any;
    };
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * Passes authentication-specific properties in authentication requests to Ably. Properties set using `AuthOptions` are used instead of the default values set when the client library is instantiated, as opposed to being merged with them.
   * END CANONICAL DOCSTRING
   */
  interface AuthOptions {
    /**
     * BEGIN CANONICAL DOCSTRING
     * Called when a new token is required. The role of the callback is to obtain a fresh token, one of: an Ably Token string (in plain text format); a signed [`TokenRequest`]{@link TokenRequest}; a [`TokenDetails`]{@link TokenDetails} (in JSON format); an [Ably JWT](https://ably.com/docs/core-features/authentication#ably-jwt). See [the authentication documentation](https://ably.com/docs/realtime/authentication) for details of the Ably [`TokenRequest`]{@link TokenRequest} format and associated API calls.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A function which is called when a new token is required. The role of the callback is to obtain a fresh token, one of: an Ably Token string (in plain text format); a signed `TokenRequest` ; a `TokenDetails` (in JSON format); an [Ably JWT](https://ably.com/documentation/core-features/authentication#ably-jwt). See [an authentication callback example](https://jsbin.ably.com/azazav/1/edit?javascript,live) or [our authentication documentation](https://ably.com/documentation/rest/authentication) for details of the Ably TokenRequest format and associated API calls.
     * END LEGACY DOCSTRING
     *
     * @param data - Not yet documented.
     * @param callback - Not yet documented.
     */
    authCallback?(
      data: TokenParams,
      /**
       * Not yet documented.
       *
       * @param error - Not yet documented.
       * @param tokenRequestOrDetails - Not yet documented.
       */
      callback: (error: ErrorInfo | string, tokenRequestOrDetails: TokenDetails | TokenRequest | string) => void
    ): void;

    /**
     * BEGIN CANONICAL DOCSTRING
     * A set of key-value pair headers to be added to any request made to the `authUrl`. Useful when an application requires these to be added to validate the request or implement the response. If the `authHeaders` object contains an `authorization` key, then `withCredentials` is set on the XHR request.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A set of key value pair headers to be added to any request made to the `authUrl`. Useful when an application requires these to be added to validate the request or implement the response. If the `authHeaders` object contains an `authorization` key, then [the `withCredentials` property](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/withCredentials) will be set on the underlying XHR (`XMLHttpRequest`) object.
     * END LEGACY DOCSTRING
     */
    authHeaders?: { [index: string]: string };

    /**
     * BEGIN CANONICAL DOCSTRING
     * The HTTP verb to use for any request made to the `authUrl`, either `GET` or `POST`. The default value is `GET`.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default .GET
     * END CANONICAL DEFAULT INFO
     *
     * BEGIN LEGACY DOCSTRING
     * The HTTP verb to use for the request, either `GET` or `POST`. Defaults to `GET`.
     * END LEGACY DOCSTRING
     */
    authMethod?: HTTPMethods;

    /**
     * BEGIN CANONICAL DOCSTRING
     * A set of key-value pair params to be added to any request made to the `authUrl`. When the `authMethod` is `GET`, query params are added to the URL, whereas when `authMethod` is `POST`, the params are sent as URL encoded form data. Useful when an application requires these to be added to validate the request or implement the response.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A set of key value pair params to be added to any request made to the `authUrl`. When the `authMethod` is `GET`, query params are added to the URL, whereas when `authMethod` is `POST`, the params are sent as URL encoded form data. Useful when an application require these to be added to validate the request or implement the response.
     * END LEGACY DOCSTRING
     */
    authParams?: { [index: string]: string };

    /**
     * BEGIN CANONICAL DOCSTRING
     * A URL that the library may use to obtain a token string (in plain text format), or a signed [`TokenRequest`]{@link TokenRequest} or [`TokenDetails`]{@link TokenDetails} (in JSON format) from.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A URL that the library may use to obtain a token string (in plain text format), or a signed TokenRequest or TokenDetails (in JSON format).
     * END LEGACY DOCSTRING
     */
    authUrl?: string;

    /**
     * BEGIN CANONICAL DOCSTRING
     * The full API key string, as obtained from the [Ably dashboard](https://ably.com/dashboard). Use this option if you wish to use Basic authentication, or wish to be able to issue Ably Tokens without needing to defer to a separate entity to sign Ably [`TokenRequest`s]{@link TokenRequest}. Read more about [Basic authentication](https://ably.com/docs/core-features/authentication#basic-authentication).
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The full key string, as obtained from the [application dashboard](https://faqs.ably.com/how-do-i-access-my-app-dashboard). Use this option if you wish to use Basic authentication, or wish to be able to issue Ably Tokens without needing to defer to a separate entity to sign Ably TokenRequests. Read more about [Basic authentication](https://ably.com/documentation/core-features/authentication#basic-authentication).
     * END LEGACY DOCSTRING
     */
    key?: string;

    /**
     * BEGIN CANONICAL DOCSTRING
     * If `true`, the library queries the Ably servers for the current time when issuing [`TokenRequest`s]{@link TokenRequest} instead of relying on a locally-available time of day. Knowing the time accurately is needed to create valid signed Ably [`TokenRequest`s]{@link TokenRequest}, so this option is useful for library instances on auth servers where for some reason the server clock cannot be kept synchronized through normal means, such as an [NTP daemon](https://en.wikipedia.org/wiki/Ntpd). The server is queried for the current time once per client library instance (which stores the offset from the local clock), so if using this option you should avoid instancing a new version of the library for each request. The default is `false`.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default false
     * END CANONICAL DEFAULT INFO
     *
     * BEGIN LEGACY DOCSTRING
     * If true, the library will query the Ably servers for the current time when issuing `TokenRequest`s instead of relying on a locally-available time of day. Knowing the time accurately is needed to create valid signed Ably [TokenRequests](https://ably.com/documentation/realtime/authentication#token-authentication), so this option is useful for library instances on auth servers where for some reason the server clock cannot be kept synchronized through normal means, such as an [NTP daemon](https://en.wikipedia.org/wiki/Ntpd). The server is queried for the current time once per client library instance (which stores the offset from the local clock), so if using this option you should avoid instancing a new version of the library for each request.
     * END LEGACY DOCSTRING
     */
    queryTime?: boolean;

    /**
     * BEGIN CANONICAL DOCSTRING
     * An authenticated token. This can either be a [`TokenDetails`]{@link TokenDetails} object, a [`TokenRequest`]{@link TokenRequest} object, or token string (obtained from the `token` property of a [`TokenDetails`]{@link TokenDetails} component of an Ably [`TokenRequest`]{@link TokenRequest} response, or a JSON Web Token satisfying [the Ably requirements for JWTs](https://ably.com/docs/core-features/authentication#ably-jwt)). This option is mostly useful for testing: since tokens are short-lived, in production you almost always want to use an authentication method that enables the client library to renew the token automatically when the previous one expires, such as `authUrl` or `authCallback`. Read more about [Token authentication](https://ably.com/docs/core-features/authentication#token-authentication).
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * An authenticated token. This can either be a `TokenDetails` object, a `TokenRequest` object, or token string (obtained from the `token` property of a `TokenDetails` component of an Ably TokenRequest response, or a JSON Web Token satisfying [the Ably requirements for JWTs](https://ably.com/documentation/core-features/authentication#ably-jwt)). This option is mostly useful for testing: since tokens are short-lived, in production you almost always want to use an authentication method that allows the client library to renew the token automatically when the previous one expires, such as `authUrl` or `authCallback`. Read more about [Token authentication](https://ably.com/documentation/core-features/authentication#token-authentication).
     * END LEGACY DOCSTRING
     */
    token?: TokenDetails | string;

    /**
     * BEGIN CANONICAL DOCSTRING
     * An authenticated [`TokenDetails`]{@link TokenDetails} object (most commonly obtained from an Ably Token Request response). This option is mostly useful for testing: since tokens are short-lived, in production you almost always want to use an authentication method that enables the client library to renew the token automatically when the previous one expires, such as `authUrl` or `authCallback`. Use this option if you wish to use Token authentication. Read more about [Token authentication](https://ably.com/docs/core-features/authentication#token-authentication).
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * An authenticated `TokenDetails` object (most commonly obtained from an Ably Token Request response). This option is mostly useful for testing: since tokens are short-lived, in production you almost always want to use an authentication method that allows the client library to renew the token automatically when the previous one expires, such as `authUrl` or `authCallback`. Use this option if you wish to use Token authentication. Read more about [Token authentication](https://ably.com/documentation/core-features/authentication#token-authentication).
     * END LEGACY DOCSTRING
     */
    tokenDetails?: TokenDetails;

    /**
     * BEGIN CANONICAL DOCSTRING
     * When `true`, forces token authentication to be used by the library. If a `clientId` is not specified in the [`ClientOptions`]{@link ClientOptions} or [`TokenParams`]{@link TokenParams}, then the Ably Token issued is [anonymous](https://ably.com/docs/core-features/authentication#identified-clients).
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * When true, forces Token authentication to be used by the library. Please note that if a `clientId` is not specified in the `ClientOptions` or `TokenParams`, then the Ably Token issued will be [anonymous](https://faqs.ably.com/authenticated-and-identified-clients).
     * END LEGACY DOCSTRING
     */
    useTokenAuth?: boolean;

    /**
     * BEGIN LEGACY DOCSTRING
     * A client ID, used for identifying this client when publishing messages or for presence purposes. The `clientId` can be any non-empty string. This option is primarily intended to be used in situations where the library is instantiated with a key; note that a `clientId` may also be implicit in a token used to instantiate the library; an error will be raised if a `clientId` specified here conflicts with the `clientId` implicit in the token. Find out more about [client identities](https://ably.com/documentation/how-ably-works#client-identity).
     * END LEGACY DOCSTRING
     */

    /**
     * BEGIN CANONICAL DOCSTRING
     * A client ID, used for identifying this client when publishing messages or for presence purposes. The `clientId` can be any non-empty string, except it cannot contain a `*`. This option is primarily intended to be used in situations where the library is instantiated with a key. Note that a `clientId` may also be implicit in a token used to instantiate the library. An error will be raised if a `clientId` specified here conflicts with the `clientId` implicit in the token.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Optional clientId that can be used to specify the identity for this client. In most cases
     * it is preferable to instead specify a clientId in the token issued to this client.
     * END LEGACY DOCSTRING
     */
    clientId?: string;
  }

  /**
   * Not yet documented.
   */
  type capabilityOp =
    | 'publish'
    | 'subscribe'
    | 'presence'
    | 'history'
    | 'stats'
    | 'channel-metadata'
    | 'push-subscribe'
    | 'push-admin';
  /**
   * Not yet documented.
   */
  type CapabilityOp = capabilityOp;

  /**
   * BEGIN CANONICAL DOCSTRING
   * Defines the properties of an Ably Token.
   * END CANONICAL DOCSTRING
   *
   * BEGIN LEGACY DOCSTRING
   * An object providing parameters of a token request. These params are used when invoking `Auth.authorize`, `Auth.requestToken`, and `Auth.createTokenRequest`.
   * END LEGACY DOCSTRING
   */
  interface TokenParams {
    /**
     * BEGIN CANONICAL DOCSTRING
     * The capabilities associated with this Ably Token. The capabilities value is a JSON-encoded representation of the resource paths and associated operations. Read more about capabilities in the [capabilities docs](https://ably.com/docs/core-features/authentication/#capabilities-explained).
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL API DEFAULT
     * api-default `'{"*":["*"]}'`
     * END CANONICAL API DEFAULT
     *
     * BEGIN LEGACY DOCSTRING
     * Capability requirements JSON stringified for the token. When omitted, Ably will default to the capabilities of the underlying key.
     * END LEGACY DOCSTRING
     */
    capability?: { [key: string]: capabilityOp[] } | string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * A client ID, used for identifying this client when publishing messages or for presence purposes. The `clientId` can be any non-empty string, except it cannot contain a `*`. This option is primarily intended to be used in situations where the library is instantiated with a key. Note that a `clientId` may also be implicit in a token used to instantiate the library. An error is raised if a `clientId` specified here conflicts with the `clientId` implicit in the token. Find out more about [identified clients](https://ably.com/docs/core-features/authentication#identified-clients).
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A `clientId` string to associate with this token. If `clientId` is `null` or omitted, then the token is prohibited from assuming a `clientId` in any operations, however if clientId` `is a wildcard string '*', then the token is permitted to assume any `clientId`. Any other string value for `clientId` implies that the `clientId` is both enforced and assumed for all operations for this token.
     * END LEGACY DOCSTRING
     */
    clientId?: string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * A cryptographically secure random string of at least 16 characters, used to ensure the [`TokenRequest`]{@link TokenRequest} cannot be reused.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * An unquoted, un-escaped random string of at least 16 characters, used to ensure the TokenRequest cannot be reused.
     * END LEGACY DOCSTRING
     */
    nonce?: string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The timestamp of this request as milliseconds since the Unix epoch. Timestamps, in conjunction with the `nonce`, are used to prevent requests from being replayed. `timestamp` is a "one-time" value, and is valid in a request, but is not validly a member of any default token params such as `ClientOptions.defaultTokenParams`.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     *  The timestamp (in milliseconds since the epoch) of this request. Timestamps, in conjunction with the `nonce`, are used to prevent requests from being replayed. `timestamp` is a “one-time” value, and is valid in a request, but is not validly a member of any default token params such as `ClientOptions.defaultTokenParams`.
     * END LEGACY DOCSTRING
     */
    timestamp?: number;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Requested time to live for the token in milliseconds. The default is 60 minutes.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL API DEFAULT
     * api-default 60min
     * END CANONICAL API DEFAULT
     *
     * BEGIN LEGACY DOCSTRING
     * Requested time to live for the token in milliseconds. When omitted, Ably will default to a TTL of 60 minutes.
     * END LEGACY DOCSTRING
     */
    ttl?: number;
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * Sets the properties to configure encryption for a [`RestChannel`]{@link RestChannel} or [`RealtimeChannel`]{@link RealtimeChannel} object.
   * END CANONICAL DOCSTRING
   *
   * BEGIN LEGACY DOCSTRING
   * An object containing configuration options for a channel cipher, including algorithm, mode, key length and key. ably-js currently supports AES with CBC, PKCS#7 with a default key length of 256 bits, and AES128.
   * END LEGACY DOCSTRING
   */
  interface CipherParams {
    /**
     * BEGIN CANONICAL DOCSTRING
     * The algorithm to use for encryption. Only `AES` is supported and is the default value.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default "AES"
     * END CANONICAL DEFAULT INFO
     *
     * BEGIN LEGACY DOCSTRING
     * The name of the algorithm in the default system provider, or the lower-cased version of it; eg “aes” or “AES”.
     * END LEGACY DOCSTRING
     */
    algorithm: string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The private key used to encrypt and decrypt payloads.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A binary (`ArrayBuffer` or `WordArray`) or base64-encoded String containing the secret key used for encryption and decryption.
     * END LEGACY DOCSTRING
     */
    key: CipherKey;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The length of the key in bits; for example 128 or 256.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The key length in bits of the cipher, either 128 or 256.
     * END LEGACY DOCSTRING
     */
    keyLength: number;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The cipher mode. Only `CBC` is supported and is the default value.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DEFAULT INFO
     * default "CBC"
     * END CANONICAL DEFAULT INFO
     *
     * BEGIN LEGACY DOCSTRING
     * The cipher mode (default: CBC).
     * END LEGACY DOCSTRING
     */
    mode: string;
  }

  /**
   * BEGIN LEGACY DOCSTRING
   * A type encapsulating error information containing an Ably-specific error code and generic status code.
   * END LEGACY DOCSTRING
   */
  interface ErrorInfo {
    /**
     * BEGIN LEGACY DOCSTRING
     * Ably error code (see [ably-common/protocol/errors.json](https://github.com/ably/ably-common/blob/main/protocol/errors.json)).
     * END LEGACY DOCSTRING
     */
    code: number;
    /**
     * BEGIN LEGACY DOCSTRING
     * Additional message information, where available.
     * END LEGACY DOCSTRING
     */
    message: string;
    /**
     * BEGIN LEGACY DOCSTRING
     * HTTP Status Code corresponding to this error, where applicable.
     * END LEGACY DOCSTRING
     */
    statusCode: number;
  }

  /**
   * BEGIN LEGACY DOCSTRING
   * Aggregate counts for messages and data transferred.
   * END LEGACY DOCSTRING
   */
  interface StatsMessageCount {
    /**
     * BEGIN LEGACY DOCSTRING
     * Count of all messages.
     * END LEGACY DOCSTRING
     */
    count: number;
    /**
     * BEGIN LEGACY DOCSTRING
     * Total data transferred for all messages in bytes.
     * END LEGACY DOCSTRING
     */
    data: number;
  }

  /**
   * BEGIN LEGACY DOCSTRING
   * A breakdown of summary stats data for different (message vs presence) message types.
   * END LEGACY DOCSTRING
   */
  interface StatsMessageTypes {
    /**
     * BEGIN LEGACY DOCSTRING
     * All messages count (includes both presence & messages).
     * END LEGACY DOCSTRING
     */
    all: StatsMessageCount;
    /**
     * BEGIN LEGACY DOCSTRING
     * Count of channel messages.
     * END LEGACY DOCSTRING
     */
    messages: StatsMessageCount;
    /**
     * BEGIN LEGACY DOCSTRING
     * Count of presence messages.
     * END LEGACY DOCSTRING
     */
    presence: StatsMessageCount;
  }

  /**
   * BEGIN LEGACY DOCSTRING
   * Aggregate counts for requests made.
   * END LEGACY DOCSTRING
   */
  interface StatsRequestCount {
    /**
     * BEGIN LEGACY DOCSTRING
     * Requests failed.
     * END LEGACY DOCSTRING
     */
    failed: number;
    /**
     * BEGIN LEGACY DOCSTRING
     * Requests refused typically as a result of permissions or a limit being exceeded.
     * END LEGACY DOCSTRING
     */
    refused: number;
    /**
     * BEGIN LEGACY DOCSTRING
     * Requests succeeded.
     * END LEGACY DOCSTRING
     */
    succeeded: number;
  }

  /**
   * BEGIN LEGACY DOCSTRING
   * Aggregate data for usage of a resource in a specific scope.
   * END LEGACY DOCSTRING
   */
  interface StatsResourceCount {
    /**
     * BEGIN LEGACY DOCSTRING
     * Average resources of this type used for this period.
     * END LEGACY DOCSTRING
     */
    mean: number;
    /**
     * BEGIN LEGACY DOCSTRING
     * Minimum total resources of this type used for this period.
     * END LEGACY DOCSTRING
     */
    min: number;
    /**
     * BEGIN LEGACY DOCSTRING
     * Total resources of this type opened.
     * END LEGACY DOCSTRING
     */
    opened: number;
    /**
     * BEGIN LEGACY DOCSTRING
     * Peak resources of this type used for this period.
     * END LEGACY DOCSTRING
     */
    peak: number;
    /**
     * BEGIN LEGACY DOCSTRING
     * Resource requests refused within this period.
     * END LEGACY DOCSTRING
     */
    refused: number;
  }

  /**
   * BEGIN LEGACY DOCSTRING
   * A breakdown of summary stats data for different (TLS vs non-TLS) connection types.
   * END LEGACY DOCSTRING
   */
  interface StatsConnectionTypes {
    /**
     * BEGIN LEGACY DOCSTRING
     * All connection count (includes both TLS & non-TLS connections).
     * END LEGACY DOCSTRING
     */
    all: StatsResourceCount;
    /**
     * BEGIN LEGACY DOCSTRING
     * Non-TLS connection count (unencrypted).
     * END LEGACY DOCSTRING
     */
    plain: StatsResourceCount;
    /**
     * BEGIN LEGACY DOCSTRING
     * TLS connection count.
     * END LEGACY DOCSTRING
     */
    tls: StatsResourceCount;
  }

  /**
   * BEGIN LEGACY DOCSTRING
   * A breakdown of summary stats data for traffic over various transport types.
   * END LEGACY DOCSTRING
   */
  interface StatsMessageTraffic {
    /**
     * BEGIN LEGACY DOCSTRING
     * All messages count (includes realtime, rest and webhook messages).
     * END LEGACY DOCSTRING
     */
    all: StatsMessageTypes;
    /**
     * BEGIN LEGACY DOCSTRING
     * Count of messages transferred over a realtime transport such as WebSockets.
     * END LEGACY DOCSTRING
     */
    realtime: StatsMessageTypes;
    /**
     * BEGIN LEGACY DOCSTRING
     * Count of messages transferred using REST.
     * END LEGACY DOCSTRING
     */
    rest: StatsMessageTypes;
    /**
     * BEGIN LEGACY DOCSTRING
     * Count of messages delivered using WebHooks.
     * END LEGACY DOCSTRING
     */
    webhook: StatsMessageTypes;
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * Contains an Ably Token and its associated metadata.
   * END CANONICAL DOCSTRING
   *
   * BEGIN LEGACY DOCSTRING
   * The details of Ably Token string and its associated metadata.
   * END LEGACY DOCSTRING
   */
  interface TokenDetails {
    /**
     * BEGIN CANONICAL DOCSTRING
     * The capabilities associated with this Ably Token. The capabilities value is a JSON-encoded representation of the resource paths and associated operations. Read more about capabilities in the [capabilities docs](https://ably.com/docs/core-features/authentication/#capabilities-explained).
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The capability associated with this Ably Token. The capability is a a JSON stringified canonicalized representation of the resource paths and associated operations. [Read more about authentication and capabilities](https://ably.com/documentation/core-features/authentication/#capabilities-explained).
     * END LEGACY DOCSTRING
     */
    capability: string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The client ID, if any, bound to this Ably Token. If a client ID is included, then the Ably Token authenticates its bearer as that client ID, and the Ably Token may only be used to perform operations on behalf of that client ID. The client is then considered to be an [identified client](https://ably.com/docs/core-features/authentication#identified-clients).
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The client ID, if any, bound to this Ably Token. If a client ID is included, then the Ably Token authenticates its bearer as that client ID, and the Ably Token may only be used to perform operations on behalf of that client ID. The client is then considered to be an [identified client](https://ably.com/documentation/core-features/authentication#identified-clients).
     * END LEGACY DOCSTRING
     */
    clientId?: string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The timestamp at which this token expires as milliseconds since the Unix epoch.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The time (in milliseconds since the epoch) at which this token expires.
     * END LEGACY DOCSTRING
     */
    expires: number;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The timestamp at which this token was issued as milliseconds since the Unix epoch.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The time (in milliseconds since the epoch) at which this token was issued.
     * END LEGACY DOCSTRING
     */
    issued: number;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The [Ably Token](https://ably.com/docs/core-features/authentication#ably-tokens) itself. A typical Ably Token string appears with the form `xVLyHw.A-pwh7wicf3afTfgiw4k2Ku33kcnSA7z6y8FjuYpe3QaNRTEo4`.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The [Ably Token](https://ably.com/documentation/core-features/authentication#ably-tokens) itself. A typical Ably Token string may appear like `xVLyHw.A-pwh7wicf3afTfgiw4k2Ku33kcnSA7z6y8FjuYpe3QaNRTEo4`.
     * END LEGACY DOCSTRING
     */
    token: string;
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * Contains the properties of a request for a token to Ably. Tokens are generated using [`requestToken`]{@link Auth#requestToken}.
   * END CANONICAL DOCSTRING
   *
   * BEGIN LEGACY DOCSTRING
   * The parameters for an Ably TokenRequest. Tokens are requested using `Auth.requestToken`.
   * END LEGACY DOCSTRING
   */
  interface TokenRequest {
    /**
     * BEGIN CANONICAL DOCSTRING
     * Capability of the requested Ably Token. If the Ably `TokenRequest` is successful, the capability of the returned Ably Token will be the intersection of this capability with the capability of the issuing key. The capabilities value is a JSON-encoded representation of the resource paths and associated operations. Read more about capabilities in the [capabilities docs](https://ably.com/docs/realtime/authentication).
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Capability of the requested Ably Token. If the Ably TokenRequest is successful, the capability of the returned Ably Token will be the intersection of this capability with the capability of the issuing key. The capability is a JSON stringified canonicalized representation of the resource paths and associated operations. [Read more about authentication and capabilities](https://ably.com/documentation/realtime/authentication).
     * END LEGACY DOCSTRING
     */
    capability: string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The client ID to associate with the requested Ably Token. When provided, the Ably Token may only be used to perform operations on behalf of that client ID.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The client ID to associate with the requested Ably Token. When provided, the Ably Token may only be used to perform operations on behalf of that client ID.
     * END LEGACY DOCSTRING
     */
    clientId?: string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The name of the key against which this request is made. The key name is public, whereas the key secret is private.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The key name of the key against which this request is made. The key name is public, whereas the key secret is private.
     * END LEGACY DOCSTRING
     */
    keyName: string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The Message Authentication Code for this request.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The Message Authentication Code for this request.
     * END LEGACY DOCSTRING
     */
    mac: string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * A cryptographically secure random string of at least 16 characters, used to ensure the `TokenRequest` cannot be reused.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * An opaque nonce string of at least 16 characters.
     * END LEGACY DOCSTRING
     */
    nonce: string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The timestamp of this request as milliseconds since the Unix epoch.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The timestamp of this request in milliseconds.
     * END LEGACY DOCSTRING
     */
    timestamp: number;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Requested time to live for the Ably Token in milliseconds. If the Ably `TokenRequest` is successful, the TTL of the returned Ably Token is less than or equal to this value, depending on application settings and the attributes of the issuing key. The default is 60 minutes.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL API DEFAULT
     * api-default 60min
     * END CANONICAL API DEFAULT
     *
     * BEGIN LEGACY DOCSTRING
     * Requested time to live for the Ably Token in milliseconds. If the Ably TokenRequest is successful, the TTL of the returned Ably Token will be less than or equal to this value depending on application settings and the attributes of the issuing key.
     * END LEGACY DOCSTRING
     */
    ttl?: number;
  }

  /**
   * Not yet documented.
   */
  type ChannelParams = { [key: string]: string };

  /**
   * Not yet documented.
   */
  namespace ChannelMode {
    /**
     * BEGIN CANONICAL DOCSTRING
     * The client can publish messages.
     * END CANONICAL DOCSTRING
     */
    type PUBLISH = 'PUBLISH';
    /**
     * BEGIN CANONICAL DOCSTRING
     * The client can subscribe to messages.
     * END CANONICAL DOCSTRING
     */
    type SUBSCRIBE = 'SUBSCRIBE';
    /**
     * BEGIN CANONICAL DOCSTRING
     * The client can enter the presence set.
     * END CANONICAL DOCSTRING
     */
    type PRESENCE = 'PRESENCE';
    /**
     * BEGIN CANONICAL DOCSTRING
     * The client can receive presence messages.
     * END CANONICAL DOCSTRING
     */
    type PRESENCE_SUBSCRIBE = 'PRESENCE_SUBSCRIBE';
    /**
     * Not yet documented.
     */
    type ATTACH_RESUME = 'ATTACH_RESUME';
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * Describes the possible flags used to configure client capabilities, using [`ChannelOptions`]{@link ChannelOptions}.
   * END CANONICAL DOCSTRING
   */
  type ChannelMode =
    | ChannelMode.PUBLISH
    | ChannelMode.SUBSCRIBE
    | ChannelMode.PRESENCE
    | ChannelMode.PRESENCE_SUBSCRIBE
    | ChannelMode.ATTACH_RESUME;
  /**
   * Not yet documented.
   */
  type ChannelModes = Array<ChannelMode>;

  /**
   * BEGIN CANONICAL DOCSTRING
   * Passes additional properties to a [`RestChannel`]{@link RestChannel} or [`RealtimeChannel`]{@link RealtimeChannel} object, such as encryption, [`ChannelMode`]{@link ChannelMode} and channel parameters.
   * END CANONICAL DOCSTRING
   *
   * BEGIN LEGACY DOCSTRING
   * Channel options are used for setting [channel parameters](https://ably.com/documentation/realtime/channels/channel-parameters/overview) and [configuring encryption](https://ably.com/documentation/realtime/encryption).
   * END LEGACY DOCSTRING
   */
  interface ChannelOptions {
    /**
     * BEGIN CANONICAL DOCSTRING
     * Requests encryption for this channel when not null, and specifies encryption-related parameters (such as algorithm, chaining mode, key length and key). See [an example](https://ably.com/docs/realtime/encryption#getting-started).
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Requests encryption for this channel when not null, and specifies encryption-related parameters (such as algorithm, chaining mode, key length and key). See [an example](https://ably.com/documentation/realtime/encryption#getting-started).
     * END LEGACY DOCSTRING
     */
    cipher?: CipherParamOptions | CipherParams;
    /**
     * BEGIN CANONICAL DOCSTRING
     * [Channel Parameters](https://ably.com/docs/realtime/channels/channel-parameters/overview) that configure the behavior of the channel.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Optional [parameters](https://ably.com/documentation/realtime/channels/channel-parameters/overview) which specify behaviour of the channel.
     * END LEGACY DOCSTRING
     */
    params?: ChannelParams;
    /**
     * BEGIN CANONICAL DOCSTRING
     * An array of [`ChannelMode`]{@link ChannelMode} objects.
     * END CANONICAL DOCSTRING
     */
    modes?: ChannelModes;
  }

  /**
   * Not yet documented.
   */
  interface RestHistoryParams {
    /**
     * BEGIN LEGACY DOCSTRING
     * Earliest time in milliseconds since the epoch for any messages retrieved.
     * END LEGACY DOCSTRING
     */
    start?: number;
    /**
     * BEGIN LEGACY DOCSTRING
     * Latest time in milliseconds since the epoch for any messages retrieved.
     * END LEGACY DOCSTRING
     */
    end?: number;
    /**
     * BEGIN LEGACY DOCSTRING
     * The direction to order messages retrieved. Defaults to backwards.
     * END LEGACY DOCSTRING
     */
    direction?: 'forwards' | 'backwards';
    /**
     * BEGIN LEGACY DOCSTRING
     * Maximum number of messages to retrieve up to 1,000. Defaults to 100.
     * END LEGACY DOCSTRING
     */
    limit?: number;
  }

  /**
   * Not yet documented.
   */
  interface RestPresenceParams {
    /**
     * BEGIN LEGACY DOCSTRING
     * Maximum number of presence members to retrieve.
     * END LEGACY DOCSTRING
     */
    limit?: number;
    /**
     * BEGIN LEGACY DOCSTRING
     * When provided, will filter array of members returned that match the provided clientId string.
     * END LEGACY DOCSTRING
     */
    clientId?: string;
    /**
     * BEGIN LEGACY DOCSTRING
     * When provided, will filter array of members returned that match the provided connectionId string.
     * END LEGACY DOCSTRING
     */
    connectionId?: string;
  }

  /**
   * Not yet documented.
   */
  interface RealtimePresenceParams {
    /**
     * BEGIN LEGACY DOCSTRING
     * When true (default) waits for the initial presence synchronization following channel attachment to complete before returning the members present. When false, the current list of members is returned without waiting for a complete synchronization.
     * END LEGACY DOCSTRING
     */
    waitForSync?: boolean;
    /**
     * BEGIN LEGACY DOCSTRING
     * When provided, will filter array of members returned that match the provided clientId string.
     * END LEGACY DOCSTRING
     */
    clientId?: string;
    /**
     * BEGIN LEGACY DOCSTRING
     * When provided, will filter array of members returned that match the provided connectionId string.
     * END LEGACY DOCSTRING
     */
    connectionId?: string;
  }

  /**
   * Not yet documented.
   */
  interface RealtimeHistoryParams {
    /**
     * BEGIN LEGACY DOCSTRING
     * Earliest time in milliseconds since the epoch for any messages retrieved.
     * END LEGACY DOCSTRING
     */
    start?: number;
    /**
     * BEGIN LEGACY DOCSTRING
     * Latest time in milliseconds since the epoch for any messages retrieved.
     * END LEGACY DOCSTRING
     */
    end?: number;
    /**
     * BEGIN LEGACY DOCSTRING
     * The direction to order messages retrieved. Defaults to backwards.
     * END LEGACY DOCSTRING
     */
    direction?: 'forwards' | 'backwards';
    /**
     * BEGIN LEGACY DOCSTRING
     * Maximum number of presence members to retrieve.
     * END LEGACY DOCSTRING
     */
    limit?: number;
    /**
     * BEGIN LEGACY DOCSTRING
     * When true, ensures message history is up until the point of the channel being attached. See [continuous history](https://ably.com/documentation/realtime/history#continuous-history) for more info. Requires the `direction` to be `backwards` (the default). If the `Channel` is not attached, or if `direction` is set to `forwards`, this option will result in an error.
     * END LEGACY DOCSTRING
     */
    untilAttach?: boolean;
  }

  /**
   * Not yet documented.
   */
  interface LogInfo {
    /**
     * BEGIN CANONICAL DOCSTRING
     * Controls the verbosity of the logs output from the library. Levels include `verbose`, `debug`, `info`, `warn` and `error`.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A number controlling the verbosity of the output. Valid values are: 0 (no logs), 1 (errors only), 2 (errors plus connection and channel state changes), 3 (high-level debug output), and 4 (full debug output).
     * END LEGACY DOCSTRING
     */
    level?: number;

    /**
     * BEGIN CANONICAL DOCSTRING
     * Controls the log output of the library. This is a function to handle each line of log output.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A function to handle each line of log output. If handler is not specified, `console.log` is used.
     * END LEGACY DOCSTRING
     *
     * @param msg - Not yet documented.
     */
    handler?: (msg: string) => void;
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * Contains state change information emitted by [`RestChannel`]{@link RestChannel} and [`RealtimeChannel`]{@link RealtimeChannel} objects.
   * END CANONICAL DOCSTRING
   */
  interface ChannelStateChange {
    /**
     * BEGIN CANONICAL DOCSTRING
     * The new current [`ChannelState`]{@link ChannelState}.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The new current state.
     * END LEGACY DOCSTRING
     */
    current: ChannelState;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The previous state. For the [`UPDATE`]{@link ChannelEvent#UPDATE} event, this is equal to the `current` [`ChannelState`]{@link ChannelState}.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The previous state. (for the `update` event, this will be equal to the current state).
     * END LEGACY DOCSTRING
     */
    previous: ChannelState;
    /**
     * BEGIN CANONICAL DOCSTRING
     * An [`ErrorInfo`]{@link ErrorInfo} object containing any information relating to the transition.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * An ErrorInfo containing any information relating to the transition.
     * END LEGACY DOCSTRING
     */
    reason?: ErrorInfo;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Indicates whether message continuity on this channel is preserved, see [Nonfatal channel errors](https://ably.com/docs/realtime/channels#nonfatal-errors) for more info.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A boolean indicated whether message continuity on this channel is preserved, see [Nonfatal channel errors](https://ably.com/documentation/realtime/channels#nonfatal-errors) for more info.
     * END LEGACY DOCSTRING
     */
    resumed: boolean;
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * Contains [`ConnectionState`]{@link} change information emitted by the [`Connection`]{@link} object.
   * END CANONICAL DOCSTRING
   */
  interface ConnectionStateChange {
    /**
     * BEGIN CANONICAL DOCSTRING
     * The new [`ConnectionState`]{@link ConnectionState}.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The new state.
     * END LEGACY DOCSTRING
     */
    current: ConnectionState;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The previous [`ConnectionState`]{@link ConnectionState}. For the [`UPDATE`]{@link ConnectionEvent#UPDATE} event, this is equal to the current [`ConnectionState`]{@link ConnectionState}.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The previous state. (for the update event, this will be equal to the current state).
     * END LEGACY DOCSTRING
     */
    previous: ConnectionState;
    /**
     * BEGIN CANONICAL DOCSTRING
     * An [`ErrorInfo`]{@link ErrorInfo} object containing any information relating to the transition.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * An ErrorInfo containing any information relating to the transition.
     * END LEGACY DOCSTRING
     */
    reason?: ErrorInfo;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Duration in milliseconds, after which the client retries a connection where applicable.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Duration upon which the client will retry a connection where applicable, as milliseconds.
     * END LEGACY DOCSTRING
     */
    retryIn?: number;
  }

  /**
   * Not yet documented.
   */
  namespace DevicePlatform {
    /**
     * BEGIN CANONICAL DOCSTRING
     * The device platform is Android.
     * END CANONICAL DOCSTRING
     */
    type ANDROID = 'android';
    /**
     * BEGIN CANONICAL DOCSTRING
     * The device platform is iOS.
     * END CANONICAL DOCSTRING
     */
    type IOS = 'ios';
    /**
     * BEGIN CANONICAL DOCSTRING
     * The device platform is a web browser.
     * END CANONICAL DOCSTRING
     */
    type BROWSER = 'browser';
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * Describes the device receiving push notifications.
   * END CANONICAL DOCSTRING
   */
  type DevicePlatform = DevicePlatform.ANDROID | DevicePlatform.IOS | DevicePlatform.BROWSER;

  /**
   * Not yet documented.
   */
  namespace DeviceFormFactor {
    /**
     * BEGIN CANONICAL DOCSTRING
     * The device is a phone.
     * END CANONICAL DOCSTRING
     */
    type PHONE = 'phone';
    /**
     * BEGIN CANONICAL DOCSTRING
     * The device is tablet.
     * END CANONICAL DOCSTRING
     */
    type TABLET = 'tablet';
    /**
     * Not yet documented.
     */
    type DESKTOP = 'desktop';
    /**
     * Not yet documented.
     */
    type TV = 'tv';
    /**
     * Not yet documented.
     */
    type WATCH = 'watch';
    /**
     * Not yet documented.
     */
    type CAR = 'car';
    /**
     * Not yet documented.
     */
    type EMBEDDED = 'embedded';
    /**
     * Not yet documented.
     */
    type OTHER = 'other';
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * Describes the type of device receiving a push notification.
   * END CANONICAL DOCSTRING
   */
  type DeviceFormFactor =
    | DeviceFormFactor.PHONE
    | DeviceFormFactor.TABLET
    | DeviceFormFactor.DESKTOP
    | DeviceFormFactor.TV
    | DeviceFormFactor.WATCH
    | DeviceFormFactor.CAR
    | DeviceFormFactor.EMBEDDED
    | DeviceFormFactor.OTHER;

  /**
   * BEGIN LEGACY DOCSTRING
   * A type encapsulating attributes of a device registered for push notifications.
   * END LEGACY DOCSTRING
   */
  interface DeviceDetails {
    /**
     * BEGIN LEGACY DOCSTRING
     * A unique identifier for the device generated by the device itself.
     * END LEGACY DOCSTRING
     */
    id: string;
    /**
     * BEGIN LEGACY DOCSTRING
     * Optional trusted [client identifier](https://ably.com/documentation/core-features/authentication#identified-clients) for the device.
     * END LEGACY DOCSTRING
     */
    clientId?: string;
    /**
     * BEGIN LEGACY DOCSTRING
     * Platform of the push device.
     * END LEGACY DOCSTRING
     */
    platform: DevicePlatform;
    /**
     * BEGIN LEGACY DOCSTRING
     * Form factor of the push device.
     * END LEGACY DOCSTRING
     */
    formFactor: DeviceFormFactor;
    /**
     * BEGIN LEGACY DOCSTRING
     * Optional metadata object for this device. The metadata for a device may only be set by clients with `push-admin` privileges.
     * END LEGACY DOCSTRING
     */
    metadata?: any;
    /**
     * BEGIN LEGACY DOCSTRING
     * Secret value for the device.
     * END LEGACY DOCSTRING
     */
    deviceSecret?: string;
    /**
     * Not yet documented.
     */
    push: DevicePushDetails;
  }

  /**
   * BEGIN LEGACY DOCSTRING
   * An object encapsulating the subscription of a device or group of devices sharing a client identifier to a channel in order to receive push notifications.
   * END LEGACY DOCSTRING
   */
  interface PushChannelSubscription {
    /**
     * BEGIN LEGACY DOCSTRING
     * The channel that this push notification subscription is associated with.
     * END LEGACY DOCSTRING
     */
    channel: string;
    /**
     * BEGIN LEGACY DOCSTRING
     * The device with this identifier is linked to this channel subscription. When present, `clientId` is never present.
     * END LEGACY DOCSTRING
     */
    deviceId?: string;
    /**
     * BEGIN LEGACY DOCSTRING
     * Devices with this client identifier are included in this channel subscription. When present, `deviceId` is never present.
     * END LEGACY DOCSTRING
     */
    clientId?: string;
  }

  /**
   * Not yet documented.
   */
  type DevicePushState = 'ACTIVE' | 'FAILING' | 'FAILED';

  /**
   * Not yet documented.
   */
  interface DevicePushDetails {
    /**
     * BEGIN LEGACY DOCSTRING
     * Push recipient details for this device. See the [REST API push publish documentation](https://ably.com/documentation/rest-api#message-extras-push) for more details.
     * END LEGACY DOCSTRING
     */
    recipient: any;
    /**
     * BEGIN LEGACY DOCSTRING
     * The current state of the push device.
     * END LEGACY DOCSTRING
     */
    state?: DevicePushState;
    /**
     * BEGIN LEGACY DOCSTRING
     * When the device’s state is failing or failed, this attribute contains the reason for the most recent failure.
     * END LEGACY DOCSTRING
     */
    error?: ErrorInfo;
  }

  /**
   * Not yet documented.
   */
  interface DeviceRegistrationParams {
    /**
     * BEGIN LEGACY DOCSTRING
     * Filter to restrict to devices associated with the given client identifier
     * END LEGACY DOCSTRING
     */
    clientId?: string;
    /**
     * BEGIN LEGACY DOCSTRING
     * Filter to restrict to devices associated with the given device identifier.
     * END LEGACY DOCSTRING
     */
    deviceId?: string;
    /**
     * BEGIN LEGACY DOCSTRING
     * Maximum number of devices per page to retrieve, up to 1,000. Defaults to 100.
     * END LEGACY DOCSTRING
     */
    limit?: number;
    /**
     * Not yet documented.
     */
    state?: DevicePushState;
  }

  /**
   * Not yet documented.
   */
  interface PushChannelSubscriptionParams {
    /**
     * BEGIN LEGACY DOCSTRING
     * Filter to restrict to subscriptions associated with the given channel.
     * END LEGACY DOCSTRING
     */
    channel?: string;
    /**
     * BEGIN LEGACY DOCSTRING
     * Filter to restrict to devices associated with the given client identifier. Cannot be used with a clientId param.
     * END LEGACY DOCSTRING
     */
    clientId?: string;
    /**
     * BEGIN LEGACY DOCSTRING
     * Filter to restrict to devices associated with that device identifier. Cannot be used with a deviceId param.
     * END LEGACY DOCSTRING
     */
    deviceId?: string;
    /**
     * BEGIN LEGACY DOCSTRING
     * Maximum number of channel subscriptions per page to retrieve, up to 1,000. Defaults to 100.
     * END LEGACY DOCSTRING
     */
    limit?: number;
  }

  /**
   * Not yet documented.
   */
  interface PushChannelsParams {
    /**
     * BEGIN LEGACY DOCSTRING
     * Maximum number of channels per page to retrieve, up to 1,000. Defaults to 100.
     * END LEGACY DOCSTRING
     */
    limit?: number;
  }

  /**
   * Not yet documented.
   */
  interface StatsParams {
    /**
     * Not yet documented.
     */
    start?: number;
    /**
     * Not yet documented.
     */
    end?: number;
    /**
     * Not yet documented.
     */
    direction?: 'backwards' | 'forwards';
    /**
     * Not yet documented.
     */
    limit?: number;
    /**
     * Not yet documented.
     */
    unit?: StatsIntervalGranularity;
  }

  // Common Listeners
  /**
   * Not yet documented.
   *
   * @param err - Not yet documented.
   * @param result - Not yet documented.
   */
  type StandardCallback<T> = (err: ErrorInfo | null, result?: T) => void;
  /**
   * Not yet documented.
   */
  type paginatedResultCallback<T> = StandardCallback<PaginatedResult<T>>;
  /**
   * Not yet documented.
   *
   * @param message - Not yet documented.
   */
  type messageCallback<T> = (message: T) => void;
  /**
   * Not yet documented.
   *
   * @param error - Not yet documented.
   */
  type errorCallback = (error?: ErrorInfo | null) => void;
  /**
   * Not yet documented.
   *
   * @param changeStateChange - Not yet documented.
   */
  type channelEventCallback = (changeStateChange: ChannelStateChange) => void;
  /**
   * Not yet documented.
   *
   * @param connectionStateChange - Not yet documented.
   */
  type connectionEventCallback = (connectionStateChange: ConnectionStateChange) => void;
  /**
   * Not yet documented.
   *
   * @param timeCallback - Not yet documented.
   */
  type timeCallback = StandardCallback<number>;
  /**
   * Not yet documented.
   *
   * @param realtimePresenceGetCallback - Not yet documented.
   */
  type realtimePresenceGetCallback = StandardCallback<PresenceMessage[]>;
  /**
   * Not yet documented.
   *
   * @param tokenDetailsCallback - Not yet documented.
   */
  type tokenDetailsCallback = StandardCallback<TokenDetails>;
  /**
   * Not yet documented.
   *
   * @param tokenRequestCallback - Not yet documented.
   */
  type tokenRequestCallback = StandardCallback<TokenRequest>;
  /**
   * Not yet documented.
   *
   * @param shouldRecover - Not yet documented.
   */
  type recoverConnectionCompletionCallback = (shouldRecover: boolean) => void;
  /**
   * Not yet documented.
   *
   * @param lastConnectionDetails - Not yet documented.
   * @param callback - Not yet documented.
   */
  type recoverConnectionCallback = (
    lastConnectionDetails: {
      /**
       * BEGIN LEGACY DOCSTRING
       * The recovery key can be used by another client to recover this connection’s state in the `recover` client options property. See [connection state recover options](https://ably.com/documentation/realtime/connection/#connection-state-recover-options) for more information.
       * END LEGACY DOCSTRING
       */
      recoveryKey: string;
      /**
       * BEGIN LEGACY DOCSTRING
       * The time at which the previous client was abruptly disconnected before the page was unloaded. This is represented as milliseconds since epoch.
       * END LEGACY DOCSTRING
       */
      disconnectedAt: number;
      /**
       * BEGIN LEGACY DOCSTRING
       * A clone of the `location` object of the previous page’s document object before the page was unloaded. A common use case for this attribute is to ensure that the previous page URL is the same as the current URL before allowing the connection to be recovered. For example, you may want the connection to be recovered only for page reloads, but not when a user navigates to a different page.
       * END LEGACY DOCSTRING
       */
      location: string;
      /**
       * BEGIN LEGACY DOCSTRING
       * The `clientId` of the client’s `Auth` object before the page was unloaded. A common use case for this attribute is to ensure that the current logged in user’s `clientId` matches the previous connection’s `clientId` before allowing the connection to be recovered. Ably prohibits changing a `clientId` for an existing connection, so any mismatch in `clientId` during a recover will result in the connection moving to the failed state.
       * END LEGACY DOCSTRING
       */
      clientId: string | null;
    },
    callback: recoverConnectionCompletionCallback
  ) => void;
  /**
   * @ignore
   * @deprecated No longer used by this library - kept here since it used to be part of our public API. Will be removed in next major version release.
   */
  type fromEncoded<T> = (JsonObject: any, channelOptions?: ChannelOptions) => T;
  /**
   * @ignore
   * @deprecated No longer used by this library - kept here since it used to be part of our public API. Will be removed in next major version release.
   */
  type fromEncodedArray<T> = (JsonArray: any[], channelOptions?: ChannelOptions) => T[];

  // Internal Classes

  // To allow a uniform (callback) interface between on and once even in the
  // promisified version of the lib, but still allow once to be used in a way
  // that returns a Promise if desired, EventEmitter uses method overloading to
  // present both methods
  /**
   * Not yet documented.
   */
  class EventEmitter<CallbackType, ResultType, EventType> {
    /**
     * Not yet documented.
     *
     * @param event - Not yet documented.
     * @param callback - Not yet documented.
     */
    on(event: EventType, callback: CallbackType): void;
    /**
     * Not yet documented.
     *
     * @param events - Not yet documented.
     * @param callback - Not yet documented.
     */
    on(events: EventType[], callback: CallbackType): void;
    /**
     * Not yet documented.
     *
     * @param callback - Not yet documented.
     */
    on(callback: CallbackType): void;
    /**
     * Not yet documented.
     *
     * @param event - Not yet documented.
     * @param callback - Not yet documented.
     */
    once(event: EventType, callback: CallbackType): void;
    /**
     * Not yet documented.
     *
     * @param callback - Not yet documented.
     */
    once(callback: CallbackType): void;
    /**
     * Not yet documented.
     *
     * @param event - Not yet documented.
     */
    once(event: EventType): Promise<ResultType>;
    /**
     * Not yet documented.
     */
    once(): Promise<ResultType>;
    /**
     * Not yet documented.
     *
     * @param event - Not yet documented.
     * @param callback - Not yet documented.
     */
    off(event: EventType, callback: CallbackType): void;
    /**
     * Not yet documented.
     *
     * @param callback - Not yet documented.
     */
    off(callback: CallbackType): void;
    /**
     * Not yet documented.
     *
     * @param eventName - Not yet documented.
     */
    listeners(eventName?: EventType): CallbackType[] | null;
  }

  // Classes
  /**
   * Not yet documented.
   */
  class RestBase {
    /**
     * BEGIN CANONICAL DOCSTRING
     * Construct a `RestClient` object using an Ably [`ClientOptions`]{@link ClientOptions} object.
     *
     * @param ClientOptions - A [`ClientOptions`]{@link ClientOptions} object to configure the client connection to Ably.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DOCSTRING
     * Constructs a `RealtimeClient` object using an Ably [`ClientOptions`]{@link ClientOptions} object.
     *
     * @param ClientOptions - A [`ClientOptions`]{@link ClientOptions} object.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Creates an Ably client instance
     *
     * @param options a ClientOptions object
     * END LEGACY DOCSTRING
     */
    constructor(options: Types.ClientOptions);
    /**
     * BEGIN CANONICAL DOCSTRING
     * Constructs a `RestClient` object using an Ably API key or token string.
     *
     * @param keyOrTokenStr - The Ably API key or token string used to validate the client.
     * END CANONICAL DOCSTRING
     *
     * BEGIN CANONICAL DOCSTRING
     * Constructs a `RealtimeClient` object using an Ably API key or token string.
     *
     * @param keyOrTokenStr - The Ably API key or token string used to validate the client.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Creates an Ably client instance
     *
     * @param keyOrToken An Ably API Key or token
     * END LEGACY DOCSTRING
     */
    constructor(keyOrToken: string);
    /**
     * Not yet documented.
     */
    static Crypto: Types.Crypto;
    /**
     * Not yet documented.
     */
    static Message: Types.MessageStatic;
    /**
     * Not yet documented.
     */
    static PresenceMessage: Types.PresenceMessageStatic;
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * A client that offers a simple stateless API to interact directly with Ably's REST API.
   * END CANONICAL DOCSTRING
   */
  class RestCallbacks extends RestBase {
    /**
     * BEGIN LEGACY DOCSTRING
     * A promisified version of the library (use this if you prefer to use Promises or async/await instead of callbacks)
     * END LEGACY DOCSTRING
     */
    static Promise: typeof Types.RestPromise;
    /**
     * Not yet documented.
     */
    static Callbacks: typeof Types.RestCallbacks;
    /**
     * BEGIN CANONICAL DOCSTRING
     * An [`Auth`]{@link Auth} object.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A reference to the Auth authentication object.
     * END LEGACY DOCSTRING
     */
    auth: Types.AuthCallbacks;
    /**
     * BEGIN CANONICAL DOCSTRING
     * A [`Channels`]{@link Channels} object.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A reference to the `Channel` collection instance.
     * END LEGACY DOCSTRING
     */
    channels: Types.Channels<Types.ChannelCallbacks>;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Makes a REST request to a provided path. This is provided as a convenience for developers who wish to use REST API functionality that is either not documented or is not yet included in the public API, without having to directly handle features such as authentication, paging, fallback hosts, MsgPack and JSON support.
     *
     * @param method - The request method to use, such as `GET`, `POST`.
     * @param path - The request path.
     * @param params - The parameters to include in the URL query of the request. The parameters depend on the endpoint being queried. See the [REST API reference](https://ably.com/docs/api/rest-api) for the available parameters of each endpoint.
     * @param body - The JSON body of the request.
     * @param headers - Additional HTTP headers to include in the request.
     *
     * @returns An [`HttpPaginatedResponse`]{@link HttpPaginatedResponse} object returned by the HTTP request, containing an empty or JSON-encodable object.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Makes a REST request to a provided path. This is provided as a convenience for developers who wish to use REST API functionality that is either not documented or is not yet included in the public API, without having to handle authentication, paging, fallback hosts, MsgPack and JSON support, etc. themselves.
     * END LEGACY DOCSTRING
     *
     * @param method - Not yet documented.
     * @param path - Not yet documented.
     * @param params - Not yet documented.
     * @param body - Not yet documented.
     * @param headers - Not yet documented.
     * @param callback - Not yet documented.
     */
    request<T = any>(
      method: string,
      path: string,
      params?: any,
      body?: any[] | any,
      headers?: any,
      callback?: Types.StandardCallback<Types.HttpPaginatedResponse<T>>
    ): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Queries the REST `/stats` API and retrieves your application's usage statistics. Returns a [`PaginatedResult`]{@link PaginatedResult} object, containing an array of [`Stats`]{@link Stats} objects. See the [Stats docs](https://ably.com/docs/general/statistics).
     *
     * @param start - The time from which stats are retrieved, specified as milliseconds since the Unix epoch.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default epoch()
     * END PARAM CANONICAL API DEFAULT
     * @param end - The time until stats are retrieved, specified as milliseconds since the Unix epoch.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default now()
     * END PARAM CANONICAL API DEFAULT
     * @param direction - The order for which stats are returned in. Valid values are `backwards` which orders stats from most recent to oldest, or `forwards` which orders stats from oldest to most recent. The default is `backwards`.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default .Backwards
     * END PARAM CANONICAL API DEFAULT
     * @param limit - An upper limit on the number of stats returned. The default is 100, and the maximum is 1000.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default 100
     * END PARAM CANONICAL API DEFAULT
     * @param unit - `minute`, `hour`, `day` or `month`. Based on the unit selected, the given `start` or `end` times are rounded down to the start of the relevant interval depending on the unit granularity of the query.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default .Minute
     * END PARAM CANONICAL API DEFAULT
     *
     * @returns A [`PaginatedResult`]{@link PaginatedResult} object containing an array of [`Stats`]{@link Stats} objects.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Queries the [REST `/stats` API](https://ably.com/documentation/rest-api#stats) and retrieves your application’s usage statistics. A PaginatedResult is returned, containing an array of stats for the first page of results. PaginatedResult objects are iterable providing a means to page through historical statistics. [See an example set of raw stats returned via the REST API](https://ably.com/documentation/general/statistics).
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     * @param callback - Not yet documented.
     */
    stats(
      params?:
        | StatsParams
        | any /* The `any` here is for backwards compatibility - will be removed in next major release of this SDK. */,
      callback?: Types.paginatedResultCallback<Types.Stats>
    ): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Queries the REST `/stats` API and retrieves your application's usage statistics. Returns a [`PaginatedResult`]{@link PaginatedResult} object, containing an array of [`Stats`]{@link Stats} objects. See the [Stats docs](https://ably.com/docs/general/statistics).
     *
     * @param start - The time from which stats are retrieved, specified as milliseconds since the Unix epoch.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default epoch()
     * END PARAM CANONICAL API DEFAULT
     * @param end - The time until stats are retrieved, specified as milliseconds since the Unix epoch.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default now()
     * END PARAM CANONICAL API DEFAULT
     * @param direction - The order for which stats are returned in. Valid values are `backwards` which orders stats from most recent to oldest, or `forwards` which orders stats from oldest to most recent. The default is `backwards`.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default .Backwards
     * END PARAM CANONICAL API DEFAULT
     * @param limit - An upper limit on the number of stats returned. The default is 100, and the maximum is 1000.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default 100
     * END PARAM CANONICAL API DEFAULT
     * @param unit - `minute`, `hour`, `day` or `month`. Based on the unit selected, the given `start` or `end` times are rounded down to the start of the relevant interval depending on the unit granularity of the query.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default .Minute
     * END PARAM CANONICAL API DEFAULT
     *
     * @returns A [`PaginatedResult`]{@link PaginatedResult} object containing an array of [`Stats`]{@link Stats} objects.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Queries the [REST `/stats` API](https://ably.com/documentation/rest-api#stats) and retrieves your application’s usage statistics. A PaginatedResult is returned, containing an array of stats for the first page of results. PaginatedResult objects are iterable providing a means to page through historical statistics. [See an example set of raw stats returned via the REST API](https://ably.com/documentation/general/statistics).
     * END LEGACY DOCSTRING
     *
     * @param callback - Not yet documented.
     */
    stats(callback?: Types.paginatedResultCallback<Types.Stats>): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Retrieves the time from the Ably service as milliseconds since the Unix epoch. Clients that do not have access to a sufficiently well maintained time source and wish to issue Ably [`TokenRequest`s]{@link TokenRequest} with a more accurate timestamp should use the [`queryTime`]{@link ClientOptions#queryTime} property instead of this method.
     *
     * @returns The time as milliseconds since the Unix epoch.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Obtains the time from the Ably service as milliseconds since epoch. (Clients that do not have access to a sufficiently well maintained time source and wish to issue Ably TokenRequests with a more accurate timestamp should use the `queryTime` ClientOption instead of this method).
     * END LEGACY DOCSTRING
     *
     * @param callback - Not yet documented.
     */
    time(callback?: Types.timeCallback): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * A [`Push`]{@link Push} object.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A reference to the `Push` object.
     * END LEGACY DOCSTRING
     */
    push: Types.PushCallbacks;
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * A client that offers a simple stateless API to interact directly with Ably's REST API.
   * END CANONICAL DOCSTRING
   */
  class RestPromise extends RestBase {
    /**
     * BEGIN LEGACY DOCSTRING
     * A promisified version of the library (use this if you prefer to use Promises or async/await instead of callbacks)
     * END LEGACY DOCSTRING
     */
    static Promise: typeof Types.RestPromise;
    /**
     * Not yet documented.
     */
    static Callbacks: typeof Types.RestCallbacks;
    /**
     * BEGIN CANONICAL DOCSTRING
     * An [`Auth`]{@link Auth} object.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A reference to the Auth authentication object.
     * END LEGACY DOCSTRING
     */
    auth: Types.AuthPromise;
    /**
     * BEGIN CANONICAL DOCSTRING
     * A [`Channels`]{@link Channels} object.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A reference to the `Channel` collection instance.
     * END LEGACY DOCSTRING
     */
    channels: Types.Channels<Types.ChannelPromise>;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Makes a REST request to a provided path. This is provided as a convenience for developers who wish to use REST API functionality that is either not documented or is not yet included in the public API, without having to directly handle features such as authentication, paging, fallback hosts, MsgPack and JSON support.
     *
     * @param method - The request method to use, such as `GET`, `POST`.
     * @param path - The request path.
     * @param params - The parameters to include in the URL query of the request. The parameters depend on the endpoint being queried. See the [REST API reference](https://ably.com/docs/api/rest-api) for the available parameters of each endpoint.
     * @param body - The JSON body of the request.
     * @param headers - Additional HTTP headers to include in the request.
     *
     * @returns An [`HttpPaginatedResponse`]{@link HttpPaginatedResponse} object returned by the HTTP request, containing an empty or JSON-encodable object.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Makes a REST request to a provided path. This is provided as a convenience for developers who wish to use REST API functionality that is either not documented or is not yet included in the public API, without having to handle authentication, paging, fallback hosts, MsgPack and JSON support, etc. themselves.
     * END LEGACY DOCSTRING
     *
     * @param method - Not yet documented.
     * @param path - Not yet documented.
     * @param params - Not yet documented.
     * @param body - Not yet documented.
     * @param headers - Not yet documented.
     */
    request<T = any>(
      method: string,
      path: string,
      params?: any,
      body?: any[] | any,
      headers?: any
    ): Promise<Types.HttpPaginatedResponse<T>>;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Queries the REST `/stats` API and retrieves your application's usage statistics. Returns a [`PaginatedResult`]{@link PaginatedResult} object, containing an array of [`Stats`]{@link Stats} objects. See the [Stats docs](https://ably.com/docs/general/statistics).
     *
     * @param start - The time from which stats are retrieved, specified as milliseconds since the Unix epoch.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default epoch()
     * END PARAM CANONICAL API DEFAULT
     * @param end - The time until stats are retrieved, specified as milliseconds since the Unix epoch.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default now()
     * END PARAM CANONICAL API DEFAULT
     * @param direction - The order for which stats are returned in. Valid values are `backwards` which orders stats from most recent to oldest, or `forwards` which orders stats from oldest to most recent. The default is `backwards`.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default .Backwards
     * END PARAM CANONICAL API DEFAULT
     * @param limit - An upper limit on the number of stats returned. The default is 100, and the maximum is 1000.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default 100
     * END PARAM CANONICAL API DEFAULT
     * @param unit - `minute`, `hour`, `day` or `month`. Based on the unit selected, the given `start` or `end` times are rounded down to the start of the relevant interval depending on the unit granularity of the query.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default .Minute
     * END PARAM CANONICAL API DEFAULT
     *
     * @returns A [`PaginatedResult`]{@link PaginatedResult} object containing an array of [`Stats`]{@link Stats} objects.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * This method queries the [REST `/stats` API](https://ably.com/documentation/rest-api#stats) and retrieves your application’s usage statistics. A PaginatedResult is returned, containing an array of stats for the first page of results. PaginatedResult objects are iterable providing a means to page through historical statistics. [See an example set of raw stats returned via the REST API](https://ably.com/documentation/general/statistics).
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     */
    stats(
      params?:
        | StatsParams
        | any /* The `any` here is for backwards compatibility - will be removed in next major release of this SDK. */
    ): Promise<Types.PaginatedResult<Types.Stats>>;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Retrieves the time from the Ably service as milliseconds since the Unix epoch. Clients that do not have access to a sufficiently well maintained time source and wish to issue Ably [`TokenRequest`s]{@link TokenRequest} with a more accurate timestamp should use the [`queryTime`]{@link ClientOptions#queryTime} property instead of this method.
     *
     * @returns The time as milliseconds since the Unix epoch.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Obtains the time from the Ably service as milliseconds since epoch. (Clients that do not have access to a sufficiently well maintained time source and wish to issue Ably TokenRequests with a more accurate timestamp should use the `queryTime` ClientOption instead of this method).
     * END LEGACY DOCSTRING
     */
    time(): Promise<number>;
    /**
     * BEGIN CANONICAL DOCSTRING
     * A [`Push`]{@link Push} object.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A reference to the `Push` object.
     * END LEGACY DOCSTRING
     */
    push: Types.PushPromise;
  }

  /**
   * Not yet documented.
   */
  class RealtimeBase extends RestBase {
    /**
     * Not yet documented.
     */
    static Promise: typeof Types.RealtimePromise;
    /**
     * Not yet documented.
     */
    static Callbacks: typeof Types.RealtimeCallbacks;
    /**
     * BEGIN CANONICAL DOCSTRING
     * A client ID, used for identifying this client when publishing messages or for presence purposes. The `clientId` can be any non-empty string, except it cannot contain a `*`. This option is primarily intended to be used in situations where the library is instantiated with a key. A `clientId` may also be implicit in a token used to instantiate the library; an error will be raised if a `clientId` specified here conflicts with the `clientId` implicit in the token.
     * END CANONICAL DOCSTRING
     */
    clientId: string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Calls [`connection.close()`]{@link Connection#close} and causes the connection to close, entering the closing state. Once closed, the library will not attempt to re-establish the connection without an explicit call to [`connect()`]{@link Connection#connect}.
     * END CANONICAL DOCSTRING
     */
    close(): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Calls [`connection.connect()`]{@link Connection#connect} and causes the connection to open, entering the connecting state. Explicitly calling `connect()` is unnecessary unless the [`autoConnect`]{@link ClientOptions#autoConnect} property is disabled.
     * END CANONICAL DOCSTRING
     */
    connect(): void;
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * A client that extends the functionality of the [`RestClient`]{@link RestClient} and provides additional realtime-specific features.
   * END CANONICAL DOCSTRING
   */
  class RealtimeCallbacks extends RealtimeBase {
    /**
     * BEGIN CANONICAL DOCSTRING
     * An [`Auth`]{@link Auth} object.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A reference to the Auth authentication object.
     * END LEGACY DOCSTRING
     */
    auth: Types.AuthCallbacks;
    /**
     * BEGIN CANONICAL DOCSTRING
     * A [`Channels`]{@link Channels} object.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A reference to the `Channel` collection instance.
     * END LEGACY DOCSTRING
     */
    channels: Types.Channels<Types.RealtimeChannelCallbacks>;
    /**
     * BEGIN CANONICAL DOCSTRING
     * A [`Connection`]{@link Connection} object.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A reference to the `Connection` object.
     * END LEGACY DOCSTRING
     */
    connection: Types.ConnectionCallbacks;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Makes a REST request to a provided path. This is provided as a convenience for developers who wish to use REST API functionality that is either not documented or is not yet included in the public API, without having to directly handle features such as authentication, paging, fallback hosts, MsgPack and JSON support.
     *
     * @param method - The request method to use, such as `GET`, `POST`.
     * @param path - The request path.
     * @param params - The parameters to include in the URL query of the request. The parameters depend on the endpoint being queried. See the [REST API reference](https://ably.com/docs/api/rest-api) for the available parameters of each endpoint.
     * @param body - The JSON body of the request.
     * @param headers - Additional HTTP headers to include in the request.
     *
     * @returns An [`HttpPaginatedResponse`]{@link HttpPaginatedResponse} response object returned by the HTTP request, containing an empty or JSON-encodable object.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Makes a REST request to a provided path. This is provided as a convenience for developers who wish to use REST API functionality that is either not documented or is not yet included in the public API, without having to handle authentication, paging, fallback hosts, MsgPack and JSON support, etc. themselves.
     * END LEGACY DOCSTRING
     *
     * @param method - Not yet documented.
     * @param path - Not yet documented.
     * @param params - Not yet documented.
     * @param body - Not yet documented.
     * @param headers - Not yet documented.
     * @param callback - Not yet documented.
     */
    request<T = any>(
      method: string,
      path: string,
      params?: any,
      body?: any[] | any,
      headers?: any,
      callback?: Types.StandardCallback<Types.HttpPaginatedResponse<T>>
    ): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Queries the REST `/stats` API and retrieves your application's usage statistics. Returns a [`PaginatedResult`]{@link PaginatedResult} object, containing an array of [`Stats`]{@link Stats} objects. See the [Stats docs](https://ably.com/docs/general/statistics).
     *
     * @param start - The time from which stats are retrieved, specified as milliseconds since the Unix epoch.
     * @param end - The time until stats are retrieved, specified as milliseconds since the Unix epoch.
     * @param direction - The order for which stats are returned in. Valid values are `backwards` which orders stats from most recent to oldest, or `forwards` which orders stats from oldest to most recent. The default is `backwards`.
     * @param limit - An upper limit on the number of stats returned. The default is 100, and the maximum is 1000.
     * @param unit - `minute`, `hour`, `day` or `month`. Based on the unit selected, the given `start` or `end` times are rounded down to the start of the relevant interval depending on the unit granularity of the query.
     *
     * @returns A [`PaginatedResult`]{@link PaginatedResult} object containing an array of [`Stats`]{@link Stats} objects.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * This method queries the [REST `/stats` API](https://ably.com/documentation/rest-api#stats) and retrieves your application’s usage statistics. A PaginatedResult is returned, containing an array of stats for the first page of results. PaginatedResult objects are iterable providing a means to page through historical statistics. [See an example set of raw stats returned via the REST API](https://ably.com/documentation/general/statistics).
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     * @param callback - Not yet documented.
     */
    stats(
      params:
        | StatsParams
        | any /* The `any` here is for backwards compatibility - will be removed in next major release of this SDK. */,
      callback: Types.paginatedResultCallback<Types.Stats>
    ): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Queries the REST `/stats` API and retrieves your application's usage statistics. Returns a [`PaginatedResult`]{@link PaginatedResult} object, containing an array of [`Stats`]{@link Stats} objects. See the [Stats docs](https://ably.com/docs/general/statistics).
     *
     * @param start - The time from which stats are retrieved, specified as milliseconds since the Unix epoch.
     * @param end - The time until stats are retrieved, specified as milliseconds since the Unix epoch.
     * @param direction - The order for which stats are returned in. Valid values are `backwards` which orders stats from most recent to oldest, or `forwards` which orders stats from oldest to most recent. The default is `backwards`.
     * @param limit - An upper limit on the number of stats returned. The default is 100, and the maximum is 1000.
     * @param unit - `minute`, `hour`, `day` or `month`. Based on the unit selected, the given `start` or `end` times are rounded down to the start of the relevant interval depending on the unit granularity of the query.
     *
     * @returns A [`PaginatedResult`]{@link PaginatedResult} object containing an array of [`Stats`]{@link Stats} objects.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * This method queries the [REST `/stats` API](https://ably.com/documentation/rest-api#stats) and retrieves your application’s usage statistics. A PaginatedResult is returned, containing an array of stats for the first page of results. PaginatedResult objects are iterable providing a means to page through historical statistics. [See an example set of raw stats returned via the REST API](https://ably.com/documentation/general/statistics).
     * END LEGACY DOCSTRING
     *
     * @param callback - Not yet documented.
     */
    stats(callback: Types.paginatedResultCallback<Types.Stats>): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Retrieves the time from the Ably service as milliseconds since the Unix epoch. Clients that do not have access to a sufficiently well maintained time source and wish to issue Ably [`TokenRequest`s]{@link TokenRequest with a more accurate timestamp should use the [`queryTime`]{@link ClientOptions#queryTime} property instead of this method.
     *
     * @returns The time as milliseconds since the Unix epoch.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Obtains the time from the Ably service as milliseconds since epoch. (Clients that do not have access to a sufficiently well maintained time source and wish to issue Ably TokenRequests with a more accurate timestamp should use the `queryTime` ClientOption instead of this method).
     * END LEGACY DOCSTRING
     *
     * @param callback - Not yet documented.
     */
    time(callback?: Types.timeCallback): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * A [`Push`]{@link Push} object.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A reference to the `Push` object.
     * END LEGACY DOCSTRING
     */
    push: Types.PushCallbacks;
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * A client that extends the functionality of the [`RestClient`]{@link RestClient} and provides additional realtime-specific features.
   * END CANONICAL DOCSTRING
   */
  class RealtimePromise extends RealtimeBase {
    /**
     * BEGIN CANONICAL DOCSTRING
     * An [`Auth`]{@link Auth} object.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A reference to the Auth authentication object.
     * END LEGACY DOCSTRING
     */
    auth: Types.AuthPromise;
    /**
     * BEGIN CANONICAL DOCSTRING
     * A [`Channels`]{@link Channels} object.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A reference to the `Channel` collection instance.
     * END LEGACY DOCSTRING
     */
    channels: Types.Channels<Types.RealtimeChannelPromise>;
    /**
     * BEGIN CANONICAL DOCSTRING
     * A [`Connection`]{@link Connection} object.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A reference to the `Connection` object.
     * END LEGACY DOCSTRING
     */
    connection: Types.ConnectionPromise;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Makes a REST request to a provided path. This is provided as a convenience for developers who wish to use REST API functionality that is either not documented or is not yet included in the public API, without having to directly handle features such as authentication, paging, fallback hosts, MsgPack and JSON support.
     *
     * @param method - The request method to use, such as `GET`, `POST`.
     * @param path - The request path.
     * @param params - The parameters to include in the URL query of the request. The parameters depend on the endpoint being queried. See the [REST API reference](https://ably.com/docs/api/rest-api) for the available parameters of each endpoint.
     * @param body - The JSON body of the request.
     * @param headers - Additional HTTP headers to include in the request.
     *
     * @returns An [`HttpPaginatedResponse`]{@link HttpPaginatedResponse} response object returned by the HTTP request, containing an empty or JSON-encodable object.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Makes a REST request to a provided path. This is provided as a convenience for developers who wish to use REST API functionality that is either not documented or is not yet included in the public API, without having to handle authentication, paging, fallback hosts, MsgPack and JSON support, etc. themselves.
     * END LEGACY DOCSTRING
     *
     * @param method - Not yet documented.
     * @param path - Not yet documented.
     * @param params - Not yet documented.
     * @param body - Not yet documented.
     * @param headers - Not yet documented.
     */
    request<T = any>(
      method: string,
      path: string,
      params?: any,
      body?: any[] | any,
      headers?: any
    ): Promise<Types.HttpPaginatedResponse<T>>;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Queries the REST `/stats` API and retrieves your application's usage statistics. Returns a [`PaginatedResult`]{@link PaginatedResult} object, containing an array of [`Stats`]{@link Stats} objects. See the [Stats docs](https://ably.com/docs/general/statistics).
     *
     * @param start - The time from which stats are retrieved, specified as milliseconds since the Unix epoch.
     * @param end - The time until stats are retrieved, specified as milliseconds since the Unix epoch.
     * @param direction - The order for which stats are returned in. Valid values are `backwards` which orders stats from most recent to oldest, or `forwards` which orders stats from oldest to most recent. The default is `backwards`.
     * @param limit - An upper limit on the number of stats returned. The default is 100, and the maximum is 1000.
     * @param unit - `minute`, `hour`, `day` or `month`. Based on the unit selected, the given `start` or `end` times are rounded down to the start of the relevant interval depending on the unit granularity of the query.
     *
     * @returns A [`PaginatedResult`]{@link PaginatedResult} object containing an array of [`Stats`]{@link Stats} objects.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * This method queries the [REST `/stats` API](https://ably.com/documentation/rest-api#stats) and retrieves your application’s usage statistics. A PaginatedResult is returned, containing an array of stats for the first page of results. PaginatedResult objects are iterable providing a means to page through historical statistics. [See an example set of raw stats returned via the REST API](https://ably.com/documentation/general/statistics).
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     */
    stats(
      params?:
        | StatsParams
        | any /* The `any` here is for backwards compatibility - will be removed in next major release of this SDK. */
    ): Promise<Types.PaginatedResult<Types.Stats>>;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Retrieves the time from the Ably service as milliseconds since the Unix epoch. Clients that do not have access to a sufficiently well maintained time source and wish to issue Ably [`TokenRequest`s]{@link TokenRequest with a more accurate timestamp should use the [`queryTime`]{@link ClientOptions#queryTime} property instead of this method.
     *
     * @returns The time as milliseconds since the Unix epoch.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Obtains the time from the Ably service as milliseconds since epoch. (Clients that do not have access to a sufficiently well maintained time source and wish to issue Ably TokenRequests with a more accurate timestamp should use the `queryTime` ClientOption instead of this method).
     * END LEGACY DOCSTRING
     */
    time(): Promise<number>;
    /**
     * BEGIN CANONICAL DOCSTRING
     * A [`Push`]{@link Push} object.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A reference to the `Push` object.
     * END LEGACY DOCSTRING
     */
    push: Types.PushPromise;
  }

  /**
   * Not yet documented.
   */
  class AuthBase {
    /**
     * BEGIN LEGACY DOCSTRING
     * The client ID string, if any, configured for this client connection. See [identified clients](https://ably.com/documentation/realtime/authentication#identified-clients) for more information on trusted client identifiers.
     * END LEGACY DOCSTRING
     */
    clientId: string;
  }

  /**
   * Not yet documented.
   */
  class AuthCallbacks extends AuthBase {
    /**
     * BEGIN LEGACY DOCSTRING
     * Instructs the library to get a new token immediately. When using the realtime client, it will upgrade the current realtime connection to use the new token, or if not connected, will initiate a connection to Ably once the new token has been obtained. Also stores any `tokenParams` and `authOptions` passed in as the new defaults, to be used for all subsequent implicit or explicit token requests.
     *
     * Any `tokenParams` and `authOptions` objects passed in will entirely replace (as opposed to being merged with) the currently client library saved `tokenParams` and `authOptions`.
     * END LEGACY DOCSTRING
     *
     * @param tokenParams - Not yet documented.
     * @param authOptions - Not yet documented.
     * @param callback - Not yet documented.
     */
    authorize(tokenParams?: TokenParams, authOptions?: AuthOptions, callback?: tokenDetailsCallback): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Creates and signs an Ably `TokenRequest` based on the specified (or if none specified, the client library stored) `tokenParams` and `authOptions`. Note this can only be used when the API `key` value is available locally. Otherwise, the Ably `TokenRequest` must be obtained from the key owner. Use this to generate an Ably `TokenRequest` in order to implement an Ably Token request callback for use by other clients.
     *
     * Both `authOptions` and `tokenParams` are optional. When omitted or `null`, the default token parameters and authentication options for the client library are used, as specified in the `ClientOptions` when the client library was instantiated, or later updated with an explicit `authorize` request. Values passed in will be used instead of (rather than being merged with) the default values.
     *
     * To understand why an Ably `TokenRequest` may be issued to clients in favor of a token, see [Token Authentication explained](https://ably.com/documentation/core-features/authentication/#token-authentication).
     * END LEGACY DOCSTRING
     *
     * @param tokenParams - Not yet documented.
     * @param authOptions - Not yet documented.
     * @param callback - Not yet documented.
     */
    createTokenRequest(
      tokenParams?: TokenParams | null,
      authOptions?: AuthOptions | null,
      callback?: tokenRequestCallback
    ): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Calls the [requestToken REST API endpoint](https://ably.com/documentation/rest-api#request-token) to obtain an Ably Token according to the specified tokenParams and authOptions.
     *
     * Both `authOptions` and `tokenParams` are optional. When omitted or `null`, the default token parameters and authentication options for the client library are used, as specified in the `ClientOptions` when the client library was instantiated, or later updated with an explicit `authorize` request. Values passed in will be used instead of (rather than being merged with) the default values.
     *
     * To understand why an Ably `TokenRequest` may be issued to clients in favor of a token, see [Token Authentication explained](https://ably.com/documentation/core-features/authentication/#token-authentication).
     * END LEGACY DOCSTRING
     *
     * @param TokenParams - Not yet documented.
     * @param authOptions - Not yet documented.
     * @param callback - Not yet documented.
     */
    requestToken(
      TokenParams?: TokenParams | null,
      authOptions?: AuthOptions | null,
      callback?: tokenDetailsCallback
    ): void;
  }

  /**
   * Not yet documented.
   */
  class AuthPromise extends AuthBase {
    /**
     * BEGIN LEGACY DOCSTRING
     * Instructs the library to get a new token immediately. When using the realtime client, it will upgrade the current realtime connection to use the new token, or if not connected, will initiate a connection to Ably once the new token has been obtained. Also stores any `tokenParams` and `authOptions` passed in as the new defaults, to be used for all subsequent implicit or explicit token requests.
     *
     * Any `tokenParams` and `authOptions` objects passed in will entirely replace (as opposed to being merged with) the currently client library saved `tokenParams` and `authOptions`.
     * END LEGACY DOCSTRING
     *
     * @param tokenParams - Not yet documented.
     * @param authOptions - Not yet documented.
     */
    authorize(tokenParams?: TokenParams, authOptions?: AuthOptions): Promise<TokenDetails>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Creates and signs an Ably `TokenRequest` based on the specified (or if none specified, the client library stored) `tokenParams` and `authOptions`. Note this can only be used when the API `key` value is available locally. Otherwise, the Ably `TokenRequest` must be obtained from the key owner. Use this to generate an Ably `TokenRequest` in order to implement an Ably Token request callback for use by other clients.
     *
     * Both `authOptions` and `tokenParams` are optional. When omitted or `null`, the default token parameters and authentication options for the client library are used, as specified in the `ClientOptions` when the client library was instantiated, or later updated with an explicit `authorize` request. Values passed in will be used instead of (rather than being merged with) the default values.
     *
     * To understand why an Ably `TokenRequest` may be issued to clients in favor of a token, see [Token Authentication explained](https://ably.com/documentation/core-features/authentication/#token-authentication).
     * END LEGACY DOCSTRING
     *
     * @param tokenParams - Not yet documented.
     * @param authOptions - Not yet documented.
     */
    createTokenRequest(tokenParams?: TokenParams, authOptions?: AuthOptions): Promise<TokenRequest>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Calls the [requestToken REST API endpoint](https://ably.com/documentation/rest-api#request-token) to obtain an Ably Token according to the specified tokenParams and authOptions.
     *
     * Both `authOptions` and `tokenParams` are optional. When omitted or `null`, the default token parameters and authentication options for the client library are used, as specified in the `ClientOptions` when the client library was instantiated, or later updated with an explicit `authorize` request. Values passed in will be used instead of (rather than being merged with) the default values.
     *
     * To understand why an Ably `TokenRequest` may be issued to clients in favor of a token, see [Token Authentication explained](https://ably.com/documentation/core-features/authentication/#token-authentication).
     * END LEGACY DOCSTRING
     *
     * @param TokenParams - Not yet documented.
     * @param authOptions - Not yet documented.
     */
    requestToken(TokenParams?: TokenParams, authOptions?: AuthOptions): Promise<TokenDetails>;
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * Enables the retrieval of the current and historic presence set for a channel.
   * END CANONICAL DOCSTRING
   */
  class PresenceCallbacks {
    /**
     * BEGIN CANONICAL DOCSTRING
     * Retrieves the current members present on the channel and the metadata for each member, such as their [`PresenceAction`]{@link PresenceAction} and ID. Returns a [`PaginatedResult`]{@link PaginatedResult} object, containing an array of [`PresenceMessage`]{@link PresenceMessage} objects.
     *
     * @param limit - An upper limit on the number of messages returned. The default is 100, and the maximum is 1000.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default 100
     * END PARAM CANONICAL API DEFAULT
     * @param clientId - Filters the list of returned presence members by a specific client using its ID.
     * @param connectionId - Filters the list of returned presence members by a specific connection using its ID.
     *
     * @returns A [`PaginatedResult`]{@link PaginatedResult} object containing an array of [`PresenceMessage`]{@link PresenceMessage} objects.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Get the current presence member set for this channel. In the REST client library this method directly queries [Ably’s REST presence API](https://ably.com/documentation/rest-api#presence).
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     * @param callback - Not yet documented.
     */
    get(params?: RestPresenceParams, callback?: paginatedResultCallback<PresenceMessage>): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Get the current presence member set for this channel. In the REST client library this method directly queries [Ably’s REST presence API](https://ably.com/documentation/rest-api#presence).
     * END LEGACY DOCSTRING
     *
     * @param callback - Not yet documented.
     */
    get(callback?: paginatedResultCallback<PresenceMessage>): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Retrieves a [`PaginatedResult`]{@link PaginatedResult} object, containing an array of historical [`PresenceMessage`]{@link PresenceMessage} objects for the channel. If the channel is configured to persist messages, then presence messages can be retrieved from history for up to 72 hours in the past. If not, presence messages can only be retrieved from history for up to two minutes in the past.
     *
     * @param start - The time from which messages are retrieved, specified as milliseconds since the Unix epoch.
     * @param end - The time until messages are retrieved, specified as milliseconds since the Unix epoch.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default now()
     * END PARAM CANONICAL API DEFAULT
     * @param direction - The order for which messages are returned in. Valid values are `backwards` which orders messages from most recent to oldest, or `forwards` which orders messages from oldest to most recent. The default is `backwards`.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default .Backwards
     * END PARAM CANONICAL API DEFAULT
     * @param limit - An upper limit on the number of messages returned. The default is 100, and the maximum is 1000.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default 100
     * END PARAM CANONICAL API DEFAULT
     *
     * @returns A [`PaginatedResult`]{@link PaginatedResult} object containing an array of [`PresenceMessage`]{@link PresenceMessage} objects.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Gets a paginated set of historical presence message events for this channel. If the channel is configured to persist messages to disk, then the presence message event history will typically be available for 24 – 72 hours. If not, presence message events are only retained in memory by the Ably service for two minutes.
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     * @param callback - Not yet documented.
     */
    history(params: RestHistoryParams, callback?: paginatedResultCallback<PresenceMessage>): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Retrieves a [`PaginatedResult`]{@link PaginatedResult} object, containing an array of historical [`PresenceMessage`]{@link PresenceMessage} objects for the channel. If the channel is configured to persist messages, then presence messages can be retrieved from history for up to 72 hours in the past. If not, presence messages can only be retrieved from history for up to two minutes in the past.
     *
     * @param start - The time from which messages are retrieved, specified as milliseconds since the Unix epoch.
     * @param end - The time until messages are retrieved, specified as milliseconds since the Unix epoch.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default now()
     * END PARAM CANONICAL API DEFAULT
     * @param direction - The order for which messages are returned in. Valid values are `backwards` which orders messages from most recent to oldest, or `forwards` which orders messages from oldest to most recent. The default is `backwards`.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default .Backwards
     * END PARAM CANONICAL API DEFAULT
     * @param limit - An upper limit on the number of messages returned. The default is 100, and the maximum is 1000.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default 100
     * END PARAM CANONICAL API DEFAULT
     *
     * @returns A [`PaginatedResult`]{@link PaginatedResult} object containing an array of [`PresenceMessage`]{@link PresenceMessage} objects.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Gets a paginated set of historical presence message events for this channel. If the channel is configured to persist messages to disk, then the presence message event history will typically be available for 24 – 72 hours. If not, presence message events are only retained in memory by the Ably service for two minutes.
     * END LEGACY DOCSTRING
     *
     * @param callback - Not yet documented.
     */
    history(callback: paginatedResultCallback<PresenceMessage>): void;
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * Enables the retrieval of the current and historic presence set for a channel.
   * END CANONICAL DOCSTRING
   */
  class PresencePromise {
    /**
     * BEGIN CANONICAL DOCSTRING
     * Retrieves the current members present on the channel and the metadata for each member, such as their [`PresenceAction`]{@link PresenceAction} and ID. Returns a [`PaginatedResult`]{@link PaginatedResult} object, containing an array of [`PresenceMessage`]{@link PresenceMessage} objects.
     *
     * @param limit - An upper limit on the number of messages returned. The default is 100, and the maximum is 1000.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default 100
     * END PARAM CANONICAL API DEFAULT
     * @param clientId - Filters the list of returned presence members by a specific client using its ID.
     * @param connectionId - Filters the list of returned presence members by a specific connection using its ID.
     *
     * @returns A [`PaginatedResult`]{@link PaginatedResult} object containing an array of [`PresenceMessage`]{@link PresenceMessage} objects.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Get the current presence member set for this channel. In the REST client library this method directly queries [Ably’s REST presence API](https://ably.com/documentation/rest-api#presence).
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     */
    get(params?: RestPresenceParams): Promise<PaginatedResult<PresenceMessage>>;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Retrieves a [`PaginatedResult`]{@link PaginatedResult} object, containing an array of historical [`PresenceMessage`]{@link PresenceMessage} objects for the channel. If the channel is configured to persist messages, then presence messages can be retrieved from history for up to 72 hours in the past. If not, presence messages can only be retrieved from history for up to two minutes in the past.
     *
     * @param start - The time from which messages are retrieved, specified as milliseconds since the Unix epoch.
     * @param end - The time until messages are retrieved, specified as milliseconds since the Unix epoch.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default now()
     * END PARAM CANONICAL API DEFAULT
     * @param direction - The order for which messages are returned in. Valid values are `backwards` which orders messages from most recent to oldest, or `forwards` which orders messages from oldest to most recent. The default is `backwards`.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default .Backwards
     * END PARAM CANONICAL API DEFAULT
     * @param limit - An upper limit on the number of messages returned. The default is 100, and the maximum is 1000.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default 100
     * END PARAM CANONICAL API DEFAULT
     *
     * @returns A [`PaginatedResult`]{@link PaginatedResult} object containing an array of [`PresenceMessage`]{@link PresenceMessage} objects.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Gets a paginated set of historical presence message events for this channel. If the channel is configured to persist messages to disk, then the presence message event history will typically be available for 24 – 72 hours. If not, presence message events are only retained in memory by the Ably service for two minutes.
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     */
    history(params?: RestHistoryParams): Promise<PaginatedResult<PresenceMessage>>;
  }

  /**
   * Not yet documented.
   */
  class RealtimePresenceBase {
    /**
     * BEGIN CANONICAL DOCSTRING
     * Indicates whether the presence set synchronization between Ably and the clients on the channel has been completed. Set to `true` when the sync is complete.
     * END CANONICAL DOCSTRING
     */
    syncComplete: boolean;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Deregisters a specific listener that is registered to receive [`PresenceMessage`]{@link PresenceMessage} on the channel for a given [`PresenceAction`]{@link PresenceAction}.
     *
     * @param PresenceAction - A specific [`PresenceAction`]{@link PresenceAction} to deregister the listener for.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Unsubscribe the given listener from presence message events on this channel for the given PresenceAction. This removes an earlier event-specific subscription.
     * END LEGACY DOCSTRING
     *
     * @param presence - Not yet documented.
     * @param listener - Not yet documented.
     */
    unsubscribe(presence: PresenceAction, listener: messageCallback<PresenceMessage>): void;
    /**
     * Not yet documented.
     *
     * @param presence - Not yet documented.
     * @param listener - Not yet documented.
     */
    unsubscribe(presence: Array<PresenceAction>, listener: messageCallback<PresenceMessage>): void;
    /**
     * Not yet documented.
     *
     * @param presence - Not yet documented.
     */
    unsubscribe(presence: PresenceAction): void;
    /**
     * Not yet documented.
     *
     * @param presence - Not yet documented.
     */
    unsubscribe(presence: Array<PresenceAction>): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Deregisters a specific listener that is registered to receive [`PresenceMessage`]{@link PresenceMessage} on the channel.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Unsubscribe the given listener from presence message events on this channel. This removes an earlier subscription.
     * END LEGACY DOCSTRING
     *
     * @param listener - Not yet documented.
     */
    unsubscribe(listener: messageCallback<PresenceMessage>): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Deregisters all listeners currently receiving [`PresenceMessage`]{@link PresenceMessage} for the channel.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Unsubscribes all listeners to presence message events on this channel. This removes all earlier subscriptions.
     * END LEGACY DOCSTRING
     */
    unsubscribe(): void;
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * Enables the presence set to be entered and subscribed to, and the historic presence set to be retrieved for a channel.
   * END CANONICAL DOCSTRING
   */
  class RealtimePresenceCallbacks extends RealtimePresenceBase {
    /**
     * BEGIN CANONICAL DOCSTRING
     * Retrieves the current members present on the channel and the metadata for each member, such as their [`PresenceAction`]{@link PresenceAction} and ID. Returns an array of [`PresenceMessage`]{@link PresenceMessage} objects.
     *
     * @param waitForSync - Sets whether to wait for a full presence set synchronization between Ably and the clients on the channel to complete before returning the results. Synchronization begins as soon as the channel is [`ATTACHED`]{@link ChannelState#ATTACHED}. When set to `true` the results will be returned as soon as the sync is complete. When set to `false` the current list of members will be returned without the sync completing. The default is `true`.
     * BEGIN CANONICAL PARAM DEFAULT INFO
     * default true
     * END CANONICAL PARAM DEFAULT INFO
     * @param clientId - Filters the array of returned presence members by a specific client using its ID.
     * @param connectionId - Filters the array of returned presence members by a specific connection using its ID.
     *
     * @returns An array of [`PresenceMessage`]{@link PresenceMessage} objects.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Get the current presence member set for this channel. Typically, this method returns the member set immediately as the member set is retained in memory by the client. However, by default this method will wait until the presence member set is synchronized, so if the synchronization is not yet complete following a channel being attached, this method will wait until the presence member set is synchronized.
     *
     * When a channel is `attached`, the Ably service immediately synchronizes the presence member set with the client. Typically this process completes in milliseconds, however when the presence member set is very large, bandwidth constraints may slow this synchronization process down.
     *
     * When a channel is `initialized` (i.e. no attempt to attach has yet been made for this channel), then calling `get` will implicitly attach the channel.
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     * @param callback - Not yet documented.
     */
    get(params?: RealtimePresenceParams, callback?: realtimePresenceGetCallback): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Retrieves a [`PaginatedResult`]{@link PaginatedResult} object, containing an array of historical [`PresenceMessage`]{@link PresenceMessage} objects for the channel. If the channel is configured to persist messages, then presence messages can be retrieved from history for up to 72 hours in the past. If not, presence messages can only be retrieved from history for up to two minutes in the past.
     *
     * @param start - The time from which messages are retrieved, specified as milliseconds since the Unix epoch.
     * @param end - The time until messages are retrieved, specified as milliseconds since the Unix epoch.
     * @param direction - The order for which messages are returned in. Valid values are `backwards` which orders messages from most recent to oldest, or `forwards` which orders messages from oldest to most recent. The default is `backwards`.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default .Backwards
     * END PARAM CANONICAL API DEFAULT
     * @param limit - An upper limit on the number of messages returned. The default is 100, and the maximum is 1000.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default 100
     * END PARAM CANONICAL API DEFAULT

     * @returns A [`PaginatedResult`]{@link PaginatedResult} object containing an array of [`PresenceMessage`]{@link PresenceMessage} objects.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Gets a paginated set of historical presence message events for this channel. If the channel is configured to persist messages to disk, then the presence message event history will typically be available for 24 – 72 hours. If not, presence message events are only retained in memory by the Ably service for two minutes.
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     * @param callback - Not yet documented.
     */
    history(params?: RealtimeHistoryParams, callback?: paginatedResultCallback<PresenceMessage>): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Registers a listener that is called each time a [`PresenceMessage`]{@link PresenceMessage} matching a given [`PresenceAction`]{@link PresenceAction}, or an action within an array of [`PresenceAction`s]{@link PresenceAction}, is received on the channel, such as a new member entering the presence set. A callback may optionally be passed in to this call to be notified of success or failure of the channel [`attach()`]{@link RealtimeChannel#attach} operation.
     *
     * @param `PresenceAction` \| `[PresenceAction]` - A [`PresenceAction`]{@link PresenceAction} or an array of [`PresenceAction`s]{@link PresenceAction} to register the listener for.
     * @param (PresenceMessage) - An event listener function.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Subscribe to presence message events with a given PresenceAction on this channel. The caller supplies a handler, which is called each time one or more presence events occurs such as a member entering or leaving a channel.
     * END LEGACY DOCSTRING
     *
     * @param presence - Not yet documented.
     * @param listener - Not yet documented.
     * @param callbackWhenAttached - Not yet documented.
     */
    subscribe(
      presence: PresenceAction | Array<PresenceAction>,
      listener?: messageCallback<PresenceMessage>,
      callbackWhenAttached?: errorCallback
    ): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Registers a listener that is called each time a [`PresenceMessage`]{@link PresenceMessage} is received on the channel, such as a new member entering the presence set. A callback may optionally be passed in to this call to be notified of success or failure of the channel [`attach()`]{@link RealtimeChannel#attach} operation.
     *
     * @param (PresenceMessage) - An event listener function.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Subscribe to presence message events on this channel. The caller supplies a handler, which is called each time one or more presence events occurs such as a member entering or leaving a channel.
     * END LEGACY DOCSTRING
     *
     * @param listener - Not yet documented.
     * @param callbackWhenAttached - Not yet documented.
     */
    subscribe(listener: messageCallback<PresenceMessage>, callbackWhenAttached?: errorCallback): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Enters the presence set for the channel, optionally passing a `data` payload. A `clientId` is required to be present on a channel. An optional callback may be provided to notify of the success or failure of the operation.
     *
     * @param Data - The payload associated with the presence member.
     * @param extras - A JSON object of arbitrary key-value pairs that may contain metadata, and/or ancillary payloads.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Enter a presence channel and provide data that is associated with the current present member. If the channel is initialized (i.e. no attempt to attach has yet been made for this channel), then calling enter will implicitly attach the channel.
     * END LEGACY DOCSTRING
     *
     * @param data - Not yet documented.
     * @param callback - Not yet documented.
     */
    enter(data?: any, callback?: errorCallback): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Updates the `data` payload for a presence member. If called before entering the presence set, this is treated as an [`ENTER`]{@link PresenceAction#ENTER} event. An optional callback may be provided to notify of the success or failure of the operation.
     *
     * @param Data - The payload to update for the presence member.
     * @param extras - A JSON object of arbitrary key-value pairs that may contain metadata, and/or ancillary payloads.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Update the current member’s data and broadcast an update event to all subscribers. data may be null. If the channel is initialized (i.e. no attempt to attach has yet been made for this channel), then calling update will implicitly attach the channel.
     * END LEGACY DOCSTRING
     *
     * @param data - Not yet documented.
     * @param callback - Not yet documented.
     */
    update(data?: any, callback?: errorCallback): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Leaves the presence set for the channel. A client must have previously entered the presence set before they can leave it. An optional callback may be provided to notify of the success or failure of the operation.
     *
     * @param Data - The payload associated with the presence member.
     * @param extras - A JSON object of arbitrary key-value pairs that may contain metadata, and/or ancillary payloads.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Leave a presence channel and emit data that is associated with the current leaving member.
     * END LEGACY DOCSTRING
     *
     * @param data - Not yet documented.
     * @param callback - Not yet documented.
     */
    leave(data?: any, callback?: errorCallback): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Enters the presence set of the channel for a given `clientId`. Enables a single client to update presence on behalf of any number of clients using a single connection. The library must have been instantiated with an API key or a token bound to a wildcard `clientId`. An optional callback may be provided to notify of the success or failure of the operation.
     *
     * @param clientId - The ID of the client to enter into the presence set.
     * @param Data - The payload associated with the presence member.
     * @param extras - A JSON object of arbitrary key-value pairs that may contain metadata, and/or ancillary payloads.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Enter a presence channel and provide data that is associated with the current present member.
     * END LEGACY DOCSTRING
     *
     * @param clientId - Not yet documented.
     * @param data - Not yet documented.
     * @param callback - Not yet documented.
     */
    enterClient(clientId: string, data?: any, callback?: errorCallback): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Updates the `data` payload for a presence member using a given `clientId`. Enables a single client to update presence on behalf of any number of clients using a single connection. The library must have been instantiated with an API key or a token bound to a wildcard `clientId`. An optional callback may be provided to notify of the success or failure of the operation.
     *
     * @param clientId - The ID of the client to update in the presence set.
     * @param Data - The payload to update for the presence member.
     * @param extras - A JSON object of arbitrary key-value pairs that may contain metadata, and/or ancillary payloads.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Update the member data on behalf of the provided ClientId and broadcast an update event to all subscribers.
     * END LEGACY DOCSTRING
     *
     * @param clientId - Not yet documented.
     * @param data - Not yet documented.
     * @param callback - Not yet documented.
     */
    updateClient(clientId: string, data?: any, callback?: errorCallback): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Leaves the presence set of the channel for a given `clientId`. Enables a single client to update presence on behalf of any number of clients using a single connection. The library must have been instantiated with an API key or a token bound to a wildcard `clientId`. An optional callback may be provided to notify of the success or failure of the operation.
     *
     * @param clientId - The ID of the client to leave the presence set for.
     * @param Data - The payload associated with the presence member.
     * @param extras - A JSON object of arbitrary key-value pairs that may contain metadata, and/or ancillary payloads.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Leave a presence channel on behalf of the provided ClientId and emit data that is associated with the current leaving member.
     * END LEGACY DOCSTRING
     *
     * @param clientId - Not yet documented.
     * @param data - Not yet documented.
     * @param callback - Not yet documented.
     */
    leaveClient(clientId: string, data?: any, callback?: errorCallback): void;
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * Enables the presence set to be entered and subscribed to, and the historic presence set to be retrieved for a channel.
   * END CANONICAL DOCSTRING
   */
  class RealtimePresencePromise extends RealtimePresenceBase {
    /**
     * BEGIN CANONICAL DOCSTRING
     * Retrieves the current members present on the channel and the metadata for each member, such as their [`PresenceAction`]{@link PresenceAction} and ID. Returns an array of [`PresenceMessage`]{@link PresenceMessage} objects.
     *
     * @param waitForSync - Sets whether to wait for a full presence set synchronization between Ably and the clients on the channel to complete before returning the results. Synchronization begins as soon as the channel is [`ATTACHED`]{@link ChannelState#ATTACHED}. When set to `true` the results will be returned as soon as the sync is complete. When set to `false` the current list of members will be returned without the sync completing. The default is `true`.
     * BEGIN CANONICAL PARAM DEFAULT INFO
     * default true
     * END CANONICAL PARAM DEFAULT INFO
     * @param clientId - Filters the array of returned presence members by a specific client using its ID.
     * @param connectionId - Filters the array of returned presence members by a specific connection using its ID.
     *
     * @returns An array of [`PresenceMessage`]{@link PresenceMessage} objects.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Get the current presence member set for this channel. Typically, this method returns the member set immediately as the member set is retained in memory by the client. However, by default this method will wait until the presence member set is synchronized, so if the synchronization is not yet complete following a channel being attached, this method will wait until the presence member set is synchronized.
     *
     * When a channel is `attached`, the Ably service immediately synchronizes the presence member set with the client. Typically this process completes in milliseconds, however when the presence member set is very large, bandwidth constraints may slow this synchronization process down.
     *
     * When a channel is `initialized` (i.e. no attempt to attach has yet been made for this channel), then calling `get` will implicitly attach the channel.
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     */
    get(params?: RealtimePresenceParams): Promise<PresenceMessage[]>;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Retrieves a [`PaginatedResult`]{@link PaginatedResult} object, containing an array of historical [`PresenceMessage`]{@link PresenceMessage} objects for the channel. If the channel is configured to persist messages, then presence messages can be retrieved from history for up to 72 hours in the past. If not, presence messages can only be retrieved from history for up to two minutes in the past.
     *
     * @param start - The time from which messages are retrieved, specified as milliseconds since the Unix epoch.
     * @param end - The time until messages are retrieved, specified as milliseconds since the Unix epoch.
     * @param direction - The order for which messages are returned in. Valid values are `backwards` which orders messages from most recent to oldest, or `forwards` which orders messages from oldest to most recent. The default is `backwards`.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default .Backwards
     * END PARAM CANONICAL API DEFAULT
     * @param limit - An upper limit on the number of messages returned. The default is 100, and the maximum is 1000.
     * BEGIN PARAM CANONICAL API DEFAULT
     * api-default 100
     * END PARAM CANONICAL API DEFAULT

     * @returns A [`PaginatedResult`]{@link PaginatedResult} object containing an array of [`PresenceMessage`]{@link PresenceMessage} objects.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Gets a paginated set of historical presence message events for this channel. If the channel is configured to persist messages to disk, then the presence message event history will typically be available for 24 – 72 hours. If not, presence message events are only retained in memory by the Ably service for two minutes.
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     */
    history(params?: RealtimeHistoryParams): Promise<PaginatedResult<PresenceMessage>>;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Registers a listener that is called each time a [`PresenceMessage`]{@link PresenceMessage} matching a given [`PresenceAction`]{@link PresenceAction}, or an action within an array of [`PresenceAction`s]{@link PresenceAction}, is received on the channel, such as a new member entering the presence set. A callback may optionally be passed in to this call to be notified of success or failure of the channel [`attach()`]{@link RealtimeChannel#attach} operation.
     *
     * @param `PresenceAction` \| `[PresenceAction]` - A [`PresenceAction`]{@link PresenceAction} or an array of [`PresenceAction`s]{@link PresenceAction} to register the listener for.
     * @param (PresenceMessage) - An event listener function.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Subscribe to presence message events with a given PresenceAction on this channel. The caller supplies a handler, which is called each time one or more presence events occurs such as a member entering or leaving a channel.
     * END LEGACY DOCSTRING
     *
     * @param action - Not yet documented.
     * @param listener - Not yet documented.
     */
    subscribe(
      action: PresenceAction | Array<PresenceAction>,
      listener?: messageCallback<PresenceMessage>
    ): Promise<void>;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Registers a listener that is called each time a [`PresenceMessage`]{@link PresenceMessage} is received on the channel, such as a new member entering the presence set. A callback may optionally be passed in to this call to be notified of success or failure of the channel [`attach()`]{@link RealtimeChannel#attach} operation.
     *
     * @param (PresenceMessage) - An event listener function.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Subscribe to presence message events on this channel. The caller supplies a listener function, which is called each time one or more presence events occurs such as a member entering or leaving a channel.
     * END LEGACY DOCSTRING
     *
     * @param listener - Not yet documented.
     */
    subscribe(listener?: messageCallback<PresenceMessage>): Promise<void>;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Enters the presence set for the channel, optionally passing a `data` payload. A `clientId` is required to be present on a channel. An optional callback may be provided to notify of the success or failure of the operation.
     *
     * @param Data - The payload associated with the presence member.
     * @param extras - A JSON object of arbitrary key-value pairs that may contain metadata, and/or ancillary payloads.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Enter a presence channel and provide data that is associated with the current present member. If the channel is initialized (i.e. no attempt to attach has yet been made for this channel), then calling enter will implicitly attach the channel.
     * END LEGACY DOCSTRING
     *
     * @param data - Not yet documented.
     */
    enter(data?: any): Promise<void>;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Updates the `data` payload for a presence member. If called before entering the presence set, this is treated as an [`ENTER`]{@link PresenceAction#ENTER} event. An optional callback may be provided to notify of the success or failure of the operation.
     *
     * @param Data - The payload to update for the presence member.
     * @param extras - A JSON object of arbitrary key-value pairs that may contain metadata, and/or ancillary payloads.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Update the current member’s data and broadcast an update event to all subscribers. data may be null. If the channel is initialized (i.e. no attempt to attach has yet been made for this channel), then calling update will implicitly attach the channel.
     * END LEGACY DOCSTRING
     *
     * @param data - Not yet documented.
     */
    update(data?: any): Promise<void>;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Leaves the presence set for the channel. A client must have previously entered the presence set before they can leave it. An optional callback may be provided to notify of the success or failure of the operation.
     *
     * @param Data - The payload associated with the presence member.
     * @param extras - A JSON object of arbitrary key-value pairs that may contain metadata, and/or ancillary payloads.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Leave a presence channel and emit data that is associated with the current leaving member.
     * END LEGACY DOCSTRING
     *
     * @param data - Not yet documented.
     */
    leave(data?: any): Promise<void>;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Enters the presence set of the channel for a given `clientId`. Enables a single client to update presence on behalf of any number of clients using a single connection. The library must have been instantiated with an API key or a token bound to a wildcard `clientId`. An optional callback may be provided to notify of the success or failure of the operation.
     *
     * @param clientId - The ID of the client to enter into the presence set.
     * @param Data - The payload associated with the presence member.
     * @param extras - A JSON object of arbitrary key-value pairs that may contain metadata, and/or ancillary payloads.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Enter a presence channel and provide data that is associated with the current present member.
     * END LEGACY DOCSTRING
     *
     * @param clientId - Not yet documented.
     * @param data - Not yet documented.
     */
    enterClient(clientId: string, data?: any): Promise<void>;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Updates the `data` payload for a presence member using a given `clientId`. Enables a single client to update presence on behalf of any number of clients using a single connection. The library must have been instantiated with an API key or a token bound to a wildcard `clientId`. An optional callback may be provided to notify of the success or failure of the operation.
     *
     * @param clientId - The ID of the client to update in the presence set.
     * @param Data - The payload to update for the presence member.
     * @param extras - A JSON object of arbitrary key-value pairs that may contain metadata, and/or ancillary payloads.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Update the member data on behalf of the provided ClientId and broadcast an update event to all subscribers.
     * END LEGACY DOCSTRING
     *
     * @param clientId - Not yet documented.
     * @param data - Not yet documented.
     */
    updateClient(clientId: string, data?: any): Promise<void>;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Leaves the presence set of the channel for a given `clientId`. Enables a single client to update presence on behalf of any number of clients using a single connection. The library must have been instantiated with an API key or a token bound to a wildcard `clientId`. An optional callback may be provided to notify of the success or failure of the operation.
     *
     * @param clientId - The ID of the client to leave the presence set for.
     * @param Data - The payload associated with the presence member.
     * @param extras - A JSON object of arbitrary key-value pairs that may contain metadata, and/or ancillary payloads.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Leave a presence channel on behalf of the provided ClientId and emit data that is associated with the current leaving member.
     * END LEGACY DOCSTRING
     *
     * @param clientId - Not yet documented.
     * @param data - Not yet documented.
     */
    leaveClient(clientId: string, data?: any): Promise<void>;
  }

  /**
   * Not yet documented.
   */
  class ChannelBase {
    /**
     * BEGIN LEGACY DOCSTRING
     * The name String unique to this channel.
     * END LEGACY DOCSTRING
     */
    name: string;
  }

  /**
   * Not yet documented.
   */
  class ChannelCallbacks extends ChannelBase {
    /**
     * BEGIN LEGACY DOCSTRING
     * Provides access to the REST Presence object for this channel which can be used to get members present on the channel, or retrieve presence event history.
     * END LEGACY DOCSTRING
     */
    presence: PresenceCallbacks;
    /**
     * BEGIN LEGACY DOCSTRING
     * Gets a paginated set of historical messages for this channel. If the channel is configured to persist messages to disk, then message history will typically be available for 24 – 72 hours. If not, messages are only retained in memory by the Ably service for two minutes.
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     * @param callback - Not yet documented.
     */
    history(params?: RestHistoryParams, callback?: paginatedResultCallback<Message>): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Publish a single message on this channel based on a given event name and payload. A callback may optionally be passed in to this call to be notified of success or failure of the operation.
     * END LEGACY DOCSTRING
     *
     * @param name - Not yet documented.
     * @param data - Not yet documented.
     * @param callback - Not yet documented.
     */
    publish(name: string, data: any, callback?: errorCallback): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Publish several messages on this channel. A callback may optionally be passed in to this call to be notified of success or failure of the operation. It is worth noting that there are additional considerations and constraints if you want to publish multiple messages idempotently in one publish operation with client-supplied IDs.
     * END LEGACY DOCSTRING
     *
     * @param messages - Not yet documented.
     * @param callback - Not yet documented.
     */
    publish(messages: any[], callback?: errorCallback): void;
    /**
     * Not yet documented.
     *
     * @param message - Not yet documented.
     * @param callback - Not yet documented.
     */
    publish(message: any, callback?: errorCallback): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Publish a single message on this channel based on a given event name and payload. A callback may optionally be passed in to this call to be notified of success or failure of the operation.
     * END LEGACY DOCSTRING
     *
     * @param name - Not yet documented.
     * @param data - Not yet documented.
     * @param options - Not yet documented.
     * @param callback - Not yet documented.
     */
    publish(name: string, data: any, options?: PublishOptions, callback?: errorCallback): void;
    /**
     * Not yet documented.
     *
     * @param callback - Not yet documented.
     */
    status(callback: StandardCallback<ChannelDetails>): void;
  }

  /**
   * Not yet documented.
   */
  class ChannelPromise extends ChannelBase {
    /**
     * BEGIN LEGACY DOCSTRING
     * Provides access to the REST Presence object for this channel which can be used to get members present on the channel, or retrieve presence event history.
     * END LEGACY DOCSTRING
     */
    presence: PresencePromise;
    /**
     * BEGIN LEGACY DOCSTRING
     * Gets a paginated set of historical messages for this channel. If the channel is configured to persist messages to disk, then message history will typically be available for 24 – 72 hours. If not, messages are only retained in memory by the Ably service for two minutes.
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     */
    history(params?: RestHistoryParams): Promise<PaginatedResult<Message>>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Publish several messages on this channel.
     * END LEGACY DOCSTRING
     *
     * @param messages - Not yet documented.
     * @param options - Not yet documented.
     */
    publish(messages: any[], options?: PublishOptions): Promise<void>;
    /**
     * Not yet documented.
     *
     * @param message - Not yet documented.
     * @param options - Not yet documented.
     */
    publish(message: any, options?: PublishOptions): Promise<void>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Publish a single message on this channel based on a given event name and payload.
     * END LEGACY DOCSTRING
     *
     * @param name - Not yet documented.
     * @param data - Not yet documented.
     * @param options - Not yet documented.
     */
    publish(name: string, data: any, options?: PublishOptions): Promise<void>;
    /**
     * Not yet documented.
     */
    status(): Promise<ChannelDetails>;
  }

  /**
   * Not yet documented.
   */
  class RealtimeChannelBase extends EventEmitter<channelEventCallback, ChannelStateChange, ChannelEvent> {
    /**
     * Not yet documented.
     */
    readonly name: string;
    /**
     * Not yet documented.
     */
    errorReason: ErrorInfo;
    /**
     * Not yet documented.
     */
    readonly state: ChannelState;
    /**
     * Not yet documented.
     */
    params: ChannelParams;
    /**
     * Not yet documented.
     */
    modes: ChannelModes;
    /**
     * BEGIN LEGACY DOCSTRING
     * Unsubscribe the given listener for the specified event name. This removes an earlier event-specific subscription.
     * END LEGACY DOCSTRING
     *
     * @param event - Not yet documented.
     * @param listener - Not yet documented.
     */
    unsubscribe(event: string, listener: messageCallback<Message>): void;
    /**
     * Not yet documented.
     *
     * @param events - Not yet documented.
     * @param listener - Not yet documented.
     */
    unsubscribe(events: Array<string>, listener: messageCallback<Message>): void;
    /**
     * Not yet documented.
     *
     * @param event - Not yet documented.
     */
    unsubscribe(event: string): void;
    /**
     * Not yet documented.
     *
     * @param events - Not yet documented.
     */
    unsubscribe(events: Array<string>): void;
    /**
     * Not yet documented.
     *
     * @param filter - Not yet documented.
     * @param listener - Not yet documented.
     */
    unsubscribe(filter: MessageFilter, listener?: messageCallback<Message>): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Unsubscribe the given listener (for any/all event names). This removes an earlier subscription.
     * END LEGACY DOCSTRING
     *
     * @param listener - Not yet documented.
     */
    unsubscribe(listener: messageCallback<Message>): void;
    /**
     * Not yet documented.
     */
    unsubscribe(): void;
  }

  /**
   * Not yet documented.
   */
  type PublishOptions = {
    /**
     * Not yet documented.
     */
    quickAck?: boolean;
  };

  /**
   * Not yet documented.
   */
  type MessageFilter = {
    /**
     * Not yet documented.
     */
    name?: string;
    /**
     * Not yet documented.
     */
    refTimeserial?: string;
    /**
     * Not yet documented.
     */
    refType?: string;
    /**
     * Not yet documented.
     */
    isRef?: boolean;
    /**
     * Not yet documented.
     */
    clientId: string;
  };

  /**
   * Not yet documented.
   */
  class RealtimeChannelCallbacks extends RealtimeChannelBase {
    /**
     * BEGIN LEGACY DOCSTRING
     * Provides access to the Presence object for this channel which can be used to access members present on the channel, or participate in presence.
     * END LEGACY DOCSTRING
     */
    presence: RealtimePresenceCallbacks;
    /**
     * BEGIN LEGACY DOCSTRING
     * Attach to this channel ensuring the channel is created in the Ably system and all messages published on the channel will be received by any channel listeners registered using `subscribe()`. Any resulting channel state change will be emitted to any listeners registered using the on or once methods.
     *
     * As a convenience, `attach()` will be called implicitly if subscribe for the Channel is called, or `enter()` or `subscribe()` is called on the Presence for this Channel.
     * END LEGACY DOCSTRING
     *
     * @param callback - Not yet documented.
     */
    attach(callback?: errorCallback): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Detach from this channel. Any resulting channel state change will be emitted to any listeners registered using the on or once methods.
     *
     * Please note: Once all clients globally have detached from the channel, the channel will be released in the Ably service within two minutes.
     * END LEGACY DOCSTRING
     *
     * @param callback - Not yet documented.
     */
    detach(callback?: errorCallback): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Gets a paginated set of historical messages for this channel. If the channel is configured to persist messages to disk, then message history will typically be available for 24 – 72 hours. If not, messages are only retained in memory by the Ably service for two minutes.
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     * @param callback - Not yet documented.
     */
    history(params?: RealtimeHistoryParams, callback?: paginatedResultCallback<Message>): void;
    /**
     * Not yet documented.
     *
     * @param options - Not yet documented.
     * @param callback - Not yet documented.
     */
    setOptions(options: ChannelOptions, callback?: errorCallback): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Subscribe to messages with a given event name on this channel. The caller supplies a listener function, which is called each time one or more matching messages arrives on the channel.
     * END LEGACY DOCSTRING
     *
     * @param event - Not yet documented.
     * @param listener - Not yet documented.
     * @param callbackWhenAttached - Not yet documented.
     */
    subscribe(event: string, listener?: messageCallback<Message>, callbackWhenAttached?: errorCallback): void;
    /**
     * Not yet documented.
     *
     * @param events - Not yet documented.
     * @param listener - Not yet documented.
     * @param callbackWhenAttached - Not yet documented.
     */
    subscribe(events: Array<string>, listener?: messageCallback<Message>, callbackWhenAttached?: errorCallback): void;
    /**
     * Not yet documented.
     *
     * @param filter - Not yet documented.
     * @param listener - Not yet documented.
     * @param callbackWhenAttached - Not yet documented.
     */
    subscribe(filter: MessageFilter, listener?: messageCallback<Message>, callbackWhenAttached?: errorCallback): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Subscribe to messages on this channel. The caller supplies a listener function, which is called each time one or more messages arrives on the channel.
     * END LEGACY DOCSTRING
     *
     * @param listener - Not yet documented.
     * @param callbackWhenAttached - Not yet documented.
     */
    subscribe(listener: messageCallback<Message>, callbackWhenAttached?: errorCallback): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Publish a single message on this channel based on a given event name and payload. A callback may optionally be passed in to this call to be notified of success or failure of the operation. When publish is called, it won’t attempt to implicitly attach to the channel.
     * END LEGACY DOCSTRING
     *
     * @param name - Not yet documented.
     * @param data - Not yet documented.
     * @param callback - Not yet documented.
     */
    publish(name: string, data: any, callback?: errorCallback): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Publish several messages on this channel. A callback may optionally be passed in to this call to be notified of success or failure of the operation. When publish is called with this client library, it won’t attempt to implicitly attach to the channel.
     * END LEGACY DOCSTRING
     *
     * @param messages - Not yet documented.
     * @param callback - Not yet documented.
     */
    publish(messages: any[], callback?: errorCallback): void;
    /**
     * Not yet documented.
     *
     * @param message - Not yet documented.
     * @param callback - Not yet documented.
     */
    publish(message: any, callback?: errorCallback): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Publish a single message on this channel based on a given event name and payload. A callback may optionally be passed in to this call to be notified of success or failure of the operation. When publish is called, it won’t attempt to implicitly attach to the channel.
     * END LEGACY DOCSTRING
     *
     * @param name - Not yet documented.
     * @param data - Not yet documented.
     * @param callback - Not yet documented.
     */
    publish(name: string, data: any, callback?: errorCallback): void;
    /**
     * Not yet documented.
     *
     * @param targetState - Not yet documented.
     * @param callback - Not yet documented.
     */
    whenState(targetState: ChannelState, callback: channelEventCallback): void;
  }

  /**
   * Not yet documented.
   */
  class RealtimeChannelPromise extends RealtimeChannelBase {
    /**
     * BEGIN LEGACY DOCSTRING
     * Provides access to the Presence object for this channel which can be used to access members present on the channel, or participate in presence.
     * END LEGACY DOCSTRING
     */
    presence: RealtimePresencePromise;
    /**
     * BEGIN LEGACY DOCSTRING
     * Attach to this channel ensuring the channel is created in the Ably system and all messages published on the channel will be received by any channel listeners registered using `subscribe()`. Any resulting channel state change will be emitted to any listeners registered using the on or once methods.
     *
     * As a convenience, `attach()` will be called implicitly if subscribe for the Channel is called, or `enter()` or `subscribe()` is called on the Presence for this Channel.
     * END LEGACY DOCSTRING
     */
    attach(): Promise<void>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Detach from this channel. Any resulting channel state change will be emitted to any listeners registered using the on or once methods.
     *
     * Please note: Once all clients globally have detached from the channel, the channel will be released in the Ably service within two minutes.
     * END LEGACY DOCSTRING
     */
    detach(): Promise<void>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Gets a paginated set of historical messages for this channel. If the channel is configured to persist messages to disk, then message history will typically be available for 24 – 72 hours. If not, messages are only retained in memory by the Ably service for two minutes.
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     */
    history(params?: RealtimeHistoryParams): Promise<PaginatedResult<Message>>;
    /**
     * Not yet documented.
     *
     * @param options - Not yet documented.
     */
    setOptions(options: ChannelOptions): Promise<void>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Subscribe to messages with a given event name on this channel. The caller supplies a listener function, which is called each time one or more matching messages arrives on the channel.
     * END LEGACY DOCSTRING
     *
     * @param event - Not yet documented.
     * @param listener - Not yet documented.
     */
    subscribe(event: string, listener?: messageCallback<Message>): Promise<void>;
    /**
     * Not yet documented.
     *
     * @param events - Not yet documented.
     * @param listener - Not yet documented.
     */
    subscribe(events: Array<string>, listener?: messageCallback<Message>): Promise<void>;
    /**
     * Not yet documented.
     *
     * @param filter - Not yet documented.
     * @param listener - Not yet documented.
     */
    subscribe(filter: MessageFilter, listener?: messageCallback<Message>): Promise<void>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Subscribe to messages on this channel. The caller supplies a listener function, which is called each time one or more messages arrives on the channel.
     * END LEGACY DOCSTRING
     *
     * @param callback - Not yet documented.
     */
    subscribe(callback: messageCallback<Message>): Promise<void>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Publish a single message on this channel based on a given event name and payload. When publish is called, it won’t attempt to implicitly attach to the channel.
     * END LEGACY DOCSTRING
     *
     * @param name - Not yet documented.
     * @param data - Not yet documented.
     */
    publish(name: string, data: any): Promise<void>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Publish several messages on this channel. When publish is called with this client library, it won’t attempt to implicitly attach to the channel.
     * END LEGACY DOCSTRING
     *
     * @param messages - Not yet documented.
     */
    publish(messages: any[]): Promise<void>;
    /**
     * Not yet documented.
     *
     * @param message - Not yet documented.
     */
    publish(message: any): Promise<void>;
    /**
     * Not yet documented.
     *
     * @param targetState - Not yet documented.
     */
    whenState(targetState: ChannelState): Promise<ChannelStateChange>;
  }

  /**
   * Not yet documented.
   */
  class Channels<T> {
    /**
     * BEGIN LEGACY DOCSTRING
     * Creates a new Channel object if none for the channel exists, or returns the existing channel object.
     * END LEGACY DOCSTRING
     *
     * @param name - Not yet documented.
     * @param channelOptions - Not yet documented.
     */
    get(name: string, channelOptions?: ChannelOptions): T;
    /**
     * BEGIN LEGACY DOCSTRING
     * Unsubscribes all listeners from a given Channel by name.
     * END LEGACY DOCSTRING
     *
     * @param name - Not yet documented.
     */
    release(name: string): void;
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * Contains an individual message that is sent to, or received from, Ably.
   * END CANONICAL DOCSTRING
   *
   * BEGIN LEGACY DOCSTRING
   * A Message represents an individual message that is sent to or received from Ably.
   * END LEGACY DOCSTRING
   */
  class Message {
    /**
     * Not yet documented.
     */
    constructor();
    /**
     * BEGIN CANONICAL DOCSTRING
     * A static factory method to create a `Message` object from a deserialized Message-like object encoded using Ably's wire protocol.
     *
     * @param JsonObject - A `Message`-like deserialized object.
     * @param ChannelOptions - A [`ChannelOptions`]{@link ChannelOptions} object. If you have an encrypted channel, use this to allow the library to decrypt the data.
     *
     * @returns A `Message` object.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A static factory method to create a Message from a deserialized Message-like object encoded using Ably’s wire protocol.
     *
     * @param JsonObject - Not yet documented.
     * @param channelOptions - Not yet documented.
     * END LEGACY DOCSTRING
     */
    static fromEncoded: (JsonObject: any, channelOptions?: ChannelOptions) => Message;
    /**
     * BEGIN CANONICAL DOCSTRING
     * A static factory method to create an array of `Message` objects from an array of deserialized Message-like object encoded using Ably's wire protocol.
     *
     * @param JsonArray - An array of `Message`-like deserialized objects.
     * @param ChannelOptions - A [`ChannelOptions`]{@link ChannelOptions} object. If you have an encrypted channel, use this to allow the library to decrypt the data.
     *
     * @returns An array of [`Message`]{@link Message} objects.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A static factory method to create an array of Messages from an array of deserialized Message-like object encoded using Ably’s wire protocol.
     *
     * @param JsonArray - Not yet documented.
     * @param channelOptions - Not yet documented.
     * END LEGACY DOCSTRING
     */
    static fromEncodedArray: (JsonArray: any[], channelOptions?: ChannelOptions) => Message[];
    /**
     * BEGIN CANONICAL DOCSTRING
     * The client ID of the publisher of this message.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The client ID of the publisher of this message.
     * END LEGACY DOCSTRING
     */
    clientId: string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The connection ID of the publisher of this message.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The connection ID of the publisher of this message.
     * END LEGACY DOCSTRING
     */
    connectionId: string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The message payload, if provided.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The message payload, if provided.
     * END LEGACY DOCSTRING
     */
    data: any;
    /**
     * BEGIN CANONICAL DOCSTRING
     * This is typically empty, as all messages received from Ably are automatically decoded client-side using this value. However, if the message encoding cannot be processed, this attribute contains the remaining transformations not applied to the `data` payload.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * This will typically be empty as all messages received from Ably are automatically decoded client-side using this value. However, if the message encoding cannot be processed, this attribute will contain the remaining transformations not applied to the data payload.
     * END LEGACY DOCSTRING
     */
    encoding: string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * A JSON object of arbitrary key-value pairs that may contain metadata, and/or ancillary payloads. Valid payloads include [`push`]{@link Push}, [`delta`]{@link DeltaExtras}, [`ref`]{@link ReferenceExtras} and `headers`.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Metadata and/or ancillary payloads, if provided. The only currently valid payload for extras is the push object.
     * END LEGACY DOCSTRING
     */
    extras: any;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Unique ID assigned by Ably to this message.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A Unique ID assigned by Ably to this message.
     * END LEGACY DOCSTRING
     */
    id: string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The event name.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The event name, if provided.
     * END LEGACY DOCSTRING
     */
    name: string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Timestamp of when the message was received by Ably, as milliseconds since the Unix epoch.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Timestamp when the message was received by the Ably, as milliseconds since the epoch
     * END LEGACY DOCSTRING
     */
    timestamp: number;
  }

  /**
   * Not yet documented.
   */
  interface MessageStatic {
    /**
     * BEGIN CANONICAL DOCSTRING
     * A static factory method to create a `Message` object from a deserialized Message-like object encoded using Ably's wire protocol.
     *
     * @param JsonObject - A `Message`-like deserialized object.
     * @param ChannelOptions - A [`ChannelOptions`]{@link ChannelOptions} object. If you have an encrypted channel, use this to allow the library to decrypt the data.
     *
     * @returns A `Message` object.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A static factory method to create a Message from a deserialized Message-like object encoded using Ably’s wire protocol.
     *
     * @param JsonObject - Not yet documented.
     * @param channelOptions - Not yet documented.
     * END LEGACY DOCSTRING
     */
    fromEncoded: (JsonObject: any, channelOptions?: ChannelOptions) => Message;
    /**
     * BEGIN CANONICAL DOCSTRING
     * A static factory method to create an array of `Message` objects from an array of deserialized Message-like object encoded using Ably's wire protocol.
     *
     * @param JsonArray - An array of `Message`-like deserialized objects.
     * @param ChannelOptions - A [`ChannelOptions`]{@link ChannelOptions} object. If you have an encrypted channel, use this to allow the library to decrypt the data.
     *
     * @returns An array of [`Message`]{@link Message} objects.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A static factory method to create an array of Messages from an array of deserialized Message-like object encoded using Ably’s wire protocol.
     *
     * @param JsonArray - Not yet documented.
     * @param channelOptions - Not yet documented.
     * END LEGACY DOCSTRING
     */
    fromEncodedArray: (JsonArray: any[], channelOptions?: ChannelOptions) => Message[];
  }

  /**
   * BEGIN CANONICAL DOCSTRING
   * Contains an individual presence update sent to, or received from, Ably.
   * END CANONICAL DOCSTRING
   */
  class PresenceMessage {
    /**
     * Not yet documented.
     */
    constructor();
    /**
     * BEGIN CANONICAL DOCSTRING
     * Decodes and decrypts a deserialized `PresenceMessage`-like object using the cipher in [`ChannelOptions`]{@link ChannelOptions}. Any residual transforms that cannot be decoded or decrypted will be in the `encoding` property. Intended for users receiving messages from a source other than a REST or Realtime channel (for example a queue) to avoid having to parse the encoding string.
     *
     * @param JsonObject - The deserialized `PresenceMessage`-like object to decode and decrypt.
     * @param ChannelOptions - A [`ChannelOptions`]{@link ChannelOptions} object containing the cipher.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A static factory method to create a PresenceMessage from a deserialized PresenceMessage-like object encoded using Ably’s wire protocol.
     *
     * @param JsonObject - Not yet documented.
     * @param channelOptions - Not yet documented.
     * END LEGACY DOCSTRING
     */
    static fromEncoded: (JsonObject: any, channelOptions?: ChannelOptions) => PresenceMessage;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Decodes and decrypts an array of deserialized `PresenceMessage`-like object using the cipher in [`ChannelOptions`]{@link ChannelOptions}. Any residual transforms that cannot be decoded or decrypted will be in the `encoding` property. Intended for users receiving messages from a source other than a REST or Realtime channel (for example a queue) to avoid having to parse the encoding string.
     *
     * @param JsonArray - An array of deserialized `PresenceMessage`-like objects to decode and decrypt.
     * @param ChannelOptions - A [`ChannelOptions`]{@link ChannelOptions} object containing the cipher.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A static factory method to create an array of PresenceMessages from an array of deserialized PresenceMessage-like object encoded using Ably’s wire protocol.
     *
     * @param JsonArray - Not yet documented.
     * @param channelOptions - Not yet documented.
     * END LEGACY DOCSTRING
     */
    static fromEncodedArray: (JsonArray: any[], channelOptions?: ChannelOptions) => PresenceMessage[];
    /**
     * BEGIN CANONICAL DOCSTRING
     * The type of [`PresenceAction`]{@link PresenceAction} the `PresenceMessage` is for.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The event signified by a PresenceMessage.
     * END LEGACY DOCSTRING
     */
    action: PresenceAction;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The ID of the client that published the `PresenceMessage`.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The client ID of the publisher of this presence update.
     * END LEGACY DOCSTRING
     */
    clientId: string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The ID of the connection associated with the client that published the `PresenceMessage`.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The connection ID of the publisher of this presence update.
     * END LEGACY DOCSTRING
     */
    connectionId: string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The payload of the `PresenceMessage`.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * The presence update payload, if provided.
     * END LEGACY DOCSTRING
     */
    data: any;
    /**
     * BEGIN CANONICAL DOCSTRING
     * This will typically be empty as all presence messages received from Ably are automatically decoded client-side using this value. However, if the message encoding cannot be processed, this attribute will contain the remaining transformations not applied to the data payload.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * This will typically be empty as all presence updates received from Ably are automatically decoded client-side using this value. However, if the message encoding cannot be processed, this attribute will contain the remaining transformations not applied to the data payload.
     * END LEGACY DOCSTRING
     */
    encoding: string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * A unique ID assigned to each `PresenceMessage` by Ably.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Unique ID assigned by Ably to this presence update.
     * END LEGACY DOCSTRING
     */
    id: string;
    /**
     * BEGIN CANONICAL DOCSTRING
     * The time the `PresenceMessage` was received by Ably, as milliseconds since the Unix epoch.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * Timestamp when the presence update was received by Ably, as milliseconds since the epoch.
     * END LEGACY DOCSTRING
     */
    timestamp: number;
  }

  /**
   * Not yet documented.
   */
  interface PresenceMessageStatic {
    /**
     * BEGIN CANONICAL DOCSTRING
     * Decodes and decrypts a deserialized `PresenceMessage`-like object using the cipher in [`ChannelOptions`]{@link ChannelOptions}. Any residual transforms that cannot be decoded or decrypted will be in the `encoding` property. Intended for users receiving messages from a source other than a REST or Realtime channel (for example a queue) to avoid having to parse the encoding string.
     *
     * @param JsonObject - The deserialized `PresenceMessage`-like object to decode and decrypt.
     * @param ChannelOptions - A [`ChannelOptions`]{@link ChannelOptions} object containing the cipher.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A static factory method to create a PresenceMessage from a deserialized PresenceMessage-like object encoded using Ably’s wire protocol.
     *
     * @param JsonObject - Not yet documented.
     * @param channelOptions - Not yet documented.
     * END LEGACY DOCSTRING
     */
    fromEncoded: (JsonObject: any, channelOptions?: ChannelOptions) => PresenceMessage;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Decodes and decrypts an array of deserialized `PresenceMessage`-like object using the cipher in [`ChannelOptions`]{@link ChannelOptions}. Any residual transforms that cannot be decoded or decrypted will be in the `encoding` property. Intended for users receiving messages from a source other than a REST or Realtime channel (for example a queue) to avoid having to parse the encoding string.
     *
     * @param JsonArray - An array of deserialized `PresenceMessage`-like objects to decode and decrypt.
     * @param ChannelOptions - A [`ChannelOptions`]{@link ChannelOptions} object containing the cipher.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * A static factory method to create an array of PresenceMessages from an array of deserialized PresenceMessage-like object encoded using Ably’s wire protocol.
     *
     * @param JsonArray - Not yet documented.
     * @param channelOptions - Not yet documented.
     * END LEGACY DOCSTRING
     */
    fromEncodedArray: (JsonArray: any[], channelOptions?: ChannelOptions) => PresenceMessage[];
  }

  /**
   * Not yet documented.
   */
  type CipherKeyParam = ArrayBuffer | Uint8Array | string; // if string must be base64-encoded
  /**
   * Not yet documented.
   */
  type CipherKey = unknown; // WordArray on browsers, Buffer on node, using unknown as
  // user should not be interacting with it - output of getDefaultParams should be used opaquely

  /**
   * Not yet documented.
   */
  type CipherParamOptions = {
    /**
     * BEGIN LEGACY DOCSTRING
     * A binary (ArrayBuffer or WordArray) or base64-encoded String containing the secret key used for encryption and decryption.
     * END LEGACY DOCSTRING
     */
    key: CipherKeyParam;
    /**
     * BEGIN LEGACY DOCSTRING
     * The name of the algorithm in the default system provider, or the lower-cased version of it; eg “aes” or “AES”.
     * END LEGACY DOCSTRING
     */
    algorithm?: 'aes';
    /**
     * BEGIN LEGACY DOCSTRING
     * The key length in bits of the cipher, either 128 or 256.
     * END LEGACY DOCSTRING
     */
    keyLength?: number;
    /**
     * BEGIN LEGACY DOCSTRING
     * The cipher mode.
     * END LEGACY DOCSTRING
     */
    mode?: 'cbc';
  };

  /**
   * BEGIN CANONICAL DOCSTRING
   * Contains the properties required to configure the encryption of [`Message`]{@link Message} payloads.
   * END CANONICAL DOCSTRING
   */
  interface Crypto {
    /**
     * BEGIN CANONICAL DOCSTRING
     * Generates a random key to be used in the encryption of the channel. If the language cryptographic randomness primitives are blocking or async, a callback is used. The callback returns a generated binary key.
     *
     * @param keyLength - The length of the key, in bits, to be generated. If not specified, this is equal to the default `keyLength` of the default algorithm: for AES this is 256 bits.
     *
     * @returns The key as a binary, for example, a byte array.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * This call obtains a CipherParams object using the values passed in (which must be a subset of CipherParams fields that at a minimum includes a key), filling in any unspecified fields with default values, and checks that the result is a valid and self-consistent.
     *
     * You will rarely need to call this yourself, since the client library will handle it for you if you specify cipher params when initializing a channel or when setting channel options with channel.setOptions().
     *
     * @param keyLength - The length of the key in bits. If not specified, then this method will use a key length of 256 bits.
     * END LEGACY DOCSTRING
     *
     * @param callback - Not yet documented.
     */
    generateRandomKey(keyLength?: number, callback?: Types.StandardCallback<CipherKey>): void;
    /**
     * BEGIN CANONICAL DOCSTRING
     * Returns a [`CipherParams`]{@link CipherParams} object, using the default values for any fields not supplied by the [`CipherParamOptions`]{@link CipherParamOptions} object.
     *
     * @param CipherParamOptions - A [`CipherParamOptions`]{@link CipherParamOptions} object.
     *
     * @returns A [`CipherParams`]{@link CipherParams} object, using the default values for any fields not supplied.
     * END CANONICAL DOCSTRING
     *
     * BEGIN LEGACY DOCSTRING
     * This call obtains a randomly-generated binary key of the specified key length.
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     * @param callback - Not yet documented.
     */
    getDefaultParams(params: CipherParamOptions, callback: Types.StandardCallback<CipherParams>): void;
  }

  /**
   * Not yet documented.
   */
  class ConnectionBase extends EventEmitter<connectionEventCallback, ConnectionStateChange, ConnectionEvent> {
    /**
     * BEGIN LEGACY DOCSTRING
     * When a connection failure occurs this property contains the ErrorInfo.
     * END LEGACY DOCSTRING
     */
    errorReason: ErrorInfo;
    /**
     * BEGIN LEGACY DOCSTRING
     * A unique public identifier String for this connection, used to identify this member in presence events and messages.
     * END LEGACY DOCSTRING
     */
    id?: string;
    /**
     * BEGIN LEGACY DOCSTRING
     * A unique private connection key String used to recover or resume a connection, assigned by Ably. When recovering a connection explicitly, the recoveryKey is used in the recover client options as it contains both the key and the last message serial.
     *
     * This private connection key can also be used by other REST clients to publish on behalf of this client. See the [publishing over REST on behalf of a realtime client documentation](https://ably.com/documentation/rest/channels#publish-on-behalf) for more info.
     * END LEGACY DOCSTRING
     */
    key?: string;
    /**
     * BEGIN LEGACY DOCSTRING
     * The recovery key String can be used by another client to recover this connection’s state in the recover client options property. See [connection state recover options](https://ably.com/documentation/realtime/connection#connection-state-recover-options) for more information.
     * END LEGACY DOCSTRING
     */
    recoveryKey: string;
    /**
     * BEGIN LEGACY DOCSTRING
     * The serial number Integer of the last message to be received on this connection, used automatically by the library when recovering or resuming a connection. When recovering a connection explicitly, the recoveryKey is used in the recover client options as it contains both the key and the last message serial.
     * END LEGACY DOCSTRING
     */
    serial: number;
    /**
     * BEGIN LEGACY DOCSTRING
     * The current state of this Connection. See [Connection states](https://ably.com/documentation/realtime/connection#connection-states) for more information.
     * END LEGACY DOCSTRING
     */
    readonly state: ConnectionState;
    /**
     * BEGIN LEGACY DOCSTRING
     * Causes the connection to close, entering the closing state. Once closed, the library will not attempt to re-establish the connection without an explicit call to `connect`.
     * END LEGACY DOCSTRING
     */
    close(): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Explicitly calling connect is unnecessary unless the `ClientOptions` attribute `autoConnect` is false. Unless already connected or connecting, this method causes the connection to open, entering the connecting state.
     * END LEGACY DOCSTRING
     */
    connect(): void;
  }

  /**
   * Not yet documented.
   */
  class ConnectionCallbacks extends ConnectionBase {
    /**
     * BEGIN LEGACY DOCSTRING
     * When connected, sends a heartbeat ping to the Ably server and executes the callback with any error and the response time in milliseconds when a heartbeat ping request is echoed from the server. This can be useful for measuring true round-trip latency to the connected Ably server.
     * END LEGACY DOCSTRING
     *
     * @param callback - Not yet documented.
     */
    ping(callback?: Types.StandardCallback<number>): void;
    /**
     * Not yet documented.
     *
     * @param targetState - Not yet documented.
     * @param callback - Not yet documented.
     */
    whenState(targetState: ConnectionState, callback: connectionEventCallback): void;
  }

  /**
   * Not yet documented.
   */
  class ConnectionPromise extends ConnectionBase {
    /**
     * BEGIN LEGACY DOCSTRING
     * When connected, sends a heartbeat ping to the Ably server and executes the callback with any error and the response time in milliseconds when a heartbeat ping request is echoed from the server. This can be useful for measuring true round-trip latency to the connected Ably server.
     * END LEGACY DOCSTRING
     */
    ping(): Promise<number>;
    /**
     * Not yet documented.
     *
     * @param targetState - Not yet documented.
     */
    whenState(targetState: ConnectionState): Promise<ConnectionStateChange>;
  }

  /**
   * BEGIN LEGACY DOCSTRING
   * A class representing an individual statistic for a specified interval.
   * END LEGACY DOCSTRING
   */
  class Stats {
    /**
     * BEGIN LEGACY DOCSTRING
     * Aggregates inbound and outbound messages.
     * END LEGACY DOCSTRING
     */
    all: StatsMessageTypes;
    /**
     * BEGIN LEGACY DOCSTRING
     * Breakdown of API requests received via the REST API.
     * END LEGACY DOCSTRING
     */
    apiRequests: StatsRequestCount;
    /**
     * BEGIN LEGACY DOCSTRING
     * Breakdown of channels stats.
     * END LEGACY DOCSTRING
     */
    channels: StatsResourceCount;
    /**
     * BEGIN LEGACY DOCSTRING
     * Breakdown of connection stats data for different (TLS vs non-TLS) connection types.
     * END LEGACY DOCSTRING
     */
    connections: StatsConnectionTypes;
    /**
     * BEGIN LEGACY DOCSTRING
     * Breakdown of all inbound messages.
     * END LEGACY DOCSTRING
     */
    inbound: StatsMessageTraffic;
    /**
     * BEGIN LEGACY DOCSTRING
     * The interval that this statistic applies to.
     * END LEGACY DOCSTRING
     */
    intervalId: string;
    /**
     * BEGIN LEGACY DOCSTRING
     * Breakdown of all outbound messages.
     * END LEGACY DOCSTRING
     */
    outbound: StatsMessageTraffic;
    /**
     * BEGIN LEGACY DOCSTRING
     * Messages persisted for later retrieval via the history API.
     * END LEGACY DOCSTRING
     */
    persisted: StatsMessageTypes;
    /**
     * BEGIN LEGACY DOCSTRING
     * Breakdown of Token requests received via the REST API.
     * END LEGACY DOCSTRING
     */
    tokenRequests: StatsRequestCount;
  }

  /**
   * BEGIN LEGACY DOCSTRING
   * A PaginatedResult is a type that represents a page of results for all message and presence history, stats and REST presence requests. The response from a Ably REST API paginated query is accompanied by metadata that indicates the relative queries available to the PaginatedResult object.
   * END LEGACY DOCSTRING
   */
  class PaginatedResult<T> {
    /**
     * BEGIN LEGACY DOCSTRING
     * Contains the current page of results (for example an Array of Message or PresenceMessage objects for a channel history request).
     * END LEGACY DOCSTRING
     */
    items: T[];
    /**
     * BEGIN LEGACY DOCSTRING
     * Returns a new PaginatedResult for the first page of results.
     * END LEGACY DOCSTRING
     *
     * @param results - Not yet documented.
     */
    first(results: paginatedResultCallback<T>): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Returns a new PaginatedResult for the first page of results.
     * END LEGACY DOCSTRING
     */
    first(): Promise<PaginatedResult<T>>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Returns a new PaginatedResult loaded with the next page of results. If there are no further pages, then `null` is returned.
     * END LEGACY DOCSTRING
     *
     * @param results - Not yet documented.
     */
    next(results: paginatedResultCallback<T>): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Returns a new PaginatedResult loaded with the next page of results. If there are no further pages, then `null` is returned.
     * END LEGACY DOCSTRING
     */
    next(): Promise<PaginatedResult<T>>;
    /**
     * Not yet documented.
     *
     * @param results - Not yet documented.
     */
    current(results: paginatedResultCallback<T>): void;
    /**
     * Not yet documented.
     */
    current(): Promise<PaginatedResult<T>>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Returns `true` if there are more pages available by calling next and returns `false` if this page is the last page available.
     * END LEGACY DOCSTRING
     */
    hasNext(): boolean;
    /**
     * BEGIN LEGACY DOCSTRING
     * Returns `true` if this page is the last page and returns `false` if there are more pages available by calling next available.
     * END LEGACY DOCSTRING
     */
    isLast(): boolean;
  }

  /**
   * Not yet documented.
   */
  class HttpPaginatedResponse<T = any> extends PaginatedResult<T> {
    /**
     * BEGIN LEGACY DOCSTRING
     * The HTTP status code of the response.
     * END LEGACY DOCSTRING
     */
    statusCode: number;
    /**
     * BEGIN LEGACY DOCSTRING
     * Whether that HTTP status code indicates success (equivalent to 200 <= statusCode < 300).
     * END LEGACY DOCSTRING
     */
    success: boolean;
    /**
     * Not yet documented.
     */
    errorCode: number;
    /**
     * Not yet documented.
     */
    errorMessage: string;
    /**
     * BEGIN LEGACY DOCSTRING
     * The response’s headers.
     * END LEGACY DOCSTRING
     */
    headers: any;
  }

  /**
   * Not yet documented.
   */
  class PushCallbacks {
    /**
     * Not yet documented.
     */
    admin: PushAdminCallbacks;
  }

  /**
   * Not yet documented.
   */
  class PushPromise {
    /**
     * Not yet documented.
     */
    admin: PushAdminPromise;
  }

  /**
   * Not yet documented.
   */
  class PushAdminCallbacks {
    /**
     * BEGIN LEGACY DOCSTRING
     * The returned DeviceRegistrations object provides functionality for registering, updating, listing and de-registering push devices.
     * END LEGACY DOCSTRING
     */
    deviceRegistrations: PushDeviceRegistrationsCallbacks;
    /**
     * BEGIN LEGACY DOCSTRING
     * The returned PushChannelSubscriptions object provides functionality for subscribing, listing and unsubscribing individual devices or groups of identified devices to push notifications published on channels.
     * END LEGACY DOCSTRING
     */
    channelSubscriptions: PushChannelSubscriptionsCallbacks;
    /**
     * BEGIN LEGACY DOCSTRING
     * Publishes a push notification directly to a device or group of devices sharing a client identifier. See the [push notification direct publishing documentation](https://ably.com/documentation/general/push/publish#direct-publishing) for more information.
     * END LEGACY DOCSTRING
     *
     * @param recipient - Not yet documented.
     * @param payload - Not yet documented.
     * @param callback - Not yet documented.
     */
    publish(recipient: any, payload: any, callback?: errorCallback): void;
  }

  /**
   * Not yet documented.
   */
  class PushAdminPromise {
    /**
     * BEGIN LEGACY DOCSTRING
     * The returned DeviceRegistrations object provides functionality for registering, updating, listing and de-registering push devices.
     * END LEGACY DOCSTRING
     */
    deviceRegistrations: PushDeviceRegistrationsPromise;
    /**
     * BEGIN LEGACY DOCSTRING
     * The returned PushChannelSubscriptions object provides functionality for subscribing, listing and unsubscribing individual devices or groups of identified devices to push notifications published on channels.
     * END LEGACY DOCSTRING
     */
    channelSubscriptions: PushChannelSubscriptionsPromise;
    /**
     * BEGIN LEGACY DOCSTRING
     * Publishes a push notification directly to a device or group of devices sharing a client identifier. See the [push notification direct publishing documentation](https://ably.com/documentation/general/push/publish#direct-publishing) for more information.
     * END LEGACY DOCSTRING
     *
     * @param recipient - Not yet documented.
     * @param payload - Not yet documented.
     */
    publish(recipient: any, payload: any): Promise<void>;
  }

  /**
   * Not yet documented.
   */
  class PushDeviceRegistrationsCallbacks {
    /**
     * BEGIN LEGACY DOCSTRING
     * Register a new DeviceDetails object, or update an existing DeviceDetails object with the Ably service. Requires push-admin permission or push-subscribe permission together with device authentication matching the requested deviceId.
     * END LEGACY DOCSTRING
     *
     * @param deviceDetails - Not yet documented.
     * @param callback - Not yet documented.
     */
    save(deviceDetails: DeviceDetails, callback?: Types.StandardCallback<DeviceDetails>): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Obtain the DeviceDetails for a device registered for receiving push registrations matching the deviceId argument. Requires push-admin permission or push-subscribe permission together with device authentication matching the requested deviceId.
     * END LEGACY DOCSTRING
     *
     * @param deviceId - Not yet documented.
     * @param callback - Not yet documented.
     */
    get(deviceId: string, callback: Types.StandardCallback<DeviceDetails>): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Obtain the DeviceDetails for a device registered for receiving push registrations matching the id attribute of the provided DeviceDetails object. Requires push-admin permission or push-subscribe permission together with device authentication matching the requested deviceId.
     * END LEGACY DOCSTRING
     *
     * @param deviceDetails - Not yet documented.
     * @param callback - Not yet documented.
     */
    get(deviceDetails: DeviceDetails, callback: Types.StandardCallback<DeviceDetails>): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Retrieve all devices matching the params filter as a paginated list of DeviceDetails objects. Requires push-admin permission.
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     * @param callback - Not yet documented.
     */
    list(params: DeviceRegistrationParams, callback: paginatedResultCallback<DeviceDetails>): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Remove a device registered for receiving push registrations that matches the deviceId argument. Requires push-admin permission or push-subscribe permission together with device authentication matching the requested deviceId.
     * END LEGACY DOCSTRING
     *
     * @param deviceId - Not yet documented.
     * @param callback - Not yet documented.
     */
    remove(deviceId: string, callback?: errorCallback): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Remove a device registered for receiving push registrations that matches the id attribute of the provided DeviceDetails object. Requires push-admin permission or push-subscribe permission together with device authentication matching the requested deviceId.
     * END LEGACY DOCSTRING
     *
     * @param deviceDetails - Not yet documented.
     * @param callback - Not yet documented.
     */
    remove(deviceDetails: DeviceDetails, callback?: errorCallback): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Delete all devices matching the params filter. Requires push-admin permission.
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     * @param callback - Not yet documented.
     */
    removeWhere(params: DeviceRegistrationParams, callback?: errorCallback): void;
  }

  /**
   * Not yet documented.
   */
  class PushDeviceRegistrationsPromise {
    /**
     * BEGIN LEGACY DOCSTRING
     * Register a new DeviceDetails object, or update an existing DeviceDetails object with the Ably service. Requires push-admin permission or push-subscribe permission together with device authentication matching the requested deviceId.
     * END LEGACY DOCSTRING
     *
     * @param deviceDetails - Not yet documented.
     */
    save(deviceDetails: DeviceDetails): Promise<DeviceDetails>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Obtain the DeviceDetails for a device registered for receiving push registrations matching the deviceId argument. Requires push-admin permission or push-subscribe permission together with device authentication matching the requested deviceId.
     * END LEGACY DOCSTRING
     *
     * @param deviceId - Not yet documented.
     */
    get(deviceId: string): Promise<DeviceDetails>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Obtain the DeviceDetails for a device registered for receiving push registrations matching the id attribute of the provided DeviceDetails object. Requires push-admin permission or push-subscribe permission together with device authentication matching the requested deviceId.
     * END LEGACY DOCSTRING
     *
     * @param deviceDetails - Not yet documented.
     */
    get(deviceDetails: DeviceDetails): Promise<DeviceDetails>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Retrieve all devices matching the params filter as a paginated list of DeviceDetails objects. Requires push-admin permission.
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     */
    list(params: DeviceRegistrationParams): Promise<PaginatedResult<DeviceDetails>>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Remove a device registered for receiving push registrations that matches the deviceId argument. Requires push-admin permission or push-subscribe permission together with device authentication matching the requested deviceId.
     * END LEGACY DOCSTRING
     *
     * @param deviceId - Not yet documented.
     */
    remove(deviceId: string): Promise<void>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Remove a device registered for receiving push registrations that matches the id attribute of the provided DeviceDetails object. Requires push-admin permission or push-subscribe permission together with device authentication matching the requested deviceId.
     * END LEGACY DOCSTRING
     *
     * @param deviceDetails - Not yet documented.
     */
    remove(deviceDetails: DeviceDetails): Promise<void>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Delete all devices matching the params filter. Requires push-admin permission.
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     */
    removeWhere(params: DeviceRegistrationParams): Promise<void>;
  }

  /**
   * Not yet documented.
   */
  class PushChannelSubscriptionsCallbacks {
    /**
     * BEGIN LEGACY DOCSTRING
     * Subscribe a device or group of devices sharing a client identifier for push notifications published on a channel.
     * END LEGACY DOCSTRING
     *
     * @param subscription - Not yet documented.
     * @param callback - Not yet documented.
     */
    save(subscription: PushChannelSubscription, callback?: Types.StandardCallback<PushChannelSubscription>): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Retrieve all push channel subscriptions that match the provided params filter as a paginated list of PushChannelSubscription objects. Each PushChannelSubscription represents a device or set of devices sharing the same client identifier registered to a channel to receive push notifications.
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     * @param callback - Not yet documented.
     */
    list(params: PushChannelSubscriptionParams, callback: paginatedResultCallback<PushChannelSubscription>): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Retrieve a list of channels with at least one subscribed device as a paginated list of channel name String objects. Requires push-admin permission.
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     * @param callback - Not yet documented.
     */
    listChannels(params: PushChannelsParams, callback: paginatedResultCallback<string>): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Unsubscribe a device or group of devices sharing a client identifier from push notifications on a channel. Requires push-admin permission or, in the case of a subscription associated with a given deviceId, push-subscribe permission together with device authentication matching that deviceId.
     * END LEGACY DOCSTRING
     *
     * @param subscription - Not yet documented.
     * @param callback - Not yet documented.
     */
    remove(subscription: PushChannelSubscription, callback?: errorCallback): void;
    /**
     * BEGIN LEGACY DOCSTRING
     * Delete all push channel subscriptions matching the params filter. Requires push-admin permission.
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     * @param callback - Not yet documented.
     */
    removeWhere(params: PushChannelSubscriptionParams, callback?: errorCallback): void;
  }

  /**
   * Not yet documented.
   */
  class PushChannelSubscriptionsPromise {
    /**
     * BEGIN LEGACY DOCSTRING
     * Subscribe a device or group of devices sharing a client identifier for push notifications published on a channel.
     * END LEGACY DOCSTRING
     *
     * @param subscription - Not yet documented.
     */
    save(subscription: PushChannelSubscription): Promise<PushChannelSubscription>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Retrieve all push channel subscriptions that match the provided params filter as a paginated list of PushChannelSubscription objects. Each PushChannelSubscription represents a device or set of devices sharing the same client identifier registered to a channel to receive push notifications.
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     */
    list(params: PushChannelSubscriptionParams): Promise<PaginatedResult<PushChannelSubscription>>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Retrieve a list of channels with at least one subscribed device as a paginated list of channel name String objects. Requires push-admin permission.
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     */
    listChannels(params: PushChannelsParams): Promise<PaginatedResult<string>>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Unsubscribe a device or group of devices sharing a client identifier from push notifications on a channel. Requires push-admin permission or, in the case of a subscription associated with a given deviceId, push-subscribe permission together with device authentication matching that deviceId.
     * END LEGACY DOCSTRING
     *
     * @param subscription - Not yet documented.
     */
    remove(subscription: PushChannelSubscription): Promise<void>;
    /**
     * BEGIN LEGACY DOCSTRING
     * Delete all push channel subscriptions matching the params filter. Requires push-admin permission.
     * END LEGACY DOCSTRING
     *
     * @param params - Not yet documented.
     */
    removeWhere(params: PushChannelSubscriptionParams): Promise<void>;
  }
}

/**
 * BEGIN CANONICAL DOCSTRING
 * A client that offers a simple stateless API to interact directly with Ably's REST API.
 * END CANONICAL DOCSTRING
 *
 * BEGIN LEGACY DOCSTRING
 * The Ably REST client offers a simple stateless API to interact directly with Ably’s REST API.
 *
 * The REST library is typically used server-side to issue tokens, publish messages, and retrieve message history. If you are building a client-side application, you may want to consider using our stateful Ably Realtime client libraries.
 * END LEGACY DOCSTRING
 */
export declare class Rest extends Types.RestCallbacks {}

/**
 * BEGIN CANONICAL DOCSTRING
 * A client that extends the functionality of the [`RestClient`]{@link RestClient} and provides additional realtime-specific features.
 * END CANONICAL DOCSTRING
 *
 * BEGIN LEGACY DOCSTRING
 * The Ably Realtime client establishes and maintains a persistent connection to Ably and provides methods to publish and subscribe to messages over a low latency realtime connection.
 *
 *
 *
 * The Realtime client extends the REST client and as such provides the functionality available in the REST client in addition to Realtime-specific features.
 *
 *
 *
 * @augments Rest
 * END LEGACY DOCSTRING
 */
export declare class Realtime extends Types.RealtimeCallbacks {}
