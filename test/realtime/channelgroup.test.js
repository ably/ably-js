'use strict';

define(['ably', 'shared_helper', 'async', 'chai'], function (Ably, helper, async, chai) {
  var expect = chai.expect;
  var displayError = helper.displayError;
  var utils = helper.Utils;
  let config = Ably.Realtime.Platform.Config;
  var closeAndFinish = helper.closeAndFinish;
  var createPM = Ably.Realtime.ProtocolMessage.fromDeserialized;
  var monitorConnection = helper.monitorConnection;

  describe('realtime/channelgroup', function () {
    this.timeout(60 * 1000);
    before(function (done) {
      helper.setupApp(function (err) {
        if (err) {
          done(err);
        }
        done();
      });
    });

    it('subscribes to active', function (done) {
      try {
        /* set up realtime */
        var realtime = helper.AblyRealtime();

        /* connect and attach */
        realtime.connection.on('connected', function () {
          const channelGroup = realtime.channelGroups.get('.*');

          var testMsg = { active: ['channel1', 'channel2', 'channel3'] };
          var activeChannel = realtime.channels.get('active');
          var dataChannel1 = realtime.channels.get('channel1');
          var dataChannel2 = realtime.channels.get('channel2');

          activeChannel.attach(function (err) {
            if (err) {
              closeAndFinish(done, realtime, err);
              return;
            }

            var events = 1;

            /* subscribe to channel group */
            channelGroup.subscribe((channel, msg) => {
              try {
                expect(msg.data).to.equal('test data ' + events, 'Unexpected msg text received');
                expect(channel).to.equal('channel' + events, 'Unexpected channel name');
              } catch (err) {
                closeAndFinish(done, realtime, err);
                return;
              }

              if (events == 1) {
                dataChannel2.publish('event0', 'test data 2');
                events++;
                return;
              }

              closeAndFinish(done, realtime);
            });

            /* publish active channels */
            activeChannel.publish('event0', testMsg);
            dataChannel1.publish('event0', 'test data 1');
          });
        });
        monitorConnection(done, realtime);
      } catch (err) {
        closeAndFinish(done, realtime, err);
      }
    });

    it('ignores channels not matched on filter', function (done) {
      try {
        /* set up realtime */
        var realtime = helper.AblyRealtime();

        /* connect and attach */
        realtime.connection.on('connected', function () {
          const channelGroup = realtime.channelGroups.get('include:.*');

          var testMsg = { active: ['include:channel1', 'stream3'] };
          var activeChannel = realtime.channels.get('active');
          var dataChannel1 = realtime.channels.get('include:channel1');
          var streamChannel3 = realtime.channels.get('stream3');

          activeChannel.attach(function (err) {
            if (err) {
              closeAndFinish(done, realtime, err);
              return;
            }

            /* subscribe to channel group */
            channelGroup.subscribe((channel, msg) => {
              try {
                expect(msg.data).to.equal('test data 1', 'Unexpected msg text received');
                expect(channel).to.equal('include:channel1', 'Unexpected channel name');
              } catch (err) {
                closeAndFinish(done, realtime, err);
                return;
              }

              closeAndFinish(done, realtime);
            });

            /* publish active channels */
            activeChannel.publish('event0', testMsg);
            streamChannel3.publish('event0', 'should not be subscribed to this message');
            dataChannel1.publish('event0', 'test data 1');
          });
        });
        monitorConnection(done, realtime);
      } catch (err) {
        closeAndFinish(done, realtime, err);
      }
    });

    it('reacts to changing active channels', function (done) {
      try {
        /* set up realtime */
        var realtime = helper.AblyRealtime();

        /* connect and attach */
        realtime.connection.on('connected', function () {
          const channelGroup = realtime.channelGroups.get('group:.*');

          var testMsg = { active: ['group:channel1', 'group:channel2', 'group:channel3'] };
          var activeChannel = realtime.channels.get('active');
          var dataChannel1 = realtime.channels.get('group:channel1');
          var dataChannel2 = realtime.channels.get('group:channel2');
          var dataChannel4 = realtime.channels.get('group:channel4');
          var dataChannel5 = realtime.channels.get('group:channel5');

          activeChannel.attach(function (err) {
            if (err) {
              closeAndFinish(done, realtime, err);
              return;
            }

            var events = 1;

            /* subscribe to channel group */
            channelGroup.subscribe(async (channel, msg) => {
              try {
                expect(msg.data).to.equal('test data ' + events, 'Unexpected msg text received');
                expect(channel).to.equal('group:channel' + events, 'Unexpected channel name');
              } catch (err) {
                closeAndFinish(done, realtime, err);
                return;
              }

              if (events == 1) {
                activeChannel.publish('event0', { active: ['group:channel4', 'group:channel5'] });
                dataChannel4.publish('event0', 'test data 4');
                events = 4;
                return;
              }

              if (events == 4) {
                await dataChannel2.publish('event 0', 'should be ignored test dat');
                await dataChannel5.publish('event0', 'test data 5');
                events++;
                return;
              }

              closeAndFinish(done, realtime);
            });

            /* publish active channels */
            activeChannel.publish('event0', testMsg);
            dataChannel1.publish('event0', 'test data 1');
          });
        });
        monitorConnection(done, realtime);
      } catch (err) {
        closeAndFinish(done, realtime, err);
      }
    });
  });
});
