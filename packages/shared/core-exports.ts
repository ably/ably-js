/**
 * The public value surface of the core, in one place so that both packages re-export the
 * same list and it only has to grow once: `ErrorInfo`, and the `Crypto`, `Message`,
 * `PresenceMessage` and `Annotation` classes, whose static methods need no client.
 *
 * The core's client classes are deliberately absent. A client built by constructing
 * `DefaultPubSubRealtimeClient` or `DefaultPubSubHttpClient` directly declares no side, so
 * re-exporting either from a per-side package would hand consumers a way to build a client that
 * silently opts out of the very thing the package exists to declare. The factories are the only
 * way in. They reach the classes through ./core-clients.ts.
 *
 * What remains is enumerated rather than star-re-exported, for two reasons:
 *
 * The core ships as UMD with `libraryExport: 'default'`. `export * from '@ably/pubsub-core'` does
 * resolve, but cjs-module-lexer over-detects two bogus bindings from that wrapper — `Ably`
 * and a literal `module.exports` — which a star re-export would publish as part of this
 * package's own namespace.
 *
 * The core's platform entry points also export the client classes, `msgpack` and
 * `makeProtocolMessageFromDeserialized`, which are internal and absent from the core's public
 * typings. A star re-export would make them public API of this package.
 *
 * The type surface is handled separately, in each package's hand-written `index.d.ts`,
 * where a star re-export is safe because it resolves at compile time only.
 */
export { ErrorInfo, Crypto, Message, PresenceMessage, Annotation } from '@ably/pubsub-core';
