/**
 * React hooks for the Ably Pub/Sub device SDK.
 *
 * Wrap your component tree in an {@link AblyProvider} configured with a `DeviceClient`
 * from `@ably/pubsub-device`, declare channels with {@link ChannelProvider}, and use the
 * hooks ({@link useChannel}, {@link usePresence}, {@link usePresenceListener},
 * {@link useConnectionStateListener}, {@link useChannelStateListener}) inside child
 * components. Core Pub/Sub types are obtained from the `@ably/pubsub-device` peer
 * dependency; this package does not re-export them.
 *
 * Types-only spike for PDR-091.
 */

import type * as React from 'react';
import type {
  DeviceClient,
  RealtimeChannel,
  ChannelOptions,
  DeriveOptions,
  ErrorInfo,
  InboundMessage,
  messageCallback,
  PresenceMessage as CorePresenceMessage,
  ConnectionState,
  ConnectionStateChange,
  ChannelState,
  ChannelStateChange,
} from '@ably/pubsub-device';

/**
 * The version of this package, e.g. `3.0.0`. Appended to the channel `agent` param for
 * attribution of traffic originating from the React hooks.
 */
export declare const version: string;

/**
 * A channel registered in the Ably React context by a {@link ChannelProvider}.
 */
export interface ChannelContextProps {
  /**
   * The channel instance created by the enclosing {@link ChannelProvider}.
   */
  channel: RealtimeChannel;
  /**
   * Whether the channel is a derived channel, i.e. was created with
   * {@link ChannelProviderProps.deriveOptions | deriveOptions}.
   */
  derived?: boolean;
}

/**
 * The per-provider entry stored in the Ably React context, containing the client and the
 * channels registered by {@link ChannelProvider} components, indexed by provider `ablyId`.
 */
export interface AblyContextProviderProps {
  /**
   * The client supplied to the {@link AblyProvider} for this `ablyId`.
   */
  client: DeviceClient;
  /**
   * The channels registered by {@link ChannelProvider} components under this `ablyId`,
   * indexed by channel name. Internal; not part of the public API contract.
   */
  _channelNameToChannelContext: Record<string, ChannelContextProps>;
  /**
   * The channel named by the closest enclosing {@link ChannelProvider}. Channel hooks
   * called without an explicit channel name resolve to this, so the name does not have
   * to be repeated when there is a surrounding provider. Internal; not part of the
   * public API contract.
   */
  _nearestChannelName?: string;
}

/**
 * The value stored in the Ably React context: an object holding all provider options
 * indexed by provider `ablyId`, used to look up options set by a specific
 * {@link AblyProvider} after calling `React.useContext`.
 */
export type AblyContextValue = Record<string, AblyContextProviderProps>;

/**
 * The React context used by {@link AblyProvider} and {@link ChannelProvider} to make
 * clients and channels available to the hooks. A single context instance is stored in
 * the global state to guard against duplicate context instances arising from bundler or
 * package-manager misconfiguration on the consumer side.
 */
export declare const AblyContext: React.Context<AblyContextValue>;

/**
 * Props for the {@link AblyProvider} component.
 */
export interface AblyProviderProps {
  /**
   * The component subtree that will have access to the client via the Ably hooks.
   */
  children?: React.ReactNode | React.ReactNode[] | null;
  /**
   * The `DeviceClient` instance to make available to child hooks. Required at runtime;
   * the provider throws if it is not supplied. Create the client outside your component
   * tree (or memoize it) so a new client is not constructed on every render.
   */
  client?: DeviceClient;
  /**
   * An optional identifier for this provider, allowing multiple Ably clients to be used
   * in the same component tree. Hooks and {@link ChannelProvider} components select a
   * provider by passing the same `ablyId`. Defaults to `default`.
   */
  ablyId?: string;
}

/**
 * A React component which makes a `DeviceClient` available to all child components via
 * the Ably hooks. Nest multiple providers with distinct
 * {@link AblyProviderProps.ablyId | ablyId} values to use more than one client.
 *
 * @param props - The {@link AblyProviderProps} for the component.
 * @returns The provider element wrapping `props.children`.
 */
export declare function AblyProvider(props: AblyProviderProps): React.ReactElement | null;

/**
 * Props for the {@link ChannelProvider} component.
 */
