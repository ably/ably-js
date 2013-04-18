var sharedTests = sharedTestsClass();

function sharedTestsClass() {
  function realtimeConnection(transports) {
    console.log(transports);
    return new Ably.Realtime({
      log: {level: 4},
      restHost:testVars.realtimeHost,
      wsHost:testVars.realtimeHost,
      port:testVars.realtimePort,
      tlsPort:testVars.realtimeTlsPort,
      key: testVars.key0Str,
      transports: transports
    });
  }

  function failWithin(timeInSeconds, test, description) {
    var timeout = setTimeout(function() {
      test.ok(false, 'Timed out: Trying to ' + description + ' took longer than ' + timeInSeconds + ' second(s)');
    }, timeInSeconds * 1000);

    return {
      stop: function() {
        clearTimeout(timeout);
      }
    }
  }

  return {
    connectionWithTransport: function (test, transport) {
      test.expect(1);
      try {
        var ably = realtimeConnection([transport]),
            connectionTimeout = failWithin(5, test, 'connect');
        ably.connection.on('connected', function () {
          connectionTimeout.stop();
          test.ok(true, 'Verify ' + transport + ' connection with key');
          test.done();
          ably.close();
        });
        ['failed', 'suspended'].forEach(function (state) {
          ably.connection.on(state, function () {
            test.ok(false, transport + ' connection to server failed');
            test.done();
          });
        });
      } catch (e) {
        test.ok(false, 'Init ' + transport + ' connection failed with exception: ' + e.stack);
        test.done();
      }
    },

    heartbeatWithTransport: function(test, transport) {
      test.expect(1);
      try {
        var ably = realtimeConnection([transport]),
            connectionTimeout = failWithin(5, test, 'connect'),
            heartbeatTimeout;
        /* when we see the transport we're interested in get activated,
         * listen for the heartbeat event */
        var failTimer;
        var connectionManager = ably.connection.connectionManager;
        connectionManager.on('transport.active', function (transport) {
          if ((transport.toString().indexOf('ws://') > -1) || (transport.toString().indexOf('/comet/') > -1))
            transport.once('heartbeat', function () {
              clearTimeout(failTimer);
              test.ok(true, 'verify ' + transport + ' heartbeat');
              test.done();
              ably.close();
            });
        });

        ably.connection.on('connected', function () {
          connectionTimeout.stop();
          heartbeatTimeout = failWithin(25, test, 'wait for heartbeat');
        });
        ['failed', 'suspended'].forEach(function (state) {
          ably.connection.on(state, function () {
            heartbeatTimeout.stop();
            test.ok(false, 'Connection to server failed');
            test.done();
          });
        });
      } catch (e) {
        test.ok(false, transport + ' connect with key failed with exception: ' + e.stack);
        test.done();
      }
    },

    publishWithTransport: function(test, transport) {
      var count = 5;
      var sentCount = 0, receivedCount = 0, sentCbCount = 0;
      var timer;
      var checkFinish = function () {
        if ((receivedCount === count) && (sentCbCount === count)) {
          receiveMessagesTimeout.stop();
          test.done();
          ably.close();
        }
      };
      var ably = realtimeConnection([transport]),
          connectionTimeout = failWithin(5, test, 'connect'),
          receiveMessagesTimeout;

      ably.connection.on('connected', function () {
        connectionTimeout.stop();
        receiveMessagesTimeout = failWithin(15, test, 'wait for published messages to be received');
      });

      test.expect(count);
      var channel = ably.channels.get(transport + 'publish0' + String(Math.random()).substr(1));
      /* subscribe to event */
      channel.subscribe('event0', function (msg) {
        test.ok(true, 'Received event0');
        console.log(transport + 'event received');
        receivedCount++;
        checkFinish();
      });
      timer = setInterval(function () {
        console.log('sending: ' + sentCount++);
        channel.publish('event0', 'Hello world at: ' + new Date(), function (err) {
          console.log(transport + 'publish callback called');
          sentCbCount++;
          checkFinish();
        });
        if (sentCount === count) clearInterval(timer);
      }, 1000);
    }
  };
}