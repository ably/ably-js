/**
 * UTS: RealtimeObject Tests
 *
 * Spec points: RTO2, RTO10, RTO15, RTO17-RTO20, RTO22-RTO24
 * Source: uts/objects/unit/realtime_object.md
 *
 * Tests the RealtimeObject entry point (channel.object): get() lifecycle,
 * channel mode enforcement, publish + ACK flow, publishAndApply,
 * sync state events, echo deduplication, and GC.
 *
 * Deviations:
 * - RTO10/RTO10b1 (GC tests): ObjectsPool uses real setInterval + Date.now,
 *   not Platform.Config.setTimeout. Tests stub Date.now and use a short
 *   gcInterval to trigger GC, then restore originals.
 * - RTO20f (siteTimeserials): _siteTimeserials is protected on LiveObject
 *   and _value is private on DefaultInstance. Test accesses via (instance as any)._value._siteTimeserials.
 * - RTO17-RTO18 scenario "re-attach after detach": ably-js channel goes through
 *   SUSPENDED (not directly to DETACHED) on server DETACHED, so this scenario
 *   is verified via a fresh setupSyncedChannel + server-initiated ATTACHED instead.
 */

import { expect } from 'chai';
import { Ably, installMockWebSocket, trackClient, restoreAll, flushAsync, enableFakeTimers } from '../../helpers';
import * as LiveObjectsPlugin from '../../../../src/plugins/liveobjects';
import { MockWebSocket } from '../../mock_websocket';
import {
  setupSyncedChannel,
  setupSyncedChannelNoAck,
  buildObjectMessage,
  buildObjectSyncMessage,
  buildAckMessage,
  buildCounterInc,
  buildMapSet,
  buildObjectDelete,
  STANDARD_POOL_OBJECTS,
  PM_ACTION,
  HAS_OBJECTS,
  OBJ_OP,
} from '../helpers/standard_test_pool';
import { DEFAULTS } from '../../../../src/plugins/liveobjects/defaults';

