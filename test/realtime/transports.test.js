'use strict';

define(['shared_helper', 'async', 'chai', 'ably'], function (Helper, async, chai, Ably) {
  const expect = chai.expect;
  const Defaults = Ably.Rest.Platform.Defaults;
  const originialWsCheckUrl = Defaults.wsConnectivityCheckUrl;
  const transportPreferenceName = 'ably-transport-preference';
  const localStorageSupported = globalThis.localStorage;
  const urlScheme = 'https://';
  const echoServer = 'echo.ably.io';
  const failUrl = urlScheme + echoServer + '/respondwith?status=500';
  const defaultTransports = new Ably.Realtime({ key: 'xxx:yyy', autoConnect: false }).connection.connectionManager
    .transports;

  function baseTransport(helper) {
    return new Ably.Realtime({
      key: 'xxx:yyy',
      autoConnect: false,
      transports: helper.availableTransports,
    }).connection.connectionManager.baseTransport;
  }

  function restoreWsConnectivityCheckUrl() {
    Helper.forHook(this).recordPrivateApi('write.Defaults.wsConnectivityCheckUrl');
    Defaults.wsConnectivityCheckUrl = originialWsCheckUrl;
  }

  const Config = Ably.Rest.Platform.Config;
  const oldWs = Config.WebSocket;

  function restoreWebSocketConstructor() {
    Config.WebSocket = oldWs;
  }

  // drop in replacement for WebSocket which doesn't emit any events (same behaviour as when WebSockets upgrade headers are removed by a proxy)
  class FakeWebSocket {
    close() {}
  }

  describe('realtime/transports', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      const helper = Helper.forHook(this);
      helper.setupApp(function (err) {
        if (err) {
          done(err);
          return;
        }
        done();
      });
    });

    afterEach(restoreWsConnectivityCheckUrl);
    afterEach(restoreWebSocketConstructor);

    if (
      Helper.forTestDefinition(this, 'tests that are run if there are multiple transports').availableTransports.length >
      1
    ) {
      // ensure comet transport is used for nodejs tests
      function options(helper, opts) {
        return helper.Utils.mixin(
          {
            transports: helper.availableTransports,
          },
          opts || {},
        );
      }

      /** @nospec */
      it('websocket_is_default', function (done) {
        const helper = this.test.helper;
        const realtime = helper.AblyRealtime(options(helper));

        realtime.connection.on('connected', function () {
          try {
            expect(realtime.connection.connectionManager.activeProtocol.transport.shortName).to.equal('web_socket');
          } catch (err) {
            helper.closeAndFinish(done, realtime, err);
          }
          helper.closeAndFinish(done, realtime);
        });

        helper.monitorConnection(done, realtime);
      });

      /** @nospec */
      it('no_ws_connectivity', function (done) {
        const helper = this.test.helper;
        Config.WebSocket = FakeWebSocket;
        const realtime = helper.AblyRealtime(
          options(helper, { webSocketSlowTimeout: 1000, webSocketConnectTimeout: 3000 }),
        );

        realtime.connection.on('connected', function () {
          try {
            expect(realtime.connection.connectionManager.activeProtocol.transport.shortName).to.equal(
              baseTransport(helper),
            );
            // check that transport preference is set
            if (localStorageSupported) {
              expect(window.localStorage.getItem(transportPreferenceName)).to.equal(
                JSON.stringify({ value: baseTransport(helper) }),
              );
            }
          } catch (err) {
            helper.closeAndFinish(done, realtime, err);
          }
          helper.closeAndFinish(done, realtime);
        });

        helper.monitorConnection(done, realtime);
      });

      /** @nospec */
      it('ws_primary_host_fails', function (done) {
        const helper = this.test.helper;
        const goodHost = helper.AblyRest().options.realtimeHost;
        const realtime = helper.AblyRealtime(
          options(helper, { realtimeHost: helper.unroutableAddress, fallbackHosts: [goodHost] }),
        );

        realtime.connection.on('connected', function () {
          expect(realtime.connection.connectionManager.activeProtocol.transport.shortName).to.equal('web_socket');
          helper.closeAndFinish(done, realtime);
        });

        helper.monitorConnection(done, realtime);
      });

      /** @specpartial RTN14d */
      it('no_internet_connectivity', function (done) {
        const helper = this.test.helper;
        Config.WebSocket = FakeWebSocket;
        const realtime = helper.AblyRealtime(
          options(helper, { connectivityCheckUrl: failUrl, webSocketSlowTimeout: 1000 }),
        );

        // expect client to transition to disconnected rather than attempting base transport (which would succeed in this instance)
        realtime.connection.on('disconnected', function () {
          helper.closeAndFinish(done, realtime);
        });
      });

      /** @specpartial RTN14d */
      it('no_websocket_or_base_transport', function (done) {
        const helper = this.test.helper;
        Config.WebSocket = FakeWebSocket;
        const realtime = helper.AblyRealtime({
          transports: ['web_socket'],
          realtimeRequestTimeout: 3000,
          webSocketConnectTimeout: 3000,
        });

        realtime.connection.on('disconnected', function () {
          helper.closeAndFinish(done, realtime);
        });
      });

      /** @nospec */
      it('ws_can_reconnect_after_ws_connectivity_fail', function (done) {
        const helper = this.test.helper;
        helper.recordPrivateApi('read.realtime.options.realtimeHost');
        const goodHost = helper.AblyRest().options.realtimeHost;

        helper.recordPrivateApi('pass.clientOption.webSocketSlowTimeout');
        helper.recordPrivateApi('pass.clientOption.wsConnectivityCheckUrl');
        const realtime = helper.AblyRealtime(
          options(helper, {
            realtimeHost: helper.unroutableAddress,
            // use unroutable host ws connectivity check to simulate no internet
            wsConnectivityCheckUrl: helper.unroutableWssAddress,
            // ensure ws slow timeout procs and performs ws connectivity check, which would fail due to unroutable host
            webSocketSlowTimeout: 1,
            // give up trying to connect fairly quickly
            realtimeRequestTimeout: 2000,
            // try to reconnect quickly
            disconnectedRetryTimeout: 2000,
          }),
        );
        const connection = realtime.connection;

        // simulate the internet being failed by stubbing out tryATransport to foil
        // the initial connection
        helper.recordPrivateApi('replace.connectionManager.tryATransport');
        const tryATransportOriginal = connection.connectionManager.tryATransport;
        connection.connectionManager.tryATransport = function () {};

        async.series(
          [
            function (cb) {
              realtime.connection.once('disconnected', function () {
                cb();
              });
            },
            function (cb) {
              // restore original settings
              helper.recordPrivateApi('replace.connectionManager.tryATransport');
              connection.connectionManager.tryATransport = tryATransportOriginal;
              helper.recordPrivateApi('write.realtime.options.wsConnectivityCheckUrl');
              realtime.options.wsConnectivityCheckUrl = originialWsCheckUrl;
              helper.recordPrivateApi('write.realtime.options.realtimeHost');
              realtime.options.realtimeHost = goodHost;
              helper.recordPrivateApi('write.connectionManager.wsHosts');
              realtime.connection.connectionManager.wsHosts = [goodHost];

              cb();
            },
            function (cb) {
              // should reconnect successfully
              realtime.connection.once('connected', function () {
                cb();
              });

              realtime.connection.once('disconnected', function () {
                try {
                  // fast fail if we end up in the disconnected state again
                  expect(
                    connection.state !== 'disconnected',
                    'Connection should not remain disconnected after websocket reconnection attempt even after failed ws connectivity check from previous connection attempt',
                  ).to.be.ok;
                } catch (err) {
                  cb(err);
                }
              });
            },
          ],
          function (err) {
            helper.closeAndFinish(done, realtime, err);
          },
        );
      });

      if (localStorageSupported) {
        /** @nospec */
        it('base_transport_preference', function (done) {
          const helper = this.test.helper;
          window.localStorage.setItem(transportPreferenceName, JSON.stringify({ value: baseTransport(helper) }));
          const realtime = helper.AblyRealtime(options(helper));

          // make ws connectivity check only resolve after connected with base transport.
          // prevents a race condition where the wsConnectivity check succeeds before base transport is activated;
          // in this case the base transport would be abandoned in favour of websocket
          realtime.connection.connectionManager.checkWsConnectivity = function () {
            return new Promise((resolve) => {
              realtime.connection.once('connected', () => {
                resolve();
              });
            });
          };

          realtime.connection.on('connected', function () {
            try {
              expect(realtime.connection.connectionManager.activeProtocol.transport.shortName).to.equal(
                baseTransport(helper),
              );
            } catch (err) {
              helper.closeAndFinish(done, realtime, err);
            }
            helper.closeAndFinish(done, realtime);
          });
          helper.monitorConnection(done, realtime);
        });

        /** @nospec */
        it('transport_preference_reset_while_connecting', function (done) {
          const helper = this.test.helper;
          window.localStorage.setItem(transportPreferenceName, JSON.stringify({ value: baseTransport(helper) }));
          const realtime = helper.AblyRealtime(options(helper));

          // make ws connectivity check fast so that it succeeds while base transport is still connecting
          realtime.connection.connectionManager.checkWsConnectivity = function () {
            return new Promise((resolve) => {
              setTimeout(() => resolve(), 1);
            });
          };

          realtime.connection.once('connected', function () {
            try {
              expect(realtime.connection.connectionManager.activeProtocol.transport.shortName).to.equal('web_socket');
              expect(realtime.connection.connectionManager.getTransportPreference()).to.equal('web_socket');
            } catch (err) {
              helper.closeAndFinish(done, realtime, err);
              return;
            }
            helper.closeAndFinish(done, realtime);
          });
          helper.monitorConnection(done, realtime);
        });

        /** @nospec */
        it('transport_preference_reset_after_connected', function (done) {
          const helper = this.test.helper;
          window.localStorage.setItem(transportPreferenceName, JSON.stringify({ value: baseTransport(helper) }));
          const realtime = helper.AblyRealtime(options(helper));

          // make ws connectivity check only resolve after connected with base transport
          realtime.connection.connectionManager.checkWsConnectivity = function () {
            return new Promise((resolve) => {
              realtime.connection.once('connected', () => {
                try {
                  expect(realtime.connection.connectionManager.activeProtocol.transport.shortName).to.equal(
                    baseTransport(helper),
                  );
                  resolve();
                } catch (err) {
                  helper.closeAndFinish(done, realtime, err);
                  return;
                }
              });
            });
          };

          realtime.connection.once('connected', function () {
            // the checkWsConnectivity promise won't execute .then callbacks synchronously upon resolution
            // so we need to wait one tick before the transport preference is unpersisted
            setTimeout(() => {
              try {
                // ensure base transport preference is erased
                expect(realtime.connection.connectionManager.getTransportPreference()).to.equal(null);
              } catch (err) {
                helper.closeAndFinish(done, realtime, err);
                return;
              }
              helper.closeAndFinish(done, realtime);
            }, 0);
          });
          helper.monitorConnection(done, realtime);
        });
      }
    }
  });
});
