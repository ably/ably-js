/**
 * UTS: Batch API Tests
 *
 * Spec points: RTPO22, RTINS19, RTBC1-RTBC16
 * Source: uts/objects/unit/batch.md
 *
 * Tests batch operations: grouping multiple writes into a single protocol
 * message, BatchContext read/write methods, memoization, flush, and
 * closed-batch error handling.
 *
 * Deviations:
 * - RTBC3: `ctx.id` is a getter property, not a method (matches ably-js implementation).
 * - RTBC6/RTBC9: Standard pool has 7 entries, not 6 as in UTS spec.
 *   Root entries: name, age, active, score, profile, data, avatar.
 * - RTBC4: `ctx.get()` returns `undefined` for nonexistent key, not `null`.
 * - Operation action in captured messages uses numeric wire values (OBJ_OP),
 *   not string names as shown in the UTS spec pseudo-code.
 */

import { expect } from 'chai';
import { restoreAll, flushAsync, Ably, installMockWebSocket, trackClient } from '../../helpers';
import { MockWebSocket } from '../../mock_websocket';
import {
  setupSyncedChannel,
  buildObjectSyncMessage,
  buildAckMessage,
  PM_ACTION,
  HAS_OBJECTS,
  OBJ_OP,
  STANDARD_POOL_OBJECTS,
} from '../helpers/standard_test_pool';
import * as LiveObjectsPlugin from '../../../../src/plugins/liveobjects';

/**
 * Helper: set up a synced channel with message capture.
 * Returns the captured OBJECT messages array alongside the standard result.
 */
