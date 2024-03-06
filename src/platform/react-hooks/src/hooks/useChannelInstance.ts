import React from 'react';
import { AblyContext, ChannelContextProps } from '../AblyContext.js';

export function useChannelInstance(ablyId = 'default', channelName: string): ChannelContextProps {
  const channelContext = React.useContext(AblyContext)[ablyId]._channelNameToChannelContext[channelName];

  if (!channelContext) {
    throw new Error(
      `Could not find a parent ChannelProvider in the component tree for channelName="${channelName}". Make sure your channel based hooks (usePresence, useChannel, useChannelStateListener) are called inside a <ChannelProvider> component`,
    );
  }

  return channelContext;
}
