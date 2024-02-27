import React from 'react';
import { createRoot } from 'react-dom/client';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as Ably from 'ably';
import App from './App.js';
import { AblyProvider, ChannelProvider } from '../../src/index.js';

const container = document.getElementById('root')!;

function generateRandomId() {
  return Math.random().toString(36).substr(2, 9);
}

const client = new Ably.Realtime({
  key: import.meta.env.VITE_ABLY_API_KEY,
  clientId: generateRandomId(),
});

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <AblyProvider client={client}>
      <AblyProvider id="rob" client={client}>
        <AblyProvider id="frontOffice" client={client}>
          <ChannelProvider channelName="your-channel-name" options={{ modes: ['PRESENCE', 'PUBLISH', 'SUBSCRIBE'] }}>
            <ChannelProvider channelName="your-derived-channel-name">
              <ChannelProvider
                id="rob"
                channelName="your-derived-channel-name"
                deriveOptions={{ filter: 'headers.email == `"rob.pike@domain.com"` || headers.company == `"domain"`' }}
              >
                <ChannelProvider
                  id="frontOffice"
                  channelName="your-derived-channel-name"
                  deriveOptions={{ filter: 'headers.role == `"front-office"` || headers.company == `"domain"`' }}
                >
                  <App />
                </ChannelProvider>
              </ChannelProvider>
            </ChannelProvider>
          </ChannelProvider>
        </AblyProvider>
      </AblyProvider>
    </AblyProvider>
  </React.StrictMode>,
);
