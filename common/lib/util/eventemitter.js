var EventEmitter = (function() {

	/* public constructor */
	function EventEmitter() {
		this.any = [];
		this.events = {};
		this.anyOnce = [];
		this.eventsOnce = {};
	}

	/* Call the listener, catch any exceptions and log, but continue operation*/
	function callListener(eventThis, listener, args) {
		try {
			listener.apply(eventThis, args);
		} catch(e) {
			Logger.logAction(Logger.LOG_ERROR, 'EventEmitter.emit()', 'Unexpected listener exception: ' + e + '; stack = ' + e.stack);
		}
	}

	/**
	 * Remove listeners that match listener
	 * @param targetListeners is an array of listener arrays or event objects with arrays of listeners
	 * @param listener the listener to remove
	 */
	function removeListener(targetListeners, listener) {
		var listeners, idx, eventName, targetListenersIndex;

		for (targetListenersIndex = 0; targetListenersIndex < targetListeners.length; targetListenersIndex++) {
			listeners = targetListeners[targetListenersIndex];
			if (Utils.isArray(listeners)) {
				while ((idx = Utils.arrIndexOf(listeners, listener)) !== -1) {
					listeners.splice(idx, 1);
				}
			} else if (Utils.isObject(listeners)) {
				/* events */
				for (eventName in listeners) {
					if (listeners.hasOwnProperty(eventName) && Utils.isArray(listeners[eventName])) {
						removeListener([listeners[eventName]], listener);
					}
				}
			}
		}
	}

	/**
	 * Add an event listener
	 * @param event (optional) the name of the event to listen to
	 *        if not supplied, all events trigger a call to the listener
	 * @param listener the listener to be called
	 */
	EventEmitter.prototype.on = function(event, listener) {
		if(arguments.length == 1 && typeof(event) == 'function') {
			this.any.push(event);
		} else if(Utils.isEmptyArg(event)) {
			this.any.push(listener);
		} else {
			var listeners = (this.events[event] || (this.events[event] = []));
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
	EventEmitter.prototype.off = function(event, listener) {
		if(arguments.length == 0 || (Utils.isEmptyArg(event) && Utils.isEmptyArg(listener))) {
			this.any = [];
			this.events = {};
			this.anyOnce = [];
			this.eventsOnce = {};
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

		if(Utils.isEmptyArg(event)) {
			/* "any" case */
			if(listener) {
				removeListener([this.any, this.events, this.anyOnce, this.eventsOnce], listener);
			} else {
				this.any = [];
				this.anyOnce = [];
			}
			return;
		}
		/* "normal" case where event is an actual event */
		if(listener) {
			removeListener([this.events[event], this.eventsOnce[event]], listener);
		} else {
			delete this.events[event];
			delete this.eventsOnce[event];
		}
	};

	/**
	 * Get the array of listeners for a given event; excludes once events
	 * @param event (optional) the name of the event, or none for 'any'
	 * @return array of events, or null if none
	 */
	EventEmitter.prototype.listeners = function(event) {
		if(event) {
			var listeners = (this.events[event] || []);
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
	EventEmitter.prototype.emit = function(event  /* , args... */) {
		var args = Array.prototype.slice.call(arguments, 1);
		var eventThis = {event:event};

		if(this.anyOnce.length) {
			var listeners = this.anyOnce;
			this.anyOnce = [];
			for(var i = 0; i < listeners.length; i++)
				callListener(eventThis, listeners[i], args);
		}
		for(var i = 0; i < this.any.length; i++)
			this.any[i].apply(eventThis, args);
		var listeners = this.eventsOnce[event];
		if(listeners) {
			delete this.eventsOnce[event];
			for(var i = 0; i < listeners.length; i++)
				callListener(eventThis, listeners[i], args);
		}
		var listeners = this.events[event];
		if(listeners)
			for(var i = 0; i < listeners.length; i++)
				callListener(eventThis, listeners[i], args);
	};

	/**
	 * Listen for a single occurrence of an event
	 * @param event the name of the event to listen to
	 * @param listener the listener to be called
	 */
	EventEmitter.prototype.once = function(event, listener) {
		if(arguments.length == 1 && typeof(event) == 'function') {
			this.anyOnce.push(event);
		} else if(Utils.isEmptyArg(event)) {
			this.anyOnce.push(listener);
		} else {
			var listeners = (this.eventsOnce[event] || (this.eventsOnce[event] = []));
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
	EventEmitter.prototype.whenState = function(targetState, currentState, listener /* ...listenerArgs */) {
		var eventThis = {event:targetState},
				listenerArgs = Array.prototype.slice.call(arguments, 3);

		if((typeof(targetState) !== 'string') || (typeof(currentState) !== 'string'))
			throw("whenState requires a valid event String argument");
		if (typeof(listener) !== 'function')
			throw("whenState requires a valid listener argument");

		if(targetState === currentState) {
			callListener(eventThis, listener, listenerArgs);
		} else {
			this.once(targetState, listener);
		}
	}

	return EventEmitter;
})();
