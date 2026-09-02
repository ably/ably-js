// Admin-only type definitions for @ably/pubsub-server: token revocation, stats,
// and push admin (device registrations, channel subscriptions, Live Activities).
// Types-only spike for PDR-091.

import type {
  DeviceDetails,
  DevicePushState,
  ErrorInfo,
  PaginatedResult,
  PushChannelSubscription,
} from '@ably/pubsub-common';

/**
 * The `TokenRevocationOptions` interface describes the additional options accepted by {@link ServerAuth.revokeTokens}.
 */
export interface TokenRevocationOptions {
  /**
   * A Unix timestamp in milliseconds where only tokens issued before this time are revoked. The default is the current time. Requests with an `issuedBefore` in the future, or more than an hour in the past, will be rejected.
   */
  issuedBefore?: number;
  /**
   * If true, permits a token renewal cycle to take place without needing established connections to be dropped, by postponing enforcement to 30 seconds in the future, and sending any existing connections a hint to obtain (and upgrade the connection to use) a new token. The default is `false`, meaning that the effect is near-immediate.
   */
  allowReauthMargin?: boolean;
}

/**
 * Describes which tokens should be affected by a token revocation request.
 */
export interface TokenRevocationTargetSpecifier {
  /**
   * The type of token revocation target specifier. Valid values include `clientId`, `revocationKey` and `channel`.
   */
  type: string;
  /**
   * The value of the token revocation target specifier.
   */
  value: string;
}

/**
 * Contains information about the result of a successful token revocation request for a single target specifier.
 */
export interface TokenRevocationSuccessResult {
  /**
   * The target specifier.
   */
  target: string;
  /**
   * The time at which the token revocation will take effect, as a Unix timestamp in milliseconds.
   */
  appliesAt: number;
  /**
   * A Unix timestamp in milliseconds. Only tokens issued earlier than this time will be revoked.
   */
  issuedBefore: number;
}

/**
 * Contains information about the result of an unsuccessful token revocation request for a single target specifier.
 */
export interface TokenRevocationFailureResult {
  /**
   * The target specifier.
   */
  target: string;
  /**
   * Describes the reason for which token revocation failed for the given `target` as an {@link ErrorInfo} object.
   */
  error: ErrorInfo;
}

/**
 * The `StatsIntervalGranularities` namespace describes the possible values of the {@link StatsIntervalGranularity} type.
 */
declare namespace StatsIntervalGranularities {
  /**
   * Interval unit over which statistics are gathered as minutes.
   */
  type MINUTE = 'minute';
  /**
   * Interval unit over which statistics are gathered as hours.
   */
  type HOUR = 'hour';
  /**
   * Interval unit over which statistics are gathered as days.
   */
  type DAY = 'day';
  /**
   * Interval unit over which statistics are gathered as months.
   */
  type MONTH = 'month';
}
/**
 * Describes the interval unit over which statistics are gathered.
 */
export type StatsIntervalGranularity =
  | StatsIntervalGranularities.MINUTE
  | StatsIntervalGranularities.HOUR
  | StatsIntervalGranularities.DAY
  | StatsIntervalGranularities.MONTH;

/**
 * The `StatsParams` interface describes the parameters accepted by the following methods:
 *
 * - {@link HttpClient.stats}
 * - {@link RealtimeClient.stats}
 */
export interface StatsParams {
  /**
   * The time from which stats are retrieved, specified as milliseconds since the Unix epoch.
   *
   * @defaultValue The Unix epoch.
   */
  start?: number;
  /**
   * The time until stats are retrieved, specified as milliseconds since the Unix epoch.
   *
   * @defaultValue The current time.
   */
  end?: number;
  /**
   * The order for which stats are returned in. Valid values are `'backwards'` which orders stats from most recent to oldest, or `'forwards'` which orders stats from oldest to most recent. The default is `'backwards'`.
   *
   * @defaultValue `'backwards'`
   */
  direction?: 'backwards' | 'forwards';
  /**
   * An upper limit on the number of stats returned. The default is 100, and the maximum is 1000.
   *
   * @defaultValue 100
   */
  limit?: number;
  /**
   * Based on the unit selected, the given `start` or `end` times are rounded down to the start of the relevant interval depending on the unit granularity of the query.
   *
   * @defaultValue `StatsIntervalGranularity.MINUTE`
   */
  unit?: StatsIntervalGranularity;
}

/**
 * Contains application statistics for a specified time interval and time period.
 */
