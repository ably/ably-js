import React, { useState } from 'react';
import {
  useChannel,
  usePresence,
  useConnectionStateListener,
  useChannelStateListener,
  ChannelProvider,
  useAbly,
} from '../../../src/index.js';
import MessagePreview from '../components/MessagePreview.js';
import * as Ably from 'ably';

export default function UsePresenceUseChannelOptions() {
  return (
    <ChannelProvider channelName="my-channel" options={{ modes: ['PRESENCE', 'PRESENCE_SUBSCRIBE', 'PUBLISH', 'SUBSCRIBE'] }}>
      <UsePresenceUseChannelOptionsChild></UsePresenceUseChannelOptionsChild>
    </ChannelProvider>
  );
}

function UsePresenceUseChannelOptionsChild() {
  const ably = useAbly();

  const [messages, updateMessages] = useState<Ably.Message[]>([]);

  const { channel, publish } = useChannel({ channelName: 'my-channel' }, (message) => {
    updateMessages((prev) => [...prev, message]);
  });

  const messagePreviews = messages.map((message, idx) => <MessagePreview key={idx} message={message} />);

  const { presenceData, updateStatus } = usePresence({ channelName: 'my-channel' }, { foo: 'bar' }, (update) => {
    console.log('presence update', update);
  });

  const presentClients = presenceData.map((msg, index) => (
    <li key={index}>
      {msg.clientId}: {JSON.stringify(msg.data)}
    </li>
  ));

  return (
    <div>
      <h1>UsePresenceUseChannelOptions</h1>
      <h2>My id: {ably.options.clientId}</h2>
      <button
        onClick={() => {
          publish('test-message', {
            text: 'message text',
          });
        }}
      >
        Send Message
      </button>
      <button
        onClick={() => {
          updateStatus({ foo: 'Hello World!' });
        }}
      >
        Update status to hello
      </button>

      <h2>Messages</h2>
      {<ul>{messagePreviews}</ul>}

      <h2>Present Clients</h2>
      <ul>{presentClients}</ul>
    </div>
  );
}