async function setupSyncedChannelWithCapture(channelName: string) {
  const capturedMessages: any[] = [];

  const mockWs = new MockWebSocket({
    onConnectionAttempt: (conn) => {
      mockWs.active_connection = conn;
      conn.respond_with_connected({
        action: PM_ACTION.CONNECTED,
        connectionId: 'conn-1',
        connectionDetails: {
          connectionKey: 'conn-key-1',
          connectionStateTtl: 120000,
          maxIdleInterval: 15000,
          maxMessageSize: 65536,
          serverId: 'test-server',
          clientId: null,
          siteCode: 'test',
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
        capturedMessages.push(msg);
        const serials = (msg.state || []).map((_: any, i: number) => `t:${msg.msgSerial + 1}:${i}`);
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

  const channel = client.channels.get(channelName, { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });
  const root = await channel.object.get();

  return { client, channel, root, mockWs, capturedMessages };
}

describe('uts/objects/unit/batch', function () {
  afterEach(function () {
    restoreAll();
  });

  // --- RTPO22: PathObject#batch resolves path and executes fn ---

  // UTS: objects/unit/RTPO22/batch-resolves-and-executes-0
  it('RTPO22 - PathObject#batch resolves path and executes fn', async function () {
    const { root, capturedMessages } = await setupSyncedChannelWithCapture('test-RTPO22');

    await root.batch((ctx: any) => {
      ctx.set('name', 'Bob');
      ctx.set('age', 31);
    });

    expect(capturedMessages).to.have.length(1);
    expect(capturedMessages[0].state).to.have.length(2);
    expect(capturedMessages[0].state[0].operation.action).to.equal(OBJ_OP.MAP_SET);
    expect(capturedMessages[0].state[0].operation.mapSet.key).to.equal('name');
    expect(capturedMessages[0].state[1].operation.action).to.equal(OBJ_OP.MAP_SET);
    expect(capturedMessages[0].state[1].operation.mapSet.key).to.equal('age');
  });

  // --- RTPO22c: PathObject#batch on unresolvable path throws error ---

  // UTS: objects/unit/RTPO22c/batch-unresolvable-throws-0
  // Deviation: UTS spec says 92007, but ably-js throws 92005 because path resolution
  // fails before the batch "not a LiveObject" check. Error 92005 = path resolution
  // failure; 92007 = resolved value is not a LiveObject.
  it('RTPO22c - PathObject#batch on unresolvable path throws 92005', async function () {
    const { root } = await setupSyncedChannel('test-RTPO22c');

    try {
      await root.get('nonexistent').get('deep').batch((ctx: any) => {});
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.code).to.equal(92005);
    }
  });

  // --- RTINS19: Instance#batch resolves and executes fn ---

  // UTS: objects/unit/RTINS19/batch-instance-executes-0
  it('RTINS19 - Instance#batch resolves and executes fn', async function () {
    const { root, capturedMessages } = await setupSyncedChannelWithCapture('test-RTINS19');

    const instance = root.instance();
    await instance.batch((ctx: any) => {
      ctx.set('name', 'Charlie');
      ctx.remove('age');
    });

    expect(capturedMessages).to.have.length(1);
    expect(capturedMessages[0].state).to.have.length(2);
    expect(capturedMessages[0].state[0].operation.action).to.equal(OBJ_OP.MAP_SET);
    expect(capturedMessages[0].state[1].operation.action).to.equal(OBJ_OP.MAP_REMOVE);
  });

  // --- RTINS19c: Instance#batch on non-LiveObject throws 92007 ---

  // UTS: objects/unit/RTINS19c/batch-non-live-object-throws-0
  it('RTINS19c - Instance#batch on non-LiveObject throws 92007', async function () {
    const { root } = await setupSyncedChannel('test-RTINS19c');

    const nameInst = root.instance().get('name');
    try {
      await nameInst.batch((ctx: any) => {});
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.code).to.equal(92007);
    }
  });

  // --- RTBC3: BatchContext#id returns objectId ---

  // UTS: objects/unit/RTBC3/id-returns-objectid-0
  // Deviation: `ctx.id` is a getter property, not a method.
  it('RTBC3 - BatchContext#id returns objectId', async function () {
    const { root } = await setupSyncedChannel('test-RTBC3');

    let receivedId: string | undefined;
    await root.batch((ctx: any) => {
      receivedId = ctx.id;
    });

    expect(receivedId).to.equal('root');
  });

  // --- RTBC5: BatchContext#value delegates to Instance#value ---

  // UTS: objects/unit/RTBC5/value-delegates-0
  it('RTBC5 - BatchContext#value delegates to Instance#value', async function () {
    const { root } = await setupSyncedChannel('test-RTBC5');

    let receivedValue: any;
    await root.get('score').batch((ctx: any) => {
      receivedValue = ctx.value();
    });

    expect(receivedValue).to.equal(100);
  });

  // --- RTBC4: BatchContext#get wraps result via wrapInstance ---

  // UTS: objects/unit/RTBC4/get-wraps-instance-0
  // Deviation: `child.id` is a getter property, not a method.
  it('RTBC4 - BatchContext#get wraps result via wrapInstance', async function () {
    const { root } = await setupSyncedChannel('test-RTBC4');

    let childId: string | undefined;
    await root.batch((ctx: any) => {
      const child = ctx.get('score');
      childId = child.id;
    });

    expect(childId).to.equal('counter:score@1000');
  });

  // --- RTBC4: BatchContext#get returns undefined for nonexistent key ---

  // UTS: objects/unit/RTBC4/get-null-nonexistent-0
  // Deviation: returns `undefined`, not `null` (JavaScript convention).
  it('RTBC4 - BatchContext#get returns undefined for nonexistent key', async function () {
    const { root } = await setupSyncedChannel('test-RTBC4-null');

    let result: any = 'not_null';
    await root.batch((ctx: any) => {
      result = ctx.get('nonexistent');
    });

    expect(result).to.be.undefined;
  });

  // --- RTBC6: BatchContext#entries yields [key, BatchContext] pairs ---

  // UTS: objects/unit/RTBC6/entries-yields-pairs-0
  // Deviation: Standard pool has 7 entries, not 6.
  it('RTBC6 - BatchContext#entries yields [key, BatchContext] pairs', async function () {
    const { root } = await setupSyncedChannel('test-RTBC6');

    const keys: string[] = [];
    await root.batch((ctx: any) => {
      for (const [key] of ctx.entries()) {
        keys.push(key as string);
      }
    });

    expect(keys).to.have.length(7);
    expect(keys).to.include('name');
    expect(keys).to.include('score');
  });

  // --- RTBC9: BatchContext#size delegates to Instance#size ---

  // UTS: objects/unit/RTBC9/size-delegates-0
  // Deviation: Standard pool root has 7 entries, not 6.
  it('RTBC9 - BatchContext#size delegates to Instance#size', async function () {
    const { root } = await setupSyncedChannel('test-RTBC9');

    let receivedSize: number | undefined;
    await root.batch((ctx: any) => {
      receivedSize = ctx.size();
    });

    expect(receivedSize).to.equal(7);
  });

  // --- RTBC10: BatchContext#compact delegates to Instance#compact ---

  // UTS: objects/unit/RTBC10/compact-delegates-0
  it('RTBC10 - BatchContext#compact delegates to Instance#compact', async function () {
    const { root } = await setupSyncedChannel('test-RTBC10');

    let result: any;
    await root.batch((ctx: any) => {
      result = ctx.compact();
    });

    expect(result['name']).to.equal('Alice');
    expect(result['score']).to.equal(100);
  });

  // --- RTBC12: BatchContext#set queues MAP_SET message ---

  // UTS: objects/unit/RTBC12/set-queues-map-set-0
  it('RTBC12 - BatchContext#set queues MAP_SET message', async function () {
    const { root, capturedMessages } = await setupSyncedChannelWithCapture('test-RTBC12');

    await root.batch((ctx: any) => {
      ctx.set('name', 'Bob');
    });

    expect(capturedMessages).to.have.length(1);
    const objMsg = capturedMessages[0].state[0];
    expect(objMsg.operation.action).to.equal(OBJ_OP.MAP_SET);
    expect(objMsg.operation.objectId).to.equal('root');
    expect(objMsg.operation.mapSet.key).to.equal('name');
    expect(objMsg.operation.mapSet.value.string).to.equal('Bob');
  });

  // --- RTBC12c: BatchContext#set on non-LiveMap throws 92007 ---

  // UTS: objects/unit/RTBC12c/set-non-map-throws-0
  it('RTBC12c - BatchContext#set on non-LiveMap throws 92007', async function () {
    const { root } = await setupSyncedChannel('test-RTBC12c');

    try {
      await root.get('score').batch((ctx: any) => {
        ctx.set('key', 'value');
      });
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.code).to.equal(92007);
    }
  });

  // --- RTBC13: BatchContext#remove queues MAP_REMOVE message ---

  // UTS: objects/unit/RTBC13/remove-queues-map-remove-0
  it('RTBC13 - BatchContext#remove queues MAP_REMOVE message', async function () {
    const { root, capturedMessages } = await setupSyncedChannelWithCapture('test-RTBC13');

    await root.batch((ctx: any) => {
      ctx.remove('name');
    });

    expect(capturedMessages).to.have.length(1);
    const objMsg = capturedMessages[0].state[0];
    expect(objMsg.operation.action).to.equal(OBJ_OP.MAP_REMOVE);
    expect(objMsg.operation.objectId).to.equal('root');
    expect(objMsg.operation.mapRemove.key).to.equal('name');
  });

  // --- RTBC14: BatchContext#increment queues COUNTER_INC message ---

  // UTS: objects/unit/RTBC14/increment-queues-counter-inc-0
  it('RTBC14 - BatchContext#increment queues COUNTER_INC message', async function () {
    const { root, capturedMessages } = await setupSyncedChannelWithCapture('test-RTBC14');

    await root.get('score').batch((ctx: any) => {
      ctx.increment(25);
    });

    expect(capturedMessages).to.have.length(1);
    const objMsg = capturedMessages[0].state[0];
    expect(objMsg.operation.action).to.equal(OBJ_OP.COUNTER_INC);
    expect(objMsg.operation.objectId).to.equal('counter:score@1000');
    expect(objMsg.operation.counterInc.number).to.equal(25);
  });

  // --- RTBC14c: BatchContext#increment on non-LiveCounter throws 92007 ---

  // UTS: objects/unit/RTBC14c/increment-non-counter-throws-0
  it('RTBC14c - BatchContext#increment on non-LiveCounter throws 92007', async function () {
    const { root } = await setupSyncedChannel('test-RTBC14c');

    try {
      await root.batch((ctx: any) => {
        ctx.increment(5);
      });
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.code).to.equal(92007);
    }
  });

  // --- RTBC15: BatchContext#decrement delegates to increment with negated amount ---

  // UTS: objects/unit/RTBC15/decrement-negates-0
  it('RTBC15 - BatchContext#decrement delegates to increment with negated amount', async function () {
    const { root, capturedMessages } = await setupSyncedChannelWithCapture('test-RTBC15');

    await root.get('score').batch((ctx: any) => {
      ctx.decrement(10);
    });

    expect(capturedMessages).to.have.length(1);
    const objMsg = capturedMessages[0].state[0];
    expect(objMsg.operation.action).to.equal(OBJ_OP.COUNTER_INC);
    expect(objMsg.operation.counterInc.number).to.equal(-10);
  });

  // --- RTBC16c: wrapInstance memoizes by objectId ---

  // UTS: objects/unit/RTBC16c/wrap-instance-memoized-0
  it('RTBC16c - wrapInstance memoizes by objectId', async function () {
    const { root } = await setupSyncedChannel('test-RTBC16c');

    let sameRef = false;
    await root.batch((ctx: any) => {
      const child1 = ctx.get('score');
      const child2 = ctx.get('score');
      sameRef = child1 === child2;
    });

    expect(sameRef).to.be.true;
  });

  // --- RTBC16d: flush publishes via RTO15 (publish, not publishAndApply) ---

  // UTS: objects/unit/RTBC16d/flush-uses-publish-0
  it('RTBC16d - flush publishes all operations as a single OBJECT message', async function () {
    const { root, capturedMessages } = await setupSyncedChannelWithCapture('test-RTBC16d');

    await root.batch((ctx: any) => {
      ctx.set('name', 'Bob');
      ctx.set('age', 31);
      const child = ctx.get('score');
      child.increment(50);
    });

    // All operations published as a single OBJECT message
    expect(capturedMessages).to.have.length(1);
    expect(capturedMessages[0].state).to.have.length(3);
    expect(capturedMessages[0].state[0].operation.action).to.equal(OBJ_OP.MAP_SET);
    expect(capturedMessages[0].state[1].operation.action).to.equal(OBJ_OP.MAP_SET);
    expect(capturedMessages[0].state[2].operation.action).to.equal(OBJ_OP.COUNTER_INC);
  });

  // --- RTBC16d: flush with no queued messages does not publish ---

  // UTS: objects/unit/RTBC16d/flush-empty-no-publish-0
  it('RTBC16d - flush with no queued messages does not publish', async function () {
    const { root, capturedMessages } = await setupSyncedChannelWithCapture('test-RTBC16d-empty');

    await root.batch((ctx: any) => {
      // Read-only: no writes queued
      ctx.value();
      ctx.size();
    });

    expect(capturedMessages).to.have.length(0);
  });

  // --- RTBC16e: closed batch throws 40000 on any method call ---

  // UTS: objects/unit/RTBC16e/closed-batch-throws-0
  it('RTBC16e - closed batch throws 40000 on write method', async function () {
    const { root } = await setupSyncedChannel('test-RTBC16e');

    let savedCtx: any = null;
    await root.batch((ctx: any) => {
      savedCtx = ctx;
    });

    try {
      savedCtx.set('name', 'Bob');
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.code).to.equal(40000);
    }
  });

  // --- RTBC16e: closed batch read methods also throw 40000 ---

  // UTS: objects/unit/RTBC16e/closed-batch-read-throws-0
  it('RTBC16e - closed batch read methods also throw 40000', async function () {
    const { root } = await setupSyncedChannel('test-RTBC16e-read');

    let savedCtx: any = null;
    await root.batch((ctx: any) => {
      savedCtx = ctx;
    });

    // id is a getter property
    try {
      const _ = savedCtx.id;
      expect.fail('id should have thrown');
    } catch (err: any) {
      expect(err.code).to.equal(40000);
    }

    try {
      savedCtx.value();
      expect.fail('value() should have thrown');
    } catch (err: any) {
      expect(err.code).to.equal(40000);
    }

    try {
      savedCtx.size();
      expect.fail('size() should have thrown');
    } catch (err: any) {
      expect(err.code).to.equal(40000);
    }
  });

  // --- RTPO22g: RootBatchContext closed after flush regardless of success ---

  // UTS: objects/unit/RTPO22g/closed-after-flush-0
  it('RTPO22g - RootBatchContext closed after flush regardless of success', async function () {
    const { root } = await setupSyncedChannel('test-RTPO22g');

    let savedCtx: any = null;
    await root.batch((ctx: any) => {
      savedCtx = ctx;
      ctx.set('name', 'Bob');
    });

    try {
      savedCtx.set('age', 99);
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.code).to.equal(40000);
    }
  });

  // --- RTPO22b: PathObject#batch requires OBJECT_PUBLISH mode ---

  // UTS: objects/unit/RTPO22b/batch-requires-publish-mode-0
  it('RTPO22b - PathObject#batch requires OBJECT_PUBLISH mode', async function () {
    // Custom setup: ATTACHED message only grants OBJECT_SUBSCRIBE, not OBJECT_PUBLISH
    const OBJECT_SUBSCRIBE_FLAG = 1 << 24;

    const mockWs = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mockWs.active_connection = conn;
        conn.respond_with_connected({
          action: PM_ACTION.CONNECTED,
          connectionId: 'conn-1',
          connectionDetails: {
            connectionKey: 'conn-key-1',
            connectionStateTtl: 120000,
            maxIdleInterval: 15000,
            maxMessageSize: 65536,
            serverId: 'test-server',
            clientId: null,
            siteCode: 'test',
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

    const channel = client.channels.get('test-RTPO22b', { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] });
    const root = await channel.object.get();

    try {
      await root.batch((ctx: any) => {
        ctx.set('name', 'Bob');
      });
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.code).to.equal(40024);
    }
  });
});
