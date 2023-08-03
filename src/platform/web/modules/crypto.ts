import * as API from '../../../../ably';
import Platform from 'common/platform';

export const generateRandomKey: API.Types.Crypto['generateRandomKey'] = (keyLength) => {
  return Platform.Crypto!.generateRandomKey(keyLength);
};

export const getDefaultCryptoParams: API.Types.Crypto['getDefaultParams'] = (params) => {
  return Platform.Crypto!.getDefaultParams(params);
};
