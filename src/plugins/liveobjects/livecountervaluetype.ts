import { __livetype } from '../../../ably';
import { LiveCounter } from '../../../liveobjects';
import { ObjectId } from './objectid';
import {
  createInitialValueJSONString,
  ObjectData,
  ObjectMessage,
  ObjectOperation,
  ObjectOperationAction,
} from './objectmessage';
import { RealtimeObject } from './realtimeobject';

/**
 * A value type class that serves as a simple container for LiveCounter data.
 * Contains sufficient information for the client to produce a COUNTER_CREATE operation
 * for the LiveCounter object.
 *
 * Properties of this class are immutable after construction and the instance
 * will be frozen to prevent mutation.
 */
export class LiveCounterValueType implements LiveCounter {
  declare readonly [__livetype]: 'LiveCounter'; // type-only, unique symbol to satisfy branded interfaces, no JS emitted
  private readonly _livetype = 'LiveCounter'; // use a runtime property to provide a reliable cross-bundle type identification instead of `instanceof` operator
  private readonly _count: number;

  private constructor(count: number) {
    this._count = count;
    Object.freeze(this);
  }

  static create(initialCount: number = 0): LiveCounter {
    // We can't directly import the ErrorInfo class from the core library into the plugin (as this would bloat the plugin size),
    // and, since we're in a user-facing static method, we can't expect a user to pass a client library instance, as this would make the API ugly.
    // Since we can't use ErrorInfo here, we won't do any validation at this step; instead, validation will happen in the mutation methods
    // when we try to create this object.

    return new LiveCounterValueType(initialCount);
  }

  /**
   * @internal
   */
  static instanceof(value: unknown): value is LiveCounterValueType {
    return typeof value === 'object' && value !== null && (value as LiveCounterValueType)._livetype === 'LiveCounter';
  }

  /**
   * @internal
   */
  static async createCounterCreateMessage(
    realtimeObject: RealtimeObject,
    value: LiveCounterValueType,
  ): Promise<ObjectMessage> {
    const client = realtimeObject.getClient();
    const count = value._count;

    if (count !== undefined && (typeof count !== 'number' || !Number.isFinite(count))) {
      throw new client.ErrorInfo('Counter value should be a valid number', 40003, 400);
    }

    const initialValueOperation = LiveCounterValueType.createInitialValueOperation(count);
    const initialValueJSONString = createInitialValueJSONString(initialValueOperation, client);
    const nonce = client.Utils.cheapRandStr();
    const msTimestamp = await client.getTimestamp(true);

    const objectId = ObjectId.fromInitialValue(
      client.Platform,
      'counter',
      initialValueJSONString,
      nonce,
      msTimestamp,
    ).toString();

    const msg = ObjectMessage.fromValues(
      {
        operation: {
          ...initialValueOperation,
          action: ObjectOperationAction.COUNTER_CREATE,
          objectId,
          nonce,
          initialValue: initialValueJSONString,
        } as ObjectOperation<ObjectData>,
      },
      client.Utils,
      client.MessageEncoding,
    );

    return msg;
  }

  private static createInitialValueOperation(count?: number): Pick<ObjectOperation<ObjectData>, 'counter'> {
    return {
      counter: {
        count: count ?? 0,
      },
    };
  }
}
