import * as Ably from 'ably';
import LiveObjects from 'ably/liveobjects';
import { createSandboxAblyAPIKey } from './sandbox';

globalThis.testAblyPackage = async function () {
  const key = await createSandboxAblyAPIKey({ featureFlags: ['enableChannelState'] });

  const realtime = new Ably.Realtime({ key, environment: 'sandbox', plugins: { LiveObjects } });

  const channel = realtime.channels.get('channel', { modes: ['STATE_SUBSCRIBE', 'STATE_PUBLISH'] });
  // check liveObjects can be accessed
  const liveObjects = channel.liveObjects;
  await channel.attach();
  // root should be a LiveMap object
  const root: Ably.LiveMap = await liveObjects.getRoot();

  // check root is recognized as LiveMap TypeScript type
  root.get('someKey');
  root.size();

  // check LiveMap subscription callback has correct TypeScript types
  const { unsubscribe } = root.subscribe(({ update }) => {
    switch (update.someKey) {
      case 'removed':
      case 'updated':
        break;
      default:
        // check all possible types are exhausted
        const shouldExhaustAllTypes: never = update.someKey;
    }
  });
  unsubscribe();

  // check LiveCounter types also behave as expected
  const counter = root.get('randomKey') as Ably.LiveCounter | undefined;
  // use nullish coalescing as we didn't actually create a counter object on the root,
  // so the next calls would fail. we only need to check that TypeScript types work
  const value: number = counter?.value();
  const counterSubscribeResponse = counter?.subscribe(({ update }) => {
    const shouldBeANumber: number = update.inc;
  });
  counterSubscribeResponse?.unsubscribe();
};
