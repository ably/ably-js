import type BaseClient from 'common/lib/client/baseclient';
import type Platform from 'common/platform';
import type { Bufferlike } from 'common/platform';

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
    readonly msTimestamp: number,
  ) {}

  static fromInitialValue(
    platform: typeof Platform,
    objectType: LiveObjectType,
    encodedInitialValue: Bufferlike,
    nonce: string,
    msTimestamp: number,
  ): ObjectId {
    const valueForHashBuffer = platform.BufferUtils.concat([
      encodedInitialValue,
      platform.BufferUtils.utf8Encode(':'),
      platform.BufferUtils.utf8Encode(nonce),
    ]);
    const hashBuffer = platform.BufferUtils.sha256(valueForHashBuffer);
    const hash = platform.BufferUtils.base64UrlEncode(hashBuffer);

    return new ObjectId(objectType, hash, msTimestamp);
  }

  /**
   * Create ObjectId instance from hashed object id string.
   */
  static fromString(client: BaseClient, objectId: string | null | undefined): ObjectId {
    if (client.Utils.isNil(objectId)) {
      throw new client.ErrorInfo('Invalid object id string', 92000, 500);
    }

    const [type, rest] = objectId.split(':');
    if (!type || !rest) {
      throw new client.ErrorInfo('Invalid object id string', 92000, 500);
    }

    if (!['map', 'counter'].includes(type)) {
      throw new client.ErrorInfo(`Invalid object type in object id: ${objectId}`, 92000, 500);
    }

    const [hash, msTimestamp] = rest.split('@');
    if (!hash || !msTimestamp) {
      throw new client.ErrorInfo('Invalid object id string', 92000, 500);
    }

    if (!Number.isInteger(Number.parseInt(msTimestamp))) {
      throw new client.ErrorInfo('Invalid object id string', 92000, 500);
    }

    return new ObjectId(type as LiveObjectType, hash, Number.parseInt(msTimestamp));
  }

  toString(): string {
    return `${this.type}:${this.hash}@${this.msTimestamp}`;
  }
}
