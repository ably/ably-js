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
		it('Should send X-Ably-Version and X-Ably-Lib headers in get/post requests', function (done) {
			//Intercept get&post methods with test
			var get_inner = Ably.Rest.Http.get;
			Ably.Rest.Http.get = function (rest, path, headers, params, callback) {
				try {
				expect('X-Ably-Version' in headers, 'Verify version header exists').to.be.ok;
				expect('X-Ably-Lib' in headers, 'Verify lib header exists').to.be.ok;

				// This test should not directly validate version against Defaults.version, as
				// ultimately the version header has been derived from that value.
				expect(headers['X-Ably-Version']).to.equal('1.2', 'Verify current version number');
				expect(headers['X-Ably-Lib'].indexOf(Defaults.version) > -1, 'Verify libstring').to.be.ok;
				} catch (err) {
					done(err);
				}
			};

			var post_inner = Ably.Rest.Http.post;
			Ably.Rest.Http.post = function (rest, path, headers, body, params, callback) {
				try {
				expect('X-Ably-Version' in headers, 'Verify version header exists').to.be.ok;
				expect('X-Ably-Lib' in headers, 'Verify lib header exists').to.be.ok;

				// This test should not directly validate version against Defaults.version, as
				// ultimately the version header has been derived from that value.
				expect(headers['X-Ably-Version']).to.equal('1.2', 'Verify current version number');
				expect(headers['X-Ably-Lib'].indexOf(Defaults.version) > -1, 'Verify libstring').to.be.ok;
				} catch (err) {
					done(err);
				}
			};

			//Call all methods that use rest http calls
			rest.auth.requestToken();
			rest.time();
			rest.stats();
			var channel = rest.channels.get('http_test_channel');
			channel.publish('test', 'Testing http headers');
			channel.presence.get();

			//Clean interceptors from get&post methods
			Ably.Rest.Http.get = get_inner;
			Ably.Rest.Http.post = post_inner;

			done();
		});
	});
});
