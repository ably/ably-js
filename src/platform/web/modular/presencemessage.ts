import * as API from '../../../../ably';
import { fromEncoded, fromEncodedArray, fromValues } from '../../../common/lib/types/presencemessage';

// The type assertions for the functions below are due to https://github.com/ably/ably-js/issues/1421

export const decodePresenceMessage = fromEncoded as API.PresenceMessageStatic['fromEncoded'];
export const decodePresenceMessages = fromEncodedArray as API.PresenceMessageStatic['fromEncodedArray'];
export const constructPresenceMessage = fromValues as API.PresenceMessageStatic['fromValues'];
