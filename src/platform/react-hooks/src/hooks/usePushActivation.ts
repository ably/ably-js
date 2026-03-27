import type * as Ably from 'ably';
import { useCallback } from 'react';
import { useAbly } from './useAbly.js';

export interface PushActivationResult {
  activate: () => Promise<void>;
  deactivate: () => Promise<void>;
}

export function usePushActivation(ablyId?: string): PushActivationResult {
  const ably = useAbly(ablyId);

  const activate = useCallback(() => ably.push.activate(), [ably]);
  const deactivate = useCallback(() => ably.push.deactivate(), [ably]);

  return { activate, deactivate };
}
