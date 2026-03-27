import type * as Ably from 'ably';
import { useCallback } from 'react';
import { ChannelParameters } from '../AblyReactHooks.js';
import { useChannelInstance } from './useChannelInstance.js';
import { useStateErrors } from './useStateErrors.js';

export interface PushResult {
  channel: Ably.RealtimeChannel;
  subscribeDevice: () => Promise<void>;
  unsubscribeDevice: () => Promise<void>;
  subscribeClient: () => Promise<void>;
  unsubscribeClient: () => Promise<void>;
  listSubscriptions: (params?: Record<string, string>) => Promise<Ably.PaginatedResult<Ably.PushChannelSubscription>>;
  connectionError: Ably.ErrorInfo | null;
  channelError: Ably.ErrorInfo | null;
}

export function usePush(channelNameOrNameAndOptions: ChannelParameters): PushResult {
  const params =
    typeof channelNameOrNameAndOptions === 'object'
      ? channelNameOrNameAndOptions
      : { channelName: channelNameOrNameAndOptions };

  const { channel } = useChannelInstance(params.ablyId, params.channelName);
  const { connectionError, channelError } = useStateErrors(params);

  // Access channel.push eagerly to fail fast if the Push plugin is not loaded.
  // The getter on RealtimeChannel throws a descriptive error when the plugin is missing.
  const push = channel.push;

  const subscribeDevice = useCallback(() => push.subscribeDevice(), [push]);
  const unsubscribeDevice = useCallback(() => push.unsubscribeDevice(), [push]);
  const subscribeClient = useCallback(() => push.subscribeClient(), [push]);
  const unsubscribeClient = useCallback(() => push.unsubscribeClient(), [push]);
  const listSubscriptions = useCallback(
    (params?: Record<string, string>) => push.listSubscriptions(params),
    [push],
  );

  return {
    channel,
    subscribeDevice,
    unsubscribeDevice,
    subscribeClient,
    unsubscribeClient,
    listSubscriptions,
    connectionError,
    channelError,
  };
}
