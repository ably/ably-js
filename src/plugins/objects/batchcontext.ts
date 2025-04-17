import type BaseClient from 'common/lib/client/baseclient';
import type * as API from '../../../ably';
import { BatchContextLiveCounter } from './batchcontextlivecounter';
import { BatchContextLiveMap } from './batchcontextlivemap';
import { LiveCounter } from './livecounter';
import { LiveMap } from './livemap';
import { ObjectMessage } from './objectmessage';
import { Objects } from './objects';
import { ROOT_OBJECT_ID } from './objectspool';

export class BatchContext {
  private _client: BaseClient;
  /** Maps object ids to the corresponding batch context object wrappers  */
  private _wrappedObjects: Map<string, BatchContextLiveCounter | BatchContextLiveMap<API.LiveMapType>> = new Map();
  private _queuedMessages: ObjectMessage[] = [];
  private _isClosed = false;

  constructor(
    private _objects: Objects,
    private _root: LiveMap<API.LiveMapType>,
  ) {
    this._client = _objects.getClient();
    this._wrappedObjects.set(this._root.getObjectId(), new BatchContextLiveMap(this, this._objects, this._root));
  }

  getRoot<T extends API.LiveMapType = API.DefaultRoot>(): BatchContextLiveMap<T> {
    this._objects.throwIfInvalidAccessApiConfiguration();
    this.throwIfClosed();
    return this.getWrappedObject(ROOT_OBJECT_ID) as BatchContextLiveMap<T>;
  }

  /**
   * @internal
   */
  getWrappedObject(objectId: string): BatchContextLiveCounter | BatchContextLiveMap<API.LiveMapType> | undefined {
    if (this._wrappedObjects.has(objectId)) {
      return this._wrappedObjects.get(objectId);
    }

    const originObject = this._objects.getPool().get(objectId);
    if (!originObject) {
      return undefined;
    }

    let wrappedObject: BatchContextLiveCounter | BatchContextLiveMap<API.LiveMapType>;
    if (originObject instanceof LiveMap) {
      wrappedObject = new BatchContextLiveMap(this, this._objects, originObject);
    } else if (originObject instanceof LiveCounter) {
      wrappedObject = new BatchContextLiveCounter(this, this._objects, originObject);
    } else {
      throw new this._client.ErrorInfo(
        `Unknown LiveObject instance type: objectId=${originObject.getObjectId()}`,
        50000,
        500,
      );
    }

    this._wrappedObjects.set(objectId, wrappedObject);
    return wrappedObject;
  }

  /**
   * @internal
   */
  throwIfClosed(): void {
    if (this.isClosed()) {
      throw new this._client.ErrorInfo('Batch is closed', 40000, 400);
    }
  }

  /**
   * @internal
   */
  isClosed(): boolean {
    return this._isClosed;
  }

  /**
   * @internal
   */
  close(): void {
    this._isClosed = true;
  }

  /**
   * @internal
   */
  queueMessage(msg: ObjectMessage): void {
    this._queuedMessages.push(msg);
  }

  /**
   * @internal
   */
  async flush(): Promise<void> {
    try {
      this.close();

      if (this._queuedMessages.length > 0) {
        await this._objects.publish(this._queuedMessages);
      }
    } finally {
      this._wrappedObjects.clear();
      this._queuedMessages = [];
    }
  }
}
