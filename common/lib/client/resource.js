var Resource = (function() {

	function Resource(rest, path) {
		this.rest = rest;
		this.uri = rest.baseUri + path;
	}

	Resource.prototype.get = function(params, callback) {
		/* params is optional; see if that argument contains the callback */
		if(arguments.length == 1 && typeof(params) == 'function') {
			callback = params;
			params = null;
		}
		var rest = this.rest;
		var uri = this.uri;
		rest.auth.getAuthHeaders(function(err, headers) {
			if(err) {
				callback(err);
				return;
			}
			Http.get(uri, Utils.mixin(headers, rest.headers), params, callback);
		});
	};

	Resource.prototype.post = function(body, params, callback) {
		/* params is optional; see if that argument contains the callback */
		if(arguments.length == 2 && typeof(params) == 'function') {
			callback = params;
			params = null;
		}
		var rest = this.rest;
		var uri = this.uri;
		rest.auth.getAuthHeaders(function(err, headers) {
			if(err) {
				callback(err);
				return;
			}
			Http.post(uri, Utils.mixin(headers, rest.headers), body, params, callback);
		});
	};

	return Resource;
})();
