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

export default function UsePresenceOnlySubscribe() {
  return (
    <ChannelProvider channelName="my-presence-channel" options={{ modes: ['PRESENCE_SUBSCRIBE'] }}>
      <UsePresenceOnlySubscribeChild></UsePresenceOnlySubscribeChild>
    </ChannelProvider>
  );
}

function UsePresenceOnlySubscribeChild() {
  const ably = useAbly();

  const { presenceData, updateStatus } = usePresence(
    { channelName: 'my-presence-channel', subscribeOnly: true },
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
      <h1>UsePresenceOnlySubscribe</h1>
      <h2>My id: {ably.options.clientId}</h2>

      <h2>Present Clients</h2>
      <ul>{presentClients}</ul>
    </div>
  );
}
