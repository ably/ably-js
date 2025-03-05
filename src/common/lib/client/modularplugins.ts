import { Rest } from './rest';
import { IUntypedCryptoStatic } from '../../types/ICryptoStatic';
import { MsgPack } from 'common/types/msgpack';
import RealtimePresence from './realtimepresence';
import XHRRequest from 'platform/web/lib/http/request/xhrrequest';
import fetchRequest from 'platform/web/lib/http/request/fetchrequest';
import { FilteredSubscriptions } from './filteredsubscriptions';
import {
  fromValues as presenceMessageFromValues,
  fromValuesArray as presenceMessagesFromValuesArray,
} from '../types/presencemessage';
import { TransportCtor } from '../transport/transport';
import type * as PushPlugin from 'plugins/push';
import type * as ObjectsPlugin from 'plugins/liveobjects';

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
  WebSocketTransport?: TransportCtor;
  XHRPolling?: TransportCtor;
  XHRRequest?: typeof XHRRequest;
  FetchRequest?: typeof fetchRequest;
  MessageInteractions?: typeof FilteredSubscriptions;
  Push?: typeof PushPlugin;
  Objects?: typeof ObjectsPlugin;
}

export const allCommonModularPlugins: ModularPlugins = { Rest };
