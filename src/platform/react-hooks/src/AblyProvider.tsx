// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as Ably from 'ably';
import { Types } from '../../../../ably.js';
import React, { useMemo } from 'react';

const version = '1.2.45';

const canUseSymbol = typeof Symbol === 'function' && typeof Symbol.for === 'function';

interface AblyProviderProps {
  children?: React.ReactNode | React.ReactNode[] | null;
  client?: Ably.Types.RealtimePromise;
  id?: string;
}

type AblyContextType = React.Context<Types.RealtimePromise>;

// An object is appended to `React.createContext` which stores all contexts
// indexed by id, which is used by useAbly to find the correct context when an
// id is provided.
type ContextMap = Record<string, AblyContextType>;
export const contextKey = canUseSymbol ? Symbol.for('__ABLY_CONTEXT__') : '__ABLY_CONTEXT__';

const ctxMap: ContextMap = typeof globalThis !== 'undefined' ? (globalThis[contextKey] = {}) : {};

export function getContext(ctxId = 'default'): AblyContextType {
  return ctxMap[ctxId];
}

let hasSentAgent = false;

export const AblyProvider = ({ client, children, id = 'default' }: AblyProviderProps) => {
  if (!client) {
    throw new Error('AblyProvider: the `client` prop is required');
  }

  if (!(client instanceof Ably.Realtime) && !client?.options?.promises) {
    throw new Error('AblyProvider: the `client` prop must take an instance of Ably.Realtime.Promise');
  }

  const realtime = useMemo(() => client, [client]);

  let context = getContext(id);
  if (!context) {
    context = ctxMap[id] = React.createContext(realtime ?? 1);
  }

  React.useEffect(() => {
    if (!hasSentAgent) {
      hasSentAgent = true;
      realtime.request('GET', '/time', null, null, {
        'Ably-Agent': `react-hooks-time-ping/${version}`,
      });
    }
  });

  return <context.Provider value={realtime}>{children}</context.Provider>;
};
