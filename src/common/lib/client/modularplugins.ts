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

export interface PresenceMessagePlugin {
  presenceMessageFromValues: typeof presenceMessageFromValues;
  presenceMessagesFromValuesArray: typeof presenceMessagesFromValuesArray;
}

export type RealtimePresencePlugin = PresenceMessagePlugin & {
  RealtimePresence: typeof RealtimePresence;
};

export interface ModularPlugins {
  Rest?: typeof Rest;
  Crypto?: IUntypedCryptoStatic;
  MsgPack?: MsgPack;
  RealtimePresence?: RealtimePresencePlugin;
  WebSocketTransport?: TransportInitialiser;
  XHRPolling?: TransportInitialiser;
  XHRStreaming?: TransportInitialiser;
  XHRRequest?: typeof XHRRequest;
  FetchRequest?: typeof fetchRequest;
  MessageInteractions?: typeof FilteredSubscriptions;
}

export const allCommonModularPlugins: ModularPlugins = { Rest };