export interface ChannelProviderProps {
  /**
   * The `ablyId` of the enclosing {@link AblyProvider} whose client should be used for
   * this channel. Defaults to `default`.
   */
  ablyId?: string;
  /**
   * The name of the channel to create and register for use by the channel hooks. Only
   * one `ChannelProvider` per channel name may exist under a given provider; a second
   * one with the same name throws at render time.
   */
  channelName: string;
  /**
   * Channel options applied to the channel, for example cipher parameters, params, or
   * channel modes. The provider appends its own `agent` channel param for attribution
   * and disables implicit attach-on-subscribe; the hooks attach the channel explicitly.
   */
  options?: ChannelOptions;
  /**
   * When set, the channel is created as a derived channel with the given options (for
   * example a message filter). Publishes made through {@link useChannel} on a derived
   * channel are sent transiently via the underlying regular channel.
   */
  deriveOptions?: DeriveOptions;
  /**
   * The component subtree that will have access to the channel via the channel hooks.
   */
  children?: React.ReactNode | React.ReactNode[] | null;
}

/**
 * A React component which creates a channel and makes it available to the channel hooks
 * ({@link useChannel}, {@link usePresence}, {@link usePresenceListener},
 * {@link useChannelStateListener}) in child components. Channel hooks called without an
 * explicit channel name resolve to the channel of the nearest enclosing
 * `ChannelProvider` with the same `ablyId`.
 *
 * @param props - The {@link ChannelProviderProps} for the component.
 * @returns The provider element wrapping `props.children`.
 */
export declare function ChannelProvider(props: ChannelProviderProps): React.ReactElement | null;

/**
 * Options accepted by the channel hooks identifying the channel to use and how to react
 * to connection and channel errors.
 */
export type ChannelNameAndOptions = {
  /**
   * The name of the channel to use. When omitted, channel hooks resolve to the
   * channel named by the closest enclosing `ChannelProvider`. Resolution is
   * scoped by `ablyId`, so a channel is only inferred from a `ChannelProvider`
   * that uses the same `ablyId` (the `default` one when none is provided).
   */
  channelName?: string;
  /**
   * The `ablyId` of the {@link AblyProvider} whose client should be used. Defaults to
   * `default`.
   */
  ablyId?: string;
  /**
   * When `true`, the hook does not subscribe, enter presence, or attach the channel.
   * Use this to conditionally disable a hook while keeping hook call order stable.
   */
  skip?: boolean;

  /**
   * A callback invoked when the connection enters the `failed` or `suspended` state.
   * The most recent error is also surfaced as `connectionError` on the hook result.
   */
  onConnectionError?: (error: ErrorInfo) => unknown;
  /**
   * A callback invoked when the channel enters the `failed` or `suspended` state. The
   * most recent error is also surfaced as `channelError` on the hook result.
   */
  onChannelError?: (error: ErrorInfo) => unknown;
};

/**
 * The subset of {@link ChannelNameAndOptions} identifying a channel and provider,
 * accepted by {@link useChannelStateListener}.
 */
export type ChannelNameAndAblyId = Pick<ChannelNameAndOptions, 'channelName' | 'ablyId'>;

/**
 * A channel identifier accepted by the channel hooks: either a channel name string or a
 * {@link ChannelNameAndOptions} object.
 */
export type ChannelParameters = string | ChannelNameAndOptions;

/**
 * A hook which returns the `DeviceClient` made available by the enclosing
 * {@link AblyProvider}. Throws if called outside an `AblyProvider`, or if no provider
 * with the given `ablyId` exists.
 *
 * @param ablyId - The `ablyId` of the provider whose client to return. Defaults to
 * `default`.
 * @returns The client instance.
 */
export declare function useAbly(ablyId?: string): DeviceClient;

/**
 * A callback invoked with each message received on a channel via {@link useChannel}.
 */
export type AblyMessageCallback = messageCallback<InboundMessage>;

/**
 * The result of the {@link useChannel} hook.
 */
export interface ChannelResult {
  /**
   * The channel instance in use.
   */
  channel: RealtimeChannel;
  /**
   * Publishes messages to the channel. For a derived channel this publishes transiently
   * via the underlying regular channel, so it does not attach the channel.
   */
  publish: RealtimeChannel['publish'];
  /**
   * Retrieves the message history of the channel.
   */
  history: RealtimeChannel['history'];
  /**
   * The client the channel belongs to.
   */
  ably: DeviceClient;
  /**
   * The most recent connection error, populated when the connection enters the `failed`
   * or `suspended` state, or `null` if none has occurred.
   */
  connectionError: ErrorInfo | null;
  /**
   * The most recent channel error, populated when the channel enters the `failed` or
   * `suspended` state, or `null` if none has occurred.
   */
  channelError: ErrorInfo | null;
}

/**
 * A hook which subscribes to messages on the channel of the nearest enclosing
 * {@link ChannelProvider} and attaches the channel. Must be used within an
 * `AblyProvider` and a `ChannelProvider`.
 *
 * @param callbackOnMessage - A callback invoked with each message received on the
 * channel. The channel is not subscribed to when omitted, but is still attached.
 * @returns A {@link ChannelResult} for the channel.
 */
