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

// Interfaces

interface ClientOptions extends AuthOptions {
  autoConnect?: boolean;
  clientId?: String;
  defaultTokenParams?: TokenParams;
  echoMessages?: boolean;
  environment?: String;
  log?: LogInfo;
  port?: number;
  queueMessages?: boolean;
  restHost?: String;
  realtimeHost?: String;
  fallbackHosts?: Array<String>;
  recover?: String | standardCallback;
  tls?: boolean;
  tlsPort?: number;
  useBinaryProtocol?: boolean;
}

interface AuthOptions {
  authCallback?: (data: TokenParams,callback: (Error: ErrorInfo | String, tokenRequestOrDetails: String | TokenDetails | TokenRequest) => void) => void;
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
  capability?: String;
  clientId?: String;
  nonce?: String;
  timestamp?: Number;   // Time?
  ttl?: Number;
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

interface TokenDetails {
  capability: String;
  clientId: String;
  expires: number; // Time
  issued: number; // Time
  token: String;
}

interface TokenRequest {
  capability: String;
  clientId?: String;
  keyName: String;
  mac: String;
  nonce: String;
  timestamp: number; // Time
  ttl?: number;
}

interface ChannelOptions {
  cipher: any;
}

interface RestPresenceHistoryParams {
  start?: number;
  end?: number;
  direction?: String;
  limit?: number;
}


interface RestPresenceParams {
  limit?: number;
  clientId?: String;
  connectionId?: String;
}

interface RealtimePresenceParams {
  waitForSync?: boolean;
  clientId?: String;
  connectionId?: String;
}

interface RealtimePresenceHistoryParams {
  start?: number;
  end?: number;
  direction?: String;
  limit?: number;
  untilAttach?: boolean
}

interface LogInfo {
  level?: number;
  handler?: (...args) => void;
}


// Common Listeners
type ListenerFn = (...args: Array<any>) => void;
type PaginatedResultCallback = (Error: ErrorInfo, results: PaginatedResult ) => void;
type standardCallback = (Error: ErrorInfo, results: any) => void;
type messageCallback = (Msg: any) => void;
type errorCallback = (Error: ErrorInfo) => void;



// Internal Classes
declare class EventEmitter {
  on: (eventOrCallback: String | ListenerFn, callback?: ListenerFn) => void;

  once: (eventOrCallback: String | ListenerFn, callback?: ListenerFn) => void;

  off: (eventOrCallback?: String | ListenerFn, callback?: ListenerFn) => void;
}

// Classes
export declare class Auth {
  clientId: String;
  authorize: (tokenParams?: TokenParams, authOptions?: AuthOptions, callback?: (Error: ErrorInfo, Results: TokenDetails) => void) => void;
  createTokenRequest: (tokenParams?: TokenParams, authOptions?: AuthOptions, callback?: (Error: ErrorInfo, Results: TokenRequest) => void) => void;
  requestToken: (TokenParams?: TokenParams, authOptions?: AuthOptions, callback?: (Error: ErrorInfo, Results: TokenDetails) => void) => void;
}

export declare class Presence {
  get: (params: RestPresenceParams, PaginatedResultCallback) => void;

  history: (params: RestPresenceHistoryParams, PaginatedResultCallback) => void;
}

export declare class RealtimePresence {
  syncComplete: () =>  boolean;

  get: (Params: RealtimePresenceParams, callback?: PaginatedResultCallback) => void;

  history: (ParamsOrCallback: RealtimePresenceHistoryParams | PaginatedResultCallback, callback?: PaginatedResultCallback) => void;

  subscribe: (presenceOrCallback: PresenceAction | messageCallback, listener?: standardCallback, callback?: standardCallback) => void;

  unsubscribe: (presence?: PresenceAction, listener?: standardCallback, callback?: standardCallback) => void;

  enter: (Data: any, callback?: standardCallback) => void;

  update: (Data: any, callback?: standardCallback) => void;

  leave: (Data: any, callback?: standardCallback) => void;

  enterClient: (clientId: String, Data: any, callback?: standardCallback) => void;

  updateClient: (clientId: String, Data: any, callback?: standardCallback) => void;

  leaveClient: (clientId: String, Data: any, callback?: standardCallback) => void;
}

export declare class Channel {
  name: String;
  presence: Presence;
  history: (ParamsOrCallback?: RestPresenceHistoryParams | PaginatedResultCallback, callback?: PaginatedResultCallback ) => void;
  publish: (messages: any, MessageDataOrCallback?: any | errorCallback, callback?: errorCallback) => void;
}

export declare class RealtimeChannel extends EventEmitter {
  name: String;
  errorReason: ErrorInfo;
  state: ChannelState;
  presence: RealtimePresence;

  attach: (callback?: standardCallback) => void;

  detach:(callback?: standardCallback) => void;

  history: (ParamsOrCallback?: RealtimePresenceHistoryParams | PaginatedResultCallback, callback?: PaginatedResultCallback) => void;

  subscribe: (eventOrCallback: String | messageCallback, listener?: messageCallback) => void;

  unsubscribe: (eventOrCallback?: String | messageCallback, listener?: messageCallback) => void;

  publish: (messages: any, MessageDataOrCallback?: any | errorCallback, callback?: errorCallback) => void;

}

export declare class Channels {
  get: (name: String, channelOptions?: ChannelOptions) => RealtimeChannel;

  release: (name: String) => void;
}

export declare class Message {
  constructor();

  fromEncoded: (JsonObject: String, channelOptions: ChannelOptions) => Message;

  fromEncodedArray: (JsonArray: String, channelOptions: ChannelOptions) => Array<Message>;

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
}

export declare class Rest {
  constructor(options: String | ClientOptions);
  auth: Auth;
  channels: Channels;
  request: (method: string, path: string, parmas?: any, body?: Array<any> | any, headers?: any, callback?: (Error: ErrorInfo, results: HttpPaginatedResponse) => void) => void;
  stats: (ParamsOrCallback?: any, callback?: PaginatedResultCallback) => void;
  time: (paramsOrCallback?: any, callback?: (Error: ErrorInfo, time: number ) => void) => void; // time
}

export declare class Realtime {
  constructor(options: String | ClientOptions);

  auth: Auth;
  channels: Channels;
  clientId: String;
  connection: Connection;

  request: (method: string, path: string, parmas?: any, body?: Array<any> | any, headers?: any, callback?: (Error: ErrorInfo, results: HttpPaginatedResponse) => void) => void;

  stats: (ParamsOrCallback?: any, callback?: PaginatedResultCallback) => void;

  close: () => void;

  connect: () => void;

  time: (paramsOrCallback?: any, callback?: (Error: ErrorInfo, time: number ) => void) => void; // time

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

  ping: (callback?: (Error: ErrorInfo, ResponseTime: number ) => void ) => void;
}

export declare class Stats {
  all: StatsMessageTypes;
  apiRequests: StatsRequestCount;
  channels: StatsResourceCount;
  connections: StatsConnectionTypes;
  inbound: StatsMessageTraffic;
  intervalId: String;
  outbound: StatsMessageTraffic;
  persisted: StatsMessageTypes;
  tokenRequests: StatsRequestCount;
}


export declare class PaginatedResult {
  items: Array<any>;

  first: (PaginatedResultCallback) => void;

  next: (PaginatedResultCallback) => void;

  current: (PaginatedResultCallback) => void;

  hasNext: () => boolean;

  isLast: () => boolean;

}

export declare class HttpPaginatedResponse extends PaginatedResult {
  items: Array<String>;
  statusCode: number;
  success: boolean;
  errorCode: number;
  errorMessage: String;
  headers: any;
}


