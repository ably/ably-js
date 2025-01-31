import type BaseClient from 'common/lib/client/baseclient';
import { BatchContext } from './batchcontext';
import { LiveCounter } from './livecounter';
import { LiveObjects } from './liveobjects';

export class BatchContextLiveCounter {
  private _client: BaseClient;

  constructor(
    private _batchContext: BatchContext,
    private _liveObjects: LiveObjects,
    private _counter: LiveCounter,
  ) {
    this._client = this._liveObjects.getClient();
  }

  value(): number {
    this._liveObjects.throwIfMissingStateSubscribeMode();
    this._batchContext.throwIfClosed();
    return this._counter.value();
  }

  increment(amount: number): void {
    this._liveObjects.throwIfMissingStatePublishMode();
    this._batchContext.throwIfClosed();
    const stateMessage = LiveCounter.createCounterIncMessage(this._liveObjects, this._counter.getObjectId(), amount);
    this._batchContext.queueStateMessage(stateMessage);
  }

  decrement(amount: number): void {
    this._liveObjects.throwIfMissingStatePublishMode();
    this._batchContext.throwIfClosed();
    // do an explicit type safety check here before negating the amount value,
    // so we don't unintentionally change the type sent by a user
    if (typeof amount !== 'number') {
      throw new this._client.ErrorInfo('Counter value decrement should be a number', 40013, 400);
    }

    this.increment(-amount);
  }
}
