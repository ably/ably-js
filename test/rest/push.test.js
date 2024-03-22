'use strict';

define(['ably', 'shared_helper', 'async', 'chai'], function (Ably, helper, async, chai) {
  var Utils = helper.Utils;
  var exports = {};
  var expect = chai.expect;
  var closeAndFinish = helper.closeAndFinish;
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
      helper.setupApp(function () {
        done();
      });
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