export declare function useChannel(callbackOnMessage?: AblyMessageCallback): ChannelResult;
/**
 * A hook which subscribes to messages on the named channel and attaches it. The channel
 * must have been declared by a {@link ChannelProvider} with the same name. Must be used
 * within an `AblyProvider`.
 *
 * @param channelNameOrNameAndOptions - The name of the channel to use, or a
 * {@link ChannelNameAndOptions} object.
 * @param callbackOnMessage - A callback invoked with each message received on the
 * channel. The channel is not subscribed to when omitted, but is still attached.
 * @returns A {@link ChannelResult} for the channel.
 */
export declare function useChannel(
  channelNameOrNameAndOptions: ChannelParameters,
  callbackOnMessage?: AblyMessageCallback,
): ChannelResult;
/**
 * A hook which subscribes to messages with the given event name on the named channel and
 * attaches it. The channel must have been declared by a {@link ChannelProvider} with the
 * same name. Must be used within an `AblyProvider`.
 *
 * @param channelNameOrNameAndOptions - The name of the channel to use, or a
 * {@link ChannelNameAndOptions} object.
 * @param event - The message event name to subscribe to; messages with other event names
 * are not delivered to the callback.
 * @param callbackOnMessage - A callback invoked with each matching message received on
 * the channel. The channel is not subscribed to when omitted, but is still attached.
 * @returns A {@link ChannelResult} for the channel.
 */
export declare function useChannel(
  channelNameOrNameAndOptions: ChannelParameters,
  event: string,
  callbackOnMessage?: AblyMessageCallback,
): ChannelResult;

/**
 * The result of the {@link usePresence} hook.
 */
export interface PresenceResult<T> {
  /**
   * Updates the presence data for the current client on the channel.
   *
   * @param messageOrPresenceObject - The new presence data.
   * @returns A promise which resolves once the update has been sent.
   */
  updateStatus: (messageOrPresenceObject: T) => Promise<void>;
  /**
   * The most recent connection error, populated when the connection enters the `failed`
   * or `suspended` state, or `null` if none has occurred.
   */
  connectionError: ErrorInfo | null;
  /**
   * The most recent channel error, populated when the channel enters the `failed` or
   * `suspended` state, or `null` if none has occurred.
   */
  channelError: ErrorInfo | null;
}

/**
 * A hook which enters the presence set of a channel on mount and leaves it on unmount.
 * Presence is only entered once the connection and channel are in a state that permits
 * it. Must be used within an `AblyProvider` and a `ChannelProvider`.
 *
 * The channel name can be omitted to use the channel from the nearest `ChannelProvider`.
 * Because the presence data can itself be a string or object, it is indistinguishable
 * from a channel name or options object, so it cannot be passed as the first argument.
 * To infer the channel while still providing presence data, pass `undefined` as the
 * first argument: `usePresence(undefined, presenceData)`.
 *
 * @param channelNameOrNameAndOptions - The name of the channel whose presence set to
 * enter, or a {@link ChannelNameAndOptions} object, or `undefined` to use the channel of
 * the nearest enclosing `ChannelProvider`.
 * @param messageOrPresenceObject - The presence data to enter with.
 * @returns A {@link PresenceResult} whose `updateStatus` updates the presence data.
 */
export declare function usePresence<T = any>(
  channelNameOrNameAndOptions?: ChannelParameters,
  messageOrPresenceObject?: T,
): PresenceResult<T>;

/**
 * A presence message whose `data` field is typed with the presence data type used by the
 * application.
 */
export interface PresenceMessage<T = any> extends CorePresenceMessage {
  /**
   * The presence data carried by the message.
   */
  data: T;
}

/**
 * The result of the {@link usePresenceListener} hook.
 */
export interface PresenceListenerResult<T> {
  /**
   * The current members of the channel's presence set. Refreshed whenever a member
   * enters, leaves, or updates its presence data.
   */
  presenceData: PresenceMessage<T>[];
  /**
   * The most recent connection error, populated when the connection enters the `failed`
   * or `suspended` state, or `null` if none has occurred.
   */
  connectionError: ErrorInfo | null;
  /**
   * The most recent channel error, populated when the channel enters the `failed` or
   * `suspended` state, or `null` if none has occurred.
   */
  channelError: ErrorInfo | null;
}

/**
 * A callback invoked with each presence enter, leave, or update event received by
 * {@link usePresenceListener}.
 */
export type OnPresenceMessageReceived<T> = (presenceData: PresenceMessage<T>) => void;

