// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as Ably from 'ably';
import { Types } from '../../../../ably.js';
import React, { useMemo } from 'react';

const version = '1.2.44';

const canUseSymbol = typeof Symbol === 'function' && typeof Symbol.for === 'function';

/**
 * Wrapper around Ably.Realtime.Promise which injects the 'react-hooks' agent
 */
export class Realtime extends Ably.Realtime.Promise {
  constructor(options: string | Types.ClientOptions) {
    let opts: Types.ClientOptions;

    if (typeof options === 'string') {
      opts = {
        key: options,
      } as Types.ClientOptions;
    } else {
      opts = { ...options };
    }

    (opts as any).agents = { 'react-hooks': version };

    super(opts);
  }
}

interface AblyProviderProps {
  children?: React.ReactNode | React.ReactNode[] | null;
  client?: Ably.Types.RealtimePromise;
  options?: Ably.Types.ClientOptions;
  id?: string;
}

type AblyContextType = React.Context<Realtime>;

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

export const AblyProvider = ({ client, children, options, id = 'default' }: AblyProviderProps) => {
  if (!client && !options) {
    throw new Error('No client or options');
  }

  if (client && options) {
    throw new Error('Provide client or options, not both');
  }

  const realtime = useMemo(() => client || new Realtime(options as Ably.Types.ClientOptions), [client, options]);

  let context = getContext(id);
  if (!context) {
    context = ctxMap[id] = React.createContext(realtime ?? 1);
  }

  React.useEffect(() => {
    if (!hasSentAgent) {
      hasSentAgent = true;
      realtime.request('GET', '/time', {
        agent: `react-hooks-time-ping/${version}`,
      });
    }
  });

  // If options have been provided, the client cannot be accessed after the provider has unmounted, so close it
  React.useEffect(() => {
    if (options) {
      return () => {
        realtime.close();
      };
    }
  }, [realtime, options]);

  return <context.Provider value={realtime}>{children}</context.Provider>;
};
