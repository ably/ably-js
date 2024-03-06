import type * as Ably from 'ably';
import { useCallback, useEffect, useState } from 'react';
import { ChannelParameters } from '../AblyReactHooks.js';
import { useAbly } from './useAbly.js';
import { useStateErrors } from './useStateErrors.js';
import { useChannelInstance } from './useChannelInstance.js';

export interface PresenceResult<T> {
  presenceData: PresenceMessage<T>[];
  updateStatus: (messageOrPresenceObject: T) => void;
  connectionError: Ably.ErrorInfo | null;
  channelError: Ably.ErrorInfo | null;
}

export type OnPresenceMessageReceived<T> = (presenceData: PresenceMessage<T>) => void;
export type UseStatePresenceUpdate = (presenceData: Ably.PresenceMessage[]) => void;

const INACTIVE_CONNECTION_STATES: Ably.ConnectionState[] = ['suspended', 'closing', 'closed', 'failed'];

export function usePresence<T = any>(
  channelNameOrNameAndOptions: ChannelParameters,
  messageOrPresenceObject?: T,
  onPresenceUpdated?: OnPresenceMessageReceived<T>,
): PresenceResult<T> {
  const params =
    typeof channelNameOrNameAndOptions === 'object'
      ? channelNameOrNameAndOptions
      : { channelName: channelNameOrNameAndOptions };

  const ably = useAbly(params.id);
  const { channel } = useChannelInstance(params.id, params.channelName);

  const subscribeOnly = typeof channelNameOrNameAndOptions === 'string' ? false : params.subscribeOnly;

  const skip = params.skip;

  const { connectionError, channelError } = useStateErrors(params);

  const [presenceData, updatePresenceData] = useState<Array<PresenceMessage<T>>>([]);

  const updatePresence = async (message?: Ably.PresenceMessage) => {
    const snapshot = await channel.presence.get();
    updatePresenceData(snapshot);

    onPresenceUpdated?.call(this, message);
  };

  const onMount = async () => {
    channel.presence.subscribe('enter', updatePresence);
    channel.presence.subscribe('leave', updatePresence);
    channel.presence.subscribe('update', updatePresence);

    if (!subscribeOnly) {
      await channel.presence.enter(messageOrPresenceObject);
    }

    const snapshot = await channel.presence.get();
    updatePresenceData(snapshot);
  };

  const onUnmount = () => {
    // if connection is in one of inactive states, leave call will produce exception
    if (channel.state === 'attached' && !INACTIVE_CONNECTION_STATES.includes(ably.connection.state)) {
      if (!subscribeOnly) {
        channel.presence.leave();
      }
    }
    channel.presence.unsubscribe('enter', updatePresence);
    channel.presence.unsubscribe('leave', updatePresence);
    channel.presence.unsubscribe('update', updatePresence);
  };

  const useEffectHook = () => {
    !skip && onMount();
    return () => {
      onUnmount();
    };
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(useEffectHook, [skip]);

  const updateStatus = useCallback(
    (messageOrPresenceObject: T) => {
      if (!subscribeOnly) {
        channel.presence.update(messageOrPresenceObject);
      } else {
        throw new Error('updateStatus can not be called while using the hook in subscribeOnly mode');
      }
    },
    [subscribeOnly, channel],
  );

  return { presenceData, updateStatus, connectionError, channelError };
}

interface PresenceMessage<T = any> {
  action: Ably.PresenceAction;
  clientId: string;
  connectionId: string;
  data: T;
  encoding: string;
  id: string;
  timestamp: number;
}
