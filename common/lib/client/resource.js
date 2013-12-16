var Resource = (function() {
	function Resource() {}

	function withAuthDetails(rest, headers, params, errCallback, opCallback) {
		if (Http.supportsAuthHeaders) {
			rest.auth.getAuthHeaders(function(err, authHeaders) {
				if(err)
					errCallback(err);
				else
					opCallback(Utils.mixin(authHeaders, headers), params);
			});
		} else {
			rest.auth.getAuthParams(function(err, authParams) {
				if(err)
					errCallback(err);
				else
					opCallback(headers, Utils.mixin(authParams, params));
			});
		}
	}

	Resource.get = function(rest, path, origheaders, origparams, callback) {
		function doGet(headers, params) {
			Http.get(rest, path, headers, params, function(err, res, headers) {
				if(err && err.code == 40140) {
					/* token has expired, so get a new one */
					rest.auth.authorise({force:true}, function(err) {
						if(err) {
							callback(err);
							return;
						}
						/* retry ... */
						withAuthDetails(rest, origheaders, origparams, callback, doGet);
					});
					return;
				}
				callback(err, res, headers);
			});
		}
		withAuthDetails(rest, origheaders, origparams, callback, doGet);
	};

	Resource.post = function(rest, path, body, origheaders, origparams, callback) {
		function doPost(headers, params) {
			Http.post(rest, path, headers, body, params, function(err, res, headers) {
				if(err && err.code == 40140) {
					/* token has expired, so get a new one */
					rest.auth.authorise({force:true}, function(err) {
						if(err) {
							callback(err);
							return;
						}
						/* retry ... */
						withAuthDetails(rest, origheaders, origparams, callback, doPost);
					});
					return;
				}
				callback(err, res, headers);
			});
		}
		withAuthDetails(rest, origheaders, origparams, callback, doPost);
	};

	return Resource;
})();
