import { LiveObject, LiveObjectData, LiveObjectUpdate, LiveObjectUpdateNoop } from './liveobject';
import { LiveObjects } from './liveobjects';
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

  value(): number {
    return this._dataRef.data;
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
        `skipping ${op.action} op: op timeserial ${opOriginTimeserial.toString()} <= site timeserial ${this._siteTimeserials[opSiteCode]?.toString()}; objectId=${this._objectId}`,
      );
      return;
    }
    // should update stored site timeserial immediately. doesn't matter if we successfully apply the op,
    // as it's important to mark that the op was processed by the object
    this._siteTimeserials[opSiteCode] = opOriginTimeserial;

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
  overrideWithStateObject(stateObject: StateObject): LiveCounterUpdate {
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

    const previousDataRef = this._dataRef;
    // override all relevant data for this object with data from the state object
    this._createOperationIsMerged = false;
    this._dataRef = { data: stateObject.counter?.count ?? 0 };
    // should default to empty map if site timeserials do not exist on the state object, so that any future operation can be applied to this object
    this._siteTimeserials = stateObject.siteTimeserials ?? {};
    if (!this._client.Utils.isNil(stateObject.createOp)) {
      this._mergeInitialDataFromCreateOperation(stateObject.createOp);
    }

    return this._updateFromDataDiff(previousDataRef, this._dataRef);
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
        `skipping applying COUNTER_CREATE op on a counter instance as it was already applied before; objectId=${this._objectId}`,
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
