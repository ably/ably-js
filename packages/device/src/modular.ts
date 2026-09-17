// The tree-shakable variant of the Pub/Sub implementation, from which a consumer of this package
// can build a minimal client.
//
// ESM only: it is published behind an `import` condition alone. The implementation is bundled into
// a single ES module that keeps every plugin a separate top-level binding, so the consumer's
// bundler can still drop the plugins the app does not import.

import { BaseRealtime } from '@ably/pubsub-core-impl/modular';
import type { ModularPlugins } from '@ably/pubsub-core/modular';
import type { ClientOptions, CorePlugins } from '@ably/pubsub-core/api';
import { deviceAgentIdentifier, optionsWithSideAgent } from '../../core-impl/side/side';

// Enumerated rather than star-re-exported so that `BaseHttp`, the tree-shakable stateless HTTP
// client, stays out: this package offers no HTTP client. The `Http` plugin stays in, because it is
// not a client — it is what gives a `BaseRealtime` history, stats, `request()` and the other REST
// features. A name the implementation's modular variant adds must be added here too, or it is not exported.
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
  BaseRealtime,
  ErrorInfo,
} from '@ably/pubsub-core-impl/modular';

/**
 * Creates a modular realtime client that declares the device side.
 *
 * Unlike the root `createClient`, this takes only a `ClientOptions` object, never an API key or
 * token string: a modular client cannot function without the plugins that `ClientOptions.plugins`
 * carries, and a bare string has nowhere to put them.
 *
 * The contract is documented on the declaration in ../modular/index.d.ts, which is what consumers
 * see.
 */
export function createClient(options: ClientOptions<CorePlugins & ModularPlugins>): BaseRealtime {
  // The signature already forbids bare key/token strings, but a JS caller can still pass one.
  // Hand it to the constructor unstamped rather than normalising it into an options object:
  // the implementation deliberately rejects strings for modular clients with an error telling the caller
  // to provide an options object with a `plugins` property, and converting the string here
  // would replace that with a generic missing-plugin failure the caller cannot act on. No side
  // agent is needed on a path that always throws.
  if (typeof options === 'string') {
    return new BaseRealtime(options as unknown as ClientOptions<CorePlugins & ModularPlugins>);
  }

  // `optionsWithSideAgent` is typed against the default plugin map, because that is all the
  // root factories need. It only ever replaces `agents`, copying every other option across by
  // reference — `plugins` included, untouched — so the wider plugin type a modular client requires
  // survives the call unharmed, and the cast restores it to the signature.
  const withSideAgent = optionsWithSideAgent(options, deviceAgentIdentifier) as ClientOptions<
    CorePlugins & ModularPlugins
  >;

  return new BaseRealtime(withSideAgent);
}
