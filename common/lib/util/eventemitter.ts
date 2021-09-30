import * as Utils from './utils';
import Logger from './logger';
import Platform from 'platform';

/* Call the listener, catch any exceptions and log, but continue operation*/
function callListener(eventThis: { event: string }, listener: Function, args: unknown[]) {
	try {
		listener.apply(eventThis, args);
	} catch(e) {
		Logger.logAction(Logger.LOG_ERROR, 'EventEmitter.emit()', 'Unexpected listener exception: ' + e + '; stack = ' + (e && (e as Error).stack));
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
	let idx;
	let eventName;

	for (let targetListenersIndex = 0; targetListenersIndex < targetListeners.length; targetListenersIndex++) {
		listeners = targetListeners[targetListenersIndex];
		if (eventFilter) { listeners = listeners[eventFilter] as Record<string, unknown>; }

		if (Utils.isArray(listeners)) {
			while ((idx = Utils.arrIndexOf(listeners, listener)) !== -1) {
				listeners.splice(idx, 1);
			}
			/* If events object has an event name key with no listeners then
					remove the key to stop the list growing indefinitely */
			if (eventFilter && (listeners.length === 0)) {
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
	 * @param event (optional) the name of the event to listen to
	 *        if not supplied, all events trigger a call to the listener
	 * @param listener the listener to be called
	 */
	on (event: string, listener: Function) {
		if(arguments.length == 1 && typeof(event) == 'function') {
			this.any.push(event);
		} else if(Utils.isEmptyArg(event)) {
			this.any.push(listener);
		} else if(Utils.isArray(event)) {
			event.forEach((ev) => {
				this.on(ev, listener);
			})
		} else {
			const listeners = (this.events[event] || (this.events[event] = []));
			listeners.push(listener);
		}
};

	/**
	 * Remove one or more event listeners
	 * @param event (optional) the name of the event whose listener
	 *        is to be removed. If not supplied, the listener is
	 *        treated as an 'any' listener
	 * @param listener (optional) the listener to remove. If not
	 *        supplied, all listeners are removed.
	 */
	off(event: string | null, listener: Function) {
		if(arguments.length == 0 || (Utils.isEmptyArg(event) && Utils.isEmptyArg(listener))) {
			this.any = [];
			this.events = Object.create(null);
			this.anyOnce = [];
			this.eventsOnce = Object.create(null);
			return;
		}
		if(arguments.length == 1) {
			if(typeof(event) == 'function') {
				/* we take this to be the listener and treat the event as "any" .. */
				listener = event;
				event = null;
			}
			/* ... or we take event to be the actual event name and listener to be all */
		}

		if(listener && Utils.isEmptyArg(event)) {
			removeListener([this.any, this.events, this.anyOnce, this.eventsOnce], listener);
			return;
		}

		if(Utils.isArray(event)) {
			event.forEach((ev) => {
				this.off(ev, listener);
			});
		}

		/* "normal" case where event is an actual event */
		if(listener) {
			removeListener([this.events, this.eventsOnce], listener, event as string);
		} else {
			delete this.events[event as string];
			delete this.eventsOnce[event as string];
		}
	};

	/**
	 * Get the array of listeners for a given event; excludes once events
	 * @param event (optional) the name of the event, or none for 'any'
	 * @return array of events, or null if none
	 */
	listeners(event: string) {
		if(event) {
			const listeners = (this.events[event] || []);
			if(this.eventsOnce[event])
				Array.prototype.push.apply(listeners, this.eventsOnce[event]);
			return listeners.length ? listeners : null;
		}
		return this.any.length ? this.any : null;
	};

	/**
	 * Emit an event
	 * @param event the event name
	 * @param args the arguments to pass to the listener
	 */
	emit (event: string, ...args: unknown[]  /* , args... */) {
		const eventThis = { event };
		const listeners: Function[] = [];

		if(this.anyOnce.length) {
			Array.prototype.push.apply(listeners, this.anyOnce);
			this.anyOnce = [];
		}
		if(this.any.length) {
			Array.prototype.push.apply(listeners, this.any);
		}
		const eventsOnceListeners = this.eventsOnce[event];
		if(eventsOnceListeners) {
			Array.prototype.push.apply(listeners, eventsOnceListeners);
			delete this.eventsOnce[event];
		}
		const eventsListeners = this.events[event];
		if(eventsListeners) {
			Array.prototype.push.apply(listeners, eventsListeners);
		}

		Utils.arrForEach(listeners, function(listener) {
			callListener(eventThis, listener, args);
		});
	};

	/**
	 * Listen for a single occurrence of an event
	 * @param event the name of the event to listen to
	 * @param listener the listener to be called
	 */
	once(event: string, listener: Function) {
		const argCount = arguments.length;
		const self = this;

		if((argCount === 0 || (argCount === 1 && typeof event !== 'function')) && Platform.Promise) {
			return new Platform.Promise((resolve) => {
				this.once(event, resolve);
			});
		}
		if(arguments.length == 1 && typeof(event) == 'function') {
			this.anyOnce.push(event);
		} else if(Utils.isEmptyArg(event)) {
			this.anyOnce.push(listener);
		} else if(Utils.isArray(event)){
			var listenerWrapper = function(this: any) {
				var args = Array.prototype.slice.call(arguments);
				Utils.arrForEach(event, function(ev) {
					self.off(ev, listenerWrapper);
				});
				listener.apply(this, args);
			};
			Utils.arrForEach(event, function(ev) {
				self.on(ev, listenerWrapper);
			});
		} else {
			const listeners = (this.eventsOnce[event] || (this.eventsOnce[event] = []));
			listeners.push(listener);
		}
	};

	/**
	 * Private API
	 *
	 * Listen for a single occurrence of a state event and fire immediately if currentState matches targetState
	 * @param targetState the name of the state event to listen to
	 * @param currentState the name of the current state of this object
	 * @param listener the listener to be called
	 */
	private whenState(targetState: string, currentState: string, listener: Function, ...listenerArgs: unknown[] /* ...listenerArgs */) {
		const eventThis = { event: targetState };

		if((typeof(targetState) !== 'string') || (typeof(currentState) !== 'string')) {
			throw("whenState requires a valid event String argument");
		}
		if(typeof listener !== 'function' && Platform.Promise) {
			return new Platform.Promise(function(resolve) {
				EventEmitter.prototype.whenState.apply(self, [targetState, currentState, resolve].concat(listenerArgs as any[]) as any);
			});
		}
		if(targetState === currentState) {
			callListener(eventThis, listener, listenerArgs);
		} else {
			this.once(targetState, listener);
		}
	}
}

export default EventEmitter;
