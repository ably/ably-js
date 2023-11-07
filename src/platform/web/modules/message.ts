import * as API from '../../../../ably';
import { Crypto } from './crypto';
import { fromEncoded, fromEncodedArray } from '../../../common/lib/types/message';

// The type assertions for the decode* functions below are due to https://github.com/ably/ably-js/issues/1421

export const decodeMessage = ((obj, options) => {
  return fromEncoded(null, obj, options);
}) as API.Types.MessageStatic['fromEncoded'];

export const decodeEncryptedMessage = ((obj, options) => {
  return fromEncoded(Crypto, obj, options);
}) as API.Types.MessageStatic['fromEncoded'];

export const decodeMessages = ((obj, options) => {
  return fromEncodedArray(null, obj, options);
}) as API.Types.MessageStatic['fromEncodedArray'];

export const decodeEncryptedMessages = ((obj, options) => {
  return fromEncodedArray(Crypto, obj, options);
}) as API.Types.MessageStatic['fromEncodedArray'];
