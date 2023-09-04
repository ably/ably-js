import { Types } from '../../../../../ably.js';
import { useEffect, useMemo, useRef } from 'react';
import { ChannelParameters } from '../AblyReactHooks.js';
import { useAbly } from './useAbly.js';
import { useStateErrors } from './useStateErrors.js';

export type AblyMessageCallback = Types.messageCallback<Types.Message>;

export interface ChannelResult {
  channel: Types.RealtimeChannelPromise;
  ably: Types.RealtimePromise;
  connectionError: Types.ErrorInfo | null;
  channelError: Types.ErrorInfo | null;
}

type SubscribeArgs = [string, AblyMessageCallback] | [AblyMessageCallback];

export function useChannel(
  channelNameOrNameAndOptions: ChannelParameters,
  callbackOnMessage?: AblyMessageCallback
): ChannelResult;
export function useChannel(
  channelNameOrNameAndOptions: ChannelParameters,
  event: string,
  callbackOnMessage?: AblyMessageCallback
): ChannelResult;

export function useChannel(
  channelNameOrNameAndOptions: ChannelParameters,
  eventOrCallback?: string | AblyMessageCallback,
  callback?: AblyMessageCallback
): ChannelResult {
  const channelHookOptions =
    typeof channelNameOrNameAndOptions === 'object'
      ? channelNameOrNameAndOptions
      : { channelName: channelNameOrNameAndOptions };

  const ably = useAbly(channelHookOptions.id);

  const { channelName, options: channelOptions, skip } = channelHookOptions;

  const channelEvent = typeof eventOrCallback === 'string' ? eventOrCallback : null;
  const ablyMessageCallback = typeof eventOrCallback === 'string' ? callback : eventOrCallback;

  const channelOptionsRef = useRef(channelOptions);
  const ablyMessageCallbackRef = useRef(ablyMessageCallback);

  const channel = useMemo(() => ably.channels.get(channelName, channelOptionsRef.current), [ably, channelName]);

  const { connectionError, channelError } = useStateErrors(channelHookOptions);

  useEffect(() => {
    if (channelOptionsRef.current !== channelOptions && channelOptions) {
      channel.setOptions(channelOptions);
    }
    channelOptionsRef.current = channelOptions;
  }, [channel, channelOptions]);

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

  return { channel, ably, connectionError, channelError };
}

async function handleChannelMount(channel: Types.RealtimeChannelPromise, ...subscribeArgs: SubscribeArgs) {
  await (channel.subscribe as any)(...subscribeArgs);
}

async function handleChannelUnmount(channel: Types.RealtimeChannelPromise, ...subscribeArgs: SubscribeArgs) {
  await (channel.unsubscribe as any)(...subscribeArgs);

  setTimeout(async () => {
    // React is very mount/unmount happy, so if we just detatch the channel
    // it's quite likely it will be reattached again by a subsequent handleChannelMount calls.
    // To solve this, we set a timer, and if all the listeners have been removed, we know that the component
    // has been removed for good and we can detatch the channel.
    if (channel.listeners.length === 0) {
      await channel.detach();
    }
  }, 2500);
}
