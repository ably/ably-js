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

export default function UsePresence() {
  return (
    <ChannelProvider channelName="my-presence-channel" options={{modes: ['PRESENCE', 'PRESENCE_SUBSCRIBE']}}>
      <UsePresenceChild></UsePresenceChild>
    </ChannelProvider>
  );
}

function UsePresenceChild() {
  const ably = useAbly();

  const { presenceData, updateStatus } = usePresence(
    { channelName: 'my-presence-channel' },
    { foo: 'bar' },
    (update) => {
      console.log('presence update', update);
    },
  );

  const presentClients = presenceData.map((msg, index) => (
    <li key={index}>
      {msg.clientId}: {JSON.stringify(msg.data)}
    </li>
  ));

  return (
    <div>
      <h1>UsePresence</h1>
      <h2>My id: {ably.options.clientId}</h2>
      <button
        onClick={() => {
          updateStatus({ foo: 'Hello World!' });
        }}
      >
        Update status to hello
      </button>

      <h2>Present Clients</h2>
      <ul>{presentClients}</ul>
    </div>
  );
}
