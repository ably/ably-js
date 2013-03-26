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
		Resource.get(rest, '/channels/' + this.name + '/presence', headers, params, function(err, res) {
			if(err) {
				callback(err);
				return;
			}
			if(binary) PresenceMessage.decodeTPresenceArray(res, callback);
			else callback(null, res);
		});
	};

	Channel.prototype.history = function(params, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Channel.history()', 'channel = ' + this.name);
		var rest = this.rest;
		var headers = Utils.copy(Utils.defaultGetHeaders(!rest.options.useTextProtocol));
		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);
		Resource.get(rest, '/channels/' + this.name + '/history', headers, params, function(err, res) {
			if(err) {
				callback(err);
				return;
			}
			if(binary) Message.decodeTMessageArray(res, callback);
			else callback(null, res);
		});
	};

	Channel.prototype.publish = function(name, data, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'Channel.publish()', 'channel = ' + this.name + '; name = ' + name);
		var rest = this.rest;
		var binary = !rest.options.useTextProtocol;
		var requestBody = {name:name, data:data};
binary = false;
		if(binary) requestBody = Message.encodeTMessageSync(requestBody);
		var headers = Utils.copy(Utils.defaultPostHeaders(binary));
		if(rest.options.headers)
			Utils.mixin(headers, rest.options.headers);
		Resource.post(rest, '/channels/' + this.name + '/publish', requestBody, headers, null, callback);
	};

	return Channel;
})();
