/**
 * The MessagePack plugin, which lets a client from `@ably/pubsub-device` use the binary MessagePack
 * protocol instead of JSON.
 *
 * On the web and React Native, the package leaves MessagePack out of its client, to keep the client
 * small: without this plugin, a client there always uses JSON, and `ClientOptions.useBinaryProtocol`
 * has no effect. Pass the plugin in `ClientOptions.plugins` to make MessagePack available:
 *
 * ```javascript
 * import { createClient } from '@ably/pubsub-device';
 * import { MsgPack } from '@ably/pubsub-device/msgpack';
 *
 * const client = createClient({
 *   key: 'your-ably-api-key',
 *   clientId: 'me',
 *   useBinaryProtocol: true,
 *   plugins: { MsgPack },
 * });
 * ```
 *
 * With the plugin, `useBinaryProtocol` chooses the protocol, and defaults to `false`. On Node.js,
 * the client includes MessagePack and uses it by default, so it needs no plugin, though passing it
 * there is harmless. The plugin works with a client from
 * `@ably/pubsub-device`, `@ably/pubsub-device/debug` or `@ably/pubsub-device/modular` alike.
 */
export declare const MsgPack: unknown;
