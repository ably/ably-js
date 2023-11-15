import {
  BaseRealtime,
  Types,
  WebSocketTransport,
  FetchRequest,
  RealtimePublishing,
  generateRandomKey,
} from 'ably/modules';
import { createSandboxAblyAPIKey } from './sandbox';

// This function exists to check that we can import the Types namespace and refer to its types.
async function attachChannel(channel: Types.RealtimeChannel) {
  await channel.attach();
}

// This function exists to check that one of the free-standing functions (arbitrarily chosen) can be imported and does something vaguely sensible.
async function checkStandaloneFunction() {
  const generatedKey = await generateRandomKey();
  if (!(generatedKey instanceof ArrayBuffer)) {
    throw new Error('Expected to get an ArrayBuffer from generateRandomKey');
  }
}

globalThis.testAblyPackage = async function () {
  const key = await createSandboxAblyAPIKey();

  const realtime = new BaseRealtime(
    { key, environment: 'sandbox' },
    { WebSocketTransport, FetchRequest, RealtimePublishing }
  );

  const channel = realtime.channels.get('channel');
  await attachChannel(channel);

  const receivedMessagePromise = new Promise<void>((resolve) => {
    channel.subscribe(() => {
      resolve();
    });
  });

  await channel.publish('message', { foo: 'bar' });
  await receivedMessagePromise;
  await checkStandaloneFunction();
};
