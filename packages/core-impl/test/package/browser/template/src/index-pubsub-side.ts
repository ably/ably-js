// Checks that the per-side Pub/Sub packages resolve, type-check and bundle the way a real
// consumer's toolchain sees them: installed from their own tarballs, with the core satisfying
// their exact peer dependency. That is worth exercising separately from the core because each
// package is a wrapper whose declarations re-export the core's by bare specifier, so its types
// only resolve if the core resolves from inside it too.
//
// This covers resolution, types and bundling only. The agent identifier each factory stamps —
// what declaring a side means, per the note in packages/device/README.md — is asserted on the
// wire in packages/core-impl/test/unit/pubsub_side_agent.test.js.
//
// Nothing here connects to Ably, so this file needs no sandbox key.
import * as PubSubDevice from '@ably/pubsub-device';
import * as PubSubDeviceModular from '@ably/pubsub-device/modular';
import { Push } from '@ably/pubsub-device/push';
import { LiveObjects, LiveMap, LiveCounter } from '@ably/pubsub-device/liveobjects';
import * as PubSubServer from '@ably/pubsub-server';

declare module globalThis {
  var testAblyPackage: () => Promise<void>;
}

// Both packages re-export the core's type surface, so a consumer can annotate with the types
// without also depending on `@ably/pubsub-core` directly.
async function attachChannel(channel: PubSubDevice.RealtimeChannel) {
  await channel.attach();
}

function inspectStats(page: PubSubServer.PaginatedResult<PubSubServer.Stats>) {
  return page.items.length;
}

globalThis.testAblyPackage = async function () {
  const device = PubSubDevice.createClient({ key: 'app.key:secret', autoConnect: false, clientId: 'someone' });
  const serverRealtime = PubSubServer.createRealtimeClient({ key: 'app.key:secret', autoConnect: false });
  const serverHttp = PubSubServer.createHttpClient({ key: 'app.key:secret' });

  // Check the factories return the client kinds their declarations promise.
  const deviceChannel: PubSubDevice.RealtimeChannel = device.channels.get('channel');
  const serverChannel: PubSubServer.RealtimeChannel = serverRealtime.channels.get('channel');
  void attachChannel;
  void inspectStats;
  void deviceChannel;
  void serverChannel;
  void serverHttp.request;

  // The modular subpath re-exports the core's tree-shakable variant and adds its own side-stamping
  // factory. It is ESM-only, so this also checks the `import` condition resolves on its own.
  const modularDevice = PubSubDeviceModular.createClient({
    key: 'app.key:secret',
    autoConnect: false,
    clientId: 'someone',
    plugins: {
      WebSocketTransport: PubSubDeviceModular.WebSocketTransport,
      FetchRequest: PubSubDeviceModular.FetchRequest,
    },
  });
  if (!(modularDevice instanceof PubSubDeviceModular.BaseRealtime)) {
    throw new Error('the modular factory did not return a BaseRealtime');
  }
  modularDevice.close();

  // Every plugin subpath exports under a name, so registering one reads the same way whichever
  // plugin it is. Each has to be the object the core exports, or the client would not recognise it.
  const withPlugins = PubSubDevice.createClient({
    key: 'app.key:secret',
    autoConnect: false,
    clientId: 'someone',
    plugins: { Push, LiveObjects },
  });
  void withPlugins.channels.get('channel').push;
  withPlugins.close();

  // `LiveMap` and `LiveCounter` are values as well as types: their static `create()` builds the value
  // to assign to an object path.
  const initialMap = LiveMap.create({ count: LiveCounter.create(1) });
  void initialMap;

  // Check the device's client type goes by both names, and the static helpers are classes both
  // packages export by name.
  const deviceClient: PubSubDevice.PubSubClient = device;
  const sameClient: PubSubDevice.PubSubRealtimeClient = deviceClient;
  void sameClient;
  const presenceMessage: PubSubServer.PresenceMessage = PubSubServer.PresenceMessage.fromValues({ clientId: 'x' });
  void presenceMessage;
  void PubSubDevice.Message.fromEncoded;
  void PubSubDevice.Annotation.fromEncodedArray;
  void PubSubDevice.Crypto.generateRandomKey;

  // A client constructed directly declares no side, so neither package exposes a client class.
  // @ts-expect-error
  void PubSubDevice.DefaultPubSubRealtimeClient;
  // @ts-expect-error
  void PubSubServer.DefaultPubSubHttpClient;

  // The device has no HTTP client, so neither its factory nor the types only it reaches are exported.
  // @ts-expect-error
  void PubSubDevice.createHttpClient;
  // @ts-expect-error
  type DeviceHttpClient = PubSubDevice.PubSubHttpClient;
  // @ts-expect-error
  type DeviceRestChannel = PubSubDevice.Channel;
  // @ts-expect-error
  void PubSubDeviceModular.BaseHttp;
  const serverRestChannel: PubSubServer.Channel = serverHttp.channels.get('channel');
  void serverRestChannel;

  // Check the re-exported error type is the core's, so instanceof works across the boundary.
  const error: PubSubDevice.ErrorInfo = new PubSubDevice.ErrorInfo('message', 40000, 400);
  if (!(error instanceof PubSubServer.ErrorInfo)) {
    throw new Error('the two packages disagree about ErrorInfo, so more than one core is installed');
  }

  device.close();
  serverRealtime.close();
};
