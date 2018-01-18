"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var Resource = Ably.Rest.Resource,
		Utils = Ably.Rest.Utils,
		exports = {},
		displayError = helper.displayError,
		defaultHeaders = Utils.defaultPostHeaders('msgpack'),
		msgpack = (typeof require !== 'function') ? Ably.msgpack : require('msgpack-js');

	exports.setup_push = function(test) {
		test.expect(1);
		helper.setupApp(function() {
			test.ok(true, 'Setup REST library');
			test.done();
		});
	};

	exports.push_subscribeClientId_ok = function(test) {
		var rest = helper.AblyRest({clientId: 'testClient'});
		var subscription = {channel: 'pushenabled:foo', clientId: 'testClient'};
		var pushChannel = rest.channels.get('pushenabled:foo').push

		async.series([function(callback) {
			pushChannel.subscribeClientId(callback);
		}, function(callback) {
			pushChannel.getSubscriptions(subscription, callback);
		}, function(callback) {
			req(rest, 'delete', '/push/channelSubscriptions', subscription, null, null, callback);
		}], function(err, result) {
			if (err) {
				test.ok(false, err.message);
				test.done();
				return;
			}
			var subscribeHttpCode = result[0][3];
			test.equal(subscribeHttpCode, 201);
			var subs = result[1].items;
			test.equal(subs.length, 1);
			var sub = subs[0];
			// deepEqual would fail because `sub` will have also a deviceId field
			test.equal(sub.channel, subscription.channel);
			test.equal(sub.clientId, subscription.clientId);
			var subsAfterDelete = result[2][0];
			test.deepEqual(subsAfterDelete, []);
			test.done();
		});
	};

	exports.push_subscribeClientId_no_client_id = function(test) {
		var rest = helper.AblyRest();

		async.series([function(callback) {
			rest.channels.get('pushenabled:foo').push.subscribeClientId(function(err) {
				err = err ? null : new Error('subscription subscription to fail');
				callback(err);
			});
		}, function(callback) {
			rest.channels.get('pushenabled:foo').push.getSubscriptions({channel: 'pushenabled:foo'}, callback);
		}], function(err, result) {
			if (err) {
				test.ok(false, err.message);
				test.done();
				return;
			}
			var subResult = result[0];
			test.equal(subResult, undefined);
			var subs = result[1].items;
			test.equal(subs.length, 0);
			test.done();
		});
	};

	exports.push_unsubscribeClientId_ok = function(test) {
		var rest = helper.AblyRest({clientId: 'testClient'});
		var subscription = {channel: 'pushenabled:foo', clientId: 'testClient'};

		async.series([function(callback) {
			rest.channels.get('pushenabled:foo').push.subscribeClientId(callback);
		}, function(callback) {
			rest.channels.get('pushenabled:foo').push.unsubscribeClientId(callback);
		}, function(callback) {
			rest.channels.get('pushenabled:foo').push.getSubscriptions(subscription, callback);
		}], function(err, result) {
			if (err) {
				test.ok(false, err.message);
				test.done();
				return;
			}
			var subscribeHttpCode = result[0][3];
			test.equal(subscribeHttpCode, 201);
			var unsubscribeHttpCode = result[1][3];
			test.equal(unsubscribeHttpCode, 204);
			var subsAfterDelete = result[1][0]
			test.deepEqual(subsAfterDelete, []);
			var subs = result[2].items;
			test.equal(0, subs.length);
			test.done();
		});
	};

	exports.push_unsubscribeClientId_no_client_id = function(test) {
		var rest = helper.AblyRest();

		async.series([function(callback) {
			rest.channels.get('pushenabled:foo').push.unsubscribeClientId(function(err) {
				err = err ? null : new Error('subscription subscription to fail');
				callback(err);
			});
		}], function(err, result) {
			test.deepEqual(result, [undefined]);
			test.ok(!err, err);
			test.done();
		});
	};

	exports.push_getSubscriptions = function(test) {
		var subscribes = [], deletes = [];
		var subsByChannel = {};
		for (var i = 0; i < 5; i++) { (function(i) {
			var sub = {channel: 'pushenabled:foo' + ((i % 2) + 1), clientId: 'testClient' + ((i % 3) + 1)};
			if (!subsByChannel[sub.channel]) {
				subsByChannel[sub.channel] = [];
			}
			subsByChannel[sub.channel].push(sub);

			var rest = helper.AblyRest({clientId: sub.clientId});
			subscribes.push(function(callback) {
				rest.channels.get(sub.channel).push.subscribeClientId(callback);
			});
			deletes.push(function(callback) {
				req(rest, 'delete', '/push/channelSubscriptions', sub, null, null, callback);
			});
		})(i) }

		var rest = helper.AblyRest();

		async.series([function(callback) {
			async.parallel(subscribes, callback);
		}, function(callback) {
			rest.channels.get('pushenabled:foo1').push.getSubscriptions(callback);
		}, function(callback) {
			rest.channels.get('pushenabled:foo2').push.getSubscriptions(callback);
		}, function(callback) {
			async.parallel(deletes, callback);
		}], function(err, result) {
			if (err) {
				test.ok(false, err.message);
				test.done();
				return;
			}
			includesUnordered(test, untyped(result[1].items), untyped(subsByChannel['pushenabled:foo1']));
			includesUnordered(test, untyped(result[2].items), untyped(subsByChannel['pushenabled:foo2']));
			test.done();
		});
	};

	exports.push_publish = function(test) {
		var realtime = helper.AblyRealtime();
		var testDone = test.done;
		test.done = function() {
			realtime.close();
			testDone.apply(this, arguments);
		};

		var channel = realtime.channels.get('pushenabled:foo');
		channel.attach(function(err) {
			if (err) {
				test.ok(false, err.message);
				test.done();
				return;
			}

			var pushPayload =  {
				notification: {title: 'Test message', body:'Test message body'},
				data: {foo: 'bar'}
			};

			const baseUri = realtime.baseUri(Ably.Rest.Defaults.getHost(realtime.options));
			const pushRecipient = {
				transportType: 'ablyChannel',
				channel: 'pushenabled:foo',
				ablyKey: realtime.options.key,
				ablyUrl: baseUri
			};

			channel.subscribe('__ably_push__', function(msg) {
				var receivedPushPayload = JSON.parse(msg.data);
				test.deepEqual(receivedPushPayload.data, pushPayload.data);
				test.deepEqual(receivedPushPayload.notification.title, pushPayload.notification.title);
				test.deepEqual(receivedPushPayload.notification.body, pushPayload.notification.body);
				test.done();
			});

			realtime.push.admin.publish(pushRecipient, pushPayload, function(err) {
				if (err) {
					test.ok(false, err.message);
					test.done();
				}
			});
		});
	};

	exports.push_deviceRegistrations_save = function(test) {
		var rest = helper.AblyRest();
		var device = {
			id: 'testId',
			deviceSecret: 'secret-testId',
			platform: 'android',
			formFactor: 'phone',
			push: {
				recipient: {
					transportType: 'gcm',
					registrationToken: 'xxxxxxxxxxx',
				},
			},
		};

		async.series([function(callback) {
			rest.push.admin.deviceRegistrations.save(device, callback);
		}, function(callback) {
			req(rest, 'get', '/push/deviceRegistrations/' + encodeURIComponent(device.id), null, null, null, callback);
		}, function(callback) {
			req(rest, 'delete', '/push/deviceRegistrations', {deviceId: device.id}, null, null, callback);
		}], function(err, result) {
			if (err) {
				test.ok(false, err.message);
				test.done();
				return;
			}
			var got = result[1][0];
			includesUnordered(test, got, device);
			test.done();
		});
	};

	exports.push_deviceRegistrations_get = function(test) {
		var registrations = [];
		var deletes = [];
		var devices = [];
		var devicesByClientId = {};
		let numberOfDevices = 5;
		for (var i = 0; i < numberOfDevices; i++) { (function(i) {
			var device = {
				id: 'device' + (i + 1),
				deviceSecret: 'secret-device' + (i + 1),
				clientId: 'testClient' + ((i % 2) + 1),
				platform: 'android',
				formFactor: 'phone',
				push: {
					recipient: {
						transportType: 'gcm',
						registrationToken: 'xxxxxxxxxxx',
					},
				},
			};
			if (!devicesByClientId[device.clientId]) {
				devicesByClientId[device.clientId] = [];
			}
			devicesByClientId[device.clientId].push(device);
			devices.push(device);

			var rest = helper.AblyRest({clientId: device.clientId});
			registrations.push(function(callback) {
				rest.push.admin.deviceRegistrations.save(device, callback);
			});
			deletes.push(function(callback) {
				req(rest, 'delete', '/push/deviceRegistrations', {deviceId: 'device' + (i + 1)}, null, null, callback);
			});
		})(i) }

		var rest = helper.AblyRest();

		async.series([function(callback) {
			async.parallel(registrations, callback);
		}, function(callback) {
			rest.push.admin.deviceRegistrations.get(null, callback);
		}, function(callback) {
			rest.push.admin.deviceRegistrations.get({clientId: 'testClient1'}, callback);
		}, function(callback) {
			rest.push.admin.deviceRegistrations.get({clientId: 'testClient2'}, callback);
		}, function(callback) {
			async.parallel([function(callback) {
				req(rest, 'delete', '/push/deviceRegistrations', {clientId: 'testClient1'}, null, null, callback);
			}, function(callback) {
				req(rest, 'delete', '/push/deviceRegistrations', {clientId: 'testClient2'}, null, null, callback);
			}], callback);
		}, function(callback) {
			async.parallel(deletes, callback);
		}], function(err, result) {
			if (err) {
				test.ok(false, err.message);
				test.done();
				return;
			}
			test.equal(numberOfDevices, result[0].length);
			includesUnordered(test, untyped(result[1].items), untyped(devices));
			includesUnordered(test, untyped(result[2].items), untyped(devicesByClientId['testClient1']));
			includesUnordered(test, untyped(result[3].items), untyped(devicesByClientId['testClient2']));
			test.done();
		});
	};

	exports.push_deviceRegistrations_remove = function(test) {
		var rest = helper.AblyRest();
		var device = {
			id: 'testId',
			deviceSecret: 'secret-testId',
			platform: 'android',
			formFactor: 'phone',
			push: {
				recipient: {
					transportType: 'gcm',
					registrationToken: 'xxxxxxxxxxx',
				},
			},
		};

		async.series([function(callback) {
			rest.push.admin.deviceRegistrations.save(device, callback);
		}, function(callback) {
			rest.push.admin.deviceRegistrations.remove({deviceId: device.id}, callback);
		}, function(callback) {
			req(rest, 'get', '/push/deviceRegistrations/' + encodeURIComponent(device.id), null, null, null, callback);
		}], function(err, result) {
			if (err) {
				test.equal(err.statusCode, 404, 'Verify device is not found');
				test.equal(err.code, 40400)
				test.done();
				return;
			}
			test.ok(false, 'Device erroneously returned');
			test.done();
		});
	};

	exports.push_channelSubscriptions_save = function(test) {
		var rest = helper.AblyRest({clientId: 'testClient'});
		var subscription = {clientId: 'testClient', channel: 'pushenabled:foo'};

		async.series([function(callback) {
			rest.push.admin.channelSubscriptions.save(subscription, callback);
		}, function(callback) {
			rest.channels.get('pushenabled:foo').push.getSubscriptions(subscription, callback);
		}, function(callback) {
			req(rest, 'delete', '/push/channelSubscriptions', subscription, null, null, callback);
		}], function(err, result) {
			if (err) {
				test.ok(false, err.message);
				test.done();
				return;
			}
			var sub = result[1].items[0];
			test.equal(subscription.clientId, sub.clientId);
			test.equal(subscription.channel, sub.channel);
			var subscriptionsAfterDelete = result[2][0];
			test.deepEqual(subscriptionsAfterDelete, []);
			test.done();
		});
	};

	exports.push_channelSubscriptions_get = function(test) {
		var subscribes = [];
		var deletes = [];
		var subsByChannel = {};
		for (var i = 0; i < 5; i++) { (function(i) {
			var sub = {channel: 'pushenabled:foo' + ((i % 2) + 1), clientId: 'testClient' + i};
			if (!subsByChannel[sub.channel]) {
				subsByChannel[sub.channel] = [];
			}
			subsByChannel[sub.channel].push(sub);

			var rest = helper.AblyRest();
			subscribes.push(function(callback) {
				rest.push.admin.channelSubscriptions.save(sub, callback);
			});
			deletes.push(function(callback) {
				req(rest, 'delete', '/push/channelSubscriptions', {clientId: 'testClient' + i}, null, null, callback);
			});
		})(i) }

		var rest = helper.AblyRest();

		async.series([function(callback) {
			async.parallel(subscribes, callback);
		}, function(callback) {
			rest.push.admin.channelSubscriptions.get({channel: 'pushenabled:foo1'}, callback);
		}, function(callback) {
			rest.push.admin.channelSubscriptions.get({channel: 'pushenabled:foo2'}, callback);
		}, function(callback) {
			async.parallel(deletes, callback);
		}], function(err, result) {
			if (err) {
				test.ok(false, err.message);
				test.done();
				return;
			}
			includesUnordered(test, untyped(result[1].items), untyped(subsByChannel['pushenabled:foo1']));
			includesUnordered(test, untyped(result[2].items), untyped(subsByChannel['pushenabled:foo2']));
			test.done();
		});
	};

	exports.push_channelSubscriptions_remove = function(test) {
		var rest = helper.AblyRest({clientId: 'testClient'});
		var subscription = {clientId: 'testClient', channel: 'pushenabled:foo'};

		async.series([function(callback) {
			rest.push.admin.channelSubscriptions.save(subscription, callback);
		}, function(callback) {
			rest.push.admin.channelSubscriptions.remove(subscription, callback);
		}, function(callback) {
			req(rest, 'delete', '/push/channelSubscriptions', subscription, null, null, callback);
		}], function(err, result) {
			if (err) {
				test.ok(false, err.message);
				test.done();
				return;
			}
			var got = result[2][0];
			test.ok(got.length === 0, got);
			test.done();
		});
	};

	exports.push_channelSubscriptions_listChannels = function(test) {
		var subscribes = [];
		for (var i = 0; i < 5; i++) { (function(i) {
			var sub = {channel: 'pushenabled:listChannels' + ((i % 2) + 1), clientId: 'testClient' + ((i % 3) + 1)};
			var rest = helper.AblyRest({clientId: sub.clientId});
			subscribes.push(function(callback) {
				rest.push.admin.channelSubscriptions.save(sub, callback);
			});
		})(i) }

		var rest = helper.AblyRest();

		async.series([function(callback) {
			async.parallel(subscribes, callback);
		}, function(callback) {
			rest.push.admin.channelSubscriptions.listChannels(null, callback);
		}], function(err, result) {
			if (err) {
				test.ok(false, err.message);
				test.done();
				return;
			}
			includesUnordered(test, ['pushenabled:listChannels1', 'pushenabled:listChannels2'], result[1].items);
			test.done();
		});
	};

	function req(rest, method, path, params, headers, body, callback) {
		headers = Utils.mixin(Utils.copy(defaultHeaders), headers || {});
		Resource.do(method, rest, path, body, headers, params, false, null, function(err, body, headers) {
			if (err) {
				callback(err);
				return;
			}
			try {
				body = msgpack.decode(body);
			} catch(e) {}
			callback(null, body, headers);
		});
	};

	function untyped(x) {
		return JSON.parse(JSON.stringify(x));
	}

	/**
	 * Tests whether x includes y: equal primitives, x's objects include y's
	 * objects, x's array elements include y's array elements disregarding
	 * order.
	 *
	 * includesUnordered(x, y) -> string | true
	 * includesUnordered(test, x, y) -> void
	*/
	function includesUnordered() {
		if (arguments.length == 2) {
			var x = arguments[0];
			var y = arguments[1];

			if (Utils.isArray(x)) {
				if (!Utils.isArray(y)) {
					return 'not both arrays';
				}

				if (x.length != y.length) {
					return 'different length arrays';
				}

				var matched = {};
				for (var i = 0; i < x.length; i++) {
					var results = {};
					var found = false;
					for (var j = 0; j < y.length; j++) {
						if (j in matched) {
							continue;
						}
						var eq = includesUnordered(x[i], y[j]);
						if (eq === true) {
							matched[j] = i;
							found = true;
						} else {
							results[j] = eq;
						}
					}
					if (!found) {
						var eq = "couldn't find matching element for " + i + "-th element: \n";
						for (var i in results) {
							eq += i + '. ' + results[i] + '\n';
						}
						return eq;
					}
				}

				return true;
			} else if (x instanceof Object) {
				if (!(x instanceof Object) || Utils.isArray(y)) {
					return 'not both objects';
				}

				for (var k in y) {
					if (!x.hasOwnProperty(k)) {
						return k + ': missing';
					}
					var eq = includesUnordered(x[k], y[k]);
					if (eq !== true) {
						return k + ': ' + eq;
					}
				}

				return true;
			}

			return x == y ? true : 'primitives not equal';
		}

		var test = arguments[0];
		var x = arguments[1];
		var y = arguments[2];

		var eq = includesUnordered(x, y);
		test.ok(eq === true, JSON.stringify(x, null, 2) + ' includesUnordered ' + JSON.stringify(y, null, 2) + ' (' + eq + ')');
	}

	return module.exports = helper.withTimeout(exports);
});
