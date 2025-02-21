import { beforeMount } from '@playwright/experimental-ct-react/hooks';
import * as Ably from 'ably';
import { AblyProvider, ChannelProvider } from 'ably/react';

import { createSandboxAblyAPIKey } from '../src/sandbox';

beforeMount(async ({ App }) => {
  const key = await createSandboxAblyAPIKey();

  const client = new Ably.Realtime({
    key,
    endpoint: 'nonprod:sandbox',
  });

  return (
    <AblyProvider client={client}>
      <ChannelProvider channelName="channel">
        <App />
      </ChannelProvider>
    </AblyProvider>
  );
});
