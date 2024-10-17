'use strict';

define(['ably', 'shared_helper', 'chai', 'live_objects', 'live_objects_helper'], function (
  Ably,
  Helper,
  chai,
  LiveObjectsPlugin,
  LiveObjectsHelper,
) {
  const expect = chai.expect;
  const createPM = Ably.makeProtocolMessageFromDeserialized({ LiveObjectsPlugin });
  const liveObjectsFixturesChannel = 'liveobjects_fixtures';
  const nextTick = Ably.Realtime.Platform.Config.nextTick;

  function RealtimeWithLiveObjects(helper, options) {
    return helper.AblyRealtime({ ...options, plugins: { LiveObjects: LiveObjectsPlugin } });
  }

  function channelOptionsWithLiveObjects(options) {
    return {
      ...options,
      modes: ['STATE_SUBSCRIBE', 'STATE_PUBLISH'],
    };
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

        LiveObjectsHelper.initForChannel(helper, liveObjectsFixturesChannel)
          .then(done)
          .catch((err) => done(err));
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

      /** @nospec */
      it('doesn’t break when it receives a STATE_SYNC ProtocolMessage', async function () {
        const helper = this.test.helper;
        const testClient = helper.AblyRealtime();

        await helper.monitorConnectionThenCloseAndFinish(async () => {
          const testChannel = testClient.channels.get('channel');
          await testChannel.attach();

          const receivedMessagePromise = new Promise((resolve) => testChannel.subscribe(resolve));

          const publishClient = helper.AblyRealtime();

          await helper.monitorConnectionThenCloseAndFinish(async () => {
            // inject STATE_SYNC message that should be ignored and not break anything without LiveObjects plugin
            helper.recordPrivateApi('call.channel.processMessage');
            helper.recordPrivateApi('call.makeProtocolMessageFromDeserialized');
            await testChannel.processMessage(
              createPM({
                action: 20,
                channel: 'channel',
                channelSerial: 'serial:',
                state: [
                  {
                    object: {
                      objectId: 'root',
                      regionalTimeserial: '@0-0',
                      map: {},
                    },
                  },
                ],
              }),
            );

            const publishChannel = publishClient.channels.get('channel');
            await publishChannel.publish(null, 'test');

            // regular message subscriptions should still work after processing STATE_SYNC message without LiveObjects plugin
            await receivedMessagePromise;
          }, publishClient);
        }, testClient);
      });
    });

    describe('Realtime with LiveObjects plugin', () => {
      /** @nospec */
      it("returns LiveObjects class instance when accessing channel's `liveObjects` property", async function () {
        const helper = this.test.helper;
        const client = RealtimeWithLiveObjects(helper, { autoConnect: false });
        const channel = client.channels.get('channel');
        expect(channel.liveObjects.constructor.name).to.equal('LiveObjects');
      });

      /** @nospec */
      it('getRoot() returns empty root when no state exist on a channel', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithLiveObjects(helper);

        await helper.monitorConnectionThenCloseAndFinish(async () => {
          const channel = client.channels.get('channel', channelOptionsWithLiveObjects());
          const liveObjects = channel.liveObjects;

          await channel.attach();
          const root = await liveObjects.getRoot();

          expect(root.size()).to.equal(0, 'Check root has no keys');
        }, client);
      });

      /** @nospec */
      it('getRoot() returns LiveMap instance', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithLiveObjects(helper);

        await helper.monitorConnectionThenCloseAndFinish(async () => {
          const channel = client.channels.get('channel', channelOptionsWithLiveObjects());
          const liveObjects = channel.liveObjects;

          await channel.attach();
          const root = await liveObjects.getRoot();

          expect(root.constructor.name).to.equal('LiveMap');
        }, client);
      });

      /** @nospec */
      it('getRoot() returns live object with id "root"', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithLiveObjects(helper);

        await helper.monitorConnectionThenCloseAndFinish(async () => {
          const channel = client.channels.get('channel', channelOptionsWithLiveObjects());
          const liveObjects = channel.liveObjects;

          await channel.attach();
          const root = await liveObjects.getRoot();

          helper.recordPrivateApi('call.LiveObject.getObjectId');
          expect(root.getObjectId()).to.equal('root');
        }, client);
      });

      /** @nospec */
      it('getRoot() resolves immediately when STATE_SYNC sequence is completed', async function () {
        const helper = this.test.helper;
        const client = RealtimeWithLiveObjects(helper);

        await helper.monitorConnectionThenCloseAndFinish(async () => {
          const channel = client.channels.get('channel', channelOptionsWithLiveObjects());
          const liveObjects = channel.liveObjects;

          await channel.attach();
          // wait for STATE_SYNC sequence to complete by accessing root for the first time
          await liveObjects.getRoot();

          let resolvedImmediately = false;
          liveObjects.getRoot().then(() => {
            resolvedImmediately = true;
          });

          // wait for next tick for getRoot() handler to process
          helper.recordPrivateApi('call.Platform.nextTick');
          await new Promise((res) => nextTick(res));

          expect(resolvedImmediately, 'Check getRoot() is resolved on next tick').to.be.true;
        }, client);
      });
    });
  });
});
