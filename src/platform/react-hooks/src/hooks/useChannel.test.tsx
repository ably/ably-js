import React, { useEffect, useState } from 'react';
import { it, beforeEach, describe, expect, vi } from 'vitest';
import { useChannel } from './useChannel.js';
import { render, screen, waitFor } from '@testing-library/react';
import { FakeAblySdk, FakeAblyChannels } from '../fakes/ably.js';
import { Types } from '../../../../../ably.js';
import { act } from 'react-dom/test-utils';
import { AblyProvider } from '../AblyProvider.js';

function renderInCtxProvider(client: FakeAblySdk, children: React.ReactNode | React.ReactNode[]) {
  return render(<AblyProvider client={client as unknown as Types.RealtimePromise}>{children}</AblyProvider>);
}

describe('useChannel', () => {
  let channels: FakeAblyChannels;
  let ablyClient: FakeAblySdk;
  let otherClient: FakeAblySdk;

  beforeEach(() => {
    channels = new FakeAblyChannels(['blah']);
    ablyClient = new FakeAblySdk().connectTo(channels);
    otherClient = new FakeAblySdk().connectTo(channels);
  });

  it('component can useChannel and renders nothing by default', async () => {
    renderInCtxProvider(ablyClient, <UseChannelComponent></UseChannelComponent>);
    const messageUl = screen.getAllByRole('messages')[0];

    expect(messageUl.childElementCount).toBe(0);
  });

  it('component updates when message arrives', async () => {
    renderInCtxProvider(ablyClient, <UseChannelComponent></UseChannelComponent>);

    await act(async () => {
      await otherClient.channels.get('blah').publish({ text: 'message text' });
    });

    const messageUl = screen.getAllByRole('messages')[0];
    expect(messageUl.childElementCount).toBe(1);
    expect(messageUl.children[0].innerHTML).toBe('message text');
  });

  it('component updates when multiple messages arrive', async () => {
    renderInCtxProvider(ablyClient, <UseChannelComponent></UseChannelComponent>);

    await act(async () => {
      await otherClient.channels.get('blah').publish({ text: 'message text1' });
      await otherClient.channels.get('blah').publish({ text: 'message text2' });
    });

    const messageUl = screen.getAllByRole('messages')[0];
    expect(messageUl.children[0].innerHTML).toBe('message text1');
    expect(messageUl.children[1].innerHTML).toBe('message text2');
  });

  it('useChannel works with multiple clients', async () => {
    renderInCtxProvider(
      ablyClient,
      <AblyProvider client={otherClient as unknown as Types.RealtimePromise} id="otherClient">
        <UseChannelComponentMultipleClients />
      </AblyProvider>
    );

    await act(async () => {
      await ablyClient.channels.get('blah').publish({ text: 'message text1' });
      await otherClient.channels.get('bleh').publish({ text: 'message text2' });
    });

    const messageUl = screen.getAllByRole('messages')[0];
    expect(messageUl.children[0].innerHTML).toBe('message text1');
    expect(messageUl.children[1].innerHTML).toBe('message text2');
  });

  it('handles channel errors', async () => {
    const onChannelError = vi.fn();
    const reason = { message: 'foo' };

    renderInCtxProvider(
      ablyClient,
      <UseChannelStateErrorsComponent onChannelError={onChannelError}></UseChannelStateErrorsComponent>
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
      <UseChannelStateErrorsComponent onConnectionError={onConnectionError}></UseChannelStateErrorsComponent>
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

  it('skip param', async () => {
    renderInCtxProvider(ablyClient, <UseChannelComponent skip={true}></UseChannelComponent>);

    await act(async () => {
      await otherClient.channels.get('blah').publish({ text: 'message text' });
    });

    const messageUl = screen.getAllByRole('messages')[0];
    expect(messageUl.childElementCount).toBe(0);
  });

  it('should use the latest version of the message callback', async () => {
    let callbackCount = 0;

    const TestComponent = () => {
      const [count, setCount] = React.useState(0);

      useChannel('blah', () => {
        callbackCount++;
        setCount(count + 1);
      });

      return <div role="counter">{count}</div>;
    };

    renderInCtxProvider(ablyClient, <TestComponent />);

    await act(async () => {
      ablyClient.channels.get('blah').publish({ text: 'test message 1' });
    });

    await act(async () => {
      ablyClient.channels.get('blah').publish({ text: 'test message 2' });
    });

    expect(screen.getByRole('counter').innerHTML).toEqual('2');
    expect(callbackCount).toBe(2);
  });

  it('should re-subscribe if event name has changed', async () => {
    const channel = ablyClient.channels.get('blah');
    channel.subscribe = vi.fn();
    channel.unsubscribe = vi.fn();

    const newEventName = 'event2';

    renderInCtxProvider(ablyClient, <ChangingEventComponent newEventName={newEventName} />);

    await waitFor(() => expect(channel.subscribe).toHaveBeenCalledWith('event1', expect.any(Function)));

    await waitFor(() => expect(channel.unsubscribe).toHaveBeenCalledWith('event1', expect.any(Function)));

    expect(channel.subscribe).toHaveBeenCalledWith(newEventName, expect.any(Function));
  });
});

describe('useChannel with deriveOptions', () => {
  const Channels = {
    tasks: 'tasks',
    alerts: 'alerts',
  };

  let channels: FakeAblyChannels;
  let ablyClient: FakeAblySdk;
  let anotherClient: FakeAblySdk;
  let yetAnotherClient: FakeAblySdk;

  beforeEach(() => {
    channels = new FakeAblyChannels([Channels.tasks, Channels.alerts]);
    ablyClient = new FakeAblySdk().connectTo(channels);
    anotherClient = new FakeAblySdk().connectTo(channels);
    yetAnotherClient = new FakeAblySdk().connectTo(channels);
  });

  it('component can use "useChannel" with "deriveOptions" and renders nothing by default', async () => {
    renderInCtxProvider(
      ablyClient,
      <UseDerivedChannelComponent channelName={Channels.tasks} deriveOptions={{ filter: '' }} />
    );
    const messageUl = screen.getAllByRole('derived-channel-messages')[0];

    expect(messageUl.childElementCount).toBe(0);
  });

  it('component updates when new message arrives', async () => {
    renderInCtxProvider(
      ablyClient,
      <UseDerivedChannelComponent
        channelName={Channels.tasks}
        deriveOptions={{ filter: 'headers.user == `"robert.pike@domain.io"`' }}
      />
    );
    await act(async () => {
      await anotherClient.channels
        .get(Channels.tasks)
        .publish({ text: 'A new task for you', extras: { headers: { user: 'robert.pike@domain.io' } } });
    });

    const messageUl = screen.getAllByRole('derived-channel-messages')[0];
    expect(messageUl.childElementCount).toBe(1);
    expect(messageUl.children[0].innerHTML).toBe('A new task for you');
  });

  it('component will not update if message filtered out', async () => {
    renderInCtxProvider(
      ablyClient,
      <UseDerivedChannelComponent
        channelName={Channels.tasks}
        deriveOptions={{ filter: 'headers.user == `"robert.pike@domain.io"`' }}
      />
    );
    await act(async () => {
      await anotherClient.channels
        .get(Channels.tasks)
        .publish({ text: 'This one is for another Rob', extras: { headers: { user: 'robert.griesemer@domain.io' } } });
    });

    const messageUl = screen.getAllByRole('derived-channel-messages')[0];
    expect(messageUl.childElementCount).toBe(0);
  });

  it('component will update if some messages qualify', async () => {
    renderInCtxProvider(
      ablyClient,
      <UseDerivedChannelComponent
        channelName={Channels.tasks}
        deriveOptions={{ filter: 'headers.user == `"robert.pike@domain.io"` || headers.company == `"domain"`' }}
      />
    );
    await act(async () => {
      const channel = anotherClient.channels.get(Channels.tasks);
      await channel.publish({
        text: 'This one is for another Rob',
        extras: { headers: { user: 'robert.griesemer@domain.io' } },
      });
      await channel.publish({
        text: 'This one is for the whole domain',
        extras: { headers: { company: 'domain' } },
      });
      await channel.publish({
        text: 'This one is for Ken',
        extras: { headers: { user: 'ken.thompson@domain.io' } },
      });
      await channel.publish({
        text: 'This one is also a domain-wide fan-out',
        extras: { headers: { company: 'domain' } },
      });
    });

    const messageUl = screen.getAllByRole('derived-channel-messages')[0];
    expect(messageUl.childElementCount).toBe(2);
    expect(messageUl.children[0].innerHTML).toBe('This one is for the whole domain');
    expect(messageUl.children[1].innerHTML).toBe('This one is also a domain-wide fan-out');
  });

  it('component can use "useChannel" with multiple clients', async () => {
    const cliendId = 'client';
    const anotherClientId = 'anotherClient';

    render(
      <AblyProvider client={ablyClient as unknown as Types.RealtimePromise} id={cliendId}>
        <AblyProvider client={anotherClient as unknown as Types.RealtimePromise} id={anotherClientId}>
          <UseDerivedChannelComponentMultipleClients
            clientId={cliendId}
            channelName={Channels.tasks}
            anotherClientId={anotherClientId}
            anotherChannelName={Channels.alerts}
            deriveOptions={{ filter: 'headers.user == `"robert.griesemer@domain.io"` || headers.company == `"domain"`' }}
          />
        </AblyProvider>
      </AblyProvider>
    );

    await act(async () => {
      await yetAnotherClient.channels.get(Channels.tasks).publish({
        text: 'A task for Griesemer',
        extras: { headers: { user: 'robert.griesemer@domain.io' } },
      });
      await yetAnotherClient.channels.get(Channels.alerts).publish({
        text: 'A company-wide alert',
        extras: { headers: { company: 'domain' } },
      });
    });

    const messageUl = screen.getAllByRole('derived-channel-messages')[0];

    expect(messageUl.childElementCount).toBe(2);
    expect(messageUl.children[0].innerHTML).toBe('A task for Griesemer');
    expect(messageUl.children[1].innerHTML).toBe('A company-wide alert');
  });
});

const UseChannelComponentMultipleClients = () => {
  const [messages, updateMessages] = useState<Types.Message[]>([]);
  useChannel({ channelName: 'blah' }, (message) => {
    updateMessages((prev) => [...prev, message]);
  });
  useChannel({ channelName: 'bleh', id: 'otherClient' }, (message) => {
    updateMessages((prev) => [...prev, message]);
  });

  const messagePreviews = messages.map((msg, index) => <li key={index}>{msg.data.text}</li>);

  return <ul role="messages">{messagePreviews}</ul>;
};

const UseChannelComponent = ({ skip }: { skip?: boolean }) => {
  const [messages, updateMessages] = useState<Types.Message[]>([]);
  useChannel({ channelName: 'blah', skip }, (message) => {
    updateMessages((prev) => [...prev, message]);
  });

  const messagePreviews = messages.map((msg, index) => <li key={index}>{msg.data.text}</li>);

  return <ul role="messages">{messagePreviews}</ul>;
};

const UseDerivedChannelComponentMultipleClients = ({
  channelName,
  clientId,
  anotherClientId,
  anotherChannelName,
  deriveOptions,
}) => {
  const [messages, setMessages] = useState<Types.Message[]>([]);
  useChannel({ id: clientId, channelName, deriveOptions }, (message) => {
    setMessages((prev) => [...prev, message]);
  });
  useChannel({ id: anotherClientId, channelName: anotherChannelName, deriveOptions }, (message) => {
    setMessages((prev) => [...prev, message]);
  });

  const messagePreviews = messages.map((msg, index) => <li key={index}>{msg.data.text}</li>);

  return <ul role="derived-channel-messages">{messagePreviews}</ul>;
};

const UseDerivedChannelComponent = ({ channelName, deriveOptions }) => {
  const [messages, setMessages] = useState<Types.Message[]>([]);

  useChannel({ channelName, deriveOptions }, (message) => {
    setMessages((prev) => [...prev, message]);
  });

  const messagePreviews = messages.map((msg, index) => <li key={index}>{msg.data.text}</li>);

  return <ul role="derived-channel-messages">{messagePreviews}</ul>;
};

interface UseChannelStateErrorsComponentProps {
  onConnectionError?: (err: Types.ErrorInfo) => unknown;
  onChannelError?: (err: Types.ErrorInfo) => unknown;
}

const UseChannelStateErrorsComponent = ({ onConnectionError, onChannelError }: UseChannelStateErrorsComponentProps) => {
  const { connectionError, channelError } = useChannel({ channelName: 'blah', onConnectionError, onChannelError });

  return (
    <>
      <p role="connectionError">{connectionError?.message}</p>
      <p role="channelError">{channelError?.message}</p>
    </>
  );
};

const ChangingEventComponent = ({ newEventName }: { newEventName: string }) => {
  const [eventName, setEventName] = useState('event1');

  useChannel('blah', eventName, vi.fn());

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setEventName(newEventName);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [newEventName]);

  return null;
};
