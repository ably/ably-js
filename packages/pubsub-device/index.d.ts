// Type definitions for @ably/pubsub-device: the Ably Pub/Sub SDK for end-user
// devices (browsers). Types-only spike for PDR-091.

// The same-name `export type X` + `export declare const X` pairs below are deliberate
// type+value declaration merges (the values cannot live in the never-published
// @ably/pubsub-common), which the lint rule cannot distinguish from accidental redeclaration.
/* eslint-disable @typescript-eslint/no-redeclare */

export * from '@ably/pubsub-common';

import type {
  Annotation as AnnotationType,
  AnnotationStatic,
  Auth,
  BatchPresenceFailureResult,
  BatchPresenceSuccessResult,
  BatchPublishFailureResult,
  BatchPublishSpec,
  BatchPublishSuccessResult,
  BatchResult,
  CommonClientOptions,
  Connection,
  Crypto as CryptoStatic,
  DeviceDetails,
  ErrorCallback,
  ErrorInfo as ErrorInfoType,
  ErrorInfoConstructor,
  HttpOptions,
  HttpPaginatedResponse,
  Message as MessageType,
  MessageStatic,
  PaginatedResult,
  PresenceMessage as PresenceMessageType,
  PresenceMessageStatic,
  PushChannelSubscription,
  RealtimeChannelBase,
  RealtimeChannels,
  RealtimeOptions,
} from '@ably/pubsub-common';

/**
 * A generic Ably error object that contains an Ably-specific status code, and a generic status code. Errors returned from the Ably server are compatible with the `ErrorInfo` structure and should result in errors that inherit from `ErrorInfo`.
 */
export type ErrorInfo = ErrorInfoType;

/**
 * The runtime `ErrorInfo` constructor, enabling `ErrorInfo` objects to be constructed and tested with `instanceof`.
 */
export declare const ErrorInfo: ErrorInfoConstructor;

/**
 * Contains the properties required to configure the encryption of {@link Message} payloads.
 */
export type Crypto = CryptoStatic;

/**
 * The cryptographic functions available in the library.
 */
export declare const Crypto: CryptoStatic;

/**
 * Contains an individual message that is sent to, or received from, Ably.
 */
export type Message = MessageType;

/**
 * Static utilities related to messages.
 */
export declare const Message: MessageStatic;

/**
 * Contains an individual presence update sent to, or received from, Ably.
 */
export type PresenceMessage = PresenceMessageType;

/**
 * Static utilities related to presence messages.
 */
export declare const PresenceMessage: PresenceMessageStatic;

/**
 * Contains an individual annotation to a message, sent to or received from Ably.
 */
export type Annotation = AnnotationType;

/**
 * Static utilities related to annotations.
 */
export declare const Annotation: AnnotationStatic;

/**
 * The callback used by {@link recoverConnectionCallback}.
 *
 * @param shouldRecover - Whether the connection should be recovered.
 */
export type recoverConnectionCompletionCallback = (shouldRecover: boolean) => void;

/**
 * Used in {@link DeviceClientOptions} to configure connection recovery behaviour.
 *
 * @param lastConnectionDetails - Details of the connection used by the connection recovery process.
 * @param callback - A callback which is called when a connection recovery attempt is complete.
 */
export type recoverConnectionCallback = (
  lastConnectionDetails: {
    /**
     * The recovery key can be used by another client to recover this connection’s state in the `recover` client options property. See [connection state recover options](https://ably.com/documentation/realtime/connection/#connection-state-recover-options) for more information.
     */
    recoveryKey: string;
    /**
     * The time at which the previous client was abruptly disconnected before the page was unloaded. This is represented as milliseconds since Unix epoch.
     */
    disconnectedAt: number;
    /**
     * A clone of the `location` object of the previous page’s document object before the page was unloaded. A common use case for this attribute is to ensure that the previous page URL is the same as the current URL before allowing the connection to be recovered. For example, you may want the connection to be recovered only for page reloads, but not when a user navigates to a different page.
     */
    location: string;
    /**
     * The `clientId` of the client’s `Auth` object before the page was unloaded. A common use case for this attribute is to ensure that the current logged in user’s `clientId` matches the previous connection’s `clientId` before allowing the connection to be recovered. Ably prohibits changing a `clientId` for an existing connection, so any mismatch in `clientId` during a recover will result in the connection moving to the failed state.
     */
    clientId: string | null;
  },
  callback: recoverConnectionCompletionCallback,
) => void;

