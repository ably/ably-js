
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

namespace HTTPMethods {
  export type POST = "POST";
  export type GET = "GET";
}
type HTTPMethods = HTTPMethods.GET | HTTPMethods.POST;


// Interfaces

interface ClientOptions extends AuthOptions {
  autoConnect?: boolean;
  clientId?: string;
  defaultTokenParams?: TokenParams;
  echoMessages?: boolean;
  environment?: string;
  log?: LogInfo;
  port?: number;
  queueMessages?: boolean;
  restHost?: string;
  realtimeHost?: string;
  fallbackHosts?: Array<string>;
  recover?: standardCallback | string;
  tls?: boolean;
  tlsPort?: number;
  useBinaryProtocol?: boolean;
}

interface AuthOptions {
  authCallback?: (data: TokenParams,callback: (error: ErrorInfo | string, tokenRequestOrDetails: TokenDetails | TokenRequest | string) => void) => void;
  authHeaders?: { [index: string]: string };
  authMethod?: HTTPMethods;
  authParams?: { [index: string]: string };
  authUrl?: string;
  key?: string;
  queryTime?: boolean;
  token?: TokenDetails | string;
  tokenDetails?: TokenDetails;
  useTokenAuth?: boolean;
}

interface TokenParams {
  capability?: string;
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
  all: StatsMessageTypes,
  realtime: StatsMessageTypes,
  rest: StatsMessageTypes,
  webhook: StatsMessageTypes
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

interface RestPresenceHistoryParams {
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

interface RealtimePresenceHistoryParams {
  start?: number;
  end?: number;
  direction?: string;
  limit?: number;
  untilAttach?: boolean
}

interface LogInfo {
  level?: number;
  handler?: (...args) => void;
}

interface ChannelEvent {
  state: ChannelState;
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

// Common Listeners
type PaginatedResultCallback<T> = (error: ErrorInfo, results: PaginatedResult<T> ) => void;
type standardCallback = (error: ErrorInfo, results: any) => void;
type messageCallback<T> = (message: T) => void;
type errorCallback = (error: ErrorInfo) => void;
type channelEventCallback = (channelEvent: ChannelEvent, changeStateChange: ChannelStateChange) => void;
type connectionEventCallback = (connectionEvent: ConnectionEvent, connectionStateChange: ConnectionStateChange) => void;
type timeCallback = (error: ErrorInfo, time: number) => void;


// Internal Classes
declare class EventEmitter<T> {
  on: (eventOrCallback: string | T, callback?: T) => void;

  once: (eventOrCallback: string | T, callback?: T) => void;

  off: (eventOrCallback?: string | T, callback?: T) => void;
}

// Classes
export declare class Auth {
  clientId: string;
  authorize: (tokenParams?: TokenParams, authOptions?: AuthOptions, callback?: (error: ErrorInfo, Results: TokenDetails) => void) => void;
  createTokenRequest: (tokenParams?: TokenParams, authOptions?: AuthOptions, callback?: (error: ErrorInfo, Results: TokenRequest) => void) => void;
  requestToken: (TokenParams?: TokenParams, authOptions?: AuthOptions, callback?: (error: ErrorInfo, Results: TokenDetails) => void) => void;
}

export declare class Presence {
  get: (params: RestPresenceParams, callback: PaginatedResultCallback<PresenceMessage>) => void;

  history: (params: RestPresenceHistoryParams, callback: PaginatedResultCallback<PresenceMessage>) => void;
}

export declare class RealtimePresence {
  syncComplete: () =>  boolean;

  get: (Params: RealtimePresenceParams, callback?: (error: ErrorInfo, messages: Array<PresenceMessage>) => void) => void;

  history: (ParamsOrCallback: RealtimePresenceHistoryParams | PaginatedResultCallback<PresenceMessage>, callback?: PaginatedResultCallback<PresenceMessage>) => void;

  subscribe: (presenceOrCallback: PresenceAction | messageCallback<PresenceMessage>, listener?: messageCallback<PresenceMessage>) => void;

  unsubscribe: (presence?: PresenceAction, listener?: messageCallback<PresenceMessage>) => void;

  enter: (data: any, callback?: errorCallback) => void;

  update: (data: any, callback?: errorCallback) => void;

  leave: (data: any, callback?: errorCallback) => void;

  enterClient: (clientId: string, data: any, callback?: errorCallback) => void;

