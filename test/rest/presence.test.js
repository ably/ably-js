'use strict';

define(['ably', 'shared_helper', 'async', 'chai'], function (Ably, helper, async, chai) {
  var rest;
  var cipherConfig;
  var expect = chai.expect;
  var Crypto = Ably.Realtime.Crypto;
  var BufferUtils = Ably.Realtime.BufferUtils;
  var arrFind = helper.arrFind;

  function cipherParamsFromConfig(cipherConfig) {
    var cipherParams = new Crypto.CipherParams();
    for (var prop in cipherConfig) {
      cipherParams[prop] = cipherConfig[prop];
    }
    cipherParams.keyLength = cipherConfig.keylength;
    delete cipherParams.keylength; // grr case differences
    cipherParams.key = BufferUtils.base64Decode(cipherParams.key);
    cipherParams.iv = BufferUtils.base64Decode(cipherParams.iv);
    return cipherParams;
  }

  describe('rest/presence', function () {
    before(function (done) {
      helper.setupApp(function () {
        rest = helper.AblyRest();
        cipherConfig = helper.getTestApp().cipherConfig;
        done();
      });
    });

    function presence_simple(operation) {
      return function (done) {
        try {
          var cipherParams = cipherParamsFromConfig(cipherConfig);
          var channel = rest.channels.get('persisted:presence_fixtures', { cipher: cipherParams });
          channel.presence[operation](function (err, resultPage) {
            if (err) {
              done(err);
              return;
            }
            var presenceMessages = resultPage.items;
            expect(presenceMessages.length).to.equal(6, 'Verify correct number of messages found');
            if (presenceMessages.length != 6) {
              console.log('presenceMessages: ', JSON.stringify(presenceMessages));
            }
            var encodedMessage = arrFind(presenceMessages, function (msg) {
              return msg.clientId == 'client_encoded';
            });
            var decodedMessage = arrFind(presenceMessages, function (msg) {
              return msg.clientId == 'client_decoded';
            });
            var boolMessage = arrFind(presenceMessages, function (msg) {
              return msg.clientId == 'client_bool';
            });
            var intMessage = arrFind(presenceMessages, function (msg) {
              return msg.clientId == 'client_int';
            });
            expect(encodedMessage.data).to.deep.equal(decodedMessage.data, 'Verify message decoding works correctly');
            expect(encodedMessage.encoding).to.equal(null, 'Decoding should remove encoding field');
            expect(decodedMessage.encoding).to.equal(null, 'Decoding should remove encoding field');
            expect(boolMessage.data).to.equal('true', 'should not attempt to parse string data when no encoding field');
            expect(intMessage.data).to.equal('24', 'should not attempt to parse string data when no encoding field');
            expect(boolMessage.action).to.equal(operation === 'get' ? 'present' : 'enter', 'appropriate action');
            done();
          });
        } catch (err) {
          done(err);
        }
      };
    }

    it('Presence get simple', presence_simple('get'));
    it('Presence history simple', presence_simple('history'));

    /* Ensure that calling JSON strinfigy on the Presence object
	   converts the action string value back to a numeric value which the API requires */
    it('Presence message JSON serialisation', function (done) {
      var channel = rest.channels.get('persisted:presence_fixtures');
      channel.presence.get(function (err, resultPage) {
        if (err) {
          done(err);
          return;
        }
        var presenceMessages = resultPage.items;
        var presenceBool = arrFind(presenceMessages, function (msg) {
          return msg.clientId == 'client_bool';
        });
        try {
          expect(JSON.parse(JSON.stringify(presenceBool)).action).to.equal(1); // present
          presenceBool.action = 'leave';
          expect(JSON.parse(JSON.stringify(presenceBool)).action).to.equal(3); // leave
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    it('Presence get limits and filtering', function (done) {
      try {
        var channel = rest.channels.get('persisted:presence_fixtures');

        var tests = [
          // Result limit
          function (cb) {
            channel.presence.get({ limit: 3 }, function (err, resultPage) {
              if (err) cb(err);
              var presenceMessages = resultPage.items;
              expect(presenceMessages.length).to.equal(3, 'Verify correct number of messages found');
              cb();
            });
          },
          // Filter by clientId
          function (cb) {
            channel.presence.get({ clientId: 'client_json' }, function (err, resultPage) {
              if (err) cb(err);
              var presenceMessages = resultPage.items;
              expect(presenceMessages.length).to.equal(1, 'Verify correct number of messages found');
              cb();
            });
          },
          // Filter by connectionId
          function (cb) {
            channel.presence.get(function (err, resultPage) {
              if (err) cb(err);
              channel.presence.get({ connectionId: resultPage.items[0].connectionId }, function (err, resultPage) {
                if (err) cb(err);
                var presenceMessages = resultPage.items;
                expect(presenceMessages.length).to.equal(6, 'Verify correct number of messages found');
                cb();
              });
            });
          },
        ];

        async.parallel(tests, function (err) {
          if (err) {
            done(err);
            return;
          }
          done();
        });
      } catch (err) {
        done(err);
      }
    });

    if (typeof Promise !== 'undefined') {
      it('presencePromise', function (done) {
        var rest = helper.AblyRest({ promises: true });
        var channel = rest.channels.get('some_channel');

        channel.presence
          .get()
          .then(function () {
            done();
          })
          ['catch'](function (err) {
            done(err);
          });
      });
    }
  });
});
