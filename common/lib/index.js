import Rest from './client/rest';
import Realtime from './client/realtime';
import * as Utils from './util/utils';
import BufferUtils from 'platform-bufferutils';
import Crypto from 'platform-crypto';
import Defaults from '../lib/util/defaults';
import Http from 'platform-http';
import Message from './types/message';
import PresenceMessage from './types/presencemessage';
import Resource from './client/resource';
import ProtocolMessage from './types/protocolmessage';
import ConnectionManager from './transport/connectionmanager';
import msgpack from 'platform-msgpack';

Rest.Utils = Utils;
Rest.BufferUtils = BufferUtils;
Rest.Crypto = Crypto;
Rest.Defaults = Defaults;
Rest.Http = Http;
Rest.Resource = Resource;
Rest.Message = Message;
Rest.PresenceMessage = PresenceMessage;

Realtime.Utils = Utils;
Realtime.BufferUtils = BufferUtils;
Realtime.Crypto = Crypto;
Realtime.Defaults = Defaults;
Realtime.Http = Http;
Realtime.Message = Message;
Realtime.PresenceMessage = PresenceMessage;
Realtime.ProtocolMessage = ProtocolMessage;
Realtime.ConnectionManager = ConnectionManager;

export default {
  Rest,
  Realtime,
  msgpack
}
