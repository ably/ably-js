"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	var exports = {};

	exports.setupInit = function(test) {
		test.expect(1);
		helper.setupApp(function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
			} else {
				test.ok(true, 'app set up');
			}
			test.done();
		});
	};

	/* init with key string */
	exports.init_key_string = function(test) {
		test.expect(1);
		try {
			var keyStr = helper.getTestApp().keys[0].keyStr,
				rest = new helper.Ably.Rest(keyStr);

			test.equal(rest.options.key, keyStr);
			test.done();
		} catch(e) {
			test.ok(false, 'Init with key failed with exception: ' + e.stack);
			test.done();
		}
	};

	/* init with token string */
	exports.init_token_string = function(test) {
		test.expect(1);
		try {
			/* first generate a token ... */
			var rest = helper.AblyRest();
			var testKeyOpts = {key: helper.getTestApp().keys[1].keyStr};

			rest.auth.requestToken(null, testKeyOpts, function(err, tokenDetails) {
				if(err) {
					test.ok(false, helper.displayError(err));
					test.done();
					return;
				}

				var tokenStr = tokenDetails.token,
					rest = new helper.Ably.Rest(tokenStr);

				test.equal(rest.options.token, tokenStr);
				test.done();
			});
		} catch(e) {
			test.ok(false, 'Init with token failed with exception: ' + e.stack);
			test.done();
		}
	};

	/* init with tls: false */
	exports.init_tls_false = function(test) {
		test.expect(1);
		var rest = helper.AblyRest({tls: false, port: 123, tlsPort: 456});
		test.equal(rest.baseUri("example.com"), "http://example.com:123")
		test.done();
	};

	/* init with tls: true */
	exports.init_tls_true= function(test) {
		test.expect(1);
		var rest = helper.AblyRest({tls: true, port: 123, tlsPort: 456});
		test.equal(rest.baseUri("example.com"), "https://example.com:456")
		test.done();
	};

	/* init without any tls key should enable tls */
	exports.init_tls_absent = function(test) {
		test.expect(1);
		var rest = helper.AblyRest({port: 123, tlsPort: 456});
		test.equal(rest.baseUri("example.com"), "https://example.com:456")
		test.done();
	};

	/* init with a clientId set to '*', or anything other than a string or null,
	* should raise an exception */
	exports.init_wildcard_clientId = function(test) {
		test.expect(3);
		test.throws(function() {
			var rest = helper.AblyRest({clientId: '*'});
		}, 'Check can’t init library with a wildcard clientId');
		test.throws(function() {
			var rest = helper.AblyRest({clientId: 123});
		}, 'Check can’t init library with a numerical clientId');
		test.throws(function() {
			var rest = helper.AblyRest({clientId: false});
		}, 'Check can’t init library with a boolean clientId');
		test.done();
	};

	exports.init_callbacks_promises = function(test) {
		var rest,
			keyStr = helper.getTestApp().keys[0].keyStr;

		rest = new Ably.Rest(keyStr);
		test.ok(!rest.options.promises, 'Check promises defaults to false');

		rest = new Ably.Rest.Promise(keyStr);
		test.ok(rest.options.promises, 'Check promises default to true with promise constructor');

		if(!isBrowser && typeof require == 'function') {
			rest = new require('../../promises').Rest(keyStr);
			test.ok(rest.options.promises, 'Check promises default to true with promise require target');

			rest = new require('../../callbacks').Rest(keyStr);
			test.ok(!rest.options.promises, 'Check promises default to false with callback require target');
		}
		test.done();
	};

	return module.exports = helper.withTimeout(exports);
});
