"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	var Defaults = Ably.Rest.Defaults;
	var currentTime, exports = {};

	exports.setupauth = function(test) {
		test.expect(1);
		helper.setupApp(function() {
			var rest = helper.AblyRest();
			(function(callback) {
				rest.time(function(err, time) {
					if(err) { callback(err); }
					callback(null, time);
				});
			})(function(err, time) {
				if(err) {
					test.ok(false, helper.displayError(err));
					test.done();
					return;
				}
				currentTime = time;
				test.ok(true, 'Obtained time');
				test.done();
			});
		});
	};

	/*
	 * tls:true initiates https connection 
	 */
	exports.tls_connection = function(test) {
		test.expect(3);

		var rest = helper.AblyRest();
		rest.auth.requestToken( function(err, tokenDetails) {
			test.ok(rest.options.tls, 'TLS authentication was attempted (default)');
			test.equal(rest.baseUri().substr(0,5), "https", 'Attempted to request token from TLS URL (default)');
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}
			test.ok( tokenDetails.token, 'Verify token value');
			test.done();
		});
	};

	/*
	 * tls:false initiates an http connection. 
	 */
	exports.non_tls_connection = function(test) {
		test.expect(3);

		var rest = helper.AblyRest({ tls: false });

		rest.auth.requestToken(function(err, tokenDetails) {
			test.ok(!rest.options.tls, 'Non-TLS authentication was attempted');
			test.equal(rest.baseUri().substr(0,5), "http:", 'Attempted to request token from non-TLS URL');
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}
			test.ok( tokenDetails.token, 'Verify token value');
			test.done();
		});
	};

	/*
	 * The combination of tls:false and basic auth throws. 
	 */
	exports.basic_auth_no_tls_throws = function(test) {
		test.expect(4);

		var keyStr = helper.getTestApp().keys[1].keyStr,
			rest = helper.AblyRest({ tls: false }, { key: keyStr });

		rest.auth.requestToken(function(err, tokenDetails) {
			test.equals( rest.auth.method, 'basic', 'Basic authentication was set');
			test.ok( !rest.options.tls, 'Non-TLS authentication was set');
			test.equal(rest.baseUri().substr(0,5), "http:", 'Attempted to request token from non-TLS URL');
			if(err) {
				//TODO see why code does not enter here
				test.equal(err.code, 40103, 'Throwing error 40103 for basic auth over non-TLS connection');
				test.done();
				return;
			}
			
			test.ok(false,'Did not raise error for basic auth over non-TLS connection');
			test.done();
		});
	};

	return module.exports = helper.withTimeout(exports);
});


