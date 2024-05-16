import * as API from '../../../../ably';
import { fromEncoded, fromEncodedArray, fromValues } from '../../../common/lib/types/presencemessage';
import Logger from '../../../common/lib/util/logger';

// The type assertions for the functions below are due to https://github.com/ably/ably-js/issues/1421

export const decodePresenceMessage = ((obj, options) => {
  return fromEncoded(Logger.defaultLogger, obj, options);
}) as API.PresenceMessageStatic['fromEncoded'];

export const decodePresenceMessages = ((obj, options) => {
  return fromEncodedArray(Logger.defaultLogger, obj, options);
}) as API.PresenceMessageStatic['fromEncodedArray'];

export const constructPresenceMessage = fromValues as API.PresenceMessageStatic['fromValues'];
