import React from 'react';
import { getContext } from '../AblyProvider.js';

export function useChannelInstance(id: string, channelName: string) {
  const channel = React.useContext(getContext(id))._channelNameToInstance[channelName];

  if (!channel) {
    throw new Error(
      `Could not find a parent ChannelProvider in the component tree for name="${channelName}". Make sure your channel based hooks (usePresence, useChannel, useChannelStateListener) are called inside a <ChannelProvider> component`
    );
  }

  return channel;
}
