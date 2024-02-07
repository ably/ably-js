import React from 'react';
import { type Types } from 'ably';
import { it, beforeEach, describe, expect, vi } from 'vitest';
import { usePresence } from './usePresence.js';
import { render, screen, act, waitFor } from '@testing-library/react';
import { FakeAblySdk, FakeAblyChannels } from '../fakes/ably.js';
import { AblyProvider } from '../AblyProvider.js';

function renderInCtxProvider(client: FakeAblySdk, children: React.ReactNode | React.ReactNode[]) {
  return render(<AblyProvider client={client as unknown as Types.RealtimePromise}>{children}</AblyProvider>);
}

const testChannelName = 'testChannel';

describe('usePresence', () => {
  let channels: FakeAblyChannels;
  let ablyClient: FakeAblySdk;
  let otherClient: FakeAblySdk;

  beforeEach(() => {
    channels = new FakeAblyChannels([testChannelName]);
    ablyClient = new FakeAblySdk().connectTo(channels);
    otherClient = new FakeAblySdk().connectTo(channels);
  });

  it('presence data is not visible on first render as it runs in an effect', async () => {
    renderInCtxProvider(ablyClient, <UsePresenceComponent></UsePresenceComponent>);

    const values = screen.getByRole('presence').innerHTML;
    expect(values).toBe('');

    await act(async () => {
      await wait(2);
      // To let react run its updates so we don't see warnings in the test output
    });
  });

  it('presence data available after effect runs', async () => {
    renderInCtxProvider(ablyClient, <UsePresenceComponent></UsePresenceComponent>);

    await act(async () => {
      await wait(2);
    });

    const values = screen.getByRole('presence').innerHTML;
    expect(values).toContain(`"bar"`);
  });

  it('presence data updates when update function is triggered', async () => {
    renderInCtxProvider(ablyClient, <UsePresenceComponent></UsePresenceComponent>);

    await act(async () => {
      const button = screen.getByText(/Update/i);
      button.click();
    });

    const values = screen.getByRole('presence').innerHTML;
    expect(values).toContain(`"baz"`);
  });

  it('presence data respects updates made by other clients', async () => {
    renderInCtxProvider(ablyClient, <UsePresenceComponent></UsePresenceComponent>);

    await act(async () => {
      otherClient.channels.get(testChannelName).presence.enter('boop');
    });

    const presenceElement = screen.getByRole('presence');
    const values = presenceElement.innerHTML;
    expect(presenceElement.children.length).toBe(2);
    expect(values).toContain(`"bar"`);
    expect(values).toContain(`"boop"`);
  });

  it('presence API works with type information provided', async () => {
    renderInCtxProvider(ablyClient, <TypedUsePresenceComponent></TypedUsePresenceComponent>);

    await act(async () => {
      await wait(2);
    });

    const values = screen.getByRole('presence').innerHTML;
    expect(values).toContain(`"data":{"foo":"bar"}`);
  });

  it('skip param', async () => {
    renderInCtxProvider(ablyClient, <UsePresenceComponent skip={true}></UsePresenceComponent>);

    await act(async () => {
      await wait(2);
    });

    const values = screen.getByRole('presence').innerHTML;
    expect(values).to.not.contain(`"bar"`);
  });

  it('usePresence works with multiple clients', async () => {
    renderInCtxProvider(
      ablyClient,
      <AblyProvider id="otherClient" client={otherClient as unknown as Types.RealtimePromise}>
        <UsePresenceComponentMultipleClients />
      </AblyProvider>
    );

    await act(async () => {
      const button = screen.getByText(/Update/i);
      button.click();
      await wait(2);
    });

    const values = screen.getByRole('presence').innerHTML;
    expect(values).toContain(`"data":"baz1"`);
    expect(values).toContain(`"data":"baz2"`);
  });

  it('handles channel errors', async () => {
    const onChannelError = vi.fn();
    const reason = { message: 'foo' };

    renderInCtxProvider(
      ablyClient,
      <UsePresenceStateErrorsComponent onChannelError={onChannelError}></UsePresenceStateErrorsComponent>
    );

    const channelErrorElem = screen.getByRole('channelError');
    expect(onChannelError).toHaveBeenCalledTimes(0);
    expect(channelErrorElem.innerHTML).toEqual('');

    await act(async () => {
      ablyClient.channels.get('blah').emit('failed', {
        reason,
      });
    });

    expect(channelErrorElem.innerHTML).toEqual(reason.message);
    expect(onChannelError).toHaveBeenCalledTimes(1);
    expect(onChannelError).toHaveBeenCalledWith(reason);
  });

  it('handles connection errors', async () => {
    const onConnectionError = vi.fn();
    const reason = { message: 'foo' };

    renderInCtxProvider(
      ablyClient,
      <UsePresenceStateErrorsComponent onConnectionError={onConnectionError}></UsePresenceStateErrorsComponent>
    );

    const connectionErrorElem = screen.getByRole('connectionError');
    expect(onConnectionError).toHaveBeenCalledTimes(0);
    expect(connectionErrorElem.innerHTML).toEqual('');

    await act(async () => {
      ablyClient.connection.emit('failed', {
        reason,
      });
    });

    expect(connectionErrorElem.innerHTML).toEqual(reason.message);
    expect(onConnectionError).toHaveBeenCalledTimes(1);
    expect(onConnectionError).toHaveBeenCalledWith(reason);
  });

  it('should not affect existing presence listeners when hook unmounts', async () => {
    const enterListener = vi.fn();
    const leaveListener = vi.fn();
    ablyClient.channels.get(testChannelName).presence.subscribe('enter', enterListener);
    ablyClient.channels.get(testChannelName).presence.subscribe('leave', leaveListener);

    const { unmount } = renderInCtxProvider(ablyClient, <UsePresenceComponent></UsePresenceComponent>);

    // Wait for `usePresence` to be rendered and effects applied
    await waitFor(() => {
      expect(enterListener).toHaveBeenCalledWith(expect.objectContaining({ data: 'bar' }));
    });

    unmount();

    // Wait for `usePresence` to be fully unmounted and effect's clean-ups applied
    await waitFor(() => {
      expect(leaveListener).toHaveBeenCalledOnce();
    });

    ablyClient.channels.get(testChannelName).presence.enter('baz');

    // Check that listener still exists
    await waitFor(() => {
      expect(enterListener).toHaveBeenCalledWith(expect.objectContaining({ data: 'baz' }));
    });
  });
});

