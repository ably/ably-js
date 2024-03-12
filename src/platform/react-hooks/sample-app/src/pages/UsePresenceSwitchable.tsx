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

export default function UsePresenceSwitchable() {
  const modesArr = [['PRESENCE, PRESENCE_SUBSCRIBE'], ['PRESENCE'], ['PRESENCE_SUBSCRIBE']];
  const [selectedModesIdx, updateSelectedModesIdx] = useState(0);

  const switchModes = () => {
    updateSelectedModesIdx((prev) => {
      const newIdx = (prev + 1) % modesArr.length;
      return newIdx;
    });
  };

  const selectedModes = modesArr[selectedModesIdx];

  return (
    <>
      <button onClick={() => switchModes()}>Switch modes</button>
      <div>Current modes: {JSON.stringify(selectedModes)}</div>
      <ChannelProvider channelName="my-presence-channel" options={{ modes: selectedModes }}>
        <UsePresenceSwitchableChild></UsePresenceSwitchableChild>
      </ChannelProvider>
    </>
  );
}

function UsePresenceSwitchableChild() {
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
      <h1>UsePresenceSwitchable</h1>
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
