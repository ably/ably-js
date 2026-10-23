/**
 * The MessagePack plugin of `@ably/pubsub-device`, whose own bundles leave the codec out (see
 * ../src/platform/no-msgpack.ts). It is the platform's codec, chosen by the `node` or `default`
 * condition of `@ably/pubsub-core-impl/msgpack` when the plugin is bundled, and exposed under the
 * name a client looks it up by in `ClientOptions.plugins`.
 */
import msgpack from '@ably/pubsub-core-impl/msgpack';

export const MsgPack = msgpack;
