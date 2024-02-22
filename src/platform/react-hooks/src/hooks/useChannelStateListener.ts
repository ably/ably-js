import * as Ably from 'ably';
import { ChannelNameAndId, ChannelNameAndOptions } from '../AblyReactHooks.js';
import { useEventListener } from './useEventListener.js';
import { useChannelInstance } from './useChannelInstance.js';

type ChannelStateListener = (stateChange: Ably.ChannelStateChange) => any;

export function useChannelStateListener(channelName: string, listener?: ChannelStateListener);

export function useChannelStateListener(
  options: ChannelNameAndOptions | string,
  state?: Ably.ChannelState | Ably.ChannelState[],
  listener?: ChannelStateListener
);

export function useChannelStateListener(
  channelNameOrNameAndId: ChannelNameAndOptions | string,
  stateOrListener?: Ably.ChannelState | Ably.ChannelState[] | ChannelStateListener,
  listener?: (stateChange: Ably.ChannelStateChange) => any
) {
  const channelHookOptions =
    typeof channelNameOrNameAndId === 'object' ? channelNameOrNameAndId : { channelName: channelNameOrNameAndId };
  const id = (channelNameOrNameAndId as ChannelNameAndId)?.id;

  const { channelName } = channelHookOptions;

  const channel = useChannelInstance(id, channelName);

  const _listener = typeof listener === 'function' ? listener : (stateOrListener as ChannelStateListener);

  const state = typeof stateOrListener !== 'function' ? stateOrListener : undefined;

  useEventListener<Ably.ChannelState, Ably.ChannelStateChange>(channel, _listener, state);
}
