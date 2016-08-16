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
			test.equal(headers['X-Ably-Lib'], 'js-' + Defaults.version, 'Verify libstring');
		};

		var post_inner = Ably.Rest.Http.post;
		Ably.Rest.Http.post = function (rest, path, headers, body, params, callback) {
			test.ok(('X-Ably-Version' in headers), 'Verify version header exists');
			test.ok(('X-Ably-Lib' in headers), 'Verify lib header exists');
			test.equal(headers['X-Ably-Version'], Defaults.apiVersion, 'Verify current version number');
			test.equal(headers['X-Ably-Lib'], 'js-' + Defaults.version, 'Verify libstring');
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

	function rest_fallback_hosts(host, opts, path, errValidator) { return function(test) {
		var client = helper.AblyRest(helper.Utils.mixin(opts, {
				restHost: host,
				fallbackHosts: [host, host, host],
				tls: false
			})),
			originalGetUri = Ably.Rest.Http.getUri,
			originalPostUri = Ably.Rest.Http.postUri;

		/* original host, 3 fallbacks, one final return, each for get & post */
		test.expect(10);

		Ably.Rest.Http.getUri = function() {
			test.ok(true, 'A host has been tried');
			originalGetUri.apply(null, arguments);
		};

		Ably.Rest.Http.postUri = function() {
			test.ok(true, 'A host has been tried');
			originalPostUri.apply(null, arguments);
		};

		async.parallel([
			function(cb) {
				client.request('get', path, null, null, null, function(err) {
					test.ok(errValidator(err), 'Check error is ccorrect');
					Ably.Rest.Http.getUri = originalGetUri;
					cb();
				});
			},
			function(cb) {
				client.request('post', path, null, null, null, function(err) {
					test.ok(errValidator(err), 'Check error is ccorrect');
					Ably.Rest.Http.postUri = originalPostUri;
					cb();
				});
			}], function() {
				test.done();
			});
	};}

	/* Make a request against an endpoint that always returns 503; check fallback
	 * hosts are tried */
	exports.rest_503 = rest_fallback_hosts('echo.ably.io', {}, '/503', function(err) {
		return err.statusCode === 503;
	});

	/* Make a request against an endpoint that times out; check fallback
	 * hosts are tried */
	exports.rest_timeout = rest_fallback_hosts(
		helper.unroutableAddress.match(/[\d.]+/)[0],
		{ httpRequestTimeout: 10 },
		'/',
		function(err) {
			return err.statusCode === 408 || err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT';
		});


	/* Make a request against an endpoint that DNS can't resolve; check fallback
	 * hosts are tried */
	exports.rest_invalid = rest_fallback_hosts('invalid.not_a_real_tld', {}, '/', function(err) {
		return err.statusCode === 400 || err.code === 'ENOTFOUND';
	});

	return module.exports = helper.withTimeout(exports);
});
