import type { ClientOptions, PubSubClient } from '../index.js';

/**
 * Everything `@ably/pubsub-device` exports, from a build of it that keeps every log.
 *
 * The package root strips every log below error level from the client, so a `logLevel` above
 * error there has nothing more to show. This entry point is the same client with full logging,
 * for diagnosing an app during development. It is larger, so import it in development builds only.
 */
export * from '../index.js';

/**
 * Creates a Pub/Sub client for a device, exactly as the `createClient` of `@ably/pubsub-device`
 * does, from a build that keeps every log. Choose how much it logs with `ClientOptions.logLevel`.
 *
 * Clients from this entry point and from the package root are separate copies of the client.
 * Errors from either pass `instanceof ErrorInfo` against the `ErrorInfo` exported by both.
 *
 * @param options - A client options object, an Ably API key, or an Ably token.
 */
export declare function createClient(options: ClientOptions | string): PubSubClient;
