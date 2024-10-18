import { LiveObject, LiveObjectData } from './liveobject';
import { LiveObjects } from './liveobjects';
import { StateCounter, StateCounterOp, StateOperation, StateOperationAction } from './statemessage';

export interface LiveCounterData extends LiveObjectData {
  data: number;
}

export class LiveCounter extends LiveObject<LiveCounterData> {
  constructor(
    liveObjects: LiveObjects,
    private _created: boolean,
    initialData?: LiveCounterData | null,
    objectId?: string,
  ) {
    super(liveObjects, initialData, objectId);
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
  applyOperation(op: StateOperation): void {
    if (op.objectId !== this.getObjectId()) {
      throw new this._client.ErrorInfo(
        `Cannot apply state operation with objectId=${op.objectId}, to this LiveCounter with objectId=${this.getObjectId()}`,
        50000,
        500,
      );
    }

    switch (op.action) {
      case StateOperationAction.COUNTER_CREATE:
        if (this._client.Utils.isNil(op.counter)) {
          this._throwNoPayloadError(op);
        } else {
          this._applyCounterCreate(op.counter);
        }
        break;

      case StateOperationAction.COUNTER_INC:
        if (this._client.Utils.isNil(op.counterOp)) {
          this._throwNoPayloadError(op);
        } else {
          this._applyCounterInc(op.counterOp);
        }
        break;

      default:
        throw new this._client.ErrorInfo(
          `Invalid ${op.action} op for LiveCounter objectId=${this.getObjectId()}`,
          50000,
          500,
        );
    }
  }

  protected _getZeroValueData(): LiveCounterData {
    return { data: 0 };
  }

  private _throwNoPayloadError(op: StateOperation): void {
    throw new this._client.ErrorInfo(
      `No payload found for ${op.action} op for LiveCounter objectId=${this.getObjectId()}`,
      50000,
      500,
    );
  }

  private _applyCounterCreate(op: StateCounter): void {
    if (this.isCreated()) {
      // skip COUNTER_CREATE op if this counter is already created
      this._client.Logger.logAction(
        this._client.logger,
        this._client.Logger.LOG_MICRO,
        'LiveCounter._applyCounterCreate()',
        `skipping applying COUNTER_CREATE op on a counter instance as it is already created; objectId=${this._objectId}`,
      );
      return;
    }

    // note that it is intentional to SUM the incoming count from the create op.
    // if we get here, it means that current counter instance wasn't initialized from the COUNTER_CREATE op,
    // so it is missing the initial value that we're going to add now.
    this._dataRef.data += op.count ?? 0;
    this.setCreated(true);
  }

  private _applyCounterInc(op: StateCounterOp): void {
    this._dataRef.data += op.amount;
  }
}
