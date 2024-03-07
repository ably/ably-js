import * as Ably from 'ably';

export type ChannelNameAndOptions = {
  channelName: string;
  ablyId?: string;
  subscribeOnly?: boolean;
  skip?: boolean;

  onConnectionError?: (error: Ably.ErrorInfo) => unknown;
  onChannelError?: (error: Ably.ErrorInfo) => unknown;
};

export type ChannelNameAndAblyId = {
  channelName: string;
  ablyId?: string;
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
