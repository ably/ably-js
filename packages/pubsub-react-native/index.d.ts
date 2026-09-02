/**
 * Ably Pub/Sub SDK for React Native devices.
 *
 * Provides a device-side realtime client that can be activated as a target for push
 * notifications in a React Native application. Unlike the web SDK, the push environment
 * is supplied by your application: pass an async storage implementation and a token
 * callback in {@link ReactNativeClientOptions.push}:
 *
 * ```javascript
 * import { createClient } from '@ably/pubsub-react-native';
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 * import messaging from '@react-native-firebase/messaging';
 *
 * const client = createClient({
 *   authUrl: 'https://example.com/auth',
 *   clientId: 'my-client-id',
 *   push: {
 *     storage: AsyncStorage,
 *     requestToken: async () => {
 *       // permission prompts are your responsibility, e.g. via messaging().requestPermission()
 *       return { transportType: 'fcm', token: await messaging().getToken() };
 *     },
 *   },
 * });
 * await client.push.activate();
 * ```
 *
 * Types-only spike for PDR-091.
 */

// The same-name `export type X` + `export declare const X` pairs below are deliberate
// type+value declaration merges (the values cannot live in the never-published
// @ably/pubsub-common), which the lint rule cannot distinguish from accidental redeclaration.
/* eslint-disable @typescript-eslint/no-redeclare */

import type { DeviceClient, Push as DevicePush } from '@ably/pubsub-device';
import type {
  CommonClientOptions,
  HttpOptions,
  RealtimeOptions,
  ErrorInfo as ErrorInfoType,
  ErrorInfoConstructor,
  Crypto as CryptoStatic,
  Message as MessageType,
  MessageStatic,
  PresenceMessage as PresenceMessageType,
  PresenceMessageStatic,
  Annotation as AnnotationType,
  AnnotationStatic,
} from '@ably/pubsub-common';

export * from '@ably/pubsub-common';
export type {
  RealtimeChannel,
  PushChannel,
  LocalDevice,
  RegisterCallback,
  DeregisterCallback,
} from '@ably/pubsub-device';

/**
 * A generic Ably error object that contains an Ably-specific status code, and a generic
 * status code. Errors returned from the Ably server are compatible with the `ErrorInfo`
 * structure and should result in errors that inherit from `ErrorInfo`.
 */
export type ErrorInfo = ErrorInfoType;
/**
 * The runtime `ErrorInfo` constructor, for creating `ErrorInfo` instances and for
 * `instanceof` checks against errors surfaced by the SDK.
 */
export declare const ErrorInfo: ErrorInfoConstructor;
/**
 * Contains the properties required to configure the encryption of message payloads.
 */
export type Crypto = CryptoStatic;
/**
 * The runtime `Crypto` object, used to generate keys and cipher params for message
 * payload encryption.
 */
export declare const Crypto: CryptoStatic;
/**
 * Contains an individual message that is sent to, or received from, Ably.
 */
export type Message = MessageType;
/**
 * The runtime `Message` static object, providing utilities for working with messages,
 * such as decoding messages received over a different transport.
 */
export declare const Message: MessageStatic;
/**
 * Contains an individual presence update sent to, or received from, Ably.
 */
export type PresenceMessage = PresenceMessageType;
/**
 * The runtime `PresenceMessage` static object, providing utilities for working with
 * presence messages, such as decoding presence messages received over a different
 * transport.
 */
export declare const PresenceMessage: PresenceMessageStatic;
/**
 * Contains an individual annotation to a message, sent to or received from Ably.
 */
export type Annotation = AnnotationType;
/**
 * The runtime `Annotation` static object, providing utilities for working with
 * annotations, such as decoding annotations received over a different transport.
 */
export declare const Annotation: AnnotationStatic;

/**
 * A push token obtained by the application, along with the transport it belongs to.
 *
 * Use `transportType: 'fcm'` for a Firebase Cloud Messaging registration token (what
 * `messaging().getToken()` from `@react-native-firebase/messaging` returns, on both
 * Android and iOS), or `transportType: 'apns'` for a raw APNs device token (e.g. from
 * `messaging().getAPNSToken()`).
 */
export interface PushDeviceToken {
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
 * Asynchronous key-value storage used to persist push activation state. Matches the
 * interface of `@react-native-async-storage/async-storage`, so its default export can be
 * passed directly.
 */
export interface PushStorage {
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
 * The push environment supplied by the application, set via
 * {@link ReactNativeClientOptions.push}.
 */
export interface PushConfig {
  /**
   * Persistent storage for push activation state, e.g. the default export of
   * `@react-native-async-storage/async-storage`.
   */
  storage: PushStorage;
  /**
   * Called by the SDK whenever it needs a push token. Requesting notification
   * permissions beforehand is the application's responsibility.
   *
   * @returns A promise which resolves to the device's current push token.
   */
  requestToken(): Promise<PushDeviceToken>;
}

/**
 * Passes additional client-specific properties to {@link createClient}.
 */
export interface ReactNativeClientOptions extends CommonClientOptions, RealtimeOptions, HttpOptions {
  /**
   * The client ID this connection will assume. Required: traffic from a device-side SDK
   * must carry a client identity, which Ably uses to classify the connection for
   * monthly-active-user accounting. Narrows the optional `AuthOptions.clientId` to a
   * required property.
   */
  clientId: string;
  /**
   * The push environment for this application: persistent storage for activation state
   * and a callback for obtaining push tokens. Optional: applications that do not use
   * push notifications need not wire storage and tokens, but `push.activate()` fails at
   * runtime if this is not configured.
   */
  push?: PushConfig;
}

/**
 * Enables a device to be registered and deregistered from receiving push notifications.
 */
export interface Push extends DevicePush {
  /**
   * Updates the device's push token after the platform has rotated it, and synchronizes
   * the device's push registration with Ably. Call this from
   * `messaging().onTokenRefresh()` once activation has completed.
   *
   * @param token - The new push token issued by the platform.
   * @returns A promise which resolves once the registration has been synchronized with
   * Ably, and rejects if the update fails or the device is not activated.
   */
  updateToken(token: PushDeviceToken): Promise<void>;
}

/**
 * A device-side realtime client for React Native, extending the Pub/Sub `DeviceClient`
 * with a push interface whose token lifecycle is managed by the application.
 */
export interface ReactNativeClient extends DeviceClient {
  /**
   * A {@link Push} object, which enables devices to be activated for and deactivated
   * from receiving push notifications, and to keep their push token current.
   */
  push: Push;
}

/**
 * Constructs a React Native Pub/Sub client object using the given options.
 *
 * @param options - A {@link ReactNativeClientOptions} object to configure the client
 * connection to Ably, including the required `clientId` and, when push notifications are
 * used, the app-supplied {@link PushConfig}.
 * @returns A {@link ReactNativeClient} instance.
 */
export declare function createClient(options: ReactNativeClientOptions): ReactNativeClient;
