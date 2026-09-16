import type { ClientOptions, PubSubRealtimeClient } from '@ably/pubsub-core/types';

/**
 * The core's type surface, minus the stateless HTTP client and the types only it reaches. Safe as
 * a star re-export because it resolves at compile time only — see ../shared/core-exports.ts for
 * why the *runtime* re-export is enumerated instead.
 *
 * This is `@ably/pubsub-core/types` rather than the package root because this package offers no
 * HTTP client, and TypeScript has no way to re-export a module minus some names. The core keeps
 * the HTTP-only declarations in a module of their own, which only the root re-exports.
 */
export * from '@ably/pubsub-core/types';

/**
 * A Pub/Sub client for a device, as {@link createClient} returns it.
 *
 * It is the core's {@link PubSubRealtimeClient} under the name this package uses: a device has one
 * kind of client, so there is nothing for the longer name to distinguish it from.
 */
export type PubSubClient = PubSubRealtimeClient;

/**
 * Creates a Pub/Sub client for a device: a browser, a mobile app, or any other runtime
 * where the code is under an end user's control.
 *
 * Clients come only from this factory, or from the `createClient` of `@ably/pubsub-device/modular`
 * for the tree-shakable variant. The client declares its side by
 * sending an `ably-pubsub-device` entry in its `Ably-Agent`, which is what tells Ably this
 * connection belongs to a device.
 *
 * Device traffic counts toward your account's monthly active users. On an account billed
 * by MAU, a device connection must carry a client ID and is rejected at connect without
 * one, so set `clientId` here or issue tokens that carry one. A device client ID is also
 * subject to a per-client-ID concurrency limit.
 *
 * Use `createHttpClient` or `createRealtimeClient` from `@ably/pubsub-server` for a
 * backend service instead, so that its traffic is exempt from all three.
 *
 * @param options - A client options object, an Ably API key, or an Ably token.
 */
export declare function createClient(options: ClientOptions | string): PubSubClient;
