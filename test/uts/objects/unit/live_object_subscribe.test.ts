/**
 * UTS: LiveObject Subscribe Tests
 *
 * Spec points: RTLO4b, RTLO4c
 * Source: uts/objects/unit/live_object_subscribe.md
 *
 * Tests subscribe/unsubscribe on internal LiveObject (via Instance wrapper):
 * receiving data updates, noop suppression, unsubscribe, mode requirements,
 * no side effects, LiveMap update events.
 */

import { expect } from 'chai';
import { restoreAll, flushAsync, Ably, installMockWebSocket, trackClient } from '../../helpers';
import { MockWebSocket } from '../../mock_websocket';
import {
  setupSyncedChannel,
  buildObjectMessage,
  buildObjectSyncMessage,
  buildCounterInc,
  buildMapSet,
  buildMapRemove,
  buildMapClear,
  PM_ACTION,
  HAS_OBJECTS,
  OBJ_OP,
  STANDARD_POOL_OBJECTS,
} from '../helpers/standard_test_pool';
import * as LiveObjectsPlugin from '../../../../src/plugins/liveobjects';

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
      buildObjectMessage('test-RTLO4b', [
        buildCounterInc('counter:score@1000', 7, '99', 'remote'),
      ]),
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
      buildObjectMessage('test-RTLO4b4c1', [
        buildCounterInc('counter:score@1000', 5, '01', 'remote'),
      ]),
    );
    await flushAsync();

    expect(updates).to.have.length(1);

    // Second: a noop (same serial "01" from "remote" site code, empty counterInc)
    mockWs.active_connection!.send_to_client(
      buildObjectMessage('test-RTLO4b4c1', [
        {
          serial: '01',
          siteCode: 'remote',
          operation: {
            action: OBJ_OP.COUNTER_INC,
            objectId: 'counter:score@1000',
            counterInc: {},
          },
        },
      ]),
    );
    await flushAsync();

    // Should still be 1 - the noop should not trigger the listener
    expect(updates).to.have.length(1);
  });

  // UTS: objects/unit/RTLO4c/unsubscribe-deregisters-0
  it('RTLO4c - unsubscribe deregisters listener', async function () {
    const { root, mockWs } = await setupSyncedChannel('test-RTLO4c');
    const updates: any[] = [];
    const instance = root.get('score').instance()!;
    const sub = instance.subscribe((event: any) => updates.push(event));

    // First update should be received
    mockWs.active_connection!.send_to_client(
      buildObjectMessage('test-RTLO4c', [
        buildCounterInc('counter:score@1000', 5, '01', 'remote'),
      ]),
    );
    await flushAsync();

    expect(updates).to.have.length(1);

    // Unsubscribe
    sub.unsubscribe();

    // Second update should NOT be received
    mockWs.active_connection!.send_to_client(
      buildObjectMessage('test-RTLO4c', [
        buildCounterInc('counter:score@1000', 10, '02', 'remote'),
      ]),
    );
    await flushAsync();

    expect(updates).to.have.length(1);
  });

  // UTS: objects/unit/RTLO4b1/subscribe-requires-mode-0
  // Deviation: ably-js checks OBJECT_SUBSCRIBE mode at instance() access, not just subscribe().
  // The error code 40024 is the same; we verify the mode is enforced before subscribe can be called.
  it('RTLO4b1 - subscribe requires OBJECT_SUBSCRIBE mode', async function () {
    // Custom setup: server responds with only OBJECT_PUBLISH mode (no OBJECT_SUBSCRIBE)
    const OBJECT_PUBLISH_FLAG = 1 << 25; // OBJECT_PUBLISH
    const mockWs = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mockWs.active_connection = conn;
        conn.respond_with_connected({
          action: PM_ACTION.CONNECTED,
          connectionId: 'conn-1',
          connectionDetails: {
            connectionKey: 'key-1',
            connectionStateTtl: 120000,
            maxIdleInterval: 15000,
            maxMessageSize: 65536,
            serverId: 'test-server',
            clientId: null,
            siteCode: 'test-site',
            objectsGCGracePeriod: 86400000,
          },
        });
      },
      onMessageFromClient: (msg: any) => {
        if (msg.action === PM_ACTION.ATTACH) {
          mockWs.active_connection!.send_to_client({
            action: PM_ACTION.ATTACHED,
            channel: msg.channel,
            channelSerial: 'sync1:',
            flags: HAS_OBJECTS | OBJECT_PUBLISH_FLAG,
          });
          mockWs.active_connection!.send_to_client(
            buildObjectSyncMessage(msg.channel, 'sync1:', STANDARD_POOL_OBJECTS),
          );
        }
      },
    });
    installMockWebSocket(mockWs.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
      plugins: { LiveObjects: LiveObjectsPlugin.LiveObjects },
    });
    trackClient(client);
    client.connect();
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    const channel = client.channels.get('test-RTLO4b1', { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });
    const root = await channel.object.get();

    // In ably-js, the OBJECT_SUBSCRIBE mode check is enforced at instance() access
    // (via throwIfInvalidAccessApiConfiguration), which gates subscribe() as well.
    try {
      const instance = root.get('score').instance()!;
      instance.subscribe(() => {});
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.code).to.equal(40024);
    }
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
        buildMapSet('root', 'name', { string: 'Bob' }, 't:1', 'remote'),
      ]),
    );
    await flushAsync();

    expect(updates).to.have.length(1);
  });

  // UTS: objects/unit/RTLO4c1/unsubscribe-no-mode-required-0
  it('RTLO4c1 - unsubscribe requires no channel mode', async function () {
    const { root } = await setupSyncedChannel('test-RTLO4c1');
    const instance = root.get('score').instance()!;
    const sub = instance.subscribe(() => {});

    // Should not throw
    sub.unsubscribe();
  });
});
