'use strict';

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	helper.describeWithCounter('rest/http', function (expect, counter) {
		var rest, exports = {},
			Defaults = Ably.Rest.Defaults;

		it('setupHttp', function(done) {
			counter.expect(1);
			helper.setupApp(function() {
				rest = helper.AblyRest();
				expect(true, 'App created');
				counter.assert();
				done();
			});
		})

		/**
		 * Check presence of X-Ably-Version headers in get&post requests
		 * @spec : (RSC7a)
		 */
		it('apiVersionHeader', function(done) {

			//Intercept get&post methods with test
			var get_inner = Ably.Rest.Http.get;
			Ably.Rest.Http.get = function (rest, path, headers, params, callback) {
				expect(('X-Ably-Version' in headers), 'Verify version header exists');
				expect(('X-Ably-Lib' in headers), 'Verify lib header exists');
				
				// This test should not directly validate version against Defaults.version, as
				// ultimately the version header has been derived from that value.
				expect(headers['X-Ably-Version']).to.equal('1.2', 'Verify current version number');

				expect(headers['X-Ably-Lib'].indexOf(Defaults.version) > -1, 'Verify libstring');
			};

			var post_inner = Ably.Rest.Http.post;
			Ably.Rest.Http.post = function (rest, path, headers, body, params, callback) {
				expect(('X-Ably-Version' in headers), 'Verify version header exists');
				expect(('X-Ably-Lib' in headers), 'Verify lib header exists');

				// This test should not directly validate version against Defaults.version, as
				// ultimately the version header has been derived from that value.
				expect(headers['X-Ably-Version']).to.equal('1.2', 'Verify current version number');
				
				expect(headers['X-Ably-Lib'].indexOf(Defaults.version) > -1, 'Verify libstring');
			};

			//Call all methods that use rest http calls
			counter.expect(20);

			rest.auth.requestToken();
			rest.time();
			rest.stats();

			var channel = rest.channels.get('http_test_channel');
			channel.publish('test', 'Testing http headers');
			channel.presence.get();

			//Clean interceptors from get&post methods
			Ably.Rest.Http.get = get_inner;
			Ably.Rest.Http.post = post_inner;

			counter.assert();
			done();
		});
	});
});
