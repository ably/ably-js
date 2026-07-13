// The ESLint warning is triggered because we only use these types in a documentation comment.
/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */
import { RealtimeClient, RestClient } from './ably';
/* eslint-enable no-unused-vars, @typescript-eslint/no-unused-vars */

/**
 * Asynchronous key-value storage used to persist push activation state. Matches the interface of
 * `@react-native-async-storage/async-storage`, so its default export can be passed directly.
 */
export interface ReactNativePushStorage {
  /**
   * Retrieves a stored value.
   *
   * @param key - The key to read.
   * @returns A promise which resolves to the stored value, or `null` if absent.
   */
  getItem(key: string): Promise<string | null>;
  /**
   * Stores a value.
   *
   * @param key - The key to write.
   * @param value - The value to store.
   * @returns A promise which resolves once the value is persisted.
   */
  setItem(key: string, value: string): Promise<void>;
  /**
   * Removes a stored value.
   *
   * @param key - The key to remove.
   * @returns A promise which resolves once the value is removed.
   */
  removeItem(key: string): Promise<void>;
}

/**
 * A push token obtained by the application, along with the transport it belongs to.
 *
 * Return `transportType: 'fcm'` for a Firebase Cloud Messaging registration token (what
 * `messaging().getToken()` from `@react-native-firebase/messaging` returns, on both Android and
 * iOS), or `transportType: 'apns'` for a raw APNs device token (e.g. from
 * `messaging().getAPNSToken()`).
 */
export interface ReactNativePushToken {
  /**
   * The push transport the token belongs to.
   */
  transportType: 'fcm' | 'apns';
  /**
   * The token itself: an FCM registration token or an APNs device token.
   */
  token: string;
}

/**
 * Options for {@link ReactNativePush.create}.
 */
export interface ReactNativePushOptions {
  /**
   * Persistent storage for push activation state, e.g. the default export of
   * `@react-native-async-storage/async-storage`.
   */
  storage: ReactNativePushStorage;
  /**
   * Called by the plugin whenever it needs a push token. Requesting notification permissions
   * beforehand is the application's responsibility.
   */
  requestToken: () => Promise<ReactNativePushToken>;
}

/**
 * Provides a {@link RestClient} or {@link RealtimeClient} instance with the ability to be activated as a target for push notifications in a React Native application.
 *
 * Unlike the web `ably/push` plugin, the push environment is supplied by your application: pass an
 * async storage implementation and a token callback to `create()`, then register the returned
 * object under the `Push` plugin key:
 *
 * ```javascript
 * import { Realtime } from 'ably';
 * import ReactNativePush from 'ably/react-native-push';
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 * import messaging from '@react-native-firebase/messaging';
 *
 * const Push = ReactNativePush.create({
 *   storage: AsyncStorage,
 *   requestToken: async () => {
 *     // permission prompts are your responsibility, e.g. via messaging().requestPermission()
 *     return { transportType: 'fcm', token: await messaging().getToken() };
 *   },
 * });
 *
 * const realtime = new Realtime({ ...options, plugins: { Push } });
 * await realtime.push.activate();
 * ```
 */
declare const ReactNativePush: {
  /**
   * Creates a push plugin configured for this React Native application.
   *
   * @param options - The storage and token acquisition hooks supplied by your application.
   * @returns A plugin object to pass as `plugins: { Push }` in the client options.
   */
  create(options: ReactNativePushOptions): any;
};

/**
 * Creates a push plugin configured for this React Native application.
 *
 * @param options - The storage and token acquisition hooks supplied by your application.
 * @returns A plugin object to pass as `plugins: { Push }` in the client options.
 */
export declare function create(options: ReactNativePushOptions): any;

export default ReactNativePush;
