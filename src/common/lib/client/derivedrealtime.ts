import * as API from '../../../../ably';
import BaseRealtime from './baserealtime';
import Auth from './auth';
import Connection from './connection';
import RealtimeChannel, { RealtimeHistoryParams } from './realtimechannel';
import ErrorInfo from '../types/errorinfo';
import ChannelStateChange from './channelstatechange';
import { HttpPaginatedResponse } from './paginatedresource';
import Message from '../types/message';
import { PaginatedResult } from './paginatedresource';

export class DerivedRealtimeClient {
  constructor(
    private readonly underlying: BaseRealtime,
    private readonly options: API.DerivedClientOptions,
  ) {}

  // `channels` is an example of a nested object whose behaviour we wish to modify (i.e. to make it inject the derived client’s `agent` when certain methods are called, and also to inject the `agent` into methods on the channels that this object vends, such as `history()`), so we need to proxy calls to the underlying channels object through this DerivedChannels object.
  readonly channels = new DerivedChannels(this.underlying.channels, this.options);

  close(): void {
    this.underlying.close();
  }

  connect(): void {
    this.underlying.connect();
  }

  // In the case where we have nested objects that whose behaviour doesn’t need to be modified, like `auth` or `connection`, we don’t need to bother proxying, we can just return the underlying object.

  get auth(): Auth {
    return this.underlying.auth;
  }

  get connection(): Connection {
    return this.underlying.connection;
  }

  // `request()` is an example of a method where we want to inject the derived client’s `agent`, and hence we proxy the method call.

  request(
    method: string,
    path: string,
    version: number,
    params?: any,
    body?: any[] | any,
    headers?: any,
  ): Promise<HttpPaginatedResponse<unknown>> {
    return this.underlying._request(method, path, version, params, body, headers, [this.options.agent]);
  }

  // We’d then do something similar to `request()` for `stats()`, `time()`, `batchPublish()`.

  // If we were to decide that push admin REST API calls should receive agent information, then to implement the `push` property we’d create a DerivedPush class, similar to what we do for channels.

  createDerivedClient(options: API.DerivedClientOptions): DerivedRealtimeClient {
    throw new Error('Cannot create a derived client from a derived client.');
  }
}

export class DerivedChannels {
  constructor(
    private readonly underlying: BaseRealtime,
    private readonly options: API.DerivedClientOptions,
  ) {}

  get(name: string, channelOptions?: API.ChannelOptions): DerivedRealtimeChannel {
    // Here, we add the derived channel’s options’ `agent` to the channel params.
    const params = { ...channelOptions?.params, agent: this.options.agent };
    const channelOptionsToUse: API.ChannelOptions = { ...channelOptions, params };

    // TODO Not yet clear whether we’d want to create a new derived channel each time, or have a unique one per channel name the same way as we do for the underlying clients; the former would be simpler and maybe we could get away with it
    const underlyingChannel = this.underlying.channels.get(name, channelOptionsToUse);
    return new DerivedRealtimeChannel(underlyingChannel, this.options);
  }

  release(name: string): void {
    this.underlying.channels.release(name);
  }
}

export class DerivedRealtimeChannel {
  constructor(
    private readonly underlying: RealtimeChannel,
    private readonly options: API.DerivedClientOptions,
  ) {}

  // Simple properties can just be proxied through to the underlying channel

  get name(): string {
    return this.underlying.name;
  }

  get errorReason(): ErrorInfo | string | null {
    return this.underlying.errorReason;
  }

  get state(): API.ChannelState {
    return this.underlying.state;
  }

  get params(): Record<string, any> | undefined {
    return this.underlying.params;
  }

  get modes(): string[] | undefined {
    return this.underlying.modes;
  }

  // subscriptions are shared with the underlying channel and hence e.g. `unsubscribe()` can be proxied through

  unsubscribe(...args: unknown[] /* [event], listener */): void {
    this.underlying.unsubscribe(...args);
  }

  // For the `presence` property we’d create a DerivedPresence class, so that we can inject the agent into the presence history REST call

  attach(): Promise<ChannelStateChange | null> {
    return this.underlying.attach();
  }

  detach(): Promise<void> {
    return this.underlying.detach();
  }

  // `history()` is an example of another method where we want to inject the derived channel’s agent; here’s how we do it (it’s the same as what we do for the `request()` method above)

  async history(params: RealtimeHistoryParams | null): Promise<PaginatedResult<Message>> {
    return this.underlying.history(params, [this.options.agent]);
  }

  // ...and so on
}
