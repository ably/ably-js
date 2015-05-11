"use strict";

define(['ably', 'shared_helper', 'async'], function(Ably, helper, async) {
  var exports = {},
      displayError = helper.displayError;

  var rest, realtime, authToken, authToken2;
  var testClientId = 'testclient', testClientId2 = 'testclient2';
  var presenceChannel;

  exports.setupauth = function(test) {
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

  /**
   * Set up the prerequisites of the presence tests below.
   *
   * A generic (anonymous connection) is established which listens
   * for events on the presence object for a given channel.
   * Individual tests listen on this object from time to time.
   *
   * An authToken is created that is associated with a specific
   * client id, which is used to send events on the presence channel.
   * @param test
   */
  exports.setuppresence = function(test) {
    var expects = 0;
    async.series(
      [
        function(cb) {
          test.expect(++expects);
          try {
            rest = helper.AblyRest();
            rest.auth.requestToken({clientId:testClientId}, function(err, tokenDetails) {
              if(err) {
                test.ok(false, displayError(err));
                cb(err);
                return;
              }
              authToken = tokenDetails.id;
              test.equal(tokenDetails.clientId, testClientId, 'Verify client id');
              test.expect(++expects);
              rest.auth.requestToken({clientId:testClientId2}, function(err, tokenDetails) {
                if(err) {
                  test.ok(false, displayError(err));
                  cb(err);
                  return;
                }
                authToken2 = tokenDetails.id;
                test.equal(tokenDetails.clientId, testClientId2, 'Verify client id (2)');
                cb(null);
              });
            });
          } catch(err) {
            test.ok(false, 'Test failed with exception: ' + err.stack);
            cb(err);
          }
        },
        function(cb) {
          var transport = 'web_socket';
          test.expect(++expects);
          try {
            realtime = helper.AblyRealtime({ transports: [transport] });
            realtime.connection.on('connected', function() {
              presenceChannel = realtime.channels.get('presence0');
              presenceChannel.attach(function(err) {
                if(err)
                  test.ok(false, 'Attach failed with error: ' + err);
                else
                  test.ok(true, 'Attach to channel 0 with no options');
                cb(err);
              });
            });
            var exitOnState = function(state) {
              realtime.connection.on(state, function () {
                test.ok(false, transport + ' connection to server failed');
                realtime.close();
                cb(new Error('Connection to server failed'));
              });
            };
            exitOnState('failed');
            exitOnState('suspended');
          } catch(err) {
            test.ok(false, 'Test failed with exception: ' + err.stack);
            cb(err);
          }
        }
      ], function() {
        test.done();
      }
    );
  };

  /*
   * Attach to channel, enter presence channel with data and await entered event
   */
  exports.enter0 = function(test) {
    var clientRealtime;
    var isDone = false, done = function() {
      if(!isDone) {
        isDone = true;
        setTimeout(function() {
          test.done(); clientRealtime.close();
        }, 3000);
      }
    };
    try {
      var transport = 'web_socket';

      test.expect(2);
      /* listen for the enter event, test is complete when received */
      var presenceHandler = function() {
        if(this.event == 'enter') {
          test.ok(true, 'Presence event received');
          done();
          presenceChannel.presence.off(presenceHandler);
        }
      };
      presenceChannel.presence.on(presenceHandler);

      /* set up authenticated connection */
      clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken, transports: [transport] });
      clientRealtime.connection.on('connected', function() {
        /* get channel, attach, and enter */
        var clientChannel = clientRealtime.channels.get('presence0');
        clientChannel.attach(function(err) {
          if(err) {
            test.ok(false, 'Attach failed with error: ' + err);
            done();
            return;
          }
          clientChannel.presence.enter('Test client data (enter0)', function(err) {
            if(err) {
              test.ok(false, 'Enter failed with error: ' + err);
              done();
              return;
            }
            test.ok(true, 'Presence event sent');
          });
        });
      });
      var exitOnState = function(state) {
        clientRealtime.connection.on(state, function () {
          test.ok(false, transport + ' connection to server failed');
          done();
        });
      };
      exitOnState('failed');
      exitOnState('suspended');
    } catch(e) {
      test.ok(false, 'presence.enter0 failed with exception: ' + e.stack);
      done();
    }
  };

  /*
   * Enter presence channel without prior attach and await entered event
   */
  exports.enter1 = function(test) {
    var clientRealtime;
    var isDone = false, done = function() {
      if(!isDone) {
        isDone = true;
        setTimeout(function() {
          test.done(); clientRealtime.close();
        }, 3000);
      }
    };
    try {
      test.expect(2);
      /* listen for the enter event, test is complete when received */
      var presenceHandler = function() {
        if(this.event == 'enter') {
          test.ok(true, 'Presence event received');
          done();
          presenceChannel.presence.off(presenceHandler);
        }
      };
      presenceChannel.presence.on(presenceHandler);

      /* set up authenticated connection */
      var transport = 'web_socket';
      clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken, transports: [transport] });
      clientRealtime.connection.on('connected', function() {
        /* get channel, attach, and enter */
        var clientChannel = clientRealtime.channels.get('presence0');
        clientChannel.presence.enter('Test client data (enter1)', function(err) {
          if(err) {
            test.ok(false, 'Enter failed with error: ' + err);
            done();
            return;
          }
          test.ok(true, 'Presence event sent');
        });
      });
      var exitOnState = function(state) {
        clientRealtime.connection.on(state, function () {
          test.ok(false, transport + ' connection to server failed');
          done();
        });
      };
      exitOnState('failed');
      exitOnState('suspended');
    } catch(e) {
      test.ok(false, 'presence.enter1 failed with exception: ' + e.stack);
      done();
    }
  };

  /*
   * Enter presence channel without prior connect and await entered event
   */
  exports.enter2 = function(test) {
    var clientRealtime;
    var isDone = false, done = function() {
      if(!isDone) {
        isDone = true;
        setTimeout(function() {
          test.done(); clientRealtime.close();
        }, 3000);
      }
    };
    try {
      test.expect(2);
      /* listen for the enter event, test is complete when received */
      var presenceHandler = function() {
        if(this.event == 'enter') {
          test.ok(true, 'Presence event received');
          done();
          presenceChannel.presence.off(presenceHandler);
        }
      };
      presenceChannel.presence.on(presenceHandler);

      /* set up authenticated connection */
      var transport = 'web_socket';
      clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken, transports: [transport] });
      /* get channel, attach, and enter */
      var clientChannel = clientRealtime.channels.get('presence0');
      clientChannel.presence.enter('Test client data (enter2)', function(err) {
        if(err) {
          test.ok(false, 'Enter failed with error: ' + err);
          done();
          return;
        }
        test.ok(true, 'Presence event sent');
      });
      var exitOnState = function(state) {
        clientRealtime.connection.on(state, function () {
          test.ok(false, transport + ' connection to server failed');
          done();
        });
      };
      exitOnState('failed');
      exitOnState('suspended');
    } catch(e) {
      test.ok(false, 'presence.enter2 failed with exception: ' + e.stack);
      done();
    }
  };

  /*
   * Attach to channel, enter presence channel (without waiting for attach callback), detach
   * from channel immediately in 'attached' callback
   */
  exports.enter3 = function(test) {
    var clientRealtime;
    var isDone = false, done = function() {
      if(!isDone) {
        isDone = true;
        setTimeout(function() {
          test.done(); clientRealtime.close();
        }, 3000);
      }
    };
    try {
      test.expect(4);
      /* listen for the enter event, test is complete when received */
      var presenceHandler = function() {
        if(this.event == 'enter') {
          test.ok(true, 'Presence event received');
          done();
          presenceChannel.presence.off(presenceHandler);
        }
      };
      presenceChannel.presence.on(presenceHandler);

      /* set up authenticated connection */
      var transport = 'web_socket';
      clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken, transports: [transport] });
      clientRealtime.connection.on('connected', function() {
        /* get channel, attach, and enter */
        var clientChannel = clientRealtime.channels.get('presence0');
        clientChannel.attach(function(err) {
          if(err) {
            test.ok(false, 'Attach failed with error: ' + err);
            done();
            return;
          }
          test.ok(true, 'Attached');
          clientChannel.detach(function(err) {
            if(err) {
              test.ok(false, 'Detach failed with error: ' + err);
              done();
              return;
            }
            test.ok(true, 'Detached');
          });
        });
        clientChannel.presence.enter('Test client data (enter3)', function(err) {
          // Note: either an error (pending messages failed to send due to detach)
          //   or a success (pending messages were pushed out before the detach)
          //   is an acceptable result. Throwing an uncaught exception (the behaviour
          //   that we're testing for) isn't.
          if(err) {
            test.ok(true, 'Enter failed with error: ' + err);
            done();
            return;
          }
          test.ok(true, 'Presence event sent');
          /* done() is called in presence event handler */
        });
      });
      var exitOnState = function(state) {
        clientRealtime.connection.on(state, function () {
          test.ok(false, transport + ' connection to server failed');
          done();
        });
      };
      exitOnState('failed');
      exitOnState('suspended');
    } catch(e) {
      test.ok(false, 'presence.enter3 failed with exception: ' + e.stack);
      done();
    }
  };

  /*
   * Attach to channel, enter presence channel with a callback but no data and await entered event
   */
  exports.enter4 = function(test) {
    var clientRealtime;
    var isDone = false, done = function() {
      if(!isDone) {
        isDone = true;
        setTimeout(function() {
          test.done(); clientRealtime.close();
        }, 3000);
      }
    };
    try {
      var transport = 'web_socket';

      test.expect(2);
      /* listen for the enter event, test is complete when received */
      var presenceHandler = function() {
        if(this.event == 'enter') {
          test.ok(true, 'Presence event received');
          done();
          presenceChannel.presence.off(presenceHandler);
        }
      };
      presenceChannel.presence.on(presenceHandler);

      /* set up authenticated connection */
      clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken, transports: [transport] });
      clientRealtime.connection.on('connected', function() {
        /* get channel, attach, and enter */
        var clientChannel = clientRealtime.channels.get('presence0');
        clientChannel.attach(function(err) {
          if(err) {
            test.ok(false, 'Attach failed with error: ' + err);
            done();
            return;
          }
          clientChannel.presence.enter(function(err) {
            if(err) {
              test.ok(false, 'Enter failed with error: ' + err);
              done();
              return;
            }
            test.ok(true, 'Presence event sent');
          });
        });
      });
      var exitOnState = function(state) {
        clientRealtime.connection.on(state, function () {
          test.ok(false, transport + ' connection to server failed');
          done();
        });
      };
      exitOnState('failed');
      exitOnState('suspended');
    } catch(e) {
      test.ok(false, 'presence.enter4 failed with exception: ' + e.stack);
      done();
    }
  };

  /*
   * Attach to channel, enter presence channel with neither callback nor data and await entered event
   */
  exports.enter5 = function(test) {
    var clientRealtime;
    var isDone = false, done = function() {
      if(!isDone) {
        isDone = true;
        setTimeout(function() {
          test.done(); clientRealtime.close();
        }, 3000);
      }
    };
    try {
      var transport = 'web_socket';

      test.expect(1);
      /* listen for the enter event, test is complete when received */
      var presenceHandler = function() {
        if(this.event == 'enter') {
          test.ok(true, 'Presence event received');
          done();
          presenceChannel.presence.off(presenceHandler);
        }
      };
      presenceChannel.presence.on(presenceHandler);

      /* set up authenticated connection */
      clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken, transports: [transport] });
      clientRealtime.connection.on('connected', function() {
        /* get channel, attach, and enter */
        var clientChannel = clientRealtime.channels.get('presence0');
        clientChannel.attach(function(err) {
          if(err) {
            test.ok(false, 'Attach failed with error: ' + err);
            done();
            return;
          }
          clientChannel.presence.enter();
        });
      });
      var exitOnState = function(state) {
        clientRealtime.connection.on(state, function () {
          test.ok(false, transport + ' connection to server failed');
          done();
        });
      };
      exitOnState('failed');
      exitOnState('suspended');
    } catch(e) {
      test.ok(false, 'presence.enter5 failed with exception: ' + e.stack);
      done();
    }
  };

  /*
   * Attach to channel, enter presence channel with data but no callback and await entered event
   */
  exports.enter6 = function(test) {
    var clientRealtime;
    var isDone = false, done = function() {
      if(!isDone) {
        isDone = true;
        setTimeout(function() {
          test.done(); clientRealtime.close();
        }, 3000);
      }
    };
    try {
      var transport = 'web_socket';

      test.expect(1);
      /* listen for the enter event, test is complete when received */
      var presenceHandler = function() {
        if(this.event == 'enter') {
          test.ok(true, 'Presence event received');
          done();
          presenceChannel.presence.off(presenceHandler);
        }
      };
      presenceChannel.presence.on(presenceHandler);

      /* set up authenticated connection */
      clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken, transports: [transport] });
      clientRealtime.connection.on('connected', function() {
        /* get channel, attach, and enter */
        var clientChannel = clientRealtime.channels.get('presence0');
        clientChannel.attach(function(err) {
          if(err) {
            test.ok(false, 'Attach failed with error: ' + err);
            done();
            return;
          }
          clientChannel.presence.enter('Test client data (enter6)');
        });
      });
      var exitOnState = function(state) {
        clientRealtime.connection.on(state, function () {
          test.ok(false, transport + ' connection to server failed');
          done();
        });
      };
      exitOnState('failed');
      exitOnState('suspended');
    } catch(e) {
      test.ok(false, 'presence.enter6 failed with exception: ' + e.stack);
      done();
    }
  };

  /*
   * Attach to channel, enter+leave presence channel and await leave event
   */
  exports.leave0 = function(test) {
    var clientRealtime;
    var isDone = false, done = function() {
      if(!isDone) {
        isDone = true;
        setTimeout(function() {
          test.done(); clientRealtime.close();
        }, 3000);
      }
    };
    try {
      test.expect(4);
      /* listen for the enter event, test is complete when received */
      var presenceHandler = function(presenceMessage) {
        //console.log('Event received on presence channel: event = ' + this.event + ', clientId = ' + presenceMessage.clientId + ', clientData = ' + presenceMessage.clientData);
        if(this.event == 'leave') {
          test.ok(true, 'Leave event received');
          test.equal(presenceMessage.clientId, testClientId, 'Presence event received with clientId');
          done();
          presenceChannel.presence.off(presenceHandler);
        }
      };
      presenceChannel.presence.on(presenceHandler);

      /* set up authenticated connection */
      var transport = 'web_socket';
      clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken, transports: [transport] });
      clientRealtime.connection.on('connected', function() {
        /* get channel, attach, and enter */
        var clientChannel = clientRealtime.channels.get('presence0');
        clientChannel.attach(function(err) {
          if(err) {
            test.ok(false, 'Attach failed with error: ' + err);
            done();
            return;
          }
          clientChannel.presence.enter('Test client data (leave0)', function(err) {
            if(err) {
              test.ok(false, 'Enter failed with error: ' + err);
              done();
              return;
            }
            test.ok(true, 'Presence event sent');
          });
          clientChannel.presence.leave(function(err) {
            if(err) {
              test.ok(false, 'Leave failed with error: ' + err);
              done();
              return;
            }
            test.ok(true, 'Presence event sent');
          });
        });
      });
      var exitOnState = function(state) {
        clientRealtime.connection.on(state, function () {
          test.ok(false, transport + ' connection to server failed');
          done();
        });
      };
      exitOnState('failed');
      exitOnState('suspended');
    } catch(e) {
      test.ok(false, 'presence.leave0 failed with exception: ' + e.stack);
      done();
    }
  };

  /*
   * Attach to channel, enter presence channel and get presence
   */
  exports.get0 = function(test) {
    var clientRealtime;
    var isDone = false, done = function() {
      if(!isDone) {
        isDone = true;
        setTimeout(function() {
          test.done(); clientRealtime.close();
        }, 3000);
      }
    };
    try {
      test.expect(2);
      /* listen for the enter event, test is complete when received */
      var presenceHandler = function() {
        presenceChannel.presence.get(function(err, presenceMembers) {
          if(err) {
            test.ok(false, 'Presence get() failed with error: ' + err);
            done();
            return;
          }
          var testClientPresent = false;
          if(presenceMembers)
            for(var i = 0; i < presenceMembers.length; i++)
              if(presenceMembers[i].clientId == testClientId)
                testClientPresent = true;
          test.ok(testClientPresent, 'Expected test client in set of members');
          done();
          presenceChannel.presence.off(presenceHandler);
        });
      };
      presenceChannel.presence.on(presenceHandler);

      /* set up authenticated connection */
      var transport = 'web_socket';
      clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken, transports: [transport] });
      clientRealtime.connection.on('connected', function() {
        /* get channel, attach, and enter */
        var clientChannel = clientRealtime.channels.get('presence0');
        clientChannel.attach(function(err) {
          if(err) {
            test.ok(false, 'Attach failed with error: ' + err);
            done();
            return;
          }
          clientChannel.presence.enter('Test client data (get0)', function(err) {
            if(err) {
              test.ok(false, 'Enter failed with error: ' + err);
              done();
              return;
            }
            test.ok(true, 'Presence event sent');
          });
        });
      });
      var exitOnState = function(state) {
        clientRealtime.connection.on(state, function () {
          test.ok(false, transport + ' connection to server failed');
          done();
        });
      };
      exitOnState('failed');
      exitOnState('suspended');
    } catch(e) {
      test.ok(false, 'presence.get0 failed with exception: ' + e.stack);
      done();
    }
  };

  /*
   * Attach to channel, enter+leave presence channel and get presence
   */
  exports.get1 = function(test) {
    var clientRealtime;
    var isDone = false, done = function() {
      if(!isDone) {
        isDone = true;
        setTimeout(function() {
          test.done(); clientRealtime.close();
        }, 3000);
      }
    };
    try {
      test.expect(3);
      /* listen for the enter event, test is complete when received */
      var testClientData = 'Test client data (get1)';
      var presenceHandler = function() {
        if(this.event == 'leave') {
          presenceChannel.presence.get(function(err, presenceMembers) {
            if(err) {
              test.ok(false, 'Presence get() failed with error: ' + err);
              done();
              return;
            }
            //console.log(require('util').inspect(presenceMembers));
            var testClientPresent = false;
            if(presenceMembers) {
              for(var i = 0; i < presenceMembers.length; i++)
                if(presenceMembers[i].clientId == testClientId && presenceMembers[i].clientData == testClientData)
                  testClientPresent = true;
            }
            test.ok(!testClientPresent, 'Expected test client to be absent from set of members');
            done();
            presenceChannel.presence.off(presenceHandler);

          });
        }
      };
      presenceChannel.presence.on(presenceHandler);

      /* set up authenticated connection */
      var transport = 'web_socket';
      clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken, transports: [transport] });
      clientRealtime.connection.on('connected', function() {
        /* get channel, attach, and enter */
        var clientChannel = clientRealtime.channels.get('presence0');
        clientChannel.attach(function(err) {
          if(err) {
            test.ok(false, 'Attach failed with error: ' + err);
            done();
            return;
          }
          clientChannel.presence.enter(testClientData, function(err) {
            if(err) {
              test.ok(false, 'Enter failed with error: ' + err);
              done();
              return;
            }
            test.ok(true, 'Presence enter event sent');
            clientChannel.presence.leave(function(err) {
              if(err) {
                test.ok(false, 'Enter failed with error: ' + err);
                done();
                return;
              }
              test.ok(true, 'Presence leave event sent');
            });
          });
        });
      });
      var exitOnState = function(state) {
        clientRealtime.connection.on(state, function () {
          test.ok(false, transport + ' connection to server failed');
          done();
        });
      };
      exitOnState('failed');
      exitOnState('suspended');
    } catch(e) {
      test.ok(false, 'presence.get1 failed with exception: ' + e.stack);
      done();
    }
  };

  /*
   * Attach to channel, enter presence channel, then initiate second
   * connection, seeing existing member in message subsequent to second attach response
   */
  exports.attach0 = function(test) {
    var clientRealtime1, clientRealtime2;
    var isDone = false, done = function() {
      if(!isDone) {
        isDone = true;
        setTimeout(function() {
          test.done(); clientRealtime1.close(); clientRealtime2.close();
        }, 3000);
      }
    };
    try {
      test.expect(3);
      /* set up authenticated connection */
      var transport = 'web_socket';
      clientRealtime1 = helper.AblyRealtime({ clientId: testClientId, authToken: authToken, transports: [transport] });
      clientRealtime1.connection.on('connected', function() {
        /* get channel, attach, and enter */
        var clientChannel1 = clientRealtime1.channels.get('presence1');
        clientChannel1.attach(function(err) {
          if(err) {
            test.ok(false, 'Attach failed with error: ' + err);
            done();
            return;
          }
          clientChannel1.presence.enter('Test client data (attach0)', function(err) {
            if(err) {
              test.ok(false, 'Enter failed with error: ' + err);
              done();
              return;
            }
            test.ok(true, 'Presence event sent');
            clientChannel1.presence.get(function(err, presenceMembers1) {
              if(err) {
                test.ok(false, 'Presence get() failed with error: ' + err);
                done();
                return;
              }
              test.equal(presenceMembers1.length, 1, 'Member present');
              /* now set up second connection and attach */
              /* set up authenticated connection */
              clientRealtime2 = helper.AblyRealtime({ clientId: testClientId2, authToken: authToken2, transports: [transport] });
              clientRealtime2.connection.on('connected', function() {
                /* get channel, attach */
                var clientChannel2 = clientRealtime2.channels.get('presence1');
                clientChannel2.attach(function(err) {
                  if(err) {
                    test.ok(false, 'Attach failed with error: ' + err);
                    done();
                    return;
                  }
                  clientChannel2.presence.on('present', function() {
                    /* get the channel members and verify testclient is there */
                    clientChannel2.presence.get(function(err, presenceMembers2) {
                      if(err) {
                        test.ok(false, 'Presence get() failed with error: ' + err);
                        done();
                        return;
                      }
                      test.deepEqual(presenceMembers1, presenceMembers2, 'Verify member presence is indicated after attach');
                      done();
                    });
                  });
                });
              });
              var exitOnState = function(state) {
                clientRealtime2.connection.on(state, function () {
                  test.ok(false, transport + ' connection to server failed');
                  done();
                });
              };
              exitOnState('failed');
              exitOnState('suspended');

            });
          });
        });
      });
      var exitOnState = function(state) {
        clientRealtime1.connection.on(state, function () {
          test.ok(false, transport + ' connection to server failed');
          done();
        });
      };
      exitOnState('failed');
      exitOnState('suspended');
    } catch(e) {
      test.ok(false, 'presence.attach0 failed with exception: ' + e.stack);
      done();
    }
  };

  /*
   * Attach and enter channel on two connections, seeing
   * both members in presence set
   */
  exports.member0 = function(test) {
    var clientRealtime1, clientRealtime2, clientChannel1, clientChannel2;
    var isDone = false, done = function() {
      if(!isDone) {
        isDone = true;
        setTimeout(function() {
          test.done(); clientRealtime1.close(); clientRealtime2.close();
        }, 3000);
      }
    };
    try {
      test.expect(4);
      /* set up authenticated connections */
      async.parallel([
        function(cb1) {
          var transport = 'web_socket';
          clientRealtime1 = helper.AblyRealtime({ clientId: testClientId, authToken: authToken, transports: [transport] });
          clientRealtime1.connection.on('connected', function() {
            /* get channel, attach, and enter */
            clientChannel1 = clientRealtime1.channels.get('presence2');
            clientChannel1.attach(function(err) {
              if(err) {
                test.ok(false, 'Attach failed with error: ' + err);
                cb1(err);
                return;
              }
              clientChannel1.presence.enter('Test client data (member0-1)', function(err) {
                if(err) {
                  test.ok(false, 'Enter failed with error: ' + err);
                  cb1(err);
                  return;
                }
                test.ok(true, 'Presence event sent');
                cb1(null);
              });
            });
          });
          var exitOnState = function(state) {
            clientRealtime1.connection.on(state, function (err) {
              test.ok(false, transport + ' connection to server failed');
              cb1(err);
            });
          };
          exitOnState('failed');
          exitOnState('suspended');
        },
        function(cb2) {
          var transport = 'web_socket';
          clientRealtime2 = helper.AblyRealtime({ clientId: testClientId2, authToken: authToken2, transports: [transport] });
          clientRealtime2.connection.on('connected', function() {
            /* get channel, attach */
            clientChannel2 = clientRealtime2.channels.get('presence2');
            clientChannel2.attach(function(err) {
              if(err) {
                test.ok(false, 'Attach failed with error: ' + err);
                cb2(err);
                return;
              }
              clientChannel2.presence.enter('Test client data (member0-2)', function(err) {
                if(err) {
                  test.ok(false, 'Enter failed with error: ' + err);
                  cb2(err);
                  return;
                }
                test.ok(true, 'Presence event sent');
                cb2(null);
              });
            });
          });
          var exitOnState = function(state) {
            clientRealtime2.connection.on(state, function (err) {
              test.ok(false, transport + ' connection to server failed');
              cb2(err);
            });
          };
          exitOnState('failed');
          exitOnState('suspended');
        }
      ], function() {
        clientChannel2.presence.get(function(err, members) {
          if(err) {
            test.ok(false, 'Presence.get() failed with error: ' + err);
            test.done();
            return;
          }
          test.equal(members.length, 2, 'Verify both members present');
          test.notEqual(members[0].connectionId, members[1].connectionId, 'Verify members have distinct connectionIds');
          done();
        });
      });
    } catch(e) {
      test.ok(false, 'presence.member0 failed with exception: ' + e.stack);
      done();
    }
  };

  /*
   * Attach to channel, enter presence channel, disconnect and await leave event
   */
  exports.connection0 = function(test) {
    var clientRealtime;
    var isDone = false, done = function() {
      if(!isDone) {
        isDone = true;
        setTimeout(function() {
          test.done(); clientRealtime.close();
        }, 3000);
      }
    };
    try {
      test.expect(3);
      /* listen for the enter event, test is complete when received */
      var presenceHandler = function(presenceMessage) {
        //console.log('Event received on presence channel: event = ' + this.event + ', clientId = ' + presenceMessage.clientId + ', clientData = ' + presenceMessage.clientData);
        if(this.event == 'leave') {
          test.ok(true, 'Leave event received');
          test.equal(presenceMessage.clientId, testClientId, 'Presence event received with clientId');
          done();
          presenceChannel.presence.off(presenceHandler);
        }
      };
      presenceChannel.presence.on(presenceHandler);

      /* set up authenticated connection */
      var transport = 'web_socket';
      clientRealtime = helper.AblyRealtime({ clientId: testClientId, authToken: authToken, transports: [transport] });
      clientRealtime.connection.on('connected', function() {
        /* get channel, attach, and enter */
        var clientChannel = clientRealtime.channels.get('presence0');
        clientChannel.attach(function(err) {
          if(err) {
            test.ok(false, 'Attach failed with error: ' + err);
            done();
            return;
          }
          clientChannel.presence.enter('Test client data (connection0)', function(err) {
            if(err) {
              test.ok(false, 'Enter failed with error: ' + err);
              done();
              return;
            }
            test.ok(true, 'Presence event sent');
            setTimeout(function() {
              /* once enter event is confirmed as having been
               * delivered, close the connection */
                          clientRealtime.close();
            }, 1000);
          });
        });
      });
      var exitOnState = function(state) {
        clientRealtime.connection.on(state, function () {
          test.ok(false, transport + ' connection to server failed');
          done();
        });
      };
      exitOnState('failed');
      exitOnState('suspended');
    } catch(e) {
      console.log('presence.leave0 failed with exception: ' + e.stack);
      test.ok(false, 'presence.leave0 failed with exception: ' + e.stack);
      done();
    }
  };

  exports.clear99 = function(test) {
    /* delay before closing, to allow final tests to see events on connections */
    setTimeout(function() {
      realtime.close();
      test.expect(1);
      test.ok(true, 'Closed listener connection');
      test.done();
    }, 3000);
  };

  return module.exports = helper.withTimeout(exports);
});
