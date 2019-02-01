"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {};
	var _exports = {};
	var displayError = helper.displayError;
	var noop = function() {};

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


	/* Authenticate with a clientId and ensure that the clientId is not sent in the Message
		 and is implicitly added when published */
	exports.rest_implicit_client_id_0 = function(test) {
		var clientId = 'implicit_client_id_0',
			rest = helper.AblyRest({ clientId: clientId, useBinaryProtocol: false }),
			channel = rest.channels.get('rest_implicit_client_id_0');

		test.expect(3);

		var originalPublish = channel._publish;
		channel._publish = function(requestBody) {
			var message = JSON.parse(requestBody)[0];
			test.ok(message.name === 'event0', 'Outgoing message interecepted');
			test.ok(!message.clientId, 'client ID is not added by the client library as it is implicit');
			originalPublish.apply(channel, arguments);
		};

		channel.publish('event0', null, function(err) {
			if (err) {
				test.ok(false, 'Publish failed with implicit clientId: ' + displayError(err));
				return test.done();
			}

			channel.history(function(err, page) {
				if (err) {
					test.ok(false, 'History failed with implicit clientId: ' + displayError(err));
					return test.done();
				}

				var message = page.items[0];
				test.ok(message.clientId == clientId, 'Client ID was added implicitly');
				test.done();
			});
		});
	};

	/* Authenticate with a clientId and explicitly provide the same clientId in the Message
		 and ensure it is published */
	exports.rest_explicit_client_id_0 = function(test) {
		var clientId = 'explicit_client_id_0',
			rest = helper.AblyRest({ clientId: clientId, useBinaryProtocol: false }),
			channel = rest.channels.get('rest_explicit_client_id_0');

		test.expect(3);

		var originalPublish = channel._publish;
		channel._publish = function(requestBody) {
			var message = JSON.parse(requestBody)[0];
			test.ok(message.name === 'event0', 'Outgoing message interecepted');
			test.ok(message.clientId == clientId, 'client ID is added by the client library as it is explicit in the publish');
			originalPublish.apply(channel, arguments);
		};

		channel.publish({ name: 'event0', clientId: clientId}, function(err) {
			if (err) {
				test.ok(false, 'Publish failed with explicit clientId: ' + displayError(err));
				return test.done();
			}

			channel.history(function(err, page) {
				if (err) {
					test.ok(false, 'History failed with explicit clientId: ' + displayError(err));
					return test.done();
				}

				var message = page.items[0];
				test.ok(message.clientId == clientId, 'Client ID was retained');
				test.done();
			});
		});
	};

	/* Authenticate with a clientId and explicitly provide a different invalid clientId in the Message
		 and expect it to not be published and be rejected */
	exports.rest_explicit_client_id_1 = function(test) {
		var clientId = 'explicit_client_id_0',
			invalidClientId = 'invalid';

		test.expect(4);

		helper.AblyRest().auth.requestToken({ clientId: clientId }, function(err, token) {
			test.ok(token.clientId === clientId, 'client ID is present in the Token');

			// REST client uses a token string so is unaware of the clientId so cannot reject before communicating with Ably
			var rest = helper.AblyRest({ token: token.token, useBinaryProtocol: false }),
				channel = rest.channels.get('rest_explicit_client_id_1');

			var originalPublish = channel._publish;
			channel._publish = function(requestBody) {
				var message = JSON.parse(requestBody)[0];
				test.ok(message.name === 'event0', 'Outgoing message interecepted');
				test.ok(message.clientId == invalidClientId, 'invalid client ID is added by the client library as it is explicit in the publish');
				originalPublish.apply(channel, arguments);
			};

			channel.publish({ name: 'event0', clientId: invalidClientId}, function(err) {
				if (!err) {
					test.ok(false, 'Publish should have failed with invalid clientId');
					return test.done();
				}

				channel.history(function(err, page) {
					if (err) {
						test.ok(false, 'History failed with explicit clientId: ' + displayError(err));
						return test.done();
					}

					test.equal(page.items.length, 0, 'Message should not have been published');
					test.done();
				});
			});
		});
	};

	/* TO3l8; CD2C; RSL1i */
	exports.maxMessageSize = function(test) {
		test.expect(2);
		/* No connectionDetails mechanism for REST, so just pass the override into the constructor */
		var realtime = helper.AblyRest({maxMessageSize: 64}),
			channel = realtime.channels.get('maxMessageSize');

		channel.publish('foo', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', function(err) {
			test.ok(err, 'Check publish refused');
			test.equal(err.code, 40009);
			test.done();
		});
	};

	/* Check ids are correctly sent */
	// TODO enable when idempotent publishing works on sandbox
	// until then, test with ABLY_ENV=idempotent-dev
	_exports.idempotent_rest_publishing = function(test) {
		test.expect(2);
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
				test.ok(false, 'Publish failed with error ' + displayError(err));
				return test.done();
			}

			channel.history(function(err, page) {
				if(err) {
					test.ok(false, 'History failed with error ' + displayError(err));
					return test.done();
				}
				test.equal(page.items.length, 1, 'Check only one message published');
				test.equal(page.items[0].id, message.id, 'Check message id preserved in history');
				test.done();
			});
		});
	};

	/* Check ids are added when automatic idempotent rest publishing option enabled */
	exports.automatic_idempotent_rest_publishing = function(test) {
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
			test.equal(messageOne.name, 'one', 'Outgoing message 1 interecepted');
			test.equal(messageTwo.name, 'two', 'Outgoing message 2 interecepted');
			idOne = messageOne.id;
			idTwo = messageTwo.id;
			test.ok(idOne, 'id set on message 1');
			test.ok(idTwo, 'id set on message 2');
			test.equal(idOne && idOne.split(':')[1], '0', 'check zero-based index');
			test.equal(idTwo && idTwo.split(':')[1], '1', 'check zero-based index');
			originalPublish.apply(channel, arguments);
		};

		Ably.Rest.Http.doUri = function(method, rest, uri, headers, body, params, callback) {
			originalDoUri(method, rest, uri, headers, body, params, function(err) {
				if(err) {
					test.ok(false, 'Actual error from first post: ' + displayError(err));
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
				test.ok(false, 'Publish failed with error ' + displayError(err));
				return test.done();
			}

			channel.history({direction: 'forwards'}, function(err, page) {
				if(err) {
					test.ok(false, 'History failed with error ' + displayError(err));
					return test.done();
				}
				/* TODO uncomment when idempotent publishing works on sandbox
				 * until then, test with ABLY_ENV=idempotent-dev
				test.equal(page.items.length, 2, 'Only one message (with two items) should have been published');
				 */
				test.equal(page.items[0].id, idOne, 'Check message id 1 preserved in history');
				test.equal(page.items[1].id, idTwo, 'Check message id 1 preserved in history');
				test.done();
			});
		});
	};

	exports.restpublishpromise = function(test) {
		if(typeof Promise === 'undefined') {
			test.done();
			return;
		}
		test.expect(2);
		var rest = helper.AblyRest({promises: true});
		var channel = rest.channels.get('publishpromise');

		channel.publish('name', 'data').then(function() {
			test.ok(true, 'Check publish returns a promise that resolves on publish');
			return channel.history();
		}).then(function(page) {
			var message = page.items[0];
			test.ok(message.data == 'data', 'Check publish and history promise methods both worked as expected');
			test.done();
		})['catch'](function(err) {
			test.ok(false, 'Promise chain failed with error: ' + displayError(err));
			test.done();
		});
	};

	exports.restpublishparams = function(test) {
		test.expect(8);
		var rest = helper.AblyRest(),
			channel = rest.channels.get('publish_params');

		/* Stub out _publish to check params */
		var i = 0;
		channel._publish = function(requestBody, headers, params) {
			test.equal(params && params.testParam, 'testParamValue');
			if(++i === 8) {
				test.done();
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
	};

	return module.exports = helper.withTimeout(exports);
});
