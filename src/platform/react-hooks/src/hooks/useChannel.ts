import * as Ably from 'ably';
import { useEffect, useMemo, useRef } from 'react';
import { ChannelParameters } from '../AblyReactHooks.js';
import { useAbly } from './useAbly.js';
import { useStateErrors } from './useStateErrors.js';
import { useChannelInstance } from './useChannelInstance.js';
import { useChannelAttach } from './useChannelAttach.js';

export type AblyMessageCallback = Ably.messageCallback<Ably.Message>;

export interface ChannelResult {
  channel: Ably.RealtimeChannel;
  publish: Ably.RealtimeChannel['publish'];
  ably: Ably.RealtimeClient;
  connectionError: Ably.ErrorInfo | null;
  channelError: Ably.ErrorInfo | null;
}

type SubscribeArgs = [string, AblyMessageCallback] | [AblyMessageCallback];

export function useChannel(
  channelNameOrNameAndOptions: ChannelParameters,
  callbackOnMessage?: AblyMessageCallback,
): ChannelResult;
export function useChannel(
  channelNameOrNameAndOptions: ChannelParameters,
  event: string,
  callbackOnMessage?: AblyMessageCallback,
): ChannelResult;

export function useChannel(
  channelNameOrNameAndOptions: ChannelParameters,
  eventOrCallback?: string | AblyMessageCallback,
  callback?: AblyMessageCallback,
): ChannelResult {
  const channelHookOptions =
    typeof channelNameOrNameAndOptions === 'object'
      ? channelNameOrNameAndOptions
      : { channelName: channelNameOrNameAndOptions };

  const ably = useAbly(channelHookOptions.ablyId);
  const { channelName, skip } = channelHookOptions;

  const { channel, derived } = useChannelInstance(channelHookOptions.ablyId, channelName);

  const publish: Ably.RealtimeChannel['publish'] = useMemo(() => {
    if (!derived) return channel.publish.bind(channel);
    const regularChannel = ably.channels.get(channelName);
    // For derived channels we use transient publish (it won't attach to the channel)
    return regularChannel.publish.bind(regularChannel);
  }, [ably.channels, derived, channel, channelName]);

  const channelEvent = typeof eventOrCallback === 'string' ? eventOrCallback : null;
  const ablyMessageCallback = typeof eventOrCallback === 'string' ? callback : eventOrCallback;

  const ablyMessageCallbackRef = useRef(ablyMessageCallback);

  const { connectionError, channelError } = useStateErrors(channelHookOptions);

  useEffect(() => {
    ablyMessageCallbackRef.current = ablyMessageCallback;
  }, [ablyMessageCallback]);

  useEffect(() => {
    const listener: AblyMessageCallback | null = ablyMessageCallbackRef.current
      ? (message) => {
          ablyMessageCallbackRef.current && ablyMessageCallbackRef.current(message);
        }
      : null;

    const subscribeArgs: SubscribeArgs | null = listener
      ? channelEvent === null
        ? [listener]
        : [channelEvent, listener]
      : null;

    if (!skip && subscribeArgs) {
      handleChannelMount(channel, ...subscribeArgs);
    }

    return () => {
      !skip && subscribeArgs && handleChannelUnmount(channel, ...subscribeArgs);
    };
  }, [channelEvent, channel, skip]);

  useChannelAttach(channel, channelHookOptions.ablyId, skip);

  return { channel, publish, ably, connectionError, channelError };
}

async function handleChannelMount(channel: Ably.RealtimeChannel, ...subscribeArgs: SubscribeArgs) {
  await (channel.subscribe as any)(...subscribeArgs);
}

async function handleChannelUnmount(channel: Ably.RealtimeChannel, ...subscribeArgs: SubscribeArgs) {
  await (channel.unsubscribe as any)(...subscribeArgs);
}
