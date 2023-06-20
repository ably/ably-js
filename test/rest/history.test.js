'use strict';

define(['shared_helper', 'async', 'chai'], function (helper, async, chai) {
  var rest;
  var expect = chai.expect;
  var exports = {};
  var restTestOnJsonMsgpack = helper.restTestOnJsonMsgpack;
  var utils = helper.Utils;
  var testMessages = [
    { name: 'event0', data: 'some data' },
    { name: 'event1', data: 'some more data' },
    { name: 'event2', data: 'and more' },
    { name: 'event3', data: 'and more' },
    { name: 'event4', data: [1, 2, 3] },
    { name: 'event5', data: { one: 1, two: 2, three: 3 } },
    { name: 'event6', data: { foo: 'bar' } },
  ];
  var reversedMessages = testMessages.map((_, i) => testMessages[testMessages.length - 1 - i]);

  describe('rest/history', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      helper.setupApp(function () {
        rest = helper.AblyRestPromise();
        done();
      });
    });

    restTestOnJsonMsgpack('history_simple', async function (rest, channelName) {
      var testchannel = rest.channels.get('persisted:' + channelName);

      /* first, send a number of events to this channel */
      await Promise.all([
        new Promise((resolve) => setTimeout(resolve, 1000)),
        ...testMessages.map((event) => testchannel.publish(event.name, event.data)),
      ]);

      /* so now the messages are there; try querying the timeline */
      var resultPage = await testchannel.history();
      /* verify all messages are received */
      var messages = resultPage.items;
      expect(messages.length).to.equal(testMessages.length, 'Verify correct number of messages found');

      /* verify message ids are unique */
      var ids = {};
      utils.arrForEach(messages, function (msg) {
        ids[msg.id] = msg;
      });
      expect(utils.keysArray(ids).length).to.equal(
        testMessages.length,
        'Verify correct number of distinct message ids found'
      );
    });

    restTestOnJsonMsgpack('history_multiple', async function (rest, channelName) {
      var testchannel = rest.channels.get('persisted:' + channelName);

      /* first, send a number of events to this channel */
      await Promise.all([new Promise((resolve) => setTimeout(resolve, 1000)), testchannel.publish(testMessages)]);

      /* so now the messages are there; try querying the timeline */
      var resultPage = await testchannel.history();
      /* verify all messages are received */
      var messages = resultPage.items;
      expect(messages.length).to.equal(testMessages.length, 'Verify correct number of messages found');

      /* verify message ids are unique */
      var ids = {};
      utils.arrForEach(messages, function (msg) {
        ids[msg.id] = msg;
      });
      expect(utils.keysArray(ids).length).to.equal(
        testMessages.length,
        'Verify correct number of distinct message ids found'
      );
    });

    restTestOnJsonMsgpack('history_simple_paginated_b', async function (rest, channelName) {
      var testchannel = rest.channels.get('persisted:' + channelName);

      /* first, send a number of events to this channel */
      for (var message of testMessages) {
        await testchannel.publish(message.name, message.data);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      /* so now the messages are there; try querying the timeline to get messages one at a time */
      var ids = {},
        totalMessagesExpected = testMessages.length;

      var resultPage = await testchannel.history({ limit: 1, direction: 'backwards' });
      for (var expectedMessage of reversedMessages) {
        /* verify expected number of messages in this page */
        expect(resultPage.items.length).to.equal(1, 'Verify a single message received');
        var resultMessage = resultPage.items[0];
        ids[resultMessage.id] = resultMessage;

        /* verify expected message */
        expect(expectedMessage.name).to.equal(resultMessage.name, 'Verify expected name value present');
        expect(expectedMessage.data).to.deep.equal(resultMessage.data, 'Verify expected data value present');

        if (--totalMessagesExpected > 0) {
          expect(resultPage.hasNext(), 'Verify next link is present').to.be.ok;
          expect(!resultPage.isLast(), 'Verify not last page').to.be.ok;
          resultPage = await resultPage.next();
        }
      }
      /* verify message ids are unique */
      expect(utils.keysArray(ids).length).to.equal(
        testMessages.length,
        'Verify correct number of distinct message ids found'
      );
    });

    it('history_simple_paginated_f', async function () {
      var testchannel = rest.channels.get('persisted:history_simple_paginated_f');

      /* first, send a number of events to this channel */
      for (var message of testMessages) {
        await testchannel.publish(message.name, message.data);
      }

      await new Promise(function (resolve) {
        setTimeout(resolve, 1000);
      });

      var ids = {},
        totalMessagesExpected = testMessages.length;

      var resultPage = await testchannel.history({ limit: 1, direction: 'forwards' });
      for (var expectedMessage of testMessages) {
        /* verify expected number of messages in this page */
        expect(resultPage.items.length).to.equal(1, 'Verify a single message received');
        var resultMessage = resultPage.items[0];
        ids[resultMessage.id] = resultMessage;

        /* verify expected message */
        expect(expectedMessage.name).to.equal(resultMessage.name, 'Verify expected name value present');
        expect(expectedMessage.data).to.deep.equal(resultMessage.data, 'Verify expected data value present');

        if (--totalMessagesExpected > 0) {
          expect(resultPage.hasNext(), 'Verify next link is present').to.be.ok;
          resultPage = await resultPage.next();
        }
      }

      /* verify message ids are unique */
      expect(utils.keysArray(ids).length).to.equal(
        testMessages.length,
        'Verify correct number of distinct message ids found'
      );
    });

    it('history_multiple_paginated_b', async function () {
      var testchannel = rest.channels.get('persisted:history_multiple_paginated_b');

      /* first, send a number of events to this channel */
      for (var message of testMessages) {
        await testchannel.publish(message.name, message.data);
      }

      await new Promise(function (resolve) {
        setTimeout(resolve, 1000);
      });

      /* so now the messages are there; try querying the timeline to get messages one at a time */
      var ids = {},
        totalMessagesExpected = testMessages.length;

      var resultPage = await testchannel.history({ limit: 1, direction: 'backwards' });
      for (var expectedMessage of reversedMessages) {
        /* verify expected number of messages in this page */
        expect(resultPage.items.length).to.equal(1, 'Verify a single message received');
        var resultMessage = resultPage.items[0];
        ids[resultMessage.id] = resultMessage;

        /* verify expected message */
        expect(expectedMessage.name).to.equal(resultMessage.name, 'Verify expected name value present');
        expect(expectedMessage.data).to.deep.equal(resultMessage.data, 'Verify expected data value present');

        if (--totalMessagesExpected > 0) {
          expect(resultPage.hasNext(), 'Verify next link is present').to.be.ok;
          resultPage = await resultPage.next();
        }
      }
    });

    it('history_multiple_paginated_f', async function () {
      var testchannel = rest.channels.get('persisted:history_multiple_paginated_f');

      /* first, send a number of events to this channel */
      await testchannel.publish(testMessages);

      await new Promise(function (resolve) {
        setTimeout(resolve, 1000);
      });

      /* so now the messages are there; try querying the timeline to get messages one at a time */
      var ids = {},
        totalMessagesExpected = testMessages.length;

      var resultPage = await testchannel.history({ limit: 1, direction: 'forwards' });
      for (var expectedMessage of testMessages) {
        /* verify expected number of messages in this page */
        expect(resultPage.items.length).to.equal(1, 'Verify a single message received');
        var resultMessage = resultPage.items[0];
        ids[resultMessage.id] = resultMessage;

        /* verify expected message */
        expect(expectedMessage.name).to.equal(resultMessage.name, 'Verify expected name value present');
        expect(expectedMessage.data).to.deep.equal(resultMessage.data, 'Verify expected data value present');

        if (--totalMessagesExpected > 0) {
          expect(resultPage.hasNext(), 'Verify next link is present').to.be.ok;
          var resultPage = await resultPage.next();
        }
      }

      /* verify message ids are unique */
      expect(utils.keysArray(ids).length).to.equal(
        testMessages.length,
        'Verify correct number of distinct message ids found'
      );
    });

    restTestOnJsonMsgpack('history_encoding_errors', async function (rest, channelName) {
      var testchannel = rest.channels.get('persisted:' + channelName);
      var badMessage = { name: 'jsonUtf8string', encoding: 'json/utf-8', data: '{"foo":"bar"}' };
      testchannel.publish(badMessage);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      var resultPage = await testchannel.history();
      /* verify all messages are received */
      var message = resultPage.items[0];
      expect(message.data).to.equal(badMessage.data, 'Verify data preserved');
      expect(message.encoding).to.equal(badMessage.encoding, 'Verify encoding preserved');
    });
  });
});
