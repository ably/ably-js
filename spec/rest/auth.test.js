'use strict';

// How to execute this test suite
// 1) with rebuilding library (slow)
// npm run-script build
// 2) with already build library (faster, but changes can be not applied as expected)
// npx grunt mocha --test=spec/rest/auth.test.js

// Run this test in browser
// 1) npm run-script test:webserver
// 2) open http://localhost:3000/mocha.html?grep=rest%2Fauth


define(['chai', 'shared_helper', 'async', 'globals'], function (chai, helper, async, globals) {
	var currentTime;
	var rest;
	var expect = chai.expect;
	var utils = helper.Utils;
	var echoServer = 'https://echo.ably.io';

	describe('rest/auth', function () {
		this.timeout(60 * 1000);

		var getServerTime = function (callback) {
			rest.time(function (err, time) {
				if (err) {
					callback(err);
				}
				callback(null, time);
			});
		};

		before(function (done) {
			helper.setupApp(function () {
				rest = helper.AblyRest({ queryTime: true });
				getServerTime(function (err, time) {
					if (err) {
						done(err);
						return;
					}
					currentTime = time;
					expect(true, 'Obtained time').to.be.ok;
					done();
				});
			});
		});

		it('Base token generation case', function (done) {
			rest.auth.requestToken(function (err, tokenDetails) {
				if (err) {
					done(err);
					return;
				}
				try {
					expect(tokenDetails.token, 'Verify token value').to.be.ok;
					expect(tokenDetails.issued && tokenDetails.issued >= currentTime, 'Verify token issued').to.be.ok;
					expect(tokenDetails.expires && tokenDetails.expires > tokenDetails.issued, 'Verify token expires').to.be.ok;
					expect(tokenDetails.expires).to.equal(60 * 60 * 1000 + tokenDetails.issued, 'Verify default expiry period');
					expect(JSON.parse(tokenDetails.capability)).to.deep.equal({ '*': ['*'] }, 'Verify token capability');
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it('Base token generation with options', function (done) {
			rest.auth.requestToken(null, function (err, tokenDetails) {
				if (err) {
					done(err);
					return;
				}
				try {
					expect(tokenDetails.token, 'Verify token value').to.be.ok;
					expect(tokenDetails.issued && tokenDetails.issued >= currentTime, 'Verify token issued').to.be.ok;
					expect(tokenDetails.expires && tokenDetails.expires > tokenDetails.issued, 'Verify token expires').to.be.ok;
					expect(JSON.parse(tokenDetails.capability)).to.deep.equal({ '*': ['*'] }, 'Verify token capability');
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it('Generate token and init library with it', function (done) {
			rest.auth.requestToken(function (err, tokenDetails) {
				if (err) {
					done(err);
					return;
				}
				try {
					expect(tokenDetails.token, 'Verify token value').to.be.ok;
					helper.AblyRest({ token: tokenDetails.token });
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it('Token generation with explicit timestamp', function (done) {
			getServerTime(function (err, serverTime) {
				if (err) {
					done(err);
					return;
				}

				rest.auth.requestToken({ timestamp: serverTime }, function (err, tokenDetails) {
					if (err) {
						done(err);
						return;
					}
					try {
						expect(tokenDetails.token).to.be.ok;
						expect(tokenDetails.issued && tokenDetails.issued >= currentTime, 'Verify token issued').to.be.ok;
						expect(tokenDetails.expires && tokenDetails.expires > tokenDetails.issued, 'Verify token expires').to.be.ok;
						expect(JSON.parse(tokenDetails.capability)).to.deep.equal({ '*': ['*'] }, 'Verify token capability');
						done();
					} catch (err) {
						done(err);
					}
				});
			});
		});

		it('Token generation with invalid timestamp', function (done) {
			var badTime = utils.now() - 30 * 60 * 1000;
			rest.auth.requestToken({ timestamp: badTime }, function (err, tokenDetails) {
				if (err) {
					try {
						expect(err.statusCode).to.equal(401, 'Verify token request rejected with bad timestamp');
						done();
					} catch (err) {
						done(err);
					}
					return;
				}
				done(new Error('Invalid timestamp, expected rejection'));
			});
		});

		it('Token generation with system timestamp', function (done) {
			rest.auth.requestToken(function (err, tokenDetails) {
				if (err) {
					done(err);
					return;
				}
				try {
					expect(tokenDetails.token, 'Verify token value').to.be.ok;
					expect(tokenDetails.issued && tokenDetails.issued >= currentTime, 'Verify token issued').to.be.ok;
					expect(tokenDetails.expires && tokenDetails.expires > tokenDetails.issued, 'Verify token expires').to.be.ok;
					expect(JSON.parse(tokenDetails.capability)).to.deep.equal({ '*': ['*'] }, 'Verify token capability');
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it('Token generation with duplicate nonce', function (done) {
			getServerTime(function (err, serverTime) {
				if (err) {
					done(err);
					return;
				}
				rest.auth.requestToken({ timestamp: serverTime, nonce: '1234567890123456' }, function (err, tokenDetails) {
					if (err) {
						done(err);
						return;
					}
					rest.auth.requestToken({ timestamp: serverTime, nonce: '1234567890123456' }, function (err, tokenDetails) {
						if (err) {
							try {
								expect(err.statusCode).to.equal(401, 'Verify request rejected with duplicated nonce');
								done();
							} catch (err) {
								done(err);
							}
							return;
						}
						done(new Error('Invalid nonce, expected rejection'));
					});
				});
			});
		});

		it('Token generation with clientId', function (done) {
			var testClientId = 'test client id';
			rest.auth.requestToken({ clientId: testClientId }, function (err, tokenDetails) {
				if (err) {
					done(err);
					return;
				}
				try {
					expect(tokenDetails.token, 'Verify token value').to.be.ok;
					expect(tokenDetails.issued && tokenDetails.issued >= currentTime, 'Verify token issued').to.be.ok;
					expect(tokenDetails.expires && tokenDetails.expires > tokenDetails.issued, 'Verify token expires').to.be.ok;
					expect(tokenDetails.clientId).to.equal(testClientId, 'Verify client id');
					expect(JSON.parse(tokenDetails.capability)).to.deep.equal({ '*': ['*'] }, 'Verify token capability');
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it('Token generation with empty string clientId should error', function (done) {
			rest.auth.requestToken({ clientId: '' }, function (err, tokenDetails) {
				if (err) {
					expect(err.code).to.equal(40012);
					done();
					return;
				}
				done(new Error('Expected token generation to error with empty string clientId'));
			});
		});

		it('Token generation with capability that subsets key capability', function (done) {
			var testCapability = { onlythischannel: ['subscribe'] };
			rest.auth.requestToken({ capability: testCapability }, function (err, tokenDetails) {
				if (err) {
					done(err);
					return;
				}
				try {
					expect(tokenDetails.token, 'Verify token value').to.be.ok;
					expect(tokenDetails.issued && tokenDetails.issued >= currentTime, 'Verify token issued').to.be.ok;
					expect(tokenDetails.expires && tokenDetails.expires > tokenDetails.issued, 'Verify token expires').to.be.ok;
					expect(JSON.parse(tokenDetails.capability)).to.deep.equal(testCapability, 'Verify token capability');
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it('Token generation with specified key', function (done) {
			var testKeyOpts = { key: helper.getTestApp().keys[1].keyStr };
			var testCapability = JSON.parse(helper.getTestApp().keys[1].capability);
			rest.auth.requestToken(null, testKeyOpts, function (err, tokenDetails) {
				if (err) {
					done(err);
					return;
				}
				try {
					expect(tokenDetails.token, 'Verify token value').to.be.ok;
					expect(tokenDetails.issued && tokenDetails.issued >= currentTime, 'Verify token issued').to.be.ok;
					expect(tokenDetails.expires && tokenDetails.expires > tokenDetails.issued, 'Verify token expires').to.be.ok;
					expect(tokenDetails.keyName).to.equal(helper.getTestApp().keys[1].keyName, 'Verify token key');
					expect(JSON.parse(tokenDetails.capability)).to.deep.equal(testCapability, 'Verify token capability');
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it('Token generation with explicit auth', function (done) {
			rest.auth.getAuthHeaders(function (err, authHeaders) {
				if (err) {
					done(err);
					return;
				}
				rest.auth.authOptions.requestHeaders = authHeaders;
				rest.auth.requestToken(function (err, tokenDetails) {
					if (err) {
						done(err);
						return;
					}
					try {
						expect(tokenDetails.token, 'Verify token value').to.be.ok;
						expect(tokenDetails.issued && tokenDetails.issued >= currentTime, 'Verify token issued').to.be.ok;
						expect(tokenDetails.expires && tokenDetails.expires > tokenDetails.issued, 'Verify token expires').to.be.ok;
						expect(tokenDetails.keyName).to.equal(helper.getTestApp().keys[0].keyName, 'Verify token key');
						done();
					} catch (err) {
						done(err);
					}
				});
			});
		});

		it('Token generation with explicit auth, different key', function (done) {
			rest.auth.getAuthHeaders(function (err, authHeaders) {
				var testKeyOpts = { key: helper.getTestApp().keys[1].keyStr };
				var testCapability = JSON.parse(helper.getTestApp().keys[1].capability);
				rest.auth.requestToken(null, testKeyOpts, function (err, tokenDetails) {
					if (err) {
						done(err);
						return;
					}
					try {
						expect(tokenDetails.token, 'Verify token value').to.be.ok;
						expect(tokenDetails.issued && tokenDetails.issued >= currentTime, 'Verify token issued').to.be.ok;
						expect(tokenDetails.expires && tokenDetails.expires > tokenDetails.issued, 'Verify token expires').to.be.ok;
						expect(tokenDetails.keyName).to.equal(helper.getTestApp().keys[1].keyName, 'Verify token key');
						expect(JSON.parse(tokenDetails.capability)).to.deep.equal(testCapability, 'Verify token capability');
						done();
					} catch (e) {
						done(e);
					}
				});
			});
		});

		it('Token generation with invalid mac', function (done) {
			rest.auth.requestToken({ mac: '12345' }, function (err, tokenDetails) {
				if (err) {
					try {
						expect(err.statusCode).to.equal(401, 'Verify request rejected with bad mac');
						done();
					} catch (e) {
						done(e);
					}
					return;
				}
				done(new Error('Invalid mac, expected rejection'));
			});
		});

		it('Token generation with defaultTokenParams set and no tokenParams passed in', function (done) {
			var logs = [];
			var rest1 = helper.AblyRest({
				defaultTokenParams: { ttl: 123, clientId: 'foo' },
			});
			rest1.setLog({
				level: 3, // minor
				handler: function (params) {
					console.log('Ably logger rest1', params);
					logs.push({
						clientId: 'foo',
						logName: 'rest1',
						timestamp: new Date(),
						params: params,
					});
				}
			});
			rest1.auth.requestToken(function (err, tokenDetails) {
				if (err) {
					done(err);
					return;
				}
				try {
					// console.log(logs);
/*

[
  {
    clientId: 'foo',
    logName: 'rest1',
    timestamp: 2021-10-18T12:38:52.996Z,
    params: 'Ably: Auth.requestToken(): using token auth with client-side signing'
  },
  {
    clientId: 'foo',
    logName: 'rest1',
    timestamp: 2021-10-18T12:38:52.996Z,
    params: 'Ably: Auth.getTokenRequest(): generated signed request'
  },
  {
    clientId: 'foo',
    logName: 'rest1',
    timestamp: 2021-10-18T12:38:53.081Z,
    params: 'Ably: Auth.getToken(): token received'
  }
]

 */
					// ensure custom logger produced proper result
					expect(logs.length, 'No logs emitted').to.be.gte(0);
					expect(logs.length, 'wrong logs emitted').to.equal(3);
					logs.map(function logEntryChecker(entry){
						expect(entry.clientId, 'wrong client id').to.be.equal('foo');
						expect(entry.logName, 'wrong client id').to.be.equal('rest1');
						expect(entry.params.indexOf('Ably: Auth.'), 'wrong params').to.equal(0);
					});
					// ensure token generated properly
					expect(tokenDetails.token, 'Verify token value').to.be.ok;
					expect(tokenDetails.clientId).to.equal('foo', 'Verify client id from defaultTokenParams used');
					expect(tokenDetails.expires - tokenDetails.issued).to.equal(123, 'Verify ttl from defaultTokenParams used');
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it('Token generation: if tokenParams passed in, defaultTokenParams should be ignored altogether, not merged', function (done) {
			var logs = [];
			var rest2 = helper.AblyRest({
				defaultTokenParams: { ttl: 123, clientId: 'foo' },
			});
			rest2.setLog({
				level: 3, // minor
				handler: function (params) {
					console.log('Ably logger rest2', params);
					logs.push({
						logName: 'rest2',
						timestamp: new Date(),
						params: params,
					});
				}
			});
			rest2.auth.requestToken({ clientId: 'bar' }, null, function (err, tokenDetails) {
				if (err) {
					done(err);
					return;
				}
				try {
					/*
					[
						{
							logName: 'rest2',
							timestamp: 2021-10-18T12:38:53.087Z,
							params: 'Ably: Auth.requestToken(): using token auth with client-side signing'
						},
						{
							logName: 'rest2',
							timestamp: 2021-10-18T12:38:53.088Z,
							params: 'Ably: Auth.getTokenRequest(): generated signed request'
						},
						{
							logName: 'rest2',
							timestamp: 2021-10-18T12:38:53.149Z,
							params: 'Ably: Auth.getToken(): token received'
						}
					]
					 */

					// ensure logs are correct
					expect(logs.length, 'No logs emitted').to.be.gte(0);
					expect(logs.length, 'Wrong number of logs is emitted').to.equal(3);
					logs.map(function logEntryChecker(entry){
						expect(entry.logName, 'wrong client id').to.be.equal('rest2');
						expect(entry.params.indexOf('Ably: Auth.'), 'wrong params').to.equal(0);
					});
					// ensure token details are correct
					expect(tokenDetails.clientId).to.equal(
						'bar',
						'Verify clientId passed in is used, not the one from defaultTokenParams'
					);
					expect(tokenDetails.expires - tokenDetails.issued).to.equal(
						60 * 60 * 1000,
						'Verify ttl from defaultTokenParams ignored completely, even though not overridden'
					);
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		/*
		 * authorize with different args
		 */
		it('Authorize with different args', function (done) {
			async.parallel(
				[
					function (cb) {
						rest.auth.authorize(null, null, function (err, tokenDetails) {
							expect(tokenDetails.token, 'Check token obtained').to.be.ok;
							cb(err);
						});
					},
					function (cb) {
						rest.auth.authorize(null, function (err, tokenDetails) {
							expect(tokenDetails.token, 'Check token obtained').to.be.ok;
							cb(err);
						});
					},
					function (cb) {
						rest.auth.authorize(function (err, tokenDetails) {
							expect(tokenDetails.token, 'Check token obtained').to.be.ok;
							cb(err);
						});
					}
				],
				function (err) {
					if (err) {
						done(err);
					}
					done();
				}
			);
		});

		it('Specify non-default ttl', function (done) {
			rest.auth.requestToken({ ttl: 100 * 1000 }, function (err, tokenDetails) {
				if (err) {
					done(err);
					return;
				}
				try {
					expect(tokenDetails.expires).to.equal(100 * 1000 + tokenDetails.issued, 'Verify non-default expiry period');
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it('Should error with excessive ttl', function (done) {
			rest.auth.requestToken({ ttl: 365 * 24 * 60 * 60 * 1000 }, function (err, tokenDetails) {
				if (err) {
					try {
						expect(err.statusCode).to.equal(400, 'Verify request rejected with excessive expiry');
						done();
					} catch (err) {
						done(err);
					}
					return;
				}
				done(new Error('Excessive expiry, expected rejection'));
			});
		});

		it('Should error with negative ttl', function (done) {
			rest.auth.requestToken({ ttl: -1 }, function (err, tokenDetails) {
				if (err) {
					try {
						expect(err.statusCode).to.equal(400, 'Verify request rejected with negative expiry');
						done();
					} catch (err) {
						done(err);
					}
					return;
				}
				done(new Error('Negative expiry, expected rejection'));
			});
		});

		it('Should error with invalid ttl', function (done) {
			rest.auth.requestToken({ ttl: 'notanumber' }, function (err, tokenDetails) {
				if (err) {
					try {
						expect(err.statusCode).to.equal(400, 'Verify request rejected with invalid expiry');
						done();
					} catch (e) {
						done(e);
					}
					return;
				}
				done(new Error('Invalid expiry, expected rejection'));
			});
		});

		/*
		 * createTokenRequest uses the key it was initialized with if authOptions is null,
		 * and the token request includes all the fields it should include, but
		 * doesn't include ttl or capability by default
		 */
		it('createTokenRequest without authOptions', function (done) {
			rest.auth.createTokenRequest(null, null, function (err, tokenRequest) {
				if (err) {
					done(err);
					return;
				}
				try {
					expect('mac' in tokenRequest, 'check tokenRequest contains a mac').to.be.ok;
					expect('nonce' in tokenRequest, 'check tokenRequest contains a nonce').to.be.ok;
					expect('timestamp' in tokenRequest, 'check tokenRequest contains a timestamp').to.be.ok;
					expect(!('ttl' in tokenRequest), 'check tokenRequest does not contains a ttl by default').to.be.ok;
					expect(
						!('capability' in tokenRequest),
						'check tokenRequest does not contains capabilities by default'
					).to.be.ok;
					expect(tokenRequest.keyName).to.equal(helper.getTestApp().keys[0].keyName);
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it('createTokenRequest without authOptions, callback as 2nd param', function (done) {
			rest.auth.createTokenRequest(null, function (err, tokenRequest) {
				if (err) {
					done(err);
					return;
				}
				try {
					expect(tokenRequest.keyName).to.equal(helper.getTestApp().keys[0].keyName);
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it('createTokenRequest without authOptions or tokenParams, callback as 1st param', function (done) {
			rest.auth.createTokenRequest(function (err, tokenRequest) {
				if (err) {
					done(err);
					return;
				}
				try {
					expect(tokenRequest.keyName).to.equal(helper.getTestApp().keys[0].keyName);
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it('createTokenRequest uses the key it was initialized with if authOptions does not have a "key" key', function (done) {
			rest.auth.createTokenRequest(function (err, tokenRequest) {
				if (err) {
					done(err);
					return;
				}
				try {
					expect(tokenRequest.keyName).to.equal(helper.getTestApp().keys[0].keyName);
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it('createTokenRequest should serialise capability object as JSON', function (done) {
			var capability = { '*': ['*'] };
			rest.auth.createTokenRequest({ capability: capability }, null, function (err, tokenRequest) {
				if (err) {
					done(err);
					return;
				}
				try {
					expect(JSON.parse(tokenRequest.capability)).to.deep.equal(
						capability,
						'Verify createTokenRequest has JSON-stringified capability'
					);
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		/**
		 * Creates a test fixture which checks that the rest client can succesfully make a stats request with the given authParams.
		 * @param {string} description Mocha test description
		 * @param {object} params The authParams to be tested
		 */
		function testJWTAuthParams(description, params) {
			it(description, function (done) {
				var currentKey = helper.getTestApp().keys[0];
				var keys = { keyName: currentKey.keyName, keySecret: currentKey.keySecret };
				var authParams = utils.mixin(keys, params);
				var authUrl = echoServer + '/createJWT' + utils.toQueryString(authParams);
				var restJWTRequester = helper.AblyRest({ authUrl: authUrl });

				restJWTRequester.auth.requestToken(function (err, tokenDetails) {
					if (err) {
						done(err);
						return;
					}
					var restClient = helper.AblyRest({ token: tokenDetails.token });
					restClient.stats(function (err, stats) {
						if (err) {
							done(err);
							return;
						}
						done();
					});
				});
			});
		}

		/* RSC1, RSC1a, RSC1c, RSA4f, RSA8c, RSA3d
		 * Tests the different combinations of authParams declared above, with valid keys
		 */
		testJWTAuthParams('Basic rest JWT', {});
		testJWTAuthParams('Rest JWT with return type ', { returnType: 'jwt' });
		/* The embedded tests rely on the echoserver getting a token from realtime, so won't work against a local realtime */
		if (globals.environment !== 'local') {
			testJWTAuthParams('Rest embedded JWT', { jwtType: 'embedded', environment: globals.environment });
			testJWTAuthParams('Rest embedded JWT with encryption', {
				jwtType: 'embedded',
				environment: globals.environment,
				encrypted: 1
			});
		}

		it('JWT request with invalid key', function (done) {
			var keys = { keyName: 'invalid.invalid', keySecret: 'invalidinvalid' };
			var authUrl = echoServer + '/createJWT' + utils.toQueryString(keys);
			var restJWTRequester = helper.AblyRest({ authUrl: authUrl });

			restJWTRequester.auth.requestToken(function (err, tokenDetails) {
				if (err) {
					done(err);
					return;
				}
				var restClient = helper.AblyRest({ token: tokenDetails.token });
				restClient.stats(function (err, stats) {
					try {
						expect(err.code).to.equal(40400, 'Verify token is invalid because app id does not exist');
						expect(err.statusCode).to.equal(404, 'Verify token is invalid because app id does not exist');
						done();
						return;
					} catch (err) {
						done(err);
					}
				});
			});
		});

		/*
		 * RSA8g
		 */
		it('Rest JWT with authCallback', function (done) {
			var currentKey = helper.getTestApp().keys[0];
			var keys = { keyName: currentKey.keyName, keySecret: currentKey.keySecret };
			var authUrl = echoServer + '/createJWT' + utils.toQueryString(keys);
			var restJWTRequester = helper.AblyRest({ authUrl: authUrl });

			var authCallback = function (tokenParams, callback) {
				restJWTRequester.auth.requestToken(function (err, tokenDetails) {
					if (err) {
						done(err);
						return;
					}
					callback(null, tokenDetails.token);
				});
			};

			var restClient = helper.AblyRest({ authCallback: authCallback });
			restClient.stats(function (err, stats) {
				if (err) {
					done(err);
					return;
				}
				try {
					expect(err).to.equal(null, 'Verify that the error is null');
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		/*
		 * RSA8g
		 */
		it('Rest JWT with authCallback and invalid keys', function (done) {
			var keys = { keyName: 'invalid.invalid', keySecret: 'invalidinvalid' };
			var authUrl = echoServer + '/createJWT' + utils.toQueryString(keys);
			var restJWTRequester = helper.AblyRest({ authUrl: authUrl });

			var authCallback = function (tokenParams, callback) {
				restJWTRequester.auth.requestToken(function (err, tokenDetails) {
					if (err) {
						done(err);
						return;
					}
					callback(null, tokenDetails.token);
				});
			};

			var restClient = helper.AblyRest({ authCallback: authCallback });
			restClient.stats(function (err, stats) {
				try {
					expect(err.code).to.equal(40400, 'Verify code is 40400');
					expect(err.statusCode).to.equal(404, 'Verify token is invalid because app id does not exist');
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		it('authCallback is only invoked once on concurrent auth', function (done) {
			var authCallbackInvocations = 0;
			function authCallback(tokenParams, callback) {
				authCallbackInvocations++;
				rest.auth.createTokenRequest(tokenParams, callback);
			}

			/* Example client-side using the token */
			var restClient = helper.AblyRest({ authCallback: authCallback });
			var channel = restClient.channels.get('auth_concurrent');

			async.parallel([channel.history.bind(channel), channel.history.bind(channel)], function (err) {
				try {
					expect(!err, err && helper.displayError(err)).to.be.ok;
					expect(authCallbackInvocations).to.equal(
						1,
						'Check authCallback only invoked once -- was: ' + authCallbackInvocations
					);
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		if (typeof Promise !== 'undefined') {
			it('Promise based auth', function (done) {
				var rest = helper.AblyRest({ promises: true });

				var promise1 = rest.auth.requestToken();
				var promise2 = rest.auth.requestToken({ ttl: 100 });
				var promise3 = rest.auth.requestToken({ ttl: 100 }, { key: helper.getTestApp().keys[1].keyStr });
				var promise4 = rest.auth.createTokenRequest();
				var promise5 = rest.auth.createTokenRequest({ ttl: 100 });
				var promise6 = rest.auth.requestToken({ ttl: 100 }, { key: 'bad' })['catch'](function (err) {
					expect(true, 'Token attempt with bad key was rejected').to.be.ok;
				});

				Promise.all([promise1, promise2, promise3, promise4, promise5, promise6])
					.then(function (results) {
						try {
							for (var i = 0; i < 5; i++) {
								expect(results[i].token || results[i].nonce).to.be.ok;
							}
							done();
						} catch (err) {
							done(err);
						}
					})
					['catch'](function (err) {
						done(err);
					});
			});
		}
	});
});
