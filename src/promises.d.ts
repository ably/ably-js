import Ably = require('./ably');

export declare class Realtime extends Ably.Realtime.Promise {}
export declare class Rest extends Ably.Rest.Promise {}

/* Typescript currently has no way of reexporting an existing namespace other than `export
 * = ...`, which wouldn't allow modifying the Rest & Realtime members. So need to
* export its members individually :/ */
export declare namespace Types {
	type ChannelState = Ably.Types.ChannelState;
	type ChannelEvent = Ably.Types.ChannelEvent;
	type ConnectionState = Ably.Types.ConnectionState;
	type ConnectionEvent = Ably.Types.ConnectionEvent;
	type PresenceAction = Ably.Types.PresenceAction;
	type StatsIntervalGranularity = Ably.Types.StatsIntervalGranularity;
	type HTTPMethods = Ably.Types.HTTPMethods;
	type Transport = Ably.Types.Transport;
	type ClientOptions = Ably.Types.ClientOptions;
	type AuthOptions = Ably.Types.AuthOptions;
	type CapabilityOp = Ably.Types.CapabilityOp
	type TokenParams = Ably.Types.TokenParams;
	type CipherParams = Ably.Types.CipherParams;
	type ErrorInfo = Ably.Types.ErrorInfo;
	type StatsMessageCount = Ably.Types.StatsMessageCount;
	type StatsMessageTypes = Ably.Types.StatsMessageTypes;
	type StatsRequestCount = Ably.Types.StatsRequestCount;
	type StatsResourceCount = Ably.Types.StatsResourceCount;
	type StatsConnectionTypes = Ably.Types.StatsConnectionTypes;
	type StatsMessageTraffic = Ably.Types.StatsMessageTraffic;
	type TokenDetails = Ably.Types.TokenDetails;
	type TokenRequest = Ably.Types.TokenRequest;
	type ChannelOptions = Ably.Types.ChannelOptions;
	type RestHistoryParams = Ably.Types.RestHistoryParams;
	type RestPresenceParams = Ably.Types.RestPresenceParams;
	type RealtimePresenceParams = Ably.Types.RealtimePresenceParams;
	type RealtimeHistoryParams = Ably.Types.RealtimeHistoryParams;
	type LogInfo = Ably.Types.LogInfo;
	type ChannelStateChange = Ably.Types.ChannelStateChange;
	type ConnectionStateChange = Ably.Types.ConnectionStateChange;
	type DeviceDetails = Ably.Types.DeviceDetails;
	type PushChannelSubscription = Ably.Types.PushChannelSubscription;
	type DevicePushState = "ACTIVE" | "FAILING" | "FAILED";
	type DevicePushDetails = Ably.Types.DevicePushDetails;
	type DeviceRegistrationParams = Ably.Types.DeviceRegistrationParams;
	type PushChannelSubscriptionParams = Ably.Types.PushChannelSubscriptionParams;
	type PushChannelsParams = Ably.Types.PushChannelsParams;
	type Crypto = Ably.Types.Crypto;
	type Message = Ably.Types.Message;
	type PresenceMessage = Ably.Types.PresenceMessage;
}
