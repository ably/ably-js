// Channel and connection type declarations for the Ably Pub/Sub SDK packages: states, options, channel collections, presence, annotations and connection.
import type {
  CipherParamOptions,
  CipherParams,
  ErrorInfo,
  EventEmitter,
  PaginatedResult,
  channelEventCallback,
  connectionEventCallback,
  messageCallback,
} from './core';
import type {
  Annotation,
  InboundMessage,
  Message,
  MessageOperation,
  OutboundAnnotation,
  PresenceAction,
  PresenceMessage,
  PublishResult,
  UpdateDeleteResult,
} from './messages';

/**
 * The `ChannelStates` namespace describes the possible values of the {@link ChannelState} type.
 */
declare namespace ChannelStates {
  /**
   * The channel has been initialized but no attach has yet been attempted.
   */
  type INITIALIZED = 'initialized';
  /**
   * An attach has been initiated by sending a request to Ably. This is a transient state, followed either by a transition to `ATTACHED`, `SUSPENDED`, or `FAILED`.
   */
  type ATTACHING = 'attaching';
  /**
   * The attach has succeeded. In the `ATTACHED` state a client may publish and subscribe to messages, or be present on the channel.
   */
  type ATTACHED = 'attached';
  /**
   * A detach has been initiated on an `ATTACHED` channel by sending a request to Ably. This is a transient state, followed either by a transition to `DETACHED` or `FAILED`.
   */
  type DETACHING = 'detaching';
  /**
   * The channel, having previously been `ATTACHED`, has been detached by the user.
   */
  type DETACHED = 'detached';
  /**
   * The channel, having previously been `ATTACHED`, has lost continuity, usually due to the client being disconnected from Ably for longer than two minutes. It will automatically attempt to reattach as soon as connectivity is restored.
   */
  type SUSPENDED = 'suspended';
  /**
   * An indefinite failure condition. This state is entered if a channel error has been received from the Ably service, such as an attempt to attach without the necessary access rights.
   */
  type FAILED = 'failed';
}
/**
 * Describes the possible states of a {@link Channel} or {@link RealtimeChannel} object.
 */
export type ChannelState =
  | ChannelStates.FAILED
  | ChannelStates.INITIALIZED
  | ChannelStates.SUSPENDED
  | ChannelStates.ATTACHED
  | ChannelStates.ATTACHING
  | ChannelStates.DETACHED
  | ChannelStates.DETACHING;

/**
 * The `ChannelEvents` namespace describes the possible values of the {@link ChannelEvent} type.
 */
declare namespace ChannelEvents {
  /**
   * The channel has been initialized but no attach has yet been attempted.
   */
  type INITIALIZED = 'initialized';
  /**
   * An attach has been initiated by sending a request to Ably. This is a transient state, followed either by a transition to `ATTACHED`, `SUSPENDED`, or `FAILED`.
   */
  type ATTACHING = 'attaching';
  /**
   * The attach has succeeded. In the `ATTACHED` state a client may publish and subscribe to messages, or be present on the channel.
   */
  type ATTACHED = 'attached';
  /**
   * A detach has been initiated on an `ATTACHED` channel by sending a request to Ably. This is a transient state, followed either by a transition to `DETACHED` or `FAILED`.
   */
  type DETACHING = 'detaching';
  /**
   * The channel, having previously been `ATTACHED`, has been detached by the user.
   */
  type DETACHED = 'detached';
  /**
   * The channel, having previously been `ATTACHED`, has lost continuity, usually due to the client being disconnected from Ably for longer than two minutes. It will automatically attempt to reattach as soon as connectivity is restored.
   */
  type SUSPENDED = 'suspended';
  /**
   * An indefinite failure condition. This state is entered if a channel error has been received from the Ably service, such as an attempt to attach without the necessary access rights.
   */
  type FAILED = 'failed';
  /**
   * An event for changes to channel conditions that do not result in a change in {@link ChannelState}.
   */
  type UPDATE = 'update';
}
/**
 * Describes the events emitted by a {@link Channel} or {@link RealtimeChannel} object. An event is either an `UPDATE` or a {@link ChannelState}.
 */
export type ChannelEvent =
  | ChannelEvents.FAILED
  | ChannelEvents.INITIALIZED
  | ChannelEvents.SUSPENDED
  | ChannelEvents.ATTACHED
  | ChannelEvents.ATTACHING
  | ChannelEvents.DETACHED
  | ChannelEvents.DETACHING
  | ChannelEvents.UPDATE;

/**
 * The `ConnectionStates` namespace describes the possible values of the {@link ConnectionState} type.
 */
declare namespace ConnectionStates {
  /**
   * A connection with this state has been initialized but no connection has yet been attempted.
   */
  type INITIALIZED = 'initialized';
  /**
   * A connection attempt has been initiated. The connecting state is entered as soon as the library has completed initialization, and is reentered each time connection is re-attempted following disconnection.
   */
  type CONNECTING = 'connecting';
  /**
   * A connection exists and is active.
   */
  type CONNECTED = 'connected';
  /**
   * A temporary failure condition. No current connection exists because there is no network connectivity or no host is available. The disconnected state is entered if an established connection is dropped, or if a connection attempt was unsuccessful. In the disconnected state the library will periodically attempt to open a new connection (approximately every 15 seconds), anticipating that the connection will be re-established soon and thus connection and channel continuity will be possible. In this state, developers can continue to publish messages as they are automatically placed in a local queue, to be sent as soon as a connection is reestablished. Messages published by other clients while this client is disconnected will be delivered to it upon reconnection, so long as the connection was resumed within 2 minutes. After 2 minutes have elapsed, recovery is no longer possible and the connection will move to the `SUSPENDED` state.
   */
  type DISCONNECTED = 'disconnected';
  /**
   * A long term failure condition. No current connection exists because there is no network connectivity or no host is available. The suspended state is entered after a failed connection attempt if there has then been no connection for a period of two minutes. In the suspended state, the library will periodically attempt to open a new connection every 30 seconds. Developers are unable to publish messages in this state. A new connection attempt can also be triggered by an explicit call to {@link Connection.connect | `connect()`}. Once the connection has been re-established, channels will be automatically re-attached. The client has been disconnected for too long for them to resume from where they left off, so if it wants to catch up on messages published by other clients while it was disconnected, it needs to use the [History API](https://ably.com/docs/realtime/history).
   */
  type SUSPENDED = 'suspended';
  /**
   * An explicit request by the developer to close the connection has been sent to the Ably service. If a reply is not received from Ably within a short period of time, the connection is forcibly terminated and the connection state becomes `CLOSED`.
   */
  type CLOSING = 'closing';
  /**
   * The connection has been explicitly closed by the client. In the closed state, no reconnection attempts are made automatically by the library, and clients may not publish messages. No connection state is preserved by the service or by the library. A new connection attempt can be triggered by an explicit call to {@link Connection.connect | `connect()`}, which results in a new connection.
   */
  type CLOSED = 'closed';
  /**
   * This state is entered if the client library encounters a failure condition that it cannot recover from. This may be a fatal connection error received from the Ably service, for example an attempt to connect with an incorrect API key, or a local terminal error, for example the token in use has expired and the library does not have any way to renew it. In the failed state, no reconnection attempts are made automatically by the library, and clients may not publish messages. A new connection attempt can be triggered by an explicit call to {@link Connection.connect | `connect()`}.
   */
  type FAILED = 'failed';
}
/**
 * Describes the realtime {@link Connection} object states.
 */
