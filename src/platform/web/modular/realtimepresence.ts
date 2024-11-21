import { RealtimePresencePlugin } from 'common/lib/client/modularplugins';
import { default as realtimePresenceClass } from '../../../common/lib/client/realtimepresence';
import {
  fromValues as presenceMessageFromValues,
  fromValuesArray as presenceMessagesFromValuesArray,
  fromWireProtocol as presenceMessageFromWireProtocol,
} from '../../../common/lib/types/presencemessage';

const RealtimePresence: RealtimePresencePlugin = {
  RealtimePresence: realtimePresenceClass,
  presenceMessageFromValues,
  presenceMessagesFromValuesArray,
  presenceMessageFromWireProtocol,
};

export { RealtimePresence };
