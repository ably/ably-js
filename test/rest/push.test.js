'use strict';

define(['ably', 'shared_helper', 'async', 'chai', 'test/support/push_channel_transport', 'push'], function (
  Ably,
  helper,
  async,
  chai,
  pushChannelTransport,
  PushPlugin,
) {
  var expect = chai.expect;
  var originalPushConfig = Ably.Realtime.Platform.Config.push;

  function PushRealtime(options) {
    return helper.AblyRealtime({ ...options, plugins: { Push: PushPlugin } });
  }

  function PushRest(options) {
    return helper.AblyRest({ ...options, plugins: { Push: PushPlugin } });
  }

  var testDevice = {
    id: 'testId',
    clientId: 'testClientId',
    deviceSecret: 'secret-testId',
    platform: 'android',
    formFactor: 'phone',
    push: {
      recipient: {
        transportType: 'gcm',
        registrationToken: 'xxxxxxxxxxx',
      },
    },
  };
  var testDevice_withoutSecret = {
    id: 'testId',
    platform: 'android',
    formFactor: 'phone',
    push: {
      recipient: {
        transportType: 'gcm',
        registrationToken: 'xxxxxxxxxxx',
      },
    },
  };

  describe('rest/push', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      Ably.Realtime.Platform.Config.push = pushChannelTransport;
      helper.setupApp(function (err) {
        if (err) {
          done(err);
          return;
        }
        done();
      });
    });

    beforeEach(() => {
      Ably.Realtime.Platform.Config.push.storage.clear();
    });

    after(() => {
      Ably.Realtime.Platform.Config.push = originalPushConfig;
    });

    it('Get subscriptions', async function () {
      var subscribes = [];
      var deletes = [];
      var subsByChannel = {};
      for (var i = 0; i < 5; i++) {
        (function (i) {
          var sub = { channel: 'pushenabled:foo' + ((i % 2) + 1), clientId: 'testClient' + ((i % 3) + 1) };
          if (!subsByChannel[sub.channel]) {
            subsByChannel[sub.channel] = [];
          }
          subsByChannel[sub.channel].push(sub);

          var rest = helper.AblyRest({ clientId: sub.clientId });
          subscribes.push(() => rest.push.admin.channelSubscriptions.save(sub));
          deletes.push(() => rest.push.admin.channelSubscriptions.remove(sub));
        })(i);
      }

      var rest = helper.AblyRest();

      await Promise.all(subscribes.map((sub) => sub()));

      var res1 = await rest.push.admin.channelSubscriptions.list({ channel: 'pushenabled:foo1' });
      var res2 = await rest.push.admin.channelSubscriptions.list({ channel: 'pushenabled:foo2' });

      await Promise.all(deletes.map((del) => del()));

      testIncludesUnordered(untyped(res1.items), untyped(subsByChannel['pushenabled:foo1']));
      testIncludesUnordered(untyped(res2.items), untyped(subsByChannel['pushenabled:foo2']));
    });

    it('Publish', async function () {
      try {
        var realtime = helper.AblyRealtime();

        var channel = realtime.channels.get('pushenabled:foo');
        await channel.attach();

        var pushPayload = {
          notification: { title: 'Test message', body: 'Test message body' },
          data: { foo: 'bar' },
        };

        var baseUri = realtime.baseUri(Ably.Rest.Platform.Defaults.getHost(realtime.options));
        var pushRecipient = {
          transportType: 'ablyChannel',
          channel: 'pushenabled:foo',
          ablyKey: realtime.options.key,
          ablyUrl: baseUri,
        };

        var prom = new Promise(function (resolve, reject) {
          channel.subscribe('__ably_push__', function (msg) {
            expect(receivedPushPayload.data).to.deep.equal(pushPayload.data);
            expect(receivedPushPayload.notification.title).to.deep.equal(pushPayload.notification.title);
            expect(receivedPushPayload.notification.body).to.deep.equal(pushPayload.notification.body);
            resolve();
          });
        });

        await realtime.push.admin.publish(pushRecipient, pushPayload);
        realtime.close();
      } catch (err) {
        realtime.close();
        throw err;
      }
    });

    it('deviceRegistrations save', async function () {
      var rest = helper.AblyRest();

      var saved = await rest.push.admin.deviceRegistrations.save(testDevice);
      var got = await rest.push.admin.deviceRegistrations.get(testDevice.id);
      await rest.push.admin.deviceRegistrations.remove(testDevice.id);

      expect(got.push.state).to.equal('ACTIVE');
      delete got.metadata; // Ignore these properties for testing
      delete got.push.state;
      testIncludesUnordered(untyped(got), testDevice_withoutSecret);
      testIncludesUnordered(untyped(saved), testDevice_withoutSecret);
    });

    it('deviceRegistrations get and list', async function () {
      var registrations = [];
      var deletes = [];
      var devices = [];
      var devices_withoutSecret = [];
      var devicesByClientId = {};
      var numberOfDevices = 5;
      for (var i = 0; i < numberOfDevices; i++) {
        (function (i) {
          var device = {
            id: 'device' + (i + 1),
            deviceSecret: 'secret-device' + (i + 1),
            clientId: 'testClient' + ((i % 2) + 1),
            platform: 'android',
            formFactor: 'phone',
            push: {
              recipient: {
                transportType: 'gcm',
                registrationToken: 'xxxxxxxxxxx',
              },
            },
          };
          var device_withoutSecret = {
            id: 'device' + (i + 1),
            clientId: 'testClient' + ((i % 2) + 1),
            platform: 'android',
            formFactor: 'phone',
            push: {
              recipient: {
                transportType: 'gcm',
                registrationToken: 'xxxxxxxxxxx',
              },
            },
          };
          if (!devicesByClientId[device.clientId]) {
            devicesByClientId[device.clientId] = [];
          }
          devicesByClientId[device.clientId].push(device_withoutSecret);
          devices.push(device);
          devices_withoutSecret.push(device_withoutSecret);

          var rest = helper.AblyRest({ clientId: device.clientId });
          registrations.push(function () {
            return rest.push.admin.deviceRegistrations.save(device);
          });
          deletes.push(function () {
            return rest.push.admin.deviceRegistrations.remove('device' + (i + 1));
          });
        })(i);
      }

      var rest = helper.AblyRest();

      var res0 = await Promise.all(registrations.map((x) => x()));
      var res1 = await rest.push.admin.deviceRegistrations.list(null);
      var res2 = await rest.push.admin.deviceRegistrations.list({ clientId: 'testClient1' });
      var res3 = await rest.push.admin.deviceRegistrations.list({ clientId: 'testClient2' });
      var res4 = await rest.push.admin.deviceRegistrations.get(devices[0].id);

      await Promise.all([
        rest.push.admin.deviceRegistrations.removeWhere({ clientId: 'testClient1' }),
        rest.push.admin.deviceRegistrations.removeWhere({ clientId: 'testClient2' }),
      ]);

      await Promise.all(deletes.map((x) => x()));

      expect(numberOfDevices).to.equal(res0.length);
      testIncludesUnordered(untyped(res1.items), untyped(devices_withoutSecret));
      testIncludesUnordered(untyped(res2.items), untyped(devicesByClientId['testClient1']));
      testIncludesUnordered(untyped(res3.items), untyped(devicesByClientId['testClient2']));
      testIncludesUnordered(untyped(res4), untyped(devices[0]));
    });

    it('deviceRegistrations remove removeWhere', async function () {
      var rest = helper.AblyRest();

      await rest.push.admin.deviceRegistrations.save(testDevice);
      await rest.push.admin.deviceRegistrations.remove(testDevice.id);

      try {
        await rest.push.admin.deviceRegistrations.get(testDevice.id);
        expect.fail('Expected push.admin.deviceRegistrations.get() to throw');
      } catch (err) {
        expect(err.statusCode).to.equal(404, 'Check device reg not found after removal');
      }

      await rest.push.admin.deviceRegistrations.save(testDevice);
      await rest.push.admin.deviceRegistrations.removeWhere({ deviceId: testDevice.id });

      try {
        await rest.push.admin.deviceRegistrations.get(testDevice.id);
        expect.fail('Expected push.admin.deviceRegistrations.get() to throw');
      } catch (err) {
        expect(err.statusCode).to.equal(404, 'Check device reg not found after removal');
      }
    });

    it('channelSubscriptions save', async function () {
      var rest = helper.AblyRest({ clientId: 'testClient' });
      var subscription = { clientId: 'testClient', channel: 'pushenabled:foo' };

      var saved = await rest.push.admin.channelSubscriptions.save(subscription);
      var result = await rest.push.admin.channelSubscriptions.list({ channel: 'pushenabled:foo' });
      var sub = result.items[0];
      await rest.push.admin.channelSubscriptions.remove(subscription);

      expect(subscription.clientId).to.equal(saved.clientId);
      expect(subscription.channel).to.equal(saved.channel);
      expect(subscription.clientId).to.equal(sub.clientId);
      expect(subscription.channel).to.equal(sub.channel);
    });

    it('channelSubscriptions get', async function () {
      var subscribes = [];
      var deletes = [];
      var subsByChannel = {};
      for (var i = 0; i < 5; i++) {
        (function (i) {
          var sub = { channel: 'pushenabled:foo' + ((i % 2) + 1), clientId: 'testClient' + i };
          if (!subsByChannel[sub.channel]) {
            subsByChannel[sub.channel] = [];
          }
          subsByChannel[sub.channel].push(sub);

          var rest = helper.AblyRest();
          subscribes.push(function () {
            return rest.push.admin.channelSubscriptions.save(sub);
          });
          deletes.push(function () {
            return rest.push.admin.channelSubscriptions.remove({ clientId: 'testClient' + i });
          });
        })(i);
      }

      var rest = helper.AblyRest();

      await Promise.all(subscribes.map((x) => x()));

      var res1 = await rest.push.admin.channelSubscriptions.list({ channel: 'pushenabled:foo1' });
      var res2 = await rest.push.admin.channelSubscriptions.list({ channel: 'pushenabled:foo2' });

      await Promise.all(deletes.map((x) => x()));

      testIncludesUnordered(untyped(res1.items), untyped(subsByChannel['pushenabled:foo1']));
      testIncludesUnordered(untyped(res2.items), untyped(subsByChannel['pushenabled:foo2']));
    });

    it('push_channelSubscriptions_remove', async function () {
      var rest = helper.AblyRest({ clientId: 'testClient' });
      var subscription = { clientId: 'testClient', channel: 'pushenabled:foo' };

      await rest.push.admin.channelSubscriptions.save(subscription);
      await rest.push.admin.channelSubscriptions.remove(subscription);
    });

    it('channelSubscriptions listChannels', async function () {
      var subscribes = [];
      var deletes = [];
      for (var i = 0; i < 5; i++) {
        (function (i) {
          var sub = { channel: 'pushenabled:listChannels' + ((i % 2) + 1), clientId: 'testClient' + ((i % 3) + 1) };
          var rest = helper.AblyRest({ clientId: sub.clientId });
          subscribes.push(function (callback) {
            return rest.push.admin.channelSubscriptions.save(sub);
          });
          deletes.push(function () {
            return rest.push.admin.channelSubscriptions.remove(sub);
          });
        })(i);
      }

      var rest = helper.AblyRest();

      await Promise.all(subscribes.map((x) => x()));

      var result = await rest.push.admin.channelSubscriptions.listChannels(null);

      await Promise.all(deletes.map((x) => x()));

      testIncludesUnordered(['pushenabled:listChannels1', 'pushenabled:listChannels2'], result.items);
    });

    describe('push activation', function () {
      /*
       * RSH2a
       */
      it('push_activation_succeeds', async function () {
        const rest = PushRealtime({ pushRecipientChannel: 'my_channel' });
        await rest.push.activate();
        expect(rest.device.deviceIdentityToken).to.be.ok;
      });

      // no spec item
      it('device_push', function (done) {
        const channelName = 'pushenabled:device_push';
        const realtime = PushRealtime({ pushRecipientChannel: channelName });

        const pushPayload = {
          notification: { title: 'Test message', body: 'Test message body' },
          data: { foo: 'bar' },
        };

        const channel = realtime.channels.get(channelName);

        const baseUri = realtime.baseUri(Ably.Rest.Platform.Defaults.getHost(realtime.options));

        const pushRecipient = {
          transportType: 'ablyChannel',
          channel: channelName,
          ablyKey: realtime.options.key,
          ablyUrl: baseUri,
        };

        channel
          .subscribe('__ably_push__', function (msg) {
            try {
              const receivedPushPayload = JSON.parse(msg.data);
              expect(receivedPushPayload.data).to.deep.equal(pushPayload.data);
              expect(receivedPushPayload.notification.title).to.equal(pushPayload.notification.title);
              expect(receivedPushPayload.notification.body).to.equal(pushPayload.notification.body);
              helper.closeAndFinish(done, realtime);
            } catch (err) {
              helper.closeAndFinish(done, realtime, err);
            }
          })
          .then(() => {
            helper.whenPromiseSettles(realtime.push.admin.publish(pushRecipient, pushPayload), function (err) {
              if (err) {
                helper.closeAndFinish(done, realtime, err);
              }
            });
          });
      });

      /*
       * RSH7b
       */
      it('subscribe_client', async function () {
        const clientId = 'me';
        const channelName = 'pushenabled:subscribe_client';
        const rest = PushRest({ clientId, pushRecipientChannel: channelName });
        const channel = rest.channels.get(channelName);

        await rest.push.activate();

        await channel.push.subscribeClient();

        const result = await channel.push.listSubscriptions();

        const subscription = result.items[0];
        expect(subscription.channel).to.equal(channelName);
        expect(subscription.clientId).to.equal(clientId);
      });

      /*
       * RSH7b1
       */
      it('subscribe_client_without_clientId', async function () {
        const channelName = 'pushenabled:subscribe_client_without_clientId';
        const rest = PushRest({ pushRecipientChannel: 'hello' });
        await rest.push.activate();
        const channel = rest.channels.get(channelName);
        try {
          await channel.push.subscribeClient();
        } catch (err) {
          expect(err.code).to.equal(50000);
          expect(err.statusCode).to.equal(500);
          return;
        }
        expect.fail('expected channel.push.subscribeClient to throw exception');
      });

      /*
       * RSH7d
       */
      it('unsubscribe_client', async function () {
        const clientId = 'me';
        const channelName = 'pushenabled:unsubscribe_client';
        const rest = PushRest({ clientId, pushRecipientChannel: channelName });
        const channel = rest.channels.get(channelName);

        await rest.push.activate();

        await channel.push.subscribeClient();
        await channel.push.unsubscribeClient();

        const result = await channel.push.listSubscriptions();

        const subscriptions = result.items;
        expect(subscriptions.length).to.equal(0);
      });

      // no spec item
      it('direct_publish_client_id', async function () {
        const clientId = 'me2';
        const channelName = 'pushenabled:direct_publish_client_id';
        const rest = PushRest({ clientId, pushRecipientChannel: channelName });
        const realtime = PushRealtime();
        const rtChannel = realtime.channels.get(channelName);
        const channel = rest.channels.get(channelName);

        await rest.push.activate();

        const pushRecipient = {
          clientId,
        };

        const pushPayload = {
          notification: { title: 'Test message', body: 'Test message body' },
          data: { foo: 'bar' },
        };

        await rtChannel.attach();
        const msg = await new Promise((resolve, reject) => {
          rtChannel.subscribe('__ably_push__', (msg) => {
            resolve(msg);
          });
          rest.push.admin.publish(pushRecipient, pushPayload).catch(reject);
        });

        const receivedPushPayload = JSON.parse(msg.data);
        expect(receivedPushPayload.data).to.deep.equal(pushPayload.data);
        expect(receivedPushPayload.notification.title).to.equal(pushPayload.notification.title);
        expect(receivedPushPayload.notification.body).to.equal(pushPayload.notification.body);

        realtime.close();
      });

      /*
       * RSH7a
       */
      it('subscribe_device', async function () {
        const channelName = 'pushenabled:subscribe_device';
        const rest = PushRest({ pushRecipientChannel: channelName });
        const channel = rest.channels.get(channelName);

        await rest.push.activate();

        await channel.push.subscribeDevice();

        const result = await channel.push.listSubscriptions();

        const subscription = result.items[0];
        expect(subscription.channel).to.equal(channelName);
        expect(subscription.deviceId).to.equal(rest.device.id);
      });

      /*
       * RSH7c
       */
      it('unsubscribe_device', async function () {
        const channelName = 'pushenabled:unsubscribe_device';
        const rest = PushRest({ pushRecipientChannel: channelName });
        const channel = rest.channels.get(channelName);

        await rest.push.activate();

        await channel.push.subscribeDevice();
        await channel.push.unsubscribeDevice();

        const result = await channel.push.listSubscriptions();

        const subscriptions = result.items;
        expect(subscriptions.length).to.equal(0);
      });

      // no spec item
      it('direct_publish_device_id', async function () {
        const channelName = 'direct_publish_device_id';
        const rest = PushRest({ pushRecipientChannel: channelName });
        const realtime = PushRealtime();
        const rtChannel = realtime.channels.get(channelName);
        const channel = rest.channels.get(channelName);

        await rest.push.activate();

        const pushRecipient = {
          deviceId: rest.device.id,
        };

        const pushPayload = {
          notification: { title: 'Test message', body: 'Test message body' },
          data: { foo: 'bar' },
        };

        await rtChannel.attach();
        const msg = await new Promise((resolve, reject) => {
          rtChannel.subscribe('__ably_push__', (msg) => {
            resolve(msg);
          });
          rest.push.admin.publish(pushRecipient, pushPayload).catch(reject);
        });

        const receivedPushPayload = JSON.parse(msg.data);
        expect(receivedPushPayload.data).to.deep.equal(pushPayload.data);
        expect(receivedPushPayload.notification.title).to.equal(pushPayload.notification.title);
        expect(receivedPushPayload.notification.body).to.equal(pushPayload.notification.body);

        realtime.close();
      });

      // no spec item
      it('push_channel_subscription_device_id', async function () {
        const pushRecipientChannel = 'push_channel_subscription_device_id';
        const channelName = 'pushenabled:push_channel_subscription_device_id';
        const rest = PushRest({ pushRecipientChannel });
        const realtime = PushRealtime();
        const channel = rest.channels.get(channelName);
        const rtChannel = realtime.channels.get(pushRecipientChannel);

        await rest.push.activate();

        await channel.push.subscribeDevice();

        const pushPayload = {
          notification: { title: 'Test message', body: 'Test message body' },
          data: { foo: 'bar' },
        };

        const message = {
          name: 'foo',
          data: 'bar',
          extras: {
            push: pushPayload,
          },
        };

        const msg = await new Promise((resolve, reject) => {
          rtChannel.subscribe('__ably_push__', (msg) => {
            resolve(msg);
          });
          channel.publish(message).catch(reject);
        });

        const receivedPushPayload = JSON.parse(msg.data);
        expect(receivedPushPayload.data).to.deep.equal(pushPayload.data);
        expect(receivedPushPayload.notification.title).to.equal(pushPayload.notification.title);
        expect(receivedPushPayload.notification.body).to.equal(pushPayload.notification.body);

        realtime.close();
      });

      // no spec item
      it('push_channel_subscription_client_id', async function () {
        const pushRecipientChannel = 'push_channel_subscription_client_id';
        const channelName = 'pushenabled:push_channel_subscription_client_id';
        const rest = PushRest({ clientId: 'me', pushRecipientChannel });
        const realtime = PushRealtime();
        const channel = rest.channels.get(channelName);
        const rtChannel = realtime.channels.get(pushRecipientChannel);

        await rest.push.activate();

        await channel.push.subscribeClient();

        const pushPayload = {
          notification: { title: 'Test message', body: 'Test message body' },
          data: { foo: 'bar' },
        };

        const message = {
          name: 'foo',
          data: 'bar',
          extras: {
            push: pushPayload,
          },
        };

        const msg = await new Promise((resolve, reject) => {
          rtChannel.subscribe('__ably_push__', (msg) => {
            resolve(msg);
          });
          channel.publish(message).catch(reject);
        });

        const receivedPushPayload = JSON.parse(msg.data);
        expect(receivedPushPayload.data).to.deep.equal(pushPayload.data);
        expect(receivedPushPayload.notification.title).to.equal(pushPayload.notification.title);
        expect(receivedPushPayload.notification.body).to.equal(pushPayload.notification.body);

        realtime.close();
      });

      /*
       * RSH8h
       */
      it('failed_getting_device_details', async function () {
        const rest = PushRest();
        try {
          await rest.push.activate();
        } catch (err) {
          expect(err.code).to.equal(40000);
          expect(err.statusCode).to.equal(400);
          return;
        }
        expect.fail('expect rest.push.activate() to throw');
      });

      /*
       * RSH3b3c
       */
      it('failed_registration', async function () {
        const pushRecipientChannel = 'failed_registration';
        const rest = PushRest({ pushRecipientChannel });
        rest.device.platform = 'not_a_real_platform';
        try {
          await rest.push.activate();
        } catch (err) {
          expect(err.code).to.equal(40000);
          expect(err.statusCode).to.equal(400);
          return;
        }
        expect.fail('expect rest.push.activate() to throw');
      });
    });

    function untyped(x) {
      return JSON.parse(JSON.stringify(x));
    }

    /**
     * Returns true when x includes y: equal primitives, x's objects include y's
     * objects, x's array elements include y's array elements disregarding
     * order.
     *
     * includesUnordered(x, y) -> string | true
     */
    function includesUnordered(x, y) {
      if (Array.isArray(x)) {
        if (!Array.isArray(y)) {
          return 'not both arrays';
        }

        if (x.length != y.length) {
          return 'different length arrays';
        }

        var matched = {};
        for (var i = 0; i < x.length; i++) {
          var results = {};
          var found = false;
          for (var j = 0; j < y.length; j++) {
            if (j in matched) {
              continue;
            }
            var eq = includesUnordered(x[i], y[j]);
            if (eq === true) {
              matched[j] = i;
              found = true;
            } else {
              results[j] = eq;
            }
          }
          if (!found) {
            var eq = "couldn't find matching element for " + i + '-th element: \n';
            for (var i in results) {
              eq += i + '. ' + results[i] + '\n';
            }
            return eq;
          }
        }

        return true;
      } else if (x instanceof Object) {
        if (!(x instanceof Object) || Array.isArray(y)) {
          return 'not both objects';
        }

        for (var k in y) {
          if (!x.hasOwnProperty(k)) {
            return k + ': missing';
          }
          var eq = includesUnordered(x[k], y[k]);
          if (eq !== true) {
            return k + ': ' + eq;
          }
        }

        return true;
      }

      return x == y ? true : 'primitives not equal';
    }

    function testIncludesUnordered(x, y) {
      var eq = includesUnordered(x, y);
      expect(eq).to.equal(
        true,
        JSON.stringify(x, null, 2) + ' includesUnordered ' + JSON.stringify(y, null, 2) + ' (' + eq + ')',
      );
    }
  });
});
