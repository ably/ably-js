/**
 * UTS: LiveObject Subscribe Tests
 *
 * Spec points: RTLO4b, RTLO4b3, RTLO4b4c1, RTLO4b4c3a, RTLO4b4c3c, RTLO4b4d, RTLO4b4e, RTLO4b6, RTLO4b7
 * Source: uts/objects/unit/live_object_subscribe.md
 *
 * Tests subscribe/unsubscribe on internal LiveObject (via Instance wrapper):
 * receiving data updates, noop suppression, Subscription model (subscribe returns
 * Subscription with unsubscribe), tombstone deregistration, objectMessage population,
 * tombstone flag, no side effects, LiveMap update events.
 */

import { expect } from 'chai';
import { restoreAll, flushAsync } from '../../helpers';
import {
  setupSyncedChannel,
  buildObjectMessage,
  buildCounterInc,
  buildMapSet,
  remoteSerial,
  buildObjectDelete,
  OBJ_OP,
} from '../helpers/standard_test_pool';

describe('uts/objects/unit/live_object_subscribe', function () {
  afterEach(function () {
    restoreAll();
  });

  // UTS: objects/unit/RTLO4b/subscribe-receives-updates-0
  it('RTLO4b - subscribe receives data updates', async function () {
    const { root, mockWs } = await setupSyncedChannel('test-RTLO4b');
    const updates: any[] = [];
    const instance = root.get('score').instance()!;
    const sub = instance.subscribe((event: any) => updates.push(event));

    mockWs.active_connection!.send_to_client(
      buildObjectMessage('test-RTLO4b', [buildCounterInc('counter:score@1000', 7, '99', 'remote')]),
    );
    await flushAsync();

    expect(sub).to.have.property('unsubscribe');
    expect(updates).to.have.length(1);
  });

  // UTS: objects/unit/RTLO4b4c1/noop-no-trigger-0
  it('RTLO4b4c1 - noop update does not trigger listener', async function () {
    const { root, mockWs } = await setupSyncedChannel('test-RTLO4b4c1');
    const updates: any[] = [];
    const instance = root.get('score').instance()!;
    instance.subscribe((event: any) => updates.push(event));

    // First: a real counter increment
    mockWs.active_connection!.send_to_client(
      buildObjectMessage('test-RTLO4b4c1', [buildCounterInc('counter:score@1000', 5, '01', 'remote')]),
    );
    await flushAsync();

    expect(updates).to.have.length(1);

    // Second: a noop. Serial "02" passes the newness check (RTLO4a6) so the noop
    // path itself suppresses the event, not the site-serial dedup.
    // Deviation (RTLC9h): the spec's noop is a COUNTER_INC with no `number`, but
    // ably-js applies missing/zero increments (NaN) instead of nooping — see
    // deviations.md. A COUNTER_CREATE for an object whose create op is already
    // merged (RTLC8) is a genuine noop in ably-js, so that is used to exercise
    // the RTLO4b4c1 suppression path instead.
    mockWs.active_connection!.send_to_client(
      buildObjectMessage('test-RTLO4b4c1', [
        {
          serial: '02',
          siteCode: 'remote',
          operation: {
            action: OBJ_OP.COUNTER_CREATE,
            objectId: 'counter:score@1000',
            counterCreate: { count: 999 },
          },
        },
      ]),
    );
    await flushAsync();

    // Third: a real follow-up increment delivered through the same dispatch chain —
    // proves delivery still works after the noop (quiescence control per spec)
    mockWs.active_connection!.send_to_client(
      buildObjectMessage('test-RTLO4b4c1', [buildCounterInc('counter:score@1000', 3, '03', 'remote')]),
    );
    await flushAsync();

    // Exactly 2 events: the first inc and the follow-up inc — the noop fired nothing
    expect(updates).to.have.length(2);
    // The noop applied nothing: 100 from pool create + 5 + 3 from the two incs
    expect(root.get('score').value()).to.equal(108);
  });

  // UTS: objects/unit/RTLO4b6/subscribe-no-side-effects-0
  it('RTLO4b6 - subscribe has no side effects', async function () {
    const { channel, root } = await setupSyncedChannel('test-RTLO4b6');
    const stateBefore = channel.state;
    const instance = root.get('score').instance()!;

    instance.subscribe(() => {});

    expect(channel.state).to.equal(stateBefore);
  });

  // UTS: objects/unit/RTLO4b/subscribe-map-update-0
  it('RTLO4b - subscribe on LiveMap receives LiveMapUpdate', async function () {
    const { root, mockWs } = await setupSyncedChannel('test-RTLO4b-map');
    const updates: any[] = [];
    const instance = root.instance()!;
    instance.subscribe((event: any) => updates.push(event));

    mockWs.active_connection!.send_to_client(
      buildObjectMessage('test-RTLO4b-map', [
        buildMapSet('root', 'name', { string: 'Bob' }, remoteSerial(0), 'remote'),
      ]),
    );
    await flushAsync();

    expect(updates).to.have.length(1);
  });

  // UTS: objects/unit/RTLO4b7/subscribe-returns-subscription-0
  it('RTLO4b7 - subscribe returns Subscription with unsubscribe method', async function () {
    const { root } = await setupSyncedChannel('test-RTLO4b7-sub');
    const instance = root.get('score').instance()!;

    const sub = instance.subscribe(() => {});

    expect(sub).to.be.an('object');
    expect(sub.unsubscribe).to.be.a('function');
  });

  // UTS: objects/unit/RTLO4b7/subscription-unsubscribe-stops-delivery-0
  it('RTLO4b7 - Subscription#unsubscribe stops delivery', async function () {
    const { root, mockWs } = await setupSyncedChannel('test-RTLO4b7-unsub');
    const updates: any[] = [];
    const instance = root.get('score').instance()!;
    const sub = instance.subscribe((event: any) => updates.push(event));

    // First update should be received
    mockWs.active_connection!.send_to_client(
      buildObjectMessage('test-RTLO4b7-unsub', [buildCounterInc('counter:score@1000', 5, '01', 'remote')]),
    );
    await flushAsync();

    expect(updates).to.have.length(1);

    // Unsubscribe
    sub.unsubscribe();

    // Second update should NOT be received
    mockWs.active_connection!.send_to_client(
      buildObjectMessage('test-RTLO4b7-unsub', [buildCounterInc('counter:score@1000', 10, '02', 'remote')]),
    );
    await flushAsync();

    expect(updates).to.have.length(1);
  });

  // UTS: objects/unit/RTLO4b7/subscription-unsubscribe-idempotent-0
  it('RTLO4b7 - Subscription#unsubscribe is idempotent', async function () {
    const { root } = await setupSyncedChannel('test-RTLO4b7-idem');
    const instance = root.get('score').instance()!;
    const sub = instance.subscribe(() => {});

    // Calling unsubscribe twice should not throw
    sub.unsubscribe();
    sub.unsubscribe();
  });

  // UTS: objects/unit/RTLO4b4c3c/tombstone-deregisters-listeners-0
  // Deviation: ably-js InstanceSubscriptionEvent does not expose a `tombstone` field.
  // We verify the deregistration behaviour: both listeners fire for the tombstone event,
  // and subsequent updates do NOT fire (proving the listeners were deregistered).
  it('RTLO4b4c3c - tombstone update deregisters all listeners', async function () {
    const { root, mockWs } = await setupSyncedChannel('test-RTLO4b4c3c');
    const updatesA: any[] = [];
    const updatesB: any[] = [];
    const instance = root.get('score').instance()!;
    instance.subscribe((event: any) => updatesA.push(event));
    instance.subscribe((event: any) => updatesB.push(event));

    // Send OBJECT_DELETE which causes a tombstone LiveObjectUpdate
    mockWs.active_connection!.send_to_client(
      buildObjectMessage('test-RTLO4b4c3c', [buildObjectDelete('counter:score@1000', '50', 'remote')]),
    );
    await flushAsync();

    // Both listeners should have received the tombstone update
    expect(updatesA).to.have.length(1);
    expect(updatesB).to.have.length(1);

    // Send another update — listeners should have been deregistered by tombstone
    mockWs.active_connection!.send_to_client(
      buildObjectMessage('test-RTLO4b4c3c', [buildCounterInc('counter:score@1000', 3, '51', 'remote')]),
    );
    await flushAsync();

    expect(updatesA).to.have.length(1);
    expect(updatesB).to.have.length(1);
  });

  // UTS: objects/unit/RTLO4b4d/update-has-object-message-0
  // Deviation: ably-js InstanceSubscriptionEvent exposes the public ObjectMessage as `.message`
  // (not `.objectMessage`). The public message uses string action names (e.g. 'counter.inc').
  it('RTLO4b4d - LiveObjectUpdate.objectMessage is populated from source ObjectMessage', async function () {
    const { root, mockWs } = await setupSyncedChannel('test-RTLO4b4d');
    const updates: any[] = [];
    const instance = root.get('score').instance()!;
    instance.subscribe((event: any) => updates.push(event));

    mockWs.active_connection!.send_to_client(
      buildObjectMessage('test-RTLO4b4d', [buildCounterInc('counter:score@1000', 7, '99', 'remote')]),
    );
    await flushAsync();

    expect(updates).to.have.length(1);
    expect(updates[0].message).to.exist;
    expect(updates[0].message.serial).to.equal('99');
    expect(updates[0].message.siteCode).to.equal('remote');
    expect(updates[0].message.operation.action).to.equal('counter.inc');
    expect(updates[0].message.operation.objectId).to.equal('counter:score@1000');
  });

  // UTS: objects/unit/RTLO4b4e/tombstone-flag-true-0
  // Deviation: ably-js InstanceSubscriptionEvent does not expose `tombstone`.
  // We verify indirectly that the tombstone event is delivered (listener fires)
  // and that the message carries an OBJECT_DELETE operation.
  it('RTLO4b4e - LiveObjectUpdate.tombstone is true for tombstone updates', async function () {
    const { root, mockWs } = await setupSyncedChannel('test-RTLO4b4e-true');
    const updates: any[] = [];
    const instance = root.get('score').instance()!;
    instance.subscribe((event: any) => updates.push(event));

    mockWs.active_connection!.send_to_client(
      buildObjectMessage('test-RTLO4b4e-true', [buildObjectDelete('counter:score@1000', '50', 'remote')]),
    );
    await flushAsync();

    expect(updates).to.have.length(1);
    expect(updates[0].message).to.exist;
    expect(updates[0].message.operation.action).to.equal('object.delete');
  });

  // UTS: objects/unit/RTLO4b4e/tombstone-flag-false-0
  // Deviation: ably-js InstanceSubscriptionEvent does not expose `tombstone`.
  // We verify that a normal (non-tombstone) update is delivered with the correct operation.
  it('RTLO4b4e - LiveObjectUpdate.tombstone is false for normal updates', async function () {
    const { root, mockWs } = await setupSyncedChannel('test-RTLO4b4e-false');
    const updates: any[] = [];
    const instance = root.get('score').instance()!;
    instance.subscribe((event: any) => updates.push(event));

    mockWs.active_connection!.send_to_client(
      buildObjectMessage('test-RTLO4b4e-false', [buildCounterInc('counter:score@1000', 7, '99', 'remote')]),
    );
    await flushAsync();

    expect(updates).to.have.length(1);
    expect(updates[0].message).to.exist;
    expect(updates[0].message.operation.action).to.equal('counter.inc');
  });
});
