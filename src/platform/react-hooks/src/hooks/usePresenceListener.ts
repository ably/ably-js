import type * as Ably from 'ably';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChannelParameters } from '../AblyReactHooks.js';
import { useChannelInstance } from './useChannelInstance.js';
import { useStateErrors } from './useStateErrors.js';
import { useChannelAttach } from './useChannelAttach.js';

interface PresenceMessage<T = any> extends Ably.PresenceMessage {
  data: T;
}

export interface PresenceListenerResult<T> {
  presenceData: PresenceMessage<T>[];
  connectionError: Ably.ErrorInfo | null;
  channelError: Ably.ErrorInfo | null;
}

export type OnPresenceMessageReceived<T> = (presenceData: PresenceMessage<T>) => void;

export function usePresenceListener<T = any>(
  channelNameOrNameAndOptions: ChannelParameters,
  onPresenceMessageReceived?: OnPresenceMessageReceived<T>,
): PresenceListenerResult<T> {
  const params =
    typeof channelNameOrNameAndOptions === 'object'
      ? channelNameOrNameAndOptions
      : { channelName: channelNameOrNameAndOptions };
  const skip = params.skip;

  const { channel } = useChannelInstance(params.ablyId, params.channelName);
  const { connectionError, channelError } = useStateErrors(params);
  const [presenceData, updatePresenceData] = useState<Array<PresenceMessage<T>>>([]);

  const onPresenceMessageReceivedRef = useRef(onPresenceMessageReceived);
  useEffect(() => {
    onPresenceMessageReceivedRef.current = onPresenceMessageReceived;
  }, [onPresenceMessageReceived]);

  const updatePresence = useCallback(
    async (message?: Ably.PresenceMessage) => {
      const snapshot = await channel.presence.get();
      updatePresenceData(snapshot);

      onPresenceMessageReceivedRef.current?.(message);
    },
    [channel.presence],
  );

  const onMount = useCallback(async () => {
    channel.presence.subscribe(['enter', 'leave', 'update'], updatePresence);
    const snapshot = await channel.presence.get();
    updatePresenceData(snapshot);
  }, [channel.presence, updatePresence]);

  const onUnmount = useCallback(async () => {
    channel.presence.unsubscribe(['enter', 'leave', 'update'], updatePresence);
  }, [channel.presence, updatePresence]);

  useEffect(() => {
    if (skip) return;

    onMount();
    return () => {
      onUnmount();
    };
  }, [skip, onMount, onUnmount]);

  useChannelAttach(channel, params.ablyId, skip);

  return { presenceData, connectionError, channelError };
}
