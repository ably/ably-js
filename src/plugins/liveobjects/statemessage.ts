export enum StateOperationAction {
  MAP_CREATE = 0,
  MAP_SET = 1,
  MAP_REMOVE = 2,
  COUNTER_CREATE = 3,
  COUNTER_INC = 4,
}

export enum MapSemantics {
  LWW = 0,
}

/** A StateValue represents a concrete leaf value in a state object graph. */
export type StateValue = string | number | boolean | Buffer | Uint8Array;

/** StateData captures a value in a state object. */
export interface StateData {
  /** A reference to another state object, used to support composable state objects. */
  objectId?: string;
  /**
   * The encoding the client should use to interpret the value.
   * Analogous to the `encoding` field on the `Message` and `PresenceMessage` types.
   */
  encoding?: string;
  /** A concrete leaf value in the state object graph. */
  value?: StateValue;
}

/** A StateMapOp describes an operation to be applied to a Map object. */
export interface StateMapOp {
  /** The key of the map entry to which the operation should be applied. */
  key: string;
  /** The data that the map entry should contain if the operation is a MAP_SET operation. */
  data?: StateData;
}

/** A StateCounterOp describes an operation to be applied to a Counter object. */
export interface StateCounterOp {
  /** The data value that should be added to the counter */
  amount: number;
}

/** A MapEntry represents the value at a given key in a Map object. */
export interface StateMapEntry {
  /** Indicates whether the map entry has been removed. */
  tombstone?: boolean;
  /** The *origin* timeserial of the last operation that was applied to the map entry. */
  timeserial: string;
  /** The data that represents the value of the map entry. */
  data: StateData;
}

/** A Map object represents a map of key-value pairs. */
export interface StateMap {
  /** The conflict-resolution semantics used by the map object. */
  semantics?: MapSemantics;
  // The map entries, indexed by key.
  entries?: Record<string, StateMapEntry>;
}

/** A Counter object represents an incrementable and decrementable value */
export interface StateCounter {
  /** The value of the counter */
  count?: number;
  /**
   * Indicates (true) if the counter has seen an explicit create operation
   * and false if the counter was created with a default value when
   * processing a regular operation.
   */
  created: boolean;
}

/** A StateOperation describes an operation to be applied to a state object. */
export interface StateOperation {
  /** Defines the operation to be applied to the state object. */
  action: StateOperationAction;
  /** The object ID of the state object to which the operation should be applied. */
  objectId: string;
  /** The payload for the operation if it is an operation on a Map object type. */
  mapOp?: StateMapOp;
  /** The payload for the operation if it is an operation on a Counter object type. */
  counterOp?: StateCounterOp;
  /**
   * The payload for the operation if the operation is MAP_CREATE.
   * Defines the initial value for the map object.
   */
  map?: StateMap;
  /**
   * The payload for the operation if the operation is COUNTER_CREATE.
   * Defines the initial value for the counter object.
   */
  counter?: StateCounter;
  /**
   * The nonce, must be present on create operations. This is the random part
   * that has been hashed with the type and initial value to create the object ID.
   */
  nonce?: string;
}

/** A StateObject describes the instantaneous state of an object. */
export interface StateObject {
  /** The identifier of the state object. */
  objectId: string;
  /** The *regional* timeserial of the last operation that was applied to this state object. */
  regionalTimeserial: string;
  /** The data that represents the state of the object if it is a Map object type. */
  map?: StateMap;
  /** The data that represents the state of the object if it is a Counter object type. */
  counter?: StateCounter;
}

/**
 * @internal
 */
export class StateMessage {
  id?: string;
  timestamp?: number;
  clientId?: string;
  connectionId?: string;
  channel?: string;
  extras?: any;
  /** Describes an operation to be applied to a state object. */
  operation?: StateOperation;
  /** Describes the instantaneous state of an object. */
  object?: StateObject;
  /** Timeserial format */
  serial?: string;

  static fromValues(values: StateMessage | Record<string, unknown>): StateMessage {
    return Object.assign(new StateMessage(), values);
  }

  static fromValuesArray(values: unknown[]): StateMessage[] {
    const count = values.length;
    const result = new Array(count);

    for (let i = 0; i < count; i++) {
      result[i] = this.fromValues(values[i] as Record<string, unknown>);
    }

    return result;
  }
}
