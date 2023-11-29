// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as Ably from 'ably';
import { Types } from '../../../../ably.js';
import React, { useMemo } from 'react';

const canUseSymbol = typeof Symbol === 'function' && typeof Symbol.for === 'function';

interface AblyProviderProps {
  children?: React.ReactNode | React.ReactNode[] | null;
  client?: Ably.Types.AbstractRealtime;
  id?: string;
}

type AblyContextType = React.Context<Types.AbstractRealtime>;

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
  if (!client) {
    throw new Error('AblyProvider: the `client` prop is required');
  }

  const realtime = useMemo(() => client, [client]);

  let context = getContext(id);
  if (!context) {
    context = ctxMap[id] = React.createContext(realtime ?? 1);
  }

  return <context.Provider value={realtime}>{children}</context.Provider>;
};