/**
 * A standard callback format which is invoked upon completion of a task.
 *
 * @param err - An error object if the task failed.
 * @param result - The result of the task, if any.
 */
type StandardCallback<T> = (err: ErrorInfo | null, result?: T) => void;

/**
 * A function passed to {@link Push.activate} in order to override the default implementation to register a device for push activation.
 *
 * @param device - A DeviceDetails object representing the local device
 * @param callback - A callback to be invoked when the registration is complete
 */
export type RegisterCallback = (device: DeviceDetails, callback: StandardCallback<DeviceDetails>) => void;

/**
 * A function passed to {@link Push.activate} in order to override the default implementation to deregister a device for push activation.
 *
 * @param device - A DeviceDetails object representing the local device
 * @param callback - A callback to be invoked when the deregistration is complete
 */
export type DeregisterCallback = (device: DeviceDetails, callback: StandardCallback<string>) => void;

/**
 * Enables a device to be registered and deregistered from receiving push notifications.
 */
export interface Push {
  /**
   * Activates the device for push notifications. Subsequently registers the device with Ably and stores the deviceIdentityToken in local storage.
   *
   * @param registerCallback - A function passed to override the default implementation to register the local device for push activation.
   * @param updateFailedCallback - A callback to be invoked when the device registration failed to update.
   */
  activate(registerCallback?: RegisterCallback, updateFailedCallback?: ErrorCallback): Promise<void>;

  /**
   * Deactivates the device from receiving push notifications.
   *
   * @param deregisterCallback - A function passed to override the default implementation to deregister the local device for push activation.
   */
  deactivate(deregisterCallback?: DeregisterCallback): Promise<void>;
}

/**
 * Enables devices to subscribe to push notifications for a channel.
 */
export interface PushChannel {
  /**
   * Subscribes the device to push notifications for the channel.
   */
  subscribeDevice(): Promise<void>;

  /**
   * Unsubscribes the device from receiving push notifications for the channel.
   */
  unsubscribeDevice(): Promise<void>;

  /**
   * Subscribes all devices associated with the current device's `clientId` to push notifications for the channel.
   */
  subscribeClient(): Promise<void>;

  /**
   * Unsubscribes all devices associated with the current device's `clientId` from receiving push notifications for the channel.
   */
  unsubscribeClient(): Promise<void>;

  /**
   * Retrieves all push subscriptions for the channel. Subscriptions can be filtered using a params object.
   *
   * @param params - An object containing key-value pairs to filter subscriptions by. Can contain `clientId`, `deviceId` or a combination of both, and a `limit` on the number of subscriptions returned, up to 1,000.
   * @returns a {@link PaginatedResult} object containing an array of {@link PushChannelSubscription} objects.
   */
  listSubscriptions(params?: Record<string, string>): Promise<PaginatedResult<PushChannelSubscription>>;
}

/**
 * Contains the device identity token and secret of a device.
 */
export interface LocalDevice {
  /**
   * A unique ID generated by the device.
   */
  id: string;
  /**
   * A unique device secret generated by the Ably SDK.
   */
  deviceSecret: string;
  /**
   * A unique device identity token that the device uses to authenticate itself with Ably.
   */
  deviceIdentityToken?: string;

  /**
   * Retrieves push subscriptions active for the local device.
   *
   * @returns a {@link PaginatedResult} object containing an array of {@link PushChannelSubscription} objects for each push channel subscription active for the local device.
   */
  listSubscriptions(): Promise<PaginatedResult<PushChannelSubscription>>;
}

/**
 * The realtime channel object exposed by the device client. Extends the shared realtime channel surface with device push functionality.
 */
