import type BaseClient from 'common/lib/client/baseclient';
import type RealtimeChannel from 'common/lib/client/realtimechannel';
import { LiveMap } from './livemap';
import { LiveObjectsPool, ROOT_OBJECT_ID } from './liveobjectspool';

export class LiveObjects {
  private _client: BaseClient;
  private _channel: RealtimeChannel;
  private _liveObjectsPool: LiveObjectsPool;

  constructor(channel: RealtimeChannel) {
    this._channel = channel;
    this._client = channel.client;
    this._liveObjectsPool = new LiveObjectsPool(this);
  }

  async getRoot(): Promise<LiveMap> {
    // TODO: wait for SYNC sequence to finish to return root
    return this._liveObjectsPool.get(ROOT_OBJECT_ID) as LiveMap;
  }

  /**
   * @internal
   */
  getPool(): LiveObjectsPool {
    return this._liveObjectsPool;
  }
}
