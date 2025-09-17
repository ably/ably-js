import type * as API from '../../../ably';

/**
 * A value type class that serves as a simple container for LiveCounter data.
 * Contains sufficient information for the client to produce a COUNTER_CREATE operation
 * for the LiveCounter object.
 *
 * Properties of this class are immutable after construction and the instance
 * will be frozen to prevent mutation.
 */
export class LiveCounterValueType implements API.LiveCounter {
  declare readonly [API.__livetype]: 'LiveCounter'; // type-only, unique symbol to satisfy branded interfaces, no JS emitted
  /**
   * This class is imported in both the main SDK and Objects plugin bundles, creating separate constructors.
   * Since instanceof checks fail across bundles, this runtime property provides reliable cross-bundle type identification.
   */
  private readonly __livetype = 'LiveCounter';
  public readonly count: number;

  private constructor(count: number) {
    this.count = count;
    Object.freeze(this);
  }

  static create(count: number = 0): API.LiveCounter {
    // We can't directly import the ErrorInfo class from the core library into the plugin (as this would bloat the plugin size),
    // and, since we're in a user-facing static method, we can't expect a user to pass a client library instance, as this would make the API ugly.
    // Since we can't use ErrorInfo here, we won't do any validation at this step; instead, validation will happen in the mutation methods
    // when we try to create this object.

    return new LiveCounterValueType(count);
  }

  static isLiveCounterValueType(value: unknown): value is LiveCounterValueType {
    return typeof value === 'object' && value !== null && (value as LiveCounterValueType).__livetype === 'LiveCounter';
  }
}
