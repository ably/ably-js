'use strict';

define(['shared_helper', 'chai'], function (Helper, chai) {
  const { assert } = chai;
  describe('realtime/annotations', function () {
    this.timeout(10 * 1000);

    before(function (done) {
      const helper = Helper.forHook(this);
      helper.setupApp(function (err) {
        if (err) {
          done(err);
          return;
        }
        rest = helper.AblyRest();
        done();
      });
    });

    it('', () => {
      // TODO
      // const helper = this.test.helper;
      // const realtime = helper.AblyRealtime();
      // const channel = realtime.channels.get('channel-with-options', { modes: ['PRESENCE'] });
      // channel.attach();
      // Helper.whenPromiseSettles(channel.whenState('attaching'), function () {
      //   try {
      //     realtime.channels.get('channel-with-options', { modes: ['PRESENCE'] });
      //     helper.closeAndFinish(done, realtime);
      //   } catch (err) {
      //     helper.closeAndFinish(done, realtime, err);
      //   }
      // });
      // assert.isFalse(presenceMap.remove(incoming));
    });
  });
});
