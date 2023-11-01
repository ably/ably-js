import { Types } from './ably';

export declare const generateRandomKey: Types.Crypto['generateRandomKey'];
export declare const getDefaultCryptoParams: Types.Crypto['getDefaultParams'];
export declare const decodeMessage: Types.MessageStatic['fromEncoded'];
export declare const decodeEncryptedMessage: Types.MessageStatic['fromEncoded'];
export declare const decodeMessages: Types.MessageStatic['fromEncodedArray'];
export declare const decodeEncryptedMessages: Types.MessageStatic['fromEncodedArray'];
export declare const decodePresenceMessage: Types.PresenceMessageStatic['fromEncoded'];
export declare const decodePresenceMessages: Types.PresenceMessageStatic['fromEncodedArray'];
export declare const constructPresenceMessage: Types.PresenceMessageStatic['fromValues'];

export declare const Rest: unknown;
export declare const Crypto: unknown;
export declare const MsgPack: unknown;
export declare const RealtimePresence: unknown;
export declare const WebSocketTransport: unknown;
export declare const XHRPolling: unknown;
export declare const XHRStreaming: unknown;
export declare const XHRRequest: unknown;
export declare const FetchRequest: unknown;
export declare const MessageInteractions: unknown;

export interface ModulesMap {
  Rest?: typeof Rest;
  Crypto?: typeof Crypto;
  MsgPack?: typeof MsgPack;
  RealtimePresence?: typeof RealtimePresence;
  WebSocketTransport?: typeof WebSocketTransport;
  XHRPolling?: typeof XHRPolling;
  XHRStreaming?: typeof XHRStreaming;
  XHRRequest?: typeof XHRRequest;
  FetchRequest?: typeof FetchRequest;
  MessageInteractions?: typeof MessageInteractions;
}

export declare class BaseRest extends Types.Rest {
  constructor(options: Types.ClientOptions, modules: ModulesMap);
}

export declare class BaseRealtime extends Types.Realtime {
  constructor(options: Types.ClientOptions, modules: ModulesMap);
}

export { Types };
