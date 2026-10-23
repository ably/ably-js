// What `@ably/pubsub-core-impl/bundled-msgpack` resolves to under the `ably-msgpack-plugin` export
// condition, which the bundles of `@ably/pubsub-device` are built with: no codec at all, so that the
// web and React Native entry points bundle none, and their clients use MessagePack only when the app
// passes the `MsgPack` plugin from `@ably/pubsub-device/msgpack`. See ./web/index.ts. The Node.js
// entry point imports its codec directly, so the package's Node.js builds keep MessagePack.
const msgpack = null;

export default msgpack;
