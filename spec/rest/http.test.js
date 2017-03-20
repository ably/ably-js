'use strict';

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var rest, exports = {},
		Defaults = Ably.Rest.Defaults;

	exports.setupHttp = function(test) {
		test.expect(1);
		helper.setupApp(function() {
			rest = helper.AblyRest();
			test.ok(true, 'App created');
			test.done();
		});
	}

	/**
	 * Check presence of X-Ably-Version headers in get&post requests
	 * @spec : (RSC7a)
	 */
	exports.apiVersionHeader = function(test) {

		//Intercept get&post methods with test
		var get_inner = Ably.Rest.Http.get;
		Ably.Rest.Http.get = function (rest, path, headers, params, callback) {
			test.ok(('X-Ably-Version' in headers), 'Verify version header exists');
			test.ok(('X-Ably-Lib' in headers), 'Verify lib header exists');
			test.equal(headers['X-Ably-Version'], Defaults.apiVersion, 'Verify current version number');
			test.ok(headers['X-Ably-Lib'].indexOf(Defaults.version) > -1, 'Verify libstring');
		};

		var post_inner = Ably.Rest.Http.post;
		Ably.Rest.Http.post = function (rest, path, headers, body, params, callback) {
			test.ok(('X-Ably-Version' in headers), 'Verify version header exists');
			test.ok(('X-Ably-Lib' in headers), 'Verify lib header exists');
			test.equal(headers['X-Ably-Version'], Defaults.apiVersion, 'Verify current version number');
			test.ok(headers['X-Ably-Lib'].indexOf(Defaults.version) > -1, 'Verify libstring');
		};

		//Call all methods that use rest http calls
		test.expect(20);

		rest.auth.requestToken();
		rest.time();
		rest.stats();

		var channel = rest.channels.get('http_test_channel');
		channel.publish('test', 'Testing http headers');
		channel.presence.get();

		//Clean interceptors from get&post methods
		Ably.Rest.Http.get = get_inner;
		Ably.Rest.Http.post = post_inner;

		test.done();
	};

	return module.exports = helper.withTimeout(exports);
});
