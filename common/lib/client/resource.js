var Resource = (function() {
	function noop() {}

	function Resource() {}

	Resource.get = function(rest, path, headers, params, callback) {
		/* params and callback are optional; see if params contains the callback */
		if(callback === undefined) {
			if(typeof(params) == 'function') {
				callback = params;
				params = null;
			} else {
				callback = noop;
			}
		}
		function tryGet() {
			rest.auth.getAuthHeaders(function(err, authHeaders) {
				if(err) {
					callback(err);
					return;
				}
				Http.get(rest.baseUri + path, Utils.mixin(authHeaders, headers), params, function(err, res) {
					if(err && err.code == 40140) {
						/* token has expired, so get a new one */
						rest.auth.authorise({force:true}, function(err) {
							if(err) {
								callback(err);
								return;
							}
							/* retry ... */
							tryGet();
						});
						return;
					}
					callback(err, res);
				});
			});
		}
		tryGet();
	};

	Resource.post = function(rest, path, body, headers, params, callback) {
		/* params and callback are optional; see if params contains the callback */
		if(callback === undefined) {
			if(typeof(params) == 'function') {
				callback = params;
				params = null;
			} else {
				callback = noop;
			}
		}
		function tryPost() {
			rest.auth.getAuthHeaders(function(err, authHeaders) {
				if(err) {
					callback(err);
					return;
				}
				Http.post(rest.baseUri + path, Utils.mixin(authHeaders, headers), body, params, function(err, res) {
					if(err && err.code == 40140) {
						/* token has expired, so get a new one */
						rest.auth.authorise({force:true}, function(err) {
							if(err) {
								callback(err);
								return;
							}
							/* retry ... */
							tryPost();
						});
						return;
					}
					callback(err, res);
				});
			});
		}
		tryPost();
	};

	return Resource;
})();