export type ConnectionState =
  | ConnectionStates.INITIALIZED
  | ConnectionStates.CONNECTED
  | ConnectionStates.CONNECTING
  | ConnectionStates.DISCONNECTED
  | ConnectionStates.SUSPENDED
  | ConnectionStates.CLOSED
  | ConnectionStates.CLOSING
  | ConnectionStates.FAILED;

/**
 * The `ConnectionEvents` namespace describes the possible values of the {@link ConnectionEvent} type.
 */
declare namespace ConnectionEvents {
  /**
   * A connection with this state has been initialized but no connection has yet been attempted.
   */
  type INITIALIZED = 'initialized';
  /**
   * A connection attempt has been initiated. The connecting state is entered as soon as the library has completed initialization, and is reentered each time connection is re-attempted following disconnection.
   */
  type CONNECTING = 'connecting';
  /**
   * A connection exists and is active.
   */
  type CONNECTED = 'connected';
  /**
   * A temporary failure condition. No current connection exists because there is no network connectivity or no host is available. The disconnected state is entered if an established connection is dropped, or if a connection attempt was unsuccessful. In the disconnected state the library will periodically attempt to open a new connection (approximately every 15 seconds), anticipating that the connection will be re-established soon and thus connection and channel continuity will be possible. In this state, developers can continue to publish messages as they are automatically placed in a local queue, to be sent as soon as a connection is reestablished. Messages published by other clients while this client is disconnected will be delivered to it upon reconnection, so long as the connection was resumed within 2 minutes. After 2 minutes have elapsed, recovery is no longer possible and the connection will move to the `SUSPENDED` state.
   */
  type DISCONNECTED = 'disconnected';
  /**
   * A long term failure condition. No current connection exists because there is no network connectivity or no host is available. The suspended state is entered after a failed connection attempt if there has then been no connection for a period of two minutes. In the suspended state, the library will periodically attempt to open a new connection every 30 seconds. Developers are unable to publish messages in this state. A new connection attempt can also be triggered by an explicit call to {@link Connection.connect | `connect()`}. Once the connection has been re-established, channels will be automatically re-attached. The client has been disconnected for too long for them to resume from where they left off, so if it wants to catch up on messages published by other clients while it was disconnected, it needs to use the [History API](https://ably.com/docs/realtime/history).
   */
  type SUSPENDED = 'suspended';
  /**
   * An explicit request by the developer to close the connection has been sent to the Ably service. If a reply is not received from Ably within a short period of time, the connection is forcibly terminated and the connection state becomes `CLOSED`.
   */
  type CLOSING = 'closing';
  /**
   * The connection has been explicitly closed by the client. In the closed state, no reconnection attempts are made automatically by the library, and clients may not publish messages. No connection state is preserved by the service or by the library. A new connection attempt can be triggered by an explicit call to {@link Connection.connect | `connect()`}, which results in a new connection.
   */
  type CLOSED = 'closed';
  /**
   * This state is entered if the client library encounters a failure condition that it cannot recover from. This may be a fatal connection error received from the Ably service, for example an attempt to connect with an incorrect API key, or a local terminal error, for example the token in use has expired and the library does not have any way to renew it. In the failed state, no reconnection attempts are made automatically by the library, and clients may not publish messages. A new connection attempt can be triggered by an explicit call to {@link Connection.connect | `connect()`}.
   */
  type FAILED = 'failed';
  /**
   * An event for changes to connection conditions for which the {@link ConnectionState} does not change.
   */
  type UPDATE = 'update';
}
/**
 * Describes the events emitted by a {@link Connection} object. An event is either an `UPDATE` or a {@link ConnectionState}.
 */
export type ConnectionEvent =
  | ConnectionEvents.INITIALIZED
  | ConnectionEvents.CONNECTED
  | ConnectionEvents.CONNECTING
  | ConnectionEvents.DISCONNECTED
  | ConnectionEvents.SUSPENDED
  | ConnectionEvents.CLOSED
  | ConnectionEvents.CLOSING
  | ConnectionEvents.FAILED
  | ConnectionEvents.UPDATE;

/**
 * Contains state change information emitted by {@link Channel} and {@link RealtimeChannel} objects.
 */
export interface ChannelStateChange {
  /**
   * The new current {@link ChannelState}.
   */
  current: ChannelState;
  /**
   * The previous state. For the {@link ChannelEvents.UPDATE} event, this is equal to the `current` {@link ChannelState}.
   */
  previous: ChannelState;
  /**
   * An {@link ErrorInfo} object containing any information relating to the transition.
   */
  reason?: ErrorInfo;
  /**
   * Indicates whether message continuity on this channel is preserved, see [Nonfatal channel errors](https://ably.com/docs/realtime/channels#nonfatal-errors) for more info.
   */
  resumed: boolean;
  /**
   * Indicates whether the client can expect a backlog of messages from a rewind or resume.
   */
  hasBacklog?: boolean;
}

