/**
 * UTS Integration: Objects Batch Tests
 *
 * Spec points: RTPO22, RTBC12-RTBC15
 * Source: specification/uts/objects/integration/objects_batch_test.md
 *
 * Batch operations end-to-end: multiple mutations in a single publish,
 * atomic propagation to subscribers. Verifies that batch() groups multiple
 * operations into a single ProtocolMessage and the server processes and
 * delivers them correctly to other clients.
 *
 * Deviations:
 * - RTPO22/batch-mixed-ops-0: root.get("counter") returns a PathObject.
 *   To get the counter instance inside batch, we use ctx.get("counter")
 *   which returns a BatchContext wrapping the LiveCounter. The UTS spec
 *   calls `child.increment(5)` which maps to `ctx.get("counter").increment(5)`.
 * - RTPO22/batch-mixed-ops-0: UTS spec asserts `root_b.get("to_remove").value() == null`
 *   after removal. In ably-js, PathObject#value() returns `undefined` for
 *   tombstoned/removed map entries, not `null`. Assertion adapted accordingly.
 * - RTPO22/batch-create-counter-0: The UTS spec asserts
 *   `root_b.get("batch_counter").instance() IS NOT null`. In ably-js,
 *   instance() returns the underlying LiveCounter object. We verify it
 *   exists and has a non-null id.
 */

import { expect } from 'chai';
import {
  Ably,
  SANDBOX_ENDPOINT,
  setupSandbox,
  teardownSandbox,
  getApiKey,
  trackClient,
  connectAndWait,
  closeAndWait,
  uniqueChannelName,
  pollUntil,
} from '../../realtime/integration/sandbox';
import * as LiveObjectsPlugin from '../../../../src/plugins/liveobjects';

