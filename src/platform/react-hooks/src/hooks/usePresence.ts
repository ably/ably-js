import type * as Ably from 'ably';
import { useCallback, useEffect, useRef } from 'react';
import { ChannelParameters } from '../AblyReactHooks.js';
import { useAbly } from './useAbly.js';
import { useChannelInstance } from './useChannelInstance.js';
import { useStateErrors } from './useStateErrors.js';

export interface PresenceResult<T> {
  updateStatus: (messageOrPresenceObject: T) => void;
  connectionError: Ably.ErrorInfo | null;
  channelError: Ably.ErrorInfo | null;
}

const INACTIVE_CONNECTION_STATES: Ably.ConnectionState[] = ['suspended', 'closing', 'closed', 'failed'];

export function usePresence<T = any>(
  channelNameOrNameAndOptions: ChannelParameters,
  messageOrPresenceObject?: T,
): PresenceResult<T> {
  const params =
    typeof channelNameOrNameAndOptions === 'object'
      ? channelNameOrNameAndOptions
      : { channelName: channelNameOrNameAndOptions };
  const skip = params.skip;

  const ably = useAbly(params.ablyId);
  const { channel } = useChannelInstance(params.ablyId, params.channelName);
  const { connectionError, channelError } = useStateErrors(params);
  // we can't simply add messageOrPresenceObject to dependency list in our useCallback/useEffect hooks,
  // since it will most likely cause an infinite loop of updates in cases when user calls this hook
  // with an object literal instead of a state or memoized object.
  // to prevent this from happening we store messageOrPresenceObject in a ref, and use that instead.
  // note that it still prevents us from automatically re-entering presence with new messageOrPresenceObject if it changes.
  // one of the options to fix this, is to use deep equals to check if the object has actually changed. see https://github.com/ably/ably-js/issues/1688.
  const messageOrPresenceObjectRef = useRef(messageOrPresenceObject);

  useEffect(() => {
    messageOrPresenceObjectRef.current = messageOrPresenceObject;
  }, [messageOrPresenceObject]);

  const onMount = useCallback(async () => {
    await channel.presence.enter(messageOrPresenceObjectRef.current);
  }, [channel.presence]);

  const onUnmount = useCallback(() => {
    // if connection is in one of inactive states, leave call will produce exception
    if (channel.state === 'attached' && !INACTIVE_CONNECTION_STATES.includes(ably.connection.state)) {
      channel.presence.leave();
    }
  }, [channel, ably.connection.state]);

  useEffect(() => {
    if (skip) return;

    onMount();
    return () => {
      onUnmount();
    };
  }, [skip, onMount, onUnmount]);

  const updateStatus = useCallback(
    (messageOrPresenceObject: T) => {
      channel.presence.update(messageOrPresenceObject);
    },
    [channel],
  );

  return { updateStatus, connectionError, channelError };
}
