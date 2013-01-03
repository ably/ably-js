var Channel = (function() {

	/* public constructor */
	function Channel(rest, name, options) {
		Logger.logAction(Logger.LOG_MINOR, 'Channel()', 'started; name = ' + name);
		EventEmitter.call(this);
		this.rest = rest;
    	this.name = name;
	}
	Utils.inherits(Channel, EventEmitter);

	Channel.prototype.presence = function(params, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Channel.presence()', 'channel = ' + this.name);
		Resource.get(this.rest, '/channels/' + this.name + '/presence', params, callback);
	};

	Channel.prototype.history = function(params, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Channel.history()', 'channel = ' + this.name);
		Resource.get(this.rest, '/channels/' + this.name + '/history', params, callback);
	};

	Channel.prototype.publish = function(name, data, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Channel.publish()', 'channel = ' + this.name + '; name = ' + name);
		Resource.post(this.rest, '/channels/' + this.name + '/publish', {name:name, data:data}, callback);
	};

	return Channel;
})();
