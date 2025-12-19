import { __livetype } from '../../../ably';
import { Primitive, LiveMap as PublicLiveMap, Value } from '../../../liveobjects';
import { LiveCounterValueType } from './livecountervaluetype';
import { LiveMap, LiveMapObjectData, ObjectIdObjectData, ValueObjectData } from './livemap';
import { ObjectId } from './objectid';
import {
  createInitialValueJSONString,
  ObjectData,
  ObjectMessage,
  ObjectOperation,
  ObjectOperationAction,
  ObjectsMapEntry,
  ObjectsMapSemantics,
} from './objectmessage';
import { RealtimeObject } from './realtimeobject';

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
export class LiveMapValueType<T extends Record<string, Value> = Record<string, Value>> implements PublicLiveMap<T> {
  declare readonly [__livetype]: 'LiveMap'; // type-only, unique symbol to satisfy branded interfaces, no JS emitted
  private readonly _livetype = 'LiveMap'; // use a runtime property to provide a reliable cross-bundle type identification instead of `instanceof` operator
  private readonly _entries: T | undefined;

  private constructor(entries: T | undefined) {
    this._entries = entries;
    Object.freeze(this);
  }

  static create<T extends Record<string, Value>>(
    initialEntries?: T,
  ): PublicLiveMap<T extends Record<string, Value> ? T : {}> {
    // We can't directly import the ErrorInfo class from the core library into the plugin (as this would bloat the plugin size),
    // and, since we're in a user-facing static method, we can't expect a user to pass a client library instance, as this would make the API ugly.
    // Since we can't use ErrorInfo here, we won't do any validation at this step; instead, validation will happen in the mutation methods
    // when we try to create this object.

    return new LiveMapValueType(initialEntries);
  }

  /**
   * @internal
   */
  static instanceof(value: unknown): value is LiveMapValueType {
    return typeof value === 'object' && value !== null && (value as LiveMapValueType)._livetype === 'LiveMap';
  }

  /**
   * @internal
   */
  static async createMapCreateMessage(
    realtimeObject: RealtimeObject,
    value: LiveMapValueType,
  ): Promise<{ mapCreateMsg: ObjectMessage; nestedObjectsCreateMsgs: ObjectMessage[] }> {
    const client = realtimeObject.getClient();
    const entries = value._entries;

    if (entries !== undefined && (entries === null || typeof entries !== 'object')) {
      throw new client.ErrorInfo('Map entries should be a key-value object', 40003, 400);
    }

    Object.entries(entries ?? {}).forEach(([key, value]) => LiveMap.validateKeyValue(realtimeObject, key, value));

    const { initialValueOperation, nestedObjectsCreateMsgs } = await LiveMapValueType._createInitialValueOperation(
      realtimeObject,
      entries,
    );
    const initialValueJSONString = createInitialValueJSONString(initialValueOperation, client);
    const nonce = client.Utils.cheapRandStr();
    const msTimestamp = await client.getTimestamp(true);

    const objectId = ObjectId.fromInitialValue(
      client.Platform,
      'map',
      initialValueJSONString,
      nonce,
      msTimestamp,
    ).toString();

    const mapCreateMsg = ObjectMessage.fromValues(
      {
        operation: {
          ...initialValueOperation,
          action: ObjectOperationAction.MAP_CREATE,
          objectId,
          nonce,
          initialValue: initialValueJSONString,
        } as ObjectOperation<ObjectData>,
      },
      client.Utils,
      client.MessageEncoding,
    );

    return {
      mapCreateMsg,
      nestedObjectsCreateMsgs,
    };
  }

  private static async _createInitialValueOperation(
    realtimeObject: RealtimeObject,
    entries?: Record<string, Value>,
  ): Promise<{
    initialValueOperation: Pick<ObjectOperation<ObjectData>, 'map'>;
    nestedObjectsCreateMsgs: ObjectMessage[];
  }> {
    const mapEntries: Record<string, ObjectsMapEntry<ObjectData>> = {};
    const nestedObjectsCreateMsgs: ObjectMessage[] = [];

    for (const [key, value] of Object.entries(entries ?? {})) {
      let objectData: LiveMapObjectData;

      if (LiveMapValueType.instanceof(value)) {
        const { mapCreateMsg, nestedObjectsCreateMsgs: childNestedObjs } =
          await LiveMapValueType.createMapCreateMessage(realtimeObject, value);
        nestedObjectsCreateMsgs.push(...childNestedObjs, mapCreateMsg);
        const typedObjectData: ObjectIdObjectData = { objectId: mapCreateMsg.operation?.objectId! };
        objectData = typedObjectData;
      } else if (LiveCounterValueType.instanceof(value)) {
        const counterCreateMsg = await LiveCounterValueType.createCounterCreateMessage(realtimeObject, value);
        nestedObjectsCreateMsgs.push(counterCreateMsg);
        const typedObjectData: ObjectIdObjectData = { objectId: counterCreateMsg.operation?.objectId! };
        objectData = typedObjectData;
      } else {
        // Handle primitive values
        const typedObjectData: ValueObjectData = { value: value as Primitive };
        objectData = typedObjectData;
      }

      mapEntries[key] = {
        data: objectData,
      };
    }

    const initialValueOperation = {
      map: {
        semantics: ObjectsMapSemantics.LWW,
        entries: mapEntries,
      },
    };

    return {
      initialValueOperation,
      nestedObjectsCreateMsgs,
    };
  }
}
