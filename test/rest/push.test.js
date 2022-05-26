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

    it('Get subscriptions', function (done) {
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
          subscribes.push(function (callback) {
            rest.push.admin.channelSubscriptions.save(sub, callback);
          });
          deletes.push(function (callback) {
            rest.push.admin.channelSubscriptions.remove(sub, callback);
          });
        })(i);
      }

      var rest = helper.AblyRest();

      async.series(
        [
          function (callback) {
            async.parallel(subscribes, callback);
          },
          function (callback) {
            rest.push.admin.channelSubscriptions.list({ channel: 'pushenabled:foo1' }, callback);
          },
          function (callback) {
            rest.push.admin.channelSubscriptions.list({ channel: 'pushenabled:foo2' }, callback);
          },
          function (callback) {
            async.parallel(deletes, callback);
          },
        ],
        function (err, result) {
          if (err) {
            done(err);
            return;
          }
          try {
            testIncludesUnordered(untyped(result[1].items), untyped(subsByChannel['pushenabled:foo1']));
            testIncludesUnordered(untyped(result[2].items), untyped(subsByChannel['pushenabled:foo2']));
            done();
          } catch (err) {
            done(err);
          }
        }
      );
    });

    it('Publish', function (done) {
      var realtime = helper.AblyRealtime();

      var channel = realtime.channels.get('pushenabled:foo');
      channel.attach(function (err) {
        if (err) {
          closeAndFinish(done, realtime, err);
          return;
        }

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

        channel.subscribe('__ably_push__', function (msg) {
          var receivedPushPayload = JSON.parse(msg.data);
          try {
            expect(receivedPushPayload.data).to.deep.equal(pushPayload.data);
            expect(receivedPushPayload.notification.title).to.deep.equal(pushPayload.notification.title);
            expect(receivedPushPayload.notification.body).to.deep.equal(pushPayload.notification.body);
            closeAndFinish(done, realtime);
          } catch (err) {
            closeAndFinish(done, realtime, err);
          }
        });

        realtime.push.admin.publish(pushRecipient, pushPayload, function (err) {
          if (err) {
            closeAndFinish(done, realtime, err);
          }
        });
      });
    });

    if (typeof Promise !== 'undefined') {
      it('Publish promise', function (done) {
        var realtime = helper.AblyRealtime({ promises: true });
        var channelName = 'pushenabled:publish_promise';
        var channel = realtime.channels.get(channelName);
        channel.attach(function (err) {
          if (err) {
            closeAndFinish(done, realtime, err);
            return;
          }

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

          channel.subscribe('__ably_push__', function (msg) {
            var receivedPushPayload = JSON.parse(msg.data);
            try {
              expect(receivedPushPayload.data).to.deep.equal(pushPayload.data);
              expect(receivedPushPayload.notification.title).to.deep.equal(pushPayload.notification.title);
              expect(receivedPushPayload.notification.body).to.deep.equal(pushPayload.notification.body);
              closeAndFinish(done, realtime, err);
            } catch (err) {
              done(err);
            }
          });

          realtime.push.admin
            .publish(pushRecipient, pushPayload)
            .then(function () {
              closeAndFinish(done, realtime);
            })
            ['catch'](function (err) {
              closeAndFinish(done, realtime, err);
            });
        });
      });
    }

    it('deviceRegistrations save', function (done) {
      var rest = helper.AblyRest();

      async.series(
        [
          function (callback) {
            rest.push.admin.deviceRegistrations.save(testDevice, callback);
          },
          function (callback) {
            rest.push.admin.deviceRegistrations.get(testDevice.id, callback);
          },
          function (callback) {
            rest.push.admin.deviceRegistrations.remove(testDevice.id, callback);
          },
        ],
        function (err, result) {
          if (err) {
            done(err);
            return;
          }
          var saved = result[0];
          var got = result[1];
          try {
            expect(got.push.state).to.equal('ACTIVE');
            delete got.metadata; // Ignore these properties for testing
            delete got.push.state;
            testIncludesUnordered(untyped(got), testDevice_withoutSecret);
            testIncludesUnordered(untyped(saved), testDevice_withoutSecret);
            done();
          } catch (err) {
            done(err);
          }
        }
      );
    });

    it('deviceRegistrations get and list', function (done) {
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
          registrations.push(function (callback) {
            rest.push.admin.deviceRegistrations.save(device, callback);
          });
          deletes.push(function (callback) {
            rest.push.admin.deviceRegistrations.remove('device' + (i + 1), callback);
          });
        })(i);
      }

      var rest = helper.AblyRest();

      async.series(
        [
          function (callback) {
            async.parallel(registrations, callback);
          },
          function (callback) {
            rest.push.admin.deviceRegistrations.list(null, callback);
          },
          function (callback) {
            rest.push.admin.deviceRegistrations.list({ clientId: 'testClient1' }, callback);
          },
          function (callback) {
            rest.push.admin.deviceRegistrations.list({ clientId: 'testClient2' }, callback);
          },
          function (callback) {
            rest.push.admin.deviceRegistrations.get(devices[0].id, callback);
          },
          function (callback) {
            async.parallel(
              [
                function (callback) {
                  rest.push.admin.deviceRegistrations.removeWhere({ clientId: 'testClient1' }, callback);
                },
                function (callback) {
                  rest.push.admin.deviceRegistrations.removeWhere({ clientId: 'testClient2' }, callback);
                },
              ],
              callback
            );
          },
          function (callback) {
            async.parallel(deletes, callback);
          },
        ],
        function (err, result) {
          if (err) {
            done(err);
            return;
          }
          try {
            expect(numberOfDevices).to.equal(result[0].length);
            testIncludesUnordered(untyped(result[1].items), untyped(devices_withoutSecret));
            testIncludesUnordered(untyped(result[2].items), untyped(devicesByClientId['testClient1']));
            testIncludesUnordered(untyped(result[3].items), untyped(devicesByClientId['testClient2']));
            testIncludesUnordered(untyped(result[4]), untyped(devices[0]));
            done();
          } catch (err) {
            done(err);
          }
        }
      );
    });

    it('deviceRegistrations remove removeWhere', function (done) {
      var rest = helper.AblyRest();

      async.series(
        [
          function (callback) {
            rest.push.admin.deviceRegistrations.save(testDevice, callback);
          },
          function (callback) {
            rest.push.admin.deviceRegistrations.remove(testDevice.id, callback);
          },
          function (callback) {
            rest.push.admin.deviceRegistrations.get(testDevice.id, function (err, result) {
              expect(err && err.statusCode).to.equal(404, 'Check device reg not found after removal');
              callback(null);
            });
          },
          function (callback) {
            rest.push.admin.deviceRegistrations.save(testDevice, callback);
          },
          function (callback) {
            rest.push.admin.deviceRegistrations.removeWhere({ deviceId: testDevice.id }, callback);
          },
          function (callback) {
            rest.push.admin.deviceRegistrations.get(testDevice.id, function (err, result) {
              expect(err && err.statusCode).to.equal(404, 'Check device reg not found after removal');
              callback(null);
            });
          },
        ],
        function (err, result) {
          if (err) {
            done(err);
          }
          done();
        }
      );
    });

    if (typeof Promise !== undefined) {
      it('deviceRegistrations promise', function (done) {
        var rest = helper.AblyRest({ promises: true });

        /* save */
        rest.push.admin.deviceRegistrations
          .save(testDevice)
          .then(function (saved) {
            expect(saved.push.state).to.equal('ACTIVE');
            testIncludesUnordered(untyped(saved), testDevice_withoutSecret);
            /* get */
            return rest.push.admin.deviceRegistrations.get(testDevice.id);
          })
          .then(function (got) {
            expect(got.push.state).to.equal('ACTIVE');
            delete got.metadata; // Ignore these properties for testing
            delete got.push.state;
            testIncludesUnordered(untyped(got), testDevice_withoutSecret);
            /* list */
            return rest.push.admin.deviceRegistrations.list({ clientId: testDevice.clientId });
          })
          .then(function (result) {
            expect(result.items.length).to.equal(1);
            var got = result.items[0];
            expect(got.push.state).to.equal('ACTIVE');
            testIncludesUnordered(untyped(got), testDevice_withoutSecret);
            /* remove */
            return rest.push.admin.deviceRegistrations.removeWhere({ deviceId: testDevice.id });
          })
          .then(function () {
            done();
          })
          ['catch'](function (err) {
            done(err);
          });
      });
    }

    it('channelSubscriptions save', function (done) {
      var rest = helper.AblyRest({ clientId: 'testClient' });
      var subscription = { clientId: 'testClient', channel: 'pushenabled:foo' };

      async.series(
        [
          function (callback) {
            rest.push.admin.channelSubscriptions.save(subscription, callback);
          },
          function (callback) {
            rest.push.admin.channelSubscriptions.list({ channel: 'pushenabled:foo' }, callback);
          },
          function (callback) {
            rest.push.admin.channelSubscriptions.remove(subscription, callback);
          },
        ],
        function (err, result) {
          if (err) {
            done(err);
            return;
          }
          var saved = result[0];
          var sub = result[1].items[0];
          try {
            expect(subscription.clientId).to.equal(saved.clientId);
            expect(subscription.channel).to.equal(saved.channel);
            expect(subscription.clientId).to.equal(sub.clientId);
            expect(subscription.channel).to.equal(sub.channel);
            done();
          } catch (err) {
            done(err);
          }
        }
      );
    });

    it('channelSubscriptions get', function (done) {
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
          subscribes.push(function (callback) {
            rest.push.admin.channelSubscriptions.save(sub, callback);
          });
          deletes.push(function (callback) {
            rest.push.admin.channelSubscriptions.remove({ clientId: 'testClient' + i }, callback);
          });
        })(i);
      }

      var rest = helper.AblyRest();

      async.series(
        [
          function (callback) {
            async.parallel(subscribes, callback);
          },
          function (callback) {
            rest.push.admin.channelSubscriptions.list({ channel: 'pushenabled:foo1' }, callback);
          },
          function (callback) {
            rest.push.admin.channelSubscriptions.list({ channel: 'pushenabled:foo2' }, callback);
          },
          function (callback) {
            async.parallel(deletes, callback);
          },
        ],
        function (err, result) {
          if (err) {
            done(err);
            return;
          }
          try {
            testIncludesUnordered(untyped(result[1].items), untyped(subsByChannel['pushenabled:foo1']));
            testIncludesUnordered(untyped(result[2].items), untyped(subsByChannel['pushenabled:foo2']));
            done();
          } catch (err) {
            done(err);
          }
        }
      );
    });

    exports.push_channelSubscriptions_remove = function (test) {
      var rest = helper.AblyRest({ clientId: 'testClient' });
      var subscription = { clientId: 'testClient', channel: 'pushenabled:foo' };

      async.series(
        [
          function (callback) {
            rest.push.admin.channelSubscriptions.save(subscription, callback);
          },
          function (callback) {
            rest.push.admin.channelSubscriptions.remove(subscription, callback);
          },
        ],
        function (err, result) {
          if (err) {
            test.ok(false, err.message);
            test.done();
            return;
          }
          test.done();
        }
      );
    };

    it('channelSubscriptions listChannels', function (done) {
      var subscribes = [];
      var deletes = [];
      for (var i = 0; i < 5; i++) {
        (function (i) {
          var sub = { channel: 'pushenabled:listChannels' + ((i % 2) + 1), clientId: 'testClient' + ((i % 3) + 1) };
          var rest = helper.AblyRest({ clientId: sub.clientId });
          subscribes.push(function (callback) {
            rest.push.admin.channelSubscriptions.save(sub, callback);
          });
          deletes.push(function (callback) {
            rest.push.admin.channelSubscriptions.remove(sub, callback);
          });
        })(i);
      }

      var rest = helper.AblyRest();

      async.series(
        [
          function (callback) {
            async.parallel(subscribes, callback);
          },
          function (callback) {
            rest.push.admin.channelSubscriptions.listChannels(null, callback);
          },
          function (callback) {
            async.parallel(deletes, callback);
          },
        ],
        function (err, result) {
          if (err) {
            done(err);
            return;
          }
          try {
            testIncludesUnordered(['pushenabled:listChannels1', 'pushenabled:listChannels2'], result[1].items);
            done();
          } catch (err) {
            done(err);
          }
        }
      );
    });

    if (typeof Promise !== 'undefined') {
      it('channelSubscriptions promise', function (done) {
        var rest = helper.AblyRest({ promises: true });
        var channelId = 'pushenabled:channelsubscriptions_promise';
        var subscription = { clientId: 'testClient', channel: channelId };

        rest.push.admin.channelSubscriptions
          .save(subscription)
          .then(function (saved) {
            expect(subscription.clientId).to.equal(saved.clientId);
            expect(subscription.channel).to.equal(saved.channel);
            return rest.push.admin.channelSubscriptions.list({ channel: channelId });
          })
          .then(function (result) {
            var sub = result.items[0];
            expect(subscription.clientId).to.equal(sub.clientId);
            expect(subscription.channel).to.equal(sub.channel);
            return rest.push.admin.channelSubscriptions.listChannels(null);
          })
          .then(function (result) {
            expect(Utils.arrIn(result.items, channelId)).to.be.ok;
            return rest.push.admin.channelSubscriptions.remove(subscription);
          })
          .then(function () {
            done();
          })
          ['catch'](function (err) {
            done(err);
          });
      });
    }

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
      if (Utils.isArray(x)) {
        if (!Utils.isArray(y)) {
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
        if (!(x instanceof Object) || Utils.isArray(y)) {
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
        JSON.stringify(x, null, 2) + ' includesUnordered ' + JSON.stringify(y, null, 2) + ' (' + eq + ')'
      );
    }
  });
});
