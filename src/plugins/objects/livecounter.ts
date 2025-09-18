import { LiveObject, LiveObjectData, LiveObjectUpdate, LiveObjectUpdateNoop } from './liveobject';
import { ObjectId } from './objectid';
import {
  createInitialValueJSONString,
  ObjectData,
  ObjectMessage,
  ObjectOperation,
  ObjectOperationAction,
  ObjectsCounterOp,
} from './objectmessage';
import { Objects } from './objects';

export interface LiveCounterData extends LiveObjectData {
  data: number; // RTLC3
}

export interface LiveCounterUpdate extends LiveObjectUpdate {
  update: { amount: number };
}

/** @spec RTLC1, RTLC2 */
export class LiveCounter extends LiveObject<LiveCounterData, LiveCounterUpdate> {
  /**
   * Returns a {@link LiveCounter} instance with a 0 value.
   *
   * @internal
   * @spec RTLC4
   */
  static zeroValue(objects: Objects, objectId: string): LiveCounter {
    return new LiveCounter(objects, objectId);
  }

  /**
   * Returns a {@link LiveCounter} instance based on the provided object state.
   * The provided object state must hold a valid counter object data.
   *
   * @internal
   */
  static fromObjectState(objects: Objects, objectMessage: ObjectMessage): LiveCounter {
    const obj = new LiveCounter(objects, objectMessage.object!.objectId);
    obj.overrideWithObjectState(objectMessage);
    return obj;
  }

  /**
   * Returns a {@link LiveCounter} instance based on the provided COUNTER_CREATE object operation.
   * The provided object operation must hold a valid counter object data.
   *
   * @internal
   */
  static fromObjectOperation(objects: Objects, objectMessage: ObjectMessage): LiveCounter {
    const obj = new LiveCounter(objects, objectMessage.operation!.objectId);
    obj._mergeInitialDataFromCreateOperation(objectMessage.operation!, objectMessage);
    return obj;
  }

  /**
   * @internal
   */
  static createCounterIncMessage(objects: Objects, objectId: string, amount: number): ObjectMessage {
    const client = objects.getClient();

    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      throw new client.ErrorInfo('Counter value increment should be a valid number', 40003, 400);
    }

    const msg = ObjectMessage.fromValues(
      {
        operation: {
          action: ObjectOperationAction.COUNTER_INC,
          objectId,
          counterOp: { amount },
        } as ObjectOperation<ObjectData>,
      },
      client.Utils,
      client.MessageEncoding,
    );

