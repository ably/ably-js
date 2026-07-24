// Type definitions for @ably/pubsub-server: the Ably Pub/Sub SDK for servers.
// Types-only spike for PDR-091.

// The same-name `export type X` + `export declare const X` pairs below are deliberate
// type+value declaration merges (the values cannot live in the never-published
// @ably/pubsub-common), which the lint rule cannot distinguish from accidental redeclaration.
/* eslint-disable @typescript-eslint/no-redeclare */

export * from '@ably/pubsub-common';
export * from './admin';

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
  Channels,
  CommonClientOptions,
  Connection,
  Crypto as CryptoStatic,
  ErrorInfo as ErrorInfoType,
  ErrorInfoConstructor,
  GetAnnotationsParams,
  HttpOptions,
  HttpPaginatedResponse,
  InboundMessage,
  Message as MessageType,
  MessageOperation,
  MessageStatic,
  OutboundAnnotation,
  PaginatedResult,
  PresenceMessage as PresenceMessageType,
  PresenceMessageStatic,
  PublishOptions,
  PublishResult,
  RealtimeChannelBase,
  RealtimeChannels,
  RealtimeOptions,
  UpdateDeleteResult,
} from '@ably/pubsub-common';
import type {
  ServerPush,
  Stats,
  StatsParams,
  TokenRevocationFailureResult,
  TokenRevocationOptions,
  TokenRevocationSuccessResult,
  TokenRevocationTargetSpecifier,
} from './admin';

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
 * A message annotation, received from Ably.
 */
export type Annotation = AnnotationType;

/**
 * Static utilities related to annotations.
 */
export declare const Annotation: AnnotationStatic;

/**
 * Creates Ably {@link TokenRequest} objects and obtains Ably Tokens from Ably to subsequently issue to less trusted clients. Extends the shared authentication surface with token revocation, which is only available to server-side clients.
 */
export interface ServerAuth extends Auth {
  /**
   * Revokes the tokens specified by the provided array of {@link TokenRevocationTargetSpecifier}s. Only tokens issued by an API key that had revocable tokens enabled before the token was issued can be revoked. See the [token revocation docs](https://ably.com/docs/core-features/authentication#token-revocation) for more information.
   *
   * @param specifiers - An array of {@link TokenRevocationTargetSpecifier} objects.
   * @param options - A set of options which are used to modify the revocation request.
   * @returns A promise which, upon success, will be fulfilled with a {@link BatchResult} containing information about the result of the token revocation request for each provided [`TokenRevocationTargetSpecifier`]{@link TokenRevocationTargetSpecifier}. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  revokeTokens(
    specifiers: TokenRevocationTargetSpecifier[],
    options?: TokenRevocationOptions,
  ): Promise<BatchResult<TokenRevocationSuccessResult | TokenRevocationFailureResult>>;
}

/**
 * The `HttpHistoryParams` interface describes the parameters accepted by the following methods:
 *
 * - {@link Presence.history}
 * - {@link HttpChannel.history}
 */
export interface HttpHistoryParams {
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
}

/**
 * The `HttpPresenceParams` interface describes the parameters accepted by {@link Presence.get}.
 */
export interface HttpPresenceParams {
  /**
   * An upper limit on the number of messages returned. The default is 100, and the maximum is 1000.
   *
   * @defaultValue 100
   */
  limit?: number;
  /**
   * Filters the list of returned presence members by a specific client using its ID.
   */
  clientId?: string;
  /**
   * Filters the list of returned presence members by a specific connection using its ID.
   */
  connectionId?: string;
}

/**
 * Enables the retrieval of the current and historic presence set for a channel.
 */
export declare interface Presence {
  /**
   * Retrieves the current members present on the channel and the metadata for each member, such as their {@link PresenceAction} and ID. Returns a {@link PaginatedResult} object, containing an array of {@link PresenceMessage} objects.
   *
   * @param params - A set of parameters which are used to specify which presence members should be retrieved.
   * @returns A promise which, upon success, will be fulfilled with a {@link PaginatedResult} object containing an array of {@link PresenceMessage} objects. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  get(params?: HttpPresenceParams): Promise<PaginatedResult<PresenceMessage>>;
  /**
   * Retrieves a {@link PaginatedResult} object, containing an array of historical {@link PresenceMessage} objects for the channel. If the channel is configured to persist messages, then presence messages can be retrieved from history for up to 72 hours in the past. If not, presence messages can only be retrieved from history for up to two minutes in the past.
   *
   * @param params - A set of parameters which are used to specify which messages should be retrieved.
   * @returns A promise which, upon success, will be fulfilled with a {@link PaginatedResult} object containing an array of {@link PresenceMessage} objects. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  history(params?: HttpHistoryParams): Promise<PaginatedResult<PresenceMessage>>;
}

/**
 * Functionality for annotating messages with small pieces of data, such as emoji
 * reactions, that the server will roll up into the message as a summary.
 */
export declare interface HttpAnnotations {
  /**
   * Publish a new annotation for a message.
   *
   * @param message - The message to annotate.
   * @param annotation - The annotation to publish. (Must include at least the `type`.
   * Assumed to be an annotation.create if no action is specified)
   */
  publish(message: Message, annotation: OutboundAnnotation): Promise<void>;
  /**
   * Publish a new annotation for a message (alternative form where you only have the
   * serial of the message, not a complete Message object)
   *
   * @param messageSerial - The serial field of the message to annotate.
   * @param annotation - The annotation to publish. (Must include at least the `type`.
   * Assumed to be an annotation.create if no action is specified)
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
 * Contains the details of a {@link HttpChannel} or {@link RealtimeChannel} object such as its ID and {@link ChannelStatus}.
 */
export interface ChannelDetails {
  /**
   * The identifier of the channel.
   */
  channelId: string;
  /**
   * A {@link ChannelStatus} object.
   */
  status: ChannelStatus;
}

/**
 * Contains the status of a {@link HttpChannel} or {@link RealtimeChannel} object such as whether it is active and its {@link ChannelOccupancy}.
 */
export interface ChannelStatus {
  /**
   * If `true`, the channel is active, otherwise `false`.
   */
  isActive: boolean;
  /**
   * A {@link ChannelOccupancy} object.
   */
  occupancy: ChannelOccupancy;
}

/**
 * Contains the metrics of a {@link HttpChannel} or {@link RealtimeChannel} object.
 */
export interface ChannelOccupancy {
  /**
   * A {@link ChannelMetrics} object.
   */
  metrics: ChannelMetrics;
}

/**
 * Contains the metrics associated with a {@link HttpChannel} or {@link RealtimeChannel}, such as the number of publishers, subscribers and connections it has.
 */
export interface ChannelMetrics {
  /**
   * The number of realtime connections attached to the channel.
   */
  connections: number;
  /**
   * The number of realtime connections attached to the channel with permission to enter the presence set, regardless of whether or not they have entered it. This requires the `presence` capability and for a client to not have specified a {@link ChannelMode} flag that excludes {@link ChannelModes.PRESENCE}.
   */
  presenceConnections: number;
  /**
   * The number of members in the presence set of the channel.
   */
  presenceMembers: number;
  /**
   * The number of realtime attachments receiving presence messages on the channel. This requires the `subscribe` capability and for a client to not have specified a {@link ChannelMode} flag that excludes {@link ChannelModes.PRESENCE_SUBSCRIBE}.
   */
  presenceSubscribers: number;
  /**
   * The number of realtime attachments permitted to publish messages to the channel. This requires the `publish` capability and for a client to not have specified a {@link ChannelMode} flag that excludes {@link ChannelModes.PUBLISH}.
   */
  publishers: number;
  /**
   * The number of realtime attachments receiving messages on the channel. This requires the `subscribe` capability and for a client to not have specified a {@link ChannelMode} flag that excludes {@link ChannelModes.SUBSCRIBE}.
   */
  subscribers: number;
}

/**
 * Enables messages to be published and historic messages to be retrieved for a channel.
 */
export declare interface HttpChannel {
  /**
   * The channel name.
   */
  name: string;

