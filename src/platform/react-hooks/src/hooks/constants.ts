import type * as Ably from 'ably';

export const INACTIVE_CONNECTION_STATES: Ably.ConnectionState[] = ['suspended', 'closing', 'closed', 'failed'];
export const INACTIVE_CHANNEL_STATES: Ably.ChannelState[] = ['failed', 'suspended', 'detaching'];
