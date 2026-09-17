'use strict';

/**
 * Invalid- and string-input behavior of the per-side Pub/Sub package factories.
 *
 * The factories wrap the core constructors, so an input the core rejects must surface the
 * core's own instructive error rather than being normalised into something that constructs
 * and fails later with a vaguer one. Node-only, like the rest of test/unit; the agent entry
 * the factories stamp on valid input is asserted in pubsub_side_agent.test.js.
 */
define(['chai'], function (chai) {
  const { expect } = chai;
  const PubSubDevice = require('@ably/pubsub-device');
  const PubSubServer = require('@ably/pubsub-server');

  describe('pubsub_factories', function () {
    describe('called with no arguments', function () {
      // The core constructors reject undefined with an error telling the caller what to
      // initialize with. The factories must not mask it by stamping `agents` onto an empty
      // object, which would construct and then fail later with 'No authentication options
      // provided'.
      for (const [name, factory] of [
        ['device createClient', PubSubDevice.createClient],
        ['server createHttpClient', PubSubServer.createHttpClient],
        ['server createRealtimeClient', PubSubServer.createRealtimeClient],
      ]) {
        it(`${name} surfaces the core's initialization error`, function () {
          expect(factory).to.throw(/must be initialized with either a client options object/);
        });
      }
    });

    describe('called with a key or token string', function () {
      // The root factories accept the string forms the constructors they wrap accept. Only the
      // HTTP factory is exercised (a realtime client constructed from a bare string would
      // auto-connect), but both string branches of the shared keyOrTokenToOptions helper are.
      it('server createHttpClient accepts an API key string', function () {
        expect(PubSubServer.createHttpClient('app.key:secret').request).to.be.a('function');
      });

      it('server createHttpClient accepts a token string', function () {
        expect(PubSubServer.createHttpClient('tokenstring').request).to.be.a('function');
      });
    });

    describe('exports', function () {
      const PubSubCore = require('@ably/pubsub-core');

      // A client constructed directly declares no side, so the factories must be the only way to
      // build one: neither package may hand out the implementation's client classes, under any name.
      for (const [packageName, exports, createClient] of [
        [
          '@ably/pubsub-device',
          PubSubDevice,
          () => PubSubDevice.createClient({ key: 'app.key:secret', autoConnect: false }),
        ],
        ['@ably/pubsub-server', PubSubServer, () => PubSubServer.createHttpClient({ key: 'app.key:secret' })],
      ]) {
        for (const className of ['DefaultPubSubRealtimeClient', 'DefaultPubSubHttpClient', 'Realtime', 'Http']) {
          it(`${packageName} does not export ${className}`, function () {
            expect(exports).not.to.have.property(className);
          });
        }

        // The statics need no client, so each package exports them by name. They must be the classes
        // the package's own clients carry as statics, so that both behave identically.
        for (const className of ['Crypto', 'Message', 'PresenceMessage', 'Annotation']) {
          it(`${packageName} exports its clients' ${className}`, function () {
            const client = createClient();
            try {
              expect(exports[className]).to.be.a('function');
              expect(exports[className]).to.equal(client.constructor[className]);
            } finally {
              client.close?.();
            }
          });
        }

        // `ErrorInfo` must be the core's single runtime copy, so that an error from either package,
        // or from an SDK layered on Pub/Sub, passes `instanceof ErrorInfo` against any of them.
        it(`${packageName} exports the core's ErrorInfo`, function () {
          expect(exports.ErrorInfo).to.equal(PubSubCore.ErrorInfo);
        });
      }

      it('@ably/pubsub-core exports only its runtime classes', function () {
        expect(Object.keys(PubSubCore).sort()).to.deep.equal(['ErrorInfo', 'EventEmitter', 'PartialErrorInfo']);
      });

      it('@ably/pubsub-device has no HTTP factory', function () {
        expect(PubSubDevice).not.to.have.property('createHttpClient');
      });
    });
  });
});