/**
 * Contains {@link ConnectionState} change information emitted by the {@link Connection} object.
 */
export interface ConnectionStateChange {
  /**
   * The new {@link ConnectionState}.
   */
  current: ConnectionState;
  /**
   * The previous {@link ConnectionState}. For the {@link ConnectionEvents.UPDATE} event, this is equal to the current {@link ConnectionState}.
   */
  previous: ConnectionState;
  /**
   * An {@link ErrorInfo} object containing any information relating to the transition.
   */
  reason?: ErrorInfo;
  /**
   * Duration in milliseconds, after which the client retries a connection where applicable.
   */
  retryIn?: number;
}

/**
 * [Channel Parameters](https://ably.com/docs/realtime/channels/channel-parameters/overview) used within {@link ChannelOptions}.
 */
export type ChannelParams = { [key: string]: string };

/**
 * The `ChannelModes` namespace describes the possible values of the {@link ChannelMode} type.
 */
declare namespace ChannelModes {
  /**
   * The client can publish messages.
   */
  type PUBLISH = 'PUBLISH' | 'publish';
  /**
   * The client will receive messages.
   */
  type SUBSCRIBE = 'SUBSCRIBE' | 'subscribe';
  /**
   * The client can enter the presence set.
   */
  type PRESENCE = 'PRESENCE' | 'presence';
  /**
   * The client will receive presence messages.
   */
  type PRESENCE_SUBSCRIBE = 'PRESENCE_SUBSCRIBE' | 'presence_subscribe';
  /**
   * The client can publish object messages.
   */
  type OBJECT_PUBLISH = 'OBJECT_PUBLISH' | 'object_publish';
  /**
   * The client will receive object messages.
   */
  type OBJECT_SUBSCRIBE = 'OBJECT_SUBSCRIBE' | 'object_subscribe';
  /**
   * The client can publish annotations.
   */
  type ANNOTATION_PUBLISH = 'ANNOTATION_PUBLISH' | 'annotation_publish';
  /**
   * The client will receive annotations.
   */
  type ANNOTATION_SUBSCRIBE = 'ANNOTATION_SUBSCRIBE' | 'annotation_subscribe';
}

/**
 * Describes the possible flags used to configure client capabilities, using {@link ChannelOptions}.
 *
 * **Note:** This type admits uppercase or lowercase values for reasons of backwards compatibility. In the next major release of this SDK, it will be merged with {@link ResolvedChannelMode} and only admit lowercase values; see [this GitHub issue](https://github.com/ably/ably-js/issues/1954).
 */
export type ChannelMode =
  | ChannelModes.PUBLISH
  | ChannelModes.SUBSCRIBE
  | ChannelModes.PRESENCE
  | ChannelModes.PRESENCE_SUBSCRIBE
  | ChannelModes.OBJECT_PUBLISH
  | ChannelModes.OBJECT_SUBSCRIBE
  | ChannelModes.ANNOTATION_PUBLISH
  | ChannelModes.ANNOTATION_SUBSCRIBE;

/**
 * The `ResolvedChannelModes` namespace describes the possible values of the {@link ResolvedChannelMode} type.
 */
declare namespace ResolvedChannelModes {
  /**
   * The client can publish messages.
   */
  type PUBLISH = 'publish';
  /**
   * The client will receive messages.
   */
  type SUBSCRIBE = 'subscribe';
  /**
   * The client can enter the presence set.
   */
  type PRESENCE = 'presence';
  /**
   * The client will receive presence messages.
   */
  type PRESENCE_SUBSCRIBE = 'presence_subscribe';
  /**
   * The client can publish object messages.
   */
  type OBJECT_PUBLISH = 'object_publish';
  /**
   * The client will receive object messages.
   */
  type OBJECT_SUBSCRIBE = 'object_subscribe';
  /**
   * The client can publish annotations.
   */
  type ANNOTATION_PUBLISH = 'annotation_publish';
  /**
   * The client will receive annotations.
   */
  type ANNOTATION_SUBSCRIBE = 'annotation_subscribe';
}

/**
 * Describes the configuration that a {@link RealtimeChannel} is using, as returned by {@link RealtimeChannel.modes}.
 *
 * This type is the same as the {@link ChannelMode} type but with all of the values lowercased.
 *
 * **Note:** This type exists for reasons of backwards compatibility. In the next major release of this SDK, it will be merged with {@link ChannelMode}; see [this GitHub issue](https://github.com/ably/ably-js/issues/1954).
 */
export type ResolvedChannelMode =
  | ResolvedChannelModes.PUBLISH
  | ResolvedChannelModes.SUBSCRIBE
  | ResolvedChannelModes.PRESENCE
  | ResolvedChannelModes.PRESENCE_SUBSCRIBE
  | ResolvedChannelModes.OBJECT_PUBLISH
  | ResolvedChannelModes.OBJECT_SUBSCRIBE
  | ResolvedChannelModes.ANNOTATION_PUBLISH
  | ResolvedChannelModes.ANNOTATION_SUBSCRIBE;

/**
 * Passes additional properties to a {@link Channel} or {@link RealtimeChannel} object, such as encryption, {@link ChannelMode} and channel parameters.
 */
export interface ChannelOptions {
  /**
   * Requests encryption for this channel when not null, and specifies encryption-related parameters (such as algorithm, chaining mode, key length and key). See [an example](https://ably.com/docs/realtime/encryption#getting-started). When running in a browser, encryption is only available when the current environment is a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts).
   */
  cipher?: CipherParamOptions | CipherParams;
  /**
   * [Channel Parameters](https://ably.com/docs/realtime/channels/channel-parameters/overview) that configure the behavior of the channel.
   */
  params?: ChannelParams;
  /**
   * An array of {@link ChannelMode} objects.
   */
  modes?: ChannelMode[];
  /**
   *  A boolean which determines whether calling subscribe
   *  on a channel or presence object should trigger an implicit attach. Defaults to `true`
   *
   *  Note: this option is for realtime client libraries only
   */
  attachOnSubscribe?: boolean;
}

