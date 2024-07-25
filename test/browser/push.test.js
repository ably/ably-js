'use strict';

define(['ably', 'shared_helper', 'chai', 'push'], function (Ably, Helper, chai, PushPlugin) {
  const expect = chai.expect;
  const swUrl = '/push_sw.js';
  let rest;

  const persistKeys = {
    deviceId: 'ably.push.deviceId',
    deviceSecret: 'ably.push.deviceSecret',
    deviceIdentityToken: 'ably.push.deviceIdentityToken',
    pushRecipient: 'ably.push.pushRecipient',
    activationState: 'ably.push.activationState',
  };

  const messageChannel = new MessageChannel();

  /**
   * These tests don't work in CI for various reasons (below) but should work when running locally via `npm run test:webserver`, provided
   * that you have enabled notification permissions for the origin serving the test ui.
   *
   * chromium, firefox - don't support push notifications in incognito
   * webkit - doesn't have a way to launch programatically with notification permissions granted
   */
  if (Notification.permission === 'granted') {
    describe('browser/push', function () {
      this.timeout(60 * 1000);

      before(function (done) {
        const helper = Helper.forHook(this);
        helper.setupApp(function () {
          rest = helper.AblyRest({
            pushServiceWorkerUrl: swUrl,
            plugins: { Push: PushPlugin },
          });
          done();
        });
      });

      beforeEach(async function () {
        Object.values(persistKeys).forEach((key) => {
          Ably.Realtime.Platform.Config.push.storage.remove(key);
        });

        const worker = await navigator.serviceWorker.getRegistration(swUrl);

        if (worker) {
          await worker.unregister();
        }
      });

      afterEach(async function () {
        await rest.push.deactivate();
      });

      /** @spec RSH2a */
      it('push_activation_succeeds', async function () {
        await rest.push.activate();
        expect(rest.device.deviceIdentityToken).to.be.ok;
      });

      /** @nospec */
      it('direct_publish_device_id', async function () {
        await rest.push.activate();

        const pushRecipient = {
          deviceId: rest.device.id,
        };

        const pushPayload = {
          notification: { title: 'Test message', body: 'Test message body' },
          data: { foo: 'bar' },
        };

        const sw = await navigator.serviceWorker.getRegistration(swUrl);

        sw.active.postMessage({ type: 'INIT_PORT' }, [messageChannel.port2]);

        const receivedPushPayload = await new Promise((resolve, reject) => {
          messageChannel.port1.onmessage = function (event) {
            resolve(event.data.payload);
          };

          rest.push.admin.publish(pushRecipient, pushPayload).catch(reject);
        });

        expect(receivedPushPayload.data).to.deep.equal(pushPayload.data);
        expect(receivedPushPayload.notification.title).to.equal(pushPayload.notification.title);
        expect(receivedPushPayload.notification.body).to.equal(pushPayload.notification.body);
      });
    });
  }
});
