import type * as Ably from 'ably';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChannelParameters } from '../AblyReactHooks.js';
import { useAbly } from './useAbly.js';
import { useChannelInstance } from './useChannelInstance.js';
import { useStateErrors } from './useStateErrors.js';
import { useConnectionStateListener } from './useConnectionStateListener.js';
import { useChannelStateListener } from './useChannelStateListener.js';

export interface PresenceResult<T> {
  updateStatus: (messageOrPresenceObject: T) => Promise<void>;
  connectionError: Ably.ErrorInfo | null;
  channelError: Ably.ErrorInfo | null;
}

const INACTIVE_CONNECTION_STATES: Ably.ConnectionState[] = ['suspended', 'closing', 'closed', 'failed'];
const INACTIVE_CHANNEL_STATES: Ably.ChannelState[] = ['failed', 'suspended', 'detaching'];

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

  // we need to listen for the current connection state in order to react to it.
  // for example, we should enter presence when first connected, re-enter when reconnected,
  // and be able to prevent entering presence when the connection is in an inactive state.
  // all of that can be achieved by using the useConnectionStateListener hook.
  const [connectionState, setConnectionState] = useState(ably.connection.state);
  useConnectionStateListener((stateChange) => {
    setConnectionState(stateChange.current);
  }, params.ablyId);

  // similar to connection states, we should only attempt to enter presence when in certain
  // channel states.
  const [channelState, setChannelState] = useState(channel.state);
  useChannelStateListener(params, (stateChange) => {
    setChannelState(stateChange.current);
  });

  const shouldNotEnterPresence =
    INACTIVE_CONNECTION_STATES.includes(connectionState) || INACTIVE_CHANNEL_STATES.includes(channelState) || skip;

  useEffect(() => {
    if (shouldNotEnterPresence) {
      return;
    }

    const onMount = async () => {
      await channel.presence.enter(messageOrPresenceObjectRef.current);
    };
    onMount();

    return () => {
      // here we use the ably.connection.state property, which upon this cleanup function call
      // will have the current connection state for that connection, thanks to us accessing the Ably instance here by reference.
      // if the connection is in one of the inactive states or the channel is not attached, a presence.leave call will produce an exception.
      // so we only leave presence in other cases.
      if (channel.state === 'attached' && !INACTIVE_CONNECTION_STATES.includes(ably.connection.state)) {
        channel.presence.leave();
      }
    };
  }, [shouldNotEnterPresence, channel, ably]);

  const updateStatus = useCallback(
    async (messageOrPresenceObject: T) => {
      await channel.presence.update(messageOrPresenceObject);
    },
    [channel],
  );

  return { updateStatus, connectionError, channelError };
}
