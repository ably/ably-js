// Type definitions for Ably Realtime and Rest client library 1.2
// Project: https://www.ably.com/
// Definitions by: Ably <https://github.com/ably/>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare namespace Types {
  namespace ChannelState {
    type INITIALIZED = 'initialized';
    type ATTACHING = 'attaching';
    type ATTACHED = 'attached';
    type DETACHING = 'detaching';
    type DETACHED = 'detached';
    type SUSPENDED = 'suspended';
    type FAILED = 'failed';
  }
  type ChannelState =
    | ChannelState.FAILED
    | ChannelState.INITIALIZED
    | ChannelState.SUSPENDED
    | ChannelState.ATTACHED
    | ChannelState.ATTACHING
    | ChannelState.DETACHED
    | ChannelState.DETACHING;

  namespace ChannelEvent {
    type INITIALIZED = 'initialized';
    type ATTACHING = 'attaching';
    type ATTACHED = 'attached';
    type DETACHING = 'detaching';
    type DETACHED = 'detached';
    type SUSPENDED = 'suspended';
    type FAILED = 'failed';
    type UPDATE = 'update';
  }
  type ChannelEvent =
    | ChannelEvent.FAILED
    | ChannelEvent.INITIALIZED
    | ChannelEvent.SUSPENDED
    | ChannelEvent.ATTACHED
    | ChannelEvent.ATTACHING
    | ChannelEvent.DETACHED
    | ChannelEvent.DETACHING
    | ChannelEvent.UPDATE;

  namespace ConnectionState {
    type INITIALIZED = 'initialized';
    type CONNECTING = 'connecting';
    type CONNECTED = 'connected';
    type DISCONNECTED = 'disconnected';
    type SUSPENDED = 'suspended';
    type CLOSING = 'closing';
    type CLOSED = 'closed';
    type FAILED = 'failed';
  }
  type ConnectionState =
    | ConnectionState.INITIALIZED
    | ConnectionState.CONNECTED
    | ConnectionState.CONNECTING
    | ConnectionState.DISCONNECTED
    | ConnectionState.SUSPENDED
    | ConnectionState.CLOSED
    | ConnectionState.CLOSING
    | ConnectionState.FAILED;

  namespace ConnectionEvent {
    type INITIALIZED = 'initialized';
    type CONNECTING = 'connecting';
    type CONNECTED = 'connected';
    type DISCONNECTED = 'disconnected';
    type SUSPENDED = 'suspended';
    type CLOSING = 'closing';
    type CLOSED = 'closed';
    type FAILED = 'failed';
    type UPDATE = 'update';
  }
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

  namespace PresenceAction {
    type ABSENT = 'absent';
    type PRESENT = 'present';
    type ENTER = 'enter';
    type LEAVE = 'leave';
    type UPDATE = 'update';
  }
  type PresenceAction =
    | PresenceAction.ABSENT
    | PresenceAction.PRESENT
    | PresenceAction.ENTER
    | PresenceAction.LEAVE
    | PresenceAction.UPDATE;

  namespace StatsIntervalGranularity {
    type MINUTE = 'minute';
    type HOUR = 'hour';
    type DAY = 'day';
    type MONTH = 'month';
  }
  type StatsIntervalGranularity =
    | StatsIntervalGranularity.MINUTE
    | StatsIntervalGranularity.HOUR
    | StatsIntervalGranularity.DAY
    | StatsIntervalGranularity.MONTH;

  // Not in IDL - just used in AuthOptions here, don't do anything
  namespace HTTPMethods {
    type POST = 'POST';
    type GET = 'GET';
  }
  type HTTPMethods = HTTPMethods.GET | HTTPMethods.POST;

  // Not in IDL - just used here in ClientOptions.transports. I think this is a JS-only thing, spec says other libs just use WebSocket:
  /*
    (RTN1) Connection connects to the Ably service using a websocket connection. The ably-js library supports additional transports such as Comet and XHR streaming; however non-browser client libraries typically use only a websocket transport
  */
  type Transport = 'web_socket' | 'xhr_streaming' | 'xhr_polling' | 'jsonp' | 'comet';

  // Interfaces
  interface ClientOptions extends AuthOptions {
    /**
     * When true will automatically connect to Ably when library is instanced. This is true by default
     */
    autoConnect?: boolean;

    // Where’s clientId? Ah, it's been put in AuthOptions but it should be here

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
    // IDL has logHandler and logLevel - the IDL is correct
    log?: LogInfo;
    port?: number;

    /**
     * When true, messages will be queued whilst the connection is disconnected. True by default.
     */
    queueMessages?: boolean;

    restHost?: string;
    realtimeHost?: string;
    fallbackHosts?: string[];
    // Not in IDL (deprecated, but should probably be in IDL for now)
    fallbackHostsUseDefault?: boolean;

    // Not in IDL - JS-only
    restAgentOptions?: {
      maxSockets?: number;
      keepAlive?: boolean;
    };

    /**
     * Can be used to explicitly recover a connection.
     * See https://www.ably.com/docs/realtime/connection#connection-state-recovery
     */
    recover?:
      | string
      // This callback option isn’t in IDL (nor spec) - from Owen’s docs PR it seems to be a JS-only thing, used to recover a connection when the page is refreshed
      | ((
          lastConnectionDetails: {
            recoveryKey: string;
            disconnectedAt: number;
            location: string;
            clientId: string | null;
          },
          callback: (shouldRecover: boolean) => void
        ) => void);

    /**
     * Use a non-secure connection. By default, a TLS connection is used to connect to Ably
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
    // Not in IDL - from Owen’s description this is a JS-only thing, something to do with leaving presence immediately upon page reload
    closeOnUnload?: boolean;
    idempotentRestPublishing?: boolean;
    // IDL is Stringifiable, and according to feature spec should handle booleans too
    transportParams?: { [k: string]: string | number };
    // Not in IDL - see declaration of this type above, a JS-only thing
    transports?: Transport[];

    httpMaxRetryCount?: number;
    httpMaxRetryDuration?: number;
    httpOpenTimeout?: number;
    httpRequestTimeout?: number;
    realtimeRequestTimeout?: number;

    plugins?: { vcdiff?: any };
  }

  interface AuthOptions {
    /**
     * A function which is called when a new token is required.
     * The role of the callback is to either generate a signed TokenRequest which may then be submitted automatically
     * by the library to the Ably REST API requestToken; or to provide a valid token in as a TokenDetails object.
     **/
    // The IDL also accepts JsonObject as a param to authCallback
    authCallback?: (
      data: TokenParams,
      callback: (error: ErrorInfo | string, tokenRequestOrDetails: TokenDetails | TokenRequest | string) => void
    ) => void;
    authHeaders?: { [index: string]: string };
    // In the IDL this is explicitly .GET | .POST
    authMethod?: HTTPMethods;
    authParams?: { [index: string]: string };

    /**
     * A URL that the library may use to obtain a token string (in plain text format), or a signed TokenRequest or TokenDetails (in JSON format).
     **/
    authUrl?: string;
    key?: string;
    queryTime?: boolean;
    // In the IDL there’s also TokenRequest
    token?: TokenDetails | string;
    tokenDetails?: TokenDetails;
    useTokenAuth?: boolean;

    /**
     * Optional clientId that can be used to specify the identity for this client. In most cases
     * it is preferable to instead specify a clientId in the token issued to this client.
     */
    // Not in the IDL - in Owen’s docs PR there's more explanation, designed for the case where library instantiated with a `key`. Not mentioned in feature spec, nor in ably-cocoa’s ARTAuthOptions. Ah, it's in AuthOptions here but should be in ClientOptions. Can’t remove now without breaking API though.
    clientId?: string;
  }

  type capabilityOp =
    | 'publish'
    | 'subscribe'
    | 'presence'
    | 'history'
    | 'stats'
    | 'channel-metadata'
    | 'push-subscribe'
    | 'push-admin';
  type CapabilityOp = capabilityOp;

  interface TokenParams {
    // This structured option isn’t in the IDL - and the feature spec (TK2b) and ably-cocoa’s ARTTokenParams make no mention of it. But it does seem like a good thing to have. Need to find the authoritative API documentation for this property though
    //
    // feature spec says "Capability requirements JSON stringified for the token. When omitted, Ably will default to the capabilities of the underlying key"
    //
    // this type added by Simon Woolf in dab9bb2, seemingly not in a pull request
    //
    // the capabilities are described here: http://localhost:4000/rest-api/token-request-spec/#capability-operations
    //
    // this is the API: http://localhost:4000/api/rest-api/#request-token
    //
    // on iOS it's a string: "Contains the capability JSON stringified." but the documentation for the TokenParams doesn't make it clear whether that's actually allowed (I'm trying to understand the "| string" in the below)
    //
    // the canonical form http://localhost:4000/rest-api/token-request-spec/#parameters - it needs to be a JS object canonicalised and then turned into a string. The docs probably need to state this. But really we shouldn't be passing the canonicalisation on to the clients.
    //
    // Do client SDKs do canonicalisation? (canonicalisation is used for signed token requests, i.e. those with an HMAC)
    //
    // http://localhost:4000/client-lib-development-guide/features/#RSA9a says that Auth#createTokenRequest creates a signed token request
    //
    // OK, see the implementation in this repo of createTokenRequest - it uses the `c14n` method to canonalise the capabilities you pass, and that canonicalised version ends up in the token request. Pretty sure that iOS is doing the wrong thing here - we have test__085__createTokenRequest__should_generate_a_valid_HMAC but it doesn't test capabilities
    //
    // Also the Parameter Canonicalization docs mix up the constraints and the interpretation of wildcards
    //
    // OK, so, to do here:
    //
    // - update IDL
    // - clarify documentation for token params
    // - create iOS issue
    capability?: { [key: string]: capabilityOp[] } | string;
    clientId?: string;
    nonce?: string;
    // This is Time in the IDL
    timestamp?: number;
    // This is Duration in the IDL
    ttl?: number;
  }

  interface CipherParams {
    algorithm: string;
    // This is Binary in the IDL
    key: CipherKey;
    keyLength: number;
    mode: string;
  }

  interface ErrorInfo {
    code: number;
    message: string;
    statusCode: number;
    // Missing IDL’s href, cause, requestId
  }

  // IDL just refers to Ruby for definition, and this type isn’t used in IDL. TS5 doesn’t explain where it’s used. It’s used in ably-ruby’s MessageTypes
  // We know that the fact that this type isn’t well-defined in spec has caused us problems before (https://github.com/ably/ably-flutter/issues/106)
  // ably-ruby’s spec/unit/models/stats_spec.rb has some example server-sent data I think
  // the coercion happens in lib/ably/models/stats_types.rb
  //
  // the docs don't go into much detail about the stats: http://localhost:4000/rest/statistics/
  // and you can get to an example response, in which everything seems to be an integer: http://localhost:4000/general/statistics/ (but in the sample curl command, the mean is a float)
  //
  // and in Ruby, everything is an integer. will ask Paddy on that Flutter issue
  //
  // let's match Ruby until told otherwise
  interface StatsMessageCount {
    count: number;
    data: number;
  }

  // IDL just refers to Ruby for definition
  interface StatsMessageTypes {
    all: StatsMessageCount;
    messages: StatsMessageCount;
    presence: StatsMessageCount;
  }

  // IDL just refers to Ruby for definition
  interface StatsRequestCount {
    failed: number;
    refused: number;
    succeeded: number;
  }

  // IDL just refers to Ruby for definition
  interface StatsResourceCount {
    mean: number;
    min: number;
    opened: number;
    peak: number;
    refused: number;
  }

  // IDL just refers to Ruby for definition
  interface StatsConnectionTypes {
    all: StatsResourceCount;
    plain: StatsResourceCount;
    tls: StatsResourceCount;
  }

  // IDL just refers to Ruby for definition
  interface StatsMessageTraffic {
    all: StatsMessageTypes;
    realtime: StatsMessageTypes;
    rest: StatsMessageTypes;
    webhook: StatsMessageTypes;
  }

  interface TokenDetails {
    capability: string;
    clientId?: string;
    // This is Time in IDL
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

  // Not present in IDL - but it’s just a convenience type here
  type ChannelParams = { [key: string]: string };

  // ATTACH_RESUME not present in IDL
  // added recently here, in 9d5470c218725a0609f610e186dbce006f2ff7c8
  // https://docs.ably.com/client-lib-development-guide/features/#TB2d
  // > where a ChannelMode is a member of an enum containing the names of those children of TR3 whose value is ≥16 (or see the IDL below)
  type ChannelMode = 'PUBLISH' | 'SUBSCRIBE' | 'PRESENCE' | 'PRESENCE_SUBSCRIBE' | 'ATTACH_RESUME';
  // Not present in IDL, just a JS convenience type
  type ChannelModes = Array<ChannelMode>;

  interface ChannelOptions {
    // It’s CipherParams | Params in IDL, where Params isn’t defined
    // https://docs.ably.com/client-lib-development-guide/features/#TB2b2 explains that it's meant to be a subset of CipherParams that contains `key`. IDL needs updating to show this. Same with Crypto.getDefaultParams
    cipher?: CipherParamOptions | CipherParams;
    params?: ChannelParams;
    modes?: ChannelModes;
  }

  // Not present in IDL - JS convenience type
  interface RestHistoryParams {
    start?: number;
    end?: number;
    direction?: string;
    limit?: number;
  }

  // Not present in IDL - JS convenience type
  interface RestPresenceParams {
    limit?: number;
    clientId?: string;
    connectionId?: string;
  }

  // Not present in IDL - JS convenience type
  interface RealtimePresenceParams {
    waitForSync?: boolean;
    clientId?: string;
    connectionId?: string;
  }

  // Not present in IDL - JS convenience type
  // Let's figure out how this one is meant to be
  //
  // spec RSL2 (Channel#history)
  // - makes no mention of optionality of start and end
  // - says that if direction or limit omitted then the API default is …
  //
  // IDL:
  // start: Time, // RSL2b1 <-- this plus above implies it's required
  // end: Time api-default now(), // RSL2b1 <-- although above doesn't, this implies it's optional
  // direction: .Backwards | .Forwards api-default .Backwards, // RSL2b2
  // limit: int api-default 100 // RSL2b3
  interface RealtimeHistoryParams {
    start?: number;
    end?: number;
    // In the IDL this is either backwards or forwards
    direction?: string;
    limit?: number;
    untilAttach?: boolean;
  }

  // Not present in IDL - should be directly inside ClientOptions in JS
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
    // event is missing here
    current: ChannelState;
    previous: ChannelState;
    reason?: ErrorInfo;
    resumed: boolean;
  }

  interface ConnectionStateChange {
    // event is missing here
    current: ConnectionState;
    previous: ConnectionState;
    reason?: ErrorInfo;
    retryIn?: number;
  }

  interface DeviceDetails {
    id: string;
    clientId?: string;
    platform: 'android' | 'ios' | 'browser';
    // This is a type DeviceFormFactor in the IDL
    formFactor: 'phone' | 'tablet' | 'desktop' | 'tv' | 'watch' | 'car' | 'embedded' | 'other';
    metadata?: any;
    deviceSecret?: string;
    push: DevicePushDetails;
  }

  interface PushChannelSubscription {
    channel: string;
    deviceId?: string;
    clientId?: string;
  }

  // Not in IDL - a convenience type in JS
  type DevicePushState = 'ACTIVE' | 'FAILING' | 'FAILED';

  interface DevicePushDetails {
    recipient: any;
    state?: DevicePushState;
    error?: ErrorInfo;
  }

  // Not in IDL - JS convenience type for PushDeviceRegistrations#list/removeWhere
  interface DeviceRegistrationParams {
    clientId?: string;
    deviceId?: string;
    limit?: number;
    state?: DevicePushState;
  }

  // Not in IDL - JS convenience type for PushChannelSubscriptions#list/removeWhere
  interface PushChannelSubscriptionParams {
    channel?: string;
    clientId?: string;
    deviceId?: string;
    limit?: number;
  }

  // Not in IDL - JS convenience type for PushChannelSubscription#listChannels
  interface PushChannelsParams {
    limit?: number;
  }

  // Common Listeners
  // Not in IDL - JS convenience type
  // Shouldn't this be either an error or a result? Does TS let you express that?
  type StandardCallback<T> = (err: ErrorInfo | null, result?: T) => void;
  // Not in IDL - JS convenience type
  // Why aren't any of these callback types capitalised?
  type paginatedResultCallback<T> = StandardCallback<PaginatedResult<T>>;
  // Not in IDL - JS convenience type
  type messageCallback<T> = (message: T) => void;
  // Not in IDL - JS convenience type
  type errorCallback = (error?: ErrorInfo | null) => void;
  // Not in IDL - JS convenience type
  type channelEventCallback = (changeStateChange: ChannelStateChange) => void;
  // Not in IDL - JS convenience type
  type connectionEventCallback = (connectionStateChange: ConnectionStateChange) => void;
  // Not in IDL - JS convenience type
  type timeCallback = StandardCallback<number>;
  // Not in IDL - JS convenience type
  type realtimePresenceGetCallback = StandardCallback<PresenceMessage[]>;
  // Not in IDL - JS convenience type
  type tokenDetailsCallback = StandardCallback<TokenDetails>;
  // Not in IDL - JS convenience type
  type tokenRequestCallback = StandardCallback<TokenRequest>;
  type fromEncoded<T> = (JsonObject: any, channelOptions?: ChannelOptions) => T;
  type fromEncodedArray<T> = (JsonArray: any[], channelOptions?: ChannelOptions) => T[];

  // Internal Classes

  // To allow a uniform (callback) interface between on and once even in the
  // promisified version of the lib, but still allow once to be used in a way
  // that returns a Promise if desired, EventEmitter uses method overloading to
  // present both methods
  // I don’t really understand what’s going on here, what is EventEmitter? Can the types be better described in the feature spec? (OK, have a better idea now, see my notes)
  // Owen clarifies this in https://github.com/ably/ably-js/pull/897/files - you may or may not specify the callback. This is a common theme throughout this IDL - weird representation of overloads, which I don't know whether he's fixed all of them
  // But I don’t know what CallbackType is
  // What's the "..." in the IDL’s definition of these types?
  // In the IDL, ResultType is called Data, and EventType is called Event
  class EventEmitter<CallbackType, ResultType, EventType> {
    on(eventOrCallback: EventType | EventType[] | CallbackType, callback?: CallbackType): void;
    once(event: EventType, callback: CallbackType): void;
    once(callback: CallbackType): void;
    once(event?: EventType): Promise<ResultType>;
    off(eventOrCallback?: EventType | CallbackType, callback?: CallbackType): void;
    // This isn’t in feature spec
    listeners(eventName?: EventType): CallbackType[] | null;
  }

  // Classes
  // It’s just Rest in th espec
  class RestBase {
    // It’s not clear whether this is a key or a token here
    constructor(options: Types.ClientOptions | string);
    // What are these static types?
    static Crypto: Types.Crypto;
    static Message: Types.MessageStatic;
    static PresenceMessage: Types.PresenceMessageStatic;
  }

  class RestCallbacks extends RestBase {
    static Promise: typeof Types.RestPromise;
    static Callbacks: typeof Types.RestCallbacks;
    auth: Types.AuthCallbacks;
    // This should probably be called RestChannelCallbacks
    channels: Types.Channels<Types.ChannelCallbacks>;
    request: <T = any>(
      method: string,
      path: string,
      params?: any,
      body?: any[] | any,
      headers?: any,
      callback?: Types.StandardCallback<Types.HttpPaginatedResponse<T>>
    ) => void;
    // Yeah, this class alone is enough to show why the IDL is more expressive than the TS spec - JSON things are just `any`, as are `stats` params
    stats: (
      paramsOrCallback?: Types.paginatedResultCallback<Types.Stats> | any,
      callback?: Types.paginatedResultCallback<Types.Stats>
    ) => void;
    time: (callback?: Types.timeCallback) => void;
    push: Types.PushCallbacks;
  }

  class RestPromise extends RestBase {
    static Promise: typeof Types.RestPromise;
    static Callbacks: typeof Types.RestCallbacks;
    auth: Types.AuthPromise;
    channels: Types.Channels<Types.ChannelPromise>;
    request: <T = any>(
      method: string,
      path: string,
      params?: any,
      body?: any[] | any,
      headers?: any
    ) => Promise<Types.HttpPaginatedResponse<T>>;
    stats: (params?: any) => Promise<Types.PaginatedResult<Types.Stats>>;
    time: () => Promise<number>;
    push: Types.PushPromise;
  }

  // Is Realtime meant to inherit from Rest? It doesn’t in IDL, nor does it in ably-cocoa nor ably-ruby
  class RealtimeBase extends RestBase {
    static Promise: typeof Types.RealtimePromise;
    static Callbacks: typeof Types.RealtimeCallbacks;
    // nullable in IDL and in ably-cocoa; it doesn't seem to be explicitly described but the IDL comment implies it's a proxy for Auth#clientId, which RSA12 shows can be null
    clientId: string;
    close: () => void;
    connect: () => void;
  }

  class RealtimeCallbacks extends RealtimeBase {
    auth: Types.AuthCallbacks;
    channels: Types.Channels<Types.RealtimeChannelCallbacks>;
    connection: Types.ConnectionCallbacks;
    request: <T = any>(
      method: string,
      path: string,
      params?: any,
      body?: any[] | any,
      headers?: any,
      callback?: Types.StandardCallback<Types.HttpPaginatedResponse<T>>
    ) => void;
    stats: (
      paramsOrCallback?: Types.paginatedResultCallback<Types.Stats> | any,
      callback?: Types.paginatedResultCallback<Types.Stats>
    ) => void;
    time: (callback?: Types.timeCallback) => void;
    push: Types.PushCallbacks;
  }

  class RealtimePromise extends RealtimeBase {
    auth: Types.AuthPromise;
    channels: Types.Channels<Types.RealtimeChannelPromise>;
    connection: Types.ConnectionPromise;
    request: <T = any>(
      method: string,
      path: string,
      params?: any,
      body?: any[] | any,
      headers?: any
    ) => Promise<Types.HttpPaginatedResponse<T>>;
    stats: (params?: any) => Promise<Types.PaginatedResult<Types.Stats>>;
    time: () => Promise<number>;
    push: Types.PushPromise;
  }

  class AuthBase {
    // Optional in IDL and ably-cocoa. RSA12 mentions conditions under which it can be null. That said, I’m not sure whether this .d.ts contemplates nullability (although there are a lot of optional properties)
    clientId: string;
  }

  class AuthCallbacks extends AuthBase {
    authorize: (
      tokenParams?: TokenParams | tokenDetailsCallback,
      authOptions?: AuthOptions | tokenDetailsCallback,
      callback?: tokenDetailsCallback
    ) => void;
    createTokenRequest: (
      tokenParams?: TokenParams | tokenRequestCallback,
      authOptions?: AuthOptions | tokenRequestCallback,
      callback?: tokenRequestCallback
    ) => void;
    requestToken: (
      TokenParams?: TokenParams | tokenDetailsCallback,
      authOptions?: AuthOptions | tokenDetailsCallback,
      callback?: tokenDetailsCallback
    ) => void;
  }

  class AuthPromise extends AuthBase {
    authorize: (tokenParams?: TokenParams, authOptions?: AuthOptions) => Promise<TokenDetails>;
    createTokenRequest: (tokenParams?: TokenParams, authOptions?: AuthOptions) => Promise<TokenRequest>;
    requestToken: (TokenParams?: TokenParams, authOptions?: AuthOptions) => Promise<TokenDetails>;
  }

  // What is this, and why is it only used by channel?
  class PresenceCallbacks {
    get: (
      paramsOrCallback?: RestPresenceParams | paginatedResultCallback<PresenceMessage>,
      callback?: paginatedResultCallback<PresenceMessage>
    ) => void;
    history: (
      paramsOrCallback: RestHistoryParams | paginatedResultCallback<PresenceMessage>,
      callback?: paginatedResultCallback<PresenceMessage>
    ) => void;
  }

  class PresencePromise {
    get: (params?: RestPresenceParams) => Promise<PaginatedResult<PresenceMessage>>;
    history: (params?: RestHistoryParams) => Promise<PaginatedResult<PresenceMessage>>;
  }

  class RealtimePresenceBase {
    syncComplete: boolean;
    // Not clear what this callback to unsubscribe is?
    unsubscribe: (
      presenceOrListener?: PresenceAction | Array<PresenceAction> | messageCallback<PresenceMessage>,
      listener?: messageCallback<PresenceMessage>
    ) => void;
  }

  class RealtimePresenceCallbacks extends RealtimePresenceBase {
    // These are weird too
    get: (
      paramsOrCallback?: realtimePresenceGetCallback | RealtimePresenceParams,
      callback?: realtimePresenceGetCallback
    ) => void;
    history: (
      paramsOrCallback?: RealtimeHistoryParams | paginatedResultCallback<PresenceMessage>,
      callback?: paginatedResultCallback<PresenceMessage>
    ) => void;
    // again, this accepts multiple presence actions
    subscribe: (
      presenceOrListener: PresenceAction | messageCallback<PresenceMessage> | Array<PresenceAction>,
      listener?: messageCallback<PresenceMessage>,
      callbackWhenAttached?: errorCallback
    ) => void;
    enter: (data?: errorCallback | any, callback?: errorCallback) => void;
    update: (data?: errorCallback | any, callback?: errorCallback) => void;
    leave: (data?: errorCallback | any, callback?: errorCallback) => void;
    // There’s no `extras` here
    enterClient: (clientId: string, data?: errorCallback | any, callback?: errorCallback) => void;
    updateClient: (clientId: string, data?: errorCallback | any, callback?: errorCallback) => void;
    leaveClient: (clientId: string, data?: errorCallback | any, callback?: errorCallback) => void;
  }

  class RealtimePresencePromise extends RealtimePresenceBase {
    get: (params?: RealtimePresenceParams) => Promise<PresenceMessage[]>;
    history: (params?: RealtimeHistoryParams) => Promise<PaginatedResult<PresenceMessage>>;
    subscribe: (
      action?: PresenceAction | messageCallback<PresenceMessage> | Array<PresenceAction>,
      listener?: messageCallback<PresenceMessage>
    ) => Promise<void>;
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
    history: (
      paramsOrCallback?: RestHistoryParams | paginatedResultCallback<Message>,
      callback?: paginatedResultCallback<Message>
    ) => void;
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

  // it's a nullable ChannelStateChange in the IDL but it's non-null in ably-cocoa too. I think that RTL2d implies it should be non-null in IDL
  // no, I'm still confused by EventEmitter in JS, what are the different types it has?
  // here ResultType is ChannelStateChange, EventType is ChannelEvent
  class RealtimeChannelBase extends EventEmitter<channelEventCallback, ChannelStateChange, ChannelEvent> {
    // What does readonly mean in the IDL? Why is it on some properties and not others?
    // name not in IDL, but it is in ably-cocoa, should probably be in IDL too. can't see it explicitly mentioned by the feature spec
    readonly name: string;
    errorReason: ErrorInfo;
    readonly state: ChannelState;
    params: ChannelParams;
    modes: ChannelModes;
    unsubscribe: (
      eventOrListener?: string | Array<string> | messageCallback<Message>,
      listener?: messageCallback<Message>
    ) => void;
  }

  type PublishOptions = {
    quickAck?: boolean;
  };

  class RealtimeChannelCallbacks extends RealtimeChannelBase {
    // "Callbacks" is a confusing suffix because it sounds like it's a type that represents the different callbacks themselves
    presence: RealtimePresenceCallbacks;
    attach: (callback?: errorCallback) => void;
    detach: (callback?: errorCallback) => void;
    history: (
      paramsOrCallback?: RealtimeHistoryParams | paginatedResultCallback<Message>,
      callback?: paginatedResultCallback<Message>
    ) => void;
    setOptions: (options: ChannelOptions, callback?: errorCallback) => void;
    subscribe: (
      eventOrCallback: messageCallback<Message> | string | Array<string>,
      listener?: messageCallback<Message>,
      callbackWhenAttached?: errorCallback
    ) => void;
    // Why is messages untyped?!
    publish(messages: any, callback?: errorCallback): void;
    publish(name: string, messages: any, callback?: errorCallback): void;
    publish(name: string, messages: any, options?: PublishOptions, callback?: errorCallback): void;
    // Not in IDL - it is a thing being used internally in the library added in 55b1be4fde0ccf15535a89c9da2a79cd430ce181, probably shouldn't be in public interface
    whenState: (targetState: ChannelState, callback: channelEventCallback) => void;
  }

  class RealtimeChannelPromise extends RealtimeChannelBase {
    presence: RealtimePresencePromise;
    attach: () => Promise<void>;
    detach: () => Promise<void>;
    history: (params?: RealtimeHistoryParams) => Promise<PaginatedResult<Message>>;
    setOptions: (options: ChannelOptions) => Promise<void>;
    subscribe: (
      eventOrCallback: messageCallback<Message> | string | Array<string>,
      listener?: messageCallback<Message>
    ) => Promise<void>;
    publish(messages: any, options?: PublishOptions): Promise<void>;
    publish(name: string, messages: any, options?: PublishOptions): Promise<void>;
    whenState: (targetState: ChannelState) => Promise<ChannelStateChange>;
  }

  class Channels<T> {
    // missing exists, iterate
    get: (name: string, channelOptions?: ChannelOptions) => T;
    release: (name: string) => void;
  }

  class Message {
    // This doesn't match the constructor from IDL - I don't think that the IDL even needs to have constructors, though
    constructor();
    static fromEncoded: fromEncoded<Message>;
    static fromEncodedArray: fromEncodedArray<Message>;
    // nullable in IDL and in ably-cocoa
    clientId: string;
    // nullable in IDL, not nullable in ably-cocoa. TM2c implies it should be non-nullable (but remember that we had questions about how it behaves in the case of fromEncoded*)
    connectionId: string;
    // nullable in IDL and in ably-cocoa
    data: any;
    // nullable in IDL and in ably-cocoa
    encoding: string;
    // nullable in IDL and in ably-cocoa
    extras: any;
    id: string;
    // nullable in IDL and in ably-cocoa
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
    // missing `extras`
    encoding: string;
    id: string;
    timestamp: number;
    // missing memberKey()
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
  };

  interface Crypto {
    // doesn't accept keyLengh
    generateRandomKey: (callback: Types.StandardCallback<CipherKey>) => void;
    // this isn't async in IDL, don't think it's a problem
    getDefaultParams: (params: CipherParamOptions, callback: Types.StandardCallback<CipherParams>) => void;
  }

  class ConnectionBase extends EventEmitter<connectionEventCallback, ConnectionStateChange, ConnectionEvent> {
    errorReason: ErrorInfo;
    id?: string;
    key?: string;
    recoveryKey: string;
    serial: number;
    readonly state: ConnectionState;
    close: () => void;
    connect: () => void;
  }

  class ConnectionCallbacks extends ConnectionBase {
    ping: (callback?: Types.StandardCallback<number>) => void;
    // not in IDL - guessing it’s as the other whenState
    whenState: (targetState: ConnectionState, callback: connectionEventCallback) => void;
  }

  class ConnectionPromise extends ConnectionBase {
    ping: () => Promise<number>;
    // not in IDL - guessing it’s as the other whenState
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
    // not in IDL or iOS - seems to have been introduced very earlly, in 9252098. not documented in Owen’s JSDoc PR. seems to be populated from a 'Link' header in the response. not going to put in IDL
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
    // the IDL (ditto iOS) is less strongly typed - just takes Dict<String, String>
    // RSH1b2 says "the provided params, as supported by the REST API" - I think, though, that it’s reasonable not to expect developers to know the details of the REST API to use this function. So, will add.
    /*
  interface DeviceRegistrationParams {
    clientId?: string;
    deviceId?: string;
    limit?: number;
    state?: DevicePushState;
  }
 the REST docs say:

deviceId
    optional filter to restrict to devices associated with that deviceId
clientId
    optional filter to restrict to devices associated with that clientId
limit
    (default: 100) The maximum number of records to return. A limit greater than 1,000 is invalid. 

so, this `state` property on DeviceRegistrationParams isn't actually mentioned in the REST docs, where’d it come from? added in bcb98b4 by Simon Woolf, as part of just adding types for all push admin stuff. probs best not to add, given it’s not documented. create a separate ably-js issue for understanding whether the value should be there or not.
 */
    list: (params: DeviceRegistrationParams, callback: paginatedResultCallback<DeviceDetails>) => void;
    remove: (deviceIdOrDetails: DeviceDetails | string, callback?: errorCallback) => void;
    // the IDL is less strongly typed - just takes Dict<String, String>
    // OK, we’ll add this
    // JS needs to have `limit` removed here, docs don’t mention it
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
    // the IDL is less strongly typed - just takes Dict<String, String> as in PushChannelDevices, let’s add to IDL
    /*
  interface PushChannelSubscriptionParams {
    channel?: string;
    clientId?: string;
    deviceId?: string;
    limit?: number;
  }
 there should also be a concatFilters property here according to REST docs
 */
    list: (params: PushChannelSubscriptionParams, callback: paginatedResultCallback<PushChannelSubscription>) => void;
    listChannels: (params: PushChannelsParams, callback: paginatedResultCallback<string>) => void;
    remove: (subscription: PushChannelSubscription, callback?: errorCallback) => void;
    // the IDL is less strongly typed - just takes Dict<String, String>
    // here, as in PushChannelDevices, there shouldn’t be a `limit` according to REST docs
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
