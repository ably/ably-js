import { Rest } from './rest';
import { IUntypedCryptoStatic } from '../../types/ICryptoStatic';
import { MsgPack } from 'common/types/msgpack';
import RealtimePresence from './realtimepresence';
import RealtimeAnnotations from './realtimeannotations';
import RestAnnotations from './restannotations';
import XHRRequest from 'platform/web/lib/http/request/xhrrequest';
import fetchRequest from 'platform/web/lib/http/request/fetchrequest';
import { FilteredSubscriptions } from './filteredsubscriptions';
import PresenceMessage, { WirePresenceMessage } from '../types/presencemessage';
import Annotation, { WireAnnotation } from '../types/annotation';
import { TransportCtor } from '../transport/transport';
import * as PushPlugin from 'plugins/push';

export interface PresenceMessagePlugin {
  PresenceMessage: typeof PresenceMessage;
  WirePresenceMessage: typeof WirePresenceMessage;
}

export type RealtimePresencePlugin = PresenceMessagePlugin & {
  RealtimePresence: typeof RealtimePresence;
};

export type AnnotationsPlugin = {
  Annotation: typeof Annotation;
  WireAnnotation: typeof WireAnnotation;
  RealtimeAnnotations: typeof RealtimeAnnotations;
  RestAnnotations: typeof RestAnnotations;
};

export interface ModularPlugins {
  Rest?: typeof Rest;
  Crypto?: IUntypedCryptoStatic;
  MsgPack?: MsgPack;
  RealtimePresence?: RealtimePresencePlugin;
  Annotations?: AnnotationsPlugin;
  WebSocketTransport?: TransportCtor;
  XHRPolling?: TransportCtor;
  XHRRequest?: typeof XHRRequest;
  FetchRequest?: typeof fetchRequest;
  MessageInteractions?: typeof FilteredSubscriptions;
  Push?: typeof PushPlugin;
}

export const allCommonModularPlugins: ModularPlugins = { Rest };
