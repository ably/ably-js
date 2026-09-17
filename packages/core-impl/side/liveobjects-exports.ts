/**
 * The public value surface of the core's LiveObjects plugin, in one place so that both packages
 * re-export the same list.
 *
 * The plugin's values are `LiveObjects`, which is passed to the client, and `LiveMap` and
 * `LiveCounter`, whose static `create()` builds the value to assign to an object path. Everything
 * else it declares is a type, and types are handled by the star re-export in each package's
 * hand-written `liveobjects/index.d.ts`. Enumerated rather than star-re-exported at runtime for the
 * same reason as the root surface — see ./core-exports.ts: the implementation's entry point also
 * exports `ObjectId`, `ObjectMessage` and other internals.
 */
export { LiveObjects, LiveMap, LiveCounter } from '@ably/pubsub-core-impl/liveobjects';
