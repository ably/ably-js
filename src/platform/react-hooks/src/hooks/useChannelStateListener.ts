import * as Ably from 'ably';
import { ChannelNameAndAblyId } from '../AblyReactHooks.js';
import { useEventListener } from './useEventListener.js';
import { useChannelInstance } from './useChannelInstance.js';

type ChannelStateListener = (stateChange: Ably.ChannelStateChange) => any;

export function useChannelStateListener(channelName: string, listener?: ChannelStateListener);

export function useChannelStateListener(options: ChannelNameAndAblyId, listener?: ChannelStateListener);

export function useChannelStateListener(
  options: ChannelNameAndAblyId | string,
  state?: Ably.ChannelState | Ably.ChannelState[],
  listener?: ChannelStateListener,
);

export function useChannelStateListener(
  channelNameOrNameAndAblyId: ChannelNameAndAblyId | string,
  stateOrListener?: Ably.ChannelState | Ably.ChannelState[] | ChannelStateListener,
  listener?: (stateChange: Ably.ChannelStateChange) => any,
) {
  const channelHookOptions =
    typeof channelNameOrNameAndAblyId === 'object'
      ? channelNameOrNameAndAblyId
      : { channelName: channelNameOrNameAndAblyId };

  const { ablyId, channelName } = channelHookOptions;

  const { channel } = useChannelInstance(ablyId, channelName);

  const _listener = typeof listener === 'function' ? listener : (stateOrListener as ChannelStateListener);

  const state = typeof stateOrListener !== 'function' ? stateOrListener : undefined;

  useEventListener<Ably.ChannelState, Ably.ChannelStateChange>(channel, _listener, state);
}
