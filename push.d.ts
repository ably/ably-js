// The ESLint warning is triggered because we only use these types in a documentation comment.
/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */
import { RealtimeClient, RestClient } from './ably';
import { BaseRest, BaseRealtime, Rest } from './modular';
/* eslint-enable no-unused-vars, @typescript-eslint/no-unused-vars */

/**
 * Provides a {@link RestClient} or {@link RealtimeClient} instance with the ability to be activated as a target for push notifications.
 *
 * To create a client that includes this plugin, include it in the client options that you pass to the {@link RestClient.constructor} or {@link RealtimeClient.constructor}:
 *
 * ```javascript
 * import { Realtime } from 'ably';
 * import Push from 'ably/push';
 * const realtime = new Realtime({ ...options, plugins: { Push } });
 * ```
 *
 * The Push plugin can also be used with a {@link BaseRest} or {@link BaseRealtime} client, with the additional requirement that you must also use the {@link Rest} plugin
 *
 * ```javascript
 * import { BaseRealtime, Rest, WebSocketTransport, FetchRequest } from 'ably/modular';
 * import Push from 'ably/push';
 * const realtime = new BaseRealtime({ ...options, plugins: { Rest, WebSocketTransport, FetchRequest, Push } });
 * ```
 */
declare const Push: any;

export = Push;
