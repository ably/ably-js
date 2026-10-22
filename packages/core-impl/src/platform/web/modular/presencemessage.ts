import * as API from '@ably/pubsub-core/api';
import { fromValues, fromEncoded, fromEncodedArray } from '../../../common/lib/types/presencemessage';
import { Crypto } from './crypto';
import Logger from '../../../common/lib/util/logger';

// The type assertions for the functions below are due to https://github.com/ably/ably-js/issues/1421

export const decodePresenceMessage = ((obj, options) => {
  return fromEncoded(Logger.defaultLogger, null, obj, options);
}) as typeof API.PresenceMessage.fromEncoded;

export const decodeEncryptedPresenceMessage = ((obj, options) => {
  return fromEncoded(Logger.defaultLogger, Crypto, obj, options);
}) as typeof API.PresenceMessage.fromEncoded;

export const decodePresenceMessages = ((obj, options) => {
  return fromEncodedArray(Logger.defaultLogger, null, obj, options);
}) as typeof API.PresenceMessage.fromEncodedArray;

export const decodeEncryptedPresenceMessages = ((obj, options) => {
  return fromEncodedArray(Logger.defaultLogger, Crypto, obj, options);
}) as typeof API.PresenceMessage.fromEncodedArray;

export const constructPresenceMessage = fromValues as typeof API.PresenceMessage.fromValues;
