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

    renderInCtxProvider(
      ablyClient,
      <LatestMessageCallbackComponent channelName="blah" callback={() => callbackCount++} />
    );

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

    act(() => {
      anotherClient.channels
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

    act(() => {
      anotherClient.channels
        .get(Channels.tasks)
        .publish({ text: 'This one is for another Rob', extras: { headers: { user: 'robert.griesemer@domain.io' } } });
    });

    const messageUl = screen.getAllByRole('derived-channel-messages')[0];
    expect(messageUl.childElementCount).toBe(0);
  });

  it('component will update with only those messages that qualify', async () => {
    renderInCtxProvider(
      ablyClient,
      <UseDerivedChannelComponent
        channelName={Channels.tasks}
        deriveOptions={{ filter: 'headers.user == `"robert.pike@domain.io"` || headers.company == `"domain"`' }}
      />
    );

    act(() => {
      const channel = anotherClient.channels.get(Channels.tasks);
      channel.publish({
        text: 'This one is for another Rob',
        extras: { headers: { user: 'robert.griesemer@domain.io' } },
      });
      channel.publish({
        text: 'This one is for the whole domain',
        extras: { headers: { company: 'domain' } },
      });
      channel.publish({
        text: 'This one is for Ken',
        extras: { headers: { user: 'ken.thompson@domain.io' } },
      });
      channel.publish({
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
            deriveOptions={{
              filter: 'headers.user == `"robert.griesemer@domain.io"` || headers.company == `"domain"`',
            }}
          />
        </AblyProvider>
      </AblyProvider>
    );

    act(() => {
      yetAnotherClient.channels.get(Channels.tasks).publish({
        text: 'A task for Griesemer',
        extras: { headers: { user: 'robert.griesemer@domain.io' } },
      });
      yetAnotherClient.channels.get(Channels.alerts).publish({
        text: 'A company-wide alert',
        extras: { headers: { company: 'domain' } },
      });
    });

    const messageUl = screen.getAllByRole('derived-channel-messages')[0];

    expect(messageUl.childElementCount).toBe(2);
    expect(messageUl.children[0].innerHTML).toBe('A task for Griesemer');
    expect(messageUl.children[1].innerHTML).toBe('A company-wide alert');
  });

  it('handles channel errors', async () => {
    const onChannelError = vi.fn();
    const reason = { message: 'channel error occurred' };

    renderInCtxProvider(
      ablyClient,
      <UseChannelStateErrorsComponent
        channelName={Channels.alerts}
        onChannelError={onChannelError}
      ></UseChannelStateErrorsComponent>
    );

    const channelErrorElem = screen.getByRole('channelError');
    expect(onChannelError).toHaveBeenCalledTimes(0);
    expect(channelErrorElem.innerHTML).toEqual('');

    act(() => ablyClient.channels.get(Channels.alerts).emit('failed', { reason }));

    expect(channelErrorElem.innerHTML).toEqual(reason.message);
    expect(onChannelError).toHaveBeenCalledTimes(1);
    expect(onChannelError).toHaveBeenCalledWith(reason);
  });

  it('handles connection errors', async () => {
    const onConnectionError = vi.fn();
    const reason = { message: 'failed to establish connection' };

    renderInCtxProvider(
      ablyClient,
      <UseChannelStateErrorsComponent
        channelName={Channels.alerts}
        onConnectionError={onConnectionError}
      ></UseChannelStateErrorsComponent>
    );

    const channelErrorElem = screen.getByRole('connectionError');
    expect(onConnectionError).toHaveBeenCalledTimes(0);
    expect(channelErrorElem.innerHTML).toEqual('');

    act(() => ablyClient.connection.emit('failed', { reason }));

    expect(channelErrorElem.innerHTML).toEqual(reason.message);
    expect(onConnectionError).toHaveBeenCalledTimes(1);
    expect(onConnectionError).toHaveBeenCalledWith(reason);
  });

  it('wildcard filter', async () => {
    renderInCtxProvider(
      ablyClient,
      <UseDerivedChannelComponent
        deriveOptions={{ filter: '*' }}
        channelName={Channels.alerts}
      ></UseDerivedChannelComponent>
    );

    act(() => {
      const text = 'Will receive this text due to wildcard filter';
      anotherClient.channels.get(Channels.alerts).publish({ text });
    });

    const messageUl = screen.getAllByRole('derived-channel-messages')[0];
    expect(messageUl.childElementCount).toBe(1);
  });

  it('skip param', async () => {
    renderInCtxProvider(
      ablyClient,
      <UseDerivedChannelComponent
        deriveOptions={{ filter: '*' }}
        channelName={Channels.alerts}
        skip
      ></UseDerivedChannelComponent>
    );

    act(() => {
      const text = 'Will skip due to "skip=true"';
      anotherClient.channels.get(Channels.alerts).publish({ text });
    });

    const messageUl = screen.getAllByRole('derived-channel-messages')[0];
    expect(messageUl.childElementCount).toBe(0);
  });

  it('should use the latest version of the message callback', async () => {
    let callbackCount = 0;

    renderInCtxProvider(
      ablyClient,
      <LatestMessageCallbackComponent
        channelName={Channels.tasks}
        deriveOptions={{ filter: 'headers.user == `"robert.pike@domain.io"` || headers.company == `"domain"`' }}
        callback={() => callbackCount++}
      />
    );

    act(() => {
      const channel = anotherClient.channels.get(Channels.tasks);
      channel.publish({
        text: 'This one is for another Rob',
        extras: { headers: { user: 'robert.griesemer@domain.io' } },
      });
      channel.publish({
        text: 'This one is for the whole domain',
        extras: { headers: { company: 'domain' } },
      });
      channel.publish({
        text: 'This one is for Ken',
        extras: { headers: { user: 'ken.thompson@domain.io' } },
      });
      channel.publish({
        text: 'This one is also a domain-wide fan-out',
        extras: { headers: { company: 'domain' } },
      });
      channel.publish({
        text: 'This one for Mr.Pike will also get through...',
        extras: { headers: { user: 'robert.pike@domain.io' } },
      });
      channel.publish({
        text: '.... as well as this message',
        extras: { headers: { user: 'robert.pike@domain.io' } },
      });
    });

    expect(callbackCount).toBe(4);
    expect(screen.getByRole('counter').innerHTML).toEqual(`${callbackCount}`);
  });

  it('should re-subscribe if event name has changed', async () => {
    const channel = ablyClient.channels.get(Channels.alerts);
    channel.subscribe = vi.fn();
    channel.unsubscribe = vi.fn();

    const eventName = 'event1';
    const newEventName = 'event2';

    renderInCtxProvider(
      ablyClient,
      <ChangingEventComponent
        channelName={Channels.alerts}
        deriveOptions={{ filter: '*' }}
        eventName={eventName}
        newEventName={newEventName}
      />
    );

    await waitFor(() => expect(channel.subscribe).toHaveBeenCalledWith(eventName, expect.any(Function)));

    await waitFor(() => expect(channel.unsubscribe).toHaveBeenCalledWith(eventName, expect.any(Function)));

    expect(channel.subscribe).toHaveBeenCalledWith(newEventName, expect.any(Function));
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

interface UseDerivedChannelComponentMultipleClientsProps {
  clientId: string;
  channelName: string;
  anotherClientId: string;
  anotherChannelName: string;
  deriveOptions: Types.DeriveOptions;
}

const UseDerivedChannelComponentMultipleClients = ({
  channelName,
  clientId,
  anotherClientId,
  anotherChannelName,
  deriveOptions,
}: UseDerivedChannelComponentMultipleClientsProps) => {
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

interface UseDerivedChannelComponentProps {
  channelName: string;
  deriveOptions: Types.DeriveOptions;
  skip?: boolean;
}

const UseDerivedChannelComponent = ({ channelName, deriveOptions, skip = false }: UseDerivedChannelComponentProps) => {
  const [messages, setMessages] = useState<Types.Message[]>([]);

  useChannel({ channelName, deriveOptions, skip }, (message) => {
    setMessages((prev) => [...prev, message]);
  });

  const messagePreviews = messages.map((msg, index) => <li key={index}>{msg.data.text}</li>);

  return <ul role="derived-channel-messages">{messagePreviews}</ul>;
};

interface UseChannelStateErrorsComponentProps {
  onConnectionError?: (err: Types.ErrorInfo) => unknown;
  onChannelError?: (err: Types.ErrorInfo) => unknown;
  channelName?: string;
  deriveOptions?: Types.DeriveOptions;
}

const UseChannelStateErrorsComponent = ({
  onConnectionError,
  onChannelError,
  channelName = 'blah',
  deriveOptions,
}: UseChannelStateErrorsComponentProps) => {
  const opts = { channelName, deriveOptions, onConnectionError, onChannelError };
  const { connectionError, channelError } = useChannel(opts);

  return (
    <>
      <p role="connectionError">{connectionError?.message}</p>
      <p role="channelError">{channelError?.message}</p>
    </>
  );
};

interface LatestMessageCallbackComponentProps {
  channelName: string;
  deriveOptions?: Types.DeriveOptions;
  callback: () => any;
}

const LatestMessageCallbackComponent = ({
  channelName,
  deriveOptions,
  callback,
}: LatestMessageCallbackComponentProps) => {
  const [count, setCount] = React.useState(0);

  useChannel({ channelName, deriveOptions }, () => {
    callback();
    setCount((count) => count + 1);
  });

  return <div role="counter">{count}</div>;
};

interface ChangingEventComponentProps {
  newEventName: string;
  channelName?: string;
  deriveOptions?: Types.DeriveOptions;
  eventName?: string;
}

const ChangingEventComponent = ({
  channelName = 'blah',
  eventName = 'event1',
  newEventName,
  deriveOptions,
}: ChangingEventComponentProps) => {
  const [currentEventName, setCurrentEventName] = useState(eventName);

  useChannel({ channelName, deriveOptions }, currentEventName, vi.fn());

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentEventName(newEventName);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [newEventName]);

  return null;
};
