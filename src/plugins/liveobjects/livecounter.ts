import { LiveObject, LiveObjectData, LiveObjectUpdate, LiveObjectUpdateNoop } from './liveobject';
import { LiveObjects } from './liveobjects';
import { StateCounter, StateCounterOp, StateMessage, StateOperation, StateOperationAction } from './statemessage';
import { DefaultTimeserial, Timeserial } from './timeserial';

export interface LiveCounterData extends LiveObjectData {
  data: number;
}

export interface LiveCounterUpdate extends LiveObjectUpdate {
  update: { inc: number };
}

export class LiveCounter extends LiveObject<LiveCounterData, LiveCounterUpdate> {
  constructor(
    liveObjects: LiveObjects,
    private _created: boolean,
    initialData?: LiveCounterData | null,
    objectId?: string,
    siteTimeserials?: Record<string, Timeserial>,
  ) {
    super(liveObjects, initialData, objectId, siteTimeserials);
  }

  /**
   * Returns a {@link LiveCounter} instance with a 0 value.
   *
   * @internal
   */
  static zeroValue(
    liveobjects: LiveObjects,
    isCreated: boolean,
    objectId?: string,
    siteTimeserials?: Record<string, Timeserial>,
  ): LiveCounter {
    return new LiveCounter(liveobjects, isCreated, null, objectId, siteTimeserials);
  }

  value(): number {
    return this._dataRef.data;
  }

  /**
   * @internal
   */
  isCreated(): boolean {
    return this._created;
  }

  /**
   * @internal
   */
  setCreated(created: boolean): void {
    this._created = created;
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

    const opOriginTimeserial = DefaultTimeserial.calculateTimeserial(this._client, msg.serial);
    if (!this._canApplyOperation(opOriginTimeserial)) {
      this._client.Logger.logAction(
        this._client.logger,
        this._client.Logger.LOG_MICRO,
        'LiveCounter.applyOperation()',
        `skipping ${op.action} op: op timeserial ${opOriginTimeserial.toString()} <= site timeserial ${this._siteTimeserials[opOriginTimeserial.siteCode].toString()}; objectId=${this._objectId}`,
      );
      return;
    }
    // should update stored site timeserial immediately. doesn't matter if we successfully apply the op,
    // as it's important to mark that the op was processed by the object
    this._siteTimeserials[opOriginTimeserial.siteCode] = opOriginTimeserial;

    let update: LiveCounterUpdate | LiveObjectUpdateNoop;
    switch (op.action) {
      case StateOperationAction.COUNTER_CREATE:
        update = this._applyCounterCreate(op.counter);
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

  protected _getZeroValueData(): LiveCounterData {
    return { data: 0 };
  }

  protected _updateFromDataDiff(currentDataRef: LiveCounterData, newDataRef: LiveCounterData): LiveCounterUpdate {
    const counterDiff = newDataRef.data - currentDataRef.data;
    return { update: { inc: counterDiff } };
  }

  private _throwNoPayloadError(op: StateOperation): void {
    throw new this._client.ErrorInfo(
      `No payload found for ${op.action} op for LiveCounter objectId=${this.getObjectId()}`,
      50000,
      500,
    );
  }

  private _applyCounterCreate(op: StateCounter | undefined): LiveCounterUpdate | LiveObjectUpdateNoop {
    if (this.isCreated()) {
      // skip COUNTER_CREATE op if this counter is already created
      this._client.Logger.logAction(
        this._client.logger,
        this._client.Logger.LOG_MICRO,
        'LiveCounter._applyCounterCreate()',
        `skipping applying COUNTER_CREATE op on a counter instance as it is already created; objectId=${this._objectId}`,
      );
      return { noop: true };
    }

    if (this._client.Utils.isNil(op)) {
      // if a counter object is missing for the COUNTER_CREATE op, the initial value is implicitly 0 in this case.
      // we need to SUM the initial value to the current value due to the reasons below, but since it's a 0, we can skip addition operation
      this.setCreated(true);
      return { update: { inc: 0 } };
    }

    // note that it is intentional to SUM the incoming count from the create op.
    // if we get here, it means that current counter instance wasn't initialized from the COUNTER_CREATE op,
    // so it is missing the initial value that we're going to add now.
    this._dataRef.data += op.count ?? 0;
    this.setCreated(true);

    return { update: { inc: op.count ?? 0 } };
  }

  private _applyCounterInc(op: StateCounterOp): LiveCounterUpdate {
    this._dataRef.data += op.amount;
    return { update: { inc: op.amount } };
  }
}
