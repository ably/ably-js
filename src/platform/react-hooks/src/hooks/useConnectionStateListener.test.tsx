import React from 'react';
import { it, beforeEach, describe, expect } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import { FakeAblySdk } from '../fakes/ably.js';
import { Types } from 'ably';
import { act } from 'react-dom/test-utils';
import { AblyProvider } from '../AblyProvider.js';
import { useConnectionStateListener } from './useConnectionStateListener.js';

function renderInCtxProvider(client: FakeAblySdk, children: React.ReactNode | React.ReactNode[]) {
  return render(<AblyProvider client={client as unknown as Types.RealtimePromise}>{children}</AblyProvider>);
}

describe('useConnectionStateListener', () => {
  let ablyClient: FakeAblySdk;

  beforeEach(() => {
    ablyClient = new FakeAblySdk();
  });

  it('can register a connection state listener for all state changes', async () => {
    renderInCtxProvider(ablyClient, <UseConnectionStateListenerComponent></UseConnectionStateListenerComponent>);

    act(() => {
      ablyClient.connection.emit('connected', { current: 'connected' });
    });

    expect(screen.getAllByRole('connectionState')[0].innerHTML).toEqual('connected');
  });

  it('can register a connection state listener for named state changes', async () => {
    renderInCtxProvider(
      ablyClient,
      <UseConnectionStateListenerComponentNamedEvents event={'failed'}></UseConnectionStateListenerComponentNamedEvents>
    );

    act(() => {
      ablyClient.connection.emit('connected', { current: 'connected' });
    });

    expect(screen.getAllByRole('connectionState')[0].innerHTML).toEqual('initialized');

    act(() => {
      ablyClient.connection.emit('failed', { current: 'failed' });
    });

    expect(screen.getAllByRole('connectionState')[0].innerHTML).toEqual('failed');
  });

  it('can register a connection state listener for an array of named state changes', async () => {
    renderInCtxProvider(
      ablyClient,
      <UseConnectionStateListenerComponentNamedEvents
        event={['failed', 'suspended']}
      ></UseConnectionStateListenerComponentNamedEvents>
    );

    act(() => {
      ablyClient.connection.emit('connected', { current: 'connected' });
    });

    expect(screen.getAllByRole('connectionState')[0].innerHTML).toEqual('initialized');

    act(() => {
      ablyClient.connection.emit('suspended', { current: 'suspended' });
    });

    expect(screen.getAllByRole('connectionState')[0].innerHTML).toEqual('suspended');
  });
});

const UseConnectionStateListenerComponent = () => {
  const [connectionState, setConnectionState] = useState<Types.ConnectionState>('initialized');

  useConnectionStateListener((stateChange) => {
    setConnectionState(stateChange.current);
  });

  return <p role="connectionState">{connectionState}</p>;
};

interface UseConnectionStateListenerComponentNamedEventsProps {
  event: Types.ConnectionState | Types.ConnectionState[];
}

const UseConnectionStateListenerComponentNamedEvents = ({
  event,
}: UseConnectionStateListenerComponentNamedEventsProps) => {
  const [channelState, setChannelState] = useState<Types.ConnectionState>('initialized');

  useConnectionStateListener(event, (stateChange) => {
    setChannelState(stateChange.current);
  });

  return <p role="connectionState">{channelState}</p>;
};
