// The ESLint warning is triggered because we only use these types in a documentation comment.
/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */
import { RealtimeClient } from './ably';
import { BaseRealtime } from './modular';
/* eslint-enable no-unused-vars, @typescript-eslint/no-unused-vars */

/**
 * Provides a {@link RealtimeClient} instance with the ability to use Objects functionality.
 *
 * To create a client that includes this plugin, include it in the client options that you pass to the {@link RealtimeClient.constructor}:
 *
 * ```javascript
 * import { Realtime } from 'ably';
 * import Objects from 'ably/objects';
 * const realtime = new Realtime({ ...options, plugins: { Objects } });
 * ```
 *
 * The Objects plugin can also be used with a {@link BaseRealtime} client
 *
 * ```javascript
 * import { BaseRealtime, WebSocketTransport, FetchRequest } from 'ably/modular';
 * import Objects from 'ably/objects';
 * const realtime = new BaseRealtime({ ...options, plugins: { WebSocketTransport, FetchRequest, Objects } });
 * ```
 */
declare const Objects: any;

export = Objects;
