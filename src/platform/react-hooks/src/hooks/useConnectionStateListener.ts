import * as Ably from 'ably';
import { useAbly } from './useAbly.js';
import { useEventListener } from './useEventListener.js';

type ConnectionStateListener = (stateChange: Ably.ConnectionStateChange) => any;

export function useConnectionStateListener(listener: ConnectionStateListener, id?: string);

export function useConnectionStateListener(
  state: Ably.ConnectionState | Ably.ConnectionState[],
  listener: ConnectionStateListener,
  id?: string
);

export function useConnectionStateListener(
  stateOrListener?: Ably.ConnectionState | Ably.ConnectionState[] | ConnectionStateListener,
  listenerOrId?: string | ConnectionStateListener,
  id = 'default'
) {
  const _id = typeof listenerOrId === 'string' ? listenerOrId : id;
  const ably = useAbly(_id);

  const listener = typeof listenerOrId === 'function' ? listenerOrId : (stateOrListener as ConnectionStateListener);
  const state = typeof stateOrListener !== 'function' ? stateOrListener : undefined;

  useEventListener<Ably.ConnectionState, Ably.ConnectionStateChange>(ably.connection, listener, state);
}
