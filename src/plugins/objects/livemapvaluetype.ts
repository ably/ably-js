import type * as API from '../../../ably';

/**
 * A value type class that serves as a simple container for LiveMap data.
 * Contains sufficient information for the client to produce a MAP_CREATE operation
 * for the LiveMap object.
 *
 * Properties of this class are immutable after construction and the instance
 * will be frozen to prevent mutation.
 *
 * Note: We do not deep freeze or deep copy the entries data for the following reasons:
 * 1. It adds substantial complexity, especially for handling Buffer/ArrayBuffer values
 * 2. Cross-platform buffer copying would require reimplementing BufferUtils logic
 *    to handle browser vs Node.js environments and check availability of Buffer/ArrayBuffer
 * 3. The protection isn't critical - if users mutate the data after creating the value type,
 *    nothing breaks since we create separate live objects each time the value type is used
 * 4. This behavior should be documented and it's the user's responsibility to understand
 *    how they mutate their data when working with value type classes
 */
export class LiveMapValueType<T extends Record<string, API.Value> = Record<string, API.Value>>
  implements API.LiveMap<T>
{
  declare readonly [API.__livetype]: 'LiveMap'; // type-only, unique symbol to satisfy branded interfaces, no JS emitted
  /**
   * This class is imported in both the main SDK and Objects plugin bundles, creating separate constructors.
   * Since instanceof checks fail across bundles, this runtime property provides reliable cross-bundle type identification.
   */
  private readonly __livetype = 'LiveMap';
  public readonly entries: T;

  private constructor(entries: T) {
    this.entries = entries;
    Object.freeze(this);
  }

  static create<T extends Record<string, API.Value>>(
    entries?: T,
  ): API.LiveMap<T extends Record<string, API.Value> ? T : {}> {
    // We can't directly import the ErrorInfo class from the core library into the plugin (as this would bloat the plugin size),
    // and, since we're in a user-facing static method, we can't expect a user to pass a client library instance, as this would make the API ugly.
    // Since we can't use ErrorInfo here, we won't do any validation at this step; instead, validation will happen in the mutation methods
    // when we try to create this object.

    const safeEntries = (entries ?? {}) as T extends Record<string, API.Value> ? T : {};
    return new LiveMapValueType(safeEntries);
  }

  static isLiveMapValueType(value: unknown): value is LiveMapValueType {
    return typeof value === 'object' && value !== null && (value as LiveMapValueType).__livetype === 'LiveMap';
  }
}
