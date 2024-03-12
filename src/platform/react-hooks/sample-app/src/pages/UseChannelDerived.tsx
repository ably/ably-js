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

export default function UseChannelDerived() {
  return (
    <ChannelProvider
      ablyId="rob"
      channelName="my-derived-channel-name"
      deriveOptions={{ filter: 'headers.email == `"rob.pike@domain.com"` || headers.company == `"domain"`' }}
    >
      <ChannelProvider
        ablyId="frontOffice"
        channelName="my-derived-channel-name"
        deriveOptions={{ filter: 'headers.role == `"front-office"` || headers.company == `"domain"`' }}
      >
        <UseChannelDerivedChild></UseChannelDerivedChild>
      </ChannelProvider>
    </ChannelProvider>
  );
}

function UseChannelDerivedChild() {
  const [robOnlyMessages, updateRobOnlyMessages] = useState<Ably.Message[]>([]);
  const [frontOficeOnlyMessages, updateFrontOficeOnlyMessages] = useState<Ably.Message[]>([]);

  useChannel(
    {
      channelName: 'my-derived-channel-name',
      ablyId: 'rob',
    },
    (message) => {
      updateRobOnlyMessages((prev) => [...prev, message]);
    },
  );

  useChannel(
    {
      channelName: 'my-derived-channel-name',
      ablyId: 'frontOffice',
    },
    (message) => {
      updateFrontOficeOnlyMessages((prev) => [...prev, message]);
    },
  );

  const robMessagePreviews = robOnlyMessages.map((message, idx) => <MessagePreview key={idx} message={message} />);
  const frontOfficeMessagePreviews = frontOficeOnlyMessages.map((message, idx) => (
    <MessagePreview key={idx} message={message} />
  ));

  const { publish: transientPublish } = useChannel({
    channelName: 'my-derived-channel-name',
    ablyId: 'rob',
  });

  return (
    <div>
      <h1>UseChannelDerived</h1>
      <button
        onClick={() => {
          transientPublish({
            name: 'test-message',
            data: {
              text: 'This is a message for Rob',
            },
            extras: {
              headers: {
                email: 'rob.pike@domain.com',
              },
            },
          });
        }}
      >
        Send Message to Rob only
      </button>
      <button
        onClick={() => {
          transientPublish({
            name: 'test-message',
            data: {
              text: 'This is a message for front office only',
            },
            extras: {
              headers: {
                role: 'front-office',
              },
            },
          });
        }}
      >
        Send message to Front Office only
      </button>
      <button
        onClick={() => {
          transientPublish({
            name: 'test-message',
            data: {
              text: 'This is a company-wide message',
            },
            extras: {
              headers: {
                company: 'domain',
              },
            },
          });
        }}
      >
        Send Company-wide message
      </button>

      <h2>Rob Channel Messages</h2>
      <ul>{robMessagePreviews}</ul>

      <h2>Front Office Messages</h2>
      <ul>{frontOfficeMessagePreviews}</ul>
    </div>
  );
}
