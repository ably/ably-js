var ChannelStateChange = (function() {

	/* public constructor */
	function ChannelStateChange(previous, current, resumed, reason) {
		this.previous = previous;
		this.current = current;
		this.resumed = resumed;
		if(reason) this.reason = reason;
	}

	return ChannelStateChange;
})();
