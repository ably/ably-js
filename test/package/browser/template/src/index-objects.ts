import * as Ably from 'ably';
import { LiveCounter, LiveMap } from 'ably';
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
  mapKey: LiveMap<{
    foo: 'bar';
    nestedMap?: LiveMap<{
      baz: 'qux';
    }>;
  }>;
  counterKey: LiveCounter;
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
  await channel.attach();
  // check Objects can be accessed.
  // expect entrypoint to be a PathObject for a LiveMap instance with Object type defined via the global AblyObjectsTypes interface.
  // also checks that we can refer to the Objects types exported from 'ably'.
  const myObject: Ably.PathObject<LiveMap<MyCustomObject>> = await channel.object.get();

  // check entrypoint has expected LiveMap TypeScript type methods
  const size: number | undefined = myObject.size();

  // check custom user provided typings via AblyObjectsTypes are working:
  const aNumber: number | undefined = myObject.get('numberKey').value();
  const aString: string | undefined = myObject.get('stringKey').value();
  const aBoolean: boolean | undefined = myObject.get('booleanKey').value();
  const userProvidedUndefined: string | undefined = myObject.get('couldBeUndefined').value();
  // objects on the entrypoint:
  const counter: Ably.LiveCounterPathObject = myObject.get('counterKey');
  const map: Ably.LiveMapPathObject<MyCustomObject['mapKey']> = myObject.get('mapKey');
  // check string literal types works
  // need to use nullish coalescing as we didn't actually create any data on the entrypoint object,
  // so the next calls would fail. we only need to check that TypeScript types work
  const foo: 'bar' = map?.get('foo')?.value()!;
  const baz: 'qux' = map?.get('nestedMap')?.get('baz')?.value()!;
  // check LiveCounter type also behaves as expected
  const value: number = counter?.value()!;

  // check subscription callback has correct TypeScript types
  const { unsubscribe } = myObject.subscribe(({ object, message }) => {
    const typedObject: Ably.AnyPathObject = object;
    const typedMessage: Ably.ObjectMessage | undefined = message;
  });
  unsubscribe();

  // check can provide custom types for the object.get() method, ignoring global AblyObjectsTypes interface
  const explicitObjectType: Ably.PathObject<LiveMap<ExplicitObjectType>> =
    await channel.object.get<ExplicitObjectType>();
  const someOtherKey: string | undefined = explicitObjectType.get('someOtherKey').value();
};
