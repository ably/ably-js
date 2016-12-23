"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {},
		clientId = 'testClientId',
		rest,
		mixin = helper.Utils.mixin,
		displayError = helper.displayError;

	exports.setupreauth = function(test) {
		test.expect(1);
		helper.setupApp(function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
			} else {
				rest = helper.AblyRest();
				test.ok(true, 'Set up app');
			}
			test.done();
		});
	};

	/* Waterfall helpers */

	function getToken(tokenParams) {
		return function(state, callback) {
			rest.auth.requestToken(tokenParams, null, function(err, token) {
				callback(err, mixin(state, {token: token}));
			});
		};
	}

	function close() {
		return function(state, callback) {
			state.connectionMonitor && state.realtime.connection.off(state.connectionMonitor);
			state.realtime.close();
			state.realtime.connection.once('closed', function() {
				callback(null, state);
			});
		};
	}

	function connectWithToken() {
		return function(state, callback) {
			var realtime = helper.AblyRealtime(mixin({token: state.token}, state.realtimeOpts));
			realtime.connection.once('connected', function() {
				callback(null, mixin(state, {realtime: realtime}));
			});
		};
	}

	/* For when connection should stay connected right through till it's closed */
	function monitorConnectionContinuity() {
		return function(state, callback) {
			var listener = function () {
				if(this.event !== 'update') {
					callback('Connection monitor: connection state changed to ' + this.event);
				}
			};
			state.realtime.connection.on(listener);
			callback(null, mixin(state, {connectionMonitor: listener}));
		};
	}

	function reauthWithToken() {
		return function(state, callback) {
			/* Callback once both authorize callback has callback and got 'update'
			 * event. (Latter will only happen one event loop cycle after the former;
			 * using async.parallel lets us test the update event without race
			 * conditions) */
			async.parallel([
				function(cb) {
					state.realtime.auth.authorize(null, {token: state.token}, cb);
				},
				function(cb) {
					state.realtime.connection.on('update', function(stateChange) {
						cb(stateChange.reason);
					});
				}
			], function(err) {
				callback(err, state);
			})
		};
	}

	function attach(channelName) {
		return function(state, callback) {
			var channel = state.realtime.channels.get(channelName);
			channel.attach(function(err) {
				callback(err, state);
			});
		};
	}

	function checkChannelState(channelName, expected) {
		return function(state, callback) {
			var channel = state.realtime.channels.get(channelName);
			var err = channel.state === expected ? null : 'checkChannelState: channel state was ' + channel.state + ', expected ' + expected;
			callback(err, state);
		};
	}
	function checkAttached(channelName) { return checkChannelState(channelName, 'attached'); }

	function waitChannelState(channelName, expected) {
		return function(state, callback) {
			var channel = state.realtime.channels.get(channelName);
			if(channel.state === expected) {
				callback(null, state);
				return;
			}
			var timeout = setTimeout(function() {
				channel.off();
				callback('waitChannelState: expected state not reached within 5s. Expected ' + expected + ', currently ' + channel.state);
			}, 5000);
			channel.once(function() {
				clearTimeout(timeout);
				waitChannelState(channelName, expected)(state, callback);
			});
		};
	}

	function checkChannelErrorCode(channelName, expected) {
		return function(state, callback) {
			var channel = state.realtime.channels.get(channelName),
				code = channel.errorReason && channel.errorReason.code;
			var err = code === expected ? null : 'checkChannelErrorCode: channel error code was ' + code + ', expected ' + expected;
			callback(err, state);
		};
	}

	function checkCantAttach(channelName) {
		return function(state, callback) {
			var channel = state.realtime.channels.get(channelName);
			channel.attach(function(err) {
				if(err && err.code === 40160) {
					callback(null, state);
				} else {
					callback(err || 'checkCantAttach: unexpectedly allowed to attach');
				}
			});
		};
	}

	function checkCanPublish(channelName) {
		return function(state, callback) {
			var channel = state.realtime.channels.get(channelName);
			channel.publish(null, null, function(err) {
				callback(err, state);
			});
		};
	}

	function checkCantPublish(channelName) {
		return function(state, callback) {
			var channel = state.realtime.channels.get(channelName);
			channel.publish(null, null, function(err) {
				if(err && err.code === 40160) {
					callback(null, state);
				} else {
					callback(err || 'checkCantPublish: unexpectedly allowed to publish');
				}
			});
		};
	}

	function testCase(name, steps) {
		helper.testOnAllTransports(exports, name, function(realtimeOpts) { return function(test) {
			test.expect(1);
			var _steps = steps.slice();
			_steps.unshift(function(cb) { cb(null, {realtimeOpts: realtimeOpts}); });
			async.waterfall(_steps, function(err) {
				test.ok(!err, err && (name + ': ' + displayError(err)));
				test.done();
			});
		};});
	}

	/****************
	***** Tests *****
	****************/

	/* RTC8a1 */
	testCase('reauthCapabilityUpgradeNewChannel', [
		getToken({clientId: clientId, capability: {'wrongchannel': ['*']}}),
		connectWithToken(),
		monitorConnectionContinuity(),
		checkCantAttach('rightchannel'),
		getToken({clientId: clientId, capability: {'wrongchannel': ['*'], 'rightchannel': ['*']}}),
		reauthWithToken(),
		attach('rightchannel'),
		close()
	]);

 /* RTC8a1 */
	testCase('reauthCapabilityDowngradeFullChannel', [
		getToken({clientId: clientId, capability: {'channel': ['*'], 'another': ['*']}}),
		connectWithToken(),
		monitorConnectionContinuity(),
		attach('channel'),
		getToken({clientId: clientId, capability: {'another': ['*']}}),
		reauthWithToken(),
		waitChannelState('channel', 'failed'),
		checkChannelErrorCode('channel', 40160),
		checkCantAttach('channel'),
		close()
	]);

	testCase('reauthCapabilityUpgradeAddPublish', [
		getToken({clientId: clientId, capability: {'channel': ['subscribe']}}),
		connectWithToken(),
		monitorConnectionContinuity(),
		attach('channel'),
		checkCantPublish('channel'),
		getToken({clientId: clientId, capability: {'channel': ['subscribe','publish']}}),
		reauthWithToken(),
		checkAttached('channel'),
		checkCanPublish('channel'),
		close()
	]);

	testCase('reauthCapabilityDowngradePublish', [
		getToken({clientId: clientId, capability: {'channel': ['subscribe','publish']}}),
		connectWithToken(),
		monitorConnectionContinuity(),
		attach('channel'),
		checkCanPublish('channel'),
		getToken({clientId: clientId, capability: {'channel': ['subscribe']}}),
		reauthWithToken(),
		attach('channel'),
		checkAttached('channel'),
		checkCantPublish('channel'),
		close()
	]);

	return module.exports = helper.withTimeout(exports);
});
