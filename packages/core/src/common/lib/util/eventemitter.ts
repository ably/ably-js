import { EventEmitter as CoreEventEmitter } from '../../../eventemitter';
import Logger from './logger';

/**
 * The core's EventEmitter (src/eventemitter.ts), bound to this SDK's logger: a listener that throws
 * is logged at error level against the logger of the client that owns the emitter.
 *
 * The emitter itself lives in the core's runtime so that there is one copy shared with the SDKs
 * layered on Pub/Sub; this subclass only adds the SDK-specific logging.
 */
class EventEmitter extends CoreEventEmitter {
  constructor(readonly logger: Logger) {
    super({
      onListenerError: (e) =>
        Logger.logAction(
          logger,
          Logger.LOG_ERROR,
          'EventEmitter.emit()',
          'Unexpected listener exception: ' + e + '; stack = ' + (e && (e as Error).stack),
        ),
    });
  }
}

export default EventEmitter;
