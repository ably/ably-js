"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	helper.describeWithCounter('rest/init', function (expect, counter) {
		var exports = {};

		it('setupInit', function(done) {
			counter.expect(1);
			helper.setupApp(function(err) {
				if(err) {
					expect(false, helper.displayError(err));
				} else {
					expect(true, 'app set up');
				}
				counter.assert();
				done();
			});
		});

		/* init with key string */
		it('init_key_string', function(done) {
			counter.expect(1);
			try {
				var keyStr = helper.getTestApp().keys[0].keyStr,
					rest = new helper.Ably.Rest(keyStr);

				expect(rest.options.key).to.equal(keyStr);
				counter.assert();
				done();
			} catch(e) {
				expect(false, 'Init with key failed with exception: ' + e.stack);
				done();
			}
		});

		/* init with token string */
		it('init_token_string', function(done) {
			counter.expect(1);
			try {
				/* first generate a token ... */
				var rest = helper.AblyRest();
				var testKeyOpts = {key: helper.getTestApp().keys[1].keyStr};

				rest.auth.requestToken(null, testKeyOpts, function(err, tokenDetails) {
					if(err) {
						expect(false, helper.displayError(err));
						done();
						return;
					}

					var tokenStr = tokenDetails.token,
						rest = new helper.Ably.Rest(tokenStr);

					expect(rest.options.token).to.equal(tokenStr);
					counter.assert();
					done();
				});
			} catch(e) {
				expect(false, 'Init with token failed with exception: ' + e.stack);
				done();
			}
		});

		/* init with tls: false */
		it('init_tls_false', function(done) {
			counter.expect(1);
			var rest = helper.AblyRest({tls: false, port: 123, tlsPort: 456});
			expect(rest.baseUri("example.com")).to.equal("http://example.com:123")
			counter.assert();
			done();
		});

		/* init with tls: true */
		it('init_tls_true',function(done) {
			counter.expect(1);
			var rest = helper.AblyRest({tls: true, port: 123, tlsPort: 456});
			expect(rest.baseUri("example.com")).to.equal("https://example.com:456")
			counter.assert();
			done();
		});

		/* init without any tls key should enable tls */
		it('init_tls_absent', function(done) {
			counter.expect(1);
			var rest = helper.AblyRest({port: 123, tlsPort: 456});
			expect(rest.baseUri("example.com")).to.equal("https://example.com:456")
			counter.assert();
			done();
		});

		/* init with a clientId set to '*', or anything other than a string or null,
		* should raise an exception */
		it('init_wildcard_clientId', function(done) {
			counter.expect(3);
			expect(function() {
				var rest = helper.AblyRest({clientId: '*'});
			}, 'Check can’t init library with a boolean clientId').to.throw();
			expect(function() {
				var rest = helper.AblyRest({clientId: 123});
			}, 'Check can’t init library with a boolean clientId').to.throw();
			expect(function() {
				var rest = helper.AblyRest({clientId: false});
			}, 'Check can’t init library with a boolean clientId').to.throw();
			counter.assert();
			done();
		});

		it('init_callbacks_promises', function(done) {
			var rest,
				keyStr = helper.getTestApp().keys[0].keyStr;

			rest = new Ably.Rest(keyStr);
			expect(!rest.options.promises, 'Check promises defaults to false');

			rest = new Ably.Rest.Promise(keyStr);
			expect(rest.options.promises, 'Check promises default to true with promise constructor');

			if(!isBrowser && typeof require == 'function') {
				rest = new require('../../promises').Rest(keyStr);
				expect(rest.options.promises, 'Check promises default to true with promise require target');

				rest = new require('../../callbacks').Rest(keyStr);
				expect(!rest.options.promises, 'Check promises default to false with callback require target');
			}
			done();
		});
	});
});
