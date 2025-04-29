import * as Ably from 'ably';
import Objects from 'ably/objects';
import { createSandboxAblyAPIKey } from './sandbox';

// Fix for "type 'typeof globalThis' has no index signature" error:
// https://stackoverflow.com/questions/68481686/type-typeof-globalthis-has-no-index-signature
declare module globalThis {
  var testAblyPackage: () => Promise<void>;
}

type CustomRoot = {
  numberKey: number;
  stringKey: string;
  booleanKey: boolean;
  couldBeUndefined?: string;
  mapKey: Ably.LiveMap<{
    foo: 'bar';
    nestedMap?: Ably.LiveMap<{
      baz: 'qux';
    }>;
  }>;
  counterKey: Ably.LiveCounter;
};

declare global {
  export interface AblyObjectsTypes {
    root: CustomRoot;
  }
}

type ExplicitRootType = {
  someOtherKey: string;
};

globalThis.testAblyPackage = async function () {
  const key = await createSandboxAblyAPIKey({ featureFlags: ['enableChannelState'] });

  const realtime = new Ably.Realtime({ key, environment: 'sandbox', plugins: { Objects } });

  const channel = realtime.channels.get('channel', { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });
  // check Objects can be accessed
  const objects = channel.objects;
  await channel.attach();
  // expect root to be a LiveMap instance with Objects types defined via the global AblyObjectsTypes interface
  // also checks that we can refer to the Objects types exported from 'ably' by referencing a LiveMap interface
  const root: Ably.LiveMap<CustomRoot> = await objects.getRoot();

  // check root has expected LiveMap TypeScript type methods
  const size: number = root.size();

  // check custom user provided typings via AblyObjectsTypes are working:
  // any LiveMap.get() call can return undefined, as the LiveMap itself can be tombstoned (has empty state),
  // or referenced object is tombstoned.
  // keys on a root:
  const aNumber: number | undefined = root.get('numberKey');
  const aString: string | undefined = root.get('stringKey');
  const aBoolean: boolean | undefined = root.get('booleanKey');
  const userProvidedUndefined: string | undefined = root.get('couldBeUndefined');
  // objects on a root:
  const counter: Ably.LiveCounter | undefined = root.get('counterKey');
  const map: AblyObjectsTypes['root']['mapKey'] | undefined = root.get('mapKey');
  // check string literal types works
  // need to use nullish coalescing as we didn't actually create any data on the root,
  // so the next calls would fail. we only need to check that TypeScript types work
  const foo: 'bar' = map?.get('foo')!;
  const baz: 'qux' = map?.get('nestedMap')?.get('baz')!;

  // check LiveMap subscription callback has correct TypeScript types
  const { unsubscribe } = root.subscribe(({ update }) => {
    // check update object infers keys from map type
    const typedKeyOnMap = update.stringKey;
    switch (typedKeyOnMap) {
      case 'removed':
      case 'updated':
      case undefined:
        break;
      default:
        // check all possible types are exhausted
        const shouldExhaustAllTypes: never = typedKeyOnMap;
    }
  });
  unsubscribe();

  // check LiveCounter type also behaves as expected
  // same deal with nullish coalescing
  const value: number = counter?.value()!;
  const counterSubscribeResponse = counter?.subscribe(({ update }) => {
    const shouldBeANumber: number = update.amount;
  });
  counterSubscribeResponse?.unsubscribe();

  // check can provide custom types for the getRoot method, ignoring global AblyObjectsTypes interface
  const explicitRoot: Ably.LiveMap<ExplicitRootType> = await objects.getRoot<ExplicitRootType>();
  const someOtherKey: string | undefined = explicitRoot.get('someOtherKey');
};
