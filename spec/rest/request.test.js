"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
	helper.describeWithCounter('rest/request', function (expect, counter) {
		var rest,
			exports = {},
			_exports = {},
			utils = helper.Utils,
			echoServerHost = 'echo.ably.io',
			restTestOnJsonMsgpack = helper.restTestOnJsonMsgpack;

		it('setuptime', function(done) {
			counter.expect(1);
			helper.setupApp(function(err) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}

				rest = helper.AblyRest({ useBinaryProtocol: false });
				expect(true, 'app set up');
				counter.assert();
				done();
			});
		});

		restTestOnJsonMsgpack('request_time', function(done, rest) {
			rest.request('get', '/time', null, null, null, function(err, res) {
				expect(!err, err && helper.displayError(err));
				expect(res.statusCode).to.equal(200, 'Check statusCode');
				expect(res.success).to.equal(true, 'Check success');
				expect(utils.isArray(res.items), true, 'Check array returned');
				expect(res.items.length).to.equal(1, 'Check array was of length 1');
				done();
			});
		});

		restTestOnJsonMsgpack('request_404', function(done, rest) {
			/* NB: can't just use /invalid or something as the CORS preflight will
			* fail. Need something superficially a valid path but where the actual
			* request fails */
			rest.request('get', '/keys/ablyjs.test/requestToken', null, null, null, function(err, res) {
				expect(err).to.equal(null, 'Check that we do not get an error response for a failure that returns an actual ably error code');
				expect(res.success).to.equal(false, 'Check res.success is false for a failure');
				expect(res.statusCode).to.equal(404, 'Check HPR.statusCode is 404');
				expect(res.errorCode).to.equal(40400, 'Check HPR.errorCode is 40400');
				expect(res.errorMessage, 'Check have an HPR.errorMessage');
				done();
			});
		});

		restTestOnJsonMsgpack('request_404', function(done, rest) {
			/* NB: can't just use /invalid or something as the CORS preflight will
			* fail. Need something superficially a valid path but where the actual
			* request fails */
			rest.request('get', '/keys/ablyjs.test/requestToken', null, null, null, function(err, res) {
				expect(err).to.equal(null, 'Check that we do not get an error response for a failure that returns an actual ably error code');
				expect(res.success).to.equal(false, 'Check res.success is false for a failure');
				expect(res.statusCode).to.equal(404, 'Check HPR.statusCode is 404');
				expect(res.errorCode).to.equal(40400, 'Check HPR.errorCode is 40400');
				expect(res.errorMessage, 'Check have an HPR.errorMessage');
				done();
			});
		});

		/* With a network issue, should get an actual err, not an HttpPaginatedResponse with error members */
		it('request_network_error', function(done) {
			rest = helper.AblyRest({restHost: helper.unroutableAddress})
			rest.request('get', '/time', null, null, null, function(err, res) {
				expect(err, 'Check get an err');
				expect(!res, 'Check do not get a res');
				done();
			});
		});

		/* Use the request feature to publish, then retrieve (one at a time), some messages */
		restTestOnJsonMsgpack('request_post_get_messages', function(done, rest, channelName) {
			counter.expect(23);
			var channelPath = '/channels/' + channelName + '/messages',
				msgone = {name: 'faye', data: 'whittaker'},
				msgtwo = {name: 'martin', data: 'reed'};

			async.waterfall([
				function(cb) {
					rest.request('post', channelPath, null, msgone, null, function(err, res) {
						expect(!err, err && helper.displayError(err));
						expect(res.statusCode).to.equal(201, 'Check statusCode is 201');
						expect(res.success).to.equal(true, 'Check post was a success');
						expect(res.items && res.items.length).to.equal(1, 'Check number of results is as expected');
						cb();
					});
				},
				function(cb) {
					rest.request('post', channelPath, null, msgtwo, null, function(err, res) {
						expect(!err, err && helper.displayError(err));
						expect(res.statusCode).to.equal(201, 'Check statusCode is 201');
						expect(res.items && res.items.length).to.equal(1, 'Check number of results is as expected');
						cb();
					});
				},
				function(cb) {
					rest.request('get', channelPath, {limit: 1, direction: 'forwards'}, null, null, function(err, res) {
						expect(!err, err && helper.displayError(err));
						expect(res.statusCode).to.equal(200, 'Check statusCode is 200');
						expect(res.items.length).to.equal(1, 'Check only one msg returned');
						expect(res.items[0].name).to.equal(msgone.name, 'Check name is as expected');
						expect(res.items[0].data).to.equal(msgone.data, 'Check data is as expected');
						expect(res.hasNext, 'Check hasNext is true');
						cb(null, res.next);
					});
				},
				function(next, cb) {
					next(function(err, res) {
						expect(!err, err && helper.displayError(err));
						expect(res.statusCode).to.equal(200, 'Check statusCode is 200');
						expect(res.success).to.equal(true, 'Check success');
						expect(res.items.length).to.equal(1, 'Check only one msg returned');
						expect(res.items[0].name).to.equal(msgtwo.name, 'Check name is as expected');
						expect(res.items[0].data).to.equal(msgtwo.data, 'Check data is as expected');
						cb();
					});
				},
				function(cb) {
					/* Finally check the messages the 'normal' way to make sure everything's as expected */
					rest.channels.get(channelName).history(function(err, res) {
						expect(!err, err && helper.displayError(err));
						expect(res.items.length).to.equal(2, 'Check both msgs returned');
						expect(res.items[0].name).to.equal(msgtwo.name, 'Check name is as expected');
						expect(res.items[0].data).to.equal(msgtwo.data, 'Check data is as expected');
						cb();
					});
				}
			], function() {
				counter.assert();
				done();
			})
		});

		restTestOnJsonMsgpack('request_batch_api_success', function(done, rest, name) {
			var body = {channels: [name + '1', name + '2'], messages: {data: 'foo'}};

			rest.request("POST", "/messages", {}, body, {}, function(err, res) {
				expect(err).to.equal(null, 'Check that we do not get an error response for a success');
				expect(res.success).to.equal(true, 'Check res.success is true for a success');
				expect(res.statusCode).to.equal(201, 'Check res.statusCode is 201 for a success');
				expect(res.errorCode).to.equal(null, 'Check res.errorCode is null for a success');
				expect(res.errorMessage).to.equal(null, 'Check res.errorMessage is null for a success');

				expect(!res.items[0].batchResponse, 'Check no batchResponse, since items is now just a flat array of channel responses');
				expect(res.items.length).to.equal(2, 'Verify batched response includes response for each channel');
				expect(!res.items[0].error, 'Verify channel1 response is not an error');
				expect(res.items[0].channel).to.equal(name + '1', 'Verify channel1 response includes correct channel');
				expect(!res.items[1].error, 'Verify channel2 response is not an error');
				expect(res.items[1].channel).to.equal(name + '2', 'Verify channel2 response includes correct channel');
				done();
			});
		});

		restTestOnJsonMsgpack('request_batch_api_partial_success', function(done, rest, name) {
			var body = {channels: [name, '[invalid', ''], messages: {data: 'foo'}};

			rest.request("POST", "/messages", {}, body, {}, function(err, res) {
				expect(err).to.equal(null, 'Check that we do not get an error response for a partial success');
				expect(res.success).to.equal(false, 'Check res.success is false for a partial failure');
				expect(res.statusCode).to.equal(400, 'Check HPR.statusCode is 400 for a partial failure');
				expect(res.errorCode).to.equal(40020, 'Check HPR.errorCode is 40020 for a partial failure');
				expect(res.errorMessage, 'Check have an HPR.errorMessage');

				var response = res.items[0];
				expect(response.error.code).to.equal(40020, 'Verify response has an errorCode');
				expect(response.batchResponse.length).to.equal(3, 'Verify batched response includes response for each channel');
				expect(response.batchResponse[0].channel).to.equal(name, 'Verify channel1 response includes correct channel');
				expect(!response.batchResponse[0].error, 'Verify first channel response is not an error');
				expect(response.batchResponse[1].error.code).to.equal(40010, 'Verify [invalid response includes an error with the right code');
				expect(response.batchResponse[2].error.code).to.equal(40010, 'Verify empty channel response includes an error with the right code');
				done();
			});
		});

		utils.arrForEach(['put', 'patch', 'delete'], function(method) {
			it('check' + method, function(done) {
				counter.expect(1);
				var restEcho = helper.AblyRest({ useBinaryProtocol: false, restHost: echoServerHost, tls: true });
				restEcho.request(method, "/methods", {}, {}, {}, function(err, res) {
					if(err) {
						expect(false, helper.displayError(err));
					} else {
						expect(res.items[0] && res.items[0].method).to.equal(method);
					}
					counter.assert();
					done();
				}
			)});
		})
	});
});
