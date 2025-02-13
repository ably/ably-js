import { LiveObject, LiveObjectData, LiveObjectUpdate, LiveObjectUpdateNoop } from './liveobject';
import { LiveObjects } from './liveobjects';
import { ObjectId } from './objectid';
import { StateCounterOp, StateMessage, StateObject, StateOperation, StateOperationAction } from './statemessage';

export interface LiveCounterData extends LiveObjectData {
  data: number;
}

export interface LiveCounterUpdate extends LiveObjectUpdate {
  update: { inc: number };
}

export class LiveCounter extends LiveObject<LiveCounterData, LiveCounterUpdate> {
  /**
   * Returns a {@link LiveCounter} instance with a 0 value.
   *
   * @internal
   */
  static zeroValue(liveobjects: LiveObjects, objectId: string): LiveCounter {
    return new LiveCounter(liveobjects, objectId);
  }

  /**
   * Returns a {@link LiveCounter} instance based on the provided state object.
   * The provided state object must hold a valid counter object data.
   *
   * @internal
   */
  static fromStateObject(liveobjects: LiveObjects, stateObject: StateObject): LiveCounter {
    const obj = new LiveCounter(liveobjects, stateObject.objectId);
    obj.overrideWithStateObject(stateObject);
    return obj;
  }

  /**
   * Returns a {@link LiveCounter} instance based on the provided COUNTER_CREATE state operation.
   * The provided state operation must hold a valid counter object data.
   *
   * @internal
   */
  static fromStateOperation(liveobjects: LiveObjects, stateOperation: StateOperation): LiveCounter {
    const obj = new LiveCounter(liveobjects, stateOperation.objectId);
    obj._mergeInitialDataFromCreateOperation(stateOperation);
    return obj;
  }

  /**
   * @internal
   */
  static createCounterIncMessage(liveObjects: LiveObjects, objectId: string, amount: number): StateMessage {
    const client = liveObjects.getClient();

    if (typeof amount !== 'number' || !isFinite(amount)) {
      throw new client.ErrorInfo('Counter value increment should be a valid number', 40013, 400);
    }

    const stateMessage = StateMessage.fromValues(
      {
        operation: {
          action: StateOperationAction.COUNTER_INC,
          objectId,
          counterOp: { amount },
        } as StateOperation,
      },
      client.Utils,
      client.MessageEncoding,
    );

    return stateMessage;
  }

  /**
   * @internal
   */
  static async createCounterCreateMessage(liveObjects: LiveObjects, count?: number): Promise<StateMessage> {
    const client = liveObjects.getClient();

    if (count !== undefined && (typeof count !== 'number' || !Number.isFinite(count))) {
      throw new client.ErrorInfo('Counter value should be a valid number', 40013, 400);
    }

    const initialValueObj = LiveCounter.createInitialValueObject(count);
    const { encodedInitialValue, format } = StateMessage.encodeInitialValue(initialValueObj, client);
    const nonce = client.Utils.cheapRandStr();
    const msTimestamp = await client.getTimestamp(true);

    const objectId = ObjectId.fromInitialValue(
      client.Platform,
      'counter',
      encodedInitialValue,
      nonce,
      msTimestamp,
    ).toString();

    const stateMessage = StateMessage.fromValues(
      {
        operation: {
          ...initialValueObj,
          action: StateOperationAction.COUNTER_CREATE,
          objectId,
          nonce,
          initialValue: encodedInitialValue,
          initialValueEncoding: format,
        } as StateOperation,
      },
      client.Utils,
      client.MessageEncoding,
    );

    return stateMessage;
  }

  /**
   * @internal
   */
  static createInitialValueObject(count?: number): Pick<StateOperation, 'counter'> {
    return {
      counter: {
        count: count ?? 0,
      },
    };
  }

  value(): number {
    this._liveObjects.throwIfMissingStateSubscribeMode();
    return this._dataRef.data;
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
    this._liveObjects.throwIfMissingStatePublishMode();
    const stateMessage = LiveCounter.createCounterIncMessage(this._liveObjects, this.getObjectId(), amount);
    return this._liveObjects.publish([stateMessage]);
  }

  /**
   * An alias for calling {@link LiveCounter.increment | LiveCounter.increment(-amount)}
   */
  async decrement(amount: number): Promise<void> {
    this._liveObjects.throwIfMissingStatePublishMode();
    // do an explicit type safety check here before negating the amount value,
    // so we don't unintentionally change the type sent by a user
    if (typeof amount !== 'number' || !isFinite(amount)) {
      throw new this._client.ErrorInfo('Counter value decrement should be a valid number', 40013, 400);
    }

    return this.increment(-amount);
  }

