var ErrorInfo = (function() {

	function ErrorInfo(message, code, statusCode, cause) {
		this.message = message;
		this.code = code;
		this.statusCode = statusCode;
		this.cause = cause;
		this.href = undefined;
	}

	ErrorInfo.prototype.toString = function() {
		var result = '[' + this.constructor.name;
		if(this.message) result += ': ' + this.message;
		if(this.statusCode) result += '; statusCode=' + this.statusCode;
		if(this.code) result += '; code=' + this.code;
		if(this.cause) result += '; cause=' + Utils.inspectError(this.cause);
		if(this.href && !(this.message && this.message.indexOf('help.ably.io') > -1)) result += '; see ' + this.href + ' ';
		result += ']';
		return result;
	};

	ErrorInfo.fromValues = function(values) {
		var result = Utils.mixin(new ErrorInfo(), values);
		if (values instanceof Error) {
			/* Error.message is not enumerable, so mixin loses the message */
			result.message = values.message;
		}
		if(result.code && !result.href) {
			result.href = 'https://help.ably.io/error/' + result.code;
		}
		return result;
	};

	return ErrorInfo;
})();
