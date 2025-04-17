import * as Ably from 'ably';

export type ChannelNameAndOptions = {
  channelName: string;
  ablyId?: string;
  skip?: boolean;

  onConnectionError?: (error: Ably.ErrorInfo) => unknown;
  onChannelError?: (error: Ably.ErrorInfo) => unknown;
};

export type ChannelNameAndAblyId = Pick<ChannelNameAndOptions, 'channelName' | 'ablyId'>;
export type ChannelParameters = string | ChannelNameAndOptions;

export const version = '2.7.0';

/**
 * channel options for react-hooks
 */
export function channelOptionsForReactHooks(options?: Ably.ChannelOptions): Ably.ChannelOptions {
  return {
    ...options,
    params: {
      ...options?.params,
      agent: `react-hooks/${version}`,
    },
    // we explicitly attach channels in React hooks (useChannel, usePresence, usePresenceListener)
    // to avoid situations where implicit attachment could cause errors (when connection state is failed or disconnected)
    attachOnSubscribe: false,
  };
}
