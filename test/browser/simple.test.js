'use strict';

define(['ably', 'shared_helper', 'chai'], function (Ably, helper, chai) {
  var expect = chai.expect;
  var whenPromiseSettles = helper.whenPromiseSettles;

  describe('browser/simple', function () {
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

    function isTransportAvailable(transport) {
      return transport in Ably.Realtime.ConnectionManager.supportedTransports(Ably.Realtime._transports);
    }

    function realtimeConnection(transports) {
      var options = {};
      if (transports) options.transports = transports;
      return helper.AblyRealtime(options);
    }

    function failWithin(timeInSeconds, done, ably, description) {
      var timeout = setTimeout(function () {
        done(new Error('Timed out: Trying to ' + description + ' took longer than ' + timeInSeconds + ' second(s)'));
        ably.close();
      }, timeInSeconds * 1000);

      return {
        stop: function () {
          clearTimeout(timeout);
        },
      };
    }

    function connectionWithTransport(done, transport) {
      try {
        var ably = realtimeConnection(transport && [transport]),
          connectionTimeout = failWithin(10, done, ably, 'connect');
        ably.connection.on('connected', function () {
          connectionTimeout.stop();
          done();
          ably.close();
        });
        var exitOnState = function (state) {
          ably.connection.on(state, function () {
            connectionTimeout.stop();
            done(new Error(transport + ' connection to server failed'));
            ably.close();
          });
        };
        exitOnState('failed');
        exitOnState('suspended');
      } catch (err) {
        done(err);
        connectionTimeout.stop();
      }
    }

    function heartbeatWithTransport(done, transport) {
      try {
        var ably = realtimeConnection(transport && [transport]),
          connectionTimeout = failWithin(10, done, ably, 'connect'),
          heartbeatTimeout;

        ably.connection.on('connected', function () {
          connectionTimeout.stop();
          heartbeatTimeout = failWithin(25, done, ably, 'wait for heartbeat');
          whenPromiseSettles(ably.connection.ping(), function (err) {
            heartbeatTimeout.stop();
            done(err);
            ably.close();
          });
        });
        var exitOnState = function (state) {
          ably.connection.on(state, function () {
            connectionTimeout.stop();
            done(new Error(transport + ' connection to server failed'));
            ably.close();
          });
        };
        exitOnState('failed');
        exitOnState('suspended');
      } catch (err) {
        done(err);
        connectionTimeout.stop();
        if (heartbeatTimeout) heartbeatTimeout.stop();
      }
    }

    function publishWithTransport(done, transport) {
      var count = 5;
      var sentCount = 0,
        receivedCount = 0,
        sentCbCount = 0;
      var timer;
      var checkFinish = function () {
        if (receivedCount === count && sentCbCount === count) {
          receiveMessagesTimeout.stop();
          done();
          ably.close();
        }
      };
      var ably = realtimeConnection(transport && [transport]),
        connectionTimeout = failWithin(5, done, ably, 'connect'),
        receiveMessagesTimeout;

      ably.connection.on('connected', function () {
        connectionTimeout.stop();
        receiveMessagesTimeout = failWithin(15, done, ably, 'wait for published messages to be received');

        timer = setInterval(function () {
          whenPromiseSettles(channel.publish('event0', 'Hello world at: ' + new Date()), function (err) {
            sentCbCount++;
            checkFinish();
          });
          if (sentCount === count) clearInterval(timer);
        }, 500);
      });

      var channel = ably.channels.get(transport + 'publish0' + String(Math.random()).substr(1));
      /* subscribe to event */
      channel.subscribe('event0', function () {
        receivedCount++;
        checkFinish();
      });
    }

    it('simpleInitBase0', function (done) {
      try {
        var timeout,
          ably = realtimeConnection();

        ably.connection.on('connected', function () {
          clearTimeout(timeout);
          done();
          ably.close();
        });
        var exitOnState = function (state) {
          ably.connection.on(state, function () {
            done(new Error('Connection to server failed'));
            ably.close();
          });
        };
        exitOnState('failed');
        exitOnState('suspended');
        timeout = setTimeout(function () {
          done(new Error('Timed out: Trying to connect took longer than expected'));
          ably.close();
        }, 10 * 1000);
      } catch (err) {
        done(err);
      }
    });

    var wsTransport = 'web_socket';
    if (isTransportAvailable(wsTransport)) {
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

    var xhrStreamingTransport = 'xhr_streaming';
    if (isTransportAvailable(xhrStreamingTransport)) {
      it('xhrstreamingbase0', function (done) {
        connectionWithTransport(done, xhrStreamingTransport);
      });

      /*
       * Publish and subscribe, json transport
       */
      it('xhrstreamingpublish0', function (done) {
        publishWithTransport(done, xhrStreamingTransport);
      });

      /*
       * Check heartbeat
       */
      it('xhrstreamingheartbeat0', function (done) {
        heartbeatWithTransport(done, xhrStreamingTransport);
      });
    }

    var xhrPollingTransport = 'xhr_polling';
    if (isTransportAvailable(xhrPollingTransport)) {
      it('xhrpollingbase0', function (done) {
        connectionWithTransport(done, xhrPollingTransport);
      });

      /*
       * Publish and subscribe, json transport
       */
      it('xhrpollingpublish0', function (done) {
        publishWithTransport(done, xhrPollingTransport);
      });

      /*
       * Check heartbeat
       */
      it('xhrpollingheartbeat0', function (done) {
        heartbeatWithTransport(done, xhrPollingTransport);
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
