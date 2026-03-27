import React from 'react';
import type * as Ably from 'ably';
import { it, beforeEach, describe, expect, vi } from 'vitest';
import { usePushActivation } from './usePushActivation.js';
import { renderHook, act } from '@testing-library/react';
import { FakeAblySdk, FakeAblyChannels } from '../fakes/ably.js';
import { AblyProvider } from '../AblyProvider.js';

describe('usePushActivation', () => {
  let channels: FakeAblyChannels;
  let ablyClient: FakeAblySdk;

  beforeEach(() => {
    channels = new FakeAblyChannels([]);
    ablyClient = new FakeAblySdk().connectTo(channels);
    // Add a fake push object to the client
    (ablyClient as any).push = {
      activate: vi.fn().mockResolvedValue(undefined),
      deactivate: vi.fn().mockResolvedValue(undefined),
    };
  });

  function renderWithProvider() {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AblyProvider client={ablyClient as unknown as Ably.RealtimeClient}>{children}</AblyProvider>
    );

    return renderHook(() => usePushActivation(), { wrapper });
  }

  /** @nospec */
  it('returns activate and deactivate functions', () => {
    const { result } = renderWithProvider();

    expect(result.current.activate).toBeTypeOf('function');
    expect(result.current.deactivate).toBeTypeOf('function');
  });

  /** @nospec */
  it('calls client.push.activate when activate is called', async () => {
    const { result } = renderWithProvider();

    await act(async () => {
      await result.current.activate();
    });

    expect((ablyClient as any).push.activate).toHaveBeenCalledOnce();
  });

  /** @nospec */
  it('calls client.push.deactivate when deactivate is called', async () => {
    const { result } = renderWithProvider();

    await act(async () => {
      await result.current.deactivate();
    });

    expect((ablyClient as any).push.deactivate).toHaveBeenCalledOnce();
  });

  /** @nospec */
  it('returns stable callback references across re-renders', () => {
    const { result, rerender } = renderWithProvider();

    const firstRender = {
      activate: result.current.activate,
      deactivate: result.current.deactivate,
    };

    rerender();

    expect(result.current.activate).toBe(firstRender.activate);
    expect(result.current.deactivate).toBe(firstRender.deactivate);
  });
});
