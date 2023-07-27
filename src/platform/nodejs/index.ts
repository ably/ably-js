// Common
import { defaultRestClassFactory } from '../../common/lib/client/defaultrest';
import { realtimeClassFactory } from '../../common/lib/client/realtime';
import { channelClassFactory } from '../../common/lib/client/channel';
import Platform from '../../common/platform';
import { messageClassFactory } from 'common/lib/types/message';
import { presenceMessageClassFactory } from 'common/lib/types/presencemessage';
import { protocolMessageClassFactory } from 'common/lib/types/protocolmessage';
import { presenceClassFactory } from 'common/lib/client/presence';
import { realtimePresenceClassFactory } from 'common/lib/client/realtimepresence';
import { realtimeChannelClassFactory } from 'common/lib/client/realtimechannel';
import { transportClassFactory } from 'common/lib/transport/transport';
import { protocolClassFactory } from 'common/lib/transport/protocol';
import { connectionManagerClassFactory } from 'common/lib/transport/connectionmanager';
import { connectionClassFactory } from 'common/lib/client/connection';
import webSocketTransportInitializerFactory from 'common/lib/transport/websockettransport';

// Platform Specific
import BufferUtils from './lib/util/bufferutils';
// @ts-ignore
import CryptoFactory from './lib/util/crypto';
import Http from './lib/util/http';
import Config from './config';
// @ts-ignore
import Transports from './lib/transport';
import Logger from '../../common/lib/util/logger';
import { getDefaults } from '../../common/lib/util/defaults';
import PlatformDefaults from './lib/util/defaults';

const Crypto = CryptoFactory(BufferUtils);

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
Platform.BufferUtils = BufferUtils as typeof Platform.BufferUtils;
Platform.Http = Http;
Platform.Config = Config;
Platform.Transports = Transports;
Platform.WebStorage = null;

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
  msgpack: null,
};
