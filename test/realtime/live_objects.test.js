'use strict';

define(['ably', 'shared_helper', 'async', 'chai', 'live_objects'], function (
  Ably,
  Helper,
  async,
  chai,
  LiveObjectsPlugin,
) {
  var expect = chai.expect;
  var createPM = Ably.makeProtocolMessageFromDeserialized({ LiveObjectsPlugin });

  function LiveObjectsRealtime(helper, options) {
    return helper.AblyRealtime({ ...options, plugins: { LiveObjects: LiveObjectsPlugin } });
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

      describe('LiveObjects instance', () => {
        /** @nospec */
        it('getRoot() returns LiveMap instance', async function () {
          const helper = this.test.helper;
          const client = LiveObjectsRealtime(helper);

          await helper.monitorConnectionThenCloseAndFinish(async () => {
            const channel = client.channels.get('channel');
            const liveObjects = channel.liveObjects;
            await channel.attach();
            const root = await liveObjects.getRoot();

            expect(root.constructor.name).to.equal('LiveMap');
          }, client);
        });

        /** @nospec */
        it('getRoot() returns live object with id "root"', async function () {
          const helper = this.test.helper;
          const client = LiveObjectsRealtime(helper);

          await helper.monitorConnectionThenCloseAndFinish(async () => {
            const channel = client.channels.get('channel');
            const liveObjects = channel.liveObjects;
            await channel.attach();
            const root = await liveObjects.getRoot();

            helper.recordPrivateApi('call.LiveObject.getObjectId');
            expect(root.getObjectId()).to.equal('root');
          }, client);
        });
      });
    });
  });
});
