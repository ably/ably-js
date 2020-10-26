"use strict";

/* Shared test helper for the Jasmine test suite that simplifies
	 the dependencies by providing common methods in a single dependency */

define(['spec/common/modules/testapp_module', 'spec/common/modules/client_module', 'spec/common/modules/testapp_manager', 'async', 'node_modules/chai/chai'],
	function(testAppModule, clientModule, testAppManager, async, chai) {
		var utils = clientModule.Ably.Realtime.Utils;
		var supportedTransports = utils.keysArray(clientModule.Ably.Realtime.ConnectionManager.supportedTransports),
			/* Don't include jsonp in availableTransports if xhr works. Why? Because
			 * you can't abort requests. So recv's stick around for 90s till realtime
			 * ends them. So in a test, the browsers max-connections-per-host limit
			 * fills up quickly, which messes up other comet transports too */
			availableTransports = utils.arrIn(supportedTransports, 'xhr_polling') ?
				utils.arrWithoutValue(supportedTransports, 'jsonp') :
				supportedTransports,
			bestTransport = availableTransports[0],
			/* IANA reserved; requests to it will hang forever */
			unroutableHost = '10.255.255.1',
			unroutableAddress = 'http://' + unroutableHost + '/';

		function displayError(err) {
			if(typeof(err) == 'string' || err == null)
				return err;

			var result = '';
			if(err.statusCode)
				result += err.statusCode + '; ';
			if(typeof(err.message) == 'string')
				result += err.message;
			if(typeof(err.message) == 'object')
				result += JSON.stringify(err.message);

			return result;
		}

		function monitorConnection(done, expect, realtime) {
			utils.arrForEach(['failed', 'suspended'], function(state) {
				realtime.connection.on(state, function () {
					expect(false, 'Connection monitoring: state changed to ' + state + ', aborting test');
					done();
					realtime.close();
				});
			});
		}

		function closeAndFinish(done, realtime) {
			if(typeof realtime === 'undefined') {
				// Likely called in a catch block for an exception
				// that occured before realtime was initialized
				done();
				return;
			}
			if(Object.prototype.toString.call(realtime) == '[object Array]') {
				closeAndFinishSeveral(done, realtime);
				return;
			}
			callbackOnClose(realtime, function(){ done(); })
		}

		function simulateDroppedConnection(realtime) {
			// Go into the 'disconnected' state before actually disconnecting the transports
			// to avoid the instantaneous reconnect attempt that would be triggered in
			// notifyState by the active transport getting disconnected from a connected state
			realtime.connection.once('disconnected', function(){
				realtime.connection.connectionManager.disconnectAllTransports();
			});
			realtime.connection.connectionManager.requestState({state: 'disconnected'});
		}

		function becomeSuspended(realtime, cb) {
			realtime.connection.connectionManager.disconnectAllTransports();
			realtime.connection.once('disconnected', function() {
				realtime.connection.connectionManager.notifyState({state: 'suspended'});
			});
			if(cb) realtime.connection.once('suspended', function() { cb(); });
		}

		function callbackOnClose(realtime, callback) {
			if(!realtime.connection.connectionManager.activeProtocol) {
				console.log("No transport established; closing connection and calling done()");
				utils.nextTick(function() {
					realtime.close();
					callback();
				});
				return;
			}
			realtime.connection.connectionManager.activeProtocol.transport.on('disposed', function() {
				console.log("Transport disposed; calling done()")
				callback();
			});
			/* wait a tick before closing in order to avoid the final close
			 * happening synchronously in a publish/attach callback, which
			 * complicates channelattach_publish_invalid etc. */
			utils.nextTick(function() {
				realtime.close();
			});
		}

		function closeAndFinishSeveral(done, realtimeArray) {
			async.map(realtimeArray, function(realtime, mapCb){
				var parallelItem = function(parallelCb) {
					callbackOnClose(realtime, function(){ parallelCb(); })
				};
				mapCb(null, parallelItem)
			}, function(err, parallelItems) {
				async.parallel(parallelItems, function() {
					done();
				});
			}
		 )
		}

		/* testFn is assumed to be a function of realtimeOptions that returns a mocha test */
		function testOnAllTransports(name, testFn, excludeUpgrade) {
			utils.arrForEach(availableTransports, function(transport) {
				it(name + '_with_' + transport + '_binary_transport', testFn({transports: [transport], useBinaryProtocol: true}))
				it(name + '_with_' + transport + '_text_transport', testFn({transports: [transport], useBinaryProtocol: false}))
			});
			/* Plus one for no transport specified (ie use upgrade mechanism if
			 * present).  (we explicitly specify all transports since node only does
			 * nodecomet+upgrade if comet is explicitly requested
			 * */
			if(!excludeUpgrade) {
				it(name + '_with_binary_transport', testFn({transports: availableTransports, useBinaryProtocol: true}))
				it(name + '_with_text_transport', testFn({transports: availableTransports, useBinaryProtocol: false}));
			}
		}

		function restTestOnJsonMsgpack(name, testFn) {
			it(name + '_binary', function(done) { testFn(done, new clientModule.AblyRest({useBinaryProtocol: true}), name + '_binary'); });
			it(name + '_text', function(done) { testFn(done, new clientModule.AblyRest({useBinaryProtocol: false}), name + '_text'); });
		}

		function clearTransportPreference() {
			if(isBrowser && window.localStorage) {
				window.localStorage.removeItem('ably-transport-preference');
			}
		}

		function isComet(transport) {
			return transport.toString().indexOf('/comet/') > -1;
		}

		function isWebsocket(transport) {
			return !!transport.toString().match(/wss?\:/);
		}

		var arrFind = Array.prototype.find
			? function(arr, predicate) {
				return arr.find(predicate);
			} : function(arr, predicate) {
				var value;
				for (var i = 0; i < arr.length; i++) {
					value = arr[i];
					if (predicate(value)) {
						return value;
					}
				}
				return undefined;
			};

		var arrFilter = Array.prototype.filter
			? function(arr, predicate) {
				return arr.filter(predicate);
			} : function(arr, predicate) {
				var res = [];
				for (var i = 0; i < arr.length; i++) {
					if (predicate(arr[i])) {
						res.push(arr[i]);
					}
				}
				return res;
			};

		function describeWithCounter (description, callback) {
			describe(description, function () {
				this.timeout(60 * 1000);
				var counter = {};
				var expect = function () {
					counter.value++;
					if (arguments[1]) return chai.expect(arguments[0], arguments[1]);
					return chai.expect(arguments[0]);
				}

				counter.expect = function (expected) {
					counter.expected = expected;
				};

				counter.assert = function () {
					chai.expect(counter.expected).to.equal(counter.value);
				}

				beforeEach(function () {
					counter.value = 0;
					counter.expected = -1;

					clearTransportPreference();
				});

				callback(expect, counter);
			})
		}


		return module.exports = {
			setupApp:     testAppModule.setup,
			tearDownApp:  testAppModule.tearDown,
			createStats:  testAppModule.createStatsFixtureData,
			getTestApp:   testAppModule.getTestApp,

			Ably:         clientModule.Ably,
			AblyRest:     clientModule.AblyRest,
			AblyRealtime: clientModule.AblyRealtime,
			Utils:        utils,

			loadTestData:      testAppManager.loadJsonData,
			testResourcesPath: testAppManager.testResourcesPath,

			displayError:              displayError,
			monitorConnection:         monitorConnection,
			closeAndFinish:            closeAndFinish,
			simulateDroppedConnection: simulateDroppedConnection,
			becomeSuspended:           becomeSuspended,
			testOnAllTransports:       testOnAllTransports,
			restTestOnJsonMsgpack:     restTestOnJsonMsgpack,
			availableTransports:       availableTransports,
			bestTransport:             bestTransport,
			clearTransportPreference:  clearTransportPreference,
			isComet:                   isComet,
			isWebsocket:               isWebsocket,
			unroutableHost:            unroutableHost,
			unroutableAddress:         unroutableAddress,
			arrFind:                   arrFind,
			arrFilter:                 arrFilter,
			describeWithCounter:       describeWithCounter
		};
	});
