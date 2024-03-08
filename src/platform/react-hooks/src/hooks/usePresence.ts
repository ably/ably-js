import type * as Ably from 'ably';
import { useCallback, useEffect } from 'react';
import { ChannelParameters } from '../AblyReactHooks.js';
import { useAbly } from './useAbly.js';
import { useChannelInstance } from './useChannelInstance.js';
import { useStateErrors } from './useStateErrors.js';

export interface PresenceEnterResult<T> {
  updateStatus: (messageOrPresenceObject: T) => void;
  connectionError: Ably.ErrorInfo | null;
  channelError: Ably.ErrorInfo | null;
}

const INACTIVE_CONNECTION_STATES: Ably.ConnectionState[] = ['suspended', 'closing', 'closed', 'failed'];

export function usePresence<T = any>(
  channelNameOrNameAndOptions: ChannelParameters,
  messageOrPresenceObject?: T,
): PresenceEnterResult<T> {
  const params =
    typeof channelNameOrNameAndOptions === 'object'
      ? channelNameOrNameAndOptions
      : { channelName: channelNameOrNameAndOptions };
  const skip = params.skip;

  const ably = useAbly(params.ablyId);
  const { channel } = useChannelInstance(params.ablyId, params.channelName);
  const { connectionError, channelError } = useStateErrors(params);

  const onMount = async () => {
    await channel.presence.enter(messageOrPresenceObject);
  };

  const onUnmount = () => {
    // if connection is in one of inactive states, leave call will produce exception
    if (channel.state === 'attached' && !INACTIVE_CONNECTION_STATES.includes(ably.connection.state)) {
      channel.presence.leave();
    }
  };

  const useEffectHook = () => {
    if (!skip) onMount();
    return () => {
      onUnmount();
    };
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(useEffectHook, [skip]);

  const updateStatus = useCallback(
    (messageOrPresenceObject: T) => {
      channel.presence.update(messageOrPresenceObject);
    },
    [channel],
  );

  return { updateStatus, connectionError, channelError };
}
