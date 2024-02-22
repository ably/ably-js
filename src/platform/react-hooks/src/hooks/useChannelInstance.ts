import React from 'react';
import { getContext } from '../AblyProvider.js';

export function useChannelInstance(id: string, channelName: string) {
  const channel = React.useContext(getContext(id))._channelNameToInstance[channelName];

  if (!channel) {
    throw new Error(
      `Could not find channel instance for name="${channelName}". Make sure your channel based hooks (usePresence, useChannel, useChannelStateListener) are called inside an <ChannelProvider>`
    );
  }

  return channel;
}