  /**
   * @internal
   */
  applyOperation(op: StateOperation, msg: StateMessage): void {
    if (op.objectId !== this.getObjectId()) {
      throw new this._client.ErrorInfo(
        `Cannot apply state operation with objectId=${op.objectId}, to this LiveCounter with objectId=${this.getObjectId()}`,
        50000,
        500,
      );
    }

    const opOriginTimeserial = msg.serial!;
    const opSiteCode = msg.siteCode!;
    if (!this._canApplyOperation(opOriginTimeserial, opSiteCode)) {
      this._client.Logger.logAction(
        this._client.logger,
        this._client.Logger.LOG_MICRO,
        'LiveCounter.applyOperation()',
        `skipping ${op.action} op: op timeserial ${opOriginTimeserial.toString()} <= site timeserial ${this._siteTimeserials[opSiteCode]?.toString()}; objectId=${this.getObjectId()}`,
      );
      return;
    }
    // should update stored site timeserial immediately. doesn't matter if we successfully apply the op,
    // as it's important to mark that the op was processed by the object
    this._siteTimeserials[opSiteCode] = opOriginTimeserial;

    if (this.isTombstoned()) {
      // this object is tombstoned so the operation cannot be applied
      return;
    }

    let update: LiveCounterUpdate | LiveObjectUpdateNoop;
    switch (op.action) {
      case StateOperationAction.COUNTER_CREATE:
        update = this._applyCounterCreate(op);
        break;

      case StateOperationAction.COUNTER_INC:
        if (this._client.Utils.isNil(op.counterOp)) {
          this._throwNoPayloadError(op);
          // leave an explicit return here, so that TS knows that update object is always set after the switch statement.
          return;
        } else {
          update = this._applyCounterInc(op.counterOp);
        }
        break;

      case StateOperationAction.OBJECT_DELETE:
        update = this._applyObjectDelete();
        break;

      default:
        throw new this._client.ErrorInfo(
          `Invalid ${op.action} op for LiveCounter objectId=${this.getObjectId()}`,
          50000,
          500,
        );
    }

    this.notifyUpdated(update);
  }

  /**
   * @internal
   */
  overrideWithStateObject(stateObject: StateObject): LiveCounterUpdate | LiveObjectUpdateNoop {
    if (stateObject.objectId !== this.getObjectId()) {
      throw new this._client.ErrorInfo(
        `Invalid state object: state object objectId=${stateObject.objectId}; LiveCounter objectId=${this.getObjectId()}`,
        50000,
        500,
      );
    }

    if (!this._client.Utils.isNil(stateObject.createOp)) {
      // it is expected that create operation can be missing in the state object, so only validate it when it exists
      if (stateObject.createOp.objectId !== this.getObjectId()) {
        throw new this._client.ErrorInfo(
          `Invalid state object: state object createOp objectId=${stateObject.createOp?.objectId}; LiveCounter objectId=${this.getObjectId()}`,
          50000,
          500,
        );
      }

      if (stateObject.createOp.action !== StateOperationAction.COUNTER_CREATE) {
        throw new this._client.ErrorInfo(
          `Invalid state object: state object createOp action=${stateObject.createOp?.action}; LiveCounter objectId=${this.getObjectId()}`,
          50000,
          500,
        );
      }
    }

    // object's site timeserials are still updated even if it is tombstoned, so always use the site timeserials received from the op.
    // should default to empty map if site timeserials do not exist on the state object, so that any future operation may be applied to this object.
    this._siteTimeserials = stateObject.siteTimeserials ?? {};

    if (this.isTombstoned()) {
      // this object is tombstoned. this is a terminal state which can't be overridden. skip the rest of state object message processing
      return { noop: true };
    }

    const previousDataRef = this._dataRef;
    if (stateObject.tombstone) {
      // tombstone this object and ignore the data from the state object message
      this.tombstone();
    } else {
      // override data for this object with data from the state object
      this._createOperationIsMerged = false;
      this._dataRef = { data: stateObject.counter?.count ?? 0 };
      if (!this._client.Utils.isNil(stateObject.createOp)) {
        this._mergeInitialDataFromCreateOperation(stateObject.createOp);
      }
    }

    // if object got tombstoned, the update object will include all data that got cleared.
    // otherwise it is a diff between previous value and new value from state object.
    return this._updateFromDataDiff(previousDataRef, this._dataRef);
  }

  /**
   * @internal
   */
  onGCInterval(): void {
    // nothing to GC for a counter object
    return;
  }

  protected _getZeroValueData(): LiveCounterData {
    return { data: 0 };
  }

  protected _updateFromDataDiff(prevDataRef: LiveCounterData, newDataRef: LiveCounterData): LiveCounterUpdate {
    const counterDiff = newDataRef.data - prevDataRef.data;
    return { update: { inc: counterDiff } };
  }

  protected _mergeInitialDataFromCreateOperation(stateOperation: StateOperation): LiveCounterUpdate {
    // if a counter object is missing for the COUNTER_CREATE op, the initial value is implicitly 0 in this case.
    // note that it is intentional to SUM the incoming count from the create op.
    // if we got here, it means that current counter instance is missing the initial value in its data reference,
    // which we're going to add now.
    this._dataRef.data += stateOperation.counter?.count ?? 0;
    this._createOperationIsMerged = true;

    return { update: { inc: stateOperation.counter?.count ?? 0 } };
  }

  private _throwNoPayloadError(op: StateOperation): void {
    throw new this._client.ErrorInfo(
      `No payload found for ${op.action} op for LiveCounter objectId=${this.getObjectId()}`,
      50000,
      500,
    );
  }

  private _applyCounterCreate(op: StateOperation): LiveCounterUpdate | LiveObjectUpdateNoop {
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

    return this._mergeInitialDataFromCreateOperation(op);
  }

  private _applyCounterInc(op: StateCounterOp): LiveCounterUpdate {
    this._dataRef.data += op.amount;
    return { update: { inc: op.amount } };
  }
}
