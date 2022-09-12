import * as Utils from './utils';
import Logger from './logger';
import Platform from 'common/platform';

/* Call the listener, catch any exceptions and log, but continue operation*/
function callListener(eventThis: { event: string }, listener: Function, args: unknown[]) {
  try {
    listener.apply(eventThis, args);
  } catch (e) {
    Logger.logAction(
      Logger.LOG_ERROR,
      'EventEmitter.emit()',
      'Unexpected listener exception: ' + e + '; stack = ' + (e && (e as Error).stack)
    );
  }
}

/**
 * Remove listeners that match listener
 * @param targetListeners is an array of listener arrays or event objects with arrays of listeners
 * @param listener the listener callback to remove
 * @param eventFilter (optional) event name instructing the function to only remove listeners for the specified event
 */
function removeListener(targetListeners: any, listener: Function, eventFilter?: string) {
  let listeners: Record<string, unknown>;
  let index;
  let eventName;

  for (let targetListenersIndex = 0; targetListenersIndex < targetListeners.length; targetListenersIndex++) {
    listeners = targetListeners[targetListenersIndex];
    if (eventFilter) {
      listeners = listeners[eventFilter] as Record<string, unknown>;
    }

    if (Utils.isArray(listeners)) {
      while ((index = Utils.arrIndexOf(listeners, listener)) !== -1) {
        listeners.splice(index, 1);
      }
      /* If events object has an event name key with no listeners then
					remove the key to stop the list growing indefinitely */
      if (eventFilter && listeners.length === 0) {
        delete targetListeners[targetListenersIndex][eventFilter];
      }
    } else if (Utils.isObject(listeners)) {
      /* events */
      for (eventName in listeners) {
        if (Object.prototype.hasOwnProperty.call(listeners, eventName) && Utils.isArray(listeners[eventName])) {
          removeListener([listeners], listener, eventName);
        }
      }
    }
  }
}

class EventEmitter {
  any: Array<Function>;
  events: Record<string, Array<Function>>;
  anyOnce: Array<Function>;
  eventsOnce: Record<string, Array<Function>>;

  constructor() {
    this.any = [];
    this.events = Object.create(null);
    this.anyOnce = [];
    this.eventsOnce = Object.create(null);
  }

  /**
   * Add an event listener
   * @param listener the listener to be called
   */
  on(listener: Function): void;

  /**
   * Add an event listener
   * @param event (optional) the name of the event to listen to
   * @param listener the listener to be called
   */
  on(event: null | string | string[], listener: Function): void;

  on(...args: unknown[]) {
    if (args.length === 1) {
      const listener = args[0];
      if (typeof listener === 'function') {
        this.any.push(listener);
      } else {
        throw new Error('EventListener.on(): Invalid arguments: ' + Platform.Config.inspect(args));
      }
    }
    if (args.length === 2) {
      const [event, listener] = args;
      if (typeof listener !== 'function') {
        throw new Error('EventListener.on(): Invalid arguments: ' + Platform.Config.inspect(args));
      }
      if (Utils.isEmptyArg(event)) {
        this.any.push(listener);
      } else if (Utils.isArray(event)) {
        event.forEach((eventName) => {
          this.on(eventName, listener);
        });
      } else {
        if (typeof event !== 'string') {
          throw new Error('EventListener.on(): Invalid arguments: ' + Platform.Config.inspect(args));
        }
        const listeners = this.events[event] || (this.events[event] = []);
        listeners.push(listener);
      }
    }
  }

  /**
   * Remove one or more event listeners
   * @param listener (optional) the listener to remove. If not
   *        supplied, all listeners are removed.
   */
  off(listener?: Function): void;

  /**
   * Remove one or more event listeners
   * @param event (optional) the name of the event whose listener
   *        is to be removed. If not supplied, the listener is
   *        treated as an 'any' listener
   * @param listener (optional) the listener to remove. If not
   *        supplied, all listeners are removed.
   */
  off(event: string | string[] | null, listener?: Function | null): void;

  off(...args: unknown[]) {
    if (args.length == 0 || (Utils.isEmptyArg(args[0]) && Utils.isEmptyArg(args[1]))) {
      this.any = [];
      this.events = Object.create(null);
      this.anyOnce = [];
      this.eventsOnce = Object.create(null);
      return;
    }
    const [firstArg, secondArg] = args;
    let listener: Function | null = null;
    let event: unknown = null;
    if (args.length === 1 || !secondArg) {
      if (typeof firstArg === 'function') {
        /* we take this to be the listener and treat the event as "any" .. */
        listener = firstArg;
      } else {
        event = firstArg;
      }
      /* ... or we take event to be the actual event name and listener to be all */
    } else {
      if (typeof secondArg !== 'function') {
        throw new Error('EventEmitter.off(): invalid arguments:' + Platform.Config.inspect(args));
      }
      [event, listener] = [firstArg, secondArg];
    }

    if (listener && Utils.isEmptyArg(event)) {
      removeListener([this.any, this.events, this.anyOnce, this.eventsOnce], listener);
      return;
    }

    if (Utils.isArray(event)) {
      event.forEach((eventName) => {
        this.off(eventName, listener);
      });
      return;
    }

    /* "normal" case where event is an actual event */
    if (typeof event !== 'string') {
      throw new Error('EventEmitter.off(): invalid arguments:' + Platform.Config.inspect(args));
    }
    if (listener) {
      removeListener([this.events, this.eventsOnce], listener, event);
    } else {
      delete this.events[event];
      delete this.eventsOnce[event];
    }
  }

