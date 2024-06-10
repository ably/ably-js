'use strict';

define(['ably', 'shared_helper', 'async', 'chai'], function (Ably, Helper, async, chai) {
  var expect = chai.expect;
  var noop = function () {};

  describe('rest/message', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      const helper = Helper.forHook(this);
      helper.setupApp(function (err) {
        if (err) {
          done(err);
        }
        done();
      });
    });

    /* Authenticate with a clientId and ensure that the clientId is not sent in the Message
		 and is implicitly added when published */
    it('Should implicitly send clientId when authenticated with clientId', async function () {
      var helper = this.helper,
        clientId = 'implicit_client_id_0',
        rest = helper.AblyRest({ clientId: clientId, useBinaryProtocol: false }),
        channel = rest.channels.get('rest_implicit_client_id_0');

      var originalPublish = channel._publish;
      channel._publish = async function (requestBody) {
        var message = JSON.parse(requestBody)[0];
        expect(message.name === 'event0', 'Outgoing message interecepted').to.be.ok;
        expect(!message.clientId, 'client ID is not added by the client library as it is implicit').to.be.ok;
        return originalPublish.apply(channel, arguments);
      };

      await channel.publish('event0', null);
      var page = await channel.history();

      var message = page.items[0];
      expect(message.clientId == clientId, 'Client ID was added implicitly').to.be.ok;
    });

    /* Authenticate with a clientId and explicitly provide the same clientId in the Message
		 and ensure it is published */
    it('Should publish clientId when provided explicitly in message', async function () {
      var helper = this.helper,
        clientId = 'explicit_client_id_0',
        rest = helper.AblyRest({ clientId: clientId, useBinaryProtocol: false }),
        channel = rest.channels.get('rest_explicit_client_id_0');

      var originalPublish = channel._publish;
      channel._publish = async function (requestBody) {
        var message = JSON.parse(requestBody)[0];
        expect(message.name === 'event0', 'Outgoing message interecepted').to.be.ok;
        expect(
          message.clientId == clientId,
          'client ID is added by the client library as it is explicit in the publish',
        ).to.be.ok;
        return originalPublish.apply(channel, arguments);
      };

      await channel.publish({ name: 'event0', clientId: clientId });
      var page = await channel.history();
      var message = page.items[0];
      expect(message.clientId == clientId, 'Client ID was retained').to.be.ok;
    });

    /* Authenticate with a clientId and explicitly provide a different invalid clientId in the Message
		 and expect it to not be published and be rejected */
    it('Should error when clientId sent in message is different than authenticated clientId', async function () {
      var helper = this.helper,
        clientId = 'explicit_client_id_0',
        invalidClientId = 'invalid';

      var token = await helper.AblyRest().auth.requestToken({ clientId: clientId });
      expect(token.clientId === clientId, 'client ID is present in the Token').to.be.ok;

      // REST client uses a token string so is unaware of the clientId so cannot reject before communicating with Ably
      var rest = helper.AblyRest({ token: token.token, useBinaryProtocol: false }),
        channel = rest.channels.get('rest_explicit_client_id_1');

      var originalPublish = channel._publish;
      channel._publish = async function (requestBody) {
        var message = JSON.parse(requestBody)[0];
        expect(message.name === 'event0', 'Outgoing message interecepted').to.be.ok;
        expect(
          message.clientId == invalidClientId,
          'invalid client ID is added by the client library as it is explicit in the publish',
        ).to.be.ok;
        return originalPublish.apply(channel, arguments);
      };

      try {
        await channel.publish({ name: 'event0', clientId: invalidClientId });
      } catch (err) {
        var page = await channel.history();
        expect(page.items.length).to.equal(0, 'Message should not have been published');
        return;
      }
      expect.fail('Publish should have failed with invalid clientId');
    });

    /* TO3l8; CD2C; RSL1i */
    it('Should error when publishing message larger than maxMessageSize', async function () {
      /* No connectionDetails mechanism for REST, so just pass the override into the constructor */
      var helper = this.helper,
        realtime = helper.AblyRest({ maxMessageSize: 64 }),
        channel = realtime.channels.get('maxMessageSize');

      try {
        await channel.publish('foo', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
      } catch (err) {
        expect(err, 'Check publish refused').to.be.ok;
        expect(err.code).to.equal(40009);
        return;
      }
      expect.fail('Expected channel.publish() to throw error');
    });

    /* Check ids are correctly sent */
    it('Should send correct IDs when idempotentRestPublishing set to false', async function () {
      var helper = this.helper,
        rest = helper.AblyRest({ idempotentRestPublishing: false, useBinaryProtocol: false }),
        channel = rest.channels.get('idempotent_rest_publishing'),
        message = { name: 'test', id: 'idempotent-msg-id:0' };

      await Promise.all([channel.publish(message), channel.publish(message), channel.publish(message)]);

      var page = await channel.history();
      expect(page.items.length).to.equal(1, 'Check only one message published');
      expect(page.items[0].id).to.equal(message.id, 'Check message id preserved in history');
    });

    /* Check ids are added when automatic idempotent rest publishing option enabled */
    it('Should add IDs when automatic idempotent rest publishing option enabled', async function () {
      /* easiest way to get the host we're using for tests */
      var helper = this.helper,
        dummyRest = helper.AblyRest(),
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
        originalDoUri = Ably.Realtime._Http.doUri;

      channel._publish = async function (requestBody) {
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
        return originalPublish.apply(channel, arguments);
      };

      Ably.Rest._Http.doUri = async function (method, uri, headers, body, params) {
        const resultPromise = originalDoUri(method, uri, headers, body, params);
        Ably.Rest._Http.doUri = originalDoUri;
        const result = await resultPromise;
        if (result.error) {
          return { error: result.error };
        }
        /* Fake a publish error from realtime */
        return { error: { message: 'moo', code: 50300, statusCode: 503 } };
      };

      await channel.publish([{ name: 'one' }, { name: 'two' }]);
      var page = await channel.history({ direction: 'forwards' });
      /* TODO uncomment when idempotent publishing works on sandbox
       * until then, test with ABLY_ENV=idempotent-dev
       * test.equal(page.items.length, 2, 'Only one message (with two items) should have been published');
       */
      expect(page.items[0].id).to.equal(idOne, 'Check message id 1 preserved in history');
      expect(page.items[1].id).to.equal(idTwo, 'Check message id 1 preserved in history');
    });

    it('Rest publish params', async function () {
      var helper = this.helper,
        rest = helper.AblyRest(),
        channel = rest.channels.get('publish_params');

      var originalPublish = channel._publish;

      /* Stub out _publish to check params */
      channel._publish = async function (requestBody, headers, params) {
        expect(params && params.testParam).to.equal('testParamValue');
        return originalPublish.apply(channel, arguments);
      };

      await channel.publish('foo', 'bar', { testParam: 'testParamValue' });
      await channel.publish('foo', { data: 'data' }, { testParam: 'testParamValue' });
      await channel.publish('foo', { data: 'data' }, { testParam: 'testParamValue' }, noop);
      await channel.publish('foo', null, { testParam: 'testParamValue' });
      await channel.publish(null, 'foo', { testParam: 'testParamValue' });
      await channel.publish({ name: 'foo', data: 'bar' }, { testParam: 'testParamValue' });
      await channel.publish([{ name: 'foo', data: 'bar' }], { testParam: 'testParamValue' });
      await channel.publish([{ name: 'foo', data: 'bar' }], { testParam: 'testParamValue' }, noop);
    });
  });
});
