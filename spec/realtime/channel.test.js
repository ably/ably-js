"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
  var currentTime, exports = {},
      displayError = helper.displayError;

  exports.setupauth = function(test) {
    test.expect(1);
    helper.setupApp(function(err) {
      if(err) {
        test.ok(false, helper.displayError(err));
        test.done();
        return;
      }

      var realtime = helper.AblyRealtime();
      realtime.time(function(err, time) {
        if(err) {
          test.ok(false, helper.displayError(err));
          test.done();
          return;
        }
        currentTime = time;
        test.ok(true, 'Obtained time');
        test.done();
        realtime.close();
      });
    });
  };

  /*
   * Base attach case, binary transport
   */
  exports.channelattach0 = function(test) {
    var transport = 'binary';

    test.expect(1);
    try {
      var realtime = helper.AblyRealtime();
      realtime.connection.on('connected', function() {
        var channel0 = realtime.channels.get('channel0');
        channel0.attach(function(err) {
          if(err)
            test.ok(false, 'Attach failed with error: ' + err);
          else
            test.ok(true, 'Attach to channel 0 with no options');
          test.done();
          realtime.close();
        });
      });
      var exitOnState = function(state) {
        realtime.connection.on(state, function () {
          test.ok(false, transport + ' connection to server failed');
          test.done();
          realtime.close();
        });
      };
      exitOnState('failed');
      exitOnState('suspended');
    } catch(e) {
      test.ok(false, 'Channel attach failed with exception: ' + e.stack);
      test.done();
    }
  };

  /*
   * Base attach case, text/json transport
   */
  exports.channelattach1 = function(test) {
    var transport = 'json';

    test.expect(1);
    try {
      var realtime = helper.AblyRealtime({ useBinaryProtocol: false });
      realtime.connection.on('connected', function() {
        var channel1 = realtime.channels.get('channel1');
        channel1.attach(function(err) {
          if(err)
            test.ok(false, 'Attach failed with error: ' + err);
          else
            test.ok(true, 'Attach to channel1 with no options');

          setTimeout(function() {
          test.done();

          }, 3000);
          realtime.close();
        });
      });
      var exitOnState = function(state) {
        realtime.connection.on(state, function () {
          test.ok(false, transport + ' connection to server failed');
          test.done();
          realtime.close();
        });
      };
      exitOnState('failed');
      exitOnState('suspended');
    } catch(e) {
      test.ok(false, 'Channel attach failed with exception: ' + e.stack);
      test.done();
    }
  };

  /*
   * Attach before connect, binary transport
   */
  exports.channelattach2 = function(test) {
    var transport = 'binary';

    test.expect(1);
    try {
      var realtime = helper.AblyRealtime();
      var channel2 = realtime.channels.get('channel2');
      channel2.attach(function(err) {
        if(err)
          test.ok(false, 'Attach failed with error: ' + err);
        else
          test.ok(true, 'Attach to channel 0 with no options');
        test.done();
        realtime.close();
      });
      var exitOnState = function(state) {
        realtime.connection.on(state, function () {
          test.ok(false, transport + ' connection to server failed');
          test.done();
          realtime.close();
        });
      };
      exitOnState('failed');
      exitOnState('suspended');
    } catch(e) {
      test.ok(false, 'Channel attach failed with exception: ' + e.stack);
      test.done();
    }
  };

  /*
   * Attach then detach, binary transport
   */
  exports.channelattach3 = function(test) {
    var transport = 'binary';

    test.expect(1);
    try {
      var realtime = helper.AblyRealtime();
      realtime.connection.on('connected', function() {
        var channel0 = realtime.channels.get('channel0');
        channel0.attach(function(err) {
          if(err) {
            test.ok(false, 'Attach failed with error: ' + err);
            test.done();
            realtime.close();
          }
          channel0.detach(function(err) {
            if(err) {
              test.ok(false, 'Detach failed with error: ' + err);
              test.done();
              realtime.close();
            }
            if(channel0.state == 'detached')
              test.ok(true, 'Attach then detach to channel 0 with no options');
            else
              test.ok(false, 'Detach failed: State is '+channel0.state);
            test.done();
            realtime.close();
          });
        });
      });
      var exitOnState = function(state) {
        realtime.connection.on(state, function () {
          test.ok(false, transport + ' connection to server failed');
          test.done();
          realtime.close();
        });
      };
      exitOnState('failed');
      exitOnState('suspended');
    } catch(e) {
      test.ok(false, 'Channel attach failed with exception: ' + e.stack);
      test.done();
    }
  };

  if (isBrowser) {
    /*
     * Base attach case, jsonp transport
     */
    exports.channelattachjson1 = function(test) {
      var transport = 'jsonp';

      test.expect(1);
      try {
        var realtime = helper.AblyRealtime({ transports: [transport] });
        realtime.connection.on('connected', function() {
          var channel3 = realtime.channels.get('channel3');
          channel3.attach(function(err) {
            if(err)
              test.ok(false, 'Attach failed with error: ' + err);
            else
              test.ok(true, 'Attach to channel 3 with no options');
            test.done();
            realtime.close();
          });
        });
        var exitOnState = function(state) {
          realtime.connection.on(state, function () {
            test.ok(false, transport + ' connection to server failed');
            test.done();
            realtime.close();
          });
        };
        exitOnState('failed');
        exitOnState('suspended');
      } catch(e) {
        test.ok(false, 'Channel attach failed with exception: ' + e.stack);
        test.done();
      }
    };

    /*
     * Attach then detach, jsonp transport
     */
    exports.channelattachjson2 = function(test) {
      var transport = 'jsonp';

      test.expect(1);
      try {
        var realtime = helper.AblyRealtime({ transports: [transport] });
        realtime.connection.on('connected', function() {
          var channel5 = realtime.channels.get('channel5');
          channel5.attach(function(err) {
            if(err) {
              test.ok(false, 'Attach failed with error: ' + err);
              test.done();
              realtime.close();
            }
            /* we can't get a callback on a detach, so set a timeout */
            channel5.detach(function(err) {
              if(err) {
                test.ok(false, 'Attach failed with error: ' + err);
                test.done();
                realtime.close();
              }
              if(channel5.state == 'detached')
                test.ok(true, 'Attach then detach to channel 0 with no options');
              else
                test.ok(false, 'Detach failed');
              test.done();
              realtime.close();
            });
          });
        });
        var exitOnState = function(state) {
          realtime.connection.on(state, function () {
            test.ok(false, transport + ' connection to server failed');
            test.done();
            realtime.close();
          });
        };
        exitOnState('failed');
        exitOnState('suspended');
      } catch(e) {
        test.ok(false, 'Channel attach failed with exception: ' + e.stack);
        test.done();
      }
    };

    /*
     * Base attach case, xhr transport
     */
    exports.channelattachxhr1 = function(test) {
      var transport = 'xhr';

      test.expect(1);
      try {
        var realtime = helper.AblyRealtime({ transports: [transport] });
        realtime.connection.on('connected', function() {
          var channel3 = realtime.channels.get('channel3');
          channel3.attach(function(err) {
            if(err)
              test.ok(false, 'Attach failed with error: ' + err);
            else
              test.ok(true, 'Attach to channel 3 with no options');
            test.done();
            realtime.close();
          });
        });
        var exitOnState = function(state) {
          realtime.connection.on(state, function () {
            test.ok(false, transport + ' connection to server failed');
            test.done();
            realtime.close();
          });
        };
        exitOnState('failed');
        exitOnState('suspended');
      } catch(e) {
        test.ok(false, 'Channel attach failed with exception: ' + e.stack);
        test.done();
      }
    };

    /*
     * Attach then detach, xhr transport
     */
    exports.channelattachxhr2 = function(test) {
      var transport = 'xhr';

      test.expect(1);
      try {
        var realtime = helper.AblyRealtime({ transports: [transport] });
        realtime.connection.on('connected', function() {
          var channel5 = realtime.channels.get('channel5');
          channel5.attach(function(err) {
            if(err) {
              test.ok(false, 'Attach failed with error: ' + err);
              test.done();
              realtime.close();
            }
            /* we can't get a callback on a detach, so set a timeout */
            channel5.detach(function(err) {
              if(err) {
                test.ok(false, 'Attach failed with error: ' + err);
                test.done();
                realtime.close();
              }
              if(channel5.state == 'detached')
                test.ok(true, 'Attach then detach to channel 0 with no options');
              else
                test.ok(false, 'Detach failed');
              test.done();
              realtime.close();
            });
          });
        });
        var exitOnState = function(state) {
          realtime.connection.on(state, function () {
            test.ok(false, transport + ' connection to server failed');
            test.done();
            realtime.close();
          });
        };
        exitOnState('failed');
        exitOnState('suspended');
      } catch(e) {
        test.ok(false, 'Channel attach failed with exception: ' + e.stack);
        test.done();
      }
    };
  } else {
    /*
     * Base attach case, comet transport
     */
    exports.channelattachcomet1 = function(test) {
      var transport = 'comet';

      test.expect(1);
      try {
        var realtime = helper.AblyRealtime({ transports: [transport] });
        realtime.connection.on('connected', function() {
          var channel3 = realtime.channels.get('channel3');
          channel3.attach(function(err) {
            if(err)
              test.ok(false, 'Attach failed with error: ' + err);
            else
              test.ok(true, 'Attach to channel 3 with no options');
            test.done();
            realtime.close();
          });
        });
        var exitOnState = function(state) {
          realtime.connection.on(state, function () {
            test.ok(false, transport + ' connection to server failed');
            test.done();
            realtime.close();
          });
        };
        exitOnState('failed');
        exitOnState('suspended');
      } catch(e) {
        test.ok(false, 'Channel attach failed with exception: ' + e.stack);
        test.done();
      }
    };

    /*
     * Attach then detach, comet transport
     */
    exports.channelattachcomet2 = function(test) {
      var transport = 'comet';

      test.expect(1);
      try {
        var realtime = helper.AblyRealtime({ transports: [transport] });
        realtime.connection.on('connected', function() {
          var channel5 = realtime.channels.get('channel5');
          channel5.attach(function(err) {
            if(err) {
              test.ok(false, 'Attach failed with error: ' + err);
              test.done();
              realtime.close();
            }
            /* we can't get a callback on a detach, so set a timeout */
            channel5.detach(function(err) {
              if(err) {
                test.ok(false, 'Attach failed with error: ' + err);
                test.done();
                realtime.close();
              }
              if(channel5.state == 'detached')
                test.ok(true, 'Attach then detach to channel 0 with no options');
              else
                test.ok(false, 'Detach failed');
              test.done();
              realtime.close();
            });
          });
        });
        var exitOnState = function(state) {
          realtime.connection.on(state, function () {
            test.ok(false, transport + ' connection to server failed');
            test.done();
            realtime.close();
          });
        };
        exitOnState('failed');
        exitOnState('suspended');
      } catch(e) {
        test.ok(false, 'Channel attach failed with exception: ' + e.stack);
        test.done();
      }
    };
  }

  /*
   * Subscribe, then unsubscribe, binary transport
   */
  exports.channelsubscribe0 = function(test) {
    var transport = 'binary';

    test.expect(1);
    try {
      var realtime = helper.AblyRealtime();
      realtime.connection.on('connected', function() {
        var channel6 = realtime.channels.get('channel6');
        channel6.attach(function(err) {
          if(err) {
            test.ok(false, 'Attach failed with error: ' + err);
            test.done();
            realtime.close();
          }
          try {
            channel6.subscribe('event0', function() {});
            setTimeout(function() {
              try {
                channel6.unsubscribe('event0', function() {});
                test.ok(true, 'Subscribe then unsubscribe to channel6:event0 with no options');
                test.done();
                realtime.close();
              } catch(e) {
                test.ok(false, 'Unsubscribe failed with error: ' + e.stack);
                test.done();
                realtime.close();
              }
            }, 1000);
          } catch(e) {
            test.ok(false, 'Subscribe failed with error: ' + e);
            test.done();
            realtime.close();
          }
        });
      });
      var exitOnState = function(state) {
        realtime.connection.on(state, function () {
          test.ok(false, transport + ' connection to server failed');
          test.done();
          realtime.close();
        });
      };
      exitOnState('failed');
      exitOnState('suspended');
    } catch(e) {
      test.ok(false, 'Channel attach failed with exception: ' + e.stack);
      test.done();
    }
  };

  return module.exports = exports;
});
