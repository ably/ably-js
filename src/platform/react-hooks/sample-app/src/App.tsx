import { Types } from 'ably';
import React, { useState } from 'react';
import {
  useChannel,
  usePresence,
  useConnectionStateListener,
  useChannelStateListener,
  useAbly,
} from '../../src/index.js';
import './App.css';

function App() {
  const [messages, updateMessages] = useState<Types.Message[]>([]);
  const [skip, setSkip] = useState(false);
  const { channel, ably } = useChannel({ channelName: 'your-channel-name', skip }, (message) => {
    updateMessages((prev) => [...prev, message]);
  });

  const { presenceData, updateStatus } = usePresence(
    { channelName: 'your-channel-name', skip },
    { foo: 'bar' },
    (update) => {
      console.log(update);
    }
  );

  const [, setConnectionState] = useState(ably.connection.state);

  useConnectionStateListener((stateChange) => {
    setConnectionState(stateChange.current);
  });

  const [ablyErr, setAblyErr] = useState('');
  const [channelState, setChannelState] = useState(channel.state);
  const [previousChannelState, setPreviousChannelState] = useState<undefined | Types.ChannelState>();
  const [channelStateReason, setChannelStateReason] = useState<undefined | Types.ErrorInfo>();

  useChannelStateListener('your-channel-name', (stateChange) => {
    setAblyErr(JSON.stringify(stateChange.reason));
    setChannelState(stateChange.current);
    setPreviousChannelState(stateChange.previous);
    setChannelStateReason(stateChange.reason ?? undefined);
  });

  const messagePreviews = messages.map((msg, index) => <li key={index}>{msg.data.text}</li>);
  const presentClients = presenceData.map((msg, index) => (
    <li key={index}>
      {msg.clientId}: {JSON.stringify(msg.data)}
    </li>
  ));

  return (
    <div className="App">
      <header className="App-header">Ably React Hooks Demo</header>
      <div>
        <button
          onClick={() => {
            channel.publish('test-message', {
              text: 'message text',
            });
          }}
        >
          Send Message
        </button>
        <button
          onClick={() => {
            updateStatus({ foo: 'baz' });
          }}
        >
          Update status to hello
        </button>
      </div>

      <div style={{ position: 'fixed', width: '250px' }}>
        <ConnectionState />
      </div>
      <div style={{ marginLeft: '250px' }}>
        <h2>Skip</h2>
        <button onClick={() => setSkip(!skip)}>Toggle skip param</button>
        <h2>Channel detach</h2>
        <button onClick={() => channel.detach()}>Detach</button>
        <button onClick={() => ably.close()}>Close</button>

        <h2>Channel State</h2>
        <h3>Current</h3>
        <div>{channelState}</div>
        <h3>Previous</h3>
        <div>{previousChannelState}</div>
        <h3>Reason</h3>
        <div>{JSON.stringify(channelStateReason)}</div>

        <h2>Ably error</h2>
        <h3>Reason</h3>
        <div>{ablyErr}</div>

        <h2>Messages</h2>
        <ul>{messagePreviews}</ul>

        <h2>Present Clients</h2>
        <ul>{presentClients}</ul>
      </div>
    </div>
  );
}

function ConnectionState() {
  const ably = useAbly();
  const [connectionState, setConnectionState] = useState(ably.connection.state);
  const [connectionError, setConnectionError] = useState<Types.ErrorInfo | null>(null);
  useConnectionStateListener((stateChange) => {
    console.log(stateChange);
    setConnectionState(stateChange.current);
    if (stateChange.reason) {
      setConnectionError(stateChange.reason);
    }
  });

  return (
    <>
      <p>Connection State = &apos;{connectionState}&apos;</p>
      {connectionError && (
        <p>
          Connection Error ={' '}
          <a href={(connectionError as any).href}>
            {connectionError.message} ({connectionError.code} {connectionError.statusCode})
          </a>
        </p>
      )}
    </>
  );
}

export default App;
