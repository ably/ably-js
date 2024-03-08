import type * as Ably from 'ably';
import { useEffect, useState } from 'react';
import { ChannelParameters } from '../AblyReactHooks.js';
import { useChannelInstance } from './useChannelInstance.js';
import { useStateErrors } from './useStateErrors.js';

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

  const updatePresence = async (message?: Ably.PresenceMessage) => {
    const snapshot = await channel.presence.get();
    updatePresenceData(snapshot);

    onPresenceMessageReceived?.call(this, message);
  };

  const onMount = async () => {
    channel.presence.subscribe(['enter', 'leave', 'update'], updatePresence);
    const snapshot = await channel.presence.get();
    updatePresenceData(snapshot);
  };

  const onUnmount = () => {
    channel.presence.unsubscribe(['enter', 'leave', 'update'], updatePresence);
  };

  const useEffectHook = () => {
    if (!skip) onMount();
    return () => {
      onUnmount();
    };
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(useEffectHook, [skip]);

  return { presenceData, connectionError, channelError };
}
