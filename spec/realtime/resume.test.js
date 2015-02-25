"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
  var exports = {};

  exports.setupResume = function(test) {
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

  function mixin(target, src) {
    for(var prop in src)
      target[prop] = src[prop];
    return target;
  }

  function attachChannels(channels, callback) {
    async.map(channels, function(channel, cb) { channel.attach(cb); }, callback);
  }

  /**
   * Empty resume case
   * Send 5 messages; disconnect; reconnect; send 5 messages
   */
  function resume_inactive(test, channelName, txOpts, rxOpts) {
    var count = 5;

    var txRealtime = helper.AblyRealtime(mixin(txOpts));
    var rxRealtime = helper.AblyRealtime(mixin(rxOpts));
    test.expect(3);

    var rxChannel = rxRealtime.channels.get(channelName);
    var txChannel = txRealtime.channels.get(channelName);
    var rxCount = 0;

    var lastActiveRxTransport;
    rxRealtime.connection.connectionManager.on('transport.active', function(transport) {
      lastActiveRxTransport = transport;
    });

    function phase0(callback) {
      attachChannels([rxChannel, txChannel], callback);
    }

    function phase1(callback) {
      /* subscribe to event */
      rxChannel.subscribe('event0', function() {
        //console.log('received message; serial = ' + msg.connectionSerial);
        ++rxCount;
      });
      var txCount = 0;
      function ph1TxOnce() {
        console.log('sending (phase 1): ' + txCount);
        txChannel.publish('event0', 'Hello world at: ' + new Date());
        if(++txCount == count) {
          /* sent all messages */
          setTimeout(function() {
            test.equal(rxCount, count, 'Verify Phase 1 messages all received');
            callback(null);
          }, 2000);
          return;
        }
        setTimeout(ph1TxOnce, 800);
      }
      ph1TxOnce();
    }

    function phase2(callback) {
      /* disconnect the transport
       * NOTE: this uses knowledge of the internal operation
       * of the client library to simulate a dropped connection
       * without explicitly closing the connection */
      lastActiveRxTransport.disconnect();
      /* continue in 5 seconds */
      setTimeout(callback, 5000);
    }

    function phase3(callback) {
      /* re-open the connection, verify resume mode */
      rxRealtime.connection.connect();
      var connectionManager = rxRealtime.connection.connectionManager;
      connectionManager.on('transport.active', function(transport) {
        test.equal(transport.params.mode, 'resume', 'Verify reconnect is resume mode');
        callback(null);
      });
    }

    function phase4(callback) {
      /* subscribe to event */
      rxCount = 0;
      var txCount = 0;
      function ph4TxOnce() {
        console.log('sending (phase 4): ' + txCount);
        txChannel.publish('event0', 'Hello world at: ' + new Date());
        if(++txCount == count) {
          /* sent all messages */
          setTimeout(function() {
            test.equal(rxCount, count, 'Verify Phase 4 messages all received');
            callback(null);
          }, 2000);
          return;
        }
        setTimeout(ph4TxOnce, 800);
      }
      ph4TxOnce();
    }

    phase0(function(err) {
      if(err) {
        test.ok(false, 'Phase 1 failed with err: ' + err);
        test.done();
        return;
      }
      phase1(function(err) {
        if(err) {
          test.ok(false, 'Phase 1 failed with err: ' + err);
          test.done();
          return;
        }
        phase2(function(err) {
          if(err) {
            test.ok(false, 'Phase 2 failed with err: ' + err);
            test.done();
            return;
          }
          phase3(function(err) {
            if(err) {
              test.ok(false, 'Phase 3 failed with err: ' + err);
              test.done();
              return;
            }
            phase4(function(err) {
              if(err) {
                test.ok(false, 'Phase 4 failed with err: ' + err);
                return;
              }
              rxRealtime.close();
              txRealtime.close();
              test.done();
            });
          });
        });
      });
    });
  }

  exports.resume_inactive_ws_text = function(test) {
    resume_inactive(test, 'resume_inactive_ws_text', {
      transports:['web_socket'],
      useBinaryProtocol:false
    }, {
      transports:['web_socket'],
      useBinaryProtocol:false
    });
  };

  exports.resume_inactive_ws_binary = function(test) {
    resume_inactive(test, 'resume_inactive_ws_binary', {
      transports:['web_socket'],
      useBinaryProtocol:false
    }, {
      transports:['web_socket'],
      useBinaryProtocol:true
    });
  };

  exports.resume_inactive_comet_text = function(test) {
    resume_inactive(test, 'resume_inactive_comet_text', {
      transports:['web_socket'],
      useBinaryProtocol:false
    }, {
      transports:['xhr', 'iframe', 'jsonp', 'comet']
    });
  };

  /**
   * Simple resume case
   * Send 5 messages; disconnect; send 5 messages; reconnect
   */
  function resume_active(test, channelName, txOpts, rxOpts) {
    var count = 5;

    var txRealtime = helper.AblyRealtime(mixin(txOpts));
    var rxRealtime = helper.AblyRealtime(mixin(rxOpts));
    test.expect(3);

    var rxChannel = rxRealtime.channels.get('resume1');
    var txChannel = txRealtime.channels.get('resume1');
    var rxCount = 0;

    var lastActiveRxTransport;
    rxRealtime.connection.connectionManager.on('transport.active', function(transport) {
      lastActiveRxTransport = transport;
    });

    function phase0(callback) {
      attachChannels([rxChannel, txChannel], callback);
    }

    function phase1(callback) {
      /* subscribe to event */
      rxChannel.subscribe('event0', function() {
        ++rxCount;
      });
      var txCount = 0;
      function ph1TxOnce() {
        console.log('sending (phase 1): ' + txCount);
        txChannel.publish('event0', 'Hello world at: ' + new Date());
        if(++txCount == count) {
          /* sent all messages */
          setTimeout(function() {
            test.equal(rxCount, count, 'Verify Phase 1 messages all received');
            callback(null);
          }, 2000);
          return;
        }
        setTimeout(ph1TxOnce, 800);
      }
      ph1TxOnce();
    }

    function phase2(callback) {
      /* disconnect the transport and send 5 more messages
       * NOTE: this uses knowledge of the internal operation
       * of the client library to simulate a dropped connection
       * without explicitly closing the connection */
      lastActiveRxTransport.disconnect();
      var txCount = 0;

      function ph2TxOnce() {
        console.log('sending (phase 2): ' + txCount);
        txChannel.publish('event0', 'Hello world at: ' + new Date());
        if(++txCount == count) {
          /* sent all messages */
          setTimeout(function() { callback(null); }, 1000);
          return;
        }
        setTimeout(ph2TxOnce, 1000);
      }

      setTimeout(ph2TxOnce, 800);
    }

    function phase3(callback) {
      /* re-open the connection, verify resume mode */
      rxCount = 0;
      rxRealtime.connection.connect();
      var connectionManager = rxRealtime.connection.connectionManager;
      connectionManager.on('transport.active', function(transport) {
        test.equal(transport.params.mode, 'resume', 'Verify reconnect is resume mode');
        setTimeout(function() {
          test.equal(rxCount, count, 'Verify Phase 2 messages all received');
          callback(null);
        }, 2000);
      });
    }

    phase0(function(err) {
      if(err) {
        test.ok(false, 'Phase 1 failed with err: ' + err);
        test.done();
        return;
      }
      phase1(function(err) {
        if(err) {
          test.ok(false, 'Phase 1 failed with err: ' + err);
          test.done();
          return;
        }
        phase2(function(err) {
          if(err) {
            test.ok(false, 'Phase 2 failed with err: ' + err);
            test.done();
            return;
          }
          phase3(function(err) {
            if(err) {
              test.ok(false, 'Phase 3 failed with err: ' + err);
              test.done();
              return;
            }
            rxRealtime.close();
            txRealtime.close();
            test.done();
          });
        });
      });
    });
  }

  exports.resume_active_ws_text = function(test) {
    resume_active(test, 'resume_active_ws_text', {
      transports:['web_socket'],
      useBinaryProtocol:false
    }, {
      transports:['web_socket'],
      useBinaryProtocol:false
    });
  };

  exports.resume_active_ws_binary = function(test) {
    resume_active(test, 'resume_active_ws_binary', {
      transports:['web_socket'],
      useBinaryProtocol:false
    }, {
      transports:['web_socket'],
      useBinaryProtocol:true
    });
  };

  exports.resume_active_comet_text = function(test) {
    resume_active(test, 'resume_active_comet_text', {
      transports:['web_socket'],
      useBinaryProtocol:false
    }, {
      transports:['xhr', 'jsonp', 'comet']
    });
  };

  return module.exports = helper.withTimeout(exports);
});
