"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	helper.describeWithCounter('rest/push', function (expect, counter) {
		var Resource = Ably.Rest.Resource,
			Utils = Ably.Rest.Utils,
			exports = {},
			_exports = {},
			displayError = helper.displayError,
			closeAndFinish = helper.closeAndFinish,
			defaultHeaders = Utils.defaultPostHeaders('msgpack'),
			testDevice = {
				id: 'testId',
				clientId: 'testClientId',
				deviceSecret: 'secret-testId',
				platform: 'android',
				formFactor: 'phone',
				push: {
					recipient: {
						transportType: 'gcm',
						registrationToken: 'xxxxxxxxxxx'
					}
				}
			},
			testDevice_withoutSecret = {
				id: 'testId',
				platform: 'android',
				formFactor: 'phone',
				push: {
					recipient: {
						transportType: 'gcm',
						registrationToken: 'xxxxxxxxxxx'
					}
				}
			};

		it('setup_push', function(done) {
			counter.expect(1);
			helper.setupApp(function() {
				expect(true, 'Setup REST library');
				counter.assert();
				done();
			});
		});

		it('push_getSubscriptions', function(done) {
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
					rest.push.admin.channelSubscriptions.save(sub, callback);
				});
				deletes.push(function(callback) {
					rest.push.admin.channelSubscriptions.remove(sub, callback);
				});
			})(i) }

			var rest = helper.AblyRest();

			async.series([function(callback) {
				async.parallel(subscribes, callback);
			}, function(callback) {
				rest.push.admin.channelSubscriptions.list({channel: 'pushenabled:foo1'}, callback);
			}, function(callback) {
				rest.push.admin.channelSubscriptions.list({channel: 'pushenabled:foo2'}, callback);
			}, function(callback) {
				async.parallel(deletes, callback);
			}], function(err, result) {
				if (err) {
					expect(false, err.message);
					done();
					return;
				}
				includesUnordered(untyped(result[1].items), untyped(subsByChannel['pushenabled:foo1']));
				includesUnordered(untyped(result[2].items), untyped(subsByChannel['pushenabled:foo2']));
				done();
			});
		});

		it('push_publish', function(done) {
			var realtime = helper.AblyRealtime();

			var channel = realtime.channels.get('pushenabled:foo');
			channel.attach(function(err) {
				if (err) {
					expect(false, err.message);
					closeAndFinish(done, realtime);
					return;
				}

				var pushPayload =  {
					notification: {title: 'Test message', body:'Test message body'},
					data: {foo: 'bar'}
				};

				var baseUri = realtime.baseUri(Ably.Rest.Defaults.getHost(realtime.options));
				var pushRecipient = {
					transportType: 'ablyChannel',
					channel: 'pushenabled:foo',
					ablyKey: realtime.options.key,
					ablyUrl: baseUri
				};

				channel.subscribe('__ably_push__', function(msg) {
					var receivedPushPayload = JSON.parse(msg.data);
					expect(receivedPushPayload.data).to.deep.equal(pushPayload.data);
					expect(receivedPushPayload.notification.title).to.deep.equal(pushPayload.notification.title);
					expect(receivedPushPayload.notification.body).to.deep.equal(pushPayload.notification.body);
					closeAndFinish(done, realtime);
				});

				realtime.push.admin.publish(pushRecipient, pushPayload, function(err) {
					if (err) {
						expect(false, err.message);
						closeAndFinish(done, realtime);
					}
				});
			});
		});

		it('push_publish_promise', function(done) {
			if(typeof Promise === 'undefined') {
				done();
				return;
			}
			var realtime = helper.AblyRealtime({promises: true});
			var channelName = 'pushenabled:publish_promise';
			var channel = realtime.channels.get(channelName);
			channel.attach(function(err) {
				if (err) {
					expect(false, err.message);
					closeAndFinish(done, realtime);
					return;
				}

				var pushPayload =  {
					notification: {title: 'Test message', body:'Test message body'},
					data: {foo: 'bar'}
				};

				var baseUri = realtime.baseUri(Ably.Rest.Defaults.getHost(realtime.options));
				var pushRecipient = {
					transportType: 'ablyChannel',
					channel: 'pushenabled:foo',
					ablyKey: realtime.options.key,
					ablyUrl: baseUri
				};

				channel.subscribe('__ably_push__', function(msg) {
					var receivedPushPayload = JSON.parse(msg.data);
					expect(receivedPushPayload.data).to.deep.equal(pushPayload.data);
					expect(receivedPushPayload.notification.title).to.deep.equal(pushPayload.notification.title);
					expect(receivedPushPayload.notification.body).to.deep.equal(pushPayload.notification.body);
					closeAndFinish(done, realtime);
				})

				realtime.push.admin.publish(pushRecipient, pushPayload).then(function() {
					closeAndFinish(done, realtime);
				})['catch'](function(err) {
					expect(false, displayError(err));
					closeAndFinish(done, realtime);
				});
			});
		});

		it('push_deviceRegistrations_save', function(done) {
			var rest = helper.AblyRest();

			async.series([function(callback) {
				rest.push.admin.deviceRegistrations.save(testDevice, callback);
			}, function(callback) {
				rest.push.admin.deviceRegistrations.get(testDevice.id, callback);
			}, function(callback) {
				rest.push.admin.deviceRegistrations.remove(testDevice.id, callback);
			}], function(err, result) {
				if (err) {
					expect(false, err.message);
					done();
					return;
				}
				var saved = result[0];
				var got = result[1];
				expect(got.push.state).to.equal('ACTIVE');
				delete got.metadata; // Ignore these properties for testing
				delete got.push.state;
				includesUnordered(untyped(got), testDevice_withoutSecret);
				includesUnordered(untyped(saved), testDevice_withoutSecret);
				done();
			});
		});

		it('push_deviceRegistrations_get_and_list', function(done) {
			var registrations = [];
			var deletes = [];
			var devices = [];
			var devices_withoutSecret = [];
			var devicesByClientId = {};
			var numberOfDevices = 5;
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
							registrationToken: 'xxxxxxxxxxx'
						}
					}
				};
				var device_withoutSecret = {
					id: 'device' + (i + 1),
					clientId: 'testClient' + ((i % 2) + 1),
					platform: 'android',
					formFactor: 'phone',
					push: {
						recipient: {
							transportType: 'gcm',
							registrationToken: 'xxxxxxxxxxx'
						}
					}
				};
				if (!devicesByClientId[device.clientId]) {
					devicesByClientId[device.clientId] = [];
				}
				devicesByClientId[device.clientId].push(device_withoutSecret);
				devices.push(device);
				devices_withoutSecret.push(device_withoutSecret);

				var rest = helper.AblyRest({clientId: device.clientId});
				registrations.push(function(callback) {
					rest.push.admin.deviceRegistrations.save(device, callback);
				});
				deletes.push(function(callback) {
					rest.push.admin.deviceRegistrations.remove('device' + (i + 1), callback);
				});
			})(i) }

			var rest = helper.AblyRest();

			async.series([function(callback) {
				async.parallel(registrations, callback);
			}, function(callback) {
				rest.push.admin.deviceRegistrations.list(null, callback);
			}, function(callback) {
				rest.push.admin.deviceRegistrations.list({clientId: 'testClient1'}, callback);
			}, function(callback) {
				rest.push.admin.deviceRegistrations.list({clientId: 'testClient2'}, callback);
			}, function(callback) {
				rest.push.admin.deviceRegistrations.get(devices[0].id, callback);
			}, function(callback) {
				async.parallel([function(callback) {
					rest.push.admin.deviceRegistrations.removeWhere({clientId: 'testClient1'}, callback);
				}, function(callback) {
					rest.push.admin.deviceRegistrations.removeWhere({clientId: 'testClient2'}, callback);
				}], callback);
			}, function(callback) {
				async.parallel(deletes, callback);
			}], function(err, result) {
				if (err) {
					expect(false, err.message);
					done();
					return;
				}
				expect(numberOfDevices).to.equal(result[0].length);
				includesUnordered(untyped(result[1].items), untyped(devices_withoutSecret));
				includesUnordered(untyped(result[2].items), untyped(devicesByClientId['testClient1']));
				includesUnordered(untyped(result[3].items), untyped(devicesByClientId['testClient2']));
				includesUnordered(untyped(result[4]), untyped(devices[0]));
				done();
			});
		});

		it('push_deviceRegistrations_remove_removeWhere', function(done) {
			var rest = helper.AblyRest();

			async.series([
			function(callback) {
				rest.push.admin.deviceRegistrations.save(testDevice, callback);
			}, function(callback) {
				rest.push.admin.deviceRegistrations.remove(testDevice.id, callback);
			}, function(callback) {
				rest.push.admin.deviceRegistrations.get(testDevice.id, function(err, result) {
					expect(err && err.statusCode).to.equal(404, 'Check device reg not found after removal');
					callback(null);
				});
			},
			function(callback) {
				rest.push.admin.deviceRegistrations.save(testDevice, callback);
			}, function(callback) {
				rest.push.admin.deviceRegistrations.removeWhere({deviceId: testDevice.id}, callback);
			}, function(callback) {
				rest.push.admin.deviceRegistrations.get(testDevice.id, function(err, result) {
					expect(err && err.statusCode).to.equal(404, 'Check device reg not found after removal');
					callback(null);
				});
			}
			], function(err, result) {
				if(err) {
					expect(false, displayError(err));
				}
				done();
			});
		});

		it('push_deviceRegistrations_promise', function(done) {
			if(typeof Promise === 'undefined') {
				done();
				return;
			}
			var rest = helper.AblyRest({promises: true});

			/* save */
			rest.push.admin.deviceRegistrations.save(testDevice).then(function(saved) {
				expect(saved.push.state).to.equal('ACTIVE');
				includesUnordered(test, untyped(saved), testDevice_withoutSecret);
			/* get */
				return rest.push.admin.deviceRegistrations.get(testDevice.id);
			}).then(function(got) {
				expect(got.push.state).to.equal('ACTIVE');
				delete got.metadata; // Ignore these properties for testing
				delete got.push.state;
				includesUnordered(test, untyped(got), testDevice_withoutSecret);
			/* list */
				return rest.push.admin.deviceRegistrations.list({clientId: testDevice.clientId});
			}).then(function(result) {
				expect(result.items.length).to.equal(1);
				var got = result.items[0];
				expect(got.push.state).to.equal('ACTIVE');
				includesUnordered(test, untyped(got), testDevice_withoutSecret);
			/* remove */
				return rest.push.admin.deviceRegistrations.removeWhere({deviceId: testDevice.id});
			}).then(function() {
				done();
			})['catch'](function(err) {
				expect(false, displayError(err));
				done();
			});
		});

		it('push_channelSubscriptions_save', function(done) {
			var rest = helper.AblyRest({clientId: 'testClient'});
			var subscription = {clientId: 'testClient', channel: 'pushenabled:foo'};

			async.series([function(callback) {
				rest.push.admin.channelSubscriptions.save(subscription, callback);
			}, function(callback) {
				rest.push.admin.channelSubscriptions.list({channel: 'pushenabled:foo'}, callback);
			}, function(callback) {
				rest.push.admin.channelSubscriptions.remove(subscription, callback);
			}], function(err, result) {
				if (err) {
					expect(false, err.message);
					done();
					return;
				}
				var saved = result[0];
				var sub = result[1].items[0];
				expect(subscription.clientId).to.equal(saved.clientId);
				expect(subscription.channel).to.equal(saved.channel);
				expect(subscription.clientId).to.equal(sub.clientId);
				expect(subscription.channel).to.equal(sub.channel);
				done();
			});
		});

		it('push_channelSubscriptions_get', function(done) {
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
					rest.push.admin.channelSubscriptions.remove({clientId: 'testClient' + i}, callback);
				});
			})(i) }

			var rest = helper.AblyRest();

			async.series([function(callback) {
				async.parallel(subscribes, callback);
			}, function(callback) {
				rest.push.admin.channelSubscriptions.list({channel: 'pushenabled:foo1'}, callback);
			}, function(callback) {
				rest.push.admin.channelSubscriptions.list({channel: 'pushenabled:foo2'}, callback);
			}, function(callback) {
				async.parallel(deletes, callback);
			}], function(err, result) {
				if (err) {
					expect(false, err.message);
					done();
					return;
				}
				includesUnordered(untyped(result[1].items), untyped(subsByChannel['pushenabled:foo1']));
				includesUnordered(untyped(result[2].items), untyped(subsByChannel['pushenabled:foo2']));
				done();
			});
		});

		it('push_channelSubscriptions_remove', function(done) {
			var rest = helper.AblyRest({clientId: 'testClient'});
			var subscription = {clientId: 'testClient', channel: 'pushenabled:foo'};

			async.series([function(callback) {
				rest.push.admin.channelSubscriptions.save(subscription, callback);
			}, function(callback) {
				rest.push.admin.channelSubscriptions.remove(subscription, callback);
			}], function(err, result) {
				if (err) {
					expect(false, err.message);
					done();
					return;
				}
				done();
			});
		});

		it('push_channelSubscriptions_listChannels', function(done) {
			var subscribes = [];
			var deletes = [];
			for (var i = 0; i < 5; i++) { (function(i) {
				var sub = {channel: 'pushenabled:listChannels' + ((i % 2) + 1), clientId: 'testClient' + ((i % 3) + 1)};
				var rest = helper.AblyRest({clientId: sub.clientId});
				subscribes.push(function(callback) {
					rest.push.admin.channelSubscriptions.save(sub, callback);
				});
				deletes.push(function(callback) {
					rest.push.admin.channelSubscriptions.remove(sub, callback);
				});
			})(i) }

			var rest = helper.AblyRest();

			async.series([function(callback) {
				async.parallel(subscribes, callback);
			}, function(callback) {
				rest.push.admin.channelSubscriptions.listChannels(null, callback);
			}, function(callback) {
				async.parallel(deletes, callback);
			}], function(err, result) {
				if (err) {
					expect(false, err.message);
					done();
					return;
				}
				includesUnordered(['pushenabled:listChannels1', 'pushenabled:listChannels2'], result[1].items);
				done();
			});
		});

		it('push_channelSubscriptions_promise', function(done) {
			if(typeof Promise === 'undefined') {
				done();
				return;
			}
			var rest = helper.AblyRest({promises: true});
			var channelId = 'pushenabled:channelsubscriptions_promise';
			var subscription = {clientId: 'testClient', channel: channelId};

			rest.push.admin.channelSubscriptions.save(subscription).then(function(saved) {
				expect(subscription.clientId).to.equal(saved.clientId);
				expect(subscription.channel).to.equal(saved.channel);
				return rest.push.admin.channelSubscriptions.list({channel: channelId});
			}).then(function(result) {
				var sub = result.items[0];
				expect(subscription.clientId).to.equal(sub.clientId);
				expect(subscription.channel).to.equal(sub.channel);
				return rest.push.admin.channelSubscriptions.listChannels(null);
			}).then(function(result) {
				expect(Utils.arrIn(result.items, channelId));
				return rest.push.admin.channelSubscriptions.remove(subscription);
			}).then(function() {
				done();
			})['catch'](function(err) {
				expect(false, displayError(err));
				done();
			});
		});

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

			var x = arguments[0];
			var y = arguments[1];

			var eq = includesUnordered(x, y);
			expect(eq === true, JSON.stringify(x, null, 2) + ' includesUnordered ' + JSON.stringify(y, null, 2) + ' (' + eq + ')');
		}
	});
});
