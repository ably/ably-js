/**
 * The tree-shakable variant of the core, plus a factory that declares the device side.
 *
 * Build a client from only the plugins you need, rather than the all-in-one client the root entry
 * point's `createClient` returns. Both return a `PubSubClient`. You must supply at least one HTTP
 * request implementation and at least one transport.
 *
 * ```javascript
 * import { createClient, WebSocketTransport, FetchRequest } from '@ably/pubsub-device/modular';
 *
 * const client = createClient({
 *   key: 'your-ably-api-key',
 *   clientId: 'me',
 *   plugins: { WebSocketTransport, FetchRequest },
 * });
 * ```
 *
 * This entry point is ESM only, because the core's modular variant is: `require()` of this subpath
 * does not resolve. Use `@ably/pubsub-device` if you need CommonJS.
 */
import type { ModularPlugins } from '@ably/pubsub-core/modular';
import type { ClientOptions, CorePlugins } from '@ably/pubsub-core/api';
import type { PubSubClient } from '../index.js';

// Enumerated rather than star-re-exported, so that only the chosen names are public. The client
// classes stay out: a client is created with `createClient` and typed as `PubSubClient`, and this
// package offers no HTTP client. The `Http` plugin stays in, because it is not a client — it is what
// gives a modular client history, stats, `request()` and the other REST features. A name the core's
// modular variant adds must be added here too, or it is not exported.
export {
  generateRandomKey,
  getDefaultCryptoParams,
  decodeMessage,
  decodeEncryptedMessage,
  decodeMessages,
  decodeEncryptedMessages,
  decodePresenceMessage,
  decodePresenceMessages,
  decodeEncryptedPresenceMessage,
  decodeEncryptedPresenceMessages,
  constructPresenceMessage,
  decodeAnnotation,
  decodeAnnotations,
  Http,
  Crypto,
  MsgPack,
  RealtimePresence,
  Annotations,
  WebSocketTransport,
  XHRPolling,
  XHRRequest,
  FetchRequest,
  MessageInteractions,
  ErrorInfo,
} from '@ably/pubsub-core/modular';
export type { ModularPlugins } from '@ably/pubsub-core/modular';
export type { PubSubClient };

/**
 * Creates a realtime client that declares the device side, so that Ably counts its traffic as an
 * end user's rather than as your own backend's. See the `createClient` documentation on the root
 * entry point for what declaring the device side means, and for when to use
 * `@ably/pubsub-server` instead.
 *
 * Unlike the root `createClient`, this accepts only a `ClientOptions` object and not an API key or
 * token string. A modular client is unusable without the plugins that `ClientOptions.plugins`
 * carries, and a bare string has nowhere to put them.
 *
 * @param options - The client options, whose `plugins` property selects the functionality to
 * include. At minimum this needs an HTTP request implementation (`FetchRequest` or `XHRRequest`)
 * and a transport (`WebSocketTransport` or `XHRPolling`).
 */
export declare function createClient(options: ClientOptions<CorePlugins & ModularPlugins>): PubSubClient;
