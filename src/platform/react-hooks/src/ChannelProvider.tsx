import React, { useEffect } from 'react';
import * as Ably from 'ably';
import { getContext } from './AblyProvider.js';
import * as Utils from './utils/utils.js';
import { channelOptionsWithAgent } from './AblyReactHooks.js';

interface ChannelProviderProps {
  id?: string;
  channelName: string;
  options?: Ably.Types.ChannelOptions;
  children?: React.ReactNode | React.ReactNode[] | null;
}

export const ChannelProvider = ({ id = 'default', channelName, options, children }: ChannelProviderProps) => {
  const { client, channelToOptions } = React.useContext(getContext(id));

  const channel = client.channels.get(channelName);

  useEffect(() => {
    if (channelToOptions[channelName]) {
      throw new Error('You can not use more than one `ChannelProvider` with the same channel name');
    }
    channel.setOptions(channelOptionsWithAgent(options));
    channelToOptions[channelName] = options ?? {};
    return () => {
      delete channelToOptions[channelName];
    };
  }, [channel, channelName, options, channelToOptions]);

  useEffect(() => {
    const handleChannelAttached = () => {
      if (hasOptionsChanged(channel, options)) {
        throw new Error('You can not use `RealtimeChannel.setOption()` along with `ChannelProvider`');
      }
    };
    channel.on('attached', handleChannelAttached);
    return () => {
      channel.off('attached', handleChannelAttached);
    };
  }, [channel, options]);

  return <React.Fragment>{children}</React.Fragment>;
};

const hasOptionsChanged = (channel: Ably.Types.RealtimeChannelPromise, options: Ably.Types.ChannelOptions) => {
  // Don't check against the `agent` param - it isn't returned in the ATTACHED message
  const requestedParams = Utils.omitAgent(options.params);
  const existingParams = Utils.omitAgent(channel.params);

  if (Object.keys(requestedParams).length !== Object.keys(existingParams).length) {
    return true;
  }

  if (!Utils.shallowEquals(existingParams, requestedParams)) {
    return true;
  }

  return !Utils.arrEquals(options.modes ?? [], channel.modes ?? []);
};
