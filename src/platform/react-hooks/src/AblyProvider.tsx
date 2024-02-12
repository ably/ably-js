import * as Ably from 'ably';
import React, { useMemo } from 'react';

const canUseSymbol = typeof Symbol === 'function' && typeof Symbol.for === 'function';

interface AblyProviderProps {
  children?: React.ReactNode | React.ReactNode[] | null;
  client?: Ably.RealtimeClient;
  id?: string;
}

interface AblyContextProps {
  client: Ably.RealtimeClient;
  _channelToOptions: Record<string, Ably.ChannelOptions>;
}

type AblyContextType = React.Context<AblyContextProps>;

// An object is appended to `React.createContext` which stores all contexts
// indexed by id, which is used by useAbly to find the correct context when an
// id is provided.
type ContextMap = Record<string, AblyContextType>;
export const contextKey = canUseSymbol ? Symbol.for('__ABLY_CONTEXT__') : '__ABLY_CONTEXT__';

const ctxMap: ContextMap = typeof globalThis !== 'undefined' ? (globalThis[contextKey] = {}) : {};

export function getContext(ctxId = 'default'): AblyContextType {
  return ctxMap[ctxId];
}

export const AblyProvider = ({ client, children, id = 'default' }: AblyProviderProps) => {
  const value: AblyContextProps = useMemo(
    () => ({
      client,
      _channelToOptions: {},
    }),
    [client]
  );

  if (!client) {
    throw new Error('AblyProvider: the `client` prop is required');
  }

  let context = getContext(id);
  if (!context) {
    context = ctxMap[id] = React.createContext({ client, _channelToOptions: {} });
  }

  return <context.Provider value={value}>{children}</context.Provider>;
};