/**
 * Passes additional properties to a {@link RealtimeChannel} name to produce a new derived channel
 */
export interface DeriveOptions {
  /**
   * The JMESPath Query filter string to be used to derive new channel.
   */
  filter?: string;
}

/**
 * Describes the parameters accepted by {@link HttpAnnotations.get}.
 */
export interface GetAnnotationsParams {
  /**
   * An upper limit on the number of annotations returned. The default is 100, and the maximum is 1000.
   *
   * @defaultValue 100
   */
  limit?: number;
}

/**
 * The `RealtimePresenceParams` interface describes the parameters accepted by {@link RealtimePresence.get}.
 */
export interface RealtimePresenceParams {
  /**
   * Sets whether to wait for a full presence set synchronization between Ably and the clients on the channel to complete before returning the results. Synchronization begins as soon as the channel is {@link ChannelStates.ATTACHED}. When set to `true` the results will be returned as soon as the sync is complete. When set to `false` the current list of members will be returned without the sync completing. The default is `true`.
   *
   * @defaultValue `true`
   */
  waitForSync?: boolean;
  /**
   * Filters the array of returned presence members by a specific client using its ID.
   */
  clientId?: string;
  /**
   * Filters the array of returned presence members by a specific connection using its ID.
   */
  connectionId?: string;
}

/**
 * The `RealtimeHistoryParams` interface describes the parameters accepted by the following methods:
 *
 * - {@link RealtimePresence.history}
 * - {@link RealtimeChannel.history}
 */
export interface RealtimeHistoryParams {
  /**
   * The time from which messages are retrieved, specified as milliseconds since the Unix epoch.
   */
  start?: number;
  /**
   * The time until messages are retrieved, specified as milliseconds since the Unix epoch.
   *
   * @defaultValue The current time.
   */
  end?: number;
  /**
   * The order for which messages are returned in. Valid values are `'backwards'` which orders messages from most recent to oldest, or `'forwards'` which orders messages from oldest to most recent. The default is `'backwards'`.
   *
   * @defaultValue `'backwards'`
   */
  direction?: 'forwards' | 'backwards';
  /**
   * An upper limit on the number of messages returned. The default is 100, and the maximum is 1000.
   *
   * @defaultValue 100
   */
  limit?: number;
  /**
   * When `true`, ensures message history is up until the point of the channel being attached. See [continuous history](https://ably.com/docs/realtime/history#continuous-history) for more info. Requires the `direction` to be `backwards`. If the channel is not attached, or if `direction` is set to `forwards`, this option results in an error.
   */
  untilAttach?: boolean;
}

/**
 * Optional parameters for message publishing.
 */
export type PublishOptions = {
  /**
   * Publish options are server-defined
   */
  [k: string]: string | number | boolean | undefined;
};

/**
 * Contains properties to filter messages with when calling {@link RealtimeChannel.subscribe | `RealtimeChannel.subscribe()`}.
 */
export type MessageFilter = {
  /**
   * Filters messages by a specific message `name`.
   */
  name?: string;
  /**
   * Filters messages by a specific `extras.ref.timeserial` value.
   */
  refTimeserial?: string;
  /**
   * Filters messages by a specific `extras.ref.type` value.
   */
  refType?: string;
  /**
   * Filters messages based on whether they contain an `extras.ref`.
   */
  isRef?: boolean;
  /**
   * Filters messages by a specific message `clientId`.
   */
  clientId: string;
};

/**
 * Creates and destroys {@link Channel} and {@link RealtimeChannel} objects.
 */
export declare interface Channels<T> {
  /**
   * Creates a new {@link Channel} or {@link RealtimeChannel} object, with the specified {@link ChannelOptions}, or returns the existing channel object.
   *
   * @param name - The channel name.
   * @param channelOptions - A {@link ChannelOptions} object.
   * @returns A {@link Channel} or {@link RealtimeChannel} object.
   */
  get(name: string, channelOptions?: ChannelOptions): T;
  /**
   * Releases all SDK-held references to a {@link Channel} or {@link RealtimeChannel} object, enabling it to be garbage collected. Warning: this method has no guardrails; using a channel reference after it has been released is undefined behaviour. It can be useful for applications that work with a continually changing set of channels on a single client and need to avoid unbounded memory growth; if this does not describe you, don't call it. Realtime channels not already in the `INITIALIZED`, `DETACHED`, or `FAILED` state are detached before release.
   *
   * @param name - The channel name.
   */
  release(name: string): void;
  /**
   * All of the channels that exist in this `Channels` object.
   *
   * Channels are added here when created using {@link get}, and removed when released using {@link release}.
   */
  all: Record<string, T>;
}

/**
 * A {@link Channels} collection which additionally supports creating derived channels, available on realtime clients only.
 */
export interface RealtimeChannels<T> extends Channels<T> {
  /**
   * Creates a new {@link Channel} or {@link RealtimeChannel} object, with the specified channel {@link DeriveOptions}
   * and {@link ChannelOptions}, or returns the existing channel object.
   *
   * @experimental This is a preview feature and may change in a future non-major release.
   * This experimental method allows you to create custom realtime data feeds by selectively subscribing
   * to receive only part of the data from the channel.
   * See the [announcement post](https://pages.ably.com/subscription-filters-preview) for more information.
   * @param name - The channel name.
   * @param deriveOptions - A {@link DeriveOptions} object.
   * @param channelOptions - A {@link ChannelOptions} object.
   * @returns A {@link RealtimeChannel} object.
   */
  getDerived(name: string, deriveOptions: DeriveOptions, channelOptions?: ChannelOptions): T;
}

/**
 * Enables messages to be published and subscribed to. Also enables historic messages to be retrieved and provides access to the {@link RealtimePresence} object of a channel. This is the push-free base channel interface shared by the device and server realtime channels, which extend it with their platform-specific push members.
 */
