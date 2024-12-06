import * as Ably from 'ably';
import LiveObjects from 'ably/liveobjects';
import { CustomRoot } from './ably.config';
import { createSandboxAblyAPIKey } from './sandbox';

type ExplicitRootType = {
  someOtherKey: string;
};

globalThis.testAblyPackage = async function () {
  const key = await createSandboxAblyAPIKey({ featureFlags: ['enableChannelState'] });

  const realtime = new Ably.Realtime({ key, environment: 'sandbox', plugins: { LiveObjects } });

  const channel = realtime.channels.get('channel', { modes: ['STATE_SUBSCRIBE', 'STATE_PUBLISH'] });
  // check liveObjects can be accessed
  const liveObjects = channel.liveObjects;
  await channel.attach();
  // expect root to be a LiveMap instance with LiveObjects types defined via the global LiveObjectsTypes interface
  // also checks that we can refer to the LiveObjects types exported from 'ably' by referencing a LiveMap interface
  const root: Ably.LiveMap<CustomRoot> = await liveObjects.getRoot();

  // check root has expected LiveMap TypeScript type methods
  const size: number = root.size();

  // check custom user provided typings via LiveObjectsTypes are working:
  // keys on a root:
  const aNumber: number = root.get('numberKey');
  const aString: string = root.get('stringKey');
  const aBoolean: boolean = root.get('booleanKey');
  const couldBeUndefined: string | undefined = root.get('couldBeUndefined');
  // live objects on a root:
  // LiveMap.get can still return undefined for LiveObject typed properties even if custom typings have them as non-optional.
  // objects can be non-valid and result in the undefined value
  const counter: Ably.LiveCounter | undefined = root.get('counterKey');
  const map: LiveObjectsTypes['root']['mapKey'] | undefined = root.get('mapKey');
  // check string literal types works
  // need to use nullish coalescing as we didn't actually create any data on the root,
  // so the next calls would fail. we only need to check that TypeScript types work
  const foo: 'bar' = map?.get('foo')!;
  const baz: 'qux' = map?.get('nestedMap')?.get('baz')!;

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

  // check LiveCounter type also behaves as expected
  // same deal with nullish coalescing
  const value: number = counter?.value()!;
  const counterSubscribeResponse = counter?.subscribe(({ update }) => {
    const shouldBeANumber: number = update.inc;
  });
  counterSubscribeResponse?.unsubscribe();

  // check can provide custom types for the getRoot method, ignoring global LiveObjectsTypes interface
  const explicitRoot: Ably.LiveMap<ExplicitRootType> = await liveObjects.getRoot<ExplicitRootType>();
  const someOtherKey: string = explicitRoot.get('someOtherKey');
};