export interface RealtimeChannel extends RealtimeChannelBase {
  /**
   * A {@link PushChannel} object.
   */
  push: PushChannel;
}

/**
 * Passes additional client-specific properties to {@link createClient}.
 */
export interface DeviceClientOptions extends CommonClientOptions, RealtimeOptions, HttpOptions {
  /**
   * A client ID, used for identifying this client when publishing messages or for presence purposes. The `clientId` can be any non-empty string, except it cannot contain a `*`. This option is primarily intended to be used in situations where the library is instantiated with a key. A `clientId` may also be implicit in a token used to instantiate the library; an error will be raised if a `clientId` specified here conflicts with the `clientId` implicit in the token. Unlike the optional `clientId` accepted by the shared authentication options, the device client requires a `clientId`, since every end-user device connection must be identifiable for monthly-active-user accounting.
   */
  clientId: string;

  /**
   * Enables a connection to inherit the state of a previous connection that may have existed under a different instance of the Realtime library. This might typically be used by clients of the browser library to ensure connection state can be preserved when the user refreshes the page. A recovery key string can be explicitly provided, or alternatively if a callback function is provided, the client library will automatically persist the recovery key between page reloads and call the callback when the connection is recoverable. The callback is then responsible for confirming whether the connection should be recovered or not. See [connection state recovery](https://ably.com/docs/realtime/connection/#connection-state-recovery) for further information.
   */
  recover?: string | recoverConnectionCallback;

  /**
   * If specified, the SDK's internal persistence mechanism for storing the recovery key
   * over page loads (see the `recover` client option) will store the recovery key under
   * this identifier (in sessionstorage), so only another library instance which specifies
   * the same recoveryKeyStorageName will attempt to recover from it. This is useful if you have
   * multiple ably-js instances sharing a given origin (the origin being the scope of
   * sessionstorage), as otherwise the multiple instances will overwrite each other's
   * recovery keys, and after a reload they will all try and recover the same connection,
   * which is not permitted and will cause broken behaviour.
   */
  recoveryKeyStorageName?: string;

  /**
   * When `true`, the client library will automatically send a close request to Ably whenever the `window` [`beforeunload` event](https://developer.mozilla.org/en-US/docs/Web/API/BeforeUnloadEvent) fires. By enabling this option, the close request sent to Ably ensures the connection state will not be retained and all channels associated with the channel will be detached. This is commonly used by developers who want presence leave events to fire immediately (that is, if a user navigates to another page or closes their browser, then enabling this option will result in the presence member leaving immediately). Without this option or an explicit call to the `close` method of the `Connection` object, Ably expects that the abruptly disconnected connection could later be recovered and therefore does not immediately remove the user from presence. Instead, to avoid “twitchy” presence behaviour an abruptly disconnected client is removed from channels in which they are present after 15 seconds, and the connection state is retained for two minutes. Defaults to `true`.
   */
  closeOnUnload?: boolean;

  /**
   * A URL pointing to a service worker script which is used as the target for web push notifications.
   */
  pushServiceWorkerUrl?: string;
}

/**
 * A realtime client for end-user devices, providing a realtime connection to Ably, channels, presence and device push registration.
 */
