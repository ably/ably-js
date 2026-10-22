/**
 * The type surface of the core's LiveObjects plugin, minus the stateless HTTP client's objects
 * API, which this package does not offer. Safe as a star re-export because it resolves at compile
 * time only — see ../../core-impl/side/core-exports.ts for why the *runtime* re-export is enumerated
 * instead.
 */
export * from '@ably/pubsub-core/liveobjects-types';
