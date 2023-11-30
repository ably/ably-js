import { Types, ErrorInfo } from '../../../../ably.js';

export type ChannelNameAndOptions = {
  channelName: string;
  options?: Types.ChannelOptions;
  id?: string;
  subscribeOnly?: boolean;
  skip?: boolean;

  onConnectionError?: (error: ErrorInfo) => unknown;
  onChannelError?: (error: ErrorInfo) => unknown;
};

export type ChannelNameAndId = {
  channelName: string;
  id?: string;
};
export type ChannelParameters = string | ChannelNameAndOptions;

export const version = '1.2.47';

export function channelOptionsWithAgent(options?: Types.ChannelOptions) {
  return {
    ...options,
    params: {
      ...options?.params,
      agent: `react-hooks/${version}`,
    },
  };
}
