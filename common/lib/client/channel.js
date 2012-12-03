var Channel = (function() {
	var noop = function() {};

	/* public constructor */
	function Channel(rest, name, options) {
		Logger.logAction(Logger.LOG_MINOR, 'Channel()', 'started; name = ' + name);
		EventEmitter.call(this);
		this.rest = rest;
    	this.name = name;
    	this.presence = new Resource(rest, '/channels/' + name + '/presence');
		this.events = new Resource(rest, '/channels/' + name + '/events');
		this.stats = new Resource(rest, '/channels/' + name + '/stats');
	}
	Utils.inherits(Channel, EventEmitter);

	Channel.prototype.publish = function(name, data, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Channel.publish()', 'name = ' + name);
		callback = callback || noop;
		var publish = this._publish = (this._publish || new Resource(this.rest, '/channels/' + this.name + '/publish'));
		publish.post({name:name, payload:data}, callback);
	};

	return Channel;
})();
