import { Realtime, Types } from 'ably';
import { createSandboxAblyAPIKey } from './sandbox';

// This function exists to check that we can import the Types namespace and refer to its types.
async function attachChannel(channel: Types.RealtimeChannel) {
  await channel.attach();
}

globalThis.testAblyPackage = async function () {
  const key = await createSandboxAblyAPIKey();

  const realtime = new Realtime({ key, environment: 'sandbox' });

  const channel = realtime.channels.get('channel');
  await attachChannel(channel);

  const receivedMessagePromise = new Promise<void>((resolve) => {
    channel.subscribe(() => {
      resolve();
    });
  });

  await channel.publish('message', { foo: 'bar' });
  await receivedMessagePromise;
};
