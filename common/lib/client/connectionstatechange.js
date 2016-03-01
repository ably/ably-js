var ConnectionStateChange = (function() {

	/* public constructor */
	function ConnectionStateChange(previous, current, retryIn, reason) {
		this.previous = previous;
		this.current = current;
		if(retryIn) this.retryIn = retryIn;
		if(reason) {
			this.reason = reason;
			this.errorReason = ErrorInfo.fromValues(reason);
		}
	}

	return ConnectionStateChange;
})();
