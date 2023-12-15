import { useEffect, useRef } from 'react';
import { Types } from 'ably';
import { ChannelNameAndId, ChannelNameAndOptions, channelOptionsWithAgent } from '../AblyReactHooks.js';
import { useAbly } from './useAbly.js';
import { useEventListener } from './useEventListener.js';

type ChannelStateListener = (stateChange: Types.ChannelStateChange) => any;

export function useChannelStateListener(channelName: string, listener?: ChannelStateListener);

export function useChannelStateListener(
  options: ChannelNameAndOptions | string,
  state?: Types.ChannelState | Types.ChannelState[],
  listener?: ChannelStateListener
);

export function useChannelStateListener(
  channelNameOrNameAndId: ChannelNameAndOptions | string,
  stateOrListener?: Types.ChannelState | Types.ChannelState[] | ChannelStateListener,
  listener?: (stateChange: Types.ChannelStateChange) => any
) {
  const channelHookOptions =
    typeof channelNameOrNameAndId === 'object' ? channelNameOrNameAndId : { channelName: channelNameOrNameAndId };
  const id = (channelNameOrNameAndId as ChannelNameAndId)?.id;

  const { channelName, options: channelOptions } = channelHookOptions;

  const ably = useAbly(id);
  const channel = ably.channels.get(channelName, channelOptionsWithAgent(channelOptions));

  const channelOptionsRef = useRef(channelOptions);

  useEffect(() => {
    if (channelOptionsRef.current !== channelOptions && channelOptions) {
      channel.setOptions(channelOptionsWithAgent(channelOptions));
    }
    channelOptionsRef.current = channelOptions;
  }, [channel, channelOptions]);

  useEffect(() => {
    if (channelOptionsRef.current !== channelOptions && channelOptions) {
      channel.setOptions(channelOptionsWithAgent(channelOptions));
    }
    channelOptionsRef.current = channelOptions;
  }, [channel, channelOptions]);

  const _listener = typeof listener === 'function' ? listener : (stateOrListener as ChannelStateListener);

  const state = typeof stateOrListener !== 'function' ? stateOrListener : undefined;

  useEventListener<Types.ChannelState, Types.ChannelStateChange>(channel, _listener, state);
}
