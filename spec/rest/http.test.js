'use strict';

define(['ably', 'shared_helper', 'chai'], function (Ably, helper, chai) {
	var rest;
	var expect = chai.expect;
	var Defaults = Ably.Rest.Defaults;

	describe('rest/http', function () {
		this.timeout(60 * 1000);
		before(function (done) {
			helper.setupApp(function () {
				rest = helper.AblyRest();
				done();
			});
		});

		/**
		 * RSC7a
		 */
		it('Should send X-Ably-Version and Ably-Agent headers in get/post requests', function (done) {
			//Intercept get&post methods with test
			function testRequestHandler(_, __, headers) {
				try {
					expect('X-Ably-Version' in headers, 'Verify version header exists').to.be.ok;
					expect('Ably-Agent' in headers, 'Verify agent header exists').to.be.ok;

					// This test should not directly validate version against Defaults.version, as
					// ultimately the version header has been derived from that value.
					expect(headers['X-Ably-Version']).to.equal('1.2', 'Verify current version number');
					expect(headers['Ably-Agent'].indexOf('ably-js/' + Defaults.version) > -1, 'Verify agent').to.be.ok;

					// We don't test on NativeScript so a check for that platform is excluded here
					if (typeof document !== 'undefined') {
						// browser
						expect(headers['Ably-Agent'].indexOf('browser') > -1, 'Verify agent').to.be.ok;
					} else if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
						// reactnative
						expect(headers['Ably-Agent'].indexOf('reactnative') > -1, 'Verify agent').to.be.ok;
					} else {
						// node
						expect(headers['Ably-Agent'].indexOf('nodejs') > -1, 'Verify agent').to.be.ok;
					}
				} catch (err) {
					done(err);
				}
			}

			var get_inner = Ably.Rest.Http.get;
			Ably.Rest.Http.get = testRequestHandler;

			var post_inner = Ably.Rest.Http.post;
			Ably.Rest.Http.post = testRequestHandler;

			// Call all methods that use rest http calls
			rest.auth.requestToken();
			rest.time();
			rest.stats();
			var channel = rest.channels.get('http_test_channel');
			channel.publish('test', 'Testing http headers');
			channel.presence.get();

			// Clean interceptors from get&post methods
			Ably.Rest.Http.get = get_inner;
			Ably.Rest.Http.post = post_inner;

			done();
		});
	});
});
