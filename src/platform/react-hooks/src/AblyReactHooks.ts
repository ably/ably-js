import * as Ably from '../../../../ably.js';

export type ChannelNameAndOptions = {
  channelName: string;
  options?: Ably.ChannelOptions;
  deriveOptions?: Ably.DeriveOptions;
  id?: string;
  subscribeOnly?: boolean;
  skip?: boolean;

  onConnectionError?: (error: Ably.ErrorInfo) => unknown;
  onChannelError?: (error: Ably.ErrorInfo) => unknown;
};

export type ChannelNameAndId = {
  channelName: string;
  id?: string;
};
export type ChannelParameters = string | ChannelNameAndOptions;

export const version = '1.2.49';

export function channelOptionsWithAgent(options?: Ably.ChannelOptions) {
  return {
    ...options,
    params: {
      ...options?.params,
      agent: `react-hooks/${version}`,
    },
  };
}