export declare interface Stats {
  /**
   * The UTC time at which the time period covered begins. If `unit` is set to `minute` this will be in the format `YYYY-mm-dd:HH:MM`, if `hour` it will be `YYYY-mm-dd:HH`, if `day` it will be `YYYY-mm-dd:00` and if `month` it will be `YYYY-mm-01:00`.
   */
  intervalId: string;
  /**
   * For entries that are still in progress, such as the current month: the last sub-interval included in this entry (in format yyyy-mm-dd:hh:mm:ss), else undefined.
   */
  inProgress?: string;
  /**
   * The statistics for this time interval and time period. See the JSON schema which the {@link Stats.schema | `schema`} property points to for more information.
   */
  entries: Partial<Record<string, number>>;
  /**
   * The URL of a [JSON Schema](https://json-schema.org/) which describes the structure of this `Stats` object.
   */
  schema: string;
  /**
   * The ID of the Ably application the statistics are for.
   */
  appId: string;
}

/**
 * Provides access to push admin operations: managing device registrations and push channel subscriptions, and publishing push notifications to devices. Device push activation lives in the device SDK; the server SDK exposes only the admin surface.
 */
export interface ServerPush {
  /**
   * A {@link PushAdmin} object.
   */
  admin: PushAdmin;
}

/**
 * Enables the management of device registrations and push notification subscriptions. Also enables the publishing of push notifications to devices.
 */
export declare interface PushAdmin {
  /**
   * A {@link PushDeviceRegistrations} object.
   */
  deviceRegistrations: PushDeviceRegistrations;
  /**
   * A {@link PushChannelSubscriptions} object.
   */
  channelSubscriptions: PushChannelSubscriptions;
  /**
   * Sends a push notification directly to a device, or a group of devices sharing the same `clientId`.
   *
   * @param recipient - A JSON object containing the recipient details using `clientId`, `deviceId` or the underlying notifications service.
   * @param payload - A JSON object containing the push notification payload.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  publish(recipient: any, payload: any): Promise<void>;
  /**
   * Creates an APNs broadcast channel for use with an iOS Live Activity. Call once before starting the Live Activity and persist the returned ids for the session.
   *
   * @experimental This is a preview feature and may change in a future non-major release.
   *
   * @param options - Options for the broadcast, including the `messageStoragePolicy`.
   * @returns A promise resolving to the broadcast `{ id, apnsChannelId }`.
   */
  createApnsBroadcast(options: PushApnsBroadcastOptions): Promise<PushApnsBroadcast>;
  /**
   * Controls the lifecycle of iOS Live Activities over an APNs broadcast channel created with {@link PushAdmin.createApnsBroadcast}.
   *
   * @experimental This is a preview feature and may change in a future non-major release.
   */
  liveActivity: PushLiveActivity;
}

/**
 * Enables the management of push notification registrations with Ably.
 */