  /**
   * Get the array of listeners for a given event; excludes once events
   * @param event (optional) the name of the event, or none for 'any'
   * @return array of events, or null if none
   */
  listeners(event: string) {
    if (event) {
      const listeners = this.events[event] || [];
      if (this.eventsOnce[event]) Array.prototype.push.apply(listeners, this.eventsOnce[event]);
      return listeners.length ? listeners : null;
    }
    return this.any.length ? this.any : null;
  }

  /**
   * Emit an event
   * @param event the event name
   * @param args the arguments to pass to the listener
   */
  emit(event: string, ...args: unknown[] /* , args... */) {
    const eventThis = { event };
    const listeners: Function[] = [];

    if (this.anyOnce.length) {
      Array.prototype.push.apply(listeners, this.anyOnce);
      this.anyOnce = [];
    }
    if (this.any.length) {
      Array.prototype.push.apply(listeners, this.any);
    }
    const eventsOnceListeners = this.eventsOnce[event];
    if (eventsOnceListeners) {
      Array.prototype.push.apply(listeners, eventsOnceListeners);
      delete this.eventsOnce[event];
    }
    const eventsListeners = this.events[event];
    if (eventsListeners) {
      Array.prototype.push.apply(listeners, eventsListeners);
    }

    Utils.arrForEach(listeners, function (listener) {
      callListener(eventThis, listener, args);
    });
  }

  /**
   * Listen for a single occurrence of an event
   * @param event the name of the event to listen to
   */
  once(event: string): Promise<void>;

  /**
   * Listen for a single occurrence of any event
   * @param listener the listener to be called
   */
  once(listener: Function): void;

  /**
   * Listen for a single occurrence of an event
   * @param event the name of the event to listen to
   * @param listener the listener to be called
   */
  once(event?: string | string[] | null, listener?: Function): void;

  once(...args: unknown[]): void | Promise<void> {
    const argCount = args.length;
    if ((argCount === 0 || (argCount === 1 && typeof args[0] !== 'function')) && Platform.Config.Promise) {
      const event = args[0];
      return new Platform.Config.Promise((resolve) => {
        this.once(event as string | string[] | null, resolve);
      });
    }

    const [firstArg, secondArg] = args;
    if (args.length === 1 && typeof firstArg === 'function') {
      this.anyOnce.push(firstArg);
    } else if (Utils.isEmptyArg(firstArg)) {
      if (typeof secondArg !== 'function') {
        throw new Error('EventEmitter.once(): Invalid arguments:' + Platform.Config.inspect(args));
      }
      this.anyOnce.push(secondArg);
    } else if (Utils.isArray(firstArg)) {
      const self = this;
      const listenerWrapper = function (this: any) {
        const innerArgs = Array.prototype.slice.call(arguments);
        Utils.arrForEach(firstArg, function (eventName) {
          self.off(eventName, listenerWrapper);
        });
        if (typeof secondArg !== 'function') {
          throw new Error('EventEmitter.once(): Invalid arguments:' + Platform.Config.inspect(args));
        }
        secondArg.apply(this, innerArgs);
      };
      Utils.arrForEach(firstArg, function (eventName) {
        self.on(eventName, listenerWrapper);
      });
    } else {
      if (typeof firstArg !== 'string') {
        throw new Error('EventEmitter.once(): Invalid arguments:' + Platform.Config.inspect(args));
      }
      const listeners = this.eventsOnce[firstArg] || (this.eventsOnce[firstArg] = []);
      if (secondArg) {
        if (typeof secondArg !== 'function') {
          throw new Error('EventEmitter.once(): Invalid arguments:' + Platform.Config.inspect(args));
        }
        listeners.push(secondArg);
      }
    }
  }

  /**
   * Private API
   *
   * Listen for a single occurrence of a state event and fire immediately if currentState matches targetState
   * @param targetState the name of the state event to listen to
   * @param currentState the name of the current state of this object
   * @param listener the listener to be called
   * @param listenerArgs
   */
  whenState(targetState: string, currentState: string, listener: Function, ...listenerArgs: unknown[]) {
    const eventThis = { event: targetState };

    if (typeof targetState !== 'string' || typeof currentState !== 'string') {
      throw 'whenState requires a valid event String argument';
    }
    if (typeof listener !== 'function' && Platform.Config.Promise) {
      return new Platform.Config.Promise((resolve) => {
        EventEmitter.prototype.whenState.apply(
          this,
          [targetState, currentState, resolve].concat(listenerArgs as any[]) as any
        );
      });
    }
    if (targetState === currentState) {
      callListener(eventThis, listener, listenerArgs);
    } else {
      this.once(targetState, listener);
    }
  }
}

export default EventEmitter;
