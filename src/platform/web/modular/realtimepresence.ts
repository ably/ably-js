import { RealtimePresencePlugin } from 'common/lib/client/modularplugins';
import { default as realtimePresenceClass } from '../../../common/lib/client/realtimepresence';
import {
  fromValues as presenceMessageFromValues,
  fromValuesArray as presenceMessagesFromValuesArray,
} from '../../../common/lib/types/presencemessage';

const RealtimePresence: RealtimePresencePlugin = {
  RealtimePresence: realtimePresenceClass,
  presenceMessageFromValues,
  presenceMessagesFromValuesArray,
};

export { RealtimePresence };
