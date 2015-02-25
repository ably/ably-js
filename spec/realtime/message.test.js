"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
  var exports = {},
      displayError = helper.displayError;

  exports.setupMessage = function(test) {
    test.expect(1);
    helper.setupApp(function(err) {
      if(err) {
        test.ok(false, displayError(err));
      } else {
        test.ok(true, 'setup app');
      }
      test.done();
    });
  };

  exports.publishonce = function(test) {
    var transport = 'binary';

    test.expect(2);
    try {
      /* set up realtime */
      var realtime = helper.AblyRealtime();
      var rest = helper.AblyRest();

      /* connect and attach */
      realtime.connection.on('connected', function() {
        var testMsg = 'Hello world';
        var rtChannel = realtime.channels.get('publishonce');
        rtChannel.attach(function(err) {
          if(err) {
            test.ok(false, 'Attach failed with error: ' + err);
            test.done();
            realtime.close();
            return;
          }

          /* subscribe to event */
          rtChannel.subscribe('event0', function(msg) {
            test.ok(true, 'Received event0');
            test.equal(msg.data, testMsg, 'Unexpected msg text received');
            test.done();
            realtime.close();
          });

          /* publish event */
          var restChannel = rest.channels.get('publishonce');
          restChannel.publish('event0', testMsg);
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
      realtime.close();
    }
  };

  exports.restpublish = function(test) {
    var count = 10;
    var rest = helper.AblyRest();
    var realtime = helper.AblyRealtime();
    test.expect(2 * count);
    var messagesSent = [];
    var sendchannel = rest.channels.get('restpublish');
    var recvchannel = realtime.channels.get('restpublish');
    /* subscribe to event */
    recvchannel.subscribe('event0', function(msg) {
      test.ok(true, 'Received event0');
      test.notEqual(-1, messagesSent.indexOf(msg.data), 'Received unexpected message text');
      if(!--count) {
        realtime.close();
        clearInterval(timer);
        test.done();
      }
    });
    var timer = setInterval(function() {
      // console.log('sending: ' + count);
      var msgText = 'Hello world at: ' + new Date();
      messagesSent.push(msgText);
      sendchannel.publish('event0', msgText);
    }, 500);
  };

  exports.wspublish = function(test) {
    var count = 10;
    var cbCount = 10;
    var timer;
    var checkFinish = function() {
      if(count <= 0 && cbCount <= 0) {
        clearInterval(timer);
        test.done();
        realtime.close();
      }
    };
    var realtime = helper.AblyRealtime();
    test.expect(count);
    var channel = realtime.channels.get('wspublish');
    /* subscribe to event */
    channel.subscribe('event0', function() {
      test.ok(true, 'Received event0');
      --count;
      checkFinish();
    });
    timer = setInterval(function() {
      // console.log('sending: ' + count);
      channel.publish('event0', 'Hello world at: ' + new Date(), function() {
        // console.log('publish callback called');
        --cbCount;
        checkFinish();
      });
    }, 500);
  };

  if (isBrowser) {
    exports.wsxhrpublish = function(test) {
      var count = 5;
      var cbCount = 5;
      var timer;
      var checkFinish = function() {
        if(count <= 0 && cbCount <= 0) {
          clearInterval(timer);
          test.done();
          realtime.close();
        }
      };
      var realtime = helper.AblyRealtime({ transports : ['xhr'] });
      test.expect(count);
      var channel = realtime.channels.get('wspublish');
      /* subscribe to event */
      channel.subscribe('event0', function() {
        test.ok(true, 'Received event0');
        --count;
        checkFinish();
      });
      timer = setInterval(function() {
        console.log('sending: ' + count);
        channel.publish('event0', 'Hello world at: ' + new Date(), function() {
          console.log('publish callback called');
          --cbCount;
          checkFinish();
        });
      }, 500);
    };

    exports.wsjsonppublish = function(test) {
      var count = 5;
      var cbCount = 5;
      var timer;
      var checkFinish = function() {
        if(count <= 0 && cbCount <= 0) {
          clearInterval(timer);
          test.done();
          realtime.close();
        }
      };
      var realtime = helper.AblyRealtime({ transports : ['jsonp'] });
      test.expect(count);
      var channel = realtime.channels.get('wspublish');
      /* subscribe to event */
      channel.subscribe('event0', function() {
        test.ok(true, 'Received event0');
        --count;
        checkFinish();
      });
      timer = setInterval(function() {
        console.log('sending: ' + count);
        channel.publish('event0', 'Hello world at: ' + new Date(), function() {
          console.log('publish callback called');
          --cbCount;
          checkFinish();
        });
      }, 500);
    };
  } else {
    exports.wsjsonppublish = function(test) {
      var count = 5;
      var cbCount = 5;
      var timer;
      var checkFinish = function() {
        if(count <= 0 && cbCount <= 0) {
          clearInterval(timer);
          test.done();
          realtime.close();
        }
      };
      var realtime = helper.AblyRealtime({ transports : ['comet'] });
      test.expect(count);
      var channel = realtime.channels.get('wspublish');
      /* subscribe to event */
      channel.subscribe('event0', function() {
        test.ok(true, 'Received event0');
        --count;
        checkFinish();
      });
      timer = setInterval(function() {
        console.log('sending: ' + count);
        channel.publish('event0', 'Hello world at: ' + new Date(), function() {
          console.log('publish callback called');
          --cbCount;
          checkFinish();
        });
      }, 500);
    };
  }

  return module.exports = helper.withTimeout(exports);
});
