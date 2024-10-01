'use strict';

define(['ably', 'shared_helper', 'async', 'chai', 'live_objects'], function (
  Ably,
  Helper,
  async,
  chai,
  LiveObjectsPlugin,
) {
  var expect = chai.expect;
  var createPM = Ably.protocolMessageFromDeserialized;

  function LiveObjectsRealtime(helper, options) {
    return helper.AblyRealtime({ ...options, plugins: { LiveObjects: LiveObjectsPlugin } });
  }

  async function monitorConnectionThenCloseAndFinish(helper, action, realtime, states) {
    try {
      await helper.monitorConnectionAsync(action, realtime, states);
    } finally {
      await helper.closeAndFinishAsync(realtime);
    }
  }

  describe('realtime/live_objects', function () {
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

    describe('Realtime without LiveObjects plugin', () => {
      /** @nospec */
      it("throws an error when attempting to access the channel's `liveObjects` property", async function () {
        const helper = this.test.helper;
        const client = helper.AblyRealtime({ autoConnect: false });
        const channel = client.channels.get('channel');
        expect(() => channel.liveObjects).to.throw('LiveObjects plugin not provided');
      });
    });

    describe('Realtime with LiveObjects plugin', () => {
      /** @nospec */
      it("returns LiveObjects instance when accessing channel's `liveObjects` property", async function () {
        const helper = this.test.helper;
        const client = LiveObjectsRealtime(helper, { autoConnect: false });
        const channel = client.channels.get('channel');
        expect(channel.liveObjects.constructor.name).to.equal('LiveObjects');
      });
    });
  });
});
