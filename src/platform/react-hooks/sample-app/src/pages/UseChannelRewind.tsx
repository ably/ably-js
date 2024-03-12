import React, { useState } from 'react';
import {
  useChannel,
  usePresence,
  useConnectionStateListener,
  useChannelStateListener,
  ChannelProvider,
} from '../../../src/index.js';
import MessagePreview from '../components/MessagePreview.js';
import * as Ably from 'ably';

export default function UseChannelRewind() {
  return (
    <ChannelProvider channelName="my-channel-rewind" options={{ params: { rewind: '5' } }}>
      <UseChannelRewindChild></UseChannelRewindChild>
    </ChannelProvider>
  );
}

function UseChannelRewindChild() {
  const [messages, updateMessages] = useState<Ably.Message[]>([]);

  const { channel, publish, ably } = useChannel({ channelName: 'my-channel-rewind' }, (message) => {
    updateMessages((prev) => [...prev, message]);
  });

  const messagePreviews = messages.map((message, idx) => <MessagePreview key={idx} message={message} />);

  return (
    <div>
      <h1>UseChannelRewind</h1>
      <button
        onClick={() => {
          publish('test-message', {
            text: 'message text',
          });
        }}
      >
        Send Message
      </button>

      <h2>Messages</h2>
      {<ul>{messagePreviews}</ul>}
    </div>
  );
}
