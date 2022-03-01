import * as API from '../../../ably';

export interface ChannelOptions extends API.Types.ChannelOptions {
  channelCipher?: {
    algorithm: string;
    encrypt: Function;
    decrypt: Function;
  } | null;
  updateOnAttached?: boolean;
}
