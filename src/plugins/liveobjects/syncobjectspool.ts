import type BaseClient from 'common/lib/client/baseclient';
import type RealtimeChannel from 'common/lib/client/realtimechannel';
import { ObjectMessage } from './objectmessage';
import { RealtimeObject } from './realtimeobject';

/**
 * @internal
 * @spec RTO5b
 */
export class SyncObjectsPool {
  private _client: BaseClient;
  private _channel: RealtimeChannel;
  /** Used to accumulate object state during a sync sequence, keyed by object ID */
  private _pool: Map<string, ObjectMessage>;

  constructor(private _realtimeObject: RealtimeObject) {
    this._client = this._realtimeObject.getClient();
    this._channel = this._realtimeObject.getChannel();
    this._pool = new Map<string, ObjectMessage>();
  }

  entries() {
    return this._pool.entries();
  }

  size(): number {
    return this._pool.size;
  }

  isEmpty(): boolean {
    return this._pool.size === 0;
  }

  clear(): void {
    this._pool.clear();
  }

  applyObjectSyncMessages(objectMessages: ObjectMessage[]): void {
    for (const objectMessage of objectMessages) {
      if (!objectMessage.object) {
        this._client.Logger.logAction(
          this._client.logger,
          this._client.Logger.LOG_MAJOR,
          'SyncObjectsPool.applyObjectSyncMessages()',
          `received OBJECT_SYNC message without 'object' field, skipping message; message id: ${objectMessage.id}, channel: ${this._channel.name}`,
        );
        continue;
      }

      const objectState = objectMessage.object;
      const objectId = objectState.objectId;
      const existingEntry = this._pool.get(objectId);

      if (!existingEntry) {
        // No entry with this objectId exists yet, store it
        this._pool.set(objectId, objectMessage);
        continue;
      }

      if (objectState.counter) {
        // Counter objects have a bounded size and should never be split
        // across multiple sync messages. Skip the unexpected partial state.
        this._client.Logger.logAction(
          this._client.logger,
          this._client.Logger.LOG_ERROR,
          'SyncObjectsPool.applyObjectSyncMessages()',
          `received partial OBJECT_SYNC state for a counter object, skipping message; object id: ${objectId}, message id: ${objectMessage.id}, channel: ${this._channel.name}`,
        );
        continue;
      }

      if (objectState.map) {
        this._mergeMapSyncState(existingEntry, objectMessage);
        continue;
      }

      this._client.Logger.logAction(
        this._client.logger,
        this._client.Logger.LOG_MAJOR,
        'SyncObjectsPool.applyObjectSyncMessages()',
        `received OBJECT_SYNC message with unsupported object type, expected 'counter' or 'map' to be present, skipping message; message id: ${objectMessage.id}, channel: ${this._channel.name}`,
      );
    }
  }

  /**
   * Merges map entries from a partial sync message into an existing entry in the pool.
   */
  private _mergeMapSyncState(existingEntry: ObjectMessage, newObjectMessage: ObjectMessage): void {
    const existingObjectState = existingEntry.object!;
    const newObjectState = newObjectMessage.object!;

    if (newObjectState.tombstone) {
      // A tombstone flag on any partial message takes precedence over previously accumulated entries
      this._pool.set(existingObjectState.objectId, newObjectMessage);
      return;
    }

    // Other fields on the ObjectState envelope (such as siteTimeserials) and the map envelope
    // (such as semantics) are identical across all partial messages for the same object,
    // so only the entries need to be merged.
    if (!existingObjectState.map!.entries) {
      existingObjectState.map!.entries = {};
    }

    if (newObjectState.map?.entries) {
      // During partial sync, no two messages contain the same map key,
      // so entries can be merged directly without conflict checking.
      Object.assign(existingObjectState.map!.entries, newObjectState.map.entries);
    }
  }
}
