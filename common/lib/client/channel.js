var Channel = (function() {
	var noop = function() {};

	/* public constructor */
	function Channel(rest, name, options) {
		Logger.logAction(Logger.LOG_MINOR, 'Channel()', 'started; name = ' + name);
		EventEmitter.call(this);
		this.rest = rest;
    	this.name = name;
	}
	Utils.inherits(Channel, EventEmitter);

	Channel.prototype.presence = function(params, callback) {
		Resource.get(this, '/channels/' + this.name + '/presence', params, callback);
	};

	Channel.prototype.history = function(params, callback) {
		Resource.get(this, '/channels/' + this.name + '/events', params, callback);
	};

	Channel.prototype.stats = function(params, callback) {
		Resource.get(this, '/channels/' + this.name + '/stats', params, callback);
	};

	Channel.prototype.publish = function(name, data, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Channel.publish()', 'name = ' + name);
		Resource.post(this.rest, '/channels/' + this.name + '/publish', {name:name, payload:data}, callback);
	};

	return Channel;
})();