export declare interface PushDeviceRegistrations {
  /**
   * Registers or updates a {@link DeviceDetails} object with Ably. Returns the new, or updated {@link DeviceDetails} object.
   *
   * @param deviceDetails - The {@link DeviceDetails} object to create or update.
   * @returns A promise which, upon success, will be fulfilled with a {@link DeviceDetails} object. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  save(deviceDetails: DeviceDetails): Promise<DeviceDetails>;
  /**
   * Retrieves the {@link DeviceDetails} of a device registered to receive push notifications using its `deviceId`.
   *
   * @param deviceId - The unique ID of the device.
   * @returns A promise which, upon success, will be fulfilled with a {@link DeviceDetails} object. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  get(deviceId: string): Promise<DeviceDetails>;
  /**
   * Retrieves the {@link DeviceDetails} of a device registered to receive push notifications using the `id` property of a {@link DeviceDetails} object.
   *
   * @param deviceDetails - The {@link DeviceDetails} object containing the `id` property of the device.
   * @returns A promise which, upon success, will be fulfilled with a {@link DeviceDetails} object. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  get(deviceDetails: DeviceDetails): Promise<DeviceDetails>;
  /**
   * Retrieves all devices matching the filter `params` provided. Returns a {@link PaginatedResult} object, containing an array of {@link DeviceDetails} objects.
   *
   * @param params - An object containing key-value pairs to filter devices by.
   * @returns A promise which, upon success, will be fulfilled with a {@link PaginatedResult} object containing an array of {@link DeviceDetails} objects. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  list(params: DeviceRegistrationParams): Promise<PaginatedResult<DeviceDetails>>;
  /**
   * Removes a device registered to receive push notifications from Ably using its `deviceId`.
   *
   * @param deviceId - The unique ID of the device.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  remove(deviceId: string): Promise<void>;
  /**
   * Removes a device registered to receive push notifications from Ably using the `id` property of a {@link DeviceDetails} object.
   *
   * @param deviceDetails - The {@link DeviceDetails} object containing the `id` property of the device.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  remove(deviceDetails: DeviceDetails): Promise<void>;
  /**
   * Removes all devices registered to receive push notifications from Ably matching the filter `params` provided.
   *
   * @param params - An object containing key-value pairs to filter devices by. This object’s {@link DeviceRegistrationParams.limit} property will be ignored.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  removeWhere(params: DeviceRegistrationParams): Promise<void>;
}

/**
 * Enables device push channel subscriptions.
 */
export declare interface PushChannelSubscriptions {
  /**
   * Subscribes a device, or a group of devices sharing the same `clientId` to push notifications on a channel. Returns a {@link PushChannelSubscription} object.
   *
   * @param subscription - A {@link PushChannelSubscription} object.
   * @returns A promise which, upon success, will be fulfilled with a {@link PushChannelSubscription} object describing the new or updated subscriptions. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  save(subscription: PushChannelSubscription): Promise<PushChannelSubscription>;
  /**
   * Retrieves all push channel subscriptions matching the filter `params` provided. Returns a {@link PaginatedResult} object, containing an array of {@link PushChannelSubscription} objects.
   *
   * @param params - An object containing key-value pairs to filter subscriptions by.
   * @returns A promise which, upon success, will be fulfilled with a {@link PaginatedResult} object containing an array of {@link PushChannelSubscription} objects. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  list(params: PushChannelSubscriptionParams): Promise<PaginatedResult<PushChannelSubscription>>;
  /**
   * Retrieves all channels with at least one device subscribed to push notifications. Returns a {@link PaginatedResult} object, containing an array of channel names.
   *
   * @param params - An object containing key-value pairs to filter channels by.
   * @returns A promise which, upon success, will be fulfilled with a {@link PaginatedResult} object containing an array of channel names. Upon failure, the promise will be rejected with an {@link ErrorInfo} object which explains the error.
   */
  listChannels(params: PushChannelsParams): Promise<PaginatedResult<string>>;
  /**
   * Unsubscribes a device, or a group of devices sharing the same `clientId` from receiving push notifications on a channel.
   *
   * @param subscription - A {@link PushChannelSubscription} object.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  remove(subscription: PushChannelSubscription): Promise<void>;
  /**
   * Unsubscribes all devices from receiving push notifications on a channel that match the filter `params` provided.
   *
   * @param params - An object containing key-value pairs to filter subscriptions by. Can contain `channel`, and optionally either `clientId` or `deviceId`.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  removeWhere(params: PushChannelSubscriptionParams): Promise<void>;
}

/**
 * The `DeviceRegistrationParams` interface describes the parameters accepted by the following methods:
 *
 * - {@link PushDeviceRegistrations.list}
 * - {@link PushDeviceRegistrations.removeWhere}
 */
export interface DeviceRegistrationParams {
  /**
   * Filter to restrict to devices associated with a client ID.
   */
  clientId?: string;
  /**
   * Filter to restrict by the unique ID of the device.
   */
  deviceId?: string;
  /**
   * A limit on the number of devices returned, up to 1,000.
   */
  limit?: number;
  /**
   * Filter by the state of the device.
   */
  state?: DevicePushState;
}

/**
 * The `PushChannelSubscriptionParams` interface describes the parameters accepted by the following methods:
 *
 * - {@link PushChannelSubscriptions.list}
 * - {@link PushChannelSubscriptions.removeWhere}
 */
export interface PushChannelSubscriptionParams {
  /**
   * Filter to restrict to subscriptions associated with the given channel.
   */
  channel?: string;
  /**
   * Filter to restrict to devices associated with the given client identifier. Cannot be used with a deviceId param.
   */
  clientId?: string;
  /**
   * Filter to restrict to devices associated with that device identifier. Cannot be used with a clientId param.
   */
  deviceId?: string;
  /**
   * A limit on the number of devices returned, up to 1,000.
   */
  limit?: number;
}

/**
 * The `PushChannelsParams` interface describes the parameters accepted by {@link PushChannelSubscriptions.listChannels}.
 */
export interface PushChannelsParams {
  /**
   * A limit on the number of channels returned, up to 1,000.
   */
  limit?: number;
}

/**
 * Controls the lifecycle of an iOS Live Activity over an APNs broadcast channel.
 *
 * @experimental This is a preview feature and may change in a future non-major release.
 */
export declare interface PushLiveActivity {
  /**
   * Sends a push-to-start notification to all devices subscribed to the given Ably channels. Each targeted device starts a new Live Activity using its registered push-to-start token.
   *
   * @experimental This is a preview feature and may change in a future non-major release.
   *
   * @param params - The recipient channels, the broadcast `id`, and a valid APNs Live Activity start payload.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  start(params: PushLiveActivityStartParams): Promise<void>;
  /**
   * Sends a `content-state` update to all devices with an active Live Activity on the broadcast channel. A single push is sent to the channel; APNs handles fan-out to all subscribed devices.
   *
   * @experimental This is a preview feature and may change in a future non-major release.
   *
   * @param params - The broadcast `id` and a valid APNs Live Activity update payload.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  update(params: PushLiveActivityUpdateParams): Promise<void>;
  /**
   * Ends the Live Activity on all subscribed devices and cleans up the APNs channel. After this call, the broadcast `id` is no longer valid.
   *
   * @experimental This is a preview feature and may change in a future non-major release.
   *
   * @param params - The broadcast `id` and a valid APNs Live Activity end payload.
   * @returns A promise which resolves upon success of the operation and rejects with an {@link ErrorInfo} object upon its failure.
   */
  end(params: PushLiveActivityEndParams): Promise<void>;
}

/**
 * Parameters for {@link PushLiveActivity.start}.
 */
export declare interface PushLiveActivityStartParams {
  /**
   * The targeted recipients of the push-to-start notification.
   */
  recipient:
    | {
        /**
         * One or more Ably channel names. Devices subscribed to any of these channels will receive the push-to-start notification. Provide either `channels` or `deviceId`.
         */
        channels: string[];
      }
    | {
        /**
         * Restrict the push-to-start notification to a single device. Provide either `channels` or `deviceId`.
         */
        deviceId: string;
      };
  /**
   * The `id` returned from {@link PushAdmin.createApnsBroadcast}.
   */
  apnsBroadcast: string;
  /**
   * A valid APNs Live Activity start payload. The payload is passed through to APNs as-is.
   */
  apns: any;
  /**
   * Optional APNs delivery headers, such as `apns-priority` and `apns-expiration`. When supplied, these are included in the request body under a `headers` key.
   */
  headers?: Record<string, string>;
}

/**
 * Parameters for {@link PushLiveActivity.update}.
 */
export declare interface PushLiveActivityUpdateParams {
  /**
   * The `id` returned from {@link PushAdmin.createApnsBroadcast}.
   */
  apnsBroadcast: string;
  /**
   * A valid APNs Live Activity update payload. The payload is passed through to APNs as-is.
   */
  apns: any;
  /**
   * Optional APNs delivery headers, such as `apns-priority` and `apns-expiration`. When supplied, these are included in the request body under a `headers` key.
   */
  headers?: Record<string, string>;
}

/**
 * Parameters for {@link PushLiveActivity.end}.
 */
export declare interface PushLiveActivityEndParams {
  /**
   * The `id` returned from {@link PushAdmin.createApnsBroadcast}.
   */
  apnsBroadcast: string;
  /**
   * A valid APNs Live Activity end payload. The payload is passed through to APNs as-is.
   */
  apns: any;
  /**
   * Optional APNs delivery headers, such as `apns-priority` and `apns-expiration`. When supplied, these are included in the request body under a `headers` key.
   */
  headers?: Record<string, string>;
}

/**
 * Options for creating an APNs broadcast channel via {@link PushAdmin.createApnsBroadcast}.
 */
export declare interface PushApnsBroadcastOptions {
  /**
   * Set to `1` to cache the last update payload so late-joining devices receive the current content state immediately on subscription. Set to `0` to disable caching.
   *
   * @see https://developer.apple.com/documentation/usernotifications/sending-channel-management-requests-to-apns
   */
  messageStoragePolicy: 0 | 1;
}

/**
 * The result of creating an APNs broadcast channel via {@link PushAdmin.createApnsBroadcast}.
 */
export declare interface PushApnsBroadcast {
  /**
   * The opaque Ably broadcast id.
   */
  id: string;
  /**
   * The Apple-assigned channel id.
   */
  apnsChannelId: string;
}
