import type * as Ably from '@ably/pubsub-core';
import { DefaultPubSubHttpClient, DefaultPubSubRealtimeClient } from '../../shared/core-clients';
import { optionsWithSideAgent, serverAgentIdentifier } from '../../shared/side';

// Re-export the core's public value surface, so consumers of this package never need to
// depend on `@ably/pubsub-core` directly. See ../../shared/core-exports.ts for why the list is
// enumerated rather than star-re-exported.
export { ErrorInfo, Crypto, Message, PresenceMessage, Annotation } from '../../shared/core-exports';

// The contract of both factories, including how the MAU exemption is granted and why token
// auth needs more than the agent entry, is documented on the declarations in ../index.d.ts,
// which is what consumers see. Following the core, which keeps its documentation in its
// declaration files rather than duplicating it here.

export function createHttpClient(options: Ably.ClientOptions | string): Ably.PubSubHttpClient {
  return new DefaultPubSubHttpClient(optionsWithSideAgent(options, serverAgentIdentifier));
}

export function createRealtimeClient(options: Ably.ClientOptions | string): Ably.PubSubRealtimeClient {
  return new DefaultPubSubRealtimeClient(optionsWithSideAgent(options, serverAgentIdentifier));
}
