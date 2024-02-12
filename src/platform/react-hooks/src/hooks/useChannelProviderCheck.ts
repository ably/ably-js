import React, { useEffect } from 'react';
import { getContext } from '../AblyProvider.js';
import { ChannelNameAndOptions } from '../AblyReactHooks.js';

export function useChannelProviderCheck(options: ChannelNameAndOptions) {
  const channelToOptions = React.useContext(getContext(options.id))._channelToOptions;

  useEffect(() => {
    const hasChannelProvider = Object.keys(channelToOptions).includes(options.channelName);
    if (!hasChannelProvider) {
      throw new Error(
        `Could not find options for a channel. Make sure your channel based hooks (usePresnce, useChannel, useChannelStateListener) are called inside an <ChannelProvider>`
      );
    }
  });
}
