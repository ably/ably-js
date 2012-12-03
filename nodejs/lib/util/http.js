this.Http = (function() {
	var request = require('request');
	var noop = function() {};

	var handler = function(callback) {
		return function(err, response, body) {
			callback = callback || noop;
			if(err) {
				callback(err);
				return;
			}
			var statusCode = response.statusCode;
			if(statusCode >= 300) {
				err = new Error(JSON.stringify(body));
				err.statusCode = statusCode;
				callback(err);
				return;
			}
			callback(null, body);
		};
	};

	function Http() {}

	Http.get = function(uri, headers, params, callback) {
		var options = {uri:uri, headers:headers, json:true};
		if(params)
			options.qs = params;
		request.get(options, handler(callback));
	};

	Http.post = function(uri, headers, body, params, callback) {
		var options = {uri:uri, headers:headers, body:body, json:true};
		if(params)
			options.qs = params;
		request.post(options, handler(callback));
	};

	return Http;
})();
