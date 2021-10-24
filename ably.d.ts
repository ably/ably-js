// Type definitions for Ably Realtime and Rest client library 1.2
// Project: https://www.ably.com/
// Definitions by: Ably <https://github.com/ably/>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

import { AgentOptions } from "http";

declare namespace Types {
	namespace ChannelState {
		type INITIALIZED = "initialized";
		type ATTACHING = "attaching";
		type ATTACHED = "attached";
		type DETACHING = "detaching";
		type DETACHED = "detached";
		type SUSPENDED = "suspended";
		type FAILED = "failed";
	}
	type ChannelState = ChannelState.FAILED | ChannelState.INITIALIZED | ChannelState.SUSPENDED | ChannelState.ATTACHED | ChannelState.ATTACHING | ChannelState.DETACHED | ChannelState.DETACHING;

	namespace ChannelEvent {
		type INITIALIZED = "initialized";
		type ATTACHING = "attaching";
		type ATTACHED = "attached";
		type DETACHING = "detaching";
		type DETACHED = "detached";
		type SUSPENDED = "suspended";
		type FAILED = "failed";
		type UPDATE = "update";
	}
	type ChannelEvent = ChannelEvent.FAILED | ChannelEvent.INITIALIZED | ChannelEvent.SUSPENDED | ChannelEvent.ATTACHED | ChannelEvent.ATTACHING | ChannelEvent.DETACHED | ChannelEvent.DETACHING | ChannelEvent.UPDATE;

	namespace ConnectionState {
		type INITIALIZED = "initialized";
		type CONNECTING = "connecting";
		type CONNECTED = "connected";
		type DISCONNECTED = "disconnected";
		type SUSPENDED = "suspended";
		type CLOSING = "closing";
		type CLOSED = "closed";
		type FAILED = "failed";
	}
	type ConnectionState = ConnectionState.INITIALIZED | ConnectionState.CONNECTED | ConnectionState.CONNECTING | ConnectionState.DISCONNECTED | ConnectionState.SUSPENDED | ConnectionState.CLOSED | ConnectionState.CLOSING | ConnectionState.FAILED;

	namespace ConnectionEvent {
		type INITIALIZED = "initialized";
		type CONNECTING = "connecting";
		type CONNECTED = "connected";
		type DISCONNECTED = "disconnected";
		type SUSPENDED = "suspended";
		type CLOSING = "closing";
		type CLOSED = "closed";
		type FAILED = "failed";
		type UPDATE = "update";
	}
	type ConnectionEvent = ConnectionEvent.INITIALIZED | ConnectionEvent.CONNECTED | ConnectionEvent.CONNECTING | ConnectionEvent.DISCONNECTED | ConnectionEvent.SUSPENDED | ConnectionEvent.CLOSED | ConnectionEvent.CLOSING | ConnectionEvent.FAILED | ConnectionEvent.UPDATE;

	namespace PresenceAction {
		type ABSENT = "absent";
		type PRESENT = "present";
		type ENTER = "enter";
		type LEAVE = "leave";
		type UPDATE = "update";
	}
	type PresenceAction = PresenceAction.ABSENT | PresenceAction.PRESENT | PresenceAction.ENTER | PresenceAction.LEAVE | PresenceAction.UPDATE;

	namespace StatsIntervalGranularity {
		type MINUTE = "minute";
		type HOUR = "hour";
		type DAY = "day";
		type MONTH = "month";
	}
	type StatsIntervalGranularity = StatsIntervalGranularity.MINUTE | StatsIntervalGranularity.HOUR | StatsIntervalGranularity.DAY | StatsIntervalGranularity.MONTH;

	namespace HTTPMethods {
		type POST = "POST";
		type GET = "GET";
	}
	type HTTPMethods = HTTPMethods.GET | HTTPMethods.POST;

	type Transport = 'web_socket' | 'xhr_streaming' | 'xhr_polling' | 'jsonp' | 'comet';

	// Interfaces
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
		restAgentOptions?: AgentOptions;

