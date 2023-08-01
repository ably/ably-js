import * as API from '../../../../ably';
import { Crypto } from './crypto';
import { fromEncoded, fromEncodedArray } from '../../../common/lib/types/message';

// TODO explain the `as` and link to issue

export const messageFromEncoded = ((obj, options) => {
  return fromEncoded(null, obj, options);
}) as API.Types.MessageStatic['fromEncoded'];

export const messageFromEncodedWithCrypto = ((obj, options) => {
  return fromEncoded(Crypto, obj, options);
}) as API.Types.MessageStatic['fromEncoded'];

export const messageFromEncodedArray = ((obj, options) => {
  return fromEncodedArray(null, obj, options);
}) as API.Types.MessageStatic['fromEncodedArray'];

export const messageFromEncodedArrayWithCrypto = ((obj, options) => {
  return fromEncodedArray(Crypto, obj, options);
}) as API.Types.MessageStatic['fromEncodedArray'];
