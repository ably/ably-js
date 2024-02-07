import { Types } from 'ably';

export type ChannelNameAndOptions = {
  channelName: string;
  options?: Types.ChannelOptions;
  deriveOptions?: Types.DeriveOptions;
  id?: string;
  subscribeOnly?: boolean;
  skip?: boolean;

  onConnectionError?: (error: Types.ErrorInfo) => unknown;
  onChannelError?: (error: Types.ErrorInfo) => unknown;
};

export type ChannelNameAndId = {
  channelName: string;
  id?: string;
};
export type ChannelParameters = string | ChannelNameAndOptions;

export const version = '1.2.49';

export function channelOptionsWithAgent(options?: Types.ChannelOptions) {
  return {
    ...options,
    params: {
      ...options?.params,
      agent: `react-hooks/${version}`,
    },
  };
}