		/**
		 * This option allows a connection to inherit the state of a previous connection that may have existed under a different instance of the Realtime library. This might typically be used by clients of the browser library to ensure connection state can be preserved when the user refreshes the page. A recovery key string can be explicitly provided, or alternatively if a callback function is provided, the client library will automatically persist the recovery key between page reloads and call the callback when the connection is recoverable. The callback is then responsible for confirming whether the connection should be recovered or not. See [connection state recovery](https://ably.com/documentation/realtime/connection/#connection-state-recovery) for further information.
		 */
		recover?: string | ((lastConnectionDetails: {
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
		}, callback: (shouldRecover: boolean) => void) => void);

		/**
		 * Use a non-secure connection connection. By default, a TLS connection is used to connect to Ably
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
		 * When true, the client library will automatically send a close request to Ably whenever the `window beforeunload` event fires. By enabling this option, the close request sent to Ably ensures the connection state will not be retained and all channels associated with the channel will be detached. This is commonly used by developers who want presence leave events to fire immediately i.e. if a user navigates to another page or closes their browser, then enabling this option will result in the presence member leaving immediately. Without this option or an explicit call to the `close` method of the `Connection` object, Ably expects that the abruptly disconnected connection could later be recovered and therefore does not immediately remove the user from presence. Instead, to avoid “twitchy” presence behavior an abruptly disconnected client is removed from channels in which they are present after 15 seconds, and the connection state is retained for two minutes. Defaults to true.
		 */
		closeOnUnload?: boolean;

		/**
		 * When true, enables idempotent publishing by assigning a unique message ID client-side, allowing the Ably servers to discard automatic publish retries following a failure such as a network fault. We recommend you enable this by default. In version 1.2 onwards, idempotent publishing for retries will be enabled by default.
		 */
		idempotentRestPublishing?: boolean;

