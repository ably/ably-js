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

export const version = '2.22.1';

/**
 * channel options for react-hooks
 */
export function channelOptionsForReactHooks(options?: Ably.ChannelOptions): Ably.ChannelOptions {
  const callerAgent = options?.params?.agent;
  return {
    ...options,
    params: {
      ...options?.params,
      // Append rather than overwrite a caller-supplied agent, so SDKs that layer
      // on top of the React hooks (e.g. @ably/ai-transport, @ably/chat) and pass
      // their own channel agent via ChannelProvider's `options` keep it for
      // attribution. Ably's agent param is a space-separated list of lib/version
      // tokens. A re-attach is not triggered by an agent-only change.
      agent: callerAgent ? `${callerAgent} react-hooks/${version}` : `react-hooks/${version}`,
    },
    // we explicitly attach channels in React hooks (useChannel, usePresence, usePresenceListener)
    // to avoid situations where implicit attachment could cause errors (when connection state is failed or disconnected)
    attachOnSubscribe: false,
  };
}