describe('uts/objects/integration/objects_batch', function () {
  this.timeout(30000);

  before(async function () {
    await setupSandbox();
  });

  after(async function () {
    await teardownSandbox();
  });

  /**
   * RTPO22 - Batch set of multiple keys arrives to second client
   *
   * batch() groups multiple mutations into a single publish.
   * All operations are delivered together to subscribers.
   */
  // UTS: objects/integration/RTPO22/batch-set-propagates-0
  it('RTPO22 - batch set of multiple keys arrives to second client', async function () {
    const channelName = uniqueChannelName('objects-batch');

    const clientA = new Ably.Realtime({
      key: getApiKey(),
      endpoint: SANDBOX_ENDPOINT,
      autoConnect: false,
      useBinaryProtocol: false,
      plugins: { LiveObjects: LiveObjectsPlugin.LiveObjects },
    });
    trackClient(clientA);

    const clientB = new Ably.Realtime({
      key: getApiKey(),
      endpoint: SANDBOX_ENDPOINT,
      autoConnect: false,
      useBinaryProtocol: false,
      plugins: { LiveObjects: LiveObjectsPlugin.LiveObjects },
    });
    trackClient(clientB);

    await connectAndWait(clientA);
    await connectAndWait(clientB);

    const channelA = clientA.channels.get(channelName, { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });
    const channelB = clientB.channels.get(channelName, { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });

    const rootA = await channelA.object.get();
    const rootB = await channelB.object.get();

    await rootA.batch((ctx: any) => {
      ctx.set('x', 1);
      ctx.set('y', 2);
      ctx.set('z', 3);
    });

    await pollUntil(() => (rootB.get('x').value() === 1 ? true : null), {
      interval: 500,
      timeout: 10000,
    });

    expect(rootB.get('x').value()).to.equal(1);
    expect(rootB.get('y').value()).to.equal(2);
    expect(rootB.get('z').value()).to.equal(3);

    await closeAndWait(clientA);
    await closeAndWait(clientB);
  });

  /**
   * RTPO22 - Batch with mixed operations (set + remove + increment)
   *
   * Batch can contain different operation types published atomically.
   */
  // UTS: objects/integration/RTPO22/batch-mixed-ops-0
  it('RTPO22 - batch with mixed operations (set + remove + increment)', async function () {
    const channelName = uniqueChannelName('objects-batch-mixed');

    const clientA = new Ably.Realtime({
      key: getApiKey(),
      endpoint: SANDBOX_ENDPOINT,
      autoConnect: false,
      useBinaryProtocol: false,
      plugins: { LiveObjects: LiveObjectsPlugin.LiveObjects },
    });
    trackClient(clientA);

    const clientB = new Ably.Realtime({
      key: getApiKey(),
      endpoint: SANDBOX_ENDPOINT,
      autoConnect: false,
      useBinaryProtocol: false,
      plugins: { LiveObjects: LiveObjectsPlugin.LiveObjects },
    });
    trackClient(clientB);

    await connectAndWait(clientA);
    await connectAndWait(clientB);

    const channelA = clientA.channels.get(channelName, { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });
    const channelB = clientB.channels.get(channelName, { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });

    const rootA = await channelA.object.get();
    const rootB = await channelB.object.get();

    // Set up initial state
    await rootA.set('to_remove', 'temp');
    await rootA.set('counter', LiveObjectsPlugin.LiveCounter.create(10));

    await pollUntil(() => (rootB.get('to_remove').value() === 'temp' ? true : null), {
      interval: 500,
      timeout: 10000,
    });
    await pollUntil(() => (rootB.get('counter').value() === 10 ? true : null), {
      interval: 500,
      timeout: 10000,
    });

    // Batch with mixed operations
    await rootA.batch((ctx: any) => {
      ctx.set('name', 'Alice');
      ctx.remove('to_remove');
      const child = ctx.get('counter');
      child.increment(5);
    });

    await pollUntil(() => (rootB.get('name').value() === 'Alice' ? true : null), {
      interval: 500,
      timeout: 10000,
    });

    expect(rootB.get('name').value()).to.equal('Alice');
    // Deviation: ably-js returns undefined for tombstoned entries, not null
    expect(rootB.get('to_remove').value()).to.be.undefined;
    expect(rootB.get('counter').value()).to.equal(15);

    await closeAndWait(clientA);
    await closeAndWait(clientB);
  });

  /**
   * RTPO22 - Batch with LiveCounterValueType creates counter atomically
   *
   * Batch containing LiveCounterValueType generates COUNTER_CREATE +
   * MAP_SET in a single publish. The server processes both atomically.
   */
  // UTS: objects/integration/RTPO22/batch-create-counter-0
  it('RTPO22 - batch with LiveCounterValueType creates counter atomically', async function () {
    const channelName = uniqueChannelName('objects-batch-counter');

    const clientA = new Ably.Realtime({
      key: getApiKey(),
      endpoint: SANDBOX_ENDPOINT,
      autoConnect: false,
      useBinaryProtocol: false,
      plugins: { LiveObjects: LiveObjectsPlugin.LiveObjects },
    });
    trackClient(clientA);

    const clientB = new Ably.Realtime({
      key: getApiKey(),
      endpoint: SANDBOX_ENDPOINT,
      autoConnect: false,
      useBinaryProtocol: false,
      plugins: { LiveObjects: LiveObjectsPlugin.LiveObjects },
    });
    trackClient(clientB);

    await connectAndWait(clientA);
    await connectAndWait(clientB);

    const channelA = clientA.channels.get(channelName, { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });
    const channelB = clientB.channels.get(channelName, { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });

    const rootA = await channelA.object.get();
    const rootB = await channelB.object.get();

    await rootA.batch((ctx: any) => {
      ctx.set('batch_counter', LiveObjectsPlugin.LiveCounter.create(99));
      ctx.set('label', 'created in batch');
    });

    await pollUntil(() => (rootB.get('batch_counter').value() === 99 ? true : null), {
      interval: 500,
      timeout: 10000,
    });

    expect(rootB.get('batch_counter').value()).to.equal(99);
    expect(rootB.get('label').value()).to.equal('created in batch');
    // Verify the counter instance exists and has an id
    const counterInstance = rootB.get('batch_counter').instance();
    expect(counterInstance).to.not.be.null;
    expect(counterInstance).to.not.be.undefined;
    expect(counterInstance.id).to.be.a('string');
    expect(counterInstance.id.length).to.be.greaterThan(0);

    await closeAndWait(clientA);
    await closeAndWait(clientB);
  });
});
