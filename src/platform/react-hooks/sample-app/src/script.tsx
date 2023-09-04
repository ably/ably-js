import React from 'react';
import { createRoot } from 'react-dom/client';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as Ably from 'ably';

import App from './App.js';
import { AblyProvider } from '../../src/index.js';

const container = document.getElementById('root')!;

function generateRandomId() {
  return Math.random().toString(36).substr(2, 9);
}

const client = new Ably.Realtime.Promise({
  key: import.meta.env.VITE_ABLY_API_KEY,
  clientId: generateRandomId(),
});

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <AblyProvider client={client}>
      <App />
    </AblyProvider>
  </React.StrictMode>
);
