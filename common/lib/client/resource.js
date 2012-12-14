var Resource = (function() {
	function noop() {}

	function Resource() {}

	Resource.get = function(rest, path, params, callback) {
		/* params and callback are optional; see if params contains the callback */
		if(arguments.length < 4) {
			if(typeof(params) == 'function') {
				callback = params;
				params = null;
			} else {
				callback = noop;
			}
		}
		rest.auth.getAuthHeaders(function(err, headers) {
			if(err) {
				callback(err);
				return;
			}
			Http.get(rest.baseUri + path, Utils.mixin(headers, rest.headers), params, callback);
		});
	};

	Resource.post = function(rest, path, body, params, callback) {
		/* params and callback are optional; see if params contains the callback */
		if(arguments.length < 5) {
			if(typeof(params) == 'function') {
				callback = params;
				params = null;
			} else {
				callback = noop;
			}
		}
		rest.auth.getAuthHeaders(function(err, headers) {
			if(err) {
				callback(err);
				return;
			}
			Http.post(rest.baseUri + path, Utils.mixin(headers, rest.headers), body, params, callback);
		});
	};

	return Resource;
})();