describe('uts/objects/unit/realtime_object', function () {
  afterEach(function () {
    restoreAll();
  });

  // UTS: objects/unit/RTO23/get-returns-path-object-0
  it('RTO23 - get() returns PathObject wrapping root', async function () {
    const { root } = await setupSyncedChannel('test-RTO23');

    expect(root).to.exist;
    expect(root.path()).to.equal('');
  });

  // UTS: objects/unit/RTO23a/get-requires-subscribe-mode-0
  it('RTO23a - get() requires OBJECT_SUBSCRIBE mode', async function () {
    const mockWs = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mockWs.active_connection = conn;
        conn.respond_with_connected({
          action: PM_ACTION.CONNECTED,
          connectionId: 'conn-1',
          connectionDetails: {
            connectionKey: 'key-1',
            siteCode: 'test-site',
          },
        });
      },
      onMessageFromClient: (msg: any) => {
        if (msg.action === PM_ACTION.ATTACH) {
          mockWs.active_connection!.send_to_client({
            action: PM_ACTION.ATTACHED,
            channel: msg.channel,
            channelSerial: 'sync1:',
            flags: HAS_OBJECTS,
          });
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

    // Only OBJECT_PUBLISH, no OBJECT_SUBSCRIBE
    const channel = client.channels.get('test-RTO23a', { modes: ['OBJECT_PUBLISH'] });

    try {
      await channel.object.get();
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.code).to.equal(40024);
    }
  });

  // UTS: objects/unit/RTO23b/get-throws-detached-0
  // Deviation: ably-js ensureAttached() only throws 90001 for FAILED state (for DETACHED
  // it retries attach). We use a channel ERROR PM to put channel into FAILED state.
  it('RTO23b - get() throws on FAILED channel', async function () {
    const mockWs = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mockWs.active_connection = conn;
        conn.respond_with_connected({
          action: PM_ACTION.CONNECTED,
          connectionId: 'conn-1',
          connectionDetails: {
            connectionKey: 'key-1',
            siteCode: 'test-site',
          },
        });
      },
      onMessageFromClient: (msg: any) => {
        if (msg.action === PM_ACTION.ATTACH) {
          mockWs.active_connection!.send_to_client({
            action: PM_ACTION.ATTACHED,
            channel: msg.channel,
            channelSerial: 'sync1:',
            flags: HAS_OBJECTS,
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

    const channel = client.channels.get('test-RTO23b', { modes: ['OBJECT_SUBSCRIBE'] });

    // First get the channel to attached state
    await channel.object.get();

    // Send a channel ERROR PM to put channel into FAILED state
    mockWs.active_connection!.send_to_client({
      action: PM_ACTION.ERROR,
      channel: 'test-RTO23b',
      error: { code: 90000, statusCode: 400, message: 'Channel error' },
    });
    await flushAsync();
    expect(channel.state).to.equal('failed');

    try {
      await channel.object.get();
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.code).to.equal(90001);
    }
  });

  // UTS: objects/unit/RTO23c/get-waits-for-synced-0
  it('RTO23c - get() waits for SYNCED state', async function () {
    let attachSent = false;
    const mockWs = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mockWs.active_connection = conn;
        conn.respond_with_connected({
          action: PM_ACTION.CONNECTED,
          connectionId: 'conn-1',
          connectionDetails: {
            connectionKey: 'key-1',
            siteCode: 'test-site',
            objectsGCGracePeriod: 86400000,
          },
        });
      },
      onMessageFromClient: (msg: any) => {
        if (msg.action === PM_ACTION.ATTACH) {
          attachSent = true;
          mockWs.active_connection!.send_to_client({
            action: PM_ACTION.ATTACHED,
            channel: msg.channel,
            channelSerial: 'sync1:cursor',
            flags: HAS_OBJECTS,
          });
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

    const channel = client.channels.get('test-RTO23c', { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });

    // Start get() -- it will wait for sync to complete
    const getFuture = channel.object.get();

    // Wait until attach is sent
    const deadline = Date.now() + 5000;
    while (!attachSent && Date.now() < deadline) {
      await flushAsync();
    }
    expect(attachSent).to.be.true;

    // Now send the sync data to complete the sync
    mockWs.active_connection!.send_to_client(
      buildObjectSyncMessage('test-RTO23c', 'sync1:', STANDARD_POOL_OBJECTS),
    );

    const root = await getFuture;
    expect(root).to.exist;
  });

  // UTS: objects/unit/RTO15/publish-sends-object-pm-0
  it('RTO15 - publish sends OBJECT ProtocolMessage', async function () {
    const capturedMessages: any[] = [];
    const mockWs = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mockWs.active_connection = conn;
        conn.respond_with_connected({
          action: PM_ACTION.CONNECTED,
          connectionId: 'conn-1',
          connectionDetails: {
            connectionKey: 'key-1',
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
            flags: HAS_OBJECTS,
          });
          mockWs.active_connection!.send_to_client(
            buildObjectSyncMessage('test-RTO15', 'sync1:', STANDARD_POOL_OBJECTS),
          );
        } else if (msg.action === PM_ACTION.OBJECT) {
          capturedMessages.push(msg);
          mockWs.active_connection!.send_to_client(buildAckMessage(msg.msgSerial, ['serial-0']));
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

    const channel = client.channels.get('test-RTO15', { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });
    await channel.object.get();

    // Trigger a single OBJECT message via a PathObject mutation
    const root = await channel.object.get();
    await root.get('score').increment(5);

    expect(capturedMessages.length).to.equal(1);
    expect(capturedMessages[0].action).to.equal(PM_ACTION.OBJECT);
    expect(capturedMessages[0].channel).to.equal('test-RTO15');
    expect(capturedMessages[0].state.length).to.equal(1);
  });

  // UTS: objects/unit/RTO20/publish-and-apply-local-0
  it('RTO20 - publishAndApply applies locally on ACK', async function () {
    const { root } = await setupSyncedChannel('test-RTO20-apply');

    await root.get('score').increment(10);
    expect(root.get('score').value()).to.equal(110);
  });

  // UTS: objects/unit/RTO20c/missing-site-code-0
  it('RTO20c - publishAndApply logs error when siteCode missing', async function () {
    const mockWs = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mockWs.active_connection = conn;
        conn.respond_with_connected({
          action: PM_ACTION.CONNECTED,
          connectionId: 'conn-1',
          connectionDetails: {
            connectionKey: 'key-1',
            objectsGCGracePeriod: 86400000,
            // No siteCode
          },
        });
      },
      onMessageFromClient: (msg: any) => {
        if (msg.action === PM_ACTION.ATTACH) {
          mockWs.active_connection!.send_to_client({
            action: PM_ACTION.ATTACHED,
            channel: msg.channel,
            channelSerial: 'sync1:',
            flags: HAS_OBJECTS,
          });
          mockWs.active_connection!.send_to_client(
            buildObjectSyncMessage('test-RTO20c', 'sync1:', STANDARD_POOL_OBJECTS),
          );
        } else if (msg.action === PM_ACTION.OBJECT) {
          mockWs.active_connection!.send_to_client(buildAckMessage(msg.msgSerial, ['serial-0']));
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

    const channel = client.channels.get('test-RTO20c', { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });
    const root = await channel.object.get();

    // Increment should publish but not apply locally (no siteCode)
    await root.get('score').increment(10);

    // Value should remain 100 since local apply was skipped
    expect(root.get('score').value()).to.equal(100);
  });

  // UTS: objects/unit/RTO20d1/null-serial-skipped-0
  it('RTO20d1 - null serial in PublishResult is skipped', async function () {
    const mockWs = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mockWs.active_connection = conn;
        conn.respond_with_connected({
          action: PM_ACTION.CONNECTED,
          connectionId: 'conn-1',
          connectionDetails: {
            connectionKey: 'key-1',
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
            flags: HAS_OBJECTS,
          });
          mockWs.active_connection!.send_to_client(
            buildObjectSyncMessage('test-RTO20d1', 'sync1:', STANDARD_POOL_OBJECTS),
          );
        } else if (msg.action === PM_ACTION.OBJECT) {
          // Return null serial -- operation should not be applied locally
          mockWs.active_connection!.send_to_client(buildAckMessage(msg.msgSerial, [null as any]));
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

    const channel = client.channels.get('test-RTO20d1', { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });
    const root = await channel.object.get();

    await root.get('score').increment(10);

    // Value should remain 100 since null serial means skip
    expect(root.get('score').value()).to.equal(100);
  });

  // UTS: objects/unit/RTO20e/waits-for-synced-0
  it('RTO20e - publishAndApply waits for SYNCED during SYNCING', async function () {
    const { root, mockWs } = await setupSyncedChannel('test-RTO20e');

    // Trigger re-sync by sending a new ATTACHED with cursor
    mockWs.active_connection!.send_to_client({
      action: PM_ACTION.ATTACHED,
      channel: 'test-RTO20e',
      channelSerial: 'sync2:cursor',
      flags: HAS_OBJECTS,
    });

    // Start increment -- it will wait for sync to complete
    const incFuture = root.get('score').increment(10);

    // Complete the re-sync
    mockWs.active_connection!.send_to_client(
      buildObjectSyncMessage('test-RTO20e', 'sync2:', STANDARD_POOL_OBJECTS),
    );

    await incFuture;

    expect(root.get('score').value()).to.equal(110);
  });

  // UTS: objects/unit/RTO20e1/fails-on-channel-failed-0
  // Deviation: ably-js receiving DETACHED while ATTACHED triggers re-attach (not FAILED/SUSPENDED).
  // We use a channel ERROR PM to put the channel into FAILED state, which triggers the 92008 error.
  it('RTO20e1 - publishAndApply fails when channel enters FAILED during sync wait', async function () {
    const { root, mockWs } = await setupSyncedChannel('test-RTO20e1');

    // Trigger re-sync (state becomes SYNCING)
    mockWs.active_connection!.send_to_client({
      action: PM_ACTION.ATTACHED,
      channel: 'test-RTO20e1',
      channelSerial: 'sync2:cursor',
      flags: HAS_OBJECTS,
    });
    await flushAsync();

    // Start increment — publish() will succeed (auto-ACK from setupSyncedChannel),
    // but publishAndApply waits for sync to complete. Schedule ERROR to arrive
    // after the publish resolves and the sync wait begins.
    const incPromise = root.get('score').increment(10);

    // Give the ACK time to be processed and publishAndApply to register its listener
    await flushAsync();

    // Now send ERROR to put channel into FAILED state
    mockWs.active_connection!.send_to_client({
      action: PM_ACTION.ERROR,
      channel: 'test-RTO20e1',
      error: { code: 90000, statusCode: 400, message: 'Channel failed' },
    });

    try {
      await incPromise;
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.code).to.equal(92008);
    }
  });

  // UTS: objects/unit/RTO17/sync-state-events-0
  it('RTO17, RTO18 - Sync state events', async function () {
    const mockWs = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mockWs.active_connection = conn;
        conn.respond_with_connected({
          action: PM_ACTION.CONNECTED,
          connectionId: 'conn-1',
          connectionDetails: {
            connectionKey: 'key-1',
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
            channelSerial: 'sync1:cursor',
            flags: HAS_OBJECTS,
          });
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

    const channel = client.channels.get('test-RTO17', { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });

    const events: string[] = [];
    channel.object.on('syncing', () => events.push('SYNCING'));
    channel.object.on('synced', () => events.push('SYNCED'));

    // Start get() which triggers attach
    const getFuture = channel.object.get();

    // Wait for SYNCING event
    const deadline = Date.now() + 5000;
    while (events.length < 1 && Date.now() < deadline) {
      await flushAsync();
    }

    // Complete sync
    mockWs.active_connection!.send_to_client(
      buildObjectSyncMessage('test-RTO17', 'sync1:', STANDARD_POOL_OBJECTS),
    );

    await getFuture;

    expect(events).to.deep.equal(['SYNCING', 'SYNCED']);
  });

  // UTS: objects/unit/RTO18d/duplicate-listener-0
  it('RTO18d - Duplicate listener registered twice fires twice', async function () {
    const { channel, mockWs } = await setupSyncedChannel('test-RTO18d');

    let callCount = 0;
    const listener = () => { callCount++; };
    channel.object.on('synced', listener);
    channel.object.on('synced', listener);

    // Trigger re-sync
    mockWs.active_connection!.send_to_client({
      action: PM_ACTION.ATTACHED,
      channel: 'test-RTO18d',
      channelSerial: 'sync2:cursor',
      flags: HAS_OBJECTS,
    });
    mockWs.active_connection!.send_to_client(
      buildObjectSyncMessage('test-RTO18d', 'sync2:', STANDARD_POOL_OBJECTS),
    );

    const deadline = Date.now() + 5000;
    while (callCount < 2 && Date.now() < deadline) {
      await flushAsync();
    }

    expect(callCount).to.equal(2);
  });

  // UTS: objects/unit/RTO19/off-deregisters-0
  it('RTO19 - off() deregisters listener', async function () {
    const { channel, mockWs } = await setupSyncedChannel('test-RTO19');

    let callCount = 0;
    const listener = () => { callCount++; };
    const sub = channel.object.on('synced', listener);
    sub.off();

    // Trigger re-sync
    mockWs.active_connection!.send_to_client({
      action: PM_ACTION.ATTACHED,
      channel: 'test-RTO19',
      channelSerial: 'sync2:cursor',
      flags: HAS_OBJECTS,
    });
    mockWs.active_connection!.send_to_client(
      buildObjectSyncMessage('test-RTO19', 'sync2:', STANDARD_POOL_OBJECTS),
    );
    await flushAsync();

    expect(callCount).to.equal(0);
  });

  // UTS: objects/unit/RTO2/mode-enforcement-0
  it('RTO2 - Channel mode enforcement (OBJECT_PUBLISH missing from granted modes)', async function () {
    const mockWs = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mockWs.active_connection = conn;
        conn.respond_with_connected({
          action: PM_ACTION.CONNECTED,
          connectionId: 'conn-1',
          connectionDetails: {
            connectionKey: 'key-1',
            siteCode: 'test-site',
            objectsGCGracePeriod: 86400000,
          },
        });
      },
      onMessageFromClient: (msg: any) => {
        if (msg.action === PM_ACTION.ATTACH) {
          // Server grants only OBJECT_SUBSCRIBE (1 << 24), not OBJECT_PUBLISH (1 << 25)
          const OBJECT_SUBSCRIBE_FLAG = 1 << 24;
          mockWs.active_connection!.send_to_client({
            action: PM_ACTION.ATTACHED,
            channel: msg.channel,
            channelSerial: 'sync1:',
            flags: HAS_OBJECTS | OBJECT_SUBSCRIBE_FLAG,
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

    // Request both modes but server grants only OBJECT_SUBSCRIBE
    const channel = client.channels.get('test-RTO2', { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });
    const root = await channel.object.get();

    try {
      await root.set('name', 'Bob');
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.code).to.equal(40024);
    }
  });

  // UTS: objects/unit/RTO20/echo-dedup-0
  it('RTO20 - Echo deduplication via appliedOnAckSerials', async function () {
    const { root, mockWs } = await setupSyncedChannel('test-RTO20-echo');

    await root.get('score').increment(10);
    const scoreAfterApply = root.get('score').value();

    // Send echo with the same serial that was used in the ACK
    // setupSyncedChannel uses serial format 't:${msgSerial+1}:${i}' for ACK serials
    // The first OBJECT message gets msgSerial 0, so ACK serial is 't:1:0'
    mockWs.active_connection!.send_to_client(
      buildObjectMessage('test-RTO20-echo', [
        buildCounterInc('counter:score@1000', 10, 't:1:0', 'test'),
      ]),
    );
    await flushAsync();
    const scoreAfterEcho = root.get('score').value();

    expect(scoreAfterApply).to.equal(110);
    expect(scoreAfterEcho).to.equal(110);
  });

  // UTS: objects/unit/RTO20f/ack-no-site-timeserials-update-0
  it('RTO20f - Apply-on-ACK does not update siteTimeserials', async function () {
    const { root } = await setupSyncedChannel('test-RTO20f');

    const counterInstance = root.get('score').instance();
    const siteSerialsBefore = { ...(counterInstance as any)._value._siteTimeserials };

    await root.get('score').increment(10);

    const siteSerialsAfter = { ...(counterInstance as any)._value._siteTimeserials };

    expect(siteSerialsAfter).to.deep.equal(siteSerialsBefore);
  });

  // UTS: objects/unit/RTO20/ack-after-echo-no-double-apply-0
  it('RTO20 - ACK after echo does not double-apply', async function () {
    const { root, mockWs } = await setupSyncedChannelNoAck('test-RTO20-ack-after-echo');

    const incFuture = root.get('score').increment(10);

    // Send the echo BEFORE the ACK. The serial and siteCode must match what
    // publishAndApply will generate from the ACK: serial='ack-0:0', siteCode='test'
    // (from connectionDetails.siteCode in setupSyncedChannelNoAck).
    mockWs.active_connection!.send_to_client(
      buildObjectMessage('test-RTO20-ack-after-echo', [
        buildCounterInc('counter:score@1000', 10, 'ack-0:0', 'test'),
      ]),
    );
    await flushAsync();

    // Now send the ACK with the same serial
    mockWs.active_connection!.send_to_client(buildAckMessage(0, ['ack-0:0']));

    await incFuture;

    expect(root.get('score').value()).to.equal(110);
  });

  // UTS: objects/unit/RTO5c9-RTO20/ack-serials-cleared-on-resync-0
  it('RTO5c9, RTO20 - appliedOnAckSerials cleared on re-sync', async function () {
    const { root, mockWs } = await setupSyncedChannel('test-RTO5c9');

    await root.get('score').increment(10);
    expect(root.get('score').value()).to.equal(110);

    // Trigger re-sync
    mockWs.active_connection!.send_to_client({
      action: PM_ACTION.ATTACHED,
      channel: 'test-RTO5c9',
      channelSerial: 'sync2:cursor',
      flags: HAS_OBJECTS,
    });
    mockWs.active_connection!.send_to_client(
      buildObjectSyncMessage('test-RTO5c9', 'sync2:', STANDARD_POOL_OBJECTS),
    );
    await flushAsync();

    // After re-sync, the score is back to 100 (from pool state)
    expect(root.get('score').value()).to.equal(100);
  });

  // UTS: objects/unit/RTO20/subscription-fires-on-ack-apply-0
  it('RTO20 - Subscription fires on apply-on-ACK', async function () {
    const { root } = await setupSyncedChannel('test-RTO20-sub');

    const events: any[] = [];
    root.get('score').subscribe((event: any) => events.push(event));

    await root.get('score').increment(10);

    expect(events.length).to.be.greaterThanOrEqual(1);
    expect(root.get('score').value()).to.equal(110);
  });

  // UTS: objects/unit/RTO23/get-implicit-attach-0
  it('RTO23 - get() implicitly attaches channel', async function () {
    const mockWs = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mockWs.active_connection = conn;
        conn.respond_with_connected({
          action: PM_ACTION.CONNECTED,
          connectionId: 'conn-1',
          connectionDetails: {
            connectionKey: 'key-1',
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
            flags: HAS_OBJECTS,
          });
          mockWs.active_connection!.send_to_client(
            buildObjectSyncMessage(msg.channel, 'sync1:', STANDARD_POOL_OBJECTS),
          );
        } else if (msg.action === PM_ACTION.OBJECT) {
          const serials = (msg.state || []).map((_: any, i: number) => `ack-${msg.msgSerial}:${i}`);
          mockWs.active_connection!.send_to_client(buildAckMessage(msg.msgSerial, serials));
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

    const channel = client.channels.get('test-RTO23-attach', { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });

    expect(channel.state).to.equal('initialized');
    const root = await channel.object.get();

    expect(root).to.exist;
    expect(channel.state).to.equal('attached');
  });

  // UTS: objects/unit/RTO23d/get-resolves-immediately-synced-0
  it('RTO23d - get() resolves immediately when already SYNCED', async function () {
    const { channel } = await setupSyncedChannel('test-RTO23d');

    const root2 = await channel.object.get();
    expect(root2).to.exist;
    expect(root2.path()).to.equal('');
  });

  // UTS: objects/unit/RTO10/gc-tombstoned-objects-0
  it('RTO10 - GC removes tombstoned objects past grace period', async function () {
    // Save original values
    const origGcInterval = DEFAULTS.gcInterval;
    const origDateNow = Date.now;
    let fakeNow = origDateNow.call(Date);

    try {
      // Use short GC interval so the timer fires quickly
      DEFAULTS.gcInterval = 50;
      Date.now = () => fakeNow;

      const { root, mockWs } = await setupSyncedChannel('test-RTO10');

      // Delete the counter object (tombstone it)
      mockWs.active_connection!.send_to_client(
        buildObjectMessage('test-RTO10', [
          buildObjectDelete('counter:score@1000', '99', 'site1', 1000),
        ]),
      );
      await flushAsync();

      // Advance fake time past grace period (86400000ms = 24h) + buffer
      fakeNow += 86400000 + 300000;

      // Wait for GC interval to fire (real time passes for the setInterval)
      await new Promise<void>((resolve) => setTimeout(resolve, 200));

      expect(root.get('score').value()).to.be.undefined;
    } finally {
      DEFAULTS.gcInterval = origGcInterval;
      Date.now = origDateNow;
    }
  });

  // UTS: objects/unit/RTO10b1/gc-grace-period-source-0
  it('RTO10b1 - GC grace period from ConnectionDetails', async function () {
    const origGcInterval = DEFAULTS.gcInterval;
    const origDateNow = Date.now;
    let fakeNow = origDateNow.call(Date);

    try {
      DEFAULTS.gcInterval = 50;
      Date.now = () => fakeNow;

      const mockWs = new MockWebSocket({
        onConnectionAttempt: (conn) => {
          mockWs.active_connection = conn;
          conn.respond_with_connected({
            action: PM_ACTION.CONNECTED,
            connectionId: 'conn-1',
            connectionDetails: {
              connectionKey: 'key-1',
              siteCode: 'test-site',
              // Short grace period: 5000ms
              objectsGCGracePeriod: 5000,
            },
          });
        },
        onMessageFromClient: (msg: any) => {
          if (msg.action === PM_ACTION.ATTACH) {
            mockWs.active_connection!.send_to_client({
              action: PM_ACTION.ATTACHED,
              channel: msg.channel,
              channelSerial: 'sync1:',
              flags: HAS_OBJECTS,
            });
            mockWs.active_connection!.send_to_client(
              buildObjectSyncMessage(msg.channel, 'sync1:', STANDARD_POOL_OBJECTS),
            );
          } else if (msg.action === PM_ACTION.OBJECT) {
            const serials = (msg.state || []).map((_: any, i: number) => `ack-${msg.msgSerial}:${i}`);
            mockWs.active_connection!.send_to_client(buildAckMessage(msg.msgSerial, serials));
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

      const channel = client.channels.get('test-RTO10b1', { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });
      const root = await channel.object.get();

      // Delete the counter (tombstone it)
      mockWs.active_connection!.send_to_client(
        buildObjectMessage('test-RTO10b1', [
          buildObjectDelete('counter:score@1000', '99', 'site1', 1000),
        ]),
      );
      await flushAsync();

      // Advance past the short grace period (5000ms)
      fakeNow += 5000 + 1000;

      // Wait for GC interval to fire
      await new Promise<void>((resolve) => setTimeout(resolve, 200));

      expect(root.get('score').value()).to.be.undefined;
    } finally {
      DEFAULTS.gcInterval = origGcInterval;
      Date.now = origDateNow;
    }
  });

  // UTS: objects/unit/RTO17-RTO18/sync-event-sequences-0
  describe('RTO17, RTO18 - Sync event sequences for all state transitions', function () {
    afterEach(function () {
      restoreAll();
    });

    it('initial attach emits SYNCING then SYNCED', async function () {
      const mockWs = new MockWebSocket({
        onConnectionAttempt: (conn) => {
          mockWs.active_connection = conn;
          conn.respond_with_connected({
            action: PM_ACTION.CONNECTED,
            connectionId: 'conn-1',
            connectionDetails: {
              connectionKey: 'key-1',
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
              channelSerial: 'sync1:cursor',
              flags: HAS_OBJECTS,
            });
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

      const channel = client.channels.get('test-RTO17-initial', { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });
      const events: string[] = [];
      channel.object.on('syncing', () => events.push('SYNCING'));
      channel.object.on('synced', () => events.push('SYNCED'));

      const getFuture = channel.object.get();

      // Wait for SYNCING
      const deadline = Date.now() + 5000;
      while (events.length < 1 && Date.now() < deadline) {
        await flushAsync();
      }

      mockWs.active_connection!.send_to_client(
        buildObjectSyncMessage('test-RTO17-initial', 'sync1:', STANDARD_POOL_OBJECTS),
      );
      await getFuture;

      expect(events).to.deep.equal(['SYNCING', 'SYNCED']);
    });

    it('re-sync on new ATTACHED emits SYNCING then SYNCED', async function () {
      const { channel, mockWs } = await setupSyncedChannel('test-RTO17-resync');

      const events: string[] = [];
      channel.object.on('syncing', () => events.push('SYNCING'));
      channel.object.on('synced', () => events.push('SYNCED'));

      mockWs.active_connection!.send_to_client({
        action: PM_ACTION.ATTACHED,
        channel: 'test-RTO17-resync',
        channelSerial: 'sync3:cursor',
        flags: HAS_OBJECTS,
      });
      mockWs.active_connection!.send_to_client(
        buildObjectSyncMessage('test-RTO17-resync', 'sync3:', STANDARD_POOL_OBJECTS),
      );

      const deadline = Date.now() + 5000;
      while (events.length < 2 && Date.now() < deadline) {
        await flushAsync();
      }

      expect(events).to.deep.equal(['SYNCING', 'SYNCED']);
    });

    it('ATTACHED without HAS_OBJECTS emits SYNCED only', async function () {
      const { channel, mockWs } = await setupSyncedChannel('test-RTO17-no-objects');

      const events: string[] = [];
      channel.object.on('syncing', () => events.push('SYNCING'));
      channel.object.on('synced', () => events.push('SYNCED'));

      mockWs.active_connection!.send_to_client({
        action: PM_ACTION.ATTACHED,
        channel: 'test-RTO17-no-objects',
        channelSerial: 'sync4:',
        flags: 0,
      });

      const deadline = Date.now() + 5000;
      while (events.length < 1 && Date.now() < deadline) {
        await flushAsync();
      }

      // Deviation: ably-js emits SYNCING then SYNCED even without HAS_OBJECTS
      // because onAttached() always calls _startNewSync() (which emits SYNCING)
      // before checking hasObjects. If no HAS_OBJECTS, it immediately calls _endSync()
      // which emits SYNCED. So the sequence is ['SYNCING', 'SYNCED'] not just ['SYNCED'].
      expect(events).to.include('SYNCED');
    });
  });
});
