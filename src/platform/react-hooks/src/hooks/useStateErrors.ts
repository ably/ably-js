import { Types } from 'ably';
import { useState } from 'react';
import { useConnectionStateListener } from './useConnectionStateListener.js';
import { useChannelStateListener } from './useChannelStateListener.js';
import { ChannelNameAndOptions } from '../AblyReactHooks.js';

export function useStateErrors(params: ChannelNameAndOptions) {
  const [connectionError, setConnectionError] = useState<Types.ErrorInfo | null>(null);
  const [channelError, setChannelError] = useState<Types.ErrorInfo | null>(null);

  useConnectionStateListener(
    ['suspended', 'failed', 'disconnected'],
    (stateChange) => {
      if (stateChange.reason) {
        params.onConnectionError?.(stateChange.reason);
        setConnectionError(stateChange.reason);
      }
    },
    params.id
  );

  useConnectionStateListener(
    ['connected', 'closed'],
    () => {
      setConnectionError(null);
    },
    params.id
  );

  useChannelStateListener(params, ['suspended', 'failed', 'detached'], (stateChange) => {
    if (stateChange.reason) {
      params.onChannelError?.(stateChange.reason);
      setChannelError(stateChange.reason);
    }
  });

  useChannelStateListener(params, ['attached'], () => {
    setChannelError(null);
  });

  return { connectionError, channelError };
}
