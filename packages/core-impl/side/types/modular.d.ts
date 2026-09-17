// The declarations TypeScript sees for `@ably/pubsub-core-impl/modular`: the core's declarations of
// the modular variant, which the implementation's modular entry point implements, plus the two
// client classes that entry point also exports.
//
// The classes are declared here rather than in the core because they are not public API. A
// modular client is built with `createClient` from `@ably/pubsub-device/modular`, which declares
// the device side and is typed as `PubSubClient`. Constructing a class directly would declare no
// side, so neither class is exported from a published package.
import type {
  ClientOptions,
  CorePlugins,
  PubSubHttpClient,
  PubSubRealtimeClient,
  Auth,
  Channels,
  Channel,
  RealtimeChannel,
  Connection,
  HttpPaginatedResponse,
  StatsParams,
  PaginatedResult,
  Stats,
  BatchPublishSpec,
  BatchResult,
  BatchPublishSuccessResult,
  BatchPublishFailureResult,
  BatchPresenceSuccessResult,
  BatchPresenceFailureResult,
  Push,
  LocalDevice,
} from '@ably/pubsub-core/api';
import type { ModularPlugins } from '@ably/pubsub-core/modular';

export * from '@ably/pubsub-core/modular';

/**
 * The modular stateless HTTP client. It needs at least one HTTP request implementation in
 * `ClientOptions.plugins`, and always includes the `Http` plugin implicitly.
 */
export declare class BaseHttp implements PubSubHttpClient {
  constructor(options: ClientOptions<CorePlugins & ModularPlugins>);

  auth: Auth;
  channels: Channels<Channel>;
  request<T = any>(
    method: string,
    path: string,
    version: number,
    params?: any,
    body?: any[] | any,
    headers?: any,
  ): Promise<HttpPaginatedResponse<T>>;
  stats(params?: StatsParams): Promise<PaginatedResult<Stats>>;
  time(): Promise<number>;
  batchPublish(spec: BatchPublishSpec): Promise<BatchResult<BatchPublishSuccessResult | BatchPublishFailureResult>>;
  batchPublish(
    specs: BatchPublishSpec[],
  ): Promise<BatchResult<BatchPublishSuccessResult | BatchPublishFailureResult>[]>;
  batchPresence(channels: string[]): Promise<BatchResult<BatchPresenceSuccessResult | BatchPresenceFailureResult>[]>;
  push: Push;
  getDevice(): Promise<LocalDevice>;
}

/**
 * The modular realtime client. It needs at least one HTTP request implementation and at least one
 * realtime transport in `ClientOptions.plugins`.
 */
export declare class BaseRealtime implements PubSubRealtimeClient {
  constructor(options: ClientOptions<CorePlugins & ModularPlugins>);

  clientId: string;
  close(): void;
  connect(): void;
  auth: Auth;
  channels: Channels<RealtimeChannel>;
  connection: Connection;
  request<T = any>(
    method: string,
    path: string,
    version: number,
    params?: any,
    body?: any[] | any,
    headers?: any,
  ): Promise<HttpPaginatedResponse<T>>;
  stats(params?: StatsParams): Promise<PaginatedResult<Stats>>;
  time(): Promise<number>;
  batchPublish(spec: BatchPublishSpec): Promise<BatchResult<BatchPublishSuccessResult | BatchPublishFailureResult>>;
  batchPublish(
    specs: BatchPublishSpec[],
  ): Promise<BatchResult<BatchPublishSuccessResult | BatchPublishFailureResult>[]>;
  batchPresence(channels: string[]): Promise<BatchResult<BatchPresenceSuccessResult | BatchPresenceFailureResult>[]>;
  push: Push;
  getDevice(): Promise<LocalDevice>;
}