  updateClient: (clientId: string, data: any, callback?: errorCallback) => void;

  leaveClient: (clientId: string, data: any, callback?: errorCallback) => void;
}

export declare class Channel {
  name: string;
  presence: Presence;
  history: (paramsOrCallback?: RestPresenceHistoryParams | PaginatedResultCallback<Message>, callback?: PaginatedResultCallback<Message>) => void;
  publish: (messagesOrName: any, messagedataOrCallback?: errorCallback | any, callback?: errorCallback) => void;
}

export declare class RealtimeChannel extends EventEmitter<channelEventCallback> {
  name: string;
  errorReason: ErrorInfo;
  state: ChannelState;
  presence: RealtimePresence;

  attach: (callback?: standardCallback) => void;

  detach:(callback?: standardCallback) => void;

  history: (paramsOrCallback?: RealtimePresenceHistoryParams | PaginatedResultCallback<Message>, callback?: PaginatedResultCallback<Message>) => void;

  subscribe: (eventOrCallback: messageCallback<Message> | string, listener?: messageCallback<Message>) => void;

  unsubscribe: (eventOrCallback?: messageCallback<Message> | string, listener?: messageCallback<Message>) => void;

  publish: (messagesOrName: any, messageDataOrCallback?: errorCallback | any, callback?: errorCallback) => void;

}

export declare class Channels<T> {
  get: (name: string, channelOptions?: ChannelOptions) => T;

  release: (name: string) => void;
}

export declare class Message {
  constructor();

  fromEncoded: (JsonObject: string, channelOptions: ChannelOptions) => Message;

  fromEncodedArray: (JsonArray: string, channelOptions: ChannelOptions) => Array<Message>;

  clientId: string;
  connectionId: string;
  data: any;
  encoding: string;
  extras: any;
  id: string;
  name: string;
  timestamp: number;
}

export declare class PresenceMessage {
  fromEncoded: (JsonObject: any, channelOptions?: ChannelOptions) => PresenceMessage;

  fromEncodedArray: (JsonArray: Array<any>, channelOptions?: ChannelOptions) => Array<PresenceMessage>;

  action: PresenceAction;
  clientId: string;
  connectionId: string;
  data: any;
  encoding: string;
  id: string;
  timestamp: number;
}

export declare class Rest {
  constructor(options: ClientOptions | string);
  auth: Auth;
  channels: Channels<Channel>;
  request: (method: string, path: string, params?: any, body?: Array<any> | any, headers?: any, callback?: (error: ErrorInfo, response: HttpPaginatedResponse) => void) => void;
  stats: (paramsOrCallback?: PaginatedResultCallback<Stats> | any, callback?: PaginatedResultCallback<Stats>) => void;
  time: (paramsOrCallback?: timeCallback | any, callback?: timeCallback) => void;
}

export declare class Realtime {
  constructor(options: ClientOptions | string);

  auth: Auth;
  channels: Channels<RealtimeChannel>;
  clientId: string;
  connection: Connection;

  request: (method: string, path: string, params?: any, body?: Array<any> | any, headers?: any, callback?: (error: ErrorInfo, response: HttpPaginatedResponse) => void) => void;

  stats: (paramsOrCallback?: PaginatedResultCallback<Stats> | any, callback?: PaginatedResultCallback<Stats>) => void;

  close: () => void;

  connect: () => void;

  time: (paramsOrCallback?: timeCallback | any, callback?: timeCallback) => void;

}

export declare class Connection extends EventEmitter<connectionEventCallback> {
  errorReason: ErrorInfo;
  id: string;
  key: string;
  recoveryKey: string;
  serial: number;
  state: ConnectionState;

  close: () => void;

  connect: () => void;

  ping: (callback?: (error: ErrorInfo, responseTime: number ) => void ) => void;
}

export declare class Stats {
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


export declare class PaginatedResult<T> {
  items: Array<T>;

  first: (results: PaginatedResultCallback<T>) => void;

  next: (results: PaginatedResultCallback<T>) => void;

  current: (results: PaginatedResultCallback<T>) => void;

  hasNext: () => boolean;

  isLast: () => boolean;

}

export declare class HttpPaginatedResponse extends PaginatedResult<any> {
  items: Array<string>;
  statusCode: number;
  success: boolean;
  errorCode: number;
  errorMessage: string;
  headers: any;
}