		/**
		 * Can be used to pass in arbitrary connection parameters.
		 */
		transportParams?: {[k: string]: string};

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
	}

	interface AuthOptions {
		/**
		 * A function which is called when a new token is required. The role of the callback is to obtain a fresh token, one of: an Ably Token string (in plain text format); a signed `TokenRequest` ; a `TokenDetails` (in JSON format); an [Ably JWT](https://ably.com/documentation/core-features/authentication#ably-jwt). See [an authentication callback example](https://jsbin.ably.com/azazav/1/edit?javascript,live) or [our authentication documentation](https://ably.com/documentation/rest/authentication) for details of the Ably TokenRequest format and associated API calls.
		 */
		authCallback?: (data: TokenParams, callback: (error: ErrorInfo | string, tokenRequestOrDetails: TokenDetails | TokenRequest | string) => void) => void;

		/**
		 * A set of key value pair headers to be added to any request made to the `authUrl`. Useful when an application requires these to be added to validate the request or implement the response. If the `authHeaders` object contains an `authorization` key, then `withCredentials` will be set on the xhr request.
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
		 **/
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
		clientId?: string;
	}

	type capabilityOp = "publish" | "subscribe" | "presence" | "history" | "stats" | "channel-metadata" | "push-subscribe" | "push-admin";
	type CapabilityOp = capabilityOp;

	interface TokenParams {
		capability?: { [key: string]: capabilityOp[]; } | string;
		clientId?: string;
		nonce?: string;
		timestamp?: number;
		ttl?: number;
	}

	interface CipherParams {
		algorithm: string;
		key: CipherKey;
		keyLength: number;
		mode: string;
	}

	interface ErrorInfo {
		code: number;
		message: string;
		statusCode: number;
	}

	interface StatsMessageCount {
		count: number;
		data: number;
	}

	interface StatsMessageTypes {
		all: StatsMessageCount;
		messages: StatsMessageCount;
		presence: StatsMessageCount;
	}

	interface StatsRequestCount {
		failed: number;
		refused: number;
		succeeded: number;
	}

	interface StatsResourceCount {
		mean: number;
		min: number;
		opened: number;
		peak: number;
		refused: number;
	}

	interface StatsConnectionTypes {
		all: StatsResourceCount;
		plain: StatsResourceCount;
		tls: StatsResourceCount;
	}

	interface StatsMessageTraffic {
		all: StatsMessageTypes;
		realtime: StatsMessageTypes;
		rest: StatsMessageTypes;
		webhook: StatsMessageTypes;
	}

	interface TokenDetails {
		capability: string;
		clientId?: string;
		expires: number;
		issued: number;
		token: string;
	}

	interface TokenRequest {
		capability: string;
		clientId?: string;
		keyName: string;
		mac: string;
		nonce: string;
		timestamp: number;
		ttl?: number;
	}

	type ChannelParams = { [key: string]: string };

	type ChannelMode = 'PUBLISH' | 'SUBSCRIBE' | 'PRESENCE' | 'PRESENCE_SUBSCRIBE';
	type ChannelModes = Array<ChannelMode>;

	interface ChannelOptions {
		cipher?: CipherParamOptions | CipherParams;
		params?: ChannelParams;
		modes?: ChannelModes;
	}

	interface RestHistoryParams {
		start?: number;
		end?: number;
		direction?: string;
		limit?: number;
	}

	interface RestPresenceParams {
		limit?: number;
		clientId?: string;
		connectionId?: string;
	}

	interface RealtimePresenceParams {
		waitForSync?: boolean;
		clientId?: string;
		connectionId?: string;
	}

	interface RealtimeHistoryParams {
		start?: number;
		end?: number;
		direction?: string;
		limit?: number;
		untilAttach?: boolean;
	}

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

	interface ChannelStateChange {
		current: ChannelState;
		previous: ChannelState;
		reason?: ErrorInfo;
		resumed: boolean;
	}

	interface ConnectionStateChange {
		current: ConnectionState;
		previous: ConnectionState;
		reason?: ErrorInfo;
		retryIn?: number;
	}

	interface DeviceDetails {
		id: string;
		clientId?: string;
		platform: "android" | "ios" | "browser";
		formFactor: "phone" | "tablet" | "desktop" | "tv" | "watch" | "car" | "embedded" | "other";
		metadata?: any;
		deviceSecret?: string;
		push: DevicePushDetails;
	}

	interface PushChannelSubscription {
		channel: string;
		deviceId?: string;
		clientId?: string;
	}

	type DevicePushState = "ACTIVE" | "FAILING" | "FAILED";

	interface DevicePushDetails {
		recipient: any;
		state?: DevicePushState;
		error?: ErrorInfo;
	}

	interface DeviceRegistrationParams {
		clientId?: string;
		deviceId?: string;
		limit?: number;
		state?: DevicePushState;
	}

	interface PushChannelSubscriptionParams {
		channel?: string;
		clientId?: string;
		deviceId?: string;
		limit?: number;
	}

	interface PushChannelsParams {
		limit?: number;
	}

	// Common Listeners
	type StandardCallback<T> = (err: ErrorInfo | null, result?: T) => void;
	type paginatedResultCallback<T> = StandardCallback<PaginatedResult<T>>;
	type messageCallback<T> = (message: T) => void;
	type errorCallback = (error?: ErrorInfo | null) => void;
	type channelEventCallback = (changeStateChange: ChannelStateChange) => void;
	type connectionEventCallback = (connectionStateChange: ConnectionStateChange) => void;
	type timeCallback = StandardCallback<number>;
	type realtimePresenceGetCallback = StandardCallback<PresenceMessage[]>;
	type tokenDetailsCallback = StandardCallback<TokenDetails>;
	type tokenRequestCallback = StandardCallback<TokenRequest>;
	type fromEncoded<T> = (JsonObject: any, channelOptions?: ChannelOptions) => T;
	type fromEncodedArray<T> = (JsonArray: any[], channelOptions?: ChannelOptions) => T[];

	// Internal Classes

	// To allow a uniform (callback) interface between on and once even in the
	// promisified version of the lib, but still allow once to be used in a way
	// that returns a Promise if desired, EventEmitter uses method overloading to
	// present both methods
	class EventEmitter<CallbackType, ResultType, EventType, StateType> {
		on(eventOrCallback: EventType | EventType[] | CallbackType, callback?: CallbackType): void;
		once(event: EventType, callback: CallbackType): void;
		once(callback: CallbackType): void;
		once(event?: EventType): Promise<ResultType>;
		off(eventOrCallback?: EventType | CallbackType, callback?: CallbackType): void;
		listeners(eventName?: EventType): CallbackType[] | null;
	}

	// Classes
	class RestBase {
		constructor(options: Types.ClientOptions | string);
		static Crypto: Types.Crypto;
		static Message: Types.MessageStatic;
		static PresenceMessage: Types.PresenceMessageStatic;
	}

	class RestCallbacks extends RestBase {
		static Promise: typeof Types.RestPromise;
		static Callbacks: typeof Types.RestCallbacks;
		auth: Types.AuthCallbacks;
		channels: Types.Channels<Types.ChannelCallbacks>;
		request: <T = any>(method: string, path: string, params?: any, body?: any[] | any, headers?: any, callback?: Types.StandardCallback<Types.HttpPaginatedResponse<T>>) => void;
		stats: (paramsOrCallback?: Types.paginatedResultCallback<Types.Stats> | any, callback?: Types.paginatedResultCallback<Types.Stats>) => void;
		time: (callback?: Types.timeCallback) => void;
		push: Types.PushCallbacks;
	}

	class RestPromise extends RestBase {
		static Promise: typeof Types.RestPromise;
		static Callbacks: typeof Types.RestCallbacks;
		auth: Types.AuthPromise;
		channels: Types.Channels<Types.ChannelPromise>;
		request: <T = any>(method: string, path: string, params?: any, body?: any[] | any, headers?: any) => Promise<Types.HttpPaginatedResponse<T>>;
		stats: (params?: any) => Promise<Types.PaginatedResult<Types.Stats>>;
		time: () => Promise<number>;
		push: Types.PushPromise;
	}

	class RealtimeBase extends RestBase {
		static Promise: typeof Types.RealtimePromise;
		static Callbacks: typeof Types.RealtimeCallbacks;
		clientId: string;
		close: () => void;
		connect: () => void;
	}

	class RealtimeCallbacks extends RealtimeBase {
		auth: Types.AuthCallbacks;
		channels: Types.Channels<Types.RealtimeChannelCallbacks>;
		connection: Types.ConnectionCallbacks;
		request: <T = any>(method: string, path: string, params?: any, body?: any[] | any, headers?: any, callback?: Types.StandardCallback<Types.HttpPaginatedResponse<T>>) => void;
		stats: (paramsOrCallback?: Types.paginatedResultCallback<Types.Stats> | any, callback?: Types.paginatedResultCallback<Types.Stats>) => void;
		time: (callback?: Types.timeCallback) => void;
		push: Types.PushCallbacks;
	}

	class RealtimePromise extends RealtimeBase {
		auth: Types.AuthPromise;
		channels: Types.Channels<Types.RealtimeChannelPromise>;
		connection: Types.ConnectionPromise;
		request: <T = any>(method: string, path: string, params?: any, body?: any[] | any, headers?: any) => Promise<Types.HttpPaginatedResponse<T>>;
		stats: (params?: any) => Promise<Types.PaginatedResult<Types.Stats>>;
		time: () => Promise<number>;
		push: Types.PushPromise;
	}

	class AuthBase {
		clientId: string;
	}

	class AuthCallbacks extends AuthBase {
		authorize: (tokenParams?: TokenParams | tokenDetailsCallback, authOptions?: AuthOptions | tokenDetailsCallback, callback?: tokenDetailsCallback) => void;
		createTokenRequest: (tokenParams?: TokenParams | tokenRequestCallback, authOptions?: AuthOptions | tokenRequestCallback, callback?: tokenRequestCallback) => void;
		requestToken: (TokenParams?: TokenParams | tokenDetailsCallback, authOptions?: AuthOptions | tokenDetailsCallback, callback?: tokenDetailsCallback) => void;
	}

	class AuthPromise extends AuthBase {
		authorize: (tokenParams?: TokenParams, authOptions?: AuthOptions) => Promise<TokenDetails>;
		createTokenRequest: (tokenParams?: TokenParams, authOptions?: AuthOptions) => Promise<TokenRequest>;
		requestToken: (TokenParams?: TokenParams, authOptions?: AuthOptions) => Promise<TokenDetails>;
	}

	class PresenceCallbacks {
		get: (paramsOrCallback?: RestPresenceParams | paginatedResultCallback<PresenceMessage>, callback?: paginatedResultCallback<PresenceMessage>) => void;
		history: (paramsOrCallback: RestHistoryParams | paginatedResultCallback<PresenceMessage>, callback?: paginatedResultCallback<PresenceMessage>) => void;
	}

	class PresencePromise {
		get: (params?: RestPresenceParams) => Promise<PaginatedResult<PresenceMessage>>;
		history: (params?: RestHistoryParams) => Promise<PaginatedResult<PresenceMessage>>;
	}

	class RealtimePresenceBase {
		syncComplete: boolean;
		unsubscribe: (presenceOrListener?: PresenceAction | Array<PresenceAction> | messageCallback<PresenceMessage>, listener?: messageCallback<PresenceMessage>) => void;
	}

	class RealtimePresenceCallbacks extends RealtimePresenceBase {
		get: (paramsOrCallback?: realtimePresenceGetCallback | RealtimePresenceParams, callback?: realtimePresenceGetCallback) => void;
		history: (paramsOrCallback?: RealtimeHistoryParams | paginatedResultCallback<PresenceMessage>, callback?: paginatedResultCallback<PresenceMessage>) => void;
		subscribe: (presenceOrListener: PresenceAction | messageCallback<PresenceMessage> | Array<PresenceAction>, listener?: messageCallback<PresenceMessage>, callbackWhenAttached?: errorCallback) => void;
		enter: (data?: errorCallback | any, callback?: errorCallback) => void;
		update: (data?: errorCallback | any, callback?: errorCallback) => void;
		leave: (data?: errorCallback | any, callback?: errorCallback) => void;
		enterClient: (clientId: string, data?: errorCallback | any, callback?: errorCallback) => void;
		updateClient: (clientId: string, data?: errorCallback | any, callback?: errorCallback) => void;
		leaveClient: (clientId: string, data?: errorCallback | any, callback?: errorCallback) => void;
	}

	class RealtimePresencePromise extends RealtimePresenceBase {
		get: (params?: RealtimePresenceParams) => Promise<PresenceMessage[]>;
		history: (params?: RealtimeHistoryParams) => Promise<PaginatedResult<PresenceMessage>>;
		subscribe: (action?: PresenceAction | messageCallback<PresenceMessage> | Array<PresenceAction>, listener?: messageCallback<PresenceMessage>) => Promise<void>;
		enter: (data?: any) => Promise<void>;
		update: (data?: any) => Promise<void>;
		leave: (data?: any) => Promise<void>;
		enterClient: (clientId: string, data?: any) => Promise<void>;
		updateClient: (clientId: string, data?: any) => Promise<void>;
		leaveClient: (clientId: string, data?: any) => Promise<void>;
	}

	class ChannelBase {
		name: string;
	}

	class ChannelCallbacks extends ChannelBase {
		presence: PresenceCallbacks;
		history: (paramsOrCallback?: RestHistoryParams | paginatedResultCallback<Message>, callback?: paginatedResultCallback<Message>) => void;
                publish(messages: any, callback?: errorCallback): void;
                publish(name: string, messages: any, callback?: errorCallback): void;
                publish(name: string, messages: any, options?: PublishOptions, callback?: errorCallback): void;
	}

	class ChannelPromise extends ChannelBase {
		presence: PresencePromise;
		history: (params?: RestHistoryParams) => Promise<PaginatedResult<Message>>;
		publish(messages: any, options?: PublishOptions): Promise<void>;
		publish(name: string, messages: any, options?: PublishOptions): Promise<void>;
	}

	class RealtimeChannelBase extends EventEmitter<channelEventCallback, ChannelStateChange, ChannelEvent, ChannelState> {
		readonly name: string;
		errorReason: ErrorInfo;
		readonly state: ChannelState;
		params: ChannelParams;
		modes: ChannelModes;
		unsubscribe: (eventOrListener?: string | Array<string> | messageCallback<Message>, listener?: messageCallback<Message>) => void;
	}

    type PublishOptions = {
        quickAck?: boolean;
    }

	class RealtimeChannelCallbacks extends RealtimeChannelBase {
		presence: RealtimePresenceCallbacks;
		attach: (callback?: errorCallback) => void;
		detach: (callback?: errorCallback) => void;
		history: (paramsOrCallback?: RealtimeHistoryParams | paginatedResultCallback<Message>, callback?: paginatedResultCallback<Message>) => void;
		setOptions: (options: ChannelOptions, callback?: errorCallback) => void;
		subscribe: (eventOrCallback: messageCallback<Message> | string | Array<string>, listener?: messageCallback<Message>, callbackWhenAttached?: errorCallback) => void;
		publish(messages: any, callback?: errorCallback): void;
		publish(name: string, messages: any, callback?: errorCallback): void;
		publish(name: string, messages: any, options?: PublishOptions, callback?: errorCallback): void;
		whenState: (targetState: ChannelState, callback: channelEventCallback) => void;
	}

	class RealtimeChannelPromise extends RealtimeChannelBase {
		presence: RealtimePresencePromise;
		attach: () => Promise<void>;
		detach: () => Promise<void>;
		history: (params?: RealtimeHistoryParams) => Promise<PaginatedResult<Message>>;
		setOptions: (options: ChannelOptions) => Promise<void>;
		subscribe: (eventOrCallback: messageCallback<Message> | string | Array<string>, listener?: messageCallback<Message>) => Promise<void>;
		publish(messages: any, options?: PublishOptions): Promise<void>;
		publish(name: string, messages: any, options?: PublishOptions): Promise<void>;
		whenState: (targetState: ChannelState) => Promise<ChannelStateChange>;
	}

	class Channels<T> {
		get: (name: string, channelOptions?: ChannelOptions) => T;
		release: (name: string) => void;
	}

	class Message {
		constructor();
		static fromEncoded: fromEncoded<Message>;
		static fromEncodedArray: fromEncodedArray<Message>;
		clientId: string;
		connectionId: string;
		data: any;
		encoding: string;
		extras: any;
		id: string;
		name: string;
		timestamp: number;
	}

	interface MessageStatic {
		fromEncoded: fromEncoded<Message>;
		fromEncodedArray: fromEncodedArray<Message>;
	}

	class PresenceMessage {
		constructor();
		static fromEncoded: fromEncoded<PresenceMessage>;
		static fromEncodedArray: fromEncodedArray<PresenceMessage>;
		action: PresenceAction;
		clientId: string;
		connectionId: string;
		data: any;
		encoding: string;
		id: string;
		timestamp: number;
	}

	interface PresenceMessageStatic {
		fromEncoded: fromEncoded<PresenceMessage>;
		fromEncodedArray: fromEncodedArray<PresenceMessage>;
	}

	type CipherKeyParam = ArrayBuffer | Uint8Array | string; // if string must be base64-encoded
	type CipherKey = unknown; // WordArray on browsers, Buffer on node, using unknown as
	// user should not be interacting with it - output of getDefaultParams should be used opaquely

	type CipherParamOptions = {
		key: CipherKeyParam;
		algorithm?: 'aes';
		keyLength?: number;
		mode?: 'cbc';
	}

	interface Crypto {
		generateRandomKey: (callback: Types.StandardCallback<CipherKey>) => void;
		getDefaultParams: (params: CipherParamOptions, callback: Types.StandardCallback<CipherParams>) => void;
	}

	class ConnectionBase extends EventEmitter<connectionEventCallback, ConnectionStateChange, ConnectionEvent, ConnectionState> {
		errorReason: ErrorInfo;
		id: string;
		key: string;
		recoveryKey: string;
		serial: number;
		readonly state: ConnectionState;
		close: () => void;
		connect: () => void;
	}

	class ConnectionCallbacks extends ConnectionBase {
		ping: (callback?: Types.StandardCallback<number>) => void;
		whenState: (targetState: ConnectionState, callback: connectionEventCallback) => void;
	}

	class ConnectionPromise extends ConnectionBase {
		ping: () => Promise<number>;
		whenState: (targetState: ConnectionState) => Promise<ConnectionStateChange>;
	}

	class Stats {
		all: StatsMessageTypes;
		apiRequests: StatsRequestCount;
		channels: StatsResourceCount;
		connections: StatsConnectionTypes;
		inbound: StatsMessageTraffic;
		intervalId: string;
		outbound: StatsMessageTraffic;
		persisted: StatsMessageTypes;
		tokenRequests: StatsRequestCount;
	}

	class PaginatedResult<T> {
		items: T[];
		first(results: paginatedResultCallback<T>): void;
		first(): Promise<PaginatedResult<T>>;
		next(results: paginatedResultCallback<T>): void;
		next(): Promise<PaginatedResult<T>>;
		current(results: paginatedResultCallback<T>): void;
		current(): Promise<PaginatedResult<T>>;
		hasNext: () => boolean;
		isLast: () => boolean;
	}

	class HttpPaginatedResponse<T = any> extends PaginatedResult<T> {
		statusCode: number;
		success: boolean;
		errorCode: number;
		errorMessage: string;
		headers: any;
	}

	class PushCallbacks {
		admin: PushAdminCallbacks;
	}

	class PushPromise {
		admin: PushAdminPromise;
	}

	class PushAdminCallbacks {
		deviceRegistrations: PushDeviceRegistrationsCallbacks;
		channelSubscriptions: PushChannelSubscriptionsCallbacks;
		publish: (recipient: any, payload: any, callback?: errorCallback) => void;
	}

	class PushAdminPromise {
		deviceRegistrations: PushDeviceRegistrationsPromise;
		channelSubscriptions: PushChannelSubscriptionsPromise;
		publish: (recipient: any, payload: any) => Promise<void>;
	}

	class PushDeviceRegistrationsCallbacks {
		save: (deviceDetails: DeviceDetails, callback?: Types.StandardCallback<DeviceDetails>) => void;
		get: (deviceIdOrDetails: DeviceDetails | string, callback: Types.StandardCallback<DeviceDetails>) => void;
		list: (params: DeviceRegistrationParams, callback: paginatedResultCallback<DeviceDetails>) => void;
		remove: (deviceIdOrDetails: DeviceDetails | string, callback?: errorCallback) => void;
		removeWhere: (params: DeviceRegistrationParams, callback?: errorCallback) => void;
	}

	class PushDeviceRegistrationsPromise {
		save: (deviceDetails: DeviceDetails) => Promise<DeviceDetails>;
		get: (deviceIdOrDetails: DeviceDetails | string) => Promise<DeviceDetails>;
		list: (params: DeviceRegistrationParams) => Promise<PaginatedResult<DeviceDetails>>;
		remove: (deviceIdOrDetails: DeviceDetails | string) => Promise<void>;
		removeWhere: (params: DeviceRegistrationParams) => Promise<void>;
	}

	class PushChannelSubscriptionsCallbacks {
		save: (subscription: PushChannelSubscription, callback?: Types.StandardCallback<PushChannelSubscription>) => void;
		list: (params: PushChannelSubscriptionParams, callback: paginatedResultCallback<PushChannelSubscription>) => void;
		listChannels: (params: PushChannelsParams, callback: paginatedResultCallback<string>) => void;
		remove: (subscription: PushChannelSubscription, callback?: errorCallback) => void;
		removeWhere: (params: PushChannelSubscriptionParams, callback?: errorCallback) => void;
	}

	class PushChannelSubscriptionsPromise {
		save: (subscription: PushChannelSubscription) => Promise<PushChannelSubscription>;
		list: (params: PushChannelSubscriptionParams) => Promise<PaginatedResult<PushChannelSubscription>>;
		listChannels: (params: PushChannelsParams) => Promise<PaginatedResult<string>>;
		remove: (subscription: PushChannelSubscription) => Promise<void>;
		removeWhere: (params: PushChannelSubscriptionParams) => Promise<void>;
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
	* The Realtime client extends the REST client and as such provides the functionality available in the REST client in addition to Realtime-specific features.
	* 
	* @extends Rest
	*/
 export declare class Realtime extends Types.RealtimeCallbacks {}
 