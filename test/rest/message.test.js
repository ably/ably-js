'use strict';

define(['ably', 'shared_helper', 'async', 'chai'], function (Ably, helper, async, chai) {
  var expect = chai.expect;
  var noop = function () {};

  describe('rest/message', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      helper.setupApp(function (err) {
        if (err) {
          done(err);
        }
        done();
      });
    });

    /* Authenticate with a clientId and ensure that the clientId is not sent in the Message
		 and is implicitly added when published */
    it('Should implicitly send clientId when authenticated with clientId', function (done) {
      var clientId = 'implicit_client_id_0',
        rest = helper.AblyRest({ clientId: clientId, useBinaryProtocol: false }),
        channel = rest.channels.get('rest_implicit_client_id_0');

      var originalPublish = channel._publish;
      channel._publish = function (requestBody) {
        var message = JSON.parse(requestBody)[0];
        try {
          expect(message.name === 'event0', 'Outgoing message interecepted').to.be.ok;
          expect(!message.clientId, 'client ID is not added by the client library as it is implicit').to.be.ok;
        } catch (err) {
          done(err);
        }
        originalPublish.apply(channel, arguments);
      };

      channel.publish('event0', null, function (err) {
        if (err) {
          done(err);
          return;
        }

        channel.history(function (err, page) {
          if (err) {
            done(err);
            return;
          }

          var message = page.items[0];
          try {
            expect(message.clientId == clientId, 'Client ID was added implicitly').to.be.ok;
            done();
          } catch (err) {
            done(err);
          }
        });
      });
    });

    /* Authenticate with a clientId and explicitly provide the same clientId in the Message
		 and ensure it is published */
    it('Should publish clientId when provided explicitly in message', function (done) {
      var clientId = 'explicit_client_id_0',
        rest = helper.AblyRest({ clientId: clientId, useBinaryProtocol: false }),
        channel = rest.channels.get('rest_explicit_client_id_0');

      var originalPublish = channel._publish;
      channel._publish = function (requestBody) {
        var message = JSON.parse(requestBody)[0];
        try {
          expect(message.name === 'event0', 'Outgoing message interecepted').to.be.ok;
          expect(
            message.clientId == clientId,
            'client ID is added by the client library as it is explicit in the publish'
          ).to.be.ok;
        } catch (err) {
          done(err);
        }
        originalPublish.apply(channel, arguments);
      };

      channel.publish({ name: 'event0', clientId: clientId }, function (err) {
        if (err) {
          done(err);
        }

        channel.history(function (err, page) {
          if (err) {
            done(err);
            return;
          }

          var message = page.items[0];
          try {
            expect(message.clientId == clientId, 'Client ID was retained').to.be.ok;
            done();
          } catch (err) {
            done(err);
          }
        });
      });
    });

    /* Authenticate with a clientId and explicitly provide a different invalid clientId in the Message
		 and expect it to not be published and be rejected */
    it('Should error when clientId sent in message is different than authenticated clientId', function (done) {
      var clientId = 'explicit_client_id_0',
        invalidClientId = 'invalid';

      helper.AblyRest().auth.requestToken({ clientId: clientId }, function (err, token) {
        try {
          expect(token.clientId === clientId, 'client ID is present in the Token').to.be.ok;
        } catch (err) {
          done(err);
        }

        // REST client uses a token string so is unaware of the clientId so cannot reject before communicating with Ably
        var rest = helper.AblyRest({ token: token.token, useBinaryProtocol: false }),
          channel = rest.channels.get('rest_explicit_client_id_1');

        var originalPublish = channel._publish;
        channel._publish = function (requestBody) {
          var message = JSON.parse(requestBody)[0];
          try {
            expect(message.name === 'event0', 'Outgoing message interecepted').to.be.ok;
            expect(
              message.clientId == invalidClientId,
              'invalid client ID is added by the client library as it is explicit in the publish'
            ).to.be.ok;
          } catch (err) {
            done(err);
          }
          originalPublish.apply(channel, arguments);
        };

        channel.publish({ name: 'event0', clientId: invalidClientId }, function (err) {
          if (!err) {
            done(new Error('Publish should have failed with invalid clientId'));
            return;
          }

          channel.history(function (err, page) {
            if (err) {
              done(err);
              return;
            }

            try {
              expect(page.items.length).to.equal(0, 'Message should not have been published');
              done();
            } catch (err) {
              done(err);
            }
          });
        });
      });
    });

    /* TO3l8; CD2C; RSL1i */
    it('Should error when publishing message larger than maxMessageSize', function (done) {
      /* No connectionDetails mechanism for REST, so just pass the override into the constructor */
      var realtime = helper.AblyRest({ maxMessageSize: 64 }),
        channel = realtime.channels.get('maxMessageSize');

      channel.publish('foo', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', function (err) {
        try {
          expect(err, 'Check publish refused').to.be.ok;
          expect(err.code).to.equal(40009);
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    /* Check ids are correctly sent */
    it('Should send correct IDs when idempotentRestPublishing set to false', function (done) {
      var rest = helper.AblyRest({ idempotentRestPublishing: false, useBinaryProtocol: false }),
        channel = rest.channels.get('idempotent_rest_publishing'),
        message = { name: 'test', id: 'idempotent-msg-id:0' };

      async.parallel(
        [
          function (parCb) {
            channel.publish(message, parCb);
          },
          function (parCb) {
            channel.publish(message, parCb);
          },
          function (parCb) {
            channel.publish(message, parCb);
          },
        ],
        function (err) {
          if (err) {
            done(err);
            return;
          }

          channel.history(function (err, page) {
            if (err) {
              done(err);
              return;
            }
            try {
              expect(page.items.length).to.equal(1, 'Check only one message published');
              expect(page.items[0].id).to.equal(message.id, 'Check message id preserved in history');
              done();
            } catch (err) {
              done(err);
            }
          });
        }
      );
    });

    /* Check ids are added when automatic idempotent rest publishing option enabled */
    it('Should add IDs when automatic idempotent rest publishing option enabled', function (done) {
      /* easiest way to get the host we're using for tests */
      var dummyRest = helper.AblyRest(),
        host = dummyRest.options.restHost,
        /* Add the same host as a bunch of fallback hosts, so after the first
         * request 'fails' we retry on the same host using the fallback mechanism */
        rest = helper.AblyRest({
          idempotentRestPublishing: true,
          useBinaryProtocol: false,
          fallbackHosts: [host, host, host],
        }),
        channel = rest.channels.get('automatic_idempotent_rest_publishing'),
        idOne,
        idTwo,
        originalPublish = channel._publish,
        originalDoUri = Ably.Realtime.Platform.Http.doUri;

      channel._publish = function (requestBody) {
        try {
          var messageOne = JSON.parse(requestBody)[0];
          var messageTwo = JSON.parse(requestBody)[1];
          expect(messageOne.name).to.equal('one', 'Outgoing message 1 interecepted');
          expect(messageTwo.name).to.equal('two', 'Outgoing message 2 interecepted');
          idOne = messageOne.id;
          idTwo = messageTwo.id;
          expect(idOne, 'id set on message 1').to.be.ok;
          expect(idTwo, 'id set on message 2').to.be.ok;
          expect(idOne && idOne.split(':')[1]).to.equal('0', 'check zero-based index');
          expect(idTwo && idTwo.split(':')[1]).to.equal('1', 'check zero-based index');
          originalPublish.apply(channel, arguments);
        } catch (err) {
          done(err);
        }
      };

      Ably.Rest.Platform.Http.doUri = function (method, rest, uri, headers, body, params, callback) {
        originalDoUri(method, rest, uri, headers, body, params, function (err) {
          if (err) {
            done(err);
            callback(err);
            return;
          }
          /* Fake a publish error from realtime */
          callback({ message: 'moo', code: 50300, statusCode: 503 });
        });
        Ably.Rest.Platform.Http.doUri = originalDoUri;
      };

      channel.publish([{ name: 'one' }, { name: 'two' }], function (err) {
        if (err) {
          done(err);
          return;
        }

        channel.history({ direction: 'forwards' }, function (err, page) {
          if (err) {
            done(err);
            return;
          }
          /* TODO uncomment when idempotent publishing works on sandbox
				 * until then, test with ABLY_ENV=idempotent-dev
				test.equal(page.items.length, 2, 'Only one message (with two items) should have been published');
				 */
          try {
            expect(page.items[0].id).to.equal(idOne, 'Check message id 1 preserved in history');
            expect(page.items[1].id).to.equal(idTwo, 'Check message id 1 preserved in history');
            done();
          } catch (err) {
            done(err);
          }
        });
      });
    });

    if (typeof Promise !== undefined) {
      it('Rest publish promise', function (done) {
        var rest = helper.AblyRest({ promises: true });
        var channel = rest.channels.get('publishpromise');

        channel
          .publish('name', 'data')
          .then(function () {
            return channel.history();
          })
          .then(function (page) {
            var message = page.items[0];
            try {
              expect(
                message.data == 'data',
                'Check publish and history promise methods both worked as expected'
              ).to.be.ok;
              done();
            } catch (err) {
              done(err);
            }
          })
          ['catch'](function (err) {
            done(err);
          });
      });
    }

    it('Rest publish params', function (done) {
      var rest = helper.AblyRest(),
        channel = rest.channels.get('publish_params');

      /* Stub out _publish to check params */
      var i = 0;
      channel._publish = function (requestBody, headers, params) {
        try {
          expect(params && params.testParam).to.equal('testParamValue');
        } catch (err) {
          done(err);
        }
        if (++i === 8) {
          done();
        }
      };

      channel.publish('foo', 'bar', { testParam: 'testParamValue' });
      channel.publish('foo', { data: 'data' }, { testParam: 'testParamValue' });
      channel.publish('foo', { data: 'data' }, { testParam: 'testParamValue' }, noop);
      channel.publish('foo', null, { testParam: 'testParamValue' });
      channel.publish(null, 'foo', { testParam: 'testParamValue' });
      channel.publish({ name: 'foo', data: 'bar' }, { testParam: 'testParamValue' });
      channel.publish([{ name: 'foo', data: 'bar' }], { testParam: 'testParamValue' });
      channel.publish([{ name: 'foo', data: 'bar' }], { testParam: 'testParamValue' }, noop);
    });
  });
});
