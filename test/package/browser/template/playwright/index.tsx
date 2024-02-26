import { beforeMount } from '@playwright/experimental-ct-react/hooks';
import * as Ably from 'ably';
import { AblyProvider } from 'ably/react';

import { createSandboxAblyAPIKey } from '../src/sandbox';

beforeMount(async ({ App }) => {
  const key = await createSandboxAblyAPIKey();

  const client = new Ably.Realtime({
    key,
    environment: 'sandbox',
  });

  return (
    <AblyProvider client={client}>
      <App />
    </AblyProvider>
  );
});
