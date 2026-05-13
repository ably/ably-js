/**
 * Standard test pool and helpers for LiveObjects UTS tests.
 *
 * Source: uts/objects/helpers/standard_test_pool.md
 *
 * Provides builder functions for constructing protocol/object messages,
 * a standard fixture tree (STANDARD_POOL_OBJECTS), and setupSyncedChannel
 * for mock WebSocket tests.
 */

import { MockWebSocket } from '../../mock_websocket';
import { Ably, installMockWebSocket, trackClient, flushAsync } from '../../helpers';
import * as LiveObjectsPlugin from '../../../../src/plugins/liveobjects';

// --- Protocol message action constants ---

export const PM_ACTION = {
  ACK: 1,
  CONNECTED: 4,
  ERROR: 9,
  ATTACH: 10,
  ATTACHED: 11,
  DETACHED: 13,
  OBJECT: 19,
  OBJECT_SYNC: 20,
} as const;

export const HAS_OBJECTS = 1 << 7; // 128

// --- Object operation action constants (numeric wire values) ---

export const OBJ_OP = {
  MAP_CREATE: 0,
  MAP_SET: 1,
  MAP_REMOVE: 2,
  COUNTER_CREATE: 3,
  COUNTER_INC: 4,
  OBJECT_DELETE: 5,
  MAP_CLEAR: 6,
} as const;

// LWW semantics (numeric)
export const MAP_SEMANTICS_LWW = 0;

// --- Protocol message builders ---

export function buildObjectSyncMessage(channel: string, channelSerial: string, objectMessages: any[]) {
  return {
    action: PM_ACTION.OBJECT_SYNC,
    channel,
    channelSerial,
    state: objectMessages,
  };
}

export function buildObjectMessage(channel: string, objectMessages: any[]) {
  return {
    action: PM_ACTION.OBJECT,
    channel,
    state: objectMessages,
  };
}

export function buildAckMessage(msgSerial: number, serials: string[]) {
  return {
    action: PM_ACTION.ACK,
    msgSerial,
    count: 1,
    res: [{ serials }],
  };
}

// --- ObjectMessage builders (operations) ---

export function buildCounterInc(objectId: string, amount: number, serial: string, siteCode: string) {
  return {
    serial,
    siteCode,
    operation: {
      action: OBJ_OP.COUNTER_INC,
      objectId,
      counterInc: { number: amount },
    },
  };
}

export function buildMapSet(objectId: string, key: string, value: any, serial: string, siteCode: string) {
  return {
    serial,
    siteCode,
    operation: {
      action: OBJ_OP.MAP_SET,
      objectId,
      mapSet: { key, value },
    },
  };
}

export function buildMapRemove(
  objectId: string,
  key: string,
  serial: string,
  siteCode: string,
  serialTimestamp?: number,
) {
  return {
    serial,
    siteCode,
    ...(serialTimestamp != null ? { serialTimestamp } : {}),
    operation: {
      action: OBJ_OP.MAP_REMOVE,
      objectId,
      mapRemove: { key },
    },
  };
}

export function buildMapClear(objectId: string, serial: string, siteCode: string) {
  return {
    serial,
    siteCode,
    operation: {
      action: OBJ_OP.MAP_CLEAR,
      objectId,
      mapClear: {},
    },
  };
}

export function buildObjectDelete(objectId: string, serial: string, siteCode: string, serialTimestamp?: number) {
  return {
    serial,
    siteCode,
    ...(serialTimestamp != null ? { serialTimestamp } : {}),
    operation: {
      action: OBJ_OP.OBJECT_DELETE,
      objectId,
      objectDelete: {},
    },
  };
}

export function buildCounterCreate(objectId: string, counterCreate: { count: number }, serial: string, siteCode: string) {
  return {
    serial,
    siteCode,
    operation: {
      action: OBJ_OP.COUNTER_CREATE,
      objectId,
      counterCreate,
    },
  };
}

