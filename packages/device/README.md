# @ably/pubsub-device

The Ably Pub/Sub client for **devices**: browsers, React Native, Electron, mobile and desktop apps, and any other runtime where the code runs under an end user's control.

This package is a thin wrapper around [`@ably/pubsub-core`](https://www.npmjs.com/package/@ably/pubsub-core). It re-exports that package's public API, minus the stateless HTTP client a device has no use for, and creates clients through a factory that declares which side of the connection you are on, so Ably can tell your users apart from your own backend services. Use [`@ably/pubsub-server`](https://www.npmjs.com/package/@ably/pubsub-server) for a backend service instead.

## Installation

```sh
npm install @ably/pubsub-device
```

`@ably/pubsub-core` is an exact peer dependency, and npm installs it for you. The two are released together on the same version, so keep them in step.

## Usage

```javascript
import { createClient } from '@ably/pubsub-device';

const client = createClient({ key: 'your-ably-api-key', clientId: 'me' });

await client.connection.once('connected');

const channel = client.channels.get('test-channel');
await channel.subscribe((message) => {
  console.log(`Received message: ${message.data}`);
});

await channel.publish('test-event', 'hello world');
```

`createClient` returns a `PubSubClient`, the realtime client that everything in the [Ably Pub/Sub JavaScript documentation](https://ably.com/docs/getting-started/javascript) describes. It is the only way to create one: this package exports no client class to construct, because a client constructed directly would declare no side.

`PubSubClient` is the name this package gives the core's `PubSubRealtimeClient` interface, and either name works in a type annotation.

In production, prefer [token authentication](https://ably.com/docs/auth/token) over embedding an API key in code that ships to a device.

## Entry points

Everything a device needs from the core SDK is re-exported here, so you never need to add `@ably/pubsub-core` as a dependency of your own alongside this package.

| Import from                             | What you get                                                          |
| --------------------------------------- | --------------------------------------------------------------------- |
| `@ably/pubsub-device`                   | `createClient`, plus the core's public API and type surface           |
| `@ably/pubsub-device/modular`           | `createClient` over the tree-shakable `BaseRealtime`, and its plugins |
| `@ably/pubsub-device/react`             | The React hooks: `AblyProvider`, `useChannel`, `usePresence`, …       |
| `@ably/pubsub-device/liveobjects`       | The LiveObjects plugin                                                |
| `@ably/pubsub-device/liveobjects/react` | The `useObject` React hook for LiveObjects                            |
| `@ably/pubsub-device/push`              | The web push plugin                                                   |
| `@ably/pubsub-device/react-native-push` | The React Native push plugin                                          |

```javascript
import { createClient } from '@ably/pubsub-device';
import { AblyProvider, useChannel } from '@ably/pubsub-device/react';
import { LiveObjects } from '@ably/pubsub-device/liveobjects';
import { Push } from '@ably/pubsub-device/push';
```

The root entry point also exports the `Message`, `PresenceMessage`, `Annotation` and `Crypto` classes, whose static methods need no client: for example, `Message.fromEncoded()` decodes a message received from a source other than a channel, such as a webhook or a queue, and `Crypto.generateRandomKey()` generates a key for an encrypted channel.

```javascript
import { Message, Crypto } from '@ably/pubsub-device';

const message = await Message.fromEncoded(webhookPayload, { cipher: { key } });
```

Every subpath exports under a name, so the import spelling is the same whichever one you reach for, and the same under both module systems. Each is the same object the core exports, not a copy, so a plugin registered from here is the one the client expects.

`@ably/pubsub-device/modular` can only be imported, not `require`d, because the core's modular variant is published behind an `import` condition alone. Every other subpath above works under both module systems.

Use `@ably/pubsub-device/react-native-push` in a React Native application; the web push plugin is not a substitute for it.

## What declaring the device side means

Device traffic counts toward your account's monthly active users. On an account billed by MAU:

- a device connection **must** carry a client ID, and is rejected at connect without one, so set `clientId` or issue tokens that carry one;
- a device client ID is subject to a per-client-ID concurrency limit.

Traffic from `@ably/pubsub-server` is exempt from both.

Choose between the two packages by who owns the runtime, not by which side is cheaper to declare. Code that runs on an end user's device (a browser tab, a mobile app, a desktop app) belongs on `@ably/pubsub-device`; code that runs on infrastructure you operate belongs on `@ably/pubsub-server`. Declaring the device side from a backend service inflates your monthly active user count and subjects that service to the per-client-ID concurrency limit; declaring the server side from a device claims an exemption it is not entitled to.

## Migrating from `ably`

Replace the `Realtime` constructor with `createClient`, and change the import:

```diff
- import * as Ably from 'ably';
- const client = new Ably.Realtime({ key, clientId: 'me' });
+ import { createClient } from '@ably/pubsub-device';
+ const client = createClient({ key, clientId: 'me' });
```

Replace the `Realtime.Message`, `Realtime.PresenceMessage`, `Realtime.Annotation` and `Realtime.Crypto` statics with the classes of the same names, imported from this package. Replace the `Ably.RealtimeClient` type with `PubSubClient`. Nothing else changes.

This package offers no stateless HTTP client. The realtime client covers what a device needs from Ably's REST API, including history, `request()`, `stats()` and `time()`. Do not reach for `@ably/pubsub-server` for an HTTP client, which would declare your device a server and claim an exemption it is not entitled to.

## Support, feedback, and troubleshooting

See the [ably-js repository](https://github.com/ably/ably-js), or [raise an issue](https://github.com/ably/ably-js/issues).
