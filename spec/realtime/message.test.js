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

  exports.publishVariations = function(test) {
    var transport = 'binary';

    test.expect(32);
    try {
      /* set up realtime */
      var realtime = helper.AblyRealtime();
      var rest = helper.AblyRest();

      /* connect and attach */
      realtime.connection.on('connected', function() {
        var rtChannel = realtime.channels.get('publishVariations');
        var testData = 'Some data'
        var errorCallback = function(err){
          if(err) {
            test.ok(false, 'Error received by publish callback ' + err);
            test.done();
            realtime.close();
            return;
          }
        }
        rtChannel.attach(function(err) {
          if(err) {
            test.ok(false, 'Attach failed with error: ' + err);
            test.done();
            realtime.close();
            return;
          }

          /* subscribe to different message types */
          var messagesReceived = 0
          rtChannel.subscribe(function(msg) {
            test.ok(true, 'Received ' + msg.name);
            ++messagesReceived;
            switch(msg.name) {
              case 'objectWithName':
              case 'objectWithNameAndCallback':
              case 'objectWithNameAndNullData':
              case 'objectWithNameAndUndefinedData':
              case 'nameAndNullData':
              case 'nameAndUndefinedData':
                test.equal(typeof(msg.data), 'undefined', 'Msg data was received where none expected');
                break;
              case 'nameAndData':
              case 'nameAndDataAndCallback':
              case 'objectWithNameAndData':
              case 'objectWithNameAndDataAndCallback':
                test.equal(msg.data, testData, 'Msg data ' + msg.data + 'Unexpected message data received');
                break;
              case undefined:
                if (msg.data) {
                  // 3 messages: null name and data, null name and data and callback, object with null name and data
                  test.equal(msg.data, testData, 'Msg data ' + msg.data + 'Unexpected message data received');
                } else {
                  // 3 messages: null name and null data, object with null name and no data, object with null name and null data
                  test.equal(typeof(msg.data), 'undefined', 'Msg data was received where none expected');
                }
								break;
              default:
                test.ok(false, 'Unexpected message ' + msg.name + 'received');
                test.done();
                realtime.close();
            }

            if (messagesReceived == 16) {
              test.done();
              realtime.close();
            }
          });

          /* publish events */
          var restChannel = rest.channels.get('publishVariations');
          restChannel.publish({name: 'objectWithName'});
          restChannel.publish({name: 'objectWithNameAndCallback'}, errorCallback);
          restChannel.publish({name: 'objectWithNameAndNullData', data: null});
          restChannel.publish({name: 'objectWithNameAndUndefinedData', data: undefined});
          restChannel.publish('nameAndNullData', null);
          restChannel.publish('nameAndUndefinedData', undefined);
          restChannel.publish('nameAndData', testData);
          restChannel.publish('nameAndDataAndCallback', testData, errorCallback);
          restChannel.publish({name: 'objectWithNameAndData', data: testData});
          restChannel.publish({name: 'objectWithNameAndDataAndCallback', data: testData}, errorCallback);
          // 6 messages with null name:
          restChannel.publish(null, testData);
          restChannel.publish(null, testData, errorCallback);
          restChannel.publish({name: null, data: testData});
          restChannel.publish(null, null);
          restChannel.publish({name: null});
          restChannel.publish({name: null, data: null});
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
      var channel = realtime.channels.get('wsxhrpublish');
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
      var channel = realtime.channels.get('wsjsonppublish');
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
    exports.wscometpublish = function(test) {
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
      var channel = realtime.channels.get('wscometpublish');
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
