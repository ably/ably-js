import * as Ably from 'ably';
import Objects from 'ably/objects';
import { createSandboxAblyAPIKey } from './sandbox';

// Fix for "type 'typeof globalThis' has no index signature" error:
// https://stackoverflow.com/questions/68481686/type-typeof-globalthis-has-no-index-signature
declare module globalThis {
  var testAblyPackage: () => Promise<void>;
}

type MyCustomObject = {
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
    object: MyCustomObject;
  }
}

type ExplicitObjectType = {
  someOtherKey: string;
};

globalThis.testAblyPackage = async function () {
  const key = await createSandboxAblyAPIKey();

  const realtime = new Ably.Realtime({ key, endpoint: 'nonprod:sandbox', plugins: { Objects } });

  const channel = realtime.channels.get('channel', { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });
  // check Objects can be accessed
  await channel.attach();
  // expect entrypoint to be a LiveMap instance with Objects types defined via the global AblyObjectsTypes interface
  // also checks that we can refer to the Objects types exported from 'ably' by referencing a LiveMap interface
  const myObject: Ably.LiveMap<MyCustomObject> = await channel.object.get();

  // check entrypoint has expected LiveMap TypeScript type methods
  const size: number = myObject.size();

  // check custom user provided typings via AblyObjectsTypes are working:
  // any LiveMap.get() call can return undefined, as the LiveMap itself can be tombstoned (has empty state),
  // or referenced object is tombstoned.
  // keys on the entrypoint:
  const aNumber: number | undefined = myObject.get('numberKey');
  const aString: string | undefined = myObject.get('stringKey');
  const aBoolean: boolean | undefined = myObject.get('booleanKey');
  const userProvidedUndefined: string | undefined = myObject.get('couldBeUndefined');
  // objects on the entrypoint:
  const counter: Ably.LiveCounter | undefined = myObject.get('counterKey');
  const map: AblyObjectsTypes['object']['mapKey'] | undefined = myObject.get('mapKey');
  // check string literal types works
  // need to use nullish coalescing as we didn't actually create any data on the entrypoint object,
  // so the next calls would fail. we only need to check that TypeScript types work
  const foo: 'bar' = map?.get('foo')!;
  const baz: 'qux' = map?.get('nestedMap')?.get('baz')!;

  // check LiveMap subscription callback has correct TypeScript types
  const { unsubscribe } = myObject.subscribe(({ update }) => {
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

  // check can provide custom types for the object.get() method, ignoring global AblyObjectsTypes interface
  const explicitObjectType: Ably.LiveMap<ExplicitObjectType> = await channel.object.get<ExplicitObjectType>();
  const someOtherKey: string | undefined = explicitObjectType.get('someOtherKey');
};