  /**
   * A {@link Presence} object.
   */
  presence: Presence;
  /**
   * {@link HttpAnnotations}
   */
  annotations: HttpAnnotations;
  /**
   * Retrieves a {@link PaginatedResult} object, containing an array of historical {@link InboundMessage} objects for the channel. If the channel is configured to persist messages, then messages can be retrieved from history for up to 72 hours in the past. If not, messages can only be retrieved from history for up to two minutes in the past.
   *
   * @param params - A set of parameters which are used to specify which messages should be retrieved.
   * @returns A promise which, upon success, will be fulfilled with a {@link PaginatedResult} object containing an array of {@link InboundMessage} objects. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  history(params?: HttpHistoryParams): Promise<PaginatedResult<InboundMessage>>;
  /**
   * Publishes an array of messages to the channel.
   *
   * @param messages - An array of {@link Message} objects.
   * @param options - Optional parameters, such as [`quickAck`](https://faqs.ably.com/why-are-some-rest-publishes-on-a-channel-slow-and-then-typically-faster-on-subsequent-publishes) sent as part of the query string.
   * @returns A promise which, upon success, will be fulfilled with a {@link PublishResult} object containing the serials of the published messages. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  publish(messages: Message[], options?: PublishOptions): Promise<PublishResult>;
  /**
   * Publishes a message to the channel.
   *
   * @param message - A {@link Message} object.
   * @param options - Optional parameters, such as [`quickAck`](https://faqs.ably.com/why-are-some-rest-publishes-on-a-channel-slow-and-then-typically-faster-on-subsequent-publishes) sent as part of the query string.
   * @returns A promise which, upon success, will be fulfilled with a {@link PublishResult} object containing the serial of the published message. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  publish(message: Message, options?: PublishOptions): Promise<PublishResult>;
  /**
   * Publishes a single message to the channel with the given event name and payload.
   *
   * @param name - The name of the message.
   * @param data - The payload of the message.
   * @param options - Optional parameters, such as [`quickAck`](https://faqs.ably.com/why-are-some-rest-publishes-on-a-channel-slow-and-then-typically-faster-on-subsequent-publishes) sent as part of the query string.
   * @returns A promise which, upon success, will be fulfilled with a {@link PublishResult} object containing the serial of the published message. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  publish(name: string, data: any, options?: PublishOptions): Promise<PublishResult>;
  /**
   * Retrieves a {@link ChannelDetails} object for the channel, which includes status and occupancy metrics.
   *
   * @returns A promise which, upon success, will be fulfilled a {@link ChannelDetails} object. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  status(): Promise<ChannelDetails>;
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
 * The realtime channel object exposed by the server realtime client. Identical to the shared realtime channel surface, with no device push surface.
 */
export interface RealtimeChannel extends RealtimeChannelBase {}

/**
 * Passes additional client-specific properties to {@link createHttpClient}.
 */
export interface HttpClientOptions extends CommonClientOptions, HttpOptions {}

/**
 * Passes additional client-specific properties to {@link createRealtimeClient}.
 */
export interface RealtimeClientOptions extends CommonClientOptions, HttpOptions, RealtimeOptions {}

/**
 * A client that offers a simple stateless API to interact directly with Ably's REST API.
 */
export interface HttpClient {
  /**
   * A {@link ServerAuth} object.
   */
  auth: ServerAuth;
  /**
   * A {@link Channels} object.
   */
  channels: Channels<HttpChannel>;
  /**
   * Makes a REST request to a provided path. This is provided as a convenience for developers who wish to use REST API functionality that is either not documented or is not yet included in the public API, without having to directly handle features such as authentication, paging, fallback hosts, MsgPack and JSON support.
   *
   * @param method - The request method to use, such as `GET`, `POST`.
   * @param path - The request path.
   * @param version - The version of the Ably REST API to use. See the [REST API reference](https://ably.com/docs/api/rest-api#versioning) for information on versioning.
   * @param params - The parameters to include in the URL query of the request. The parameters depend on the endpoint being queried. See the [REST API reference](https://ably.com/docs/api/rest-api) for the available parameters of each endpoint.
   * @param body - The JSON body of the request.
   * @param headers - Additional HTTP headers to include in the request.
   * @returns A promise which, upon success, will be fulfilled with an {@link HttpPaginatedResponse} response object returned by the HTTP request. This response object will contain an empty or JSON-encodable object. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
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
   * Queries the REST `/stats` API and retrieves your application's usage statistics. Returns a {@link PaginatedResult} object, containing an array of {@link Stats} objects. See the [Stats docs](https://ably.com/docs/general/statistics).
   *
   * @param params - A set of parameters which are used to specify which statistics should be retrieved. If you do not provide this argument, then this method will use the default parameters described in the {@link StatsParams} interface.
   * @returns A promise which, upon success, will be fulfilled with a {@link PaginatedResult} object containing an array of {@link Stats} objects. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  stats(params?: StatsParams): Promise<PaginatedResult<Stats>>;
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
   * A {@link ServerPush} object.
   */
  push: ServerPush;
}

/**
 * A client that extends the functionality of {@link HttpClient} and provides additional realtime-specific features for servers.
 */
export interface RealtimeClient {
  /**
   * Calls {@link Connection.connect | `connection.connect()`} and causes the connection to open, entering the connecting state. Explicitly calling `connect()` is unnecessary unless the {@link CommonClientOptions.autoConnect} property is disabled.
   */
  connect(): void;
  /**
   * Calls {@link Connection.close | `connection.close()`} and causes the connection to close, entering the closing state. Once closed, the library will not attempt to re-establish the connection without an explicit call to {@link Connection.connect | `connect()`}.
   */
  close(): void;
  /**
   * A {@link ServerAuth} object.
   */
  auth: ServerAuth;
  /**
   * A {@link RealtimeChannels} object.
   */
  channels: RealtimeChannels<RealtimeChannel>;
  /**
   * A {@link Connection} object.
   */
  connection: Connection;
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
   * Queries the REST `/stats` API and retrieves your application's usage statistics. Returns a {@link PaginatedResult} object, containing an array of {@link Stats} objects. See the [Stats docs](https://ably.com/docs/general/statistics).
   *
   * @param params - A set of parameters which are used to specify which statistics should be retrieved. If you do not provide this argument, then this method will use the default parameters described in the {@link StatsParams} interface.
   * @returns A promise which, upon success, will be fulfilled with a {@link PaginatedResult} object containing an array of {@link Stats} objects. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  stats(params?: StatsParams): Promise<PaginatedResult<Stats>>;
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
   * A {@link ServerPush} object.
   */
  push: ServerPush;
}

/**
 * Constructs a stateless server Pub/Sub client that interacts with Ably over HTTP.
 *
 * @param options - A {@link HttpClientOptions} object to configure the client.
 * @returns An {@link HttpClient} object.
 */
export declare function createHttpClient(options: HttpClientOptions): HttpClient;

/**
 * Constructs a server Pub/Sub client, which establishes a realtime connection to Ably.
 *
 * @param options - A {@link RealtimeClientOptions} object to configure the client.
 * @returns A {@link RealtimeClient} object.
 */
export declare function createRealtimeClient(options: RealtimeClientOptions): RealtimeClient;
