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
  const { client, _channelNameToInstance } = React.useContext(context);

  if (_channelNameToInstance[channelName]) {
    throw new Error('You can not use more than one `ChannelProvider` with the same channel name');
  }

  const channel = deriveOptions
    ? client.channels.getDerived(channelName, deriveOptions)
    : client.channels.get(channelName);

  const value: AblyContextProps = useMemo(() => {
    return {
      client,
      _channelNameToInstance: {
        ..._channelNameToInstance,
        [channelName]: channel,
      },
    };
  }, [client, channel, channelName, _channelNameToInstance]);

  useEffect(() => {
    channel.setOptions(channelOptionsWithAgent(options));
  }, [channel, options]);

  return <context.Provider value={value}>{children}</context.Provider>;
};