export interface DeviceClient {
  /**
   * A client ID, used for identifying this client when publishing messages or for presence purposes. The `clientId` can be any non-empty string, except it cannot contain a `*`. This option is primarily intended to be used in situations where the library is instantiated with a key. A `clientId` may also be implicit in a token used to instantiate the library; an error will be raised if a `clientId` specified here conflicts with the `clientId` implicit in the token.
   */
  clientId: string;
  /**
   * An {@link Auth} object.
   */
  auth: Auth;
  /**
   * A {@link RealtimeChannels} object.
   */
  channels: RealtimeChannels<RealtimeChannel>;
  /**
   * A {@link Connection} object.
   */
  connection: Connection;
  /**
   * Calls {@link Connection.connect | `connection.connect()`} and causes the connection to open, entering the connecting state. Explicitly calling `connect()` is unnecessary unless the {@link CommonClientOptions.autoConnect} property is disabled.
   */
  connect(): void;
  /**
   * Calls {@link Connection.close | `connection.close()`} and causes the connection to close, entering the closing state. Once closed, the library will not attempt to re-establish the connection without an explicit call to {@link Connection.connect | `connect()`}.
   */
  close(): void;
  /**
   * Makes a REST request to a provided path. This is provided as a convenience for developers who wish to use REST API functionality that is either not documented or is not yet included in the public API, without having to directly handle features such as authentication, paging, fallback hosts, MsgPack and JSON support.
   *
   * @param method - The request method to use, such as `GET`, `POST`.
   * @param path - The request path.
   * @param version - The version of the Ably REST API to use. See the [REST API reference](https://ably.com/docs/api/rest-api#versioning) for information on versioning.
   * @param params - The parameters to include in the URL query of the request. The parameters depend on the endpoint being queried. See the [REST API reference](https://ably.com/docs/api/rest-api) for the available parameters of each endpoint.
   * @param body - The JSON body of the request.
   * @param headers - Additional HTTP headers to include in the request.
   * @returns A promise which, upon success, will be fulfilled with the {@link HttpPaginatedResponse} response object returned by the HTTP request. This response object will contain an empty or JSON-encodable object. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  request<T = any>(
    method: string,
    path: string,
    version: number,
    params?: any,
    body?: any[] | any,
    headers?: any,
  ): Promise<HttpPaginatedResponse<T>>;
  /**
   * Retrieves the time from the Ably service as milliseconds since the Unix epoch. Clients that do not have access to a sufficiently well maintained time source and wish to issue Ably {@link TokenRequest | `TokenRequest`s} with a more accurate timestamp should use the {@link AuthOptions.queryTime} property instead of this method.
   *
   * @returns A promise which, upon success, will be fulfilled with the time as milliseconds since the Unix epoch. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  time(): Promise<number>;
  /**
   * Publishes a {@link BatchPublishSpec} object to one or more channels, up to a maximum of 100 channels.
   *
   * @param spec - A {@link BatchPublishSpec} object.
   * @returns A promise which, upon success, will be fulfilled with a {@link BatchResult} object containing information about the result of the batch publish for each requested channel. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  batchPublish(spec: BatchPublishSpec): Promise<BatchResult<BatchPublishSuccessResult | BatchPublishFailureResult>>;
  /**
   * Publishes one or more {@link BatchPublishSpec} objects to one or more channels, up to a maximum of 100 channels.
   *
   * @param specs - An array of {@link BatchPublishSpec} objects.
   * @returns A promise which, upon success, will be fulfilled with an array of {@link BatchResult} objects containing information about the result of the batch publish for each requested channel for each provided {@link BatchPublishSpec}. This array is in the same order as the provided {@link BatchPublishSpec} array. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  batchPublish(
    specs: BatchPublishSpec[],
  ): Promise<BatchResult<BatchPublishSuccessResult | BatchPublishFailureResult>[]>;
  /**
   * Retrieves the presence state for one or more channels, up to a maximum of 100 channels. Presence state includes the `clientId` of members and their current {@link PresenceAction}.
   *
   * @param channels - An array of one or more channel names, up to a maximum of 100 channels.
   * @returns A promise which, upon success, will be fulfilled with a {@link BatchResult} object containing information about the result of the batch presence request for each requested channel. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  batchPresence(channels: string[]): Promise<BatchResult<BatchPresenceSuccessResult | BatchPresenceFailureResult>[]>;
  /**
   * A {@link Push} object.
   */
  push: Push;
  /**
   * Retrieves a {@link LocalDevice} object that represents the current state of the device as a target for push notifications, loading it from persistent storage if necessary.
   *
   * @returns A promise which resolves to a {@link LocalDevice} object.
   */
  getDevice(): Promise<LocalDevice>;
}

/**
 * Constructs a device Pub/Sub client, which establishes a realtime connection to Ably.
 *
 * @param options - A {@link DeviceClientOptions} object to configure the client.
 * @returns A {@link DeviceClient} object.
 */
export declare function createClient(options: DeviceClientOptions): DeviceClient;
