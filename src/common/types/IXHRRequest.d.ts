import EventEmitter from '../lib/util/eventemitter';

/**
 * A common interface shared by the browser and NodeJS XHRRequest implementations
 *
 * Expected to emit the following events:
 *
 * - 'data': When a new chunk is received. A _chunk_ is extracted from the response data by reading until a "\n" is encountered.
 *
 *   Event args:
 *
 *   - data (string | Record<string, any>): The received chunk. This should be either a string containing a JSON-serialized object, or an object which is the result of deserializing the chunk.
 *
 * - 'complete': When the entire response has been received, or an error has occurred. May be preceded by one or more 'data' events.
 *
 *   Event args:
 *
 *   - err (ErrorInfo | null): Any error that occurred. Either a protocol error received from Realtime, or a network/XHR error.
 */
export default interface IXHRRequest extends EventEmitter {
  exec(): void;
  abort(): void;
}