/**
 * A hook which subscribes to the presence set of the channel of the nearest enclosing
 * {@link ChannelProvider}, keeping `presenceData` up to date as members enter, leave, or
 * update, and attaches the channel. It does not enter presence itself; use
 * {@link usePresence} for that. Must be used within an `AblyProvider` and a
 * `ChannelProvider`.
 *
 * @param onPresenceMessageReceived - A callback invoked with each presence event, in
 * addition to the `presenceData` state being refreshed.
 * @returns A {@link PresenceListenerResult} containing the current presence set.
 */
export declare function usePresenceListener<T = any>(
  onPresenceMessageReceived?: OnPresenceMessageReceived<T>,
): PresenceListenerResult<T>;
/**
 * A hook which subscribes to the presence set of the named channel, keeping
 * `presenceData` up to date as members enter, leave, or update, and attaches the
 * channel. It does not enter presence itself; use {@link usePresence} for that. The
 * channel must have been declared by a {@link ChannelProvider} with the same name. Must
 * be used within an `AblyProvider`.
 *
 * @param channelNameOrNameAndOptions - The name of the channel whose presence set to
 * observe, or a {@link ChannelNameAndOptions} object.
 * @param onPresenceMessageReceived - A callback invoked with each presence event, in
 * addition to the `presenceData` state being refreshed.
 * @returns A {@link PresenceListenerResult} containing the current presence set.
 */
export declare function usePresenceListener<T = any>(
  channelNameOrNameAndOptions: ChannelParameters,
  onPresenceMessageReceived?: OnPresenceMessageReceived<T>,
): PresenceListenerResult<T>;

/**
 * A listener invoked with each connection state change observed by
 * {@link useConnectionStateListener}.
 */
export type ConnectionStateListener = (stateChange: ConnectionStateChange) => any;

/**
 * A hook which registers a listener for connection state changes on the client of the
 * enclosing {@link AblyProvider}, and deregisters it on unmount. Must be used within an
 * `AblyProvider`.
 *
 * @param listener - A listener invoked with each connection state change.
 * @param ablyId - The `ablyId` of the provider whose client to observe. Defaults to
 * `default`.
 */
export declare function useConnectionStateListener(listener: ConnectionStateListener, ablyId?: string): void;
/**
 * A hook which registers a listener for changes into the given connection state or
 * states on the client of the enclosing {@link AblyProvider}, and deregisters it on
 * unmount. Must be used within an `AblyProvider`.
 *
 * @param state - The connection state or states to listen for.
 * @param listener - A listener invoked with each matching connection state change.
 * @param ablyId - The `ablyId` of the provider whose client to observe. Defaults to
 * `default`.
 */
export declare function useConnectionStateListener(
  state: ConnectionState | ConnectionState[],
  listener: ConnectionStateListener,
  ablyId?: string,
): void;

/**
 * A listener invoked with each channel state change observed by
 * {@link useChannelStateListener}.
 */
export type ChannelStateListener = (stateChange: ChannelStateChange) => any;

/**
 * A hook which registers a listener for state changes on the channel of the nearest
 * enclosing {@link ChannelProvider}, and deregisters it on unmount. Must be used within
 * an `AblyProvider` and a `ChannelProvider`.
 *
 * @param listener - A listener invoked with each channel state change.
 */
export declare function useChannelStateListener(listener?: ChannelStateListener): void;
/**
 * A hook which registers a listener for state changes on the named channel, and
 * deregisters it on unmount. The channel must have been declared by a
 * {@link ChannelProvider} with the same name. Must be used within an `AblyProvider`.
 *
 * @param channelName - The name of the channel to observe.
 * @param listener - A listener invoked with each channel state change.
 */
export declare function useChannelStateListener(channelName: string, listener?: ChannelStateListener): void;
/**
 * A hook which registers a listener for state changes on the channel identified by the
 * given options, and deregisters it on unmount. The channel must have been declared by a
 * {@link ChannelProvider} with the same name. Must be used within an `AblyProvider`.
 *
 * @param options - A {@link ChannelNameAndAblyId} identifying the channel and provider
 * to observe.
 * @param listener - A listener invoked with each channel state change.
 */
export declare function useChannelStateListener(options: ChannelNameAndAblyId, listener?: ChannelStateListener): void;
/**
 * A hook which registers a listener for changes into the given channel state or states
 * on the identified channel, and deregisters it on unmount. The channel must have been
 * declared by a {@link ChannelProvider} with the same name. Must be used within an
 * `AblyProvider`.
 *
 * @param options - A {@link ChannelNameAndAblyId} identifying the channel and provider
 * to observe, or the name of the channel.
 * @param state - The channel state or states to listen for.
 * @param listener - A listener invoked with each matching channel state change.
 */
export declare function useChannelStateListener(
  options: ChannelNameAndAblyId | string,
  state?: ChannelState | ChannelState[],
  listener?: ChannelStateListener,
): void;
