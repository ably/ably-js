import React, { useEffect, useMemo } from 'react';
import * as Ably from 'ably';
import { type AblyContextProps, getContext } from './AblyProvider.js';
import { channelOptionsWithAgent } from './AblyReactHooks.js';

interface ChannelProviderProps {
  id?: string;
  channelName: string;
  options?: Ably.ChannelOptions;
  deriveOptions?: Ably.DeriveOptions;
  children?: React.ReactNode | React.ReactNode[] | null;
}

export const ChannelProvider = ({
  id = 'default',
  channelName,
  options,
  deriveOptions,
  children,
}: ChannelProviderProps) => {
  const context = getContext(id);
  const { client, _channelNameToChannelContext } = React.useContext(context);

  if (_channelNameToChannelContext[channelName]) {
    throw new Error('You can not use more than one `ChannelProvider` with the same channel name');
  }

  const derived = Boolean(deriveOptions);
  const channel = derived ? client.channels.getDerived(channelName, deriveOptions) : client.channels.get(channelName);

  const value: AblyContextProps = useMemo(() => {
    return {
      client,
      _channelNameToChannelContext: {
        ..._channelNameToChannelContext,
        [channelName]: {
          channel,
          derived,
        },
      },
    };
  }, [derived, client, channel, channelName, _channelNameToChannelContext]);

  useEffect(() => {
    channel.setOptions(channelOptionsWithAgent(options));
  }, [channel, options]);

  return <context.Provider value={value}>{children}</context.Provider>;
};
