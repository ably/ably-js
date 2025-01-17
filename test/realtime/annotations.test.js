'use strict';

define(['shared_helper', 'chai'], function (Helper, chai) {
  const { assert } = chai;
  describe('realtime/annotations', function () {
    this.timeout(10 * 1000);
    let rest, helper, realtime;

    before(function (done) {
      helper = Helper.forHook(this);

      helper.setupApp(function (err) {
        if (err) {
          done(err);
          return;
        }
        rest = helper.AblyRest();
        done();
      });
    });

    beforeEach(async () => {
      realtime = helper.AblyRealtime();
    });

    afterEach(async () => {
      return realtime.close();
    });

    it('publish and subscribe annotations', async () => {
      const channel = realtime.channels.get('mutable:publish_subscribe_annotation', {
        modes: ['publish', 'subscribe', 'annotation_publish', 'annotation_subscribe'],
      });
      const restChannel = rest.channels.get('mutable:publish_subscribe_annotation');
      await channel.attach();
      let onMessage = channel.subscriptions.once();
      let onAnnotation = channel.annotations.subscriptions.once();

      await channel.publish('message', 'foobar');
      const message = await onMessage;
      onMessage = channel.subscriptions.once();

      await channel.annotations.publish(message.serial, 'reaction:emoji.v1', '👍');
      let annotation = await onAnnotation;
      assert.equal(annotation.action, 'annotation.create');
      assert.equal(annotation.refSerial, message.serial);
      assert.equal(annotation.refType, 'reaction:emoji.v1');
      assert.equal(annotation.data, '👍');
      assert.ok(annotation.serial > annotation.refSerial);

      // wait for the summary
      const summary = await onMessage;
      assert.equal(summary.action, 'message.summary');
      assert.equal(summary.refSerial, message.serial);

      // try again but with rest publish
      onAnnotation = channel.annotations.subscriptions.once();

      await restChannel.annotations.publish(message.serial, 'reaction:emoji.v1', '😕');
      annotation = await onAnnotation;
      assert.equal(annotation.action, 'annotation.create');
      assert.equal(annotation.refSerial, message.serial);
      assert.equal(annotation.refType, 'reaction:emoji.v1');
      assert.equal(annotation.data, '😕');
      assert.ok(annotation.serial > annotation.refSerial);
    });

    it('get all annotations rest request', async () => {
      const channel = realtime.channels.get('mutable:get_all_annotations_for_a_message', {
        modes: ['publish', 'subscribe', 'annotation_publish', 'annotation_subscribe'],
      });
      await channel.attach();
      const onMessage = channel.subscriptions.once();
      await channel.publish('message', 'foobar');
      const message = await onMessage;
      for (let emoji of ['👍', '😕', '👎', '👍👍', '😕😕', '👎👎']) {
        await channel.annotations.publish(message.serial, 'reaction:emoji.v1', emoji);
      }

      let annotations = [];
      await helper.waitFor(async () => {
        const res = await channel.annotations.get(message.serial, {});
        annotations = res.items;
        return annotations.length === 6;
      }, 10_000);

      assert.equal(annotations[0].action, 'annotation.create');
      assert.equal(annotations[0].refSerial, message.serial);
      assert.equal(annotations[0].refType, 'reaction:emoji.v1');
      assert.equal(annotations[0].data, '👍');
      assert.equal(annotations[1].data, '😕');
      assert.equal(annotations[2].data, '👎');
      assert.ok(annotations[1].serial > annotations[0].serial);
      assert.ok(annotations[2].serial > annotations[1].serial);

      // test pagination
      let res = await channel.annotations.get(message.serial, { limit: 2 });
      assert.equal(res.items.length, 2);
      assert.deepEqual(
        res.items.map((a) => a.data),
        ['👍', '😕'],
      );
      assert.ok(res.hasNext());
      res = await res.next();
      assert.ok(res);
      assert.equal(res.items.length, 2);
      assert.deepEqual(
        res.items.map((a) => a.data),
        ['👎', '👍👍'],
      );
      assert.ok(res.hasNext());
      res = await res.next();
      assert.ok(res);
      assert.equal(res.items.length, 2);
      assert.deepEqual(
        res.items.map((a) => a.data),
        ['😕😕', '👎👎'],
      );
      assert.ok(!res.hasNext());
    });
  });
});
