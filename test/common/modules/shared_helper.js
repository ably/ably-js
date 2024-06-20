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
  'private_api_recorder',
], function (testAppModule, clientModule, testAppManager, globals, async, chai, privateApiRecorder) {
  var utils = clientModule.Ably.Realtime.Utils;
  var platform = clientModule.Ably.Realtime.Platform;
  var BufferUtils = platform.BufferUtils;
  var expect = chai.expect;
  /* IANA reserved; requests to it will hang forever */
  var unroutableHost = '10.255.255.1';
  var unroutableAddress = 'http://' + unroutableHost + '/';

  class SharedHelper {
    getTestApp = testAppModule.getTestApp;

    Ably = clientModule.Ably;
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
      this.privateApiContext = privateApiRecorder.createContext(context);
    }

    addingHelperFunction(helperFunctionName) {
      return new SharedHelper({ ...this.context, helperStack: [helperFunctionName, ...this.context.helperStack] });
    }

    withParameterisedTestTitle(title) {
      return new SharedHelper({ ...this.context, parameterisedTestTitle: title });
    }

    static createContext(data) {
      return {
        ...data,
        helperStack: [],
      };
    }

    static extractSuiteHierarchy(suite) {
      const hierarchy = [];
      while (suite.title) {
        hierarchy.unshift(suite.title);
        suite = suite.parent;
      }
      return hierarchy;
    }

    static forTest(thisInBeforeEach) {
      const context = {
        type: 'test',
        file: thisInBeforeEach.currentTest.file,
        suite: this.extractSuiteHierarchy(thisInBeforeEach.currentTest.parent),
        title: thisInBeforeEach.currentTest.title,
        parameterisedTestTitle: null,
      };

      return new this(this.createContext(context));
    }

    static forHook(thisInHook) {
      /**
       * Based on what I’ve observed (haven’t found good documentation about it), the value of `this` in a hook varies:
       *
       * - `before` hook in a test file: Context, with properties:
       *    - test: Hook
       *
       * - `beforeEach` hook in a test file: Suite, which has a `ctx`: Context property with properties:
       *   - test: Hook
       *
       * - global `after` hook: Context, with properties:
       *   - test: Hook
       *
       *  For the test file hooks, the Hook has a `file` property, but for some reason the root hook doesn’t (i.e. doesn’t indicate which file the hook lives in)
       */
      const mochaContext = 'ctx' in thisInHook ? thisInHook.ctx : thisInHook;
      const mochaHook = mochaContext.test;

      const context = {
        type: 'hook',
        title: mochaHook.originalTitle,
      };

      if (!mochaHook.parent.root) {
        // For some reason the root hook doesn’t contain file information
        context.file = mochaHook.file;
        context.suite = this.extractSuiteHierarchy(mochaHook.parent);
      } else {
        context.file = null;
        context.suite = null;
      }

      return new this(this.createContext(context));
    }

    recordTestStart() {
      this.privateApiContext.recordTestStart();
    }

    recordPrivateApi(identifier) {
      this.privateApiContext.record(identifier);
    }

    get availableTransports() {
      return ['web_socket'];
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
      const helper = this.addingHelperFunction('closeAndFinish');
      helper._closeAndFinish(done, realtime, err);
    }

    _closeAndFinish(done, realtime, err) {
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
      const helper = this.addingHelperFunction('closeAndFinishAsync');
      return helper._closeAndFinishAsync(realtime, err);
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
      const helper = this.addingHelperFunction('simulateDroppedConnection');
      helper._simulateDroppedConnection(realtime);
    }

    _simulateDroppedConnection(realtime) {
      const self = this;
      // Go into the 'disconnected' state before actually disconnecting the transports
      // to avoid the instantaneous reconnect attempt that would be triggered in
      // notifyState by the active transport getting disconnected from a connected state
      realtime.connection.once('disconnected', function () {
        self.recordPrivateApi('call.connectionManager.disconnectAllTransports');
        realtime.connection.connectionManager.disconnectAllTransports();
      });
      this.recordPrivateApi('call.connectionManager.requestState');
      realtime.connection.connectionManager.requestState({ state: 'disconnected' });
    }

    becomeSuspended(realtime, cb) {
      const helper = this.addingHelperFunction('becomeSuspended');
      helper._becomeSuspended(realtime, cb);
    }

    _becomeSuspended(realtime, cb) {
      this.recordPrivateApi('call.connectionManager.disconnectAllTransports');
      realtime.connection.connectionManager.disconnectAllTransports();
      const self = this;
      realtime.connection.once('disconnected', function () {
        self.recordPrivateApi('call.connectionManager.notifyState');
        realtime.connection.connectionManager.notifyState({ state: 'suspended' });
      });
      if (cb)
        realtime.connection.once('suspended', function () {
          cb();
        });
    }

    callbackOnClose(realtime, callback) {
      const helper = this.addingHelperFunction('callbackOnClose');
      helper._callbackOnClose(realtime, callback);
    }

    _callbackOnClose(realtime, callback) {
      this.recordPrivateApi('read.connectionManager.activeProtocol');
      if (!realtime.connection.connectionManager.activeProtocol) {
        this.recordPrivateApi('call.Platform.nextTick');
        platform.Config.nextTick(function () {
          realtime.close();
          callback();
        });
        return;
      }
      this.recordPrivateApi('read.connectionManager.activeProtocol.transport');
      this.recordPrivateApi('listen.transport.disposed');
      realtime.connection.connectionManager.activeProtocol.transport.on('disposed', function () {
        callback();
      });
      /* wait a tick before closing in order to avoid the final close
       * happening synchronously in a publish/attach callback, which
       * complicates channelattach_publish_invalid etc. */
      this.recordPrivateApi('call.Platform.nextTick');
      platform.Config.nextTick(function () {
        realtime.close();
      });
    }

    closeAndFinishSeveral(done, realtimeArray, e) {
      const helper = this.addingHelperFunction('closeAndFinishSeveral');
      helper._closeAndFinishSeveral(done, realtimeArray, e);
    }

    _closeAndFinishSeveral(done, realtimeArray, e) {
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
      var itFn = skip ? it.skip : it;

      function createTest(options) {
        return function (done) {
          this.test.helper = this.test.helper.withParameterisedTestTitle(name);
          return testFn(options).apply(this, [done]);
        };
      }

      itFn(name + '_with_binary_transport', createTest({ useBinaryProtocol: true }));
      itFn(name + '_with_text_transport', createTest({ useBinaryProtocol: false }));
    }

    static restTestOnJsonMsgpack(name, testFn, skip) {
      var itFn = skip ? it.skip : it;
      itFn(name + ' with binary protocol', async function () {
        const helper = this.test.helper.withParameterisedTestTitle(name);

        await testFn(new clientModule.AblyRest(helper, { useBinaryProtocol: true }), name + '_binary', helper);
      });
      itFn(name + ' with text protocol', async function () {
        const helper = this.test.helper.withParameterisedTestTitle(name);

        await testFn(new clientModule.AblyRest(helper, { useBinaryProtocol: false }), name + '_text', helper);
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
      const helper = this.addingHelperFunction('testMessageEquality');
      return helper._testMessageEquality(one, two);
    }

    _testMessageEquality(one, two) {
      // treat `null` same as `undefined` (using ==, rather than ===)
      expect(one.encoding == two.encoding, "Encoding mismatch ('" + one.encoding + "' != '" + two.encoding + "').").to
        .be.ok;

      if (typeof one.data === 'string' && typeof two.data === 'string') {
        expect(one.data === two.data, 'String data contents mismatch.').to.be.ok;
        return;
      }

      this.recordPrivateApi('call.BufferUtils.isBuffer');
      if (BufferUtils.isBuffer(one.data) && BufferUtils.isBuffer(two.data)) {
        this.recordPrivateApi('call.BufferUtils.areBuffersEqual');
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

    ablyClientOptions(options) {
      return clientModule.ablyClientOptions(this, options);
    }

    AblyRest(options) {
      return clientModule.AblyRest(this, options);
    }

    static activeClients = [];

    AblyRealtime(options) {
      const client = clientModule.AblyRealtime(this, options);
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

    createStats(app, statsData, callback) {
      testAppModule.createStatsFixtureData(this, app, statsData, callback);
    }

    setupApp(forceSetup, done) {
      return testAppModule.setup(this, forceSetup, done);
    }

    tearDownApp(app, callback) {
      testAppModule.tearDown(this, app, callback);
    }

    dumpPrivateApiUsage() {
      privateApiRecorder.dump();
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
