import Rest from './client/rest';
import Realtime from './client/realtime';
import * as Utils from './util/utils';
import Message from './types/message';
import PresenceMessage from './types/presencemessage';
import Resource from './client/resource';
import ProtocolMessage from './types/protocolmessage';

Rest.Utils = Utils;
Rest.Resource = Resource;
Rest.Message = Message;
Rest.PresenceMessage = PresenceMessage;

Realtime.Utils = Utils;
Realtime.Message = Message;
Realtime.PresenceMessage = PresenceMessage;
Realtime.ProtocolMessage = ProtocolMessage;

export default {
  Rest,
  Realtime,
  // msgpack,
};
