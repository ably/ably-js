var Resource = (function() {

	function Resource() {}

	Resource.get = function(rest, path, headers, params, callback) {
		function tryGet() {
			rest.auth.getAuthHeaders(function(err, authHeaders) {
				if(err) {
					callback(err);
					return;
				}
				Http.get(rest, path, Utils.mixin(authHeaders, headers), params, function(err, res, headers) {
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
					callback(err, res, headers);
				});
			});
		}
		tryGet();
	};

	Resource.post = function(rest, path, body, headers, params, callback) {
		function tryPost() {
			rest.auth.getAuthHeaders(function(err, authHeaders) {
				if(err) {
					callback(err);
					return;
				}
				Http.post(rest, path, Utils.mixin(authHeaders, headers), body, params, function(err, res, headers) {
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
					callback(err, res, headers);
				});
			});
		}
		tryPost();
	};

	return Resource;
})();
