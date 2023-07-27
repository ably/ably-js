// Common
import { defaultRestClassFactory } from '../../common/lib/client/defaultrest';
import { realtimeClassFactory } from '../../common/lib/client/realtime';
import { channelClassFactory } from '../../common/lib/client/channel';
import Platform from '../../common/platform';
import { messageClassFactory } from 'common/lib/types/message';
import { presenceMessageClassFactory } from 'common/lib/types/presencemessage';
import { presenceClassFactory } from 'common/lib/client/presence';
import { protocolMessageClassFactory } from 'common/lib/types/protocolmessage';
import { realtimePresenceClassFactory } from 'common/lib/client/realtimepresence';
import { transportClassFactory } from 'common/lib/transport/transport';
import { protocolClassFactory } from 'common/lib/transport/protocol';
import { connectionManagerClassFactory } from 'common/lib/transport/connectionmanager';
import { connectionClassFactory } from 'common/lib/client/connection';
import { realtimeChannelClassFactory } from 'common/lib/client/realtimechannel';
import webSocketTransportInitializerFactory from 'common/lib/transport/websockettransport';

// Platform Specific
import BufferUtils from '../web/lib/util/bufferutils';
// @ts-ignore
import CryptoFactory from '../web/lib/util/crypto';
import Http from '../web/lib/util/http';
import configFactory from './config';
// @ts-ignore
import Transports from '../web/lib/transport';
import Logger from '../../common/lib/util/logger';
import { getDefaults } from '../../common/lib/util/defaults';
import WebStorage from '../web/lib/util/webstorage';
import PlatformDefaults from '../web/lib/util/defaults';
import msgpack from '../web/lib/util/msgpack';

const Config = configFactory(BufferUtils);

const Crypto = CryptoFactory(Config, BufferUtils);

const Message = messageClassFactory();
const PresenceMessage = presenceMessageClassFactory(Message);
const Presence = presenceClassFactory(PresenceMessage);
const Channel = channelClassFactory(Message, Presence);
const DefaultRest = defaultRestClassFactory(Channel, PresenceMessage, {});
const ProtocolMessage = protocolMessageClassFactory(Message, PresenceMessage);
const RealtimePresence = realtimePresenceClassFactory(Presence, PresenceMessage);
const RealtimeChannel = realtimeChannelClassFactory(
  Channel,
  ProtocolMessage,
  Message,
  PresenceMessage,
  RealtimePresence
);
const Transport = transportClassFactory(ProtocolMessage);
const { protocolClass: Protocol, pendingMessageClass: PendingMessage } = protocolClassFactory(ProtocolMessage);
const webSocketTransportInitializer = webSocketTransportInitializerFactory(Transport, ProtocolMessage);
const ConnectionManager = connectionManagerClassFactory(
  Message,
  ProtocolMessage,
  Transport,
  Protocol,
  PendingMessage,
  webSocketTransportInitializer
);
const Connection = connectionClassFactory(ConnectionManager);
const Realtime = realtimeClassFactory(DefaultRest, RealtimeChannel, ProtocolMessage, ConnectionManager, Connection);

Platform.Crypto = Crypto;
Platform.BufferUtils = BufferUtils;
Platform.Http = Http;
Platform.Config = Config;
Platform.Transports = Transports;
Platform.WebStorage = WebStorage;

DefaultRest.Crypto = Crypto;
Realtime.Crypto = Crypto;

Logger.initLogHandlers();

Platform.Defaults = getDefaults(PlatformDefaults);

if (Platform.Config.agent) {
  // @ts-ignore
  Platform.Defaults.agent += ' ' + Platform.Config.agent;
}

export default {
  Rest: DefaultRest,
  Realtime,
  msgpack,
};
