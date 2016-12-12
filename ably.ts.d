//declare module Ably {

  namespace ChannelState {
    export type INITIALIZED = 'initialized';
    export type ATTACHING = 'attaching';
    export type ATTACHED = "attached";
    export type DETACHING = "detaching";
    export type DETACHED = "detached";
    export type SUSPENDED = "suspended";
    export type FAILED = "failed";
  }
  type ChannelState = ChannelState.FAILED | ChannelState.INITIALIZED | ChannelState.SUSPENDED | ChannelState.ATTACHED | ChannelState.ATTACHING | ChannelState.DETACHED | ChannelState.DETACHING;

  namespace ConnectionState {
    export type INITIALIZED = "initialized";
    export type CONNECTING = "connecting";
    export type CONNECTED = "connected";
    export type DISCONNECTED = "disconnected";
    export type SUSPENDED = "suspended";
    export type CLOSING = "closing";
    export type CLOSED = "closed";
    export type FAILED = "failed";
  }
  type ConnectionState = ConnectionState.INITIALIZED | ConnectionState.CONNECTED | ConnectionState.CONNECTING | ConnectionState.DISCONNECTED | ConnectionState.SUSPENDED | ConnectionState.CLOSED | ConnectionState.CLOSING | ConnectionState.FAILED;

  namespace ConnectionEvent {
    export type INITIALIZED = "initialized";
    export type CONNECTING = "connecting";
    export type CONNECTED = "connected";
    export type DISCONNECTED = "disconnected";
    export type SUSPENDED = "suspended";
    export type CLOSING = "closing";
    export type CLOSED = "closed";
    export type FAILED = "failed";
    export type UPDATE = "update";
  }
  type ConnectionEvent = ConnectionEvent.INITIALIZED | ConnectionEvent.CONNECTED | ConnectionEvent.CONNECTING | ConnectionEvent.DISCONNECTED | ConnectionEvent.SUSPENDED | ConnectionEvent.CLOSED | ConnectionEvent.CLOSING | ConnectionEvent.FAILED | ConnectionEvent.UPDATE;

  namespace PresenceAction {
    export type ABSENT = "absent";
    export type PRESENT = "present";
    export type ENTER = "enter";
    export type LEAVE = "leave";
    export type UPDATE = "update";
  }
  type PresenceAction = PresenceAction.ABSENT | PresenceAction.PRESENT | PresenceAction.ENTER | PresenceAction.LEAVE | PresenceAction.UPDATE;

  namespace StatsIntervalGranularity {
    export type MINUTE = "minute";
    export type HOUR = "hour";
    export type DAY = "day";
    export type MONTH = "month";
  }
  type StatsIntervalGranularity = StatsIntervalGranularity.MINUTE | StatsIntervalGranularity.HOUR | StatsIntervalGranularity.DAY | StatsIntervalGranularity.MONTH;

  namespace ProtocolMessageAction {
    export type HEARTBEAT = "heartbeat";
    export type ACK = "ack";
    export type NACK = "nack";
    export type CONNECT = "connect";
    export type CONNECTED = "connected";
    export type DISCONNECT = "disconnect";
    export type DISCONNECTED = "disconnected";
    export type CLOSE = "close";
    export type CLOSED = "closed";
    export type ERROR = "error";
    export type ATTACH = "attach";
    export type ATTACHED = "attached";
    export type DETACH = "detach";
    export type DETACHED = "detached";
    export type PRESENCE = "presence";
    export type MESSAGE = "message";
    export type SYNC = "sync";
    export type AUTH = "auth";
  }
  type ProtocolMessageAction = ProtocolMessageAction.ACK | ProtocolMessageAction.ATTACH | ProtocolMessageAction.ATTACHED | ProtocolMessageAction.AUTH | ProtocolMessageAction.CLOSE | ProtocolMessageAction.CLOSED | ProtocolMessageAction.CONNECT | ProtocolMessageAction.CONNECTED | ProtocolMessageAction.DETACH | ProtocolMessageAction.DETACHED | ProtocolMessageAction.DISCONNECT | ProtocolMessageAction.DISCONNECTED | ProtocolMessageAction.ERROR | ProtocolMessageAction.HEARTBEAT | ProtocolMessageAction.MESSAGE | ProtocolMessageAction.NACK | ProtocolMessageAction.PRESENCE | ProtocolMessageAction.SYNC;


  // Interfaces
  interface AuthDetails {
    accessToken: String;
  }

  interface ClientOptions extends AuthOptions {
    autoConnect?: boolean;
    clientId?: String;
    defaultTokenParams?: TokenParams;
    echoMessages?: boolean;
    environment?: String;
    logHandler?: any;
    logLevel?: any;
    port?: number;
    queueMessages?: boolean;
    restHost?: String;
    realtimeHost?: String;
    fallbackHosts?: Array<String>
    recover?: String
    tls?: boolean;
    tlsPort?: number;
    useBinaryProtocol?: boolean;
    disconnectedRetryTimeout?: number;
    suspendedRetryTimeout?: number;
    channelRetryTimeout?: number;
    httpOpenTimeout?: number;
    httpRequestTimeout?: number;
    httpMaxRetryCount?: number;
    httpMaxRetryDuration?: number;
  }

  interface AuthOptions {
    authCallback?: (data: String | TokenDetails | TokenRequest) => void;
    authHeaders?: Array<any>;
    authMethod?: String;
    authParams?: Array<any>;
    authUrl?: String;
    key?: String;
    queryTime?: boolean;
    token?: String | TokenDetails;
    tokenDetails?: TokenDetails;
    useTokenAuth?: boolean;
  }

  interface TokenParams {
    capability: String;
    clientId?: String;
    nonce?: String;
    timestamp: Number;   // Time?
    ttl: Number;
  }

  interface CipherParams {
    algorithm: String;
    key: any;
    keyLength: number;
    mode: String;
  }

  interface ErrorInfo {
    code: number;
    message: String;
    statusCode: number;
  }

  interface ConnectionDetails {
    clientId: String;
    connectionKey: String;
    connectionStateTtl: number;
    maxFrameSize: number;
    maxInboundRate: number;
    maxMessageSize: number;
    serverId: String;
    maxIdleInterval: number;
  }

  interface StatsMessageTypes {
    all: number,
    messages: number,
    presence: number;
  }

  interface StatsRequestCount {
    failed: number,
    refused: number,
    succeeded: number
  }

  interface StatsResourceCount {
    mean: number,
    min: number,
    opened: number,
    peak: number,
    refused: number
  }

  interface StatsConnectionTypes {
    all: number,
    plain: number,
    tls: number
  }

  interface StatsMessageTraffic {
    all: number,
    realtime: number,
    rest: number,
    webhook: number
  }

  // Listeners
  type ListenerFn = (...args: Array<any>) => void;


  // Internal Classes
  declare class EventEmitter {
    on: (eventOrCallback: String | ListenerFn, callback?: ListenerFn) => void;

    once: (eventOrCallback: String | ListenerFn, callback?: ListenerFn) => void;

    off: (eventOrCallback?: String | ListenerFn, callback?: ListenerFn) => void;

    emit: (Event: String, ...args: Array<any>) => void;
  }

  // Classes
  export declare class Auth {
    clientId: String;
    authorize: (tokenParams?: TokenParams, authOptions?: AuthOptions) => TokenDetails;
    createTokenRequest: (tokenParams?: TokenParams, authOptions?: AuthOptions) => TokenRequest;
    requestToken: (TokenParams?: TokenParams, authOptions?: AuthOptions) => TokenDetails;
  }

  export declare class TokenDetails {
    fromJson: (JsonData: string) => TokenDetails;
    capability: String;
    clientId: String;
    expires: number; // Time
    issued: number; // Time
    token: String;
  }

  export declare class TokenRequest {
    fromJson: (JsonData: String) => TokenRequest;
    capability: String;
    clientId: String;
    keyName: String;
    mac: String;
    nonce: String;
    timestamp: number; // Time
    ttl: number;
  }

  export declare class ChannelOptions {
    withCipherKey: (key: any) => ChannelOptions;
    cipher: (params: CipherParams) => void;
  }

  export declare class RestPresence {
    get: (limit: number, clientId?: String, connectionId?: String) => PaginatedResult;

    history: (start: number, end: number, direction: String, limit: number) => PaginatedResult;
  }

  export declare class RealtimePresence {
    syncComplete: boolean;

    get: (waitForSync: boolean, clientId?: String, connectionId?: String) => PresenceMessage;

    history: (start: number, end: number, direction: string, limit: number, untilAttach: boolean) => PaginatedResult;

    subscribe: (presense: PresenceMessage | PresenceAction, presenceMessage?: PresenceMessage) => void;

    unsubscribe: (presense?: PresenceMessage | PresenceAction, presenceMessage?: PresenceMessage) => void;

    enter: (Data: any) => void;

    update: (Data: any) => void;

    leave: (Data: any) => void;

    enterClient: (clientId: String, Data: any) => void;

    updateClient: (clientId: String, Data: any) => void;

    leaveClient: (clientId: String, Data: any) => void;
  }

  type MessageFn = (msg: Message) => void;

  export declare class RestChannel {
    name: String;
    presence: RestPresence;
    history: (start: number, // TIME
              end: number, // time
              direction: String,
              limit: number) => PaginatedResult;

    publish: (name?: Array<String> | String, data?: any, clientId?: String, extras?: any) => any;
  }

  export declare class RealtimeChannel extends EventEmitter {
    name: String;
    errorReason: ErrorInfo;
    state: ChannelState;
    presence: RealtimePresence;

    attach: () => any;

    detach:() => any;

    history: (start: number,
            end: number,
            direction: String,
            limit: number,
            untilAttach: boolean) => PaginatedResult;

    subscribe: (Msg: String | Message | MessageFn, ExtraMsg?: Message) => any;

    unsubscribe: (Msg?: String | Message | MessageFn, ExtraMsg?: Message) => any;

    publish: (name?: Array<String> | String, data?: any, clientId?: String, extras?: any) => any;

  }

  export declare class Channels {
    exists: (name: String) => boolean;

    get: (name: String, channelOptions?: ChannelOptions) => RealtimeChannel;
    iterate: () => RealtimeChannel;

    release: (name: String) => void;
  }

  export declare class Message {
    constructor(name?: String, data?: any, clientId?: String);

    fromEncoded: (JsonObject: String, channelOptions: ChannelOptions) => Message;

    fromEncodedArray: (JsonArray: String, channelOptions: ChannelOptions) => Message;

    clientId: String;
    connectionId: String;
    data: any;
    encoding: String;
    extras: String;
    id: String;
    name: String;
    timestamp: number; // Time
  }

  export declare class PresenceMessage {
    fromEncoded: (JsonObject: any, channelOptions?: ChannelOptions) => PresenceMessage;

    fromEncodedArray: (JsonArray: Array<any>, channelOptions?: ChannelOptions) => Array<PresenceMessage>;

    action: PresenceAction;
    clientId: String;
    connectionId: String;
    data: any;
    encoding: String;
    id: String;
    timestamp: number; // Time
    memberKey: () => String;
  }

  export declare class ProtocolMessage {
    action: ProtocolMessageAction;
    auth: AuthDetails;
    channel: String;
    channelSerial: String;
    connectionDetails: ConnectionDetails;
    connectionId: String;
    connectionKey: String;
    connectionSerial: number;
    count: number;
    error: ErrorInfo;
    flags: String;
    id: String;
    messages: Array<Message>;
    msgSerial: number;
    presence: Array<PresenceMessage>
    timestamp: number; // Time
  }

  export declare class Rest {
    constructor(options: String | ClientOptions);
    auth: Auth;
    channels: Channels;
    request: (method: string, path: string, parmas?: any, body?: Array<any> | any, headers?: any) => HttpPaginatedResponse;
    stats: ( start: number, // Time
           end: number, // Time
           direction: String,
           limit: number,
           unit: String) => PaginatedResult;
    time: () => number; // time
  }

  export declare class Realtime {
    constructor(options: String | ClientOptions);

    auth: Auth;
    channels: Channels;
    clientId: String;
    connection: Connection;

    request: (method: string, path: string, parmas?: any, body?: Array<any> | any, headers?: any) => HttpPaginatedResponse;

    stats: (start: number, // Time
          end: number, // Time
          direction: String,
          limit: number,
          unit: String) => PaginatedResult;

    close: () => void;

    connect: () => void;

    time: () => number;

  }

  export declare class Connection extends EventEmitter {
    errorReason: ErrorInfo;
    id: String;
    key: String;
    recoveryKey: String;
    serial: number;
    state: ConnectionState;

    close: () => void;

    connect: () => void;

    ping: () => void;
  }

  export declare class Stats {
    all: StatsMessageTypes;
    apiRequests: StatsRequestCount;
    channels: StatsResourceCount;
    connections: StatsConnectionTypes;
    inbound: StatsMessageTraffic;
    intervalGranularity: StatsIntervalGranularity;
    intervalId: String;
    intervalTime: number; // type
    outbound: StatsMessageTraffic;
    persisted: StatsMessageTypes;
    tokenRequests: StatsRequestCount;
  }

  export declare class ConnectionStateChange {
  current: ConnectionState;
  previous: ConnectionState;
  reason?: ErrorInfo;
  retryIn: number;
}

  export declare class PaginatedResult {
    items: Array<any>;

    first: () => any;

    hasNext: () => boolean;

    isLast: () => boolean;

    next: () => any;
  }

  export declare class HttpPaginatedResponse extends PaginatedResult {
    items: Array<String>;
    statusCode: number;
    success: boolean;
    errorCode: number;
    errorMessage: String;
    headers: any;
  }


