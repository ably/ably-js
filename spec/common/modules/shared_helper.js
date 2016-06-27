"use strict";

/* Shared test helper for the Jasmine test suite that simplifies
	 the dependencies by providing common methods in a single dependency */

define(['spec/common/modules/testapp_module', 'spec/common/modules/client_module', 'spec/common/modules/testapp_manager', 'async'],
	function(testAppModule, clientModule, testAppManager, async) {
		var utils = clientModule.Ably.Realtime.Utils;
		var availableTransports = utils.keysArray(clientModule.Ably.Realtime.ConnectionManager.supportedTransports),
			bestTransport = availableTransports[0],
			/* IANA reserved; requests to it will hang forever */
			unroutableAddress = 'http://10.255.255.1/';

		function displayError(err) {
			if(typeof(err) == 'string')
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

		function monitorConnection(test, realtime) {
			utils.arrForEach(['failed', 'suspended'], function(state) {
				realtime.connection.on(state, function () {
					test.ok(false, 'Connection monitoring: state changed to ' + state + ', aborting test');
					test.done();
					realtime.close();
				});
			});
		}

		function closeAndFinish(test, realtime) {
			if(typeof realtime === 'undefined') {
				// Likely called in a catch block for an exception
				// that occured before realtime was initialized
				test.done();
				return;
			}
			if(Object.prototype.toString.call(realtime) == '[object Array]') {
				closeAndFinishSeveral(test, realtime);
				return;
			}
			callbackOnClose(realtime, function(){ test.done(); })
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

		function callbackOnClose(realtime, callback) {
			if(!realtime.connection.connectionManager.activeProtocol) {
				console.log("No transport established; closing connection and calling test.done()")
				realtime.close();
				callback();
				return;
			}
			realtime.connection.connectionManager.activeProtocol.transport.on('disposed', function() {
				console.log("Transport disposed; calling test.done()")
				callback();
			});
			realtime.close();
		}

		function closeAndFinishSeveral(test, realtimeArray) {
			async.map(realtimeArray, function(realtime, mapCb){
				var parallelItem = function(parallelCb) {
					callbackOnClose(realtime, function(){ parallelCb(); })
				};
				mapCb(null, parallelItem)
			}, function(err, parallelItems) {
				async.parallel(parallelItems, function() {
					test.done();
				});
			}
		 )
		}

		/* testFn is assumed to be a function of realtimeOptions that returns a nodeunit test */
		function testOnAllTransports(exports, name, testFn, excludeUpgrade) {
			/* Don't include jsonp if possible. Why? Because you can't abort requests. So recv's
			* stick around for 90s till realtime ends them. So in a test, the
			* browsers max-connections-per-host limit fills up quickly, which messes
			* up other comet transports too */
			var transports = utils.arrIn(availableTransports, 'xhr_polling') ?
				utils.arrWithoutValue(availableTransports, 'jsonp') :
				availableTransports;

			utils.arrForEach(transports, function(transport) {
				exports[name + '_with_' + transport + '_binary_transport'] = testFn({transports: [transport], useBinaryProtocol: true});
				exports[name + '_with_' + transport + '_text_transport'] = testFn({transports: [transport], useBinaryProtocol: false});
			});
			/* Plus one for no transport specified (ie use upgrade mechanism if present) */
			if(!excludeUpgrade) {
				exports[name + '_with_binary_transport'] = testFn({useBinaryProtocol: true});
				exports[name + '_with_text_transport'] = testFn({useBinaryProtocol: false});
			}
		}

		/* Wraps all tests with a timeout so that they don't run indefinitely */
		/* Also clears transport preferences, so each test starts fresh */
		function withTimeout(exports, defaultTimeout) {
			var timeout = defaultTimeout || 60 * 1000;

			for (var needle in exports) {
				if (exports.hasOwnProperty(needle) && needle !== 'setUp') {
					(function(originalFn) {
						exports[needle] = function(test) {
							var originalDone = test.done;
							test.done = function() {
								clearTimeout(timer);
								originalDone.apply(test, arguments);
							};
							var timer = setTimeout(function() {
								test.ok(false, "Test timed out after " + (timeout / 1000) + "s");
								test.done();
							}, timeout);
							clearTransportPreference();
							originalFn(test);
						};
					})(exports[needle]);
				}
			}

			return exports;
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
			withTimeout:               withTimeout,
			testOnAllTransports:       testOnAllTransports,
			availableTransports:       availableTransports,
			bestTransport:             bestTransport,
			clearTransportPreference:  clearTransportPreference,
			isComet:                   isComet,
			isWebsocket:               isWebsocket,
			unroutableAddress:         unroutableAddress
		};
	});
