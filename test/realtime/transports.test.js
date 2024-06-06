'use strict';

define(['shared_helper', 'async', 'chai', 'ably'], function (Helper, async, chai, Ably) {
  const helper = new Helper();

  const expect = chai.expect;
  const Defaults = Ably.Rest.Platform.Defaults;
  const originialWsCheckUrl = Defaults.wsConnectivityUrl;
  const transportPreferenceName = 'ably-transport-preference';
  const localStorageSupported = globalThis.localStorage;
  const urlScheme = 'https://';
  const echoServer = 'echo.ably.io';
  const failUrl = urlScheme + echoServer + '/respondwith?status=500';
  const defaultTransports = new Ably.Realtime({ key: 'xxx:yyy', autoConnect: false }).connection.connectionManager
    .transports;

  function baseTransport() {
    return new Ably.Realtime({
      key: 'xxx:yyy',
      autoConnect: false,
      transports: helper.availableTransports,
    }).connection.connectionManager.baseTransport;
  }

  function restoreWsConnectivityUrl() {
    Defaults.wsConnectivityUrl = originialWsCheckUrl;
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
      helper.setupApp(function (err) {
        if (err) {
          done(err);
          return;
        }
        done();
      });
    });

    afterEach(restoreWsConnectivityUrl);
    afterEach(restoreWebSocketConstructor);

    if (helper.availableTransports.length > 1) {
      // ensure comet transport is used for nodejs tests
      function options(opts) {
        return helper.Utils.mixin(
          {
            transports: helper.availableTransports,
          },
          opts || {},
        );
      }

      /** @nospec */
      it('websocket_is_default', function (done) {
        const realtime = helper.AblyRealtime(options());

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
        Config.WebSocket = FakeWebSocket;
        const realtime = helper.AblyRealtime(options({ webSocketSlowTimeout: 1000, webSocketConnectTimeout: 3000 }));

        realtime.connection.on('connected', function () {
          try {
            expect(realtime.connection.connectionManager.activeProtocol.transport.shortName).to.equal(baseTransport());
            // check that transport preference is set
            if (localStorageSupported) {
              expect(window.localStorage.getItem(transportPreferenceName)).to.equal(
                JSON.stringify({ value: baseTransport() }),
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
        const goodHost = helper.AblyRest().options.realtimeHost;
        const realtime = helper.AblyRealtime(
          options({ realtimeHost: helper.unroutableAddress, fallbackHosts: [goodHost] }),
        );

        realtime.connection.on('connected', function () {
          expect(realtime.connection.connectionManager.activeProtocol.transport.shortName).to.equal('web_socket');
          helper.closeAndFinish(done, realtime);
        });

        helper.monitorConnection(done, realtime);
      });

      /** @specpartial RTN14d */
      it('no_internet_connectivity', function (done) {
        Config.WebSocket = FakeWebSocket;
        const realtime = helper.AblyRealtime(options({ connectivityCheckUrl: failUrl, webSocketSlowTimeout: 1000 }));

        // expect client to transition to disconnected rather than attempting base transport (which would succeed in this instance)
        realtime.connection.on('disconnected', function () {
          helper.closeAndFinish(done, realtime);
        });
      });

      /** @specpartial RTN14d */
      it('no_websocket_or_base_transport', function (done) {
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

      if (localStorageSupported) {
        /** @nospec */
        it('base_transport_preference', function (done) {
          window.localStorage.setItem(transportPreferenceName, JSON.stringify({ value: baseTransport() }));
          const realtime = helper.AblyRealtime(options());

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
                baseTransport(),
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
          window.localStorage.setItem(transportPreferenceName, JSON.stringify({ value: baseTransport() }));
          const realtime = helper.AblyRealtime(options());

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
          window.localStorage.setItem(transportPreferenceName, JSON.stringify({ value: baseTransport() }));
          const realtime = helper.AblyRealtime(options());

          // make ws connectivity check only resolve after connected with base transport
          realtime.connection.connectionManager.checkWsConnectivity = function () {
            return new Promise((resolve) => {
              realtime.connection.once('connected', () => {
                try {
                  expect(realtime.connection.connectionManager.activeProtocol.transport.shortName).to.equal(
                    baseTransport(),
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
