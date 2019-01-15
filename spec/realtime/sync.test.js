"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var exports = {},
		_exports = {},
		displayError = helper.displayError,
		utils = helper.Utils,
		closeAndFinish = helper.closeAndFinish,
		createPM = Ably.Realtime.ProtocolMessage.fromDeserialized,
		monitorConnection = helper.monitorConnection;

	exports.setupSync = function(test) {
		test.expect(1);
		helper.setupApp(function(err) {
			test.ok(!err, 'app set up ' + (err && displayError(err)));
			test.done();
		});
	};

	function extractClientIds(presenceSet) {
		return utils.arrMap(presenceSet, function(presmsg) {
			return presmsg.clientId;
		}).sort();
	}

	function extractMember(presenceSet, clientId) {
		return helper.arrFind(presenceSet, function(member) {
			return member.clientId === clientId;
		});
	}

	/*
	 * Sync with an existing presence set - should discard any member who wasn't
	 * included in the sync.
	 * Note: doesn't use a real connection as everything's being done with
	 * simulated protocol messages. Start with a fake-attached channel with no
	 * sync in progress, then do one sync, then a second with a slightly
	 * different presence set
	 */
	exports.sync_existing_set = function(test) {
		test.expect(6);
		var realtime = helper.AblyRealtime({autoConnect: false}),
			channelName = 'syncexistingset',
			channel = realtime.channels.get(channelName);

		channel.onMessage(createPM({
			action: 11,
			channel: channelName,
			flags: 1
		}));

		async.series([
			function(cb) {
				channel.onMessage({
					action: 16,
					channel: channelName,
					presence: [
						{
							action: 'present',
							clientId: 'one',
							connectionId: 'one_connid',
							id: 'one_connid:0:0',
							timestamp: 1e12
						},
						{
							action: 'present',
							clientId: 'two',
							connectionId: 'two_connid',
							id: 'two_connid:0:0',
							timestamp: 1e12
						}
					]});
				cb();
			},
			function(cb) {
				channel.presence.get(function(err, results) {
					test.equal(results.length, 2, 'Check correct number of results');
					test.ok(channel.presence.syncComplete, 'Check in sync');
					test.deepEqual(extractClientIds(results), ['one', 'two'], 'check correct members');
					cb(err);
				});
			},
			function(cb) {
				/* Trigger another sync. Two has gone without so much as a `leave` message! */
				channel.onMessage({
					action: 16,
					channel: channelName,
					presence: [
						{
							action: 'present',
							clientId: 'one',
							connectionId: 'one_connid',
							id: 'one_connid:0:0',
							timestamp: 1e12
						},
						{
							action: 'present',
							clientId: 'three',
							connectionId: 'three_connid',
							id: 'three_connid:0:0',
							timestamp: 1e12
						}
					]});
				cb();
			},
			function(cb) {
				channel.presence.get(function(err, results) {
					test.equal(results.length, 2, 'Check correct number of results');
					test.ok(channel.presence.syncComplete, 'Check in sync');
					test.deepEqual(extractClientIds(results), ['one', 'three'], 'check two has gone and three is there');
					cb(err);
				});
			}
		], function(err) {
			if(err) test.ok(false, helper.displayError(err));
			test.done();
		});
	};

	/*
	 * Sync with an existing presence set and a presence member added in the
	 * middle of the sync should should discard the former, but not the latter
	 * */
	exports.sync_member_arrives_in_middle = function(test) {
		test.expect(3);
		var realtime = helper.AblyRealtime({autoConnect: false}),
			channelName = 'sync_member_arrives_in_middle',
			channel = realtime.channels.get(channelName);

		channel.onMessage(createPM({
			action: 11,
			channel: channelName,
			flags: 1
		}));

		/* First sync */
		channel.onMessage({
			action: 16,
			channel: channelName,
			presence: [
				{
					action: 'present',
					clientId: 'one',
					connectionId: 'one_connid',
					id: 'one_connid:0:0',
					timestamp: 1e12
				}
			]});

		/* A second sync, this time in multiple parts, with a presence message in the middle */
		channel.onMessage({
			action: 16,
			channel: channelName,
			channelSerial: 'serial:cursor',
			presence: [
				{
					action: 'present',
					clientId: 'two',
					connectionId: 'two_connid',
					id: 'two_connid:0:0',
					timestamp: 1e12
				}
			]});

		channel.onMessage({
			action: 14,
			channel: channelName,
			presence: [
				{
					action: 'enter',
					clientId: 'three',
					connectionId: 'three_connid',
					id: 'three_connid:0:0',
					timestamp: 1e12
				}
			]});

		channel.onMessage({
			action: 16,
			channel: channelName,
			channelSerial: 'serial:',
			presence: [
				{
					action: 'present',
					clientId: 'four',
					connectionId: 'four_connid',
					id: 'four_connid:0:0',
					timestamp: 1e12
				}
			]});

		channel.presence.get(function(err, results) {
			test.equal(results.length, 3, 'Check correct number of results');
			test.ok(channel.presence.syncComplete, 'Check in sync');
			test.deepEqual(extractClientIds(results), ['four', 'three', 'two'], 'check expected presence members');
			test.done();
		});
	};

	/*
	 * Presence message that was in the sync arrives again as a normal message, after it's come in the sync
	 */
	exports.sync_member_arrives_normally_after_came_in_sync = function(test) {
		test.expect(3);
		var realtime = helper.AblyRealtime({autoConnect: false}),
			channelName = 'sync_member_arrives_normally_after_came_in_sync',
			channel = realtime.channels.get(channelName);

		channel.onMessage(createPM({
			action: 11,
			channel: channelName,
			flags: 1
		}));

		channel.onMessage({
			action: 16,
			channel: channelName,
			channelSerial: 'serial:cursor',
			presence: [
				{
					action: 'present',
					clientId: 'one',
					connectionId: 'one_connid',
					id: 'one_connid:0:0',
					timestamp: 1e12
				}
			]});

		channel.onMessage({
			action: 14,
			channel: channelName,
			presence: [
				{
					action: 'enter',
					clientId: 'one',
					connectionId: 'one_connid',
					id: 'one_connid:0:0',
					timestamp: 1e12
				}
			]});

		channel.onMessage({
			action: 16,
			channel: channelName,
			channelSerial: 'serial:',
			presence: [
				{
					action: 'present',
					clientId: 'two',
					connectionId: 'two_connid',
					id: 'two_connid:0:0',
					timestamp: 1e12
				}
			]});

		channel.presence.get(function(err, results) {
			test.equal(results.length, 2, 'Check correct number of results');
			test.ok(channel.presence.syncComplete, 'Check in sync');
			test.deepEqual(extractClientIds(results), ['one', 'two'], 'check expected presence members');
			test.done();
		});
	};

	/*
	 * Presence message that will be in the sync arrives as a normal message, before it comes in the sync
	 */
	exports.sync_member_arrives_normally_before_comes_in_sync = function(test) {
		test.expect(3);
		var realtime = helper.AblyRealtime({autoConnect: false}),
			channelName = 'sync_member_arrives_normally_before_comes_in_sync',
			channel = realtime.channels.get(channelName);

		channel.onMessage(createPM({
			action: 11,
			channel: channelName,
			flags: 1
		}));

		channel.onMessage({
			action: 16,
			channel: channelName,
			channelSerial: 'serial:cursor',
			presence: [
				{
					action: 'present',
					clientId: 'one',
					connectionId: 'one_connid',
					id: 'one_connid:0:0',
					timestamp: 1e12
				}
			]});

		channel.onMessage({
			action: 14,
			channel: channelName,
			presence: [
				{
					action: 'enter',
					clientId: 'two',
					connectionId: 'two_connid',
					id: 'two_connid:0:0',
					timestamp: 1e12
				}
			]});

		channel.onMessage({
			action: 16,
			channel: channelName,
			channelSerial: 'serial:',
			presence: [
				{
					action: 'present',
					clientId: 'two',
					connectionId: 'two_connid',
					id: 'two_connid:0:0',
					timestamp: 1e12
				}
			]});

		channel.presence.get(function(err, results) {
			test.equal(results.length, 2, 'Check correct number of results');
			test.ok(channel.presence.syncComplete, 'Check in sync');
			test.deepEqual(extractClientIds(results), ['one', 'two'], 'check expected presence members');
			test.done();
		});
	};

	/*
	 * Get several presence messages with various combinations of msgserial,
	 * index, and synthesized leaves, check that the end result is correct
	 */
	exports.presence_ordering = function(test) {
		test.expect(5);
		var realtime = helper.AblyRealtime({autoConnect: false}),
			channelName = 'sync_ordering',
			channel = realtime.channels.get(channelName);

		channel.onMessage(createPM({
			action: 11,
			channel: channelName
		}));

		/* One enters */
		channel.onMessage({
			action: 14,
			channel: channelName,
			id: 'one_connid:1',
			connectionId: 'one_connid',
			timestamp: 1e12,
			presence: [
				{
					action: 'enter',
					clientId: 'one'
				}
			]});

		/* An earlier leave from one (should be ignored) */
		channel.onMessage({
			action: 14,
			channel: channelName,
			connectionId: 'one_connid',
			id: 'one_connid:0',
			timestamp: 1e12,
			presence: [
				{
					action: 'leave',
					clientId: 'one'
				}
			]});

		/* One adds some data in a newer msgSerial */
		channel.onMessage({
			action: 14,
			channel: channelName,
			connectionId: 'one_connid',
			id: 'one_connid:2',
			timestamp: 1e12,
			presence: [
				{
					action: 'update',
					clientId: 'one',
					data: 'onedata'
				}
			]});

		/* Two enters */
		channel.onMessage({
			action: 14,
			channel: channelName,
			connectionId: 'two_connid',
			id: 'two_connid:0',
			timestamp: 1e12,
			presence: [
				{
					action: 'enter',
					clientId: 'two'
				}
			]});

		/* Two updates twice in the same message */
		channel.onMessage({
			action: 14,
			channel: channelName,
			connectionId: 'two_connid',
			id: 'two_connid:0',
			timestamp: 1e12,
			presence: [
				{
					action: 'update',
					clientId: 'two',
					data: 'twowrongdata'
				},
				{
					action: 'update',
					clientId: 'two',
					data: 'twodata'
				}
			]});

		/* Three enters */
		channel.onMessage({
			action: 14,
			channel: channelName,
			connectionId: 'three_connid',
			id: 'three_connid:99',
			timestamp: 1e12,
			presence: [
				{
					action: 'enter',
					clientId: 'three'
				}
			]});

		/* Synthesized leave for three (with earlier msgSerial, incompatible id,
		 * and later timestamp) */
		channel.onMessage({
			action: 14,
			channel: channelName,
			connectionId: 'synthesized',
			id: 'synthesized:0',
			timestamp: 1e12 + 1,
			presence: [
				{
					action: 'leave',
					clientId: 'three',
					connectionId: 'three_connid'
				}
			]});

		channel.presence.get(function(err, results) {
			test.equal(results.length, 2, 'Check correct number of results');
			test.ok(channel.presence.syncComplete, 'Check in sync');
			test.deepEqual(extractClientIds(results), ['one', 'two'], 'check expected presence members');
			test.equal(extractMember(results, 'one').data, 'onedata', 'check correct data on one');
			test.equal(extractMember(results, 'two').data, 'twodata', 'check correct data on two');
			test.done();
		});
	};

	/*
	 * Do a 110-member sync, so split into two sync messages. Inject a normal
	 * presence enter between the syncs. Check everything was entered correctly
	 */
	exports.presence_sync_interruptus = function(test) {
		if(helper.bestTransport === 'jsonp') {
			/* JSONP can't cope with entering 110 people in one go. */
			console.log("Skipping presence_sync_interruptus test (jsonp)");
			test.done();
			return;
		}
		test.expect(1);
		var channelName = "presence_sync_interruptus";
		var interrupterClientId = "dark_horse";
		var enterer = helper.AblyRealtime();
		var syncer = helper.AblyRealtime();
		var entererChannel = enterer.channels.get(channelName);
		var syncerChannel = syncer.channels.get(channelName);

		function waitForBothConnect(cb) {
			async.parallel([
				function(connectCb) { enterer.connection.on('connected', connectCb); },
				function(connectCb) { syncer.connection.on('connected', connectCb); }
			], function() { cb(); });
		}

		async.series([
			waitForBothConnect,
			function(cb) { entererChannel.attach(cb); },
			function(cb) {
				async.times(110, function(i, presCb) {
					entererChannel.presence.enterClient(i.toString(), null, presCb);
				}, cb);
			},
			function(cb) {
				var originalOnMessage = syncerChannel.onMessage;
				syncerChannel.onMessage = function(message) {
					originalOnMessage.apply(this, arguments);
					/* Inject an additional presence message after the first sync */
					if(message.action === 16) {
						syncerChannel.onMessage = originalOnMessage;
						syncerChannel.onMessage({
							"action": 14,
							"id": "messageid:0",
							"connectionId": "connid",
							"timestamp": 2000000000000,
							"presence": [{
								"clientId": interrupterClientId,
								"action": 'enter'
							}]});
					}
				};
				syncerChannel.attach(cb);
			},
			function(cb) {
				syncerChannel.presence.get(function(err, presenceSet) {
					test.equal(presenceSet && presenceSet.length, 111, 'Check everyone’s in presence set');
					cb(err);
				});
			}
		], function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
			}
			closeAndFinish(test, [enterer, syncer]);
		});
	};

	return module.exports = helper.withTimeout(exports);
});
