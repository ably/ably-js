// The ESLint warning is triggered because we only use these types in a documentation comment.
/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */
import {
  LiveCounter as LiveCounterType,
  LiveMap as LiveMapType,
  LiveMapOperations,
  RealtimeClient,
  Value,
} from './ably';
import { BaseRealtime } from './modular';
/* eslint-enable no-unused-vars, @typescript-eslint/no-unused-vars */

/**
 * Static utilities related to LiveMap instances.
 */
export class LiveMap {
  /**
   * Creates a {@link LiveMapType | LiveMap} value type that can be passed to mutation methods
   * (such as {@link LiveMapOperations.set}) to assign a new LiveMap to the channel object.
   *
   * @param initialEntries - Optional initial entries for the new LiveMap object.
   * @returns A {@link LiveMapType | LiveMap} value type representing the initial state of the new LiveMap.
   * @experimental
   */
  static create<T extends Record<string, Value>>(
    initialEntries?: T,
  ): LiveMapType<T extends Record<string, Value> ? T : {}>;
}

/**
 * Static utilities related to LiveCounter instances.
 */
export class LiveCounter {
  /**
   * Creates a {@link LiveCounterType | LiveCounter} value type that can be passed to mutation methods
   * (such as {@link LiveMapOperations.set}) to assign a new LiveCounter to the channel object.
   *
   * @param initialCount - Optional initial count for the new LiveCounter object.
   * @returns A {@link LiveCounterType | LiveCounter} value type representing the initial state of the new LiveCounter.
   * @experimental
   */
  static create(initialCount?: number): LiveCounterType;
}

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

export default Objects;
