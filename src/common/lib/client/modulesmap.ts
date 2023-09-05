import { Rest } from './rest';
import { IUntypedCryptoStatic } from '../../types/ICryptoStatic';
import { MsgPack } from 'common/types/msgpack';
import RealtimePresence from './realtimepresence';
import { TransportInitialiser } from '../transport/connectionmanager';
import XHRRequest from 'platform/web/lib/http/request/xhrrequest';
import fetchRequest from 'platform/web/lib/http/request/fetchrequest';

export interface ModulesMap {
  Rest?: typeof Rest;
  Crypto?: IUntypedCryptoStatic;
  MsgPack?: MsgPack;
  RealtimePresence?: typeof RealtimePresence;
  WebSocketTransport?: TransportInitialiser;
  XHRPolling?: TransportInitialiser;
  XHRStreaming?: TransportInitialiser;
  XHRRequest?: typeof XHRRequest;
  FetchRequest?: typeof fetchRequest;
}

export const allCommonModules: ModulesMap = { Rest };
