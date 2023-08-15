'use strict';

/* Shared test helper for the Jasmine test suite that simplifies
	 the dependencies by providing common methods in a single dependency */

define([
  'test/common/modules/testapp_module',
  'test/common/modules/client_module',
  'test/common/modules/testapp_manager',
  'async',
  'chai',
], function (testAppModule, clientModule, testAppManager, async, chai) {
  var utils = clientModule.Ably.Realtime.Utils;
  var platform = clientModule.Ably.Realtime.Platform;
  var BufferUtils = platform.BufferUtils;
  var expect = chai.expect;
  clientModule.Ably.Realtime.ConnectionManager.initTransports();
  var availableTransports = utils.keysArray(clientModule.Ably.Realtime.ConnectionManager.supportedTransports),
    bestTransport = availableTransports[0],
    /* IANA reserved; requests to it will hang forever */
    unroutableHost = '10.255.255.1',
    unroutableAddress = 'http://' + unroutableHost + '/';

  function displayError(err) {
    if (typeof err == 'string' || err == null) return err;

    var result = '';
    if (err.statusCode) result += err.statusCode + '; ';
    if (typeof err.message == 'string') result += err.message;
    if (typeof err.message == 'object') result += JSON.stringify(err.message);

    return result;
  }

  function monitorConnection(done, realtime, states) {
    utils.arrForEach(states || ['failed', 'suspended'], function (state) {
      realtime.connection.on(state, function () {
        done(new Error('Connection monitoring: state changed to ' + state + ', aborting test'));
        realtime.close();
      });
    });
  }

  function closeAndFinish(done, realtime, err) {
    if (typeof realtime === 'undefined') {
      // Likely called in a catch block for an exception
      // that occured before realtime was initialized
      done(err);
      return;
    }
    if (Object.prototype.toString.call(realtime) == '[object Array]') {
      var realtimes = utils.arrFilter(realtime, function (rt) {
        return rt !== undefined;
      });
      closeAndFinishSeveral(done, realtimes, err);
      return;
    }
    callbackOnClose(realtime, function () {
      done(err);
    });
  }

  /**
   * Uses a callback to communicate the result of a `Promise`. The first argument passed to the callback will be either an error (when the promise is rejected) or `null` (when the promise is fulfilled). In the case where the promise is fulfilled, the resulting value will be passed to the callback as a second argument.
   */
  function whenPromiseSettles(promise, callback) {
    promise
      .then((result) => {
        callback(null, result);
      })
      .catch((err) => {
        callback(err);
      });
  }

  function simulateDroppedConnection(realtime) {
    // Go into the 'disconnected' state before actually disconnecting the transports
    // to avoid the instantaneous reconnect attempt that would be triggered in
    // notifyState by the active transport getting disconnected from a connected state
    realtime.connection.once('disconnected', function () {
      realtime.connection.connectionManager.disconnectAllTransports();
    });
    realtime.connection.connectionManager.requestState({ state: 'disconnected' });
  }

  function becomeSuspended(realtime, cb) {
    realtime.connection.connectionManager.disconnectAllTransports();
    realtime.connection.once('disconnected', function () {
      realtime.connection.connectionManager.notifyState({ state: 'suspended' });
    });
    if (cb)
      realtime.connection.once('suspended', function () {
        cb();
      });
  }

  function callbackOnClose(realtime, callback) {
    if (!realtime.connection.connectionManager.activeProtocol) {
      platform.Config.nextTick(function () {
        realtime.close();
        callback();
      });
      return;
    }
    realtime.connection.connectionManager.activeProtocol.transport.on('disposed', function () {
      callback();
    });
    /* wait a tick before closing in order to avoid the final close
     * happening synchronously in a publish/attach callback, which
     * complicates channelattach_publish_invalid etc. */
    platform.Config.nextTick(function () {
      realtime.close();
    });
  }

  function closeAndFinishSeveral(done, realtimeArray, e) {
    async.map(
      realtimeArray,
      function (realtime, mapCb) {
        var parallelItem = function (parallelCb) {
          callbackOnClose(realtime, function () {
            parallelCb();
          });
        };
        mapCb(null, parallelItem);
      },
      function (err, parallelItems) {
        async.parallel(parallelItems, function () {
          if (err) {
            done(err);
            return;
          }
          done(e);
        });
      }
    );
  }

  /* testFn is assumed to be a function of realtimeOptions that returns a mocha test */
  function testOnAllTransports(name, testFn, excludeUpgrade, skip) {
    var itFn = skip ? it.skip : it;
    let transports = availableTransports;
    utils.arrForEach(transports, function (transport) {
      itFn(
        name + '_with_' + transport + '_binary_transport',
        testFn({ transports: [transport], useBinaryProtocol: true })
      );
      itFn(
        name + '_with_' + transport + '_text_transport',
        testFn({ transports: [transport], useBinaryProtocol: false })
      );
    });
    /* Plus one for no transport specified (ie use upgrade mechanism if
     * present).  (we explicitly specify all transports since node only does
     * nodecomet+upgrade if comet is explicitly requested
     * */
    if (!excludeUpgrade) {
      itFn(name + '_with_binary_transport', testFn({ transports, useBinaryProtocol: true }));
      itFn(name + '_with_text_transport', testFn({ transports, useBinaryProtocol: false }));
    }
  }

  testOnAllTransports.skip = function (name, testFn, excludeUpgrade) {
    testOnAllTransports(name, testFn, excludeUpgrade, true);
  };

  function restTestOnJsonMsgpack(name, testFn, skip) {
    var itFn = skip ? it.skip : it;
    itFn(name + ' with binary protocol', async function () {
      await testFn(new clientModule.AblyRest({ useBinaryProtocol: true }), name + '_binary');
    });
    itFn(name + ' with text protocol', async function () {
      await testFn(new clientModule.AblyRest({ useBinaryProtocol: false }), name + '_text');
    });
  }

  restTestOnJsonMsgpack.skip = function (name, testFn) {
    restTestOnJsonMsgpack(name, testFn, true);
  };

  function clearTransportPreference() {
    if (isBrowser && window.localStorage) {
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
    ? function (arr, predicate) {
        return arr.find(predicate);
      }
    : function (arr, predicate) {
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
    ? function (arr, predicate) {
        return arr.filter(predicate);
      }
    : function (arr, predicate) {
        var res = [];
        for (var i = 0; i < arr.length; i++) {
          if (predicate(arr[i])) {
            res.push(arr[i]);
          }
        }
        return res;
      };

  function testMessageEquality(one, two) {
    // treat `null` same as `undefined` (using ==, rather than ===)
    expect(one.encoding == two.encoding, "Encoding mismatch ('" + one.encoding + "' != '" + two.encoding + "').").to.be
      .ok;

    if (typeof one.data === 'string' && typeof two.data === 'string') {
      expect(one.data === two.data, 'String data contents mismatch.').to.be.ok;
      return;
    }

    if (BufferUtils.isBuffer(one.data) && BufferUtils.isBuffer(two.data)) {
      expect(BufferUtils.areBuffersEqual(one.data, two.data), 'Buffer data contents mismatch.').to.equal(true);
      return;
    }

    var json1 = JSON.stringify(one.data);
    var json2 = JSON.stringify(two.data);
    if (null === json1 || undefined === json1 || null === json2 || undefined === json2) {
      expect(false, 'JSON stringify failed.').to.be.ok;
      return;
    }
    expect(json1 === json2, 'JSON data contents mismatch.').to.be.ok;
  }

  var exports = {
    setupApp: testAppModule.setup,
    tearDownApp: testAppModule.tearDown,
    createStats: testAppModule.createStatsFixtureData,
    getTestApp: testAppModule.getTestApp,

    Ably: clientModule.Ably,
    AblyRest: clientModule.AblyRest,
    AblyRealtime: clientModule.AblyRealtime,
    ablyClientOptions: clientModule.ablyClientOptions,
    Utils: utils,

    loadTestData: testAppManager.loadJsonData,
    testResourcesPath: testAppManager.testResourcesPath,

    displayError: displayError,
    monitorConnection: monitorConnection,
    closeAndFinish: closeAndFinish,
    simulateDroppedConnection: simulateDroppedConnection,
    becomeSuspended: becomeSuspended,
    testOnAllTransports: testOnAllTransports,
    restTestOnJsonMsgpack: restTestOnJsonMsgpack,
    availableTransports: availableTransports,
    bestTransport: bestTransport,
    clearTransportPreference: clearTransportPreference,
    isComet: isComet,
    isWebsocket: isWebsocket,
    unroutableHost: unroutableHost,
    unroutableAddress: unroutableAddress,
    arrFind: arrFind,
    arrFilter: arrFilter,
    whenPromiseSettles: whenPromiseSettles,
    testMessageEquality: testMessageEquality,
  };

  if (typeof window !== 'undefined') {
    window.ablyHelpers = exports;
  }

  return (module.exports = exports);
});
