import type BaseClient from 'common/lib/client/baseclient';
import type RealtimeChannel from 'common/lib/client/realtimechannel';

export class LiveObjects {
  private _client: BaseClient;
  private _channel: RealtimeChannel;

  constructor(channel: RealtimeChannel) {
    this._channel = channel;
    this._client = channel.client;
  }
}
