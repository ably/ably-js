"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
  var exports = {};

  exports.setup_realtime_history = function(test) {
    test.expect(1);
    helper.setupApp(function(err) {
      if(err) {
        test.ok(false, helper.displayError(err));
      } else {
        test.ok(true, 'app set up');
      }
      test.done();
    });
  };

  exports.device_going_offline_causes_disconnected_state = function(test) {
    var realtime = helper.AblyRealtime(),
        connection = realtime.connection,
        offlineEvent = new Event('offline');

    test.expect(2);

    connection.once('connected', function() {
      var connectedAt = new Date().getTime()

      connection.once('disconnected', function() {
        var disconnectedAt = new Date().getTime();

        test.ok(connectedAt > disconnectedAt - 250, 'Offline event caused connection to move to the disconnected state immediately (under 250ms)');

        connection.once('connecting', function() {
          var reconnectingAt = new Date().getTime();

          test.ok(disconnectedAt > reconnectingAt - 250, 'Client automatically reattempts connection even if the state is still offline');
          connection.close();
          test.done();
        });
      })

      // simulate offline event, expect connection moves to disconnected state and waits to retry connection
      document.dispatchEvent(offlineEvent);
    });

    setTimeout(function() {
      connection.close();
      test.done();
    }, 10000)
  };

  exports.device_going_online_causes_disconnected_connection_to_reconnect_immediately = function(test) {
    var realtime = helper.AblyRealtime(),
        connection = realtime.connection,
        onlineEvent = new Event('online');

    test.expect(2);

    connection.connectionManager.on('transport.active', function(transport) {
      transport.disconnect(); // disconnect the transport before the connection is connected
    });

    connection.once('disconnected', function() {
      var disconnectedAt = new Date();

      setTimeout(function() {
        test.ok(connection.state == 'disconnected', 'Connection should still be disconnected before we trigger it to connect');
        connection.once('connecting', function() {
          test.ok(disconnectedAt > new Date() - 250, 'Online event should have caused the connection to enter the connecting state immediately');
          connection.close();
          test.done();
        });
        document.dispatchEvent(onlineEvent);
      }, 1000)
    });

    setTimeout(function() {
      connection.close();
      test.done();
    }, 10000)
  };

  // TODO: Ensure that connection goes online from the suspended state
  exports.device_going_online_causes_suspended_connection_to_reconnect_immediately = function(test) {
    var realtime = helper.AblyRealtime(),
        connection = realtime.connection,
        onlineEvent = new Event('online');

    test.expect(2);

    // TODO: This will not work as Defaults is contained within an anonymous closure, also need to confirm if this will work once defaults can be changed
    Defaults.disconnectTimeout = 100; // retry connection more frequently
    Defaults.suspendedTimeout = 1000; // move to suspended state after 1s of being disconencted

    connection.connectionManager.on('transport.active', function(transport) {
      transport.disconnect(); // disconnect the transport before the connection is connected
    });

    connection.once('suspended', function() {
      var suspendedAt = new Date();

      setTimeout(function() {
        test.ok(connection.state == 'suspended', 'Connection should still be suspended before we trigger it to connect');
        connection.once('connecting', function() {
          test.ok(suspendedAt > new Date() - 250, 'Online event should have caused the connection to enter the connecting state immediately');
          connection.close();
          test.done();
        });
        document.dispatchEvent(onlineEvent);
      }, 1000)
    });

    setTimeout(function() {
      connection.close();
      test.done();
    }, 10000)
  };

  return module.exports = helper.withTimeout(exports);
});