const UsePresenceComponent = ({ skip }: { skip?: boolean }) => {
  const { presenceData, updateStatus } = usePresence({ channelName: testChannelName, skip }, 'bar');

  const presentUsers = presenceData.map((presence, index) => {
    return (
      <li key={index}>
        {presence.clientId} - {JSON.stringify(presence)}
      </li>
    );
  });

  return (
    <>
      <button
        onClick={() => {
          updateStatus('baz');
        }}
      >
        Update
      </button>
      <ul role="presence">{presentUsers}</ul>
    </>
  );
};

const UsePresenceComponentMultipleClients = () => {
  const { presenceData: val1, updateStatus: update1 } = usePresence({ channelName: testChannelName }, 'foo');
  const { updateStatus: update2 } = usePresence({ channelName: testChannelName, id: 'otherClient' }, 'bar');

  const presentUsers = val1.map((presence, index) => {
    return (
      <li key={index}>
        {presence.clientId} - {JSON.stringify(presence)}
      </li>
    );
  });

  return (
    <>
      <button
        onClick={() => {
          update1('baz1');
          update2('baz2');
        }}
      >
        Update
      </button>
      <ul role="presence">{presentUsers}</ul>
    </>
  );
};

interface UsePresenceStateErrorsComponentProps {
  onConnectionError?: (err: Types.ErrorInfo) => unknown;
  onChannelError?: (err: Types.ErrorInfo) => unknown;
}

const UsePresenceStateErrorsComponent = ({
  onConnectionError,
  onChannelError,
}: UsePresenceStateErrorsComponentProps) => {
  const { connectionError, channelError } = usePresence({
    channelName: 'blah',
    onConnectionError,
    onChannelError,
  });

  return (
    <>
      <p role="connectionError">{connectionError?.message}</p>
      <p role="channelError">{channelError?.message}</p>
    </>
  );
};

interface MyPresenceType {
  foo: string;
}

const TypedUsePresenceComponent = () => {
  const { presenceData } = usePresence<MyPresenceType>('testChannelName', {
    foo: 'bar',
  });

  return <div role="presence">{JSON.stringify(presenceData)}</div>;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
