"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {};

	/*
	 * Set up.
	 */
	exports.setup = function(test) {
		test.expect(1);
		helper.setupApp(function() {
			var rest = helper.AblyRest();
			test.ok(rest, 'Instantiated rest client');
			test.done();
		});
	};

	/*
	 * tls:true initiates an https connection (RSC18)
	 */
	exports.tls_connection = function(test) {
		test.expect(3);

		var keyStr = helper.getTestApp().keys[0].keyStr,
			rest = helper.AblyRest({ tls: true, key: keyStr, useTokenAuth: false });

		async.parallel([
			function(cb) {
				rest.auth.requestToken(function(err, tokenDetails) {
					test.ok(!err, 'A token request does not cause error with basic auth over tls');
					cb();
				});
			},
			function(cb) {
				rest.stats(function(err, stats) {
					test.ok(!err, 'A stats request does not cause error with basic auth over tls');
					cb();
				});
			}
		], function() {
			test.equal(rest.baseUri().substr(0,5), "https", 'Requested token and stats over a tls connection');
			test.done();
		});
	};

	/*
	 *  The combination of tls:false and basic auth results in error (see RSC18, RSA1).
	 *  The error MUST NOT occur at instantiation, because we might need the Rest client 
	 *  for things that don't require sending a key such as a token request.
	 *  The error MUST occur on any request that tries to send a secret key over HTTP.
	 *  A stats request is a good example of this.
	 */
	exports.basic_auth_no_tls_error = function(test) {
		test.expect(6);

		var rest,
			keyStr = helper.getTestApp().keys[0].keyStr;

		test.doesNotThrow(function() {
			rest = helper.AblyRest({ tls: false, key: keyStr, useTokenAuth: false });
		}, Error, 'Rest client does not throw error on instantiation, even if a secret key is specified along with tls:false');

		async.parallel([
			function(cb) {
				rest.auth.requestToken(function(err, tokenDetails) {
					test.ok(!err, 'A token request does not cause an error over a non-tls connection, because the secret key is not sent with the request');
					cb();
				});
			},
			function(cb) {
				rest.stats(function(err, stats) {
					test.ok(err, 'A stats request causes error with basic auth over a non-tls connection because it would have to send the secret key');
					test.equals(err.code, 40103, 'The error thrown is 40103');
					test.ok(typeof(err.serverId) === 'undefined', 'The error did not come from a server');
					cb();
				});
			}
		], function() {
			test.equal(rest.baseUri().substr(0,5), "http:", 'Requested token and stats over a non-tls connection');
			test.done();
		});
	};

	return module.exports = helper.withTimeout(exports);
});



