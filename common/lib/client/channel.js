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
		var rest = this.rest;
		var headers = Utils.copy(Utils.defaultGetHeaders(!rest.options.useTextProtocol));
		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);
		Resource.get(rest, '/channels/' + this.name + '/presence', headers, params, callback);
	};

	Channel.prototype.history = function(params, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Channel.history()', 'channel = ' + this.name);
		var rest = this.rest;
		var headers = Utils.copy(Utils.defaultGetHeaders(!rest.options.useTextProtocol));
		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);
		Resource.get(rest, '/channels/' + this.name + '/history', headers, params, callback);
	};

	Channel.prototype.publish = function(name, data, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Channel.publish()', 'channel = ' + this.name + '; name = ' + name);
		var rest = this.rest;
		var binary = !rest.options.useTextProtocol;
		var requestBody;
		if(binary) {
			/* FIXME: binary not yet supported here .... */
			Logger.logAction(Logger.LOG_ERROR, 'Channel.publish()', 'Unable to publish message in binary format (not supported yet)');
			binary = false;
			requestBody = {name:name, data:data};
		} else {
			requestBody = {name:name, data:data};
		}
		var headers = Utils.copy(Utils.defaultPostHeaders(binary));
		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);
		Resource.post(rest, '/channels/' + this.name + '/publish', requestBody, headers, null, callback);
	};

	return Channel;
})();
