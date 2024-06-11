'use strict';

define(['shared_helper', 'chai'], function (Helper, chai) {
  var expect = chai.expect;

  describe('realtime/event_emitter', function () {
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

    /*
     * Check all eight events associated with connecting, attaching to a
     * channel, detaching, and disconnecting are received once each
     */
    it('attachdetach0', function (done) {
      const helper = this.helper;
      try {
        var realtime = helper.AblyRealtime(),
          index,
          expectedConnectionEvents = ['connecting', 'connected', 'closing', 'closed'],
          expectedChannelEvents = ['attaching', 'attached', 'detaching', 'detached'];
        realtime.connection.on(function () {
          if ((index = expectedConnectionEvents.indexOf(this.event)) > -1) {
            delete expectedConnectionEvents[index];
            if (this.event == 'closed') {
              done();
            }
          } else {
            done(new Error('Unexpected ' + this.event + ' event received'));
          }
        });
        realtime.connection.on('connected', function () {
          var channel = realtime.channels.get('channel');
          channel.on(function () {
            if ((index = expectedChannelEvents.indexOf(this.event)) > -1) {
              delete expectedChannelEvents[index];
              switch (this.event) {
                case 'detached':
                  realtime.close();
                  break;
                case 'attached':
                  channel.detach();
                  break;
                default:
                  break;
              }
            } else {
              done(new Error('Unexpected ' + this.event + ' event received'));
            }
          });
          channel.attach(function (err) {
            if (err) {
              helper.closeAndFinish(done, realtime, err);
            }
          });
        });
        helper.monitorConnection(done, realtime);
      } catch (err) {
        helper.closeAndFinish(done, realtime, err);
      }
    });

    it('emitCallsAllCallbacksIgnoringExceptions', function (done) {
      var helper = this.helper,
        realtime = helper.AblyRealtime({ autoConnect: false }),
        callbackCalled = false,
        eventEmitter = realtime.connection;

      eventEmitter.on('custom', function () {
        throw 'Expected failure 1';
      });
      eventEmitter.on('custom', function () {
        throw 'Expected failure 2';
      });
      eventEmitter.on('custom', function () {
        callbackCalled = true;
      });

      eventEmitter.emit('custom');
      try {
        expect(callbackCalled, 'Last callback should have been called').to.be.ok;
      } catch (err) {
        helper.closeAndFinish(done, realtime, err);
        return;
      }
      helper.closeAndFinish(done, realtime);
    });

    it('onceCalledOnlyOnce', function (done) {
      var helper = this.helper,
        realtime = helper.AblyRealtime({ autoConnect: false }),
        onCallbackCalled = 0,
        onceCallbackCalled = 0,
        eventEmitter = realtime.connection;

      eventEmitter.once('custom', function () {
        onceCallbackCalled += 1;
      });
      eventEmitter.on('custom', function () {
        onCallbackCalled += 1;
      });

      eventEmitter.emit('custom');
      eventEmitter.emit('custom');
      eventEmitter.emit('custom');

      try {
        expect(onCallbackCalled).to.equal(3, 'On callback called every time');
        expect(onceCallbackCalled).to.equal(1, 'Once callback called once');
      } catch (err) {
        helper.closeAndFinish(done, realtime, err);
        return;
      }

      helper.closeAndFinish(done, realtime);
    });

    it('onceCallbackDoesNotImpactOnCallback', function (done) {
      var helper = this.helper,
        realtime = helper.AblyRealtime({ autoConnect: false }),
        callbackCalled = 0,
        eventEmitter = realtime.connection;

      var callback = function () {
        callbackCalled += 1;
      };

      eventEmitter.on('custom', callback);
      eventEmitter.once('custom', callback);
      eventEmitter.once('custom', callback);

      eventEmitter.emit('custom');
      eventEmitter.emit('custom');

      try {
        expect(callbackCalled).to.equal(4, 'On callback called both times but once callbacks only called once');
      } catch (err) {
        helper.closeAndFinish(done, realtime, err);
        return;
      }

      helper.closeAndFinish(done, realtime);
    });

    it('offRemovesAllMatchingListeners', function (done) {
      var helper = this.helper,
        realtime = helper.AblyRealtime({ autoConnect: false }),
        callbackCalled = 0,
        eventEmitter = realtime.connection;

      var callback = function () {
        callbackCalled += 1;
      };

      try {
        eventEmitter.once('custom', callback);
        eventEmitter.on('custom', callback);
        eventEmitter.on('custom', callback);

        eventEmitter.emit('custom');
        expect(callbackCalled).to.equal(3, 'The same callback should have been called for every registration');

        callbackCalled = 0;
        eventEmitter.off(callback);
        eventEmitter.emit('custom');
        expect(callbackCalled).to.equal(0, 'All callbacks should have been removed');
      } catch (err) {
        helper.closeAndFinish(done, realtime, err);
        return;
      }

      helper.closeAndFinish(done, realtime);
    });

    it('offRemovesAllListeners', function (done) {
      var helper = this.helper,
        realtime = helper.AblyRealtime({ autoConnect: false }),
        callbackCalled = 0,
        eventEmitter = realtime.connection;

      var callback = function () {
        callbackCalled += 1;
      };

      try {
        eventEmitter.once('custom', callback);
        eventEmitter.on('custom', callback);
        eventEmitter.on('custom', callback);

        eventEmitter.emit('custom');
        expect(callbackCalled).to.equal(3, 'The same callback should have been called for every registration');

        callbackCalled = 0;
        eventEmitter.off();
        eventEmitter.emit('custom');
        expect(callbackCalled).to.equal(0, 'All callbacks should have been removed');
      } catch (err) {
        helper.closeAndFinish(done, realtime, err);
        return;
      }

      helper.closeAndFinish(done, realtime);
    });

    it('offRemovesAllMatchingEventListeners', function (done) {
      var helper = this.helper,
        realtime = helper.AblyRealtime({ autoConnect: false }),
        callbackCalled = 0,
        eventEmitter = realtime.connection;

      var callback = function () {
        callbackCalled += 1;
      };

      try {
        eventEmitter.once('custom', callback);
        eventEmitter.on('custom', callback);
        eventEmitter.on('custom', callback);

        eventEmitter.emit('custom');
        expect(callbackCalled).to.equal(3, 'The same callback should have been called for every registration');

        callbackCalled = 0;
        eventEmitter.off('custom', callback);
        eventEmitter.emit('custom');
        expect(callbackCalled).to.equal(0, 'All callbacks should have been removed');
      } catch (err) {
        helper.closeAndFinish(done, realtime, err);
        return;
      }

      helper.closeAndFinish(done, realtime);
    });

    it('offRemovesAllMatchingEvents', function (done) {
      var helper = this.helper,
        realtime = helper.AblyRealtime({ autoConnect: false }),
        callbackCalled = 0,
        eventEmitter = realtime.connection;

      var callback = function () {
        callbackCalled += 1;
      };

      try {
        eventEmitter.once('custom', callback);
        eventEmitter.on('custom', callback);
        eventEmitter.on('custom', callback);

        eventEmitter.emit('custom');
        expect(callbackCalled).to.equal(3, 'The same callback should have been called for every registration');

        callbackCalled = 0;
        eventEmitter.off('custom');
        eventEmitter.emit('custom');
        expect(callbackCalled).to.equal(0, 'All callbacks should have been removed');
      } catch (err) {
        helper.closeAndFinish(done, realtime, err);
        return;
      }

      helper.closeAndFinish(done, realtime);
    });

    /**
     * Ensures that when a listener is removed and there
     * are no more listeners for that event name,
     * the key is removed entirely from listeners to avoid the
     * listener object growing with unnecessary empty arrays
     * for each previously registered event name
     */
    it('offRemovesEmptyEventNameListeners', function (done) {
      var helper = this.helper,
        realtime = helper.AblyRealtime({ autoConnect: false }),
        eventEmitter = realtime.connection;

      var callback = function () {};

      try {
        eventEmitter.once('custom', callback);
        eventEmitter.on('custom', callback);
        expect('custom' in eventEmitter.events, 'custom event array exists').to.be.ok;

        eventEmitter.off('custom', callback);
        expect(!('custom' in eventEmitter.events), 'custom event listener array is removed from object').to.be.ok;

        eventEmitter.once('custom', callback);
        eventEmitter.on('custom', callback);
        expect('custom' in eventEmitter.events, 'custom event array exists').to.be.ok;

        eventEmitter.off(callback);
        expect(!('custom' in eventEmitter.events), 'event listener array is removed from object').to.be.ok;
      } catch (err) {
        helper.closeAndFinish(done, realtime, err);
        return;
      }

      helper.closeAndFinish(done, realtime);
    });

    it('arrayOfEvents', function (done) {
      var helper = this.helper,
        realtime = helper.AblyRealtime({ autoConnect: false }),
        callbackCalled = 0,
        eventEmitter = realtime.connection;

      var callback = function () {
        callbackCalled += 1;
      };

      try {
        callbackCalled = 0;
        eventEmitter.on(['a', 'b', 'c'], callback);
        eventEmitter.emit('a');
        eventEmitter.emit('b');
        eventEmitter.emit('c');
        expect(callbackCalled).to.equal(3, 'listener listens to all events in array');

        eventEmitter.off(['a', 'b', 'c'], callback);
        eventEmitter.emit('a');
        eventEmitter.emit('b');
        eventEmitter.emit('c');
        expect(callbackCalled).to.equal(3, 'All callbacks should have been removed');

        callbackCalled = 0;
        eventEmitter.on(['a', 'b', 'c'], callback);
        eventEmitter.off('a', callback);
        eventEmitter.emit('a');
        expect(callbackCalled).to.equal(0, 'callback ‘a’ should have been removed');
        eventEmitter.emit('b');
        eventEmitter.emit('c');
        expect(callbackCalled).to.equal(2, 'callbacks b and c should not have been removed');
      } catch (err) {
        helper.closeAndFinish(done, realtime, err);
        return;
      }

      helper.closeAndFinish(done, realtime);
    });

    it('arrayOfEventsWithOnce', function (done) {
      var helper = this.helper,
        realtime = helper.AblyRealtime({ autoConnect: false }),
        callbackCalled = 0,
        eventEmitter = realtime.connection;

      var callback = function (arg) {
        callbackCalled += 1;
        expect(arg).to.equal('expected');
      };

      try {
        callbackCalled = 0;
        eventEmitter.once(['a', 'b', 'c'], callback);
        eventEmitter.emit('a', 'expected');
        eventEmitter.emit('b', 'wrong');
        eventEmitter.emit('c', 'wrong');
        expect(callbackCalled).to.equal(1, 'listener called back only once, for the first event emitted');
      } catch (err) {
        helper.closeAndFinish(done, realtime, err);
        return;
      }

      helper.closeAndFinish(done, realtime);
    });

    /* check that listeners added in a listener cb are not called during that
     * emit instance */
    it('listenerAddedInListenerCb', function (done) {
      var helper = this.helper,
        realtime = helper.AblyRealtime({ autoConnect: false }),
        eventEmitter = realtime.connection,
        firstCbCalled = false,
        secondCbCalled = false;

      eventEmitter.on('a', function () {
        firstCbCalled = true;
        eventEmitter.on('a', function () {
          secondCbCalled = true;
        });
      });
      eventEmitter.emit('a');

      try {
        expect(firstCbCalled, 'check first callback called').to.be.ok;
        expect(!secondCbCalled, 'check second callback not called').to.be.ok;
      } catch (err) {
        helper.closeAndFinish(done, realtime, err);
        return;
      }

      helper.closeAndFinish(done, realtime);
    });

    /* check that listeners removed in a listener cb are still called in that
     * emit instance (but only once) */
    it('listenerRemovedInListenerCb', function (done) {
      var helper = this.helper,
        realtime = helper.AblyRealtime({ autoConnect: false }),
        eventEmitter = realtime.connection,
        onCbCalledTimes = 0,
        onceCbCalledTimes = 0,
        anyCbCalledTimes = 0,
        anyOnceCbCalledTimes = 0;

      eventEmitter.on('a', function () {
        onCbCalledTimes++;
        eventEmitter.off('a');
      });

      eventEmitter.once('a', function () {
        onceCbCalledTimes++;
        eventEmitter.off('a');
      });

      eventEmitter.on(function () {
        anyCbCalledTimes++;
        eventEmitter.off();
      });

      eventEmitter.once(function () {
        anyOnceCbCalledTimes++;
        eventEmitter.off();
      });

      eventEmitter.emit('a');

      try {
        expect(onCbCalledTimes).to.equal(1, 'check on callback called exactly once');
        expect(onceCbCalledTimes).to.equal(1, 'check once callback called exactly once');
        expect(anyCbCalledTimes).to.equal(1, 'check any callback called exactly once');
        expect(anyOnceCbCalledTimes).to.equal(1, 'check anyOnce callback called exactly once');
      } catch (err) {
        helper.closeAndFinish(done, realtime, err);
        return;
      }

      helper.closeAndFinish(done, realtime);
    });

    describe('event_emitter_promise', function () {
      it('whenState', function (done) {
        const helper = this.helper;
        var realtime = helper.AblyRealtime();
        var eventEmitter = realtime.connection;

        eventEmitter
          .whenState('connected')
          .then(function () {
            helper.closeAndFinish(done, realtime);
          })
          ['catch'](function (err) {
            helper.closeAndFinish(done, realtime, err);
          });
      });

      it('once', function (done) {
        const helper = this.helper;
        var realtime = helper.AblyRealtime();
        var eventEmitter = realtime.connection;

        eventEmitter
          .once('connected')
          .then(function () {
            helper.closeAndFinish(done, realtime);
          })
          ['catch'](function (err) {
            helper.closeAndFinish(done, realtime, err);
          });
      });

      it('anyEventsWithOnce', function (done) {
        var helper = this.helper,
          realtime = helper.AblyRealtime({ autoConnect: false }),
          eventEmitter = realtime.connection;

        const p = eventEmitter.once();
        eventEmitter.emit('b');
        p.then(function () {
          helper.closeAndFinish(done, realtime);
        }).catch(function (err) {
          helper.closeAndFinish(done, realtime, err);
        });
      });

      it('arrayOfEventsWithOnce', function (done) {
        var helper = this.helper,
          realtime = helper.AblyRealtime({ autoConnect: false }),
          eventEmitter = realtime.connection;

        const p = eventEmitter.once(['a', 'b', 'c']);
        eventEmitter.emit('b');
        p.then(function () {
          helper.closeAndFinish(done, realtime);
        }).catch(function (err) {
          helper.closeAndFinish(done, realtime, err);
        });
      });
    });
  });
});
