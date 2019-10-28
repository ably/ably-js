// Type definitions for Ably Realtime and Rest client library 1.0
// Project: https://www.ably.io/
// Definitions by: Ably <https://github.com/ably/>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

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
		 * When true will automatically connect to Ably when library is instanced. This is true by default
		 */
		autoConnect?: boolean;

		defaultTokenParams?: TokenParams;

		/**
		 * When true, messages published on channels by this client will be echoed back to this client.
		 * This is true by default
		 */
		echoMessages?: boolean;

		/**
		 * Use this only if you have been provided a dedicated environment by Ably
		 */
		environment?: string;

		/**
		 * Logger configuration
		 */
		log?: LogInfo;
		port?: number;

		/**
		 * When true, messages will be queued whilst the connection is disconnected. True by default.
		 */
		queueMessages?: boolean;

		restHost?: string;
		realtimeHost?: string;
		fallbackHosts?: string[];
		fallbackHostsUseDefault?: boolean;

		/**
		 * Can be used to explicitly recover a connection.
		 * See https://www.ably.io/documentation/realtime/connection#connection-state-recovery
		 */
		recover?: standardCallback | string;

		/**
		 * Use a non-secure connection connection. By default, a TLS connection is used to connect to Ably
		 */
		tls?: boolean;
		tlsPort?: number;

		/**
		 * When true, the more efficient MsgPack binary encoding is used.
		 * When false, JSON text encoding is used.
		 */
		useBinaryProtocol?: boolean;

		disconnectedRetryTimeout?: number;
		suspendedRetryTimeout?: number;
		closeOnUnload?: boolean;
		idempotentRestPublishing?: boolean;
		transportParams?: {[k: string]: string};
		transports?: Transport[];
	}

	interface AuthOptions {
		/**
		 * A function which is called when a new token is required.
		 * The role of the callback is to either generate a signed TokenRequest which may then be submitted automatically
		 * by the library to the Ably REST API requestToken; or to provide a valid token in as a TokenDetails object.
		 **/
		authCallback?: (data: TokenParams, callback: (error: ErrorInfo | string, tokenRequestOrDetails: TokenDetails | TokenRequest | string) => void) => void;
		authHeaders?: { [index: string]: string };
		authMethod?: HTTPMethods;
		authParams?: { [index: string]: string };

		/**
		 * A URL that the library may use to obtain a token string (in plain text format), or a signed TokenRequest or TokenDetails (in JSON format).
		 **/
		authUrl?: string;
		key?: string;
		queryTime?: boolean;
		token?: TokenDetails | string;
		tokenDetails?: TokenDetails;
		useTokenAuth?: boolean;

		/**
		 * Optional clientId that can be used to specify the identity for this client. In most cases
		 * it is preferable to instead specift a clientId in the token issued to this client.
		 */
		clientId?: string;
	}

	type capabilityOp = "publish" | "subscribe" | "presence" | "history" | "stats" | "channel-metadata" | "push-subscribe" | "push-admin";

	interface TokenParams {
		capability?: { [key: string]: capabilityOp[]; } | string;
		clientId?: string;
		nonce?: string;
		timestamp?: number;
		ttl?: number;
	}

	interface CipherParams {
		algorithm: string;
		key: any;
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

	interface ChannelOptions {
		cipher: any;
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
		 * A number controlling the verbosity of the output. Valid values are: 0 (no logs), 1 (errors only),
		 * 2 (errors plus connection and channel state changes), 3 (high-level debug output), and 4 (full debug output).
		 **/
		level?: number;

		/**
		 * A function to handle each line of log output. If handler is not specified, console.log is used.
		 **/
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
		errorReason?: ErrorInfo;
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
	type paginatedResultCallback<T> = (error: ErrorInfo, results: PaginatedResult<T>) => void;
	type standardCallback = (error: ErrorInfo, results: any) => void;
	type messageCallback<T> = (message: T) => void;
	type errorCallback = (error: ErrorInfo) => void;
	type channelEventCallback = (changeStateChange: ChannelStateChange) => void;
	type connectionEventCallback = (connectionStateChange: ConnectionStateChange) => void;
	type timeCallback = (error: ErrorInfo, time: number) => void;
	type realtimePresenceGetCallback = (error: ErrorInfo, messages: PresenceMessage[]) => void;
	type tokenDetailsCallback = (error: ErrorInfo, Results: TokenDetails) => void;
	type tokenRequestCallback = (error: ErrorInfo, Results: TokenRequest) => void;
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
		request: (method: string, path: string, params?: any, body?: any[] | any, headers?: any, callback?: (error: Types.ErrorInfo, response: Types.HttpPaginatedResponse) => void) => void;
		stats: (paramsOrCallback?: Types.paginatedResultCallback<Types.Stats> | any, callback?: Types.paginatedResultCallback<Types.Stats>) => void;
		time: (callback?: Types.timeCallback) => void;
		push: Types.PushCallbacks;
	}

	class RestPromise extends RestBase {
		static Promise: typeof Types.RestPromise;
		static Callbacks: typeof Types.RestCallbacks;
		auth: Types.AuthPromise;
		channels: Types.Channels<Types.ChannelPromise>;
		request: (method: string, path: string, params?: any, body?: any[] | any, headers?: any) => Promise<Types.HttpPaginatedResponse>;
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
		request: (method: string, path: string, params?: any, body?: any[] | any, headers?: any, callback?: (error: Types.ErrorInfo, response: Types.HttpPaginatedResponse) => void) => void;
		stats: (paramsOrCallback?: Types.paginatedResultCallback<Types.Stats> | any, callback?: Types.paginatedResultCallback<Types.Stats>) => void;
		time: (callback?: Types.timeCallback) => void;
		push: Types.PushCallbacks;
	}

	class RealtimePromise extends RealtimeBase {
		auth: Types.AuthPromise;
		channels: Types.Channels<Types.RealtimeChannelPromise>;
		connection: Types.ConnectionPromise;
		request: (method: string, path: string, params?: any, body?: any[] | any, headers?: any) => Promise<Types.HttpPaginatedResponse>;
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
		subscribe: (presenceOrListener: PresenceAction | messageCallback<PresenceMessage> | Array<PresenceAction>, listener?: messageCallback<PresenceMessage>, callbackWhenAttached?: standardCallback) => void;
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
		publish: (messagesOrName: any, messagedataOrCallback?: errorCallback | any, callback?: errorCallback) => void;
	}

	class ChannelPromise extends ChannelBase {
		presence: PresencePromise;
		history: (params?: RestHistoryParams) => Promise<PaginatedResult<Message>>;
		publish: (messagesOrName: any, messageData?: any) => Promise<void>;
	}

	class RealtimeChannelBase extends EventEmitter<channelEventCallback, ChannelStateChange, ChannelEvent, ChannelState> {
		name: string;
		errorReason: ErrorInfo;
		state: ChannelState;
		setOptions: (options: any) => void;
		unsubscribe: (eventOrListener?: string | Array<string> | messageCallback<Message>, listener?: messageCallback<Message>) => void;
	}

	class RealtimeChannelCallbacks extends RealtimeChannelBase {
		presence: RealtimePresenceCallbacks;
		attach: (callback?: standardCallback) => void;
		detach: (callback?: standardCallback) => void;
		history: (paramsOrCallback?: RealtimeHistoryParams | paginatedResultCallback<Message>, callback?: paginatedResultCallback<Message>) => void;
		subscribe: (eventOrCallback: messageCallback<Message> | string | Array<string>, listener?: messageCallback<Message>, callbackWhenAttached?: standardCallback) => void;
		publish: (messagesOrName: any, messageDataOrCallback?: errorCallback | any, callback?: errorCallback) => void;
		whenState: (targetState: ChannelState, callback: channelEventCallback) => void;
	}

	class RealtimeChannelPromise extends RealtimeChannelBase {
		presence: RealtimePresencePromise;
		attach: () => Promise<void>;
		detach: () => Promise<void>;
		history: (params?: RealtimeHistoryParams) => Promise<PaginatedResult<Message>>;
		subscribe: (eventOrCallback: messageCallback<Message> | string | Array<string>, listener?: messageCallback<Message>) => Promise<void>;
		publish: (messagesOrName: any, messageData?: any) => Promise<void>;
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

	interface Crypto {
		generateRandomKey: (callback: (error: ErrorInfo, key: string) => void) => void;
	}

	class ConnectionBase extends EventEmitter<connectionEventCallback, ConnectionStateChange, ConnectionEvent, ConnectionState> {
		errorReason: ErrorInfo;
		id: string;
		key: string;
		recoveryKey: string;
		serial: number;
		state: ConnectionState;
		close: () => void;
		connect: () => void;
	}

	class ConnectionCallbacks extends ConnectionBase {
		ping: (callback?: (error: ErrorInfo, responseTime: number) => void) => void;
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
		first: (results: paginatedResultCallback<T>) => void;
		next: (results: paginatedResultCallback<T>) => void;
		current: (results: paginatedResultCallback<T>) => void;
		hasNext: () => boolean;
		isLast: () => boolean;
	}

	class HttpPaginatedResponse extends PaginatedResult<any> {
		items: string[];
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
		save: (deviceDetails: DeviceDetails, callback?: (error: ErrorInfo, deviceDetails: DeviceDetails) => void) => void;
		get: (deviceIdOrDetails: DeviceDetails | string, callback: (error: ErrorInfo, deviceDetails: DeviceDetails) => void) => void;
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
		save: (subscription: PushChannelSubscription, callback?: (error: ErrorInfo, subscription: PushChannelSubscription) => void) => void;
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

export declare class Rest extends Types.RestCallbacks {}

export declare class Realtime extends Types.RealtimeCallbacks {}
