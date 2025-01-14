import React, { useLayoutEffect, useMemo, useState } from 'react';
import * as Ably from 'ably';
import { AblyContext, type AblyContextValue } from './AblyContext.js';
import { channelOptionsWithAgent } from './AblyReactHooks.js';
import { useConnectionStateListener } from './hooks/useConnectionStateListener.js';
import { INACTIVE_CONNECTION_STATES } from './hooks/constants.js';

interface ChannelProviderProps {
  ablyId?: string;
  channelName: string;
  options?: Ably.ChannelOptions;
  deriveOptions?: Ably.DeriveOptions;
  skip?: boolean;
  children?: React.ReactNode | React.ReactNode[] | null;
}

export const ChannelProvider = ({
  ablyId = 'default',
  channelName,
  options,
  deriveOptions,
  skip,
  children,
}: ChannelProviderProps) => {
  const context = React.useContext(AblyContext);
  const { client, _channelNameToChannelContext } = context[ablyId];
  const [connectionState, setConnectionState] = useState(client.connection.state);
  useConnectionStateListener((stateChange) => {
    setConnectionState(stateChange.current);
  }, ablyId);

  if (_channelNameToChannelContext[channelName]) {
    throw new Error('You can not use more than one `ChannelProvider` with the same channel name');
  }

  const derived = Boolean(deriveOptions);
  const channel = derived ? client.channels.getDerived(channelName, deriveOptions) : client.channels.get(channelName);

  const value: AblyContextValue = useMemo(() => {
    return {
      ...context,
      [ablyId]: {
        client,
        _channelNameToChannelContext: {
          ..._channelNameToChannelContext,
          [channelName]: {
            channel,
            derived,
          },
        },
      },
    };
  }, [derived, client, channel, channelName, _channelNameToChannelContext, ablyId, context]);

  useLayoutEffect(() => {
    channel.setOptions(channelOptionsWithAgent(options));
  }, [channel, options]);

  const shouldAttachToTheChannel = !skip && !INACTIVE_CONNECTION_STATES.includes(connectionState);

  useLayoutEffect(() => {
    if (shouldAttachToTheChannel) {
      channel.attach();
    }

    return () => {
      if (channel.state !== 'failed') {
        channel.detach();
      }
    };
  }, [shouldAttachToTheChannel, channel]);

  return <AblyContext.Provider value={value}>{children}</AblyContext.Provider>;
};
