// Type definitions for Ably Realtime and Rest client library 1.2
// Project: https://www.ably.com/
// Definitions by: Ably <https://github.com/ably/>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare namespace Types {
  /**
   * Not yet documented.
   */
  namespace ChannelState {
    /**
     * Not yet documented.
     */
    type INITIALIZED = 'initialized';
    /**
     * Not yet documented.
     */
    type ATTACHING = 'attaching';
    /**
     * Not yet documented.
     */
    type ATTACHED = 'attached';
    /**
     * Not yet documented.
     */
    type DETACHING = 'detaching';
    /**
     * Not yet documented.
     */
    type DETACHED = 'detached';
    /**
     * Not yet documented.
     */
    type SUSPENDED = 'suspended';
    /**
     * Not yet documented.
     */
    type FAILED = 'failed';
  }
  /**
   * Not yet documented.
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
     * Not yet documented.
     */
    type INITIALIZED = 'initialized';
    /**
     * Not yet documented.
     */
    type ATTACHING = 'attaching';
    /**
     * Not yet documented.
     */
    type ATTACHED = 'attached';
    /**
     * Not yet documented.
     */
    type DETACHING = 'detaching';
    /**
     * Not yet documented.
     */
    type DETACHED = 'detached';
    /**
     * Not yet documented.
     */
    type SUSPENDED = 'suspended';
    /**
     * Not yet documented.
     */
    type FAILED = 'failed';
    /**
     * Not yet documented.
     */
    type UPDATE = 'update';
  }
  /**
   * Not yet documented.
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
     * Not yet documented.
     */
    type INITIALIZED = 'initialized';
    /**
     * Not yet documented.
     */
    type CONNECTING = 'connecting';
    /**
     * Not yet documented.
     */
    type CONNECTED = 'connected';
    /**
     * Not yet documented.
     */
    type DISCONNECTED = 'disconnected';
    /**
     * Not yet documented.
     */
    type SUSPENDED = 'suspended';
    /**
     * Not yet documented.
     */
    type CLOSING = 'closing';
    /**
     * Not yet documented.
     */
    type CLOSED = 'closed';
    /**
     * Not yet documented.
     */
    type FAILED = 'failed';
  }
  /**
   * Not yet documented.
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
     * Not yet documented.
     */
    type INITIALIZED = 'initialized';
    /**
     * Not yet documented.
     */
    type CONNECTING = 'connecting';
    /**
     * Not yet documented.
     */
    type CONNECTED = 'connected';
    /**
     * Not yet documented.
     */
    type DISCONNECTED = 'disconnected';
    /**
     * Not yet documented.
     */
    type SUSPENDED = 'suspended';
    /**
     * Not yet documented.
     */
    type CLOSING = 'closing';
    /**
     * Not yet documented.
     */
    type CLOSED = 'closed';
    /**
     * Not yet documented.
     */
    type FAILED = 'failed';
    /**
     * Not yet documented.
     */
    type UPDATE = 'update';
  }
  /**
   * Not yet documented.
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
     * Not yet documented.
     */
    type ABSENT = 'absent';
    /**
     * Not yet documented.
     */
    type PRESENT = 'present';
    /**
     * Not yet documented.
     */
    type ENTER = 'enter';
    /**
     * Not yet documented.
     */
    type LEAVE = 'leave';
    /**
     * Not yet documented.
     */
    type UPDATE = 'update';
  }
  /**
   * Not yet documented.
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
     * Not yet documented.
     */
    type MINUTE = 'minute';
    /**
     * Not yet documented.
     */
    type HOUR = 'hour';
    /**
     * Not yet documented.
     */
    type DAY = 'day';
    /**
     * Not yet documented.
     */
    type MONTH = 'month';
  }
  /**
   * Not yet documented.
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
   * Not yet documented.
   */
  interface ChannelDetails {
    /**
     * Not yet documented.
     */
    channelId: string;
    /**
     * Not yet documented.
     */
    status: ChannelStatus;
  }

  /**
   * Not yet documented.
   */
  interface ChannelStatus {
    /**
     * Not yet documented.
     */
    isActive: boolean;
    /**
     * Not yet documented.
     */
    occupancy: ChannelOccupancy;
  }

  /**
   * Not yet documented.
   */
  interface ChannelOccupancy {
    /**
     * Not yet documented.
     */
    metrics: ChannelMetrics;
  }

  /**
   * Not yet documented.
   */
  interface ChannelMetrics {
    /**
     * Not yet documented.
     */
    connections: number;
    /**
     * Not yet documented.
     */
    presenceConnections: number;
    /**
     * Not yet documented.
     */
    presenceMembers: number;
    /**
     * Not yet documented.
     */
    presenceSubscribers: number;
    /**
     * Not yet documented.
     */
    publishers: number;
    /**
     * Not yet documented.
     */
    subscribers: number;
  }

  /**
   * Configuration options for the creation of a new client.
   */
  interface ClientOptions extends AuthOptions {
    /**
     * When true as soon as the client is instantiated it will connect to Ably. You can optionally set this to false and explicitly connect to Ably when require using the `connect` method. Defaults to `true`.
     */
    autoConnect?: boolean;

    /**
     * When a `TokenParams` object is provided, it will override the client library defaults when issuing new Ably Tokens or Ably TokenRequests.
     */
    defaultTokenParams?: TokenParams;

    /**
     * If false, prevents messages originating from this connection being echoed back on the same connection. Defaults to `true`.
     */
    echoMessages?: boolean;

    /**
     * Allows a [custom environment](https://faqs.ably.com/steps-to-set-up-custom-environments-dedicated-clusters-and-regional-restrictions-for-your-account), region or cluster to be used with the Ably service. Please [contact us](https://ably.com/contact) if you require a custom environment. Note that once a custom environment is specified, the [fallback host functionality](https://faqs.ably.com/routing-around-network-and-dns-issues) is disabled by default.
     */
    environment?: string;

    /**
     * Parameters to control the log output of the library.
     */
    log?: LogInfo;

    /**
     * For development environments only; allows a non-default Ably port to be specified.
     */
    port?: number;

    /**
     * If false, this disables the default behavior whereby the library queues messages on a connection in the disconnected or connecting states. The default behavior allows applications to submit messages immediately upon instancing the library without having to wait for the connection to be established. Applications may use this option to disable queueing if they wish to have application-level control over the queueing under those conditions.
     */
    queueMessages?: boolean;

    /**
     * For development environments only; allows a non-default Ably host to be specified.
     */
    restHost?: string;

    /**
     * For development environments only; allows a non-default Ably host to be specified for realtime connections.
     */
    realtimeHost?: string;

    /**
     * An array of fallback hosts to be used in the case of an error necessitating the use of an alternative host.
     *
     * When a custom environment is specified, the [fallback host functionality](https://faqs.ably.com/routing-around-network-and-dns-issues) is disabled. If your customer success manager has provided you with a set of custom fallback hosts, please specify them here.
     */
    fallbackHosts?: string[];

    /**
     * If true, the library will use default fallbackHosts even when overriding environment or restHost/realtimeHost.
     */
    fallbackHostsUseDefault?: boolean;

    /**
     * Set of configurable options to set on the HTTP(S) agent used for REST requests.
     *
     * See the [NodeJS docs](https://nodejs.org/api/http.html#new-agentoptions) for descriptions of these options.
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
     * This option allows a connection to inherit the state of a previous connection that may have existed under a different instance of the Realtime library. This might typically be used by clients of the browser library to ensure connection state can be preserved when the user refreshes the page. A recovery key string can be explicitly provided, or alternatively if a callback function is provided, the client library will automatically persist the recovery key between page reloads and call the callback when the connection is recoverable. The callback is then responsible for confirming whether the connection should be recovered or not. See [connection state recovery](https://ably.com/documentation/realtime/connection/#connection-state-recovery) for further information.
     */
    recover?: string | recoverConnectionCallback;

    /**
     * Use a non-secure connection. By default, a TLS connection is used to connect to Ably
     */
    tls?: boolean;

    /**
     * For development environments only; allows a non-default Ably TLS port to be specified.
     */
    tlsPort?: number;

    /**
     * When true, the more efficient MsgPack binary encoding is used.
     * When false, JSON text encoding is used.
     */
    useBinaryProtocol?: boolean;

    /**
     * When the connection enters the `DISCONNECTED` state, after this delay in milliseconds, if the state is still `DISCONNECTED`, the client library will attempt to reconnect automatically. Defaults to 15,000ms.
     */
    disconnectedRetryTimeout?: number;

    /**
     * When the connection enters the `SUSPENDED` state, after this delay in milliseconds, if the state is still `SUSPENDED`, the client library will attempt to reconnect automatically.
     */
    suspendedRetryTimeout?: number;

    /**
     * When `true`, the client library will automatically send a close request to Ably whenever the `window` [`beforeunload` event](https://developer.mozilla.org/en-US/docs/Web/API/BeforeUnloadEvent) fires. By enabling this option, the close request sent to Ably ensures the connection state will not be retained and all channels associated with the channel will be detached. This is commonly used by developers who want presence leave events to fire immediately (that is, if a user navigates to another page or closes their browser, then enabling this option will result in the presence member leaving immediately). Without this option or an explicit call to the `close` method of the `Connection` object, Ably expects that the abruptly disconnected connection could later be recovered and therefore does not immediately remove the user from presence. Instead, to avoid “twitchy” presence behaviour an abruptly disconnected client is removed from channels in which they are present after 15 seconds, and the connection state is retained for two minutes. Defaults to `true`.
     */
    closeOnUnload?: boolean;

    /**
     * When true, enables idempotent publishing by assigning a unique message ID client-side, allowing the Ably servers to discard automatic publish retries following a failure such as a network fault. We recommend you enable this by default. In version 1.2 onwards, idempotent publishing for retries will be enabled by default.
     */
    idempotentRestPublishing?: boolean;

    /**
     * Can be used to pass in arbitrary connection parameters.
     */
    transportParams?: { [k: string]: string | number };

    /**
     * An array of transports to use, in descending order of preference. In the browser environment the available transports are: `web_socket`, `xhr`, and `jsonp`.
     */
    transports?: Transport[];

    /**
     * Maximum number of fallback hosts to use as a fallback when an HTTP request to the primary host is unreachable or indicates that it is unserviceable.
     */
    httpMaxRetryCount?: number;

    /**
     * Maximum elapsed time in which fallback host retries for HTTP requests will be attempted.
     */
    httpMaxRetryDuration?: number;

    /**
     * Timeout for opening the connection, available in the client library if supported by the transport.
     */
    httpOpenTimeout?: number;

    /**
     * Timeout for any single HTTP request and response.
     */
    httpRequestTimeout?: number;

    /**
     * Not yet documented.
     */
    realtimeRequestTimeout?: number;

    /**
     * Not yet documented.
     */
    plugins?: {
      /**
       * Not yet documented.
       */
      vcdiff?: any;
    };
  }

  /**
   * Not yet documented.
   */
  interface AuthOptions {
    /**
     * A function which is called when a new token is required. The role of the callback is to obtain a fresh token, one of: an Ably Token string (in plain text format); a signed `TokenRequest` ; a `TokenDetails` (in JSON format); an [Ably JWT](https://ably.com/documentation/core-features/authentication#ably-jwt). See [an authentication callback example](https://jsbin.ably.com/azazav/1/edit?javascript,live) or [our authentication documentation](https://ably.com/documentation/rest/authentication) for details of the Ably TokenRequest format and associated API calls.
     */
    authCallback?(
      data: TokenParams,
      /**
       * Not yet documented.
       */
      callback: (error: ErrorInfo | string, tokenRequestOrDetails: TokenDetails | TokenRequest | string) => void
    ): void;

    /**
     * A set of key value pair headers to be added to any request made to the `authUrl`. Useful when an application requires these to be added to validate the request or implement the response. If the `authHeaders` object contains an `authorization` key, then [the `withCredentials` property](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/withCredentials) will be set on the underlying XHR (`XMLHttpRequest`) object.
     */
    authHeaders?: { [index: string]: string };

    /**
     * The HTTP verb to use for the request, either `GET` or `POST`. Defaults to `GET`.
     */
    authMethod?: HTTPMethods;

    /**
     * A set of key value pair params to be added to any request made to the `authUrl`. When the `authMethod` is `GET`, query params are added to the URL, whereas when `authMethod` is `POST`, the params are sent as URL encoded form data. Useful when an application require these to be added to validate the request or implement the response.
     */
    authParams?: { [index: string]: string };

    /**
     * A URL that the library may use to obtain a token string (in plain text format), or a signed TokenRequest or TokenDetails (in JSON format).
     */
    authUrl?: string;

    /**
     * The full key string, as obtained from the [application dashboard](https://faqs.ably.com/how-do-i-access-my-app-dashboard). Use this option if you wish to use Basic authentication, or wish to be able to issue Ably Tokens without needing to defer to a separate entity to sign Ably TokenRequests. Read more about [Basic authentication](https://ably.com/documentation/core-features/authentication#basic-authentication).
     */
    key?: string;

    /**
     * If true, the library will query the Ably servers for the current time when issuing `TokenRequest`s instead of relying on a locally-available time of day. Knowing the time accurately is needed to create valid signed Ably [TokenRequests](https://ably.com/documentation/realtime/authentication#token-authentication), so this option is useful for library instances on auth servers where for some reason the server clock cannot be kept synchronized through normal means, such as an [NTP daemon](https://en.wikipedia.org/wiki/Ntpd). The server is queried for the current time once per client library instance (which stores the offset from the local clock), so if using this option you should avoid instancing a new version of the library for each request.
     */
    queryTime?: boolean;

    /**
     * An authenticated token. This can either be a `TokenDetails` object, a `TokenRequest` object, or token string (obtained from the `token` property of a `TokenDetails` component of an Ably TokenRequest response, or a JSON Web Token satisfying [the Ably requirements for JWTs](https://ably.com/documentation/core-features/authentication#ably-jwt)). This option is mostly useful for testing: since tokens are short-lived, in production you almost always want to use an authentication method that allows the client library to renew the token automatically when the previous one expires, such as `authUrl` or `authCallback`. Read more about [Token authentication](https://ably.com/documentation/core-features/authentication#token-authentication).
     */
    token?: TokenDetails | string;

    /**
     * An authenticated `TokenDetails` object (most commonly obtained from an Ably Token Request response). This option is mostly useful for testing: since tokens are short-lived, in production you almost always want to use an authentication method that allows the client library to renew the token automatically when the previous one expires, such as `authUrl` or `authCallback`. Use this option if you wish to use Token authentication. Read more about [Token authentication](https://ably.com/documentation/core-features/authentication#token-authentication).
     */
    tokenDetails?: TokenDetails;

    /**
     * When true, forces Token authentication to be used by the library. Please note that if a `clientId` is not specified in the `ClientOptions` or `TokenParams`, then the Ably Token issued will be [anonymous](https://faqs.ably.com/authenticated-and-identified-clients).
     */
    useTokenAuth?: boolean;

    /**
     * A client ID, used for identifying this client when publishing messages or for presence purposes. The `clientId` can be any non-empty string. This option is primarily intended to be used in situations where the library is instantiated with a key; note that a `clientId` may also be implicit in a token used to instantiate the library; an error will be raised if a `clientId` specified here conflicts with the `clientId` implicit in the token. Find out more about [client identities](https://ably.com/documentation/how-ably-works#client-identity).
     */

    /**
     * Optional clientId that can be used to specify the identity for this client. In most cases
     * it is preferable to instead specify a clientId in the token issued to this client.
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
   * An object providing parameters of a token request. These params are used when invoking `Auth.authorize`, `Auth.requestToken`, and `Auth.createTokenRequest`.
   */
  interface TokenParams {
    /**
     * Capability requirements JSON stringified for the token. When omitted, Ably will default to the capabilities of the underlying key.
     */
    capability?: { [key: string]: capabilityOp[] } | string;
    /**
     * A `clientId` string to associate with this token. If `clientId` is `null` or omitted, then the token is prohibited from assuming a `clientId` in any operations, however if clientId` `is a wildcard string '*', then the token is permitted to assume any `clientId`. Any other string value for `clientId` implies that the `clientId` is both enforced and assumed for all operations for this token.
     */
    clientId?: string;
    /**
     * An unquoted, un-escaped random string of at least 16 characters, used to ensure the TokenRequest cannot be reused.
     */
    nonce?: string;
    /**
     *  The timestamp (in milliseconds since the epoch) of this request. Timestamps, in conjunction with the `nonce`, are used to prevent requests from being replayed. `timestamp` is a “one-time” value, and is valid in a request, but is not validly a member of any default token params such as `ClientOptions.defaultTokenParams`.
     */
    timestamp?: number;
    /**
     * Requested time to live for the token in milliseconds. When omitted, Ably will default to a TTL of 60 minutes.
     */
    ttl?: number;
  }

  /**
   * An object containing configuration options for a channel cipher, including algorithm, mode, key length and key. ably-js currently supports AES with CBC, PKCS#7 with a default key length of 256 bits, and AES128.
   */
  interface CipherParams {
    /**
     * The name of the algorithm in the default system provider, or the lower-cased version of it; eg “aes” or “AES”.
     */
    algorithm: string;
    /**
     * A binary (`ArrayBuffer` or `WordArray`) or base64-encoded String containing the secret key used for encryption and decryption.
     */
    key: CipherKey;
    /**
     * The key length in bits of the cipher, either 128 or 256.
     */
    keyLength: number;
    /**
     * The cipher mode (default: CBC).
     */
    mode: string;
  }

  /**
   * A type encapsulating error information containing an Ably-specific error code and generic status code.
   */
  interface ErrorInfo {
    /**
     * Ably error code (see [ably-common/protocol/errors.json](https://github.com/ably/ably-common/blob/main/protocol/errors.json)).
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
  }

  /**
   * Aggregate counts for messages and data transferred.
   */
  interface StatsMessageCount {
    /**
     * Count of all messages.
     */
    count: number;
    /**
     * Total data transferred for all messages in bytes.
     */
    data: number;
  }

  /**
   * A breakdown of summary stats data for different (message vs presence) message types.
   */
  interface StatsMessageTypes {
    /**
     * All messages count (includes both presence & messages).
     */
    all: StatsMessageCount;
    /**
     * Count of channel messages.
     */
    messages: StatsMessageCount;
    /**
     * Count of presence messages.
     */
    presence: StatsMessageCount;
  }

  /**
   * Aggregate counts for requests made.
   */
  interface StatsRequestCount {
    /**
     * Requests failed.
     */
    failed: number;
    /**
     * Requests refused typically as a result of permissions or a limit being exceeded.
     */
    refused: number;
    /**
     * Requests succeeded.
     */
    succeeded: number;
  }

  /**
   * Aggregate data for usage of a resource in a specific scope.
   */
  interface StatsResourceCount {
    /**
     * Average resources of this type used for this period.
     */
    mean: number;
    /**
     * Minimum total resources of this type used for this period.
     */
    min: number;
    /**
     * Total resources of this type opened.
     */
    opened: number;
    /**
     * Peak resources of this type used for this period.
     */
    peak: number;
    /**
     * Resource requests refused within this period.
     */
    refused: number;
  }

  /**
   * A breakdown of summary stats data for different (TLS vs non-TLS) connection types.
   */
  interface StatsConnectionTypes {
    /**
     * All connection count (includes both TLS & non-TLS connections).
     */
    all: StatsResourceCount;
    /**
     * Non-TLS connection count (unencrypted).
     */
    plain: StatsResourceCount;
    /**
     * TLS connection count.
     */
    tls: StatsResourceCount;
  }

  /**
   * A breakdown of summary stats data for traffic over various transport types.
   */
  interface StatsMessageTraffic {
    /**
     * All messages count (includes realtime, rest and webhook messages).
     */
    all: StatsMessageTypes;
    /**
     * Count of messages transferred over a realtime transport such as WebSockets.
     */
    realtime: StatsMessageTypes;
    /**
     * Count of messages transferred using REST.
     */
    rest: StatsMessageTypes;
    /**
     * Count of messages delivered using WebHooks.
     */
    webhook: StatsMessageTypes;
  }

  /**
   * The details of Ably Token string and its associated metadata.
   */
  interface TokenDetails {
    /**
     * The capability associated with this Ably Token. The capability is a a JSON stringified canonicalized representation of the resource paths and associated operations. [Read more about authentication and capabilities](https://ably.com/documentation/core-features/authentication/#capabilities-explained).
     */
    capability: string;
    /**
     * The client ID, if any, bound to this Ably Token. If a client ID is included, then the Ably Token authenticates its bearer as that client ID, and the Ably Token may only be used to perform operations on behalf of that client ID. The client is then considered to be an [identified client](https://ably.com/documentation/core-features/authentication#identified-clients).
     */
    clientId?: string;
    /**
     * The time (in milliseconds since the epoch) at which this token expires.
     */
    expires: number;
    /**
     * The time (in milliseconds since the epoch) at which this token was issued.
     */
    issued: number;
    /**
     * The [Ably Token](https://ably.com/documentation/core-features/authentication#ably-tokens) itself. A typical Ably Token string may appear like `xVLyHw.A-pwh7wicf3afTfgiw4k2Ku33kcnSA7z6y8FjuYpe3QaNRTEo4`.
     */
    token: string;
  }

  /**
   * The parameters for an Ably TokenRequest. Tokens are requested using `Auth.requestToken`.
   */
  interface TokenRequest {
    /**
     * Capability of the requested Ably Token. If the Ably TokenRequest is successful, the capability of the returned Ably Token will be the intersection of this capability with the capability of the issuing key. The capability is a JSON stringified canonicalized representation of the resource paths and associated operations. [Read more about authentication and capabilities](https://ably.com/documentation/realtime/authentication).
     */
    capability: string;
    /**
     * The client ID to associate with the requested Ably Token. When provided, the Ably Token may only be used to perform operations on behalf of that client ID.
     */
    clientId?: string;
    /**
     * The key name of the key against which this request is made. The key name is public, whereas the key secret is private.
     */
    keyName: string;
    /**
     * The Message Authentication Code for this request.
     */
    mac: string;
    /**
     * An opaque nonce string of at least 16 characters.
     */
    nonce: string;
    /**
     * The timestamp of this request in milliseconds.
     */
    timestamp: number;
    /**
     * Requested time to live for the Ably Token in milliseconds. If the Ably TokenRequest is successful, the TTL of the returned Ably Token will be less than or equal to this value depending on application settings and the attributes of the issuing key.
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
  type ChannelMode = 'PUBLISH' | 'SUBSCRIBE' | 'PRESENCE' | 'PRESENCE_SUBSCRIBE' | 'ATTACH_RESUME';
  /**
   * Not yet documented.
   */
  type ChannelModes = Array<ChannelMode>;

  /**
   * Channel options are used for setting [channel parameters](https://ably.com/documentation/realtime/channels/channel-parameters/overview) and [configuring encryption](https://ably.com/documentation/realtime/encryption).
   */
  interface ChannelOptions {
    /**
     * Requests encryption for this channel when not null, and specifies encryption-related parameters (such as algorithm, chaining mode, key length and key). See [an example](https://ably.com/documentation/realtime/encryption#getting-started).
     */
    cipher?: CipherParamOptions | CipherParams;
    /**
     * Optional [parameters](https://ably.com/documentation/realtime/channels/channel-parameters/overview) which specify behaviour of the channel.
     */
    params?: ChannelParams;
    /**
     * Not yet documented.
     */
    modes?: ChannelModes;
  }

  /**
   * Not yet documented.
   */
  interface RestHistoryParams {
    /**
     * Earliest time in milliseconds since the epoch for any messages retrieved.
     */
    start?: number;
    /**
     * Latest time in milliseconds since the epoch for any messages retrieved.
     */
    end?: number;
    /**
     * The direction to order messages retrieved. Defaults to backwards.
     */
    direction?: 'forwards' | 'backwards';
    /**
     * Maximum number of messages to retrieve up to 1,000. Defaults to 100.
     */
    limit?: number;
  }

  /**
   * Not yet documented.
   */
  interface RestPresenceParams {
    /**
     * Maximum number of presence members to retrieve.
     */
    limit?: number;
    /**
     * When provided, will filter array of members returned that match the provided clientId string.
     */
    clientId?: string;
    /**
     * When provided, will filter array of members returned that match the provided connectionId string.
     */
    connectionId?: string;
  }

  /**
   * Not yet documented.
   */
  interface RealtimePresenceParams {
    /**
     * When true (default) waits for the initial presence synchronization following channel attachment to complete before returning the members present. When false, the current list of members is returned without waiting for a complete synchronization.
     */
    waitForSync?: boolean;
    /**
     * When provided, will filter array of members returned that match the provided clientId string.
     */
    clientId?: string;
    /**
     * When provided, will filter array of members returned that match the provided connectionId string.
     */
    connectionId?: string;
  }

  /**
   * Not yet documented.
   */
  interface RealtimeHistoryParams {
    /**
     * Earliest time in milliseconds since the epoch for any messages retrieved.
     */
    start?: number;
    /**
     * Latest time in milliseconds since the epoch for any messages retrieved.
     */
    end?: number;
    /**
     * The direction to order messages retrieved. Defaults to backwards.
     */
    direction?: 'forwards' | 'backwards';
    /**
     * Maximum number of presence members to retrieve.
     */
    limit?: number;
    /**
     * When true, ensures message history is up until the point of the channel being attached. See [continuous history](https://ably.com/documentation/realtime/history#continuous-history) for more info. Requires the `direction` to be `backwards` (the default). If the `Channel` is not attached, or if `direction` is set to `forwards`, this option will result in an error.
     */
    untilAttach?: boolean;
  }

  /**
   * Not yet documented.
   */
  interface LogInfo {
    /**
     * A number controlling the verbosity of the output. Valid values are: 0 (no logs), 1 (errors only), 2 (errors plus connection and channel state changes), 3 (high-level debug output), and 4 (full debug output).
     */
    level?: number;

    /**
     * A function to handle each line of log output. If handler is not specified, `console.log` is used.
     */
    handler?: (msg: string) => void;
  }

  /**
   * Not yet documented.
   */
  interface ChannelStateChange {
    /**
     * The new current state.
     */
    current: ChannelState;
    /**
     * 	The previous state. (for the `update` event, this will be equal to the current state).
     */
    previous: ChannelState;
    /**
     * An ErrorInfo containing any information relating to the transition.
     */
    reason?: ErrorInfo;
    /**
     * A boolean indicated whether message continuity on this channel is preserved, see [Nonfatal channel errors](https://ably.com/documentation/realtime/channels#nonfatal-errors) for more info.
     */
    resumed: boolean;
  }

  /**
   * Not yet documented.
   */
  interface ConnectionStateChange {
    /**
     * The new state.
     */
    current: ConnectionState;
    /**
     * The previous state. (for the update event, this will be equal to the current state).
     */
    previous: ConnectionState;
    /**
     * An ErrorInfo containing any information relating to the transition.
     */
    reason?: ErrorInfo;
    /**
     * Duration upon which the client will retry a connection where applicable, as milliseconds.
     */
    retryIn?: number;
  }

  /**
   * A type encapsulating attributes of a device registered for push notifications.
   */
  interface DeviceDetails {
    /**
     * A unique identifier for the device generated by the device itself.
     */
    id: string;
    /**
     * Optional trusted [client identifier](https://ably.com/documentation/core-features/authentication#identified-clients) for the device.
     */
    clientId?: string;
    /**
     * Platform of the push device.
     */
    platform: 'android' | 'ios' | 'browser';
    /**
     * Form factor of the push device.
     */
    formFactor: 'phone' | 'tablet' | 'desktop' | 'tv' | 'watch' | 'car' | 'embedded' | 'other';
    /**
     * Optional metadata object for this device. The metadata for a device may only be set by clients with `push-admin` privileges.
     */
    metadata?: any;
    /**
     * Secret value for the device.
     */
    deviceSecret?: string;
    /**
     * Not yet documented.
     */
    push: DevicePushDetails;
  }

  /**
   * An object encapsulating the subscription of a device or group of devices sharing a client identifier to a channel in order to receive push notifications.
   */
  interface PushChannelSubscription {
    /**
     * The channel that this push notification subscription is associated with.
     */
    channel: string;
    /**
     * The device with this identifier is linked to this channel subscription. When present, `clientId` is never present.
     */
    deviceId?: string;
    /**
     * Devices with this client identifier are included in this channel subscription. When present, `deviceId` is never present.
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
     * Push recipient details for this device. See the [REST API push publish documentation](https://ably.com/documentation/rest-api#message-extras-push) for more details.
     */
    recipient: any;
    /**
     * The current state of the push device.
     */
    state?: DevicePushState;
    /**
     * When the device’s state is failing or failed, this attribute contains the reason for the most recent failure.
     */
    error?: ErrorInfo;
  }

  /**
   * Not yet documented.
   */
  interface DeviceRegistrationParams {
    /**
     * Filter to restrict to devices associated with the given client identifier
     */
    clientId?: string;
    /**
     * Filter to restrict to devices associated with the given device identifier.
     */
    deviceId?: string;
    /**
     * Maximum number of devices per page to retrieve, up to 1,000. Defaults to 100.
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
     * Filter to restrict to subscriptions associated with the given channel.
     */
    channel?: string;
    /**
     * Filter to restrict to devices associated with the given client identifier. Cannot be used with a clientId param.
     */
    clientId?: string;
    /**
     * Filter to restrict to devices associated with that device identifier. Cannot be used with a deviceId param.
     */
    deviceId?: string;
    /**
     * Maximum number of channel subscriptions per page to retrieve, up to 1,000. Defaults to 100.
     */
    limit?: number;
  }

  /**
   * Not yet documented.
   */
  interface PushChannelsParams {
    /**
     * Maximum number of channels per page to retrieve, up to 1,000. Defaults to 100.
     */
    limit?: number;
  }

  // Common Listeners
  /**
   * Not yet documented.
   */
  type StandardCallback<T> = (err: ErrorInfo | null, result?: T) => void;
  /**
   * Not yet documented.
   */
  type paginatedResultCallback<T> = StandardCallback<PaginatedResult<T>>;
  /**
   * Not yet documented.
   */
  type messageCallback<T> = (message: T) => void;
  /**
   * Not yet documented.
   */
  type errorCallback = (error?: ErrorInfo | null) => void;
  /**
   * Not yet documented.
   */
  type channelEventCallback = (changeStateChange: ChannelStateChange) => void;
  /**
   * Not yet documented.
   */
  type connectionEventCallback = (connectionStateChange: ConnectionStateChange) => void;
  /**
   * Not yet documented.
   */
  type timeCallback = StandardCallback<number>;
  /**
   * Not yet documented.
   */
  type realtimePresenceGetCallback = StandardCallback<PresenceMessage[]>;
  /**
   * Not yet documented.
   */
  type tokenDetailsCallback = StandardCallback<TokenDetails>;
  /**
   * Not yet documented.
   */
  type tokenRequestCallback = StandardCallback<TokenRequest>;
  /**
   * Not yet documented.
   */
  type recoverConnectionCallback = (
    lastConnectionDetails: {
      /**
       * The recovery key can be used by another client to recover this connection’s state in the `recover` client options property. See [connection state recover options](https://ably.com/documentation/realtime/connection/#connection-state-recover-options) for more information.
       */
      recoveryKey: string;
      /**
       * The time at which the previous client was abruptly disconnected before the page was unloaded. This is represented as milliseconds since epoch.
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
    /**
     * Not yet documented.
     */
    callback: (shouldRecover: boolean) => void
  ) => void;
  /**
   * Not yet documented.
   */
  type fromEncoded<T> = (JsonObject: any, channelOptions?: ChannelOptions) => T;
  /**
   * Not yet documented.
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
     */
    on(event: EventType | EventType[], callback: CallbackType): void;
    /**
     * Not yet documented.
     */
    on(callback: CallbackType): void;
    /**
     * Not yet documented.
     */
    once(event: EventType, callback: CallbackType): void;
    /**
     * Not yet documented.
     */
    once(callback: CallbackType): void;
    /**
     * Not yet documented.
     */
    once(event?: EventType): Promise<ResultType>;
    /**
     * Not yet documented.
     */
    off(event: EventType, callback: CallbackType): void;
    /**
     * Not yet documented.
     */
    off(callback: CallbackType): void;
    /**
     * Not yet documented.
     */
    listeners(eventName?: EventType): CallbackType[] | null;
  }

  // Classes
  /**
   * Not yet documented.
   */
  class RestBase {
    /**
     * Creates an Ably client instance
     *
     * @param options a ClientOptions object
     */
    constructor(options: Types.ClientOptions);
    /**
     * Creates an Ably client instance
     *
     * @param key An Ably API Key
     */
    constructor(key: string);
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
   * Not yet documented.
   */
  class RestCallbacks extends RestBase {
    /**
     * A promisified version of the library (use this if you prefer to use Promises or async/await instead of callbacks)
     */
    static Promise: typeof Types.RestPromise;
    /**
     * Not yet documented.
     */
    static Callbacks: typeof Types.RestCallbacks;
    /**
     * A reference to the Auth authentication object.
     */
    auth: Types.AuthCallbacks;
    /**
     * A reference to the `Channel` collection instance.
     */
    channels: Types.Channels<Types.ChannelCallbacks>;
    /**
     * Makes a REST request to a provided path. This is provided as a convenience for developers who wish to use REST API functionality that is either not documented or is not yet included in the public API, without having to handle authentication, paging, fallback hosts, MsgPack and JSON support, etc. themselves.
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
     * Queries the [REST `/stats` API](https://ably.com/documentation/rest-api#stats) and retrieves your application’s usage statistics. A PaginatedResult is returned, containing an array of stats for the first page of results. PaginatedResult objects are iterable providing a means to page through historical statistics. [See an example set of raw stats returned via the REST API](https://ably.com/documentation/general/statistics).
     */
    stats(params?: any, callback?: Types.paginatedResultCallback<Types.Stats>): void;
    /**
     * Queries the [REST `/stats` API](https://ably.com/documentation/rest-api#stats) and retrieves your application’s usage statistics. A PaginatedResult is returned, containing an array of stats for the first page of results. PaginatedResult objects are iterable providing a means to page through historical statistics. [See an example set of raw stats returned via the REST API](https://ably.com/documentation/general/statistics).
     */
    stats(callback?: Types.paginatedResultCallback<Types.Stats>): void;
    /**
     * Obtains the time from the Ably service as milliseconds since epoch. (Clients that do not have access to a sufficiently well maintained time source and wish to issue Ably TokenRequests with a more accurate timestamp should use the `queryTime` ClientOption instead of this method).
     */
    time(callback?: Types.timeCallback): void;
    /**
     * A reference to the `Push` object.
     */
    push: Types.PushCallbacks;
  }

  /**
   * Not yet documented.
   */
  class RestPromise extends RestBase {
    /**
     * A promisified version of the library (use this if you prefer to use Promises or async/await instead of callbacks)
     */
    static Promise: typeof Types.RestPromise;
    /**
     * Not yet documented.
     */
    static Callbacks: typeof Types.RestCallbacks;
    /**
     * A reference to the Auth authentication object.
     */
    auth: Types.AuthPromise;
    /**
     * A reference to the `Channel` collection instance.
     */
    channels: Types.Channels<Types.ChannelPromise>;
    /**
     * Makes a REST request to a provided path. This is provided as a convenience for developers who wish to use REST API functionality that is either not documented or is not yet included in the public API, without having to handle authentication, paging, fallback hosts, MsgPack and JSON support, etc. themselves.
     */
    request<T = any>(
      method: string,
      path: string,
      params?: any,
      body?: any[] | any,
      headers?: any
    ): Promise<Types.HttpPaginatedResponse<T>>;
    /**
     * This method queries the [REST `/stats` API](https://ably.com/documentation/rest-api#stats) and retrieves your application’s usage statistics. A PaginatedResult is returned, containing an array of stats for the first page of results. PaginatedResult objects are iterable providing a means to page through historical statistics. [See an example set of raw stats returned via the REST API](https://ably.com/documentation/general/statistics).
     */
    stats(params?: any): Promise<Types.PaginatedResult<Types.Stats>>;
    /**
     * Obtains the time from the Ably service as milliseconds since epoch. (Clients that do not have access to a sufficiently well maintained time source and wish to issue Ably TokenRequests with a more accurate timestamp should use the `queryTime` ClientOption instead of this method).
     */
    time(): Promise<number>;
    /**
     * A reference to the `Push` object.
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
     * Not yet documented.
     */
    clientId: string;
    /**
     * Not yet documented.
     */
    close(): void;
    /**
     * Not yet documented.
     */
    connect(): void;
  }

  /**
   * Not yet documented.
   */
  class RealtimeCallbacks extends RealtimeBase {
    /**
     * A reference to the Auth authentication object.
     */
    auth: Types.AuthCallbacks;
    /**
     * A reference to the `Channel` collection instance.
     */
    channels: Types.Channels<Types.RealtimeChannelCallbacks>;
    /**
     * A reference to the `Connection` object.
     */
    connection: Types.ConnectionCallbacks;
    /**
     * Makes a REST request to a provided path. This is provided as a convenience for developers who wish to use REST API functionality that is either not documented or is not yet included in the public API, without having to handle authentication, paging, fallback hosts, MsgPack and JSON support, etc. themselves.
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
     * This method queries the [REST `/stats` API](https://ably.com/documentation/rest-api#stats) and retrieves your application’s usage statistics. A PaginatedResult is returned, containing an array of stats for the first page of results. PaginatedResult objects are iterable providing a means to page through historical statistics. [See an example set of raw stats returned via the REST API](https://ably.com/documentation/general/statistics).
     */
    stats(params: any, callback: Types.paginatedResultCallback<Types.Stats>): void;
    /**
     * This method queries the [REST `/stats` API](https://ably.com/documentation/rest-api#stats) and retrieves your application’s usage statistics. A PaginatedResult is returned, containing an array of stats for the first page of results. PaginatedResult objects are iterable providing a means to page through historical statistics. [See an example set of raw stats returned via the REST API](https://ably.com/documentation/general/statistics).
     */
    stats(callback: Types.paginatedResultCallback<Types.Stats>): void;
    /**
     * Obtains the time from the Ably service as milliseconds since epoch. (Clients that do not have access to a sufficiently well maintained time source and wish to issue Ably TokenRequests with a more accurate timestamp should use the `queryTime` ClientOption instead of this method).
     */
    time(callback?: Types.timeCallback): void;
    /**
     * A reference to the `Push` object.
     */
    push: Types.PushCallbacks;
  }

  /**
   * Not yet documented.
   */
  class RealtimePromise extends RealtimeBase {
    /**
     * A reference to the Auth authentication object.
     */
    auth: Types.AuthPromise;
    /**
     * A reference to the `Channel` collection instance.
     */
    channels: Types.Channels<Types.RealtimeChannelPromise>;
    /**
     * A reference to the `Connection` object.
     */
    connection: Types.ConnectionPromise;
    /**
     * Makes a REST request to a provided path. This is provided as a convenience for developers who wish to use REST API functionality that is either not documented or is not yet included in the public API, without having to handle authentication, paging, fallback hosts, MsgPack and JSON support, etc. themselves.
     */
    request<T = any>(
      method: string,
      path: string,
      params?: any,
      body?: any[] | any,
      headers?: any
    ): Promise<Types.HttpPaginatedResponse<T>>;
    /**
     * This method queries the [REST `/stats` API](https://ably.com/documentation/rest-api#stats) and retrieves your application’s usage statistics. A PaginatedResult is returned, containing an array of stats for the first page of results. PaginatedResult objects are iterable providing a means to page through historical statistics. [See an example set of raw stats returned via the REST API](https://ably.com/documentation/general/statistics).
     */
    stats(params?: any): Promise<Types.PaginatedResult<Types.Stats>>;
    /**
     * Obtains the time from the Ably service as milliseconds since epoch. (Clients that do not have access to a sufficiently well maintained time source and wish to issue Ably TokenRequests with a more accurate timestamp should use the `queryTime` ClientOption instead of this method).
     */
    time(): Promise<number>;
    /**
     * A reference to the `Push` object.
     */
    push: Types.PushPromise;
  }

  /**
   * Not yet documented.
   */
  class AuthBase {
    /**
     * The client ID string, if any, configured for this client connection. See [identified clients](https://ably.com/documentation/realtime/authentication#identified-clients) for more information on trusted client identifiers.
     */
    clientId: string;
  }

  /**
   * Not yet documented.
   */
  class AuthCallbacks extends AuthBase {
    /**
     * Instructs the library to get a new token immediately. When using the realtime client, it will upgrade the current realtime connection to use the new token, or if not connected, will initiate a connection to Ably once the new token has been obtained. Also stores any `tokenParams` and `authOptions` passed in as the new defaults, to be used for all subsequent implicit or explicit token requests.
     *
     * Any `tokenParams` and `authOptions` objects passed in will entirely replace (as opposed to being merged with) the currently client library saved `tokenParams` and `authOptions`.
     */
    authorize(tokenParams?: TokenParams, authOptions?: AuthOptions, callback?: tokenDetailsCallback): void;
    /**
     * Instructs the library to get a new token immediately. When using the realtime client, it will upgrade the current realtime connection to use the new token, or if not connected, will initiate a connection to Ably once the new token has been obtained. Also stores any `tokenParams` and `authOptions` passed in as the new defaults, to be used for all subsequent implicit or explicit token requests.
     *
     * Any `tokenParams` objects passed in will entirely replace (as opposed to being merged with) the currently client library saved `tokenParams`.
     */
    authorize(tokenParams?: TokenParams, callback?: tokenDetailsCallback): void;
    /**
     * Instructs the library to get a new token immediately. When using the realtime client, it will upgrade the current realtime connection to use the new token, or if not connected, will initiate a connection to Ably once the new token has been obtained. Also stores any `tokenParams` and `authOptions` passed in as the new defaults, to be used for all subsequent implicit or explicit token requests.
     */
    authorize(callback?: tokenDetailsCallback): void;
    /**
     * Creates and signs an Ably `TokenRequest` based on the specified (or if none specified, the client library stored) `tokenParams` and `authOptions`. Note this can only be used when the API `key` value is available locally. Otherwise, the Ably `TokenRequest` must be obtained from the key owner. Use this to generate an Ably `TokenRequest` in order to implement an Ably Token request callback for use by other clients.
     *
     * Both `authOptions` and `tokenParams` are optional. When omitted or `null`, the default token parameters and authentication options for the client library are used, as specified in the `ClientOptions` when the client library was instantiated, or later updated with an explicit `authorize` request. Values passed in will be used instead of (rather than being merged with) the default values.
     *
     * To understand why an Ably `TokenRequest` may be issued to clients in favor of a token, see [Token Authentication explained](https://ably.com/documentation/core-features/authentication/#token-authentication).
     */
    createTokenRequest(
      tokenParams?: TokenParams | null,
      authOptions?: AuthOptions | null,
      callback?: tokenRequestCallback
    ): void;
    /**
     * Creates and signs an Ably `TokenRequest` based on the specified (or if none specified, the client library stored) `tokenParams` and `authOptions`. Note this can only be used when the API `key` value is available locally. Otherwise, the Ably `TokenRequest` must be obtained from the key owner. Use this to generate an Ably `TokenRequest` in order to implement an Ably Token request callback for use by other clients.
     *
     * The `tokenParams` parameter is optional. When omitted or `null`, the default token parameters for the client library are used, as specified in the `ClientOptions` when the client library was instantiated, or later updated with an explicit `authorize` request. Values passed in will be used instead of (rather than being merged with) the default values.
     *
     * To understand why an Ably `TokenRequest` may be issued to clients in favor of a token, see [Token Authentication explained](https://ably.com/documentation/core-features/authentication/#token-authentication).
     */
    createTokenRequest(tokenParams?: TokenParams | null, callback?: tokenRequestCallback): void;
    /**
     * Creates and signs an Ably `TokenRequest` based on the specified (or if none specified, the client library stored) `tokenParams` and `authOptions`. Note this can only be used when the API `key` value is available locally. Otherwise, the Ably `TokenRequest` must be obtained from the key owner. Use this to generate an Ably `TokenRequest` in order to implement an Ably Token request callback for use by other clients.
     *
     * To understand why an Ably `TokenRequest` may be issued to clients in favor of a token, see [Token Authentication explained](https://ably.com/documentation/core-features/authentication/#token-authentication).
     */
    createTokenRequest(callback?: tokenRequestCallback): void;
    /**
     * Calls the [requestToken REST API endpoint](https://ably.com/documentation/rest-api#request-token) to obtain an Ably Token according to the specified tokenParams and authOptions.
     *
     * Both `authOptions` and `tokenParams` are optional. When omitted or `null`, the default token parameters and authentication options for the client library are used, as specified in the `ClientOptions` when the client library was instantiated, or later updated with an explicit `authorize` request. Values passed in will be used instead of (rather than being merged with) the default values.
     *
     * To understand why an Ably `TokenRequest` may be issued to clients in favor of a token, see [Token Authentication explained](https://ably.com/documentation/core-features/authentication/#token-authentication).
     */
    requestToken(
      TokenParams?: TokenParams | null,
      authOptions?: AuthOptions | null,
      callback?: tokenDetailsCallback
    ): void;
    /**
     * Calls the [requestToken REST API endpoint](https://ably.com/documentation/rest-api#request-token) to obtain an Ably Token according to the specified tokenParams and authOptions.
     *
     * The `tokenParams` parameter is optional. When omitted or `null`, the default token parameters for the client library are used, as specified in the `ClientOptions` when the client library was instantiated, or later updated with an explicit `authorize` request. Values passed in will be used instead of (rather than being merged with) the default values.
     *
     * To understand why an Ably `TokenRequest` may be issued to clients in favor of a token, see [Token Authentication explained](https://ably.com/documentation/core-features/authentication/#token-authentication).
     */
    requestToken(TokenParams?: TokenParams | null, callback?: tokenDetailsCallback): void;
    /**
     * Calls the [requestToken REST API endpoint](https://ably.com/documentation/rest-api#request-token) to obtain an Ably Token according to the specified tokenParams and authOptions.
     *
     * To understand why an Ably `TokenRequest` may be issued to clients in favor of a token, see [Token Authentication explained](https://ably.com/documentation/core-features/authentication/#token-authentication).
     */
    requestToken(callback?: tokenDetailsCallback): void;
  }

  /**
   * Not yet documented.
   */
  class AuthPromise extends AuthBase {
    /**
     * Instructs the library to get a new token immediately. When using the realtime client, it will upgrade the current realtime connection to use the new token, or if not connected, will initiate a connection to Ably once the new token has been obtained. Also stores any `tokenParams` and `authOptions` passed in as the new defaults, to be used for all subsequent implicit or explicit token requests.
     *
     * Any `tokenParams` and `authOptions` objects passed in will entirely replace (as opposed to being merged with) the currently client library saved `tokenParams` and `authOptions`.
     */
    authorize(tokenParams?: TokenParams, authOptions?: AuthOptions): Promise<TokenDetails>;
    /**
     * Creates and signs an Ably `TokenRequest` based on the specified (or if none specified, the client library stored) `tokenParams` and `authOptions`. Note this can only be used when the API `key` value is available locally. Otherwise, the Ably `TokenRequest` must be obtained from the key owner. Use this to generate an Ably `TokenRequest` in order to implement an Ably Token request callback for use by other clients.
     *
     * Both `authOptions` and `tokenParams` are optional. When omitted or `null`, the default token parameters and authentication options for the client library are used, as specified in the `ClientOptions` when the client library was instantiated, or later updated with an explicit `authorize` request. Values passed in will be used instead of (rather than being merged with) the default values.
     *
     * To understand why an Ably `TokenRequest` may be issued to clients in favor of a token, see [Token Authentication explained](https://ably.com/documentation/core-features/authentication/#token-authentication).
     */
    createTokenRequest(tokenParams?: TokenParams, authOptions?: AuthOptions): Promise<TokenRequest>;
    /**
     * Calls the [requestToken REST API endpoint](https://ably.com/documentation/rest-api#request-token) to obtain an Ably Token according to the specified tokenParams and authOptions.
     *
     * Both `authOptions` and `tokenParams` are optional. When omitted or `null`, the default token parameters and authentication options for the client library are used, as specified in the `ClientOptions` when the client library was instantiated, or later updated with an explicit `authorize` request. Values passed in will be used instead of (rather than being merged with) the default values.
     *
     * To understand why an Ably `TokenRequest` may be issued to clients in favor of a token, see [Token Authentication explained](https://ably.com/documentation/core-features/authentication/#token-authentication).
     */
    requestToken(TokenParams?: TokenParams, authOptions?: AuthOptions): Promise<TokenDetails>;
  }

  /**
   * Not yet documented.
   */
  class PresenceCallbacks {
    /**
     * Get the current presence member set for this channel. In the REST client library this method directly queries [Ably’s REST presence API](https://ably.com/documentation/rest-api#presence).
     */
    get(params?: RestPresenceParams, callback?: paginatedResultCallback<PresenceMessage>): void;
    /**
     * Get the current presence member set for this channel. In the REST client library this method directly queries [Ably’s REST presence API](https://ably.com/documentation/rest-api#presence).
     */
    get(callback?: paginatedResultCallback<PresenceMessage>): void;
    /**
     * Gets a paginated set of historical presence message events for this channel. If the channel is configured to persist messages to disk, then the presence message event history will typically be available for 24 – 72 hours. If not, presence message events are only retained in memory by the Ably service for two minutes.
     */
    history(params: RestHistoryParams, callback?: paginatedResultCallback<PresenceMessage>): void;
    /**
     * Gets a paginated set of historical presence message events for this channel. If the channel is configured to persist messages to disk, then the presence message event history will typically be available for 24 – 72 hours. If not, presence message events are only retained in memory by the Ably service for two minutes.
     */
    history(callback: paginatedResultCallback<PresenceMessage>): void;
  }

  /**
   * Not yet documented.
   */
  class PresencePromise {
    /**
     * Get the current presence member set for this channel. In the REST client library this method directly queries [Ably’s REST presence API](https://ably.com/documentation/rest-api#presence).
     */
    get(params?: RestPresenceParams): Promise<PaginatedResult<PresenceMessage>>;
    /**
     * Gets a paginated set of historical presence message events for this channel. If the channel is configured to persist messages to disk, then the presence message event history will typically be available for 24 – 72 hours. If not, presence message events are only retained in memory by the Ably service for two minutes.
     */
    history(params?: RestHistoryParams): Promise<PaginatedResult<PresenceMessage>>;
  }

  /**
   * Not yet documented.
   */
  class RealtimePresenceBase {
    /**
     * Not yet documented.
     */
    syncComplete: boolean;
    /**
     * Unsubscribe the given listener from presence message events on this channel for the given PresenceAction. This removes an earlier event-specific subscription.
     */
    unsubscribe(presence?: PresenceAction | Array<PresenceAction>, listener?: messageCallback<PresenceMessage>): void;
    /**
     * Unsubscribe the given listener from presence message events on this channel. This removes an earlier subscription.
     */
    unsubscribe(listener?: messageCallback<PresenceMessage>): void;
    /**
     * Unsubscribes all listeners to presence message events on this channel. This removes all earlier subscriptions.
     */
    unsubscribe(): void;
  }

  /**
   * Not yet documented.
   */
  class RealtimePresenceCallbacks extends RealtimePresenceBase {
    /**
     * Get the current presence member set for this channel. Typically, this method returns the member set immediately as the member set is retained in memory by the client. However, by default this method will wait until the presence member set is synchronized, so if the synchronization is not yet complete following a channel being attached, this method will wait until the presence member set is synchronized.
     *
     * When a channel is `attached`, the Ably service immediately synchronizes the presence member set with the client. Typically this process completes in milliseconds, however when the presence member set is very large, bandwidth constraints may slow this synchronization process down.
     *
     * When a channel is `initialized` (i.e. no attempt to attach has yet been made for this channel), then calling `get` will implicitly attach the channel.
     */
    get(params?: RealtimePresenceParams, callback?: realtimePresenceGetCallback): void;
    /**
     * Get the current presence member set for this channel. Typically, this method returns the member set immediately as the member set is retained in memory by the client. However, by default this method will wait until the presence member set is synchronized, so if the synchronization is not yet complete following a channel being attached, this method will wait until the presence member set is synchronized.
     *
     * When a channel is `attached`, the Ably service immediately synchronizes the presence member set with the client. Typically this process completes in milliseconds, however when the presence member set is very large, bandwidth constraints may slow this synchronization process down.
     *
     * When a channel is `initialized` (i.e. no attempt to attach has yet been made for this channel), then calling `get` will implicitly attach the channel.
     */
    get(callback?: realtimePresenceGetCallback): void;
    /**
     * Gets a paginated set of historical presence message events for this channel. If the channel is configured to persist messages to disk, then the presence message event history will typically be available for 24 – 72 hours. If not, presence message events are only retained in memory by the Ably service for two minutes.
     */
    history(params?: RealtimeHistoryParams, callback?: paginatedResultCallback<PresenceMessage>): void;
    /**
     * Gets a paginated set of historical presence message events for this channel. If the channel is configured to persist messages to disk, then the presence message event history will typically be available for 24 – 72 hours. If not, presence message events are only retained in memory by the Ably service for two minutes.
     */
    history(callback?: paginatedResultCallback<PresenceMessage>): void;
    /**
     * Subscribe to presence message events with a given PresenceAction on this channel. The caller supplies a handler, which is called each time one or more presence events occurs such as a member entering or leaving a channel.
     */
    subscribe(
      presence: PresenceAction | Array<PresenceAction>,
      listener?: messageCallback<PresenceMessage>,
      callbackWhenAttached?: errorCallback
    ): void;
    /**
     * Subscribe to presence message events on this channel. The caller supplies a handler, which is called each time one or more presence events occurs such as a member entering or leaving a channel.
     */
    subscribe(listener: messageCallback<PresenceMessage>, callbackWhenAttached?: errorCallback): void;
    /**
     * Enter a presence channel and provide data that is associated with the current present member. If the channel is initialized (i.e. no attempt to attach has yet been made for this channel), then calling enter will implicitly attach the channel.
     */
    enter(data?: any, callback?: errorCallback): void;
    /**
     * Enter a presence channel without any data. If the channel is initialized (i.e. no attempt to attach has yet been made for this channel), then calling enter will implicitly attach the channel.
     */
    enter(callback?: errorCallback): void;
    /**
     * Update the current member’s data and broadcast an update event to all subscribers. data may be null. If the channel is initialized (i.e. no attempt to attach has yet been made for this channel), then calling update will implicitly attach the channel.
     */
    update(data?: any, callback?: errorCallback): void;
    /**
     * Update the current member’s data and broadcast an update event to all subscribers. data may be null. If the channel is initialized (i.e. no attempt to attach has yet been made for this channel), then calling update will implicitly attach the channel.
     */
    update(callback?: errorCallback): void;
    /**
     * Leave a presence channel and emit data that is associated with the current leaving member.
     */
    leave(data?: any, callback?: errorCallback): void;
    /**
     * Leave a presence channel without emitting any data.
     */
    leave(callback?: errorCallback): void;
    /**
     * Enter a presence channel and provide data that is associated with the current present member.
     */
    enterClient(clientId: string, data?: any, callback?: errorCallback): void;
    /**
     * Enter a presence channel on behalf of the provided ClientId without any data.
     */
    enterClient(clientId: string, callback?: errorCallback): void;
    /**
     * Update the member data on behalf of the provided ClientId and broadcast an update event to all subscribers.
     */
    updateClient(clientId: string, data?: any, callback?: errorCallback): void;
    /**
     * Update the member data on behalf of the provided ClientId and broadcast an update event to all subscribers.
     */
    updateClient(clientId: string, callback?: errorCallback): void;
    /**
     * Leave a presence channel on behalf of the provided ClientId and emit data that is associated with the current leaving member.
     */
    leaveClient(clientId: string, data?: any, callback?: errorCallback): void;
    /**
     * Leave a presence channel on behalf of the provided ClientId without emitting any data.
     */
    leaveClient(clientId: string, callback?: errorCallback): void;
  }

  /**
   * Not yet documented.
   */
  class RealtimePresencePromise extends RealtimePresenceBase {
    /**
     * Get the current presence member set for this channel. Typically, this method returns the member set immediately as the member set is retained in memory by the client. However, by default this method will wait until the presence member set is synchronized, so if the synchronization is not yet complete following a channel being attached, this method will wait until the presence member set is synchronized.
     *
     * When a channel is `attached`, the Ably service immediately synchronizes the presence member set with the client. Typically this process completes in milliseconds, however when the presence member set is very large, bandwidth constraints may slow this synchronization process down.
     *
     * When a channel is `initialized` (i.e. no attempt to attach has yet been made for this channel), then calling `get` will implicitly attach the channel.
     */
    get(params?: RealtimePresenceParams): Promise<PresenceMessage[]>;
    /**
     * Gets a paginated set of historical presence message events for this channel. If the channel is configured to persist messages to disk, then the presence message event history will typically be available for 24 – 72 hours. If not, presence message events are only retained in memory by the Ably service for two minutes.
     */
    history(params?: RealtimeHistoryParams): Promise<PaginatedResult<PresenceMessage>>;
    /**
     * Subscribe to presence message events with a given PresenceAction on this channel. The caller supplies a handler, which is called each time one or more presence events occurs such as a member entering or leaving a channel.
     */
    subscribe(
      action?: PresenceAction | Array<PresenceAction>,
      listener?: messageCallback<PresenceMessage>
    ): Promise<void>;
    /**
     * Subscribe to presence message events on this channel. The caller supplies a listener function, which is called each time one or more presence events occurs such as a member entering or leaving a channel.
     */
    subscribe(listener?: messageCallback<PresenceMessage>): Promise<void>;
    /**
     * Enter a presence channel and provide data that is associated with the current present member. If the channel is initialized (i.e. no attempt to attach has yet been made for this channel), then calling enter will implicitly attach the channel.
     */
    enter(data?: any): Promise<void>;
    /**
     * Update the current member’s data and broadcast an update event to all subscribers. data may be null. If the channel is initialized (i.e. no attempt to attach has yet been made for this channel), then calling update will implicitly attach the channel.
     */
    update(data?: any): Promise<void>;
    /**
     * Leave a presence channel and emit data that is associated with the current leaving member.
     */
    leave(data?: any): Promise<void>;
    /**
     * Enter a presence channel and provide data that is associated with the current present member.
     */
    enterClient(clientId: string, data?: any): Promise<void>;
    /**
     * Update the member data on behalf of the provided ClientId and broadcast an update event to all subscribers.
     */
    updateClient(clientId: string, data?: any): Promise<void>;
    /**
     * Leave a presence channel on behalf of the provided ClientId and emit data that is associated with the current leaving member.
     */
    leaveClient(clientId: string, data?: any): Promise<void>;
  }

  /**
   * Not yet documented.
   */
  class ChannelBase {
    /**
     * The name String unique to this channel.
     */
    name: string;
  }

  /**
   * Not yet documented.
   */
  class ChannelCallbacks extends ChannelBase {
    /**
     * Provides access to the REST Presence object for this channel which can be used to get members present on the channel, or retrieve presence event history.
     */
    presence: PresenceCallbacks;
    /**
     * Gets a paginated set of historical messages for this channel. If the channel is configured to persist messages to disk, then message history will typically be available for 24 – 72 hours. If not, messages are only retained in memory by the Ably service for two minutes.
     */
    history(params?: RestHistoryParams, callback?: paginatedResultCallback<Message>): void;
    /**
     * Gets a paginated set of historical messages for this channel. If the channel is configured to persist messages to disk, then message history will typically be available for 24 – 72 hours. If not, messages are only retained in memory by the Ably service for two minutes.
     */
    history(callback?: paginatedResultCallback<Message>): void;
    /**
     * Publish a single message on this channel based on a given event name and payload. A callback may optionally be passed in to this call to be notified of success or failure of the operation.
     */
    publish(name: string, messages: any, callback?: errorCallback): void;
    /**
     * Publish several messages on this channel. A callback may optionally be passed in to this call to be notified of success or failure of the operation. It is worth noting that there are additional considerations and constraints if you want to publish multiple messages idempotently in one publish operation with client-supplied IDs.
     */
    publish(messages: any, callback?: errorCallback): void;
    /**
     * Publish a single message on this channel based on a given event name and payload. A callback may optionally be passed in to this call to be notified of success or failure of the operation.
     */
    publish(name: string, messages: any, options?: PublishOptions, callback?: errorCallback): void;
    /**
     * Not yet documented.
     */
    status(callback: StandardCallback<ChannelDetails>): void;
  }

  /**
   * Not yet documented.
   */
  class ChannelPromise extends ChannelBase {
    /**
     * Provides access to the REST Presence object for this channel which can be used to get members present on the channel, or retrieve presence event history.
     */
    presence: PresencePromise;
    /**
     * Gets a paginated set of historical messages for this channel. If the channel is configured to persist messages to disk, then message history will typically be available for 24 – 72 hours. If not, messages are only retained in memory by the Ably service for two minutes.
     */
    history(params?: RestHistoryParams): Promise<PaginatedResult<Message>>;
    /**
     * Publish several messages on this channel.
     */
    publish(messages: any, options?: PublishOptions): Promise<void>;
    /**
     * Publish a single message on this channel based on a given event name and payload.
     */
    publish(name: string, messages: any, options?: PublishOptions): Promise<void>;
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
     * Unsubscribe the given listener for the specified event name. This removes an earlier event-specific subscription.
     */
    unsubscribe(event?: string | Array<string>, listener?: messageCallback<Message>): void;
    /**
     * Unsubscribe the given listener (for any/all event names). This removes an earlier subscription.
     */
    unsubscribe(listener?: messageCallback<Message>): void;
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
  class RealtimeChannelCallbacks extends RealtimeChannelBase {
    /**
     * Provides access to the Presence object for this channel which can be used to access members present on the channel, or participate in presence.
     */
    presence: RealtimePresenceCallbacks;
    /**
     * Attach to this channel ensuring the channel is created in the Ably system and all messages published on the channel will be received by any channel listeners registered using `subscribe()`. Any resulting channel state change will be emitted to any listeners registered using the on or once methods.
     *
     * As a convenience, `attach()` will be called implicitly if subscribe for the Channel is called, or `enter()` or `subscribe()` is called on the Presence for this Channel.
     */
    attach(callback?: errorCallback): void;
    /**
     * Detach from this channel. Any resulting channel state change will be emitted to any listeners registered using the on or once methods.
     *
     * Please note: Once all clients globally have detached from the channel, the channel will be released in the Ably service within two minutes.
     */
    detach(callback?: errorCallback): void;
    /**
     * Gets a paginated set of historical messages for this channel. If the channel is configured to persist messages to disk, then message history will typically be available for 24 – 72 hours. If not, messages are only retained in memory by the Ably service for two minutes.
     */
    history(params?: RealtimeHistoryParams, callback?: paginatedResultCallback<Message>): void;
    /**
     * Gets a paginated set of historical messages for this channel. If the channel is configured to persist messages to disk, then message history will typically be available for 24 – 72 hours. If not, messages are only retained in memory by the Ably service for two minutes.
     */
    history(callback?: paginatedResultCallback<Message>): void;
    /**
     * Not yet documented.
     */
    setOptions(options: ChannelOptions, callback?: errorCallback): void;
    /**
     * Subscribe to messages with a given event name on this channel. The caller supplies a listener function, which is called each time one or more matching messages arrives on the channel.
     */
    subscribe(
      event: string | Array<string>,
      listener?: messageCallback<Message>,
      callbackWhenAttached?: errorCallback
    ): void;
    /**
     * Subscribe to messages on this channel. The caller supplies a listener function, which is called each time one or more messages arrives on the channel.
     */
    subscribe(listener: messageCallback<Message>, callbackWhenAttached?: errorCallback): void;
    /**
     * Publish a single message on this channel based on a given event name and payload. A callback may optionally be passed in to this call to be notified of success or failure of the operation. When publish is called, it won’t attempt to implicitly attach to the channel.
     */
    publish(name: string, messages: any, callback?: errorCallback): void;
    /**
     * Publish several messages on this channel. A callback may optionally be passed in to this call to be notified of success or failure of the operation. When publish is called with this client library, it won’t attempt to implicitly attach to the channel.
     */
    publish(messages: any, callback?: errorCallback): void;
    /**
     * Publish a single message on this channel based on a given event name and payload. A callback may optionally be passed in to this call to be notified of success or failure of the operation. When publish is called, it won’t attempt to implicitly attach to the channel.
     */
    publish(name: string, messages: any, options?: PublishOptions, callback?: errorCallback): void;
    /**
     * Not yet documented.
     */
    whenState(targetState: ChannelState, callback: channelEventCallback): void;
  }

  /**
   * Not yet documented.
   */
  class RealtimeChannelPromise extends RealtimeChannelBase {
    /**
     * Provides access to the Presence object for this channel which can be used to access members present on the channel, or participate in presence.
     */
    presence: RealtimePresencePromise;
    /**
     * Attach to this channel ensuring the channel is created in the Ably system and all messages published on the channel will be received by any channel listeners registered using `subscribe()`. Any resulting channel state change will be emitted to any listeners registered using the on or once methods.
     *
     * As a convenience, `attach()` will be called implicitly if subscribe for the Channel is called, or `enter()` or `subscribe()` is called on the Presence for this Channel.
     */
    attach(): Promise<void>;
    /**
     * Detach from this channel. Any resulting channel state change will be emitted to any listeners registered using the on or once methods.
     *
     * Please note: Once all clients globally have detached from the channel, the channel will be released in the Ably service within two minutes.
     */
    detach(): Promise<void>;
    /**
     * Gets a paginated set of historical messages for this channel. If the channel is configured to persist messages to disk, then message history will typically be available for 24 – 72 hours. If not, messages are only retained in memory by the Ably service for two minutes.
     */
    history(params?: RealtimeHistoryParams): Promise<PaginatedResult<Message>>;
    /**
     * Not yet documented.
     */
    setOptions(options: ChannelOptions): Promise<void>;
    /**
     * Subscribe to messages with a given event name on this channel. The caller supplies a listener function, which is called each time one or more matching messages arrives on the channel.
     */
    subscribe(event: string | Array<string>, listener?: messageCallback<Message>): Promise<void>;
    /**
     * Subscribe to messages on this channel. The caller supplies a listener function, which is called each time one or more messages arrives on the channel.
     */
    subscribe(callback: messageCallback<Message>): Promise<void>;
    /**
     * Publish a single message on this channel based on a given event name and payload. When publish is called, it won’t attempt to implicitly attach to the channel.
     */
    publish(name: string, messages: any, options?: PublishOptions): Promise<void>;
    /**
     * Publish several messages on this channel. When publish is called with this client library, it won’t attempt to implicitly attach to the channel.
     */
    publish(messages: any, options?: PublishOptions): Promise<void>;
    /**
     * Not yet documented.
     */
    whenState(targetState: ChannelState): Promise<ChannelStateChange>;
  }

  /**
   * Not yet documented.
   */
  class Channels<T> {
    /**
     * Creates a new Channel object if none for the channel exists, or returns the existing channel object.
     */
    get(name: string, channelOptions?: ChannelOptions): T;
    /**
     * Unsubscribes all listeners from a given Channel by name.
     */
    release(name: string): void;
  }

  /**
   * A Message represents an individual message that is sent to or received from Ably.
   */
  class Message {
    constructor();
    /**
     * A static factory method to create a Message from a deserialized Message-like object encoded using Ably’s wire protocol.
     */
    static fromEncoded: fromEncoded<Message>;
    /**
     * A static factory method to create an array of Messages from an array of deserialized Message-like object encoded using Ably’s wire protocol.
     */
    static fromEncodedArray: fromEncodedArray<Message>;
    /**
     * The client ID of the publisher of this message.
     */
    clientId: string;
    /**
     * The connection ID of the publisher of this message.
     */
    connectionId: string;
    /**
     * The message payload, if provided.
     */
    data: any;
    /**
     * This will typically be empty as all messages received from Ably are automatically decoded client-side using this value. However, if the message encoding cannot be processed, this attribute will contain the remaining transformations not applied to the data payload.
     */
    encoding: string;
    /**
     * Metadata and/or ancillary payloads, if provided. The only currently valid payload for extras is the push object.
     */
    extras: any;
    /**
     * A Unique ID assigned by Ably to this message.
     */
    id: string;
    /**
     * The event name, if provided.
     */
    name: string;
    /**
     * Timestamp when the message was received by the Ably, as milliseconds since the epoch
     */
    timestamp: number;
  }

  /**
   * Not yet documented.
   */
  interface MessageStatic {
    /**
     * A static factory method to create a Message from a deserialized Message-like object encoded using Ably’s wire protocol.
     */
    fromEncoded: fromEncoded<Message>;
    /**
     * A static factory method to create an array of Messages from an array of deserialized Message-like object encoded using Ably’s wire protocol.
     */
    fromEncodedArray: fromEncodedArray<Message>;
  }

  /**
   * Not yet documented.
   */
  class PresenceMessage {
    constructor();
    /**
     * A static factory method to create a PresenceMessage from a deserialized PresenceMessage-like object encoded using Ably’s wire protocol.
     */
    static fromEncoded: fromEncoded<PresenceMessage>;
    /**
     * A static factory method to create an array of PresenceMessages from an array of deserialized PresenceMessage-like object encoded using Ably’s wire protocol.
     */
    static fromEncodedArray: fromEncodedArray<PresenceMessage>;
    /**
     * The event signified by a PresenceMessage.
     */
    action: PresenceAction;
    /**
     * The client ID of the publisher of this presence update.
     */
    clientId: string;
    /**
     * The connection ID of the publisher of this presence update.
     */
    connectionId: string;
    /**
     * The presence update payload, if provided.
     */
    data: any;
    /**
     * This will typically be empty as all presence updates received from Ably are automatically decoded client-side using this value. However, if the message encoding cannot be processed, this attribute will contain the remaining transformations not applied to the data payload.
     */
    encoding: string;
    /**
     * Unique ID assigned by Ably to this presence update.
     */
    id: string;
    /**
     * Timestamp when the presence update was received by Ably, as milliseconds since the epoch.
     */
    timestamp: number;
  }

  /**
   * Not yet documented.
   */
  interface PresenceMessageStatic {
    /**
     * A static factory method to create a PresenceMessage from a deserialized PresenceMessage-like object encoded using Ably’s wire protocol.
     */
    fromEncoded: fromEncoded<PresenceMessage>;
    /**
     * A static factory method to create an array of PresenceMessages from an array of deserialized PresenceMessage-like object encoded using Ably’s wire protocol.
     */
    fromEncodedArray: fromEncodedArray<PresenceMessage>;
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
     * A binary (ArrayBuffer or WordArray) or base64-encoded String containing the secret key used for encryption and decryption.
     */
    key: CipherKeyParam;
    /**
     * The name of the algorithm in the default system provider, or the lower-cased version of it; eg “aes” or “AES”.
     */
    algorithm?: 'aes';
    /**
     * The key length in bits of the cipher, either 128 or 256.
     */
    keyLength?: number;
    /**
     * The cipher mode.
     */
    mode?: 'cbc';
  };

  /**
   * Not yet documented.
   */
  interface Crypto {
    /**
     * This call obtains a CipherParams object using the values passed in (which must be a subset of CipherParams fields that at a minimum includes a key), filling in any unspecified fields with default values, and checks that the result is a valid and self-consistent.
     *
     * You will rarely need to call this yourself, since the client library will handle it for you if you specify cipher params when initializing a channel or when setting channel options with channel.setOptions().
     */
    generateRandomKey(callback: Types.StandardCallback<CipherKey>): void;
    /**
     * This call obtains a randomly-generated binary key of the specified key length.
     */
    getDefaultParams(params: CipherParamOptions, callback: Types.StandardCallback<CipherParams>): void;
  }

  /**
   * Not yet documented.
   */
  class ConnectionBase extends EventEmitter<connectionEventCallback, ConnectionStateChange, ConnectionEvent> {
    /**
     * When a connection failure occurs this property contains the ErrorInfo.
     */
    errorReason: ErrorInfo;
    /**
     * A unique public identifier String for this connection, used to identify this member in presence events and messages.
     */
    id?: string;
    /**
     * A unique private connection key String used to recover or resume a connection, assigned by Ably. When recovering a connection explicitly, the recoveryKey is used in the recover client options as it contains both the key and the last message serial.
     *
     * This private connection key can also be used by other REST clients to publish on behalf of this client. See the [publishing over REST on behalf of a realtime client documentation](https://ably.com/documentation/rest/channels#publish-on-behalf) for more info.
     */
    key?: string;
    /**
     * The recovery key String can be used by another client to recover this connection’s state in the recover client options property. See [connection state recover options](https://ably.com/documentation/realtime/connection#connection-state-recover-options) for more information.
     */
    recoveryKey: string;
    /**
     * The serial number Integer of the last message to be received on this connection, used automatically by the library when recovering or resuming a connection. When recovering a connection explicitly, the recoveryKey is used in the recover client options as it contains both the key and the last message serial.
     */
    serial: number;
    /**
     * The current state of this Connection. See [Connection states](https://ably.com/documentation/realtime/connection#connection-states) for more information.
     */
    readonly state: ConnectionState;
    /**
     * Causes the connection to close, entering the closing state. Once closed, the library will not attempt to re-establish the connection without an explicit call to `connect`.
     */
    close(): void;
    /**
     * Explicitly calling connect is unnecessary unless the `ClientOptions` attribute `autoConnect` is false. Unless already connected or connecting, this method causes the connection to open, entering the connecting state.
     */
    connect(): void;
  }

  /**
   * Not yet documented.
   */
  class ConnectionCallbacks extends ConnectionBase {
    /**
     * When connected, sends a heartbeat ping to the Ably server and executes the callback with any error and the response time in milliseconds when a heartbeat ping request is echoed from the server. This can be useful for measuring true round-trip latency to the connected Ably server.
     */
    ping(callback?: Types.StandardCallback<number>): void;
    /**
     * Not yet documented.
     */
    whenState(targetState: ConnectionState, callback: connectionEventCallback): void;
  }

  /**
   * Not yet documented.
   */
  class ConnectionPromise extends ConnectionBase {
    /**
     * When connected, sends a heartbeat ping to the Ably server and executes the callback with any error and the response time in milliseconds when a heartbeat ping request is echoed from the server. This can be useful for measuring true round-trip latency to the connected Ably server.
     */
    ping(): Promise<number>;
    /**
     * Not yet documented.
     */
    whenState(targetState: ConnectionState): Promise<ConnectionStateChange>;
  }

  /**
   * A class representing an individual statistic for a specified interval.
   */
  class Stats {
    /**
     * Aggregates inbound and outbound messages.
     */
    all: StatsMessageTypes;
    /**
     * Breakdown of API requests received via the REST API.
     */
    apiRequests: StatsRequestCount;
    /**
     * Breakdown of channels stats.
     */
    channels: StatsResourceCount;
    /**
     * Breakdown of connection stats data for different (TLS vs non-TLS) connection types.
     */
    connections: StatsConnectionTypes;
    /**
     * Breakdown of all inbound messages.
     */
    inbound: StatsMessageTraffic;
    /**
     * The interval that this statistic applies to.
     */
    intervalId: string;
    /**
     * Breakdown of all outbound messages.
     */
    outbound: StatsMessageTraffic;
    /**
     * Messages persisted for later retrieval via the history API.
     */
    persisted: StatsMessageTypes;
    /**
     * Breakdown of Token requests received via the REST API.
     */
    tokenRequests: StatsRequestCount;
  }

  /**
   * A PaginatedResult is a type that represents a page of results for all message and presence history, stats and REST presence requests. The response from a Ably REST API paginated query is accompanied by metadata that indicates the relative queries available to the PaginatedResult object.
   */
  class PaginatedResult<T> {
    /**
     * Contains the current page of results (for example an Array of Message or PresenceMessage objects for a channel history request).
     */
    items: T[];
    /**
     * Returns a new PaginatedResult for the first page of results.
     */
    first(results: paginatedResultCallback<T>): void;
    /**
     * Returns a new PaginatedResult for the first page of results.
     */
    first(): Promise<PaginatedResult<T>>;
    /**
     * Returns a new PaginatedResult loaded with the next page of results. If there are no further pages, then `null` is returned.
     */
    next(results: paginatedResultCallback<T>): void;
    /**
     * Returns a new PaginatedResult loaded with the next page of results. If there are no further pages, then `null` is returned.
     */
    next(): Promise<PaginatedResult<T>>;
    /**
     * Not yet documented.
     */
    current(results: paginatedResultCallback<T>): void;
    /**
     * Not yet documented.
     */
    current(): Promise<PaginatedResult<T>>;
    /**
     * Returns `true` if there are more pages available by calling next and returns `false` if this page is the last page available.
     */
    hasNext(): boolean;
    /**
     * Returns `true` if this page is the last page and returns `false` if there are more pages available by calling next available.
     */
    isLast(): boolean;
  }

  /**
   * Not yet documented.
   */
  class HttpPaginatedResponse<T = any> extends PaginatedResult<T> {
    /**
     * The HTTP status code of the response.
     */
    statusCode: number;
    /**
     * Whether that HTTP status code indicates success (equivalent to 200 <= statusCode < 300).
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
     * The response’s headers.
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
     * The returned DeviceRegistrations object provides functionality for registering, updating, listing and de-registering push devices.
     */
    deviceRegistrations: PushDeviceRegistrationsCallbacks;
    /**
     * The returned PushChannelSubscriptions object provides functionality for subscribing, listing and unsubscribing individual devices or groups of identified devices to push notifications published on channels.
     */
    channelSubscriptions: PushChannelSubscriptionsCallbacks;
    /**
     * Publishes a push notification directly to a device or group of devices sharing a client identifier. See the [push notification direct publishing documentation](https://ably.com/documentation/general/push/publish#direct-publishing) for more information.
     */
    publish(recipient: any, payload: any, callback?: errorCallback): void;
  }

  /**
   * Not yet documented.
   */
  class PushAdminPromise {
    /**
     * The returned DeviceRegistrations object provides functionality for registering, updating, listing and de-registering push devices.
     */
    deviceRegistrations: PushDeviceRegistrationsPromise;
    /**
     * The returned PushChannelSubscriptions object provides functionality for subscribing, listing and unsubscribing individual devices or groups of identified devices to push notifications published on channels.
     */
    channelSubscriptions: PushChannelSubscriptionsPromise;
    /**
     * Publishes a push notification directly to a device or group of devices sharing a client identifier. See the [push notification direct publishing documentation](https://ably.com/documentation/general/push/publish#direct-publishing) for more information.
     */
    publish(recipient: any, payload: any): Promise<void>;
  }

  /**
   * Not yet documented.
   */
  class PushDeviceRegistrationsCallbacks {
    /**
     * Register a new DeviceDetails object, or update an existing DeviceDetails object with the Ably service. Requires push-admin permission or push-subscribe permission together with device authentication matching the requested deviceId.
     */
    save(deviceDetails: DeviceDetails, callback?: Types.StandardCallback<DeviceDetails>): void;
    /**
     * Obtain the DeviceDetails for a device registered for receiving push registrations matching the deviceId argument, or the id attribute of the provided DeviceDetails object. Requires push-admin permission or push-subscribe permission together with device authentication matching the requested deviceId.
     */
    get(deviceIdOrDetails: DeviceDetails | string, callback: Types.StandardCallback<DeviceDetails>): void;
    /**
     * Retrieve all devices matching the params filter as a paginated list of DeviceDetails objects. Requires push-admin permission.
     */
    list(params: DeviceRegistrationParams, callback: paginatedResultCallback<DeviceDetails>): void;
    /**
     * Remove a device registered for receiving push registrations that matches the deviceId argument, or the id attribute of the provided DeviceDetails object. Requires push-admin permission or push-subscribe permission together with device authentication matching the requested deviceId.
     */
    remove(deviceIdOrDetails: DeviceDetails | string, callback?: errorCallback): void;
    /**
     * Delete all devices matching the params filter. Requires push-admin permission.
     */
    removeWhere(params: DeviceRegistrationParams, callback?: errorCallback): void;
  }

  /**
   * Not yet documented.
   */
  class PushDeviceRegistrationsPromise {
    /**
     * Register a new DeviceDetails object, or update an existing DeviceDetails object with the Ably service. Requires push-admin permission or push-subscribe permission together with device authentication matching the requested deviceId.
     */
    save(deviceDetails: DeviceDetails): Promise<DeviceDetails>;
    /**
     * Obtain the DeviceDetails for a device registered for receiving push registrations matching the deviceId argument, or the id attribute of the provided DeviceDetails object. Requires push-admin permission or push-subscribe permission together with device authentication matching the requested deviceId.
     */
    get(deviceIdOrDetails: DeviceDetails | string): Promise<DeviceDetails>;
    /**
     * Retrieve all devices matching the params filter as a paginated list of DeviceDetails objects. Requires push-admin permission.
     */
    list(params: DeviceRegistrationParams): Promise<PaginatedResult<DeviceDetails>>;
    /**
     * Remove a device registered for receiving push registrations that matches the deviceId argument, or the id attribute of the provided DeviceDetails object. Requires push-admin permission or push-subscribe permission together with device authentication matching the requested deviceId.
     */
    remove(deviceIdOrDetails: DeviceDetails | string): Promise<void>;
    /**
     * Delete all devices matching the params filter. Requires push-admin permission.
     */
    removeWhere(params: DeviceRegistrationParams): Promise<void>;
  }

  /**
   * Not yet documented.
   */
  class PushChannelSubscriptionsCallbacks {
    /**
     * Subscribe a device or group of devices sharing a client identifier for push notifications published on a channel.
     */
    save(subscription: PushChannelSubscription, callback?: Types.StandardCallback<PushChannelSubscription>): void;
    /**
     * Retrieve all push channel subscriptions that match the provided params filter as a paginated list of PushChannelSubscription objects. Each PushChannelSubscription represents a device or set of devices sharing the same client identifier registered to a channel to receive push notifications.
     */
    list(params: PushChannelSubscriptionParams, callback: paginatedResultCallback<PushChannelSubscription>): void;
    /**
     * Retrieve a list of channels with at least one subscribed device as a paginated list of channel name String objects. Requires push-admin permission.
     */
    listChannels(params: PushChannelsParams, callback: paginatedResultCallback<string>): void;
    /**
     * Unsubscribe a device or group of devices sharing a client identifier from push notifications on a channel. Requires push-admin permission or, in the case of a subscription associated with a given deviceId, push-subscribe permission together with device authentication matching that deviceId.
     */
    remove(subscription: PushChannelSubscription, callback?: errorCallback): void;
    /**
     * Delete all push channel subscriptions matching the params filter. Requires push-admin permission.
     */
    removeWhere(params: PushChannelSubscriptionParams, callback?: errorCallback): void;
  }

  /**
   * Not yet documented.
   */
  class PushChannelSubscriptionsPromise {
    /**
     * Subscribe a device or group of devices sharing a client identifier for push notifications published on a channel.
     */
    save(subscription: PushChannelSubscription): Promise<PushChannelSubscription>;
    /**
     * Retrieve all push channel subscriptions that match the provided params filter as a paginated list of PushChannelSubscription objects. Each PushChannelSubscription represents a device or set of devices sharing the same client identifier registered to a channel to receive push notifications.
     */
    list(params: PushChannelSubscriptionParams): Promise<PaginatedResult<PushChannelSubscription>>;
    /**
     * Retrieve a list of channels with at least one subscribed device as a paginated list of channel name String objects. Requires push-admin permission.
     */
    listChannels(params: PushChannelsParams): Promise<PaginatedResult<string>>;
    /**
     * Unsubscribe a device or group of devices sharing a client identifier from push notifications on a channel. Requires push-admin permission or, in the case of a subscription associated with a given deviceId, push-subscribe permission together with device authentication matching that deviceId.
     */
    remove(subscription: PushChannelSubscription): Promise<void>;
    /**
     * Delete all push channel subscriptions matching the params filter. Requires push-admin permission.
     */
    removeWhere(params: PushChannelSubscriptionParams): Promise<void>;
  }
}

/**
 * The Ably REST client offers a simple stateless API to interact directly with Ably’s REST API.
 *
 * The REST library is typically used server-side to issue tokens, publish messages, and retrieve message history. If you are building a client-side application, you may want to consider using our stateful Ably Realtime client libraries.
 */
export declare class Rest extends Types.RestCallbacks {}

/**
 * The Ably Realtime client establishes and maintains a persistent connection to Ably and provides methods to publish and subscribe to messages over a low latency realtime connection.
 *
 *
 *
 * The Realtime client extends the REST client and as such provides the functionality available in the REST client in addition to Realtime-specific features.
 *
 *
 *
 * @augments Rest
 */
export declare class Realtime extends Types.RealtimeCallbacks {}
