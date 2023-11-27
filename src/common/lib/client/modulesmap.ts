import { Rest } from './rest';
import { IUntypedCryptoStatic } from '../../types/ICryptoStatic';
import { MsgPack } from 'common/types/msgpack';
import RealtimePresence from './realtimepresence';
import { TransportInitialiser } from '../transport/connectionmanager';
import XHRRequest from 'platform/web/lib/http/request/xhrrequest';
import fetchRequest from 'platform/web/lib/http/request/fetchrequest';
import { FilteredSubscriptions } from './filteredsubscriptions';
import {
  fromValues as presenceMessageFromValues,
  fromValuesArray as presenceMessagesFromValuesArray,
} from '../types/presencemessage';

export interface PresenceMessageModule {
  presenceMessageFromValues: typeof presenceMessageFromValues;
  presenceMessagesFromValuesArray: typeof presenceMessagesFromValuesArray;
}

export type RealtimePresenceModule = PresenceMessageModule & {
  RealtimePresence: typeof RealtimePresence;
};

export interface ModulesMap {
  Rest?: typeof Rest;
  Crypto?: IUntypedCryptoStatic;
  MsgPack?: MsgPack;
  RealtimePresence?: RealtimePresenceModule;
  WebSocketTransport?: TransportInitialiser;
  XHRPolling?: TransportInitialiser;
  XHRStreaming?: TransportInitialiser;
  XHRRequest?: typeof XHRRequest;
  FetchRequest?: typeof fetchRequest;
  MessageInteractions?: typeof FilteredSubscriptions;
}

export const allCommonModules: ModulesMap = { Rest };
