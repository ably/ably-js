"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var rest,
		exports = {},
		_exports = {},
		utils = helper.Utils;

	exports.setuptime = function(test) {
		test.expect(1);
		helper.setupApp(function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}

			rest = helper.AblyRest({log: {level: 4}});
			test.ok(true, 'app set up');
			test.done();
		});
	};

	exports.request_time = function(test) {
		test.expect(5);
		rest.request('get', '/time', null, null, null, function(err, res) {
			test.ok(!err, err && helper.displayError(err));
			test.equal(res.statusCode, 200, 'Check statusCode');
			test.equal(res.success, true, 'Check success');
			test.ok(utils.isArray(res.items), true, 'Check array returned');
			test.equal(res.items.length, 1, 'Check array was of length 1');
			test.done();
		});
	};

	exports.request_404 = function(test) {
		test.expect(2);
		/* NB: can't just use /invalid or something as the CORS preflight will
		 * fail. Need something superficially a valid path but where the actual
		 * request fails */
		rest.request('get', '/keys/ablyjs.test/requestToken', null, null, null, function(err, res) {
			test.equal(err.statusCode, 404, 'Check statusCode');
			test.equal(err.code, 40400, 'Check code');
			test.done();
		});
	};

	/* Use the request feature to publish, then retrieve (one at a time), some messages */
	exports.request_post_get_messages = function(test) {
		test.expect(23);
		var channelName = 'request_post_get_messages',
			channelPath = '/channels/' + channelName + '/messages',
			msgone = {name: 'faye', data: 'whittaker'},
			msgtwo = {name: 'martin', data: 'reed'};

		async.waterfall([
			function(cb) {
				rest.request('post', channelPath, null, msgone, null, function(err, res) {
					test.ok(!err, err && helper.displayError(err));
					test.equal(res.statusCode, 201, 'Check statusCode is 201');
					test.equal(res.success, true, 'Check post was a success');
					test.deepEqual(res.items, [{}], 'Check items is as expected');
					cb();
				});
			},
			function(cb) {
				rest.request('post', channelPath, null, msgtwo, null, function(err, res) {
					test.ok(!err, err && helper.displayError(err));
					test.equal(res.statusCode, 201, 'Check statusCode is 201');
					test.deepEqual(res.items, [{}], 'Check items is as expected');
					cb();
				});
			},
			function(cb) {
				rest.request('get', channelPath, {limit: 1, direction: 'forwards'}, null, null, function(err, res) {
					test.ok(!err, err && helper.displayError(err));
					test.equal(res.statusCode, 200, 'Check statusCode is 200');
					test.equal(res.items.length, 1, 'Check only one msg returned');
					test.equal(res.items[0].name, msgone.name, 'Check name is as expected');
					test.equal(res.items[0].data, msgone.data, 'Check data is as expected');
					test.ok(res.hasNext, 'Check hasNext is true');
					cb(null, res.next);
				});
			},
			function(next, cb) {
				next(function(err, res) {
					test.ok(!err, err && helper.displayError(err));
					test.equal(res.statusCode, 200, 'Check statusCode is 200');
					test.equal(res.success, true, 'Check success');
					test.equal(res.items.length, 1, 'Check only one msg returned');
					test.equal(res.items[0].name, msgtwo.name, 'Check name is as expected');
					test.equal(res.items[0].data, msgtwo.data, 'Check data is as expected');
					cb();
				});
			},
			function(cb) {
				/* Finally check the messages the 'normal' way to make sure everything's as expected */
				rest.channels.get(channelName).history(function(err, res) {
					test.ok(!err, err && helper.displayError(err));
					test.equal(res.items.length, 2, 'Check both msgs returned');
					test.equal(res.items[0].name, msgtwo.name, 'Check name is as expected');
					test.equal(res.items[0].data, msgtwo.data, 'Check data is as expected');
					cb();
				});
			}
		], function() {
			test.done();
		})
	}

	return module.exports = helper.withTimeout(exports);
});
