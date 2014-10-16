var ErrorInfo = (function() {

	function ErrorInfo(message, code, statusCode) {
		this.message = message;
		this.code = code;
		this.statusCode = statusCode;
	}

	ErrorInfo.prototype.toString = function() {
		var result = '[' + this.constructor.name;
		if(this.message) result += ': ' + this.message;
		if(this.statusCode) result += '; statusCode=' + this.statusCode;
		if(this.code) result += '; code=' + this.code;
		result += ']';
		return result;
	};

	ErrorInfo.fromValues = function(values) {
		return Utils.mixin(new ErrorInfo(), values);
	};

	return ErrorInfo;
})();
