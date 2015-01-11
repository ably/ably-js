var Connection = (function() {

	/* public constructor */
	function Connection(ably, options) {
		EventEmitter.call(this);
		this.ably = ably;
		this.connectionManager = new ConnectionManager(ably, options);
		this.state = this.connectionManager.state.state;
		this.key = undefined;
		this.id = undefined;

		var self = this;
		this.connectionManager.on('connectionstate', function(stateChange) {
			var state = self.state = stateChange.current;
			Utils.nextTick(function() {
				self.emit(state, stateChange);
			});
		});
	}
	Utils.inherits(Connection, EventEmitter);

	/* public instance methods */
	Connection.prototype.on = function(state, callback) {
		EventEmitter.prototype.on.apply(this, arguments);
		if(this.state == state && callback)
			try {
				callback(new ConnectionStateChange(undefined, state));
			} catch(e) {}
	};

	Connection.prototype.connect = function() {
		Logger.logAction(Logger.LOG_MAJOR, 'Connection.connect()', '');
		this.connectionManager.requestState({state: 'connecting'});
	};

	Connection.prototype.ping = function(callback) {
		Logger.logAction(Logger.LOG_MINOR, 'Connection.ping()', '');
		this.connectionManager.ping(null, callback);
	};

	Connection.prototype.close = function() {
		Logger.logAction(Logger.LOG_MAJOR, 'Connection.close()', 'connectionKey = ' + this.key);
		this.connectionManager.requestState({state: 'closing'});
	};

	return Connection;
})();
