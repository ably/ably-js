type ChannelParams = { [key: string]: string };
export type ChannelMode = 'PUBLISH' | 'SUBSCRIBE' | 'PRESENCE' | 'PRESENCE_SUBSCRIBE' | 'ATTACH_RESUME';
type ChannelModes = Array<ChannelMode>;

export interface ChannelOptions {
  cipher?: CipherParamOptions | CipherParams;
  params?: ChannelParams;
  modes?: ChannelModes;
  channelCipher?: {
    algorithm: string;
    encrypt: Function;
    decrypt: Function;
  } | null;
  updateOnAttached?: boolean;
}
