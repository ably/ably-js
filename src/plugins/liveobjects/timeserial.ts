import type BaseClient from 'common/lib/client/baseclient';

/**
 * Represents a parsed timeserial.
 */
export interface Timeserial {
  /**
   * The series ID of the timeserial.
   */
  readonly seriesId: string;

  /**
   * The site code of the timeserial.
   */
  readonly siteCode: string;

  /**
   * The timestamp of the timeserial.
   */
  readonly timestamp: number;

  /**
   * The counter of the timeserial.
   */
  readonly counter: number;

  /**
   * The index of the timeserial.
   */
  readonly index?: number;

  toString(): string;

  before(timeserial: Timeserial | string): boolean;

  after(timeserial: Timeserial | string): boolean;

  equal(timeserial: Timeserial | string): boolean;
}

/**
 * Default implementation of the Timeserial interface. Used internally to parse and compare timeserials.
 *
 * @internal
 */
export class DefaultTimeserial implements Timeserial {
  public readonly seriesId: string;
  public readonly siteCode: string;
  public readonly timestamp: number;
  public readonly counter: number;
  public readonly index?: number;

  private constructor(
    private _client: BaseClient,
    seriesId: string,
    timestamp: number,
    counter: number,
    index?: number,
  ) {
    this.seriesId = seriesId;
    this.timestamp = timestamp;
    this.counter = counter;
    this.index = index;
    // TODO: will be removed once https://ably.atlassian.net/browse/DTP-1078 is implemented on the realtime
    this.siteCode = this.seriesId.slice(0, 3); // site code is stored in the first 3 letters of the epoch, which is stored in the series id field
  }

  /**
   * Returns the string representation of the timeserial object.
   * @returns The timeserial string.
   */
  toString(): string {
    return `${this.seriesId}@${this.timestamp.toString()}-${this.counter.toString()}${this.index ? `:${this.index.toString()}` : ''}`;
  }

  /**
   * Calculate the timeserial object from a timeserial string.
   *
   * @param timeserial The timeserial string to parse.
   * @returns The parsed timeserial object.
   * @throws {@link BaseClient.ErrorInfo | ErrorInfo} if timeserial is invalid.
   */
  static calculateTimeserial(client: BaseClient, timeserial: string | null | undefined): Timeserial {
    if (client.Utils.isNil(timeserial)) {
      throw new client.ErrorInfo(`Invalid timeserial: ${timeserial}`, 50000, 500);
    }

    const [seriesId, rest] = timeserial.split('@');
    if (!rest) {
      throw new client.ErrorInfo(`Invalid timeserial: ${timeserial}`, 50000, 500);
    }

    const [timestamp, counterAndIndex] = rest.split('-');
    if (!timestamp || !counterAndIndex) {
      throw new client.ErrorInfo(`Invalid timeserial: ${timeserial}`, 50000, 500);
    }

    const [counter, index] = counterAndIndex.split(':');
    if (!counter) {
      throw new client.ErrorInfo(`Invalid timeserial: ${timeserial}`, 50000, 500);
    }

    return new DefaultTimeserial(
      client,
      seriesId,
      Number(timestamp),
      Number(counter),
      index ? Number(index) : undefined,
    );
  }

  /**
   * Returns a zero-value Timeserial `@0-0` - "earliest possible" timeserial.
   *
   * @returns The timeserial object.
   */
  static zeroValueTimeserial(client: BaseClient): Timeserial {
    return new DefaultTimeserial(client, '', 0, 0); // @0-0
  }

  /**
   * Compares this timeserial to the supplied timeserial, returning a number indicating their relative order.
   * @param timeserialToCompare The timeserial to compare against. Can be a string or a Timeserial object.
   * @returns 0 if the timeserials are equal, <0 if the first timeserial is less than the second, >0 if the first timeserial is greater than the second.
   * @throws {@link BaseClient.ErrorInfo | ErrorInfo} if comparison timeserial is invalid.
   */
  private _timeserialCompare(timeserialToCompare: string | Timeserial): number {
    const secondTimeserial =
      typeof timeserialToCompare === 'string'
        ? DefaultTimeserial.calculateTimeserial(this._client, timeserialToCompare)
        : timeserialToCompare;

    // Compare the timestamp
    const timestampDiff = this.timestamp - secondTimeserial.timestamp;
    if (timestampDiff) {
      return timestampDiff;
    }

    // Compare the counter
    const counterDiff = this.counter - secondTimeserial.counter;
    if (counterDiff) {
      return counterDiff;
    }

    // Compare the seriesId lexicographically, but only if both seriesId exist
    const seriesComparison =
      this.seriesId &&
      secondTimeserial.seriesId &&
      this.seriesId !== secondTimeserial.seriesId &&
      (this.seriesId > secondTimeserial.seriesId ? 1 : -1);
    if (seriesComparison) {
      return seriesComparison;
    }

    // Compare the index, if present
    return this.index !== undefined && secondTimeserial.index !== undefined ? this.index - secondTimeserial.index : 0;
  }

  /**
   * Determines if this timeserial occurs logically before the given timeserial.
   *
   * @param timeserial The timeserial to compare against. Can be a string or a Timeserial object.
   * @returns true if this timeserial precedes the given timeserial, in global order.
   * @throws {@link BaseClient.ErrorInfo | ErrorInfo} if the given timeserial is invalid.
   */
  before(timeserial: Timeserial | string): boolean {
    return this._timeserialCompare(timeserial) < 0;
  }

  /**
   * Determines if this timeserial occurs logically after the given timeserial.
   *
   * @param timeserial The timeserial to compare against. Can be a string or a Timeserial object.
   * @returns true if this timeserial follows the given timeserial, in global order.
   * @throws {@link BaseClient.ErrorInfo | ErrorInfo} if the given timeserial is invalid.
   */
  after(timeserial: Timeserial | string): boolean {
    return this._timeserialCompare(timeserial) > 0;
  }

  /**
   * Determines if this timeserial is equal to the given timeserial.
   * @param timeserial The timeserial to compare against. Can be a string or a Timeserial object.
   * @returns true if this timeserial is equal to the given timeserial.
   * @throws {@link BaseClient.ErrorInfo | ErrorInfo} if the given timeserial is invalid.
   */
  equal(timeserial: Timeserial | string): boolean {
    return this._timeserialCompare(timeserial) === 0;
  }
}
