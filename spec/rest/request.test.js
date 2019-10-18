"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	var rest,
		exports = {},
		_exports = {},
		utils = helper.Utils,
		echoServerHost = 'echo.ably.io',
		restTestOnJsonMsgpack = helper.restTestOnJsonMsgpack;

	exports.setuptime = function(test) {
		test.expect(1);
		helper.setupApp(function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
				test.done();
				return;
			}

			rest = helper.AblyRest({ useBinaryProtocol: false });
			test.ok(true, 'app set up');
			test.done();
		});
	};

	restTestOnJsonMsgpack(exports, 'request_time', function(test, rest) {
		rest.request('get', '/time', null, null, null, function(err, res) {
			test.ok(!err, err && helper.displayError(err));
			test.equal(res.statusCode, 200, 'Check statusCode');
			test.equal(res.success, true, 'Check success');
			test.ok(utils.isArray(res.items), true, 'Check array returned');
			test.equal(res.items.length, 1, 'Check array was of length 1');
			test.done();
		});
	});

	restTestOnJsonMsgpack(exports, 'request_404', function(test, rest) {
		/* NB: can't just use /invalid or something as the CORS preflight will
		 * fail. Need something superficially a valid path but where the actual
		 * request fails */
		rest.request('get', '/keys/ablyjs.test/requestToken', null, null, null, function(err, res) {
			test.equal(err, null, 'Check that we do not get an error response for a failure that returns an actual ably error code');
			test.equal(res.success, false, 'Check res.success is false for a failure');
			test.equal(res.statusCode, 404, 'Check HPR.statusCode is 404');
			test.equal(res.errorCode, 40400, 'Check HPR.errorCode is 40400');
			test.ok(res.errorMessage, 'Check have an HPR.errorMessage');
			test.done();
		});
	});

	restTestOnJsonMsgpack(exports, 'request_404', function(test, rest) {
		/* NB: can't just use /invalid or something as the CORS preflight will
		 * fail. Need something superficially a valid path but where the actual
		 * request fails */
		rest.request('get', '/keys/ablyjs.test/requestToken', null, null, null, function(err, res) {
			test.equal(err, null, 'Check that we do not get an error response for a failure that returns an actual ably error code');
			test.equal(res.success, false, 'Check res.success is false for a failure');
			test.equal(res.statusCode, 404, 'Check HPR.statusCode is 404');
			test.equal(res.errorCode, 40400, 'Check HPR.errorCode is 40400');
			test.ok(res.errorMessage, 'Check have an HPR.errorMessage');
			test.done();
		});
	});

	/* With a network issue, should get an actual err, not an HttpPaginatedResponse with error members */
	exports.request_network_error = function(test) {
		rest = helper.AblyRest({restHost: helper.unroutableAddress})
		rest.request('get', '/time', null, null, null, function(err, res) {
			test.ok(err, 'Check get an err');
			test.ok(!res, 'Check do not get a res');
			test.done();
		});
	};

	/* Use the request feature to publish, then retrieve (one at a time), some messages */
	restTestOnJsonMsgpack(exports, 'request_post_get_messages', function(test, rest, channelName) {
		test.expect(23);
		var channelPath = '/channels/' + channelName + '/messages',
			msgone = {name: 'faye', data: 'whittaker'},
			msgtwo = {name: 'martin', data: 'reed'};

		async.waterfall([
			function(cb) {
				rest.request('post', channelPath, null, msgone, null, function(err, res) {
					test.ok(!err, err && helper.displayError(err));
					test.equal(res.statusCode, 201, 'Check statusCode is 201');
					test.equal(res.success, true, 'Check post was a success');
					test.equal(res.items && res.items.length, 1, 'Check number of results is as expected');
					cb();
				});
			},
			function(cb) {
				rest.request('post', channelPath, null, msgtwo, null, function(err, res) {
					test.ok(!err, err && helper.displayError(err));
					test.equal(res.statusCode, 201, 'Check statusCode is 201');
					test.equal(res.items && res.items.length, 1, 'Check number of results is as expected');
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
	});

	restTestOnJsonMsgpack(exports, 'request_batch_api_success', function(test, rest, name) {
		var body = {channels: [name + '1', name + '2'], messages: {data: 'foo'}};

		rest.request("POST", "/messages", {}, body, {}, function(err, res) {
			test.equal(err, null, 'Check that we do not get an error response for a success');
			test.equal(res.success, true, 'Check res.success is true for a success');
			test.equal(res.statusCode, 201, 'Check res.statusCode is 201 for a success');
			test.equal(res.errorCode, null, 'Check res.errorCode is null for a success');
			test.equal(res.errorMessage, null, 'Check res.errorMessage is null for a success');

			test.ok(!res.items[0].batchResponse, 'Check no batchResponse, since items is now just a flat array of channel responses');
			test.equal(res.items.length, 2, 'Verify batched response includes response for each channel');
			test.ok(!res.items[0].error, 'Verify channel1 response is not an error');
			test.equal(res.items[0].channel, name + '1', 'Verify channel1 response includes correct channel');
			test.ok(!res.items[1].error, 'Verify channel2 response is not an error');
			test.equal(res.items[1].channel, name + '2', 'Verify channel2 response includes correct channel');
			test.done();
		});
	});

	restTestOnJsonMsgpack(exports, 'request_batch_api_partial_success', function(test, rest, name) {
		var body = {channels: [name, '[invalid', ''], messages: {data: 'foo'}};

		rest.request("POST", "/messages", {}, body, {}, function(err, res) {
			test.equal(err, null, 'Check that we do not get an error response for a partial success');
			test.equal(res.success, false, 'Check res.success is false for a partial failure');
			test.equal(res.statusCode, 400, 'Check HPR.statusCode is 400 for a partial failure');
			test.equal(res.errorCode, 40020, 'Check HPR.errorCode is 40020 for a partial failure');
			test.ok(res.errorMessage, 'Check have an HPR.errorMessage');

			var response = res.items[0];
			test.equal(response.error.code, 40020, 'Verify response has an errorCode');
			test.equal(response.batchResponse.length, 3, 'Verify batched response includes response for each channel');
			test.equal(response.batchResponse[0].channel, name, 'Verify channel1 response includes correct channel');
			test.ok(!response.batchResponse[0].error, 'Verify first channel response is not an error');
			test.equal(response.batchResponse[1].error.code, 40010, 'Verify [invalid response includes an error with the right code');
			test.equal(response.batchResponse[2].error.code, 40010, 'Verify empty channel response includes an error with the right code');
			test.done();
		});
	});

	utils.arrForEach(['put', 'patch', 'delete'], function(method) {
		exports['check' + method] = function(test) {
			test.expect(1);
			var restEcho = helper.AblyRest({ useBinaryProtocol: false, restHost: echoServerHost, tls: true });
			restEcho.request(method, "/methods", {}, {}, {}, function(err, res) {
				if(err) {
					test.ok(false, helper.displayError(err));
				} else {
					test.equal(res.items[0] && res.items[0].method, method);
				}
				test.done();
			});
		};
	})

	return module.exports = helper.withTimeout(exports);
});
