"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	var exports = {};
	var displayError = helper.displayError;

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

	return module.exports = helper.withTimeout(exports);
});
