import * as API from '../../../../ably';
import Platform from 'common/platform';
import { fromEncoded, fromEncodedArray } from '../../../common/lib/types/message';

// The type assertions for the decode* functions below are due to https://github.com/ably/ably-js/issues/1421

export const decodeMessage = ((obj, options) => {
  return fromEncoded(Platform.Crypto, obj, options);
}) as API.Types.MessageStatic['fromEncoded'];

export const decodeMessages = ((obj, options) => {
  return fromEncodedArray(Platform.Crypto, obj, options);
}) as API.Types.MessageStatic['fromEncodedArray'];
