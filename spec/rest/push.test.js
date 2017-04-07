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

		async.series([function(callback) {
			rest.channels.get('pushenabled:foo').push.subscribeClientId(callback);
		}, function(callback) {
			req(rest, 'get', '/push/channelSubscriptions', subscription, null, null, callback);
		}, function(callback) {
			req(rest, 'delete', '/push/channelSubscriptions', subscription, null, null, callback);
		}], function(err, result) {
			if (err) {
				test.ok(false, err.message);
				test.done();
				return;
			}
			var subs = result[1][0];
			test.deepEqual([subscription], subs);
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
			req(rest, 'get', '/push/channelSubscriptions', {channel: 'pushenabled:foo'}, null, null, callback);
		}], function(err, result) {
			if (err) {
				test.ok(false, err.message);
				test.done();
				return;
			}
			var subs = result[1][0];
			test.deepEqual([], subs);
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
			req(rest, 'get', '/push/channelSubscriptions', subscription, null, null, callback);
		}], function(err, result) {
			if (err) {
				test.ok(false, err.message);
				test.done();
				return;
			}
			var subs = result[2][0];
			test.deepEqual([], subs);
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
			test.ok(!err, err);
			test.done();
		});
	};

	exports.push_getSubscriptions = function(test) {
		var subscribes = [];
		var deletes = [];
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

			var payload =  {
				notification: {title: 'test'},
				data: {foo: 'bar'},
			};

			channel.subscribe('__ably_push__', function(msg) {
				test.deepEqual(msg.data, payload);
				test.done();
			});

			realtime.push.publish({ablyChannel: 'pushenabled:foo'}, payload, function(err) {
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
			platform: 'android',
			formFactor: 'phone',
			push: {
				transportType: 'gcm',
				metadata: {registrationToken: 'xxxxxxxxxxx'},
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
		for (var i = 0; i < 5; i++) { (function(i) {
			var device = {
				id: 'device' + (i + 1),
				clientId: 'testClient' + ((i % 2) + 1),
				platform: 'android',
				formFactor: 'phone',
				push: {
					transportType: 'gcm',
					metadata: {registrationToken: 'xxxxxxxxxxx'},
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
			platform: 'android',
			formFactor: 'phone',
			push: {
				transportType: 'gcm',
				metadata: {registrationToken: 'xxxxxxxxxxx'},
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
				test.ok(false, err.message);
				test.done();
				return;
			}
			var got = result[2][0];
			test.ok(got.length === 0, got); // got is a Buffer
			test.done();
		});
	};

	exports.push_channelSubscriptions_save = function(test) {
		var rest = helper.AblyRest({clientId: 'testClient'});
		var subscription = {clientId: 'testClient', channel: 'pushenabled:foo'};

		async.series([function(callback) {
			rest.push.admin.channelSubscriptions.save(subscription, callback);
		}, function(callback) {
			req(rest, 'get', '/push/channelSubscriptions', subscription, null, null, callback);
		}, function(callback) {
			req(rest, 'delete', '/push/channelSubscriptions', subscription, null, null, callback);
		}], function(err, result) {
			if (err) {
				test.ok(false, err.message);
				test.done();
				return;
			}
			var got = result[1][0];
			includesUnordered(test, got, [subscription]);
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
		Resource.do(method, rest, path, body, headers, params, false, function(err, body, headers) {
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
