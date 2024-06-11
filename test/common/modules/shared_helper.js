'use strict';

/* Shared test helper for the Jasmine test suite that simplifies
	 the dependencies by providing common methods in a single dependency */

define([
  'test/common/modules/testapp_module',
  'test/common/modules/client_module',
  'test/common/modules/testapp_manager',
  'globals',
  'async',
  'chai',
], function (testAppModule, clientModule, testAppManager, globals, async, chai) {
  var utils = clientModule.Ably.Realtime.Utils;
  var platform = clientModule.Ably.Realtime.Platform;
  var BufferUtils = platform.BufferUtils;
  var expect = chai.expect;
  /* IANA reserved; requests to it will hang forever */
  var unroutableHost = '10.255.255.1';
  var unroutableAddress = 'http://' + unroutableHost + '/';

  class SharedHelper {
    setupApp = testAppModule.setup;
    tearDownApp = testAppModule.tearDown;
    createStats = testAppModule.createStatsFixtureData;
    getTestApp = testAppModule.getTestApp;

    Ably = clientModule.Ably;
    AblyRest = clientModule.AblyRest;
    ablyClientOptions = clientModule.ablyClientOptions;
    Utils = utils;

    loadTestData = testAppManager.loadJsonData;
    testResourcesPath = testAppManager.testResourcesPath;

    unroutableHost = unroutableHost;
    unroutableAddress = unroutableAddress;
    flushTestLogs = globals.flushLogs;

    constructor(context) {
      if (!context) {
        throw new Error('SharedHelper created without context');
      }
      this.context = context;
    }

    static forTest(thisInBeforeEach) {
      return new this(thisInBeforeEach.currentTest.fullTitle());
    }

    static forHook(thisInHook) {
      return new this(thisInHook.test.fullTitle());
    }

    static forTestDefinition(thisInDescribe, label) {
      if (!label) {
        throw new Error('SharedHelper.forTestDefinition called without label');
      }
      return new this(`${thisInDescribe.title} (defining ${label})`);
    }

    get availableTransports() {
      return utils.keysArray(
        clientModule.Ably.Realtime.ConnectionManager.supportedTransports(clientModule.Ably.Realtime._transports),
      );
    }

    get bestTransport() {
      return this.availableTransports[0];
    }

    displayError(err) {
      if (typeof err == 'string' || err == null) return err;

      var result = '';
      if (err.statusCode) result += err.statusCode + '; ';
      if (typeof err.message == 'string') result += err.message;
      if (typeof err.message == 'object') result += JSON.stringify(err.message);

      return result;
    }

    monitorConnection(done, realtime, states) {
      (states || ['failed', 'suspended']).forEach(function (state) {
        realtime.connection.on(state, function () {
          done(new Error('Connection monitoring: state changed to ' + state + ', aborting test'));
          realtime.close();
        });
      });
    }

    async monitorConnectionAsync(action, realtime, states) {
      const monitoringResultPromise = new Promise((resolve, reject) => {
        this.monitorConnection((err) => (err ? reject(err) : resolve()), realtime, states);
      });
      const actionResultPromise = Promise.resolve(action());

      return Promise.race([monitoringResultPromise, actionResultPromise]);
    }

    closeAndFinish(done, realtime, err) {
      if (typeof realtime === 'undefined') {
        // Likely called in a catch block for an exception
        // that occured before realtime was initialized
        done(err);
        return;
      }
      if (Object.prototype.toString.call(realtime) == '[object Array]') {
        var realtimes = realtime.filter(function (rt) {
          return rt !== undefined;
        });
        this.closeAndFinishSeveral(done, realtimes, err);
        return;
      }
      this.callbackOnClose(realtime, function () {
        done(err);
      });
    }

    async closeAndFinishAsync(realtime, err) {
      return new Promise((resolve, reject) => {
        this.closeAndFinish((err) => (err ? reject(err) : resolve()), realtime, err);
      });
    }

    /**
     * Uses a callback to communicate the result of a `Promise`. The first argument passed to the callback will be either an error (when the promise is rejected) or `null` (when the promise is fulfilled). In the case where the promise is fulfilled, the resulting value will be passed to the callback as a second argument.
     */
    static whenPromiseSettles(promise, callback) {
      promise
        .then((result) => {
          callback(null, result);
        })
        .catch((err) => {
          callback(err);
        });
    }

    simulateDroppedConnection(realtime) {
      // Go into the 'disconnected' state before actually disconnecting the transports
      // to avoid the instantaneous reconnect attempt that would be triggered in
      // notifyState by the active transport getting disconnected from a connected state
      realtime.connection.once('disconnected', function () {
        realtime.connection.connectionManager.disconnectAllTransports();
      });
      realtime.connection.connectionManager.requestState({ state: 'disconnected' });
    }

    becomeSuspended(realtime, cb) {
      realtime.connection.connectionManager.disconnectAllTransports();
      realtime.connection.once('disconnected', function () {
        realtime.connection.connectionManager.notifyState({ state: 'suspended' });
      });
      if (cb)
        realtime.connection.once('suspended', function () {
          cb();
        });
    }

    callbackOnClose(realtime, callback) {
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

    closeAndFinishSeveral(done, realtimeArray, e) {
      async.map(
        realtimeArray,
        (realtime, mapCb) => {
          var parallelItem = (parallelCb) => {
            this.callbackOnClose(realtime, function () {
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
        },
      );
    }

    /* testFn is assumed to be a function of realtimeOptions that returns a mocha test */
    static testOnAllTransports(thisInDescribe, name, testFn, skip) {
      const helper = this.forTestDefinition(thisInDescribe, name);
      var itFn = skip ? it.skip : it;
      let transports = helper.availableTransports;
      transports.forEach(function (transport) {
        itFn(
          name + '_with_' + transport + '_binary_transport',
          testFn({ transports: [transport], useBinaryProtocol: true }),
        );
        itFn(
          name + '_with_' + transport + '_text_transport',
          testFn({ transports: [transport], useBinaryProtocol: false }),
        );
      });
      /* Plus one for no transport specified (ie use websocket/base mechanism if
       * present).  (we explicitly specify all transports since node only does
       * websocket+nodecomet if comet is explicitly requested)
       * */
      itFn(name + '_with_binary_transport', testFn({ transports, useBinaryProtocol: true }));
      itFn(name + '_with_text_transport', testFn({ transports, useBinaryProtocol: false }));
    }

    static restTestOnJsonMsgpack(name, testFn, skip) {
      var itFn = skip ? it.skip : it;
      itFn(name + ' with binary protocol', async function () {
        await testFn(new clientModule.AblyRest({ useBinaryProtocol: true }), name + '_binary', this.test.helper);
      });
      itFn(name + ' with text protocol', async function () {
        await testFn(new clientModule.AblyRest({ useBinaryProtocol: false }), name + '_text', this.test.helper);
      });
    }

    clearTransportPreference() {
      if (isBrowser && window.localStorage) {
        window.localStorage.removeItem('ably-transport-preference');
      }
    }

    isComet(transport) {
      return transport.toString().indexOf('/comet/') > -1;
    }

    isWebsocket(transport) {
      return !!transport.toString().match(/wss?\:/);
    }

    static randomString() {
      return Math.random().toString().slice(2);
    }

    testMessageEquality(one, two) {
      // treat `null` same as `undefined` (using ==, rather than ===)
      expect(one.encoding == two.encoding, "Encoding mismatch ('" + one.encoding + "' != '" + two.encoding + "').").to
        .be.ok;

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

    static activeClients = [];

    AblyRealtime(options) {
      const client = clientModule.AblyRealtime(options);
      SharedHelper.activeClients.push(client);
      return client;
    }

    /* Slightly crude catch-all hook to close any dangling realtime clients left open
     * after a test fails without calling closeAndFinish */
    closeActiveClients() {
      SharedHelper.activeClients.forEach((client) => {
        client.close();
      });
      SharedHelper.activeClients = [];
    }

    logTestResults(afterEachThis) {
      if (afterEachThis.currentTest.isFailed()) {
        const logs = globals.getLogs();
        if (logs.length > 0) {
          // empty console.logs are for vertical spacing
          console.log();
          console.log('Logs for failing test: \n');
          logs.forEach(([timestamp, log]) => {
            console.log(timestamp, log);
          });
          console.log();
        }
      }
    }
  }

  SharedHelper.testOnAllTransports.skip = function (thisInDescribe, name, testFn) {
    SharedHelper.testOnAllTransports(thisInDescribe, name, testFn, true);
  };

  SharedHelper.restTestOnJsonMsgpack.skip = function (name, testFn) {
    SharedHelper.restTestOnJsonMsgpack(name, testFn, true);
  };

  return (module.exports = SharedHelper);
});
