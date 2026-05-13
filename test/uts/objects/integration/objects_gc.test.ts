/**
 * UTS Integration: Objects GC Tests
 *
 * Spec points: RTO10, RTLM19
 * Source: specification/uts/objects/integration/objects_gc_test.md
 *
 * Behavioral verification of garbage collection for tombstoned objects and
 * tombstoned map entries. The UTS spec uses ADVANCE_TIME (fake timers) to
 * control timing. However, ably-js's ObjectsPool uses native setInterval
 * (not Platform.Config.setTimeout), so FakeClock cannot intercept GC timers
 * in an integration context with real server connections.
 *
 * Deviations:
 * - RTO10/tombstoned-object-gc-recreate-0: Cannot use fake timers with real
 *   server connections because ably-js GC uses native setInterval. Instead,
 *   we test the observable behavior: remove a counter, then re-set the same
 *   key with a new counter. The server assigns a new objectId, confirming
 *   the old object is gone and a new one was created. The GC grace period
 *   advancement is omitted; we rely on the server accepting the new create.
 * - RTO10/tombstoned-object-gc-recreate-0: UTS spec asserts value() == null
 *   after removal. ably-js PathObject#value() returns undefined for
 *   tombstoned entries. Assertion adapted accordingly.
 * - RTLM19/tombstoned-entry-gc-reset-0: Same fake timer deviation as above.
 *   We test remove + re-set without time advancement. The server accepts the
 *   new MAP_SET because the entry was removed (tombstoned) and a new serial
 *   is assigned. GC of the tombstone entry is not directly observable in
 *   this integration context.
 * - RTLM19/tombstoned-entry-gc-reset-0: Same undefined vs null deviation.
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

describe('uts/objects/integration/objects_gc', function () {
  this.timeout(30000);

  before(async function () {
    await setupSandbox();
  });

  after(async function () {
    await teardownSandbox();
  });

  /**
   * RTO10 - Tombstoned object is GC'd and recreatable
   *
   * After an object is tombstoned (removed from map), a new object can be
   * created at the same map key. The new object gets a different objectId.
   *
   * Deviation: GC grace period advancement omitted (see file header).
   * We test remove + re-create and verify new objectId differs from old.
   */
  // UTS: objects/integration/RTO10/tombstoned-object-gc-recreate-0
  it('RTO10 - tombstoned object is recreatable with new objectId', async function () {
    const channelName = uniqueChannelName('objects-gc-object');

    const client = new Ably.Realtime({
      key: getApiKey(),
      endpoint: SANDBOX_ENDPOINT,
      autoConnect: false,
      useBinaryProtocol: false,
      plugins: { LiveObjects: LiveObjectsPlugin.LiveObjects },
    });
    trackClient(client);

    await connectAndWait(client);

    const channel = client.channels.get(channelName, { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });
    const root = await channel.object.get();

    // Create a counter
    await root.set('counter', LiveObjectsPlugin.LiveCounter.create(42));

    await pollUntil(() => (root.get('counter').value() === 42 ? true : null), {
      interval: 500,
      timeout: 10000,
    });

    expect(root.get('counter').value()).to.equal(42);
    const counterId = root.get('counter').instance().id;

    // Remove it (tombstones the entry and the object)
    await root.remove('counter');

    // Deviation: ably-js returns undefined for tombstoned entries, not null
    await pollUntil(() => (root.get('counter').value() === undefined ? true : null), {
      interval: 500,
      timeout: 10000,
    });

    expect(root.get('counter').value()).to.be.undefined;

    // Create a new counter at the same key
    await root.set('counter', LiveObjectsPlugin.LiveCounter.create(99));

    await pollUntil(() => (root.get('counter').value() === 99 ? true : null), {
      interval: 500,
      timeout: 10000,
    });

    expect(root.get('counter').value()).to.equal(99);
    const newCounterId = root.get('counter').instance().id;
    expect(newCounterId).to.not.equal(counterId);

    await closeAndWait(client);
  });

  /**
   * RTLM19 - Tombstoned map entry is GC'd, re-settable
   *
   * After a map entry is tombstoned (removed), the entry can be re-set.
   * A subsequent MAP_SET succeeds because the server processes the new
   * operation against the tombstoned entry.
   *
   * Deviation: GC grace period advancement omitted (see file header).
   * We test remove + re-set and verify the value is correctly restored.
   */
  // UTS: objects/integration/RTLM19/tombstoned-entry-gc-reset-0
  it('RTLM19 - tombstoned map entry is re-settable', async function () {
    const channelName = uniqueChannelName('objects-gc-entry');

    const client = new Ably.Realtime({
      key: getApiKey(),
      endpoint: SANDBOX_ENDPOINT,
      autoConnect: false,
      useBinaryProtocol: false,
      plugins: { LiveObjects: LiveObjectsPlugin.LiveObjects },
    });
    trackClient(client);

    await connectAndWait(client);

    const channel = client.channels.get(channelName, { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });
    const root = await channel.object.get();

    // Set then remove a key
    await root.set('ephemeral', 'temporary');

    await pollUntil(() => (root.get('ephemeral').value() === 'temporary' ? true : null), {
      interval: 500,
      timeout: 10000,
    });

    expect(root.get('ephemeral').value()).to.equal('temporary');

    await root.remove('ephemeral');

    // Deviation: ably-js returns undefined for tombstoned entries, not null
    await pollUntil(() => (root.get('ephemeral').value() === undefined ? true : null), {
      interval: 500,
      timeout: 10000,
    });

    expect(root.get('ephemeral').value()).to.be.undefined;

    // Set the same key again
    await root.set('ephemeral', 'revived');

    await pollUntil(() => (root.get('ephemeral').value() === 'revived' ? true : null), {
      interval: 500,
      timeout: 10000,
    });

    expect(root.get('ephemeral').value()).to.equal('revived');

    await closeAndWait(client);
  });
});
