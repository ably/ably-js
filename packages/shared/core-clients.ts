// The core's client classes, for the per-side factories to construct.
//
// The core's platform entry points export both classes at runtime, but its public typings declare
// neither: a client built by constructing one directly declares no side, so clients reach
// consumers only through the factories, typed as the `PubSubRealtimeClient` and
// `PubSubHttpClient` interfaces. The cast that gives the factories typed access is confined to
// this module.

import * as Core from '@ably/pubsub-core';
import type { ClientOptions, PubSubHttpClient, PubSubRealtimeClient } from '@ably/pubsub-core';

interface CoreClientClasses {
  DefaultPubSubHttpClient: new (options: ClientOptions | string) => PubSubHttpClient;
  DefaultPubSubRealtimeClient: new (options: ClientOptions | string) => PubSubRealtimeClient;
}

const clientClasses = Core as unknown as CoreClientClasses;

export const DefaultPubSubHttpClient = clientClasses.DefaultPubSubHttpClient;
export const DefaultPubSubRealtimeClient = clientClasses.DefaultPubSubRealtimeClient;
