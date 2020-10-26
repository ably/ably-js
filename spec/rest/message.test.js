"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	helper.describeWithCounter('rest/message', function (expect, counter) {
		var exports = {};
		var _exports = {};
		var displayError = helper.displayError;
		var noop = function() {};

		it('setupInit', function(done) {
			counter.expect(1);
			helper.setupApp(function(err) {
				if(err) {
					expect(false, helper.displayError(err));
				} else {
					expect(true, 'app set up');
				}
				done();
			});
		});


		/* Authenticate with a clientId and ensure that the clientId is not sent in the Message
			and is implicitly added when published */
		it('rest_implicit_client_id_0', function(done) {
			var clientId = 'implicit_client_id_0',
				rest = helper.AblyRest({ clientId: clientId, useBinaryProtocol: false }),
				channel = rest.channels.get('rest_implicit_client_id_0');

			counter.expect(3);

			var originalPublish = channel._publish;
			channel._publish = function(requestBody) {
				var message = JSON.parse(requestBody)[0];
				expect(message.name === 'event0', 'Outgoing message interecepted');
				expect(!message.clientId, 'client ID is not added by the client library as it is implicit');
				originalPublish.apply(channel, arguments);
			};

			channel.publish('event0', null, function(err) {
				if (err) {
					expect(false, 'Publish failed with implicit clientId: ' + displayError(err));
					return done();
				}

				channel.history(function(err, page) {
					if (err) {
						expect(false, 'History failed with implicit clientId: ' + displayError(err));
						return done();
					}

					var message = page.items[0];
					expect(message.clientId == clientId, 'Client ID was added implicitly');
					counter.assert();
					done();
				});
			});
		});

		/* Authenticate with a clientId and explicitly provide the same clientId in the Message
			and ensure it is published */
		it('rest_explicit_client_id_0', function(done) {
			var clientId = 'explicit_client_id_0',
				rest = helper.AblyRest({ clientId: clientId, useBinaryProtocol: false }),
				channel = rest.channels.get('rest_explicit_client_id_0');

			counter.expect(3);

			var originalPublish = channel._publish;
			channel._publish = function(requestBody) {
				var message = JSON.parse(requestBody)[0];
				expect(message.name === 'event0', 'Outgoing message interecepted');
				expect(message.clientId == clientId, 'client ID is added by the client library as it is explicit in the publish');
				originalPublish.apply(channel, arguments);
			};

			channel.publish({ name: 'event0', clientId: clientId}, function(err) {
				if (err) {
					expect(false, 'Publish failed with explicit clientId: ' + displayError(err));
					return done();
				}

				channel.history(function(err, page) {
					if (err) {
						expect(false, 'History failed with explicit clientId: ' + displayError(err));
						return done();
					}

					var message = page.items[0];
					expect(message.clientId == clientId, 'Client ID was retained');
					counter.assert();
					done();
				});
			});
		});

		/* Authenticate with a clientId and explicitly provide a different invalid clientId in the Message
			and expect it to not be published and be rejected */
		it('rest_explicit_client_id_1', function(done) {
			var clientId = 'explicit_client_id_0',
				invalidClientId = 'invalid';

			counter.expect(4);

			helper.AblyRest().auth.requestToken({ clientId: clientId }, function(err, token) {
				expect(token.clientId === clientId, 'client ID is present in the Token');

				// REST client uses a token string so is unaware of the clientId so cannot reject before communicating with Ably
				var rest = helper.AblyRest({ token: token.token, useBinaryProtocol: false }),
					channel = rest.channels.get('rest_explicit_client_id_1');

				var originalPublish = channel._publish;
				channel._publish = function(requestBody) {
					var message = JSON.parse(requestBody)[0];
					expect(message.name === 'event0', 'Outgoing message interecepted');
					expect(message.clientId == invalidClientId, 'invalid client ID is added by the client library as it is explicit in the publish');
					originalPublish.apply(channel, arguments);
				};

				channel.publish({ name: 'event0', clientId: invalidClientId}, function(err) {
					if (!err) {
						expect(false, 'Publish should have failed with invalid clientId');
						return done();
					}

					channel.history(function(err, page) {
						if (err) {
							expect(false, 'History failed with explicit clientId: ' + displayError(err));
							return done();
						}

						expect(page.items.length).to.equal(0, 'Message should not have been published');
						counter.assert();
						done();
					});
				});
			});
		});

		/* TO3l8; CD2C; RSL1i */
		it('maxMessageSize', function(done) {
			counter.expect(2);
			/* No connectionDetails mechanism for REST, so just pass the override into the constructor */
			var realtime = helper.AblyRest({maxMessageSize: 64}),
				channel = realtime.channels.get('maxMessageSize');

			channel.publish('foo', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', function(err) {
				expect(err, 'Check publish refused');
				expect(err.code).to.equal(40009);
				counter.assert();
				done();
			});
		});

		/* Check ids are correctly sent */
		it('idempotent_rest_publishing', function(done) {
			counter.expect(2);
			var rest = helper.AblyRest({idempotentRestPublishing: false, useBinaryProtocol: false}),
				channel = rest.channels.get('idempotent_rest_publishing'),
				originalPost = Ably.Rest.Http.post,
				originalPublish = channel._publish,
				message = {name: 'test', id: 'idempotent-msg-id:0'};

			async.parallel([
				function(parCb) { channel.publish(message, parCb); },
				function(parCb) { channel.publish(message, parCb); },
				function(parCb) { channel.publish(message, parCb); }
			], function(err) {
				if(err) {
					expect(false, 'Publish failed with error ' + displayError(err));
					return done();
				}

				channel.history(function(err, page) {
					if(err) {
						expect(false, 'History failed with error ' + displayError(err));
						return done();
					}
					expect(page.items.length).to.equal(1, 'Check only one message published');
					expect(page.items[0].id).to.equal(message.id, 'Check message id preserved in history');
					counter.assert();
					done();
				});
			});
		});

		/* Check ids are added when automatic idempotent rest publishing option enabled */
		it('automatic_idempotent_rest_publishing', function(done) {
			/* easiest way to get the host we're using for tests */
			var dummyRest = helper.AblyRest(),
				host = dummyRest.options.restHost,
				/* Add the same host as a bunch of fallback hosts, so after the first
				* request 'fails' we retry on the same host using the fallback mechanism */
				rest = helper.AblyRest({idempotentRestPublishing: true, useBinaryProtocol: false, fallbackHosts: [ host, host, host ]}),
				channel = rest.channels.get('automatic_idempotent_rest_publishing'),
				originalPost = Ably.Rest.Http.post,
				idOne,
				idTwo,
				originalPublish = channel._publish,
				originalDoUri = Ably.Rest.Http.doUri;

			channel._publish = function(requestBody) {
				var messageOne = JSON.parse(requestBody)[0];
				var messageTwo = JSON.parse(requestBody)[1];
				expect(messageOne.name).to.equal('one', 'Outgoing message 1 interecepted');
				expect(messageTwo.name).to.equal('two', 'Outgoing message 2 interecepted');
				idOne = messageOne.id;
				idTwo = messageTwo.id;
				expect(idOne, 'id set on message 1');
				expect(idTwo, 'id set on message 2');
				expect(idOne && idOne.split(':')[1]).to.equal('0', 'check zero-based index');
				expect(idTwo && idTwo.split(':')[1]).to.equal('1', 'check zero-based index');
				originalPublish.apply(channel, arguments);
			};

			Ably.Rest.Http.doUri = function(method, rest, uri, headers, body, params, callback) {
				originalDoUri(method, rest, uri, headers, body, params, function(err) {
					if(err) {
						expect(false, 'Actual error from first post: ' + displayError(err));
						callback(err);
						return;
					}
					/* Fake a publish error from realtime */
					callback({message: 'moo', code: 50300, statusCode: 503});
				});
				Ably.Rest.Http.doUri = originalDoUri;
			};

			channel.publish([ {name: 'one'}, {name: 'two'} ], function(err) {
				if(err) {
					expect(false, 'Publish failed with error ' + displayError(err));
					return done();
				}

				channel.history({direction: 'forwards'}, function(err, page) {
					if(err) {
						expect(false, 'History failed with error ' + displayError(err));
						return done();
					}
					/* TODO uncomment when idempotent publishing works on sandbox
					* until then, test with ABLY_ENV=idempotent-dev
					test.equal(page.items.length, 2, 'Only one message (with two items) should have been published');
					*/
					expect(page.items[0].id).to.equal(idOne, 'Check message id 1 preserved in history');
					expect(page.items[1].id).to.equal(idTwo, 'Check message id 1 preserved in history');
					done();
				});
			});
		});

		it('restpublishpromise', function(done) {
			if(typeof Promise === 'undefined') {
				done();
				return;
			}
			counter.expect(2);
			var rest = helper.AblyRest({promises: true});
			var channel = rest.channels.get('publishpromise');

			channel.publish('name', 'data').then(function() {
				expect(true, 'Check publish returns a promise that resolves on publish');
				return channel.history();
			}).then(function(page) {
				var message = page.items[0];
				expect(message.data == 'data', 'Check publish and history promise methods both worked as expected');
				done();
			})['catch'](function(err) {
				expect(false, 'Promise chain failed with error: ' + displayError(err));
				done();
			});
		});

		it('restpublishparams', function(done) {
			counter.expect(8);
			var rest = helper.AblyRest(),
				channel = rest.channels.get('publish_params');

			/* Stub out _publish to check params */
			var i = 0;
			channel._publish = function(requestBody, headers, params) {
				expect(params && params.testParam).to.equal('testParamValue');
				if(++i === 8) {
					counter.assert();
					done();
				}
			};

			channel.publish('foo', 'bar', {testParam: 'testParamValue'});
			channel.publish('foo', {data: 'data'}, {testParam: 'testParamValue'});
			channel.publish('foo', {data: 'data'}, {testParam: 'testParamValue'}, noop);
			channel.publish('foo', null, {testParam: 'testParamValue'});
			channel.publish(null, 'foo', {testParam: 'testParamValue'});
			channel.publish({name: 'foo', data: 'bar'}, {testParam: 'testParamValue'});
			channel.publish([{name: 'foo', data: 'bar'}], {testParam: 'testParamValue'});
			channel.publish([{name: 'foo', data: 'bar'}], {testParam: 'testParamValue'}, noop);
		});
	});
});
