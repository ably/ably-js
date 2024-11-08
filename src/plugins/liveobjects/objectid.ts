import type BaseClient from 'common/lib/client/baseclient';

export type LiveObjectType = 'map' | 'counter';

/**
 * Represents a parsed object id.
 *
 * @internal
 */
export class ObjectId {
  private constructor(
    readonly type: LiveObjectType,
    readonly hash: string,
  ) {}

  /**
   * Create ObjectId instance from hashed object id string.
   */
  static fromString(client: BaseClient, objectId: string | null | undefined): ObjectId {
    if (client.Utils.isNil(objectId)) {
      throw new client.ErrorInfo('Invalid object id string', 50000, 500);
    }

    const [type, hash] = objectId.split(':');
    if (!type || !hash) {
      throw new client.ErrorInfo('Invalid object id string', 50000, 500);
    }

    if (!['map', 'counter'].includes(type)) {
      throw new client.ErrorInfo(`Invalid object type in object id: ${objectId}`, 50000, 500);
    }

    return new ObjectId(type as LiveObjectType, hash);
  }
}
