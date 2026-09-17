/**
 * The user-facing Pub/Sub API: every interface, type and namespace a client exposes, without the
 * core's runtime classes. `@ably/pubsub-device` and `@ably/pubsub-server` re-export this surface,
 * and the Pub/Sub implementation types itself against it.
 *
 * It differs from the package root only in what the root adds: the runtime `ErrorInfo` with its
 * `fromValues` and `fromWireValues` factories, `PartialErrorInfo`, and the runtime `EventEmitter`
 * class. Those are for the SDKs layered on Pub/Sub, not for applications.
 */
export * from './ably';
