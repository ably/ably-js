import { Types } from 'ably';
import { useEffect, useMemo, useRef } from 'react';
import { channelOptionsWithAgent, ChannelParameters } from '../AblyReactHooks.js';
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

  const { channelName, options: channelOptions, deriveOptions, skip } = channelHookOptions;

  const channelEvent = typeof eventOrCallback === 'string' ? eventOrCallback : null;
  const ablyMessageCallback = typeof eventOrCallback === 'string' ? callback : eventOrCallback;

  const deriveOptionsRef = useRef(deriveOptions);
  const channelOptionsRef = useRef(channelOptions);
  const ablyMessageCallbackRef = useRef(ablyMessageCallback);

  const channel = useMemo(() => {
    const derived = deriveOptionsRef.current;
    const withAgent = channelOptionsWithAgent(channelOptionsRef.current);
    const channel = derived
      ? ably.channels.getDerived(channelName, derived, withAgent)
      : ably.channels.get(channelName, withAgent);
    return channel;
  }, [ably, channelName]);

  const { connectionError, channelError } = useStateErrors(channelHookOptions);

  useEffect(() => {
    if (channelOptionsRef.current !== channelOptions && channelOptions) {
      channel.setOptions(channelOptionsWithAgent(channelOptions));
    }
    channelOptionsRef.current = channelOptions;
  }, [channel, channelOptions]);

  useEffect(() => {
    deriveOptionsRef.current = deriveOptions;
  }, [deriveOptions]);

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
