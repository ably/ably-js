'use strict';

define(['ably', 'shared_helper', 'async', 'chai'], function (Ably, helper, async, chai) {
	var currentTime;
	var exampleTokenDetails;
	var exports = {};
	var expect = chai.expect;
	var _exports = {};
	var utils = helper.Utils;
	var displayError = helper.displayError;
	var closeAndFinish = helper.closeAndFinish;
	var monitorConnection = helper.monitorConnection;
	var testOnAllTransports = helper.testOnAllTransports;
	var mixin = helper.Utils.mixin;
	var http = new Ably.Rest.Http();
	var jwtTestChannelName = 'JWT_test' + String(Math.floor(Math.random() * 10000) + 1);
	var echoServer = 'https://echo.ably.io';

	/*
	 * Helper function to fetch JWT tokens from the echo server
	 */
	function getJWT(params, callback) {
		var authUrl = echoServer + '/createJWT';
		http.getUri(null, authUrl, null, params, function (err, body) {
			if (err) {
				callback(err, null);
			}
			callback(null, body.toString());
		});
	}

	describe('realtime/auth', function () {
		this.timeout(60 * 1000);

		before(function (done) {
			helper.setupApp(function (err) {
				if (err) {
					done(err);
					return;
				}

				var rest = helper.AblyRest({ queryTime: true });
				rest.time(function (err, time) {
					if (err) {
						done(err);
						return;
					} else {
						currentTime = time;
						rest.auth.requestToken({}, function (err, tokenDetails) {
							try {
								expect(!err, err && displayError(err)).to.be.ok;
								done();
							} catch (err) {
								done(err);
							}
						});
					}
				});
			});
		});

		/*
		 * Base token generation case
		 */
		it('authbase0', function (done) {
			var realtime = helper.AblyRealtime();
			realtime.auth.requestToken(function (err, tokenDetails) {
				if (err) {
					closeAndFinish(done, realtime, err);
					return;
				}
				try {
					expect(tokenDetails.token, 'Verify token value').to.be.ok;
					expect(tokenDetails.issued && tokenDetails.issued >= currentTime, 'Verify token issued').to.be.ok;
					expect(tokenDetails.expires && tokenDetails.expires > tokenDetails.issued, 'Verify token expires').to.be.ok;
					expect(tokenDetails.expires).to.equal(60 * 60 * 1000 + tokenDetails.issued, 'Verify default expiry period');
					expect(JSON.parse(tokenDetails.capability)).to.deep.equal({ '*': ['*'] }, 'Verify token capability');
					closeAndFinish(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			});
		});

		/*
		 * Use authUrl for authentication with JSON TokenDetails response
		 */
		it('auth_useAuthUrl_json', function (done) {
			var realtime,
				rest = helper.AblyRest();
			rest.auth.requestToken(null, null, function (err, tokenDetails) {
				if (err) {
					closeAndFinish(done, realtime, err);
					return;
				}

				var authPath = echoServer + '/?type=json&body=' + encodeURIComponent(JSON.stringify(tokenDetails));

				realtime = helper.AblyRealtime({ authUrl: authPath });

				realtime.connection.on('connected', function () {
					closeAndFinish(done, realtime);
					return;
				});

				monitorConnection(done, realtime);
			});
		});

		/*
		 * Use authUrl for authentication with JSON TokenDetails response, with authMethod=POST
		 */
		it('auth_useAuthUrl_post_json', function (done) {
			var realtime,
				rest = helper.AblyRest();
			rest.auth.requestToken(null, null, function (err, tokenDetails) {
				if (err) {
					closeAndFinish(done, realtime, err);
					return;
				}

				var authUrl = echoServer + '/?type=json&';

				realtime = helper.AblyRealtime({ authUrl: authUrl, authMethod: 'POST', authParams: tokenDetails });

				realtime.connection.on('connected', function () {
					closeAndFinish(done, realtime);
					return;
				});

				monitorConnection(done, realtime);
			});
		});

		/*
		 * Use authUrl for authentication with plain text token response
		 */
		it('auth_useAuthUrl_plainText', function (done) {
			var realtime,
				rest = helper.AblyRest();
			rest.auth.requestToken(null, null, function (err, tokenDetails) {
				if (err) {
					closeAndFinish(done, realtime, err);
					return;
				}

				var authPath = echoServer + '/?type=text&body=' + tokenDetails['token'];

				realtime = helper.AblyRealtime({ authUrl: authPath });

				realtime.connection.on('connected', function () {
					closeAndFinish(done, realtime);
					return;
				});

				monitorConnection(done, realtime);
			});
		});

		/*
		 * Use authCallback for authentication with tokenRequest response
		 */
		it('auth_useAuthCallback_tokenRequestResponse', function (done) {
			var realtime,
				rest = helper.AblyRest();
			var authCallback = function (tokenParams, callback) {
				rest.auth.createTokenRequest(tokenParams, null, function (err, tokenRequest) {
					if (err) {
						closeAndFinish(done, realtime, err);
						return;
					}
					try {
						expect('nonce' in tokenRequest).to.be.ok;
					} catch (err) {
						done(err);
					}
					callback(null, tokenRequest);
				});
			};

			realtime = helper.AblyRealtime({ authCallback: authCallback });

			realtime.connection.on('connected', function () {
				try {
					expect(realtime.auth.method).to.equal('token');
					closeAndFinish(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			});

			monitorConnection(done, realtime);
		});

		/*
		 * Use authCallback for authentication with tokenDetails response,
		 * also check that clientId lib is initialized with is passed through
		 * to the auth callback
		 */
		it('auth_useAuthCallback_tokenDetailsResponse', function (done) {
			var realtime,
				rest = helper.AblyRest();
			var clientId = 'test clientid';
			var authCallback = function (tokenParams, callback) {
				rest.auth.requestToken(tokenParams, null, function (err, tokenDetails) {
					if (err) {
						closeAndFinish(done, realtime, err);
						return;
					}
					try {
						expect('token' in tokenDetails).to.be.ok;
						expect(tokenDetails.clientId).to.equal(clientId);
					} catch (err) {
						done(err);
					}
					callback(null, tokenDetails);
				});
			};

			realtime = helper.AblyRealtime({ authCallback: authCallback, clientId: clientId });

			realtime.connection.on('connected', function () {
				try {
					expect(realtime.auth.method).to.equal('token');
					closeAndFinish(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			});

			monitorConnection(done, realtime);
		});

		/*
		 * Use authCallback for authentication with token string response
		 */
		it('auth_useAuthCallback_tokenStringResponse', function (done) {
			var realtime,
				rest = helper.AblyRest();
			var authCallback = function (tokenParams, callback) {
				rest.auth.requestToken(tokenParams, null, function (err, tokenDetails) {
					if (err) {
						closeAndFinish(done, realtime, err);
						return;
					}
					try {
						expect('token' in tokenDetails).to.be.ok;
					} catch (err) {
						done(err);
					}
					callback(null, tokenDetails.token);
				});
			};

			realtime = helper.AblyRealtime({ authCallback: authCallback });

			realtime.connection.on('connected', function () {
				try {
					expect(realtime.auth.method).to.equal('token');
					closeAndFinish(done, realtime);
				} catch (err) {
					closeAndFinish(done, realtime, err);
				}
			});

			monitorConnection(done, realtime);
		});

		/*
		 * RSA8c1c -- If the given authUrl includes any querystring params, they
		 * should be preserved, and in the GET case, authParams/tokenParams should be
		 * merged with them. If a name conflict occurs, authParams/tokenParams should
		 * take precedence
		 */
		it('auth_useAuthUrl_mixed_authParams_qsParams', function (done) {
			var realtime,
				rest = helper.AblyRest();
			rest.auth.createTokenRequest(null, null, function (err, tokenRequest) {
				if (err) {
					closeAndFinish(done, realtime, err);
					return;
				}

				/* Complete token request requires both parts to be combined, and
				 * requires the keyName in the higherPrecence part to take precedence
				 * over the wrong keyName */
				var lowerPrecedenceTokenRequestParts = {
					keyName: 'WRONG',
					timestamp: tokenRequest.timestamp,
					nonce: tokenRequest.nonce
				};
				var higherPrecedenceTokenRequestParts = {
					keyName: tokenRequest.keyName,
					mac: tokenRequest.mac
				};
				var authPath = echoServer + '/qs_to_body' + utils.toQueryString(lowerPrecedenceTokenRequestParts);

				realtime = helper.AblyRealtime({ authUrl: authPath, authParams: higherPrecedenceTokenRequestParts });

				realtime.connection.on('connected', function () {
					closeAndFinish(done, realtime);
					return;
				});
			});
		});

		/*
		 * Request a token using clientId, then initialize a connection without one,
		 * and check that the connection inherits the clientId from the tokenDetails
		 */
		it('auth_clientid_inheritance', function (done) {
			var rest = helper.AblyRest(),
				testClientId = 'testClientId';
			var authCallback = function (tokenParams, callback) {
				rest.auth.requestToken({ clientId: testClientId }, function (err, tokenDetails) {
					if (err) {
						done(err);
						return;
					}
					callback(null, tokenDetails);
				});
			};

			var realtime = helper.AblyRealtime({ authCallback: authCallback });

			realtime.connection.on('connected', function () {
				try {
					expect(realtime.auth.clientId).to.equal(testClientId);
					realtime.connection.close();
					done();
				} catch (err) {
					done(err);
				}
				return;
			});

			realtime.connection.on('failed', function (err) {
				realtime.close();
				done(err);
				return;
			});
		});

		/*
		 * Rest token generation with clientId, then connecting with a
		 * different clientId, should fail with a library-generated message
		 * (RSA15a, RSA15c)
		 */
		it('auth_clientid_inheritance2', function (done) {
			var clientRealtime,
				testClientId = 'test client id';
			var rest = helper.AblyRest();
			rest.auth.requestToken({ clientId: testClientId }, function (err, tokenDetails) {
				if (err) {
					done(err);
					return;
				}
				clientRealtime = helper.AblyRealtime({ token: tokenDetails, clientId: 'WRONG' });
				clientRealtime.connection.once('failed', function (stateChange) {
					try {
						expect(stateChange.reason.code).to.equal(80019);
						expect(stateChange.reason.cause.code).to.equal(40102);
						clientRealtime.close();
						done();
					} catch (err) {
						done(err);
					}
				});
			});
		});

		/*
		 * Rest token generation with clientId '*', then connecting with just the
		 * token string and a different clientId, should succeed (RSA15b)
		 */
		it('auth_clientid_inheritance3', function (done) {
			var realtime,
				testClientId = 'test client id';
			var rest = helper.AblyRest();
			rest.auth.requestToken({ clientId: '*' }, function (err, tokenDetails) {
				if (err) {
					done(err);
					return;
				}
				realtime = helper.AblyRealtime({ token: tokenDetails.token, clientId: 'test client id' });
				realtime.connection.on('connected', function () {
					try {
						expect(realtime.auth.clientId).to.equal(testClientId);
						realtime.connection.close();
						done();
					} catch (err) {
						done(err);
					}
					return;
				});
				monitorConnection(done, realtime);
			});
		});

		/*
		 * Rest token generation with clientId '*', then connecting with
		 * tokenDetails and a clientId, should succeed (RSA15b)
		 */
		it('auth_clientid_inheritance4', function (done) {
			var realtime,
				testClientId = 'test client id';
			var rest = helper.AblyRest();
			rest.auth.requestToken({ clientId: '*' }, function (err, tokenDetails) {
				if (err) {
					done(err);
					return;
				}
				realtime = helper.AblyRealtime({ token: tokenDetails, clientId: 'test client id' });
				realtime.connection.on('connected', function () {
					try {
						expect(realtime.auth.clientId).to.equal(testClientId);
						realtime.connection.close();
						done();
					} catch (err) {
						done(err);
					}
					return;
				});
				monitorConnection(done, realtime);
			});
		});

		/*
		 * Request a token using clientId, then initialize a connection using just the token string,
		 * and check that the connection inherits the clientId from the connectionDetails
		 */
		it('auth_clientid_inheritance5', function (done) {
			var clientRealtime,
				testClientId = 'test client id';
			var rest = helper.AblyRest();
			rest.auth.requestToken({ clientId: testClientId }, function (err, tokenDetails) {
				if (err) {
					done(err);
					return;
				}
				clientRealtime = helper.AblyRealtime({ token: tokenDetails.token });
				clientRealtime.connection.on('connected', function () {
					try {
						expect(clientRealtime.auth.clientId).to.equal(testClientId);
						closeAndFinish(done, clientRealtime);
					} catch (err) {
						closeAndFinish(done, clientRealtime, err);
					}
					return;
				});
				monitorConnection(done, clientRealtime);
			});
		});

		/* RSA4c, RSA4e
		 * Try to connect with an authCallback that fails in various ways (calling back with an error, calling back with nothing, timing out, etc) should go to disconnected, not failed, and wrapped in a 80019 error code
		 */
		function authCallback_failures(realtimeOptions, expectFailure) {
			return function (done) {
				var realtime = helper.AblyRealtime(realtimeOptions);
				realtime.connection.on(function (stateChange) {
					if (stateChange.previous !== 'initialized') {
						if (helper.bestTransport === 'jsonp') {
							try {
								// auth endpoints don't envelope, so we assume the 'least harmful' option, which is a disconnection with concomitant retry
								expect(stateChange.current).to.equal('disconnected', 'Check connection goes to the expected state');
								// jsonp doesn't let you examine the statuscode
								expect(stateChange.reason.statusCode).to.equal(401, 'Check correct cause error code');
							} catch (err) {
								done(err);
							}
						} else {
							try {
								expect(stateChange.current).to.equal(
									expectFailure ? 'failed' : 'disconnected',
									'Check connection goes to the expected state'
								);
								expect(stateChange.reason.statusCode).to.equal(
									expectFailure ? 403 : 401,
									'Check correct cause error code'
								);
							} catch (err) {
								done(err);
							}
						}
						try {
							expect(stateChange.reason.code).to.equal(80019, 'Check correct error code');
							realtime.connection.off();
							closeAndFinish(done, realtime);
						} catch (err) {
							closeAndFinish(done, realtime, err);
						}
					}
				});
			};
		}

		it(
			'authCallback_error',
			authCallback_failures({
				authCallback: function (tokenParams, callback) {
					callback(new Error('An error from client code that the authCallback might return'));
				}
			})
		);

		it(
			'authCallback_timeout',
			authCallback_failures({
				authCallback: function () {
					/* (^._.^)ﾉ */
				},
				realtimeRequestTimeout: 100
			})
		);

		it(
			'authCallback_nothing',
			authCallback_failures({
				authCallback: function (tokenParams, callback) {
					callback();
				}
			})
		);

		it(
			'authCallback_malformed',
			authCallback_failures({
				authCallback: function (tokenParams, callback) {
					callback(null, { horse: 'ebooks' });
				}
			})
		);

		it(
			'authCallback_too_long_string',
			authCallback_failures({
				authCallback: function (tokenParams, callback) {
					var token = '';
					for (var i = 0; i < Math.pow(2, 17) + 1; i++) {
						token = token + 'a';
					}
					callback(null, token);
				}
			})
		);

		it(
			'authCallback_empty_string',
			authCallback_failures({
				authCallback: function (tokenParams, callback) {
					callback(null, '');
				}
			})
		);

		it(
			'authUrl_timeout',
			authCallback_failures({
				authUrl: helper.unroutableAddress,
				realtimeRequestTimeout: 100
			})
		);

		it(
			'authUrl_404',
			authCallback_failures({
				authUrl: 'http://example.com/404'
			})
		);

		it(
			'authUrl_wrong_content_type',
			authCallback_failures({
				authUrl: 'http://example.com/'
			})
		);

		it(
			'authUrl_401',
			authCallback_failures({
				authUrl: echoServer + '/respondwith?status=401'
			})
		);

		it(
			'authUrl_double_encoded',
			authCallback_failures({
				authUrl:
					echoServer + '/?type=json&body=' + encodeURIComponent(JSON.stringify(JSON.stringify({ keyName: 'foo.bar' })))
			})
		);

		/* 403 should cause the connection to go to failed, unlike the others */
		it(
			'authUrl_403',
			authCallback_failures(
				{
					authUrl: echoServer + '/respondwith?status=403'
				},
				true
			)
		); /* expectFailed: */

		/* 403 should cause connection to fail even with an external error response */
		it(
			'authUrl_403_custom_error',
			authCallback_failures(
				{
					authUrl: echoServer + '/?status=403&type=json&body=' + encodeURIComponent(JSON.stringify({error: {some_custom: "error"}}))
				},
				true
			)
		);

		/* auth endpoints don't envelope, so this won't work with jsonp */
		if (helper.bestTransport !== 'jsonp') {
			it('authUrl_403_previously_active', function (done) {
				var realtime,
					rest = helper.AblyRest();
				rest.auth.requestToken(null, null, function (err, tokenDetails) {
					if (err) {
						closeAndFinish(done, realtime, err);
						return;
					}

					var authPath = echoServer + '/?type=json&body=' + encodeURIComponent(JSON.stringify(tokenDetails));

					realtime = helper.AblyRealtime({ authUrl: authPath });

					realtime.connection.on('connected', function () {
						/* replace the authUrl and reauth */
						realtime.auth.authorize(
							null,
							{ authUrl: echoServer + '/respondwith?status=403' },
							function (err, tokenDetails) {
								try {
									expect(err && err.statusCode).to.equal(403, 'Check err statusCode');
									expect(err && err.code).to.equal(40300, 'Check err code');
									expect(realtime.connection.state).to.equal('failed', 'Check connection goes to the failed state');
									expect(realtime.connection.errorReason && realtime.connection.errorReason.statusCode).to.equal(
										403,
										'Check correct cause error code'
									);
									expect(realtime.connection.errorReason.code).to.equal(80019, 'Check correct connection error code');
									closeAndFinish(done, realtime);
								} catch (err) {
									closeAndFinish(done, realtime, err);
								}
							}
						);
					});
				});
			});
		}

		/*
		 * Check state change reason is propogated during a disconnect
		 * (when connecting with a token that expires while connected)
		 */
		testOnAllTransports('auth_token_expires', function (realtimeOpts) {
			return function (done) {
				var clientRealtime,
					rest = helper.AblyRest();

				rest.auth.requestToken({ ttl: 5000 }, null, function (err, tokenDetails) {
					if (err) {
						done(err);
						return;
					}
					clientRealtime = helper.AblyRealtime(mixin(realtimeOpts, { tokenDetails: tokenDetails, queryTime: true }));

					clientRealtime.connection.on('failed', function () {
						closeAndFinish(done, clientRealtime, new Error('Failed to connect before token expired'));
					});
					clientRealtime.connection.once('connected', function () {
						clientRealtime.connection.off('failed');
						clientRealtime.connection.once('disconnected', function (stateChange) {
							try {
								expect(stateChange.reason.statusCode).to.equal(401, 'Verify correct disconnect statusCode');
								expect(stateChange.reason.code).to.equal(40142, 'Verify correct disconnect code');
								closeAndFinish(done, clientRealtime);
							} catch (err) {
								closeAndFinish(done, clientRealtime, err);
							}
						});
					});
				});
			};
		});

		/*
		 * Check that when the queryTime option is provided
		 * that the time from the server is only requested once
		 * and all subsequent requests use the time offset
		 */
		it('auth_query_time_once', function (done) {
			var rest = helper.AblyRest({ queryTime: true }),
				timeRequestCount = 0,
				originalTime = rest.time;

			/* stub time */
			rest.time = function (callback) {
				timeRequestCount += 1;
				originalTime.call(rest, callback);
			};

			try {
				expect(
					isNaN(parseInt(rest.serverTimeOffset)) && !rest.serverTimeOffset,
					'Server time offset is empty and falsey until a time request has been made'
				).to.be.ok;
			} catch (err) {
				done(err);
				return;
			}

			var asyncFns = [];
			for (var i = 0; i < 10; i++) {
				asyncFns.push(function (callback) {
					rest.auth.createTokenRequest({}, null, function (err, tokenDetails) {
						if (err) {
							return callback(err);
						}
						expect(
							!isNaN(parseInt(rest.serverTimeOffset)),
							'Server time offset is configured when time is requested'
						).to.be.ok;
						callback();
					});
				});
			}

			async.series(asyncFns, function (err) {
				if (err) {
					done(err);
					return;
				}

				try {
					expect(1).to.equal(timeRequestCount, 'Time function is only called once per instance');
					done();
				} catch (err) {
					done(err);
				}
			});
		});

		/*
		 * If using authcallback when a token expires, should automatically request a
		 * new token
		 */
		testOnAllTransports('auth_tokenDetails_expiry_with_authcallback', function (realtimeOpts) {
			return function (done) {
				var realtime,
					rest = helper.AblyRest();
				var clientId = 'test clientid';
				var authCallback = function (tokenParams, callback) {
					tokenParams.ttl = 5000;
					rest.auth.requestToken(tokenParams, null, function (err, tokenDetails) {
						if (err) {
							closeAndFinish(done, realtime, err);
							return;
						}
						callback(null, tokenDetails);
					});
				};

				realtime = helper.AblyRealtime(mixin(realtimeOpts, { authCallback: authCallback, clientId: clientId }));
				monitorConnection(done, realtime);
				realtime.connection.once('connected', function () {
					realtime.connection.once('disconnected', function (stateChange) {
						try {
							expect(stateChange.reason.code).to.equal(40142, 'Verify correct disconnect code');
						} catch (err) {
							done(err);
							return;
						}
						realtime.connection.once('connected', function () {
							realtime.close();
							done();
						});
					});
				});

				monitorConnection(done, realtime);
			};
		});

		/*
		 * Same as previous but with just a token, so ably-js doesn't know that the
		 * token's expired
		 */
		testOnAllTransports('auth_token_string_expiry_with_authcallback', function (realtimeOpts) {
			return function (done) {
				var realtime,
					rest = helper.AblyRest();
				var clientId = 'test clientid';
				var authCallback = function (tokenParams, callback) {
					tokenParams.ttl = 5000;
					rest.auth.requestToken(tokenParams, null, function (err, tokenDetails) {
						if (err) {
							closeAndFinish(done, realtime, err);
							return;
						}
						callback(null, tokenDetails.token);
					});
				};

				realtime = helper.AblyRealtime(mixin(realtimeOpts, { authCallback: authCallback, clientId: clientId }));
				monitorConnection(done, realtime);
				realtime.connection.once('connected', function () {
					realtime.connection.once('disconnected', function (stateChange) {
						try {
							expect(stateChange.reason.code).to.equal(40142, 'Verify correct disconnect code');
						} catch (err) {
							done(err);
							return;
						}
						realtime.connection.once('connected', function () {
							realtime.close();
							done();
						});
					});
				});

				monitorConnection(done, realtime);
			};
		});

		/*
		 * Same as previous but with no way to generate a new token
		 */
		testOnAllTransports('auth_token_string_expiry_with_token', function (realtimeOpts) {
			return function (done) {
				var realtime,
					rest = helper.AblyRest();
				var clientId = 'test clientid';
				rest.auth.requestToken({ ttl: 5000, clientId: clientId }, null, function (err, tokenDetails) {
					if (err) {
						closeAndFinish(done, realtime, err);
						return;
					}
					realtime = helper.AblyRealtime(mixin(realtimeOpts, { token: tokenDetails.token, clientId: clientId }));
					realtime.connection.once('connected', function () {
						realtime.connection.once('disconnected', function (stateChange) {
							try {
								expect(stateChange.reason.code).to.equal(40142, 'Verify correct disconnect code');
							} catch (err) {
								done(err);
								return;
							}
							realtime.connection.once('failed', function (stateChange) {
								/* Library has no way to generate a new token, so should fail */
								try {
									expect(stateChange.reason.code).to.equal(40171, 'Verify correct cause failure code');
									realtime.close();
									done();
								} catch (err) {
									done(err);
								}
							});
						});
					});
				});
			};
		});

		/*
		 * Try to connect with an expired token string
		 */
		testOnAllTransports('auth_expired_token_string', function (realtimeOpts) {
			return function (done) {
				var realtime,
					rest = helper.AblyRest();
				var clientId = 'test clientid';
				rest.auth.requestToken({ ttl: 1, clientId: clientId }, null, function (err, tokenDetails) {
					if (err) {
						closeAndFinish(done, realtime, err);
						return;
					}
					setTimeout(function () {
						realtime = helper.AblyRealtime(mixin(realtimeOpts, { token: tokenDetails.token, clientId: clientId }));
						realtime.connection.once('failed', function (stateChange) {
							try {
								expect(stateChange.reason.code).to.equal(40171, 'Verify correct failure code');
								realtime.close();
								done();
							} catch (err) {
								done(err);
							}
						});
						/* Note: ws transport indicates viability when websocket is
						 * established, before realtime sends error response. So token error
						 * goes through the same path as a connected transport, so goes to
						 * disconnected first */
						utils.arrForEach(['connected', 'suspended'], function (state) {
							realtime.connection.on(state, function () {
								done(new Error('State changed to ' + state + ', should have gone to failed'));
								realtime.close();
							});
						});
					}, 100);
				});
			};
		});

		/*
		 * use authorize() to force a reauth using an existing authCallback
		 */
		testOnAllTransports('reauth_authCallback', function (realtimeOpts) {
			return function (done) {
				var realtime,
					rest = helper.AblyRest();
				var firstTime = true;
				var authCallback = function (tokenParams, callback) {
					tokenParams.clientId = '*';
					tokenParams.capability = firstTime ? { wrong: ['*'] } : { right: ['*'] };
					firstTime = false;
					rest.auth.requestToken(tokenParams, null, function (err, tokenDetails) {
						if (err) {
							closeAndFinish(done, realtime, err);
							return;
						}
						callback(null, tokenDetails);
					});
				};

				realtime = helper.AblyRealtime(mixin(realtimeOpts, { authCallback: authCallback }));
				realtime.connection.once('connected', function () {
					var channel = realtime.channels.get('right');
					channel.attach(function (err) {
						try {
							expect(err, 'Check using first token, without channel attach capability').to.be.ok;
							expect(err.code).to.equal(40160, 'Check expected error code');
						} catch (err) {
							done(err);
							return;
						}

						/* soon after connected, reauth */
						realtime.auth.authorize(null, null, function (err) {
							try {
								expect(!err, err && displayError(err)).to.be.ok;
							} catch (err) {
								done(err);
								return;
							}
							channel.attach(function (err) {
								try {
									expect(!err, 'Check using second token, with channel attach capability').to.be.ok;
									closeAndFinish(done, realtime);
								} catch (err) {
									closeAndFinish(done, realtime, err);
								}
							});
						});
					});
				});
				monitorConnection(done, realtime);
			};
		});

		/* RSA10j */
		it('authorize_updates_stored_details', function (done) {
			var realtime = helper.AblyRealtime({
				autoConnect: false,
				defaultTokenParams: { version: 1 },
				token: '1',
				authUrl: '1'
			});

			try {
				expect(realtime.auth.tokenParams.version).to.equal(1, 'Check initial defaultTokenParams stored');
				expect(realtime.auth.tokenDetails.token).to.equal('1', 'Check initial token stored');
				expect(realtime.auth.authOptions.authUrl).to.equal('1', 'Check initial authUrl stored');
				realtime.auth.authorize({ version: 2 }, { authUrl: '2', token: '2' });
				expect(realtime.auth.tokenParams.version).to.equal(2, 'Check authorize updated the stored tokenParams');
				expect(realtime.auth.tokenDetails.token).to.equal('2', 'Check authorize updated the stored tokenDetails');
				expect(realtime.auth.authOptions.authUrl).to.equal('2', 'Check authorize updated the stored authOptions');
				realtime.auth.authorize(null, { token: '3' });
				expect(realtime.auth.authOptions.authUrl).to.equal(
					undefined,
					'Check authorize completely replaces stored authOptions with passed in ones'
				);

				/* TODO remove for lib version 1.0 */
				realtime.auth.authorize(null, { authUrl: 'http://invalid' });
				realtime.auth.authorize(null, { force: true });
				expect(realtime.auth.authOptions.authUrl).to.equal(
					'http://invalid',
					'Check authorize does *not* replace stored authOptions when the only option is "force" in 0.9, for compatibility with 0.8'
				);

				closeAndFinish(done, realtime);
			} catch (err) {
				closeAndFinish(done, realtime, err);
			}
		});

		/* RTN22
		 * Inject a fake AUTH message from realtime, check that we reauth and send our own in reply
		 */
		it('mocked_reauth', function (done) {
			var rest = helper.AblyRest(),
				authCallback = function (tokenParams, callback) {
					// Request a token (should happen twice)
					rest.auth.requestToken(tokenParams, null, function (err, tokenDetails) {
						if (err) {
							closeAndFinish(done, realtime, err);
							return;
						}
						callback(null, tokenDetails);
					});
				},
				realtime = helper.AblyRealtime({ authCallback: authCallback, transports: [helper.bestTransport] });

			realtime.connection.once('connected', function () {
				var transport = realtime.connection.connectionManager.activeProtocol.transport,
					originalSend = transport.send;
				/* Spy on transport.send to detect the outgoing AUTH */
				transport.send = function (message) {
					if (message.action === 17) {
						try {
							expect(message.auth.accessToken, 'Check AUTH message structure is as expected').to.be.ok;
							closeAndFinish(done, realtime);
						} catch (err) {
							closeAndFinish(done, realtime, err);
						}
					} else {
						originalSend.call(this, message);
					}
				};
				/* Inject a fake AUTH from realtime */
				transport.onProtocolMessage({ action: 17 });
			});
		});

		/*
		 * Request a token specifying a clientId and verify that the returned token
		 * has the requested clientId.
		 */
		it('auth_jwt_with_clientid', function (done) {
			var currentKey = helper.getTestApp().keys[0];
			var keys = { keyName: currentKey.keyName, keySecret: currentKey.keySecret };
			var clientId = 'testJWTClientId';
			var params = mixin(keys, { clientId: clientId });
			var authCallback = function (tokenParams, callback) {
				getJWT(params, callback);
			};

			var realtime = helper.AblyRealtime({ authCallback: authCallback });

			realtime.connection.on('connected', function () {
				try {
					expect(realtime.auth.clientId).to.equal(clientId);
					realtime.connection.close();
					done();
				} catch (err) {
					done(err);
				}
				return;
			});

			realtime.connection.on('failed', function (err) {
				realtime.close();
				done(err);
				return;
			});
		});

		/*
		 * Request a token specifying a clientId and verify that the returned token
		 * has the requested clientId. Token will be returned with content-type application/jwt.
		 */
		it('auth_jwt_with_clientid_application_jwt', function (done) {
			var currentKey = helper.getTestApp().keys[0];
			var keys = { keyName: currentKey.keyName, keySecret: currentKey.keySecret, returnType: 'jwt' };
			var clientId = 'testJWTClientId';
			var params = mixin(keys, { clientId: clientId });
			var authCallback = function (tokenParams, callback) {
				getJWT(params, callback);
			};

			var realtime = helper.AblyRealtime({ authCallback: authCallback });

			realtime.connection.on('connected', function () {
				try {
					expect(realtime.auth.clientId).to.equal(clientId);
					realtime.connection.close();
					done();
				} catch (err) {
					done(err);
				}
				return;
			});

			realtime.connection.on('failed', function (err) {
				realtime.close();
				done(err);
				return;
			});
		});

		/*
		 * Request a token specifying subscribe-only capabilities and verify that posting
		 * to a channel fails.
		 */
		it('auth_jwt_with_subscribe_only_capability', function (done) {
			var currentKey = helper.getTestApp().keys[3]; // get subscribe-only keys { "*":["subscribe"] }
			var params = { keyName: currentKey.keyName, keySecret: currentKey.keySecret };
			var authCallback = function (tokenParams, callback) {
				getJWT(params, callback);
			};

			var realtime = helper.AblyRealtime({ authCallback: authCallback });
			realtime.connection.once('connected', function () {
				var channel = realtime.channels.get(jwtTestChannelName);
				channel.publish('greeting', 'Hello World!', function (err) {
					try {
						expect(err.code).to.equal(40160, 'Verify publish denied code');
						expect(err.statusCode).to.equal(401, 'Verify publish denied status code');
						realtime.connection.close();
						done();
					} catch (err) {
						done(err);
					}
				});
			});
		});

		/* RSA8c
		 * Request a token with publish capabilities and verify that posting
		 * to a channel succeeds.
		 */
		it('auth_jwt_with_publish_capability', function (done) {
			var currentKey = helper.getTestApp().keys[0];
			var params = { keyName: currentKey.keyName, keySecret: currentKey.keySecret };
			var authCallback = function (tokenParams, callback) {
				getJWT(params, callback);
			};

			var publishEvent = 'publishEvent',
				messageData = 'Hello World!';
			var realtime = helper.AblyRealtime({ authCallback: authCallback });
			realtime.connection.once('connected', function () {
				var channel = realtime.channels.get(jwtTestChannelName);
				channel.subscribe(publishEvent, function (msg) {
					try {
						expect(msg.data).to.equal(messageData, 'Verify message data matches');
						realtime.connection.close();
						done();
					} catch (err) {
						done(err);
					}
				});
				channel.publish(publishEvent, messageData);
			});
		});

		/*
		 * Request a JWT token that is about to expire, check that the client disconnects
		 * and receives the expected reason in the state change.
		 */
		it('auth_jwt_with_token_that_expires', function (done) {
			var currentKey = helper.getTestApp().keys[0];
			var params = { keyName: currentKey.keyName, keySecret: currentKey.keySecret, expiresIn: 5 };
			var authCallback = function (tokenParams, callback) {
				getJWT(params, callback);
			};

			var realtime = helper.AblyRealtime({ authCallback: authCallback });
			realtime.connection.once('connected', function () {
				realtime.connection.once('disconnected', function (stateChange) {
					try {
						expect(stateChange.reason.code).to.equal(40142, 'Verify disconnected reason change code');
						realtime.connection.close();
						done();
					} catch (err) {
						done(err);
					}
				});
			});
		});

		/* RTC8a4
		 * Request a JWT token that is about to be renewed, check that the client reauths
		 * without going through a disconnected state.
		 */
		it('auth_jwt_with_token_that_renews', function (done) {
			var currentKey = helper.getTestApp().keys[0];
			// Sandbox sends an auth protocol message 30 seconds before a token expires.
			// We create a token that lasts 35 so there's room to receive the update event message.
			var params = { keyName: currentKey.keyName, keySecret: currentKey.keySecret, expiresIn: 35 };
			var authCallback = function (tokenParams, callback) {
				getJWT(params, callback);
			};

			var realtime = helper.AblyRealtime({ authCallback: authCallback });
			realtime.connection.once('connected', function () {
				var originalToken = realtime.auth.tokenDetails.token;
				realtime.connection.once('update', function () {
					try {
						expect(originalToken).to.not.equal(realtime.auth.tokenDetails.token, 'Verify a new token has been issued');
						realtime.connection.close();
						done();
					} catch (err) {
						done(err);
					}
				});
			});
		});

		/* RSC1
		 * Request a JWT token, initialize a realtime client with it and
		 * verify it can make authenticated calls.
		 */
		it('init_client_with_simple_jwt_token', function (done) {
			var currentKey = helper.getTestApp().keys[0];
			var params = { keyName: currentKey.keyName, keySecret: currentKey.keySecret };
			getJWT(params, function (err, token) {
				if (err) {
					done(err);
					return;
				}
				var realtime = helper.AblyRealtime({ token: token });
				realtime.connection.once('connected', function () {
					try {
						expect(token).to.equal(realtime.auth.tokenDetails.token, 'Verify that token is the same');
						realtime.connection.close();
						done();
					} catch (err) {
						done(err);
					}
				});
			});
		});

		/* RTN14b */
		it('reauth_consistently_expired_token', function (done) {
			var realtime,
				rest = helper.AblyRest();
			rest.auth.requestToken({ ttl: 1 }, function (err, token) {
				if (err) {
					done(err);
					return;
				}
				var authCallbackCallCount = 0;
				var authCallback = function (_, callback) {
					authCallbackCallCount++;
					callback(null, token.token);
				};
				/* Wait a few ms to ensure token is expired */
				setTimeout(function () {
					realtime = helper.AblyRealtime({ authCallback: authCallback, disconnectedRetryTimeout: 15000 });
					/* Wait 5s, expect to have seen two attempts to get a token -- so the
					 * authCallback called twice -- and the connection to now be sitting in
					 * the disconnected state */
					setTimeout(function () {
						try {
							expect(authCallbackCallCount).to.equal(2);
							expect(realtime.connection.state).to.equal('disconnected');
							closeAndFinish(done, realtime);
						} catch (err) {
							closeAndFinish(done, realtime, err);
						}
					}, 3000);
				}, 100);
			});
		});

		/* RSA4b1 - only autoremove expired tokens if have a server time offset set */
		it('expired_token_no_autoremove_when_dont_have_servertime', function (done) {
			var realtime,
				rest = helper.AblyRest();
			rest.auth.requestToken(function (err, token) {
				if (err) {
					done(err);
					return;
				}
				/* Fake an expired token */
				token.expires = Date.now() - 5000;
				var authCallbackCallCount = 0;
				var authCallback = function (_, callback) {
					authCallbackCallCount++;
					callback(null, token);
				};
				realtime = helper.AblyRealtime({ authCallback: authCallback });
				realtime.connection.on('connected', function () {
					try {
						expect(authCallbackCallCount).to.equal(1, 'Check we did not autoremove an expired token ourselves');
						closeAndFinish(done, realtime);
					} catch (err) {
						closeAndFinish(done, realtime, err);
					}
				});
			});
		});

		/* RSA4b1 second case */
		it('expired_token_autoremove_when_have_servertime', function (done) {
			var realtime,
				rest = helper.AblyRest();
			rest.auth.requestToken(function (err, token) {
				if (err) {
					done(err);
					return;
				}
				/* Fake an expired token */
				token.expires = Date.now() - 5000;
				var authCallbackCallCount = 0;
				var authCallback = function (_, callback) {
					authCallbackCallCount++;
					callback(null, token);
				};
				realtime = helper.AblyRealtime({ authCallback: authCallback, autoConnect: false });
				/* Set the server time offset */
				realtime.time(function () {
					realtime.connect();
					realtime.connection.on('connected', function () {
						try {
							expect(authCallbackCallCount).to.equal(
								2,
								'Check we did autoremove the expired token ourselves, so authCallback is called a second time'
							);
							closeAndFinish(done, realtime);
						} catch (err) {
							closeAndFinish(done, realtime, err);
						}
					});
				});
			});
		});

		/* Check that only the last authorize matters */
		it('multiple_concurrent_authorize', function (done) {
			var realtime = helper.AblyRealtime({
				log: { level: 4 },
				useTokenAuth: true,
				defaultTokenParams: { capability: { wrong: ['*'] } }
			});
			realtime.connection.once('connected', function () {
				realtime.auth.authorize({ capability: { stillWrong: ['*'] } }, function (err) {
					try {
						expect(!err, 'Check first authorize cb was called').to.be.ok;
					} catch (err) {
						done(err);
					}
				});
				realtime.auth.authorize({ capability: { alsoNope: ['*'] } }, function (err) {
					try {
						expect(!err, 'Check second authorize cb was called').to.be.ok;
					} catch (err) {
						done(err);
					}
				});
				realtime.auth.authorize({ capability: { wtfAreYouThinking: ['*'] } }, function (err) {
					try {
						expect(!err, 'Check third authorize one cb was called').to.be.ok;
					} catch (err) {
						done(err);
					}
				});
				realtime.auth.authorize({ capability: { right: ['*'] } }, function (err) {
					if (err) {
						closeAndFinish(done, realtime, err);
					}
					realtime.channels.get('right').attach(function (err) {
						try {
							expect(!err, (err && displayError(err)) || 'Successfully attached').to.be.ok;
							closeAndFinish(done, realtime);
						} catch (err) {
							closeAndFinish(done, realtime, err);
						}
					});
				});
			});
		});

		testOnAllTransports('authorize_immediately_after_init', function (realtimeOpts) {
			return function (done) {
				var realtime = helper.AblyRealtime({
					useTokenAuth: true,
					defaultTokenParams: { capability: { wrong: ['*'] } }
				});
				realtime.auth.authorize({ capability: { right: ['*'] } });
				realtime.connection.once('disconnected', function () {
					closeAndFinish(done, realtime, err);
				});
				realtime.connection.once('connected', function () {
					realtime.channels.get('right').attach(function (err) {
						try {
							expect(!err, (err && displayError(err)) || 'Successfully attached').to.be.ok;
							closeAndFinish(done, realtime);
						} catch (err) {
							closeAndFinish(done, realtime, err);
						}
					});
				});
			};
		});
	});
});
