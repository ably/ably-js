import * as Ably from 'ably';
import React, { useMemo } from 'react';

interface AblyProviderProps {
  children?: React.ReactNode | React.ReactNode[] | null;
  client?: Ably.RealtimeClient;
  ablyId?: string;
}

export interface AblyContextProviderProps {
  client: Ably.RealtimeClient;
  _channelNameToChannelContext: Record<string, ChannelContextProps>;
}

export interface ChannelContextProps {
  channel: Ably.RealtimeChannel;
  derived?: boolean;
}

// An object which stores all provider options indexed by provider id,
// which is used to get options set by specific `AblyProvider` after calling `React.useContext`.
export type AblyContextType = Record<string, AblyContextProviderProps>;

export const AblyContext = React.createContext<AblyContextType>({});

export const AblyProvider = ({ client, children, ablyId = 'default' }: AblyProviderProps) => {
  if (!client) {
    throw new Error('AblyProvider: the `client` prop is required');
  }

  const context = React.useContext(AblyContext);

  const value: AblyContextType = useMemo(() => {
    return { ...context, [ablyId]: { client, _channelNameToChannelContext: {} } };
  }, [context, client, ablyId]);

  return <AblyContext.Provider value={value}>{children}</AblyContext.Provider>;
};
