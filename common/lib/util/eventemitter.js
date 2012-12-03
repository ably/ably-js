var EventEmitter = (function() {

	/* public constructor */
	function EventEmitter() {
		this.any = [];
		this.events = {};
		this.anyOnce = [];
		this.eventsOnce = {};
	}

	/**
	 * Add an event listener
	 * @param event (optional) the name of the event to listen to
	 *        if not supplied, all events trigger a call to the listener
	 * @param listener the listener to be called
	 */
	EventEmitter.prototype.on = function(event, listener) {
		if(arguments.length == 2) {
			var listeners = this.events[event] = this.events[event] || [];
			listeners.push(listener);
			return;
		}
		if(typeof(event) == 'function')
			this.any.push(event);
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
		if(arguments.length == 2) {
			if(listener) {
				var listeners, idx = -1;
				if(!(listeners = this.events[event]) || (idx = listeners.indexOf(listener)) == -1) {
					if(listeners = this.eventsOnce[event])
						idx = listeners.indexOf(listener);
				}
				if(idx > -1)
					listeners.splice(idx, 1);
			} else {
				delete this.events[event];
				delete this.eventsOnce[event];
			}
			return;
		}
		if(typeof(event) == 'function') {
			var listeners = this.any;
			var idx = listeners.indexOf(event);
			if(idx == -1) {
				listeners = this.anyOnce;
				idx = listeners.indexOf(event);
			}
			if(idx > -1)
				listeners.splice(idx, 1);
			return;
		}
		this.any = [];
		this.events = {};
		this.anyOnce = [];
		this.eventsOnce = {};
	};

	/**
	 * Get the array of listeners for a given event; excludes once events
	 * @param event (optional) the name of the event, or none for 'any'
	 * @return array of events, or null if none
	 */
	EventEmitter.prototype.listeners = function(event) {
		if(event)
			return this.events[event];
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
				listeners[i].apply(eventThis, args);
		}
		for(var i = 0; i < this.any.length; i++)
			this.any[i].apply(eventThis, args);
		var listeners = this.eventsOnce[event];
		if(listeners) {
			delete this.eventsOnce[event];
			for(var i = 0; i < listeners.length; i++)
				listeners[i].apply(eventThis, args);
		}
		var listeners = this.events[event];
		if(listeners)
			for(var i = 0; i < listeners.length; i++)
				listeners[i].apply(eventThis, args);
	};

	/**
	 * Listen for a single occurrence of an event
	 * @param event the name of the event to listen to
	 * @param listener the listener to be called
	 */
	EventEmitter.prototype.once = function(event, listener) {
		if(arguments.length == 2) {
			var listeners = this.eventsOnce[event] = this.eventsOnce[event] || [];
			listeners.push(listener);
			return;
		}
		if(typeof(event) == 'function')
			this.anyOnce.push(event);
	};

	return EventEmitter;
})();
