// The ESLint warning is triggered because we only use these types in a documentation comment.
/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */
import { PubSubRealtimeClient } from './ably';
import { BaseRealtime, Http } from './modular';
/* eslint-enable no-unused-vars, @typescript-eslint/no-unused-vars */

/**
 * Provides a {@link PubSubRealtimeClient} with the ability to be activated as a target for push notifications.
 *
 * To create a client that includes this plugin, include it in the client options that you pass to `createClient()`:
 *
 * ```javascript
 * import { createClient } from '@ably/pubsub-device';
 * import { Push } from '@ably/pubsub-device/push';
 * const realtime = createClient({ ...options, plugins: { Push } });
 * ```
 *
 * The Push plugin can also be used with a {@link BaseRealtime} client, with the additional requirement that you must also use the {@link Http} plugin
 *
 * ```javascript
 * import { createClient, Http, WebSocketTransport, FetchRequest } from '@ably/pubsub-device/modular';
 * import { Push } from '@ably/pubsub-device/push';
 * const realtime = createClient({ ...options, plugins: { Http, WebSocketTransport, FetchRequest, Push } });
 * ```
 */
declare const Push: any;

export = Push;
