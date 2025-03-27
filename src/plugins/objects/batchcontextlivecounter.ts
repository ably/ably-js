import type BaseClient from 'common/lib/client/baseclient';
import { BatchContext } from './batchcontext';
import { LiveCounter } from './livecounter';
import { Objects } from './objects';

export class BatchContextLiveCounter {
  private _client: BaseClient;

  constructor(
    private _batchContext: BatchContext,
    private _objects: Objects,
    private _counter: LiveCounter,
  ) {
    this._client = this._objects.getClient();
  }

  value(): number {
    this._objects.throwIfInvalidAccessApiConfiguration();
    this._batchContext.throwIfClosed();
    return this._counter.value();
  }

  increment(amount: number): void {
    this._objects.throwIfInvalidWriteApiConfiguration();
    this._batchContext.throwIfClosed();
    const msg = LiveCounter.createCounterIncMessage(this._objects, this._counter.getObjectId(), amount);
    this._batchContext.queueMessage(msg);
  }

  decrement(amount: number): void {
    this._objects.throwIfInvalidWriteApiConfiguration();
    this._batchContext.throwIfClosed();
    // do an explicit type safety check here before negating the amount value,
    // so we don't unintentionally change the type sent by a user
    if (typeof amount !== 'number') {
      throw new this._client.ErrorInfo('Counter value decrement should be a number', 40003, 400);
    }

    this.increment(-amount);
  }
}
