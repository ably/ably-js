// The declarations TypeScript sees for `@ably/pubsub-core-impl/bundled-msgpack`: the MessagePack
// codec the web and React Native entry points give their client classes, or `null` in a build that
// leaves MessagePack to a plugin. See ../../src/platform/no-msgpack.ts.
import type { MsgPack } from '../../src/common/types/msgpack';

declare const msgpack: MsgPack | null;

export default msgpack;
