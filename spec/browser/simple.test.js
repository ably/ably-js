"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	helper.describeWithCounter('browser/simple', function (expect, counter) {
		var exports = {};

		it('setupauth', function(done) {
			counter.expect(1);
			helper.setupApp(function(err) {
				if(err) {
					expect(false, helper.displayError(err));
				} else {
					expect(true, 'app set up');
				}
				counter.assert();
				done();
			});
		});

		function isTransportAvailable(transport) {
			return (transport in Ably.Realtime.ConnectionManager.supportedTransports);
		}

		function realtimeConnection(transports) {
			var options = {};
			if (transports) options.transports = transports;
			return helper.AblyRealtime(options);
		}

		function failWithin(timeInSeconds, done, ably, description) {
			var timeout = setTimeout(function () {
				expect(false, 'Timed out: Trying to ' + description + ' took longer than ' + timeInSeconds + ' second(s)');
				done();
				ably.close();
			}, timeInSeconds * 1000);

			return {
				stop: function () {
					clearTimeout(timeout);
				}
			};
		}

		function connectionWithTransport(done, transport) {
			counter.expect(1);
			try {
				var ably = realtimeConnection(transport && [transport]),
					connectionTimeout = failWithin(10, test, ably, 'connect');
				ably.connection.on('connected', function () {
					connectionTimeout.stop();
					expect(true, 'Verify ' + transport + ' connection with key');
					counter.assert();
					done();
					ably.close();
				});
				var exitOnState = function(state) {
					ably.connection.on(state, function () {
						connectionTimeout.stop();
						expect(false, transport + ' connection to server failed');
						done();
						ably.close();
					});
				};
				exitOnState('failed');
				exitOnState('suspended');
			} catch (e) {
				expect(false, 'Init ' + transport + ' connection failed with exception: ' + e);
				done();
				connectionTimeout.stop();
			}
		}

		function heartbeatWithTransport(done, transport) {
			counter.expect(1);
			try {
				var ably = realtimeConnection(transport && [transport]),
					connectionTimeout = failWithin(10, test, ably, 'connect'),
					heartbeatTimeout;

				ably.connection.on('connected', function () {
					connectionTimeout.stop();
					heartbeatTimeout = failWithin(25, test, ably, 'wait for heartbeat');
					ably.connection.ping(function(err) {
						heartbeatTimeout.stop();
						expect(!err, 'verify ' + transport + ' heartbeat');
						counter.assert();
						done();
						ably.close();
					});
				});
				var exitOnState = function(state) {
					ably.connection.on(state, function () {
						connectionTimeout.stop();
						expect(false, transport + ' connection to server failed');
						done();
						ably.close();
					});
				};
				exitOnState('failed');
				exitOnState('suspended');
			} catch (e) {
				expect(false, transport + ' connect with key failed with exception: ' + e.stack);
				done();
				connectionTimeout.stop();
				if (heartbeatTimeout) heartbeatTimeout.stop();
			}
		}

		function publishWithTransport(done, transport) {
			var count = 5;
			var sentCount = 0, receivedCount = 0, sentCbCount = 0;
			var timer;
			var checkFinish = function () {
				if ((receivedCount === count) && (sentCbCount === count)) {
					receiveMessagesTimeout.stop();
					counter.assert();
					done();
					ably.close();
				}
			};
			var ably = realtimeConnection(transport && [transport]),
				connectionTimeout = failWithin(5, test, ably, 'connect'),
				receiveMessagesTimeout;

			ably.connection.on('connected', function () {
				connectionTimeout.stop();
				receiveMessagesTimeout = failWithin(15, test, ably, 'wait for published messages to be received');

				timer = setInterval(function () {
					console.log('sending: ' + sentCount++);
					channel.publish('event0', 'Hello world at: ' + new Date(), function (err) {
						console.log(transport + ' publish callback called; err = ' + err);
						sentCbCount++;
						checkFinish();
					});
					if (sentCount === count) clearInterval(timer);
				}, 500);
			});

			counter.expect(count);
			var channel = ably.channels.get(transport + 'publish0' + String(Math.random()).substr(1));
			/* subscribe to event */
			channel.subscribe('event0', function () {
				expect(true, 'Received event0');
				console.log(transport + 'event received');
				receivedCount++;
				checkFinish();
			});
		}

		it('simpleInitBase0', function (done) {
			counter.expect(1);
			try {
				var timeout,
					ably = realtimeConnection();

				ably.connection.on('connected', function () {
					clearTimeout(timeout);
					expect(true, 'Verify init with key');
					counter.assert();
					done();
					ably.close();
				});
				var exitOnState = function(state) {
					ably.connection.on(state, function () {
						expect(false, 'Connection to server failed');
						done();
						ably.close();
					});
				};
				exitOnState('failed');
				exitOnState('suspended');
				timeout = setTimeout(function () {
					expect(false, 'Timed out: Trying to connect took longer than expected');
					done();
					ably.close();
				}, 10 * 1000);
			} catch (e) {
				expect(false, 'Init with key failed with exception: ' + e);
				done();
			}
		});

		var wsTransport = 'web_socket';
		if(isTransportAvailable(wsTransport)) {
			it('wsbase0', function (done) {
				connectionWithTransport(done, wsTransport);
			});

			/*
			* Publish and subscribe, json transport
			*/
			it('wspublish0', function (done) {
				publishWithTransport(done, wsTransport);
			});

			/*
			* Check heartbeat
			*/
			it('wsheartbeat0', function (done) {
				heartbeatWithTransport(done, wsTransport);
			});
		}

		var xhrTransport = 'xhr';
		if(isTransportAvailable(xhrTransport)) {
			it('xhrbase0', function (done) {
				connectionWithTransport(done, xhrTransport);
			});

			/*
			* Publish and subscribe, json transport
			*/
			it('xhrppublish0', function (done) {
				publishWithTransport(done, xhrTransport);
			});

			/*
			* Check heartbeat
			*/
			it('xhrheartbeat0', function (done) {
				heartbeatWithTransport(done, xhrTransport);
			});
		}

		var jsonpTransport = 'jsonp';
		if(isTransportAvailable(jsonpTransport)) {
			it('jsonpbase0', function (done) {
				connectionWithTransport(done, jsonpTransport);
			});

			/*
			* Publish and subscribe, json transport
			*/
			it('jsonppublish0', function (done) {
				publishWithTransport(done, jsonpTransport);
			});


			/*
			* Check heartbeat
			*/
			it('jsonpheartbeat0', function (done) {
				heartbeatWithTransport(done, jsonpTransport);
			});
		}

		it('auto_transport_base0', function (done) {
			connectionWithTransport(done);
		});

		/*
		* Publish and subscribe
		*/
		it('auto_transport_publish0', function (done) {
			publishWithTransport(done);
		});

		/*
		* Check heartbeat
		*/
		it('auto_transport_heartbeat0', function (done) {
			heartbeatWithTransport(done);
		});
	});
});