export function buildMapCreate(
  objectId: string,
  mapCreate: { semantics: number; entries: Record<string, any> },
  serial: string,
  siteCode: string,
) {
  return {
    serial,
    siteCode,
    operation: {
      action: OBJ_OP.MAP_CREATE,
      objectId,
      mapCreate,
    },
  };
}

// --- ObjectMessage builder (state — for OBJECT_SYNC) ---

export function buildObjectState(
  objectId: string,
  siteTimeserials: Record<string, string>,
  opts: {
    map?: { semantics: number; entries: Record<string, any>; clearTimeserial?: string };
    counter?: { count: number };
    tombstone?: boolean;
    createOp?: any;
  },
) {
  const state: any = {
    objectId,
    siteTimeserials,
    tombstone: opts.tombstone === true,
  };
  if (opts.map != null) state.map = opts.map;
  if (opts.counter != null) state.counter = opts.counter;
  if (opts.createOp != null) state.createOp = opts.createOp;
  return { object: state };
}

// --- Standard test pool fixtures ---

export const STANDARD_POOL_OBJECTS = [
  buildObjectState('root', { aaa: 't:0' }, {
    map: {
      semantics: MAP_SEMANTICS_LWW,
      entries: {
        name: { data: { string: 'Alice' }, timeserial: 't:0' },
        age: { data: { number: 30 }, timeserial: 't:0' },
        active: { data: { boolean: true }, timeserial: 't:0' },
        score: { data: { objectId: 'counter:score@1000' }, timeserial: 't:0' },
        profile: { data: { objectId: 'map:profile@1000' }, timeserial: 't:0' },
        data: { data: { json: JSON.stringify({ tags: ['a', 'b'] }) }, timeserial: 't:0' },
        avatar: { data: { bytes: 'AQID' }, timeserial: 't:0' },
      },
    },
    createOp: {
      action: OBJ_OP.MAP_CREATE,
      objectId: 'root',
      mapCreate: { semantics: MAP_SEMANTICS_LWW, entries: {} },
    },
  }),
  buildObjectState('counter:score@1000', { aaa: 't:0' }, {
    counter: { count: 0 },
    createOp: {
      action: OBJ_OP.COUNTER_CREATE,
      objectId: 'counter:score@1000',
      counterCreate: { count: 100 },
    },
  }),
  buildObjectState('map:profile@1000', { aaa: 't:0' }, {
    map: {
      semantics: MAP_SEMANTICS_LWW,
      entries: {
        email: { data: { string: 'alice@example.com' }, timeserial: 't:0' },
        nested_counter: { data: { objectId: 'counter:nested@1000' }, timeserial: 't:0' },
        prefs: { data: { objectId: 'map:prefs@1000' }, timeserial: 't:0' },
      },
    },
    createOp: {
      action: OBJ_OP.MAP_CREATE,
      objectId: 'map:profile@1000',
      mapCreate: { semantics: MAP_SEMANTICS_LWW, entries: {} },
    },
  }),
  buildObjectState('counter:nested@1000', { aaa: 't:0' }, {
    counter: { count: 0 },
    createOp: {
      action: OBJ_OP.COUNTER_CREATE,
      objectId: 'counter:nested@1000',
      counterCreate: { count: 5 },
    },
  }),
  buildObjectState('map:prefs@1000', { aaa: 't:0' }, {
    map: {
      semantics: MAP_SEMANTICS_LWW,
      entries: {
        theme: { data: { string: 'dark' }, timeserial: 't:0' },
      },
    },
    createOp: {
      action: OBJ_OP.MAP_CREATE,
      objectId: 'map:prefs@1000',
      mapCreate: { semantics: MAP_SEMANTICS_LWW, entries: {} },
    },
  }),
];

// --- Synced channel setup ---

export interface SyncedChannelResult {
  client: InstanceType<typeof Ably.Realtime>;
  channel: any;
  root: any;
  mockWs: MockWebSocket;
}

export async function setupSyncedChannel(channelName: string): Promise<SyncedChannelResult> {
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

  return { client, channel, root, mockWs };
}

export async function setupSyncedChannelNoAck(channelName: string): Promise<SyncedChannelResult> {
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

  return { client, channel, root, mockWs };
}
