import { BaseRealtime, WebSocketTransport, FetchRequest, generateRandomKey } from 'ably/modules';
import { Types } from 'ably';
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

  const realtime = new BaseRealtime({ key, environment: 'sandbox' }, { WebSocketTransport, FetchRequest });

  const channel = realtime.channels.get('channel');
  await attachChannel(channel);

  const receivedMessagePromise = new Promise<Types.InboundMessage>((resolve) => {
    channel.subscribe(resolve);
  });

  // Check that we can use the TypeScript overload that accepts name and data as separate arguments
  await channel.publish('message', { foo: 'bar' });
  const receivedMessage = await receivedMessagePromise;

  // Check that id and timestamp of a message received from Ably can be assigned to non-optional types
  const { id: string, timestamp: number } = receivedMessage;

  await checkStandaloneFunction();

  channel.unsubscribe();

  // Check that we can use the TypeScript overload that accepts a Message object
  await channel.publish({ name: 'message', data: { foo: 'bar' } });
};
