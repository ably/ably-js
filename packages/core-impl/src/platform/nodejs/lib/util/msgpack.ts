// The Node.js implementation's MessagePack codec, under the same default-export shape as the web
// implementation's ../../../web/lib/util/msgpack.ts, so that `@ably/pubsub-core-impl/msgpack` and
// `@ably/pubsub-core-impl/bundled-msgpack` can resolve to either by export condition.
import msgpack = require('@ably/msgpack-js');

export default msgpack;
