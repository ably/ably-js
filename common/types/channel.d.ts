type ChannelParams = { [key: string]: string };
type ChannelMode = 'PUBLISH' | 'SUBSCRIBE' | 'PRESENCE' | 'PRESENCE_SUBSCRIBE';
type ChannelModes = Array<ChannelMode>;

export interface ChannelOptions {
  cipher?: CipherParamOptions | CipherParams;
  params?: ChannelParams;
  modes?: ChannelModes;
  channelCipher?: {
    algorithm: string;
    encrypt: Function;
    decrypt: Function;
  };
}
