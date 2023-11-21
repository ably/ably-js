import { Realtime } from 'ably';
import { createSandboxAblyAPIKey } from './sandbox';

globalThis.testAblyPackage = async function () {
  const key = await createSandboxAblyAPIKey();

  const realtime = new Realtime({ key, environment: 'sandbox' });

  const channel = realtime.channels.get('channel');
  await channel.attach();

  const receivedMessagePromise = new Promise<void>((resolve) => {
    channel.subscribe(() => {
      resolve();
    });
  });

  await channel.publish('message', { foo: 'bar' });
  await receivedMessagePromise;
};