export declare interface RealtimeChannelBase
  extends EventEmitter<channelEventCallback, ChannelStateChange, ChannelEvent> {
  /**
   * The channel name.
   */
  readonly name: string;
  /**
   * An {@link ErrorInfo} object describing the last error which occurred on the channel, if any.
   */
  errorReason: ErrorInfo;
  /**
   * The current {@link ChannelState} of the channel.
   */
  readonly state: ChannelState;
  /**
   * Optional [channel parameters](https://ably.com/docs/realtime/channels/channel-parameters/overview) that configure the behavior of the channel.
   */
  params: ChannelParams;
  /**
   * An array of {@link ResolvedChannelMode} objects.
   */
  modes: ResolvedChannelMode[];
  /**
   * Deregisters the given listener for the specified event name. This removes an earlier event-specific subscription.
   *
   * @param event - The event name.
   * @param listener - An event listener function.
   */
  unsubscribe(event: string, listener: messageCallback<InboundMessage>): void;
  /**
   * Deregisters the given listener from all event names in the array.
   *
   * @param events - An array of event names.
   * @param listener - An event listener function.
   */
  unsubscribe(events: Array<string>, listener: messageCallback<InboundMessage>): void;
  /**
   * Deregisters all listeners for the given event name.
   *
   * @param event - The event name.
   */
  unsubscribe(event: string): void;
  /**
   * Deregisters all listeners for all event names in the array.
   *
   * @param events - An array of event names.
   */
  unsubscribe(events: Array<string>): void;
  /**
   * Deregisters all listeners to messages on this channel that match the supplied filter.
   *
   * @param filter - A {@link MessageFilter}.
   * @param listener - An event listener function.
   */
  unsubscribe(filter: MessageFilter, listener?: messageCallback<InboundMessage>): void;
  /**
   * Deregisters the given listener (for any/all event names). This removes an earlier subscription.
   *
   * @param listener - An event listener function.
   */
  unsubscribe(listener: messageCallback<InboundMessage>): void;
  /**
   * Deregisters all listeners to messages on this channel. This removes all earlier subscriptions.
   */
  unsubscribe(): void;

  /**
   * A {@link RealtimePresence} object.
   */
  presence: RealtimePresence;
  /**
   * A {@link RealtimeAnnotations} object.
   */
  annotations: RealtimeAnnotations;
  /**
   * Attach to this channel ensuring the channel is created in the Ably system and all messages published on the channel are received by any channel listeners registered using {@link RealtimeChannel.subscribe | `subscribe()`}. Any resulting channel state change will be emitted to any listeners registered using the {@link EventEmitter.on | `on()`} or {@link EventEmitter.once | `once()`} methods. As a convenience, `attach()` is called implicitly if {@link RealtimeChannel.subscribe | `subscribe()`} for the channel is called, or {@link RealtimePresence.enter | `enter()`} or {@link RealtimePresence.subscribe | `subscribe()`} are called on the {@link RealtimePresence} object for this channel, or `get()` is called on the `RealtimeObject` object for this channel.
   *
   * @returns A promise which, upon success, if the channel became attached will be fulfilled with a {@link ChannelStateChange} object. If the channel was already attached the promise will be fulfilled with `null`. Upon failure, the promise will be rejected with an {@link ErrorInfo} object.
   */
  attach(): Promise<ChannelStateChange | null>;
  /**
   * Detach from this channel. Any resulting channel state change is emitted to any listeners registered using the {@link EventEmitter.on | `on()`} or {@link EventEmitter.once | `once()`} methods. Once all clients globally have detached from the channel, the channel will be released in the Ably service within two minutes.
   *
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  detach(): Promise<void>;
  /**
   * Retrieves a {@link PaginatedResult} object, containing an array of historical {@link InboundMessage} objects for the channel. If the channel is configured to persist messages, then messages can be retrieved from history for up to 72 hours in the past. If not, messages can only be retrieved from history for up to two minutes in the past.
   *
   * @param params - A set of parameters which are used to specify which presence members should be retrieved.
   * @returns A promise which, upon success, will be fulfilled with a {@link PaginatedResult} object containing an array of {@link InboundMessage} objects. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  history(params?: RealtimeHistoryParams): Promise<PaginatedResult<InboundMessage>>;
  /**
   * Sets the {@link ChannelOptions} for the channel.
   *
   * @param options - A {@link ChannelOptions} object.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  setOptions(options: ChannelOptions): Promise<void>;
  /**
   * Registers a listener for messages with a given event name on this channel. The caller supplies a listener function, which is called each time one or more matching messages arrives on the channel.
   *
   * @param event - The event name.
   * @param listener - An event listener function.
   * @returns A promise which, upon successful attachment to the channel, will be fulfilled with a {@link ChannelStateChange} object. If the channel was already attached the promise will be resolved with `null`. Upon failure, the promise will be rejected with an {@link ErrorInfo} object.
   */
  subscribe(event: string, listener?: messageCallback<InboundMessage>): Promise<ChannelStateChange | null>;
  /**
   * Registers a listener for messages on this channel for multiple event name values.
   *
   * @param events - An array of event names.
   * @param listener - An event listener function.
   * @returns A promise which, upon successful attachment to the channel, will be fulfilled with a {@link ChannelStateChange} object. If the channel was already attached the promise will be resolved with `null`. Upon failure, the promise will be rejected with an {@link ErrorInfo} object.
   */
  subscribe(events: Array<string>, listener?: messageCallback<InboundMessage>): Promise<ChannelStateChange | null>;
  /**
   * {@label WITH_MESSAGE_FILTER}
   *
   * Registers a listener for messages on this channel that match the supplied filter.
   *
   * @param filter - A {@link MessageFilter}.
   * @param listener - An event listener function.
   * @returns A promise which, upon successful attachment to the channel, will be fulfilled with a {@link ChannelStateChange} object. If the channel was already attached the promise will be resolved with `null`. Upon failure, the promise will be rejected with an {@link ErrorInfo} object.
   */
  subscribe(filter: MessageFilter, listener?: messageCallback<InboundMessage>): Promise<ChannelStateChange | null>;
  /**
   * Registers a listener for messages on this channel. The caller supplies a listener function, which is called each time one or more messages arrives on the channel.
   *
   * @param callback - An event listener function.
   * @returns A promise which, upon successful attachment to the channel, will be fulfilled with a {@link ChannelStateChange} object. If the channel was already attached the promise will be resolved with `null`. Upon failure, the promise will be rejected with an {@link ErrorInfo} object.
   */
  subscribe(callback: messageCallback<InboundMessage>): Promise<ChannelStateChange | null>;
  /**
   * Publishes a single message to the channel with the given event name and payload. When publish is called with this client library, it won't attempt to implicitly attach to the channel, so long as [transient publishing](https://ably.com/docs/realtime/channels#transient-publish) is available in the library. Otherwise, the client will implicitly attach.
   *
   * @param name - The event name.
   * @param data - The message payload.
   * @param options - Optional parameters sent as part of the protocol message.
   * @returns A promise which, upon success, will be fulfilled with a {@link PublishResult} object containing the serial of the published message. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  publish(name: string, data: any, options?: PublishOptions): Promise<PublishResult>;
  /**
   * Publishes an array of messages to the channel. When publish is called with this client library, it won't attempt to implicitly attach to the channel.
   *
   * @param messages - An array of {@link Message} objects.
   * @param options - Optional parameters sent as part of the protocol message.
   * @returns A promise which, upon success, will be fulfilled with a {@link PublishResult} object containing the serials of the published messages. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  publish(messages: Message[], options?: PublishOptions): Promise<PublishResult>;
  /**
   * Publish a message to the channel. When publish is called with this client library, it won't attempt to implicitly attach to the channel.
   *
   * @param message - A {@link Message} object.
   * @param options - Optional parameters sent as part of the protocol message.
   * @returns A promise which, upon success, will be fulfilled with a {@link PublishResult} object containing the serial of the published message. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  publish(message: Message, options?: PublishOptions): Promise<PublishResult>;
  /**
   * If the channel is already in the given state, returns a promise which immediately resolves to `null`. Else, calls {@link EventEmitter.once | `once()`} to return a promise which resolves the next time the channel transitions to the given state.
   *
   * @param targetState - The channel state to wait for.
   */
  whenState(targetState: ChannelState): Promise<ChannelStateChange | null>;
  /**
   * Retrieves the latest version of a specific message by its serial identifier.
   *
   * @param serialOrMessage - Either the serial identifier string of the message to retrieve, or a {@link Message} object containing a populated `serial` field.
   * @returns A promise which, upon success, will be fulfilled with a {@link Message} object representing the latest version of the message. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  getMessage(serialOrMessage: string | Message): Promise<Message>;
  /**
   * Publishes an update to an existing message with patch semantics. Non-null `name`, `data`, and `extras` fields in the provided message will replace the corresponding fields in the existing message, while null fields will be left unchanged.
   *
   * @param message - A {@link Message} object containing a populated `serial` field and the fields to update.
   * @param operation - An optional {@link MessageOperation} object containing metadata about the update operation.
   * @param options - Optional parameters to modify how the publish is made.
   * @returns A promise which, upon success, will be fulfilled with an {@link UpdateDeleteResult} object containing the serial of the new version of the message. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  updateMessage(message: Message, operation?: MessageOperation, options?: PublishOptions): Promise<UpdateDeleteResult>;
  /**
   * Marks a message as deleted by publishing an update with an action of `MESSAGE_DELETE`. This does not remove the message from the server, and the full message history remains accessible. Uses patch semantics: non-null `name`, `data`, and `extras` fields in the provided message will replace the corresponding fields in the existing message, while null fields will be left unchanged (meaning that if you for example want the `MESSAGE_DELETE` to have an empty data, you should explicitly set the `data` to an empty object).
   *
   * @param message - A {@link Message} object containing a populated `serial` field.
   * @param operation - An optional {@link MessageOperation} object containing metadata about the delete operation.
   * @param options - Optional parameters to modify how the publish is made.
   * @returns A promise which, upon success, will be fulfilled with an {@link UpdateDeleteResult} object containing the serial of the new version of the message. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  deleteMessage(message: Message, operation?: MessageOperation, options?: PublishOptions): Promise<UpdateDeleteResult>;
  /**
   * Appends data to an existing message. The supplied `data` field is appended to the previous message's data, while all other fields (`name`, `extras`) replace the previous values if provided.
   *
   * @param message - A {@link Message} object containing a populated `serial` field and the data to append.
   * @param operation - An optional {@link MessageOperation} object containing metadata about the append operation.
   * @param options - Optional parameters to modify how the publish is made.
   * @returns A promise which, upon success, will be fulfilled with an {@link UpdateDeleteResult} object containing the serial of the new version of the message. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  appendMessage(message: Message, operation?: MessageOperation, options?: PublishOptions): Promise<UpdateDeleteResult>;
  /**
   * Retrieves all historical versions of a specific message, ordered by version. This includes the original message and all subsequent updates or delete operations.
   *
   * @param serialOrMessage - Either the serial identifier string of the message whose versions are to be retrieved, or a {@link Message} object containing a populated `serial` field.
   * @param params - Optional parameters sent as part of the query string.
   * @returns A promise which, upon success, will be fulfilled with a {@link PaginatedResult} object containing an array of {@link Message} objects representing all versions of the message. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  getMessageVersions(
    serialOrMessage: string | Message,
    params?: Record<string, any>,
  ): Promise<PaginatedResult<Message>>;
}

/**
 * Enables the presence set to be entered and subscribed to, and the historic presence set to be retrieved for a channel.
 */
export declare interface RealtimePresence {
  /**
   * Indicates whether the presence set synchronization between Ably and the clients on the channel has been completed. Set to `true` when the sync is complete.
   */
  syncComplete: boolean;
  /**
   * Deregisters a specific listener that is registered to receive {@link PresenceMessage} on the channel for a given {@link PresenceAction}.
   *
   * @param presence - A specific {@link PresenceAction} to deregister the listener for.
   * @param listener - An event listener function.
   */
  unsubscribe(presence: PresenceAction, listener: messageCallback<PresenceMessage>): void;
  /**
   * Deregisters a specific listener that is registered to receive {@link PresenceMessage} on the channel for a given array of {@link PresenceAction} objects.
   *
   * @param presence - An array of {@link PresenceAction} objects to deregister the listener for.
   * @param listener - An event listener function.
   */
  unsubscribe(presence: Array<PresenceAction>, listener: messageCallback<PresenceMessage>): void;
  /**
   * Deregisters any listener that is registered to receive {@link PresenceMessage} on the channel for a specific {@link PresenceAction}
   *
   * @param presence - A specific {@link PresenceAction} to deregister the listeners for.
   */
  unsubscribe(presence: PresenceAction): void;
  /**
   * Deregisters any listener that is registered to receive {@link PresenceMessage} on the channel for an array of {@link PresenceAction} objects
   *
   * @param presence - An array of {@link PresenceAction} objects to deregister the listeners for.
   */
  unsubscribe(presence: Array<PresenceAction>): void;
  /**
   * Deregisters a specific listener that is registered to receive {@link PresenceMessage} on the channel.
   *
   * @param listener - An event listener function.
   */
  unsubscribe(listener: messageCallback<PresenceMessage>): void;
  /**
   * Deregisters all listeners currently receiving {@link PresenceMessage} for the channel.
   */
  unsubscribe(): void;

  /**
   * Retrieves the current members present on the channel and the metadata for each member, such as their {@link PresenceAction} and ID. Returns an array of {@link PresenceMessage} objects.
   *
   * @param params - A set of parameters which are used to specify which presence members should be retrieved.
   * @returns A promise which, upon success, will be fulfilled with an array of {@link PresenceMessage} objects. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  get(params?: RealtimePresenceParams): Promise<PresenceMessage[]>;
  /**
   * Retrieves a {@link PaginatedResult} object, containing an array of historical {@link PresenceMessage} objects for the channel. If the channel is configured to persist messages, then presence messages can be retrieved from history for up to 72 hours in the past. If not, presence messages can only be retrieved from history for up to two minutes in the past.
   *
   * @param params - A set of parameters which are used to specify which presence messages should be retrieved.
   * @returns A promise which, upon success, will be fulfilled with a {@link PaginatedResult} object containing an array of {@link PresenceMessage} objects. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  history(params?: RealtimeHistoryParams): Promise<PaginatedResult<PresenceMessage>>;
  /**
   * Registers a listener that is called each time a {@link PresenceMessage} matching a given {@link PresenceAction}, or an action within an array of {@link PresenceAction | `PresenceAction`s}, is received on the channel, such as a new member entering the presence set.
   *
   * @param action - A {@link PresenceAction} or an array of {@link PresenceAction | `PresenceAction`s} to register the listener for.
   * @param listener - An event listener function.
   * @returns A promise which resolves upon success of the channel {@link RealtimeChannel.attach | `attach()`} operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  subscribe(action: PresenceAction | Array<PresenceAction>, listener?: messageCallback<PresenceMessage>): Promise<void>;
  /**
   * Registers a listener that is called each time a {@link PresenceMessage} is received on the channel, such as a new member entering the presence set.
   *
   * @param listener - An event listener function.
   * @returns A promise which resolves upon success of the channel {@link RealtimeChannel.attach | `attach()`} operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  subscribe(listener?: messageCallback<PresenceMessage>): Promise<void>;
  /**
   * Enters the presence set for the channel, optionally passing a `data` payload. A `clientId` is required to be present on a channel.
   *
   * @param data - The payload associated with the presence member.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  enter(data?: any): Promise<void>;
  /**
   * Updates the `data` payload for a presence member. If called before entering the presence set, this is treated as an {@link PresenceActions.ENTER} event.
   *
   * @param data - The payload to update for the presence member.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  update(data?: any): Promise<void>;
  /**
   * Leaves the presence set for the channel. A client must have previously entered the presence set before they can leave it.
   *
   * @param data - The payload associated with the presence member.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  leave(data?: any): Promise<void>;
  /**
   * Enters the presence set of the channel for a given `clientId`. Enables a single client to update presence on behalf of any number of clients using a single connection. The library must have been instantiated with an API key or a token bound to a wildcard `clientId`.
   *
   * @param clientId - The ID of the client to enter into the presence set.
   * @param data - The payload associated with the presence member.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  enterClient(clientId: string, data?: any): Promise<void>;
  /**
   * Updates the `data` payload for a presence member using a given `clientId`. Enables a single client to update presence on behalf of any number of clients using a single connection. The library must have been instantiated with an API key or a token bound to a wildcard `clientId`.
   *
   * @param clientId - The ID of the client to update in the presence set.
   * @param data - The payload to update for the presence member.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  updateClient(clientId: string, data?: any): Promise<void>;
  /**
   * Leaves the presence set of the channel for a given `clientId`. Enables a single client to update presence on behalf of any number of clients using a single connection. The library must have been instantiated with an API key or a token bound to a wildcard `clientId`.
   *
   * @param clientId - The ID of the client to leave the presence set for.
   * @param data - The payload associated with the presence member.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  leaveClient(clientId: string, data?: any): Promise<void>;
}

/**
 * Functionality for annotating messages with small pieces of data, such as emoji
 * reactions, that the server will roll up into the message as a summary.
 */
export declare interface RealtimeAnnotations {
  /**
   * Registers a listener that is called each time an {@link Annotation} matching a given type is received on the channel.
   * Note that if you want to receive individual realtime annotations (instead of just the rolled-up summaries), you will need to request the annotation_subscribe ChannelMode in ChannelOptions, since they are not delivered by default. In general, most clients will not bother with subscribing to individual annotations, and will instead just look at the summary updates.
   *
   * @param type - A specific type string or an array of them to register the listener for.
   * @param listener - An event listener function.
   * @returns A promise which resolves upon success of the channel {@link RealtimeChannel.attach | `attach()`} operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  subscribe(type: string | Array<string>, listener?: messageCallback<Annotation>): Promise<void>;
  /**
   * Registers a listener that is called each time an {@link Annotation} is received on the channel.
   * Note that if you want to receive individual realtime annotations (instead of just the rolled-up summaries), you will need to request the annotation_subscribe ChannelMode in ChannelOptions, since they are not delivered by default. In general, most clients will not bother with subscribing to individual annotations, and will instead just look at the summary updates.
   *
   * @param listener - An event listener function.
   * @returns A promise which resolves upon success of the channel {@link RealtimeChannel.attach | `attach()`} operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  subscribe(listener?: messageCallback<Annotation>): Promise<void>;
  /**
   * Deregisters a specific listener that is registered to receive {@link Annotation} on the channel for a given type.
   *
   * @param type - A specific annotation type (or array of types) to deregister the listener for.
   * @param listener - An event listener function.
   */
  unsubscribe(type: string | Array<string>, listener: messageCallback<Annotation>): void;
  /**
   * Deregisters any listener that is registered to receive {@link Annotation} on the channel for a specific type.
   *
   * @param type - A specific annotation type (or array of types) to deregister the listeners for.
   */
  unsubscribe(type: string | Array<string>): void;
  /**
   * Deregisters a specific listener that is registered to receive {@link Annotation} on the channel.
   *
   * @param listener - An event listener function.
   */
  unsubscribe(listener: messageCallback<Annotation>): void;
  /**
   * Deregisters all listeners currently receiving {@link Annotation} for the channel.
   */
  unsubscribe(): void;
  /**
   * Publish a new annotation for a message.
   *
   * @param message - The message to annotate.
   * @param annotation - The annotation to publish. (Must include at least the `type`;
   * other required fields depend on the annotation type).
   */
  publish(message: Message, annotation: OutboundAnnotation): Promise<void>;
  /**
   * Publish a new annotation for a message (alternative form where you only have the
   * serial of the message, not a complete Message object)
   *
   * @param messageSerial - The serial field of the message to annotate.
   * @param annotation - The annotation to publish. (Must include at least the `type`;
   * other required fields depend on the annotation type).
   */
  publish(messageSerial: string, annotation: OutboundAnnotation): Promise<void>;
  /**
   * Publish an annotation removal request for a message, to remove it from the summary
   * summaries. The semantics of the delete (and what fields are required) are different
   * for each annotation type; see annotation types documentation for more details.
   *
   * @param message - The message which has an annotation that you want to delete.
   * @param annotation - The annotation deletion request. (Must include at least the
   * `type`, other required fields depend on the type).
   */
  delete(message: Message, annotation: OutboundAnnotation): Promise<void>;
  /**
   * Publish an annotation removal request for a message, to remove it from the summary
   * summaries. The semantics of the delete (and what fields are required) are different
   * for each annotation type; see annotation types documentation for more details.
   *
   * @param messageSerial - The serial field of the message which has an annotation that
   * you want to delete.
   * @param annotation - The annotation deletion request. (Must include at least the
   * `type`, other required fields depend on the type).
   */
  delete(messageSerial: string, annotation: OutboundAnnotation): Promise<void>;
  /**
   * Get all annotations for a given message (as a paginated result)
   *
   * @param message - The message to get annotations for.
   * @param params - Restrictions on which annotations to get (in particular a limit)
   */
  get(message: Message, params: GetAnnotationsParams | null): Promise<PaginatedResult<Annotation>>;
  /**
   * Get all annotations for a given message (as a paginated result) (alternative form
   * where you only have the serial of the message, not a complete Message object)
   *
   * @param messageSerial - The `serial` of the message to get annotations for.
   * @param params - Restrictions on which annotations to get (in particular a limit)
   */
  get(messageSerial: string, params: GetAnnotationsParams | null): Promise<PaginatedResult<Annotation>>;
}

/**
 * Enables the management of a connection to Ably.
 */
export declare interface Connection
  extends EventEmitter<connectionEventCallback, ConnectionStateChange, ConnectionEvent> {
  /**
   * An {@link ErrorInfo} object describing the last error received if a connection failure occurs.
   */
  errorReason: ErrorInfo;
  /**
   * A unique public identifier for this connection, used to identify this member.
   */
  id?: string;
  /**
   * A unique private connection key used to recover or resume a connection, assigned by Ably. This private connection key can also be used by other REST clients to publish on behalf of this client. See the [publishing over REST on behalf of a realtime client docs](https://ably.com/docs/rest/channels#publish-on-behalf) for more info. (If you want to explicitly recover a connection in a different SDK instance, see createRecoveryKey() instead)
   */
  key?: string;
  /**
   * createRecoveryKey method returns a string that can be used by another client to recover this connection's state in the recover client options property. See [connection state recover options](https://ably.com/docs/connect/states?lang=javascript#connection-state-recovery) for more information.
   */
  createRecoveryKey(): string | null;
  /**
   * The current {@link ConnectionState} of the connection.
   */
  readonly state: ConnectionState;
  /**
   * Causes the connection to close, entering the {@link ConnectionStates.CLOSING} state. Once closed, the library does not attempt to re-establish the connection without an explicit call to {@link Connection.connect | `connect()`}.
   */
  close(): void;
  /**
   * Explicitly calling `connect()` is unnecessary unless the `autoConnect` attribute of the {@link ClientOptions} object is `false`. Unless already connected or connecting, this method causes the connection to open, entering the {@link ConnectionStates.CONNECTING} state.
   */
  connect(): void;

  /**
   * When connected, sends a heartbeat ping to the Ably server and executes the callback with any error and the response time in milliseconds when a heartbeat ping request is echoed from the server. This can be useful for measuring true round-trip latency to the connected Ably server.
   *
   * @returns A promise which, upon success, will be fulfilled with the response time in milliseconds. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  ping(): Promise<number>;
  /**
   * If the connection is already in the given state, returns a promise which immediately resolves to `null`. Else, calls {@link EventEmitter.once | `once()`} to return a promise which resolves the next time the connection transitions to the given state.
   *
   * @param targetState - The connection state to wait for.
   */
  whenState(targetState: ConnectionState): Promise<ConnectionStateChange | null>;
}
