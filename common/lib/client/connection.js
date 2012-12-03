var Connection = (function() {

	/* public constructor */
	function Connection(ably, options) {
		EventEmitter.call(this);
		this.ably = ably;
		this.connectionManager = new ConnectionManager(ably, options);
		this.state = this.connectionManager.state.state;
		this.id = undefined;

		var self = this;
		this.connectionManager.on(function(stateChange) {
			self.state = stateChange.current;
			Utils.nextTick(function() {
				self.emit(self.state, stateChange);
			});
		});
	}
	Utils.inherits(Connection, EventEmitter);

	/* public instance methods */
	Connection.prototype.on = function(state, callback) {
		EventEmitter.prototype.on.call(this, state, callback);
		if(this.state == state && callback)
			try {
				callback(new ConnectionStateChange(undefined, state));
			} catch(e) {}
	};

	Connection.prototype.connect = function() {
		this.connectionManager.requestState({state: 'connecting'});
	};

	return Connection;
})();