    return msg;
  }

  /**
   * @internal
   */
  static async createCounterCreateMessage(objects: Objects, count?: number): Promise<ObjectMessage> {
    const client = objects.getClient();

    if (count !== undefined && (typeof count !== 'number' || !Number.isFinite(count))) {
      throw new client.ErrorInfo('Counter value should be a valid number', 40003, 400);
    }

    const initialValueOperation = LiveCounter.createInitialValueOperation(count);
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

  /**
   * @internal
   */
  static createInitialValueOperation(count?: number): Pick<ObjectOperation<ObjectData>, 'counter'> {
    return {
      counter: {
        count: count ?? 0,
      },
    };
  }

  /** @spec RTLC5 */
  value(): number {
    this._objects.throwIfInvalidAccessApiConfiguration(); // RTLC5a, RTLC5b
    return this._dataRef.data; // RTLC5c
  }

  /**
   * Send a COUNTER_INC operation to the realtime system to increment a value on this LiveCounter object.
   *
   * This does not modify the underlying data of this LiveCounter object. Instead, the change will be applied when
   * the published COUNTER_INC operation is echoed back to the client and applied to the object following the regular
   * operation application procedure.
   *
   * @returns A promise which resolves upon receiving the ACK message for the published operation message.
   */
  async increment(amount: number): Promise<void> {
    this._objects.throwIfInvalidWriteApiConfiguration();
    const msg = LiveCounter.createCounterIncMessage(this._objects, this.getObjectId(), amount);
    return this._objects.publish([msg]);
  }

  /**
   * An alias for calling {@link LiveCounter.increment | LiveCounter.increment(-amount)}
   */
  async decrement(amount: number): Promise<void> {
    this._objects.throwIfInvalidWriteApiConfiguration();
    // do an explicit type safety check here before negating the amount value,
    // so we don't unintentionally change the type sent by a user
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      throw new this._client.ErrorInfo('Counter value decrement should be a valid number', 40003, 400);
    }

    return this.increment(-amount);
  }

  /**
   * @internal
   */
  applyOperation(op: ObjectOperation<ObjectData>, msg: ObjectMessage): void {
    if (op.objectId !== this.getObjectId()) {
      throw new this._client.ErrorInfo(
        `Cannot apply object operation with objectId=${op.objectId}, to this LiveCounter with objectId=${this.getObjectId()}`,
        92000,
        500,
      );
    }

    const opSerial = msg.serial!;
    const opSiteCode = msg.siteCode!;
    if (!this._canApplyOperation(opSerial, opSiteCode)) {
      this._client.Logger.logAction(
        this._client.logger,
        this._client.Logger.LOG_MICRO,
        'LiveCounter.applyOperation()',
        `skipping ${op.action} op: op serial ${opSerial.toString()} <= site serial ${this._siteTimeserials[opSiteCode]?.toString()}; objectId=${this.getObjectId()}`,
      );
      return;
    }
    // should update stored site serial immediately. doesn't matter if we successfully apply the op,
    // as it's important to mark that the op was processed by the object
    this._siteTimeserials[opSiteCode] = opSerial;

    if (this.isTombstoned()) {
      // this object is tombstoned so the operation cannot be applied
      return;
    }

    let update: LiveCounterUpdate | LiveObjectUpdateNoop;
    switch (op.action) {
      case ObjectOperationAction.COUNTER_CREATE:
        update = this._applyCounterCreate(op, msg);
        break;

      case ObjectOperationAction.COUNTER_INC:
        if (this._client.Utils.isNil(op.counterOp)) {
          this._throwNoPayloadError(op);
          // leave an explicit return here, so that TS knows that update object is always set after the switch statement.
          return;
        } else {
          update = this._applyCounterInc(op.counterOp, msg);
        }
        break;

      case ObjectOperationAction.OBJECT_DELETE:
        update = this._applyObjectDelete(msg);
        break;

      default:
        throw new this._client.ErrorInfo(
          `Invalid ${op.action} op for LiveCounter objectId=${this.getObjectId()}`,
          92000,
          500,
        );
    }

    this.notifyUpdated(update);
  }

  /**
   * @internal
   * @spec RTLC6
   */
  overrideWithObjectState(objectMessage: ObjectMessage): LiveCounterUpdate | LiveObjectUpdateNoop {
    const objectState = objectMessage.object;
    if (objectState == null) {
      throw new this._client.ErrorInfo(`Missing object state; LiveCounter objectId=${this.getObjectId()}`, 92000, 500);
    }

    if (objectState.objectId !== this.getObjectId()) {
      throw new this._client.ErrorInfo(
        `Invalid object state: object state objectId=${objectState.objectId}; LiveCounter objectId=${this.getObjectId()}`,
        92000,
        500,
      );
    }

    if (!this._client.Utils.isNil(objectState.createOp)) {
      // it is expected that create operation can be missing in the object state, so only validate it when it exists
      if (objectState.createOp.objectId !== this.getObjectId()) {
        throw new this._client.ErrorInfo(
          `Invalid object state: object state createOp objectId=${objectState.createOp?.objectId}; LiveCounter objectId=${this.getObjectId()}`,
          92000,
          500,
        );
      }

      if (objectState.createOp.action !== ObjectOperationAction.COUNTER_CREATE) {
        throw new this._client.ErrorInfo(
          `Invalid object state: object state createOp action=${objectState.createOp?.action}; LiveCounter objectId=${this.getObjectId()}`,
          92000,
          500,
        );
      }
    }

    // object's site serials are still updated even if it is tombstoned, so always use the site serials received from the operation.
    // should default to empty map if site serials do not exist on the object state, so that any future operation may be applied to this object.
    this._siteTimeserials = objectState.siteTimeserials ?? {}; // RTLC6a

    if (this.isTombstoned()) {
      // this object is tombstoned. this is a terminal state which can't be overridden. skip the rest of object state message processing
      return { noop: true };
    }

    const previousDataRef = this._dataRef;
    if (objectState.tombstone) {
      // tombstone this object and ignore the data from the object state message
      this.tombstone(objectMessage);
    } else {
      // override data for this object with data from the object state
      this._createOperationIsMerged = false; // RTLC6b
      this._dataRef = { data: objectState.counter?.count ?? 0 }; // RTLC6c
      // RTLC6d
      if (!this._client.Utils.isNil(objectState.createOp)) {
        this._mergeInitialDataFromCreateOperation(objectState.createOp, objectMessage);
      }
    }

    // if object got tombstoned, the update object will include all data that got cleared.
    // otherwise it is a diff between previous value and new value from object state.
    const update = this._updateFromDataDiff(previousDataRef, this._dataRef);
    update.clientId = objectMessage.clientId;
    update.connectionId = objectMessage.connectionId;
    return update;
  }

  /**
   * @internal
   */
  onGCInterval(): void {
    // nothing to GC for a counter object
    return;
  }

  /** @spec RTLC4 */
  protected _getZeroValueData(): LiveCounterData {
    return { data: 0 };
  }

  protected _updateFromDataDiff(prevDataRef: LiveCounterData, newDataRef: LiveCounterData): LiveCounterUpdate {
    const counterDiff = newDataRef.data - prevDataRef.data;
    return { update: { amount: counterDiff } };
  }

  protected _mergeInitialDataFromCreateOperation(
    objectOperation: ObjectOperation<ObjectData>,
    msg: ObjectMessage,
  ): LiveCounterUpdate {
    // if a counter object is missing for the COUNTER_CREATE op, the initial value is implicitly 0 in this case.
    // note that it is intentional to SUM the incoming count from the create op.
    // if we got here, it means that current counter instance is missing the initial value in its data reference,
    // which we're going to add now.
    this._dataRef.data += objectOperation.counter?.count ?? 0; // RTLC6d1
    this._createOperationIsMerged = true; // RTLC6d2

    return {
      update: { amount: objectOperation.counter?.count ?? 0 },
      clientId: msg.clientId,
      connectionId: msg.connectionId,
    };
  }

  private _throwNoPayloadError(op: ObjectOperation<ObjectData>): void {
    throw new this._client.ErrorInfo(
      `No payload found for ${op.action} op for LiveCounter objectId=${this.getObjectId()}`,
      92000,
      500,
    );
  }

  private _applyCounterCreate(
    op: ObjectOperation<ObjectData>,
    msg: ObjectMessage,
  ): LiveCounterUpdate | LiveObjectUpdateNoop {
    if (this._createOperationIsMerged) {
      // There can't be two different create operation for the same object id, because the object id
      // fully encodes that operation. This means we can safely ignore any new incoming create operations
      // if we already merged it once.
      this._client.Logger.logAction(
        this._client.logger,
        this._client.Logger.LOG_MICRO,
        'LiveCounter._applyCounterCreate()',
        `skipping applying COUNTER_CREATE op on a counter instance as it was already applied before; objectId=${this.getObjectId()}`,
      );
      return { noop: true };
    }

    return this._mergeInitialDataFromCreateOperation(op, msg);
  }

  private _applyCounterInc(op: ObjectsCounterOp, msg: ObjectMessage): LiveCounterUpdate {
    this._dataRef.data += op.amount;
    return { update: { amount: op.amount }, clientId: msg.clientId, connectionId: msg.connectionId };
  }
}
