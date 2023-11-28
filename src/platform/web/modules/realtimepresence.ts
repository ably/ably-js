import { Acks } from 'common/lib/client/acks';
import { RealtimePresenceModule } from 'common/lib/client/modulesmap';
import { default as realtimePresenceClass } from '../../../common/lib/client/realtimepresence';
import {
  fromValues as presenceMessageFromValues,
  fromValuesArray as presenceMessagesFromValuesArray,
} from '../../../common/lib/types/presencemessage';

const RealtimePresence: RealtimePresenceModule = {
  RealtimePresence: realtimePresenceClass,
  Acks,
  presenceMessageFromValues,
  presenceMessagesFromValuesArray,
};

export { RealtimePresence };
