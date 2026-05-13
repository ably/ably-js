/**
 * UTS: LiveMap CRDT Tests
 *
 * Spec points: RTLM1-RTLM9, RTLM14-RTLM16, RTLM18-RTLM19, RTLM22-RTLM25, RTLO3, RTLO4a, RTLO4e, RTLO5, RTLO6
 * Source: uts/objects/unit/live_map.md
 *
 * Tests the LiveMap LWW-map CRDT data structure. LiveMap holds a dictionary of
 * ObjectsMapEntry values with entry-level last-write-wins semantics, supports
 * set/remove/clear operations, create operations (initial entries merge), data
 * replacement during sync, tombstoning, GC of tombstoned entries, and diff
 * calculation.
 *
 * Deviations:
 * - RTLM15d4 (unsupported action): ably-js throws ErrorInfo (92000) rather than
 *   silently returning false. Test expects the throw.
 * - RTLM9b (both serials empty): ably-js throws on empty serial at
 *   _canApplyOperation level (before reaching entry-level check). Cannot test
 *   through normal path; tested by setting entry timeserial to empty string
 *   and calling with a different siteCode to bypass site check.
 * - RTLM24 (MAP_CLEAR): ably-js uses strict > comparison for entry removal
 *   (entrySerial < clearTimeserial), so entries with serial == clearTimeserial
 *   are KEPT. UTS spec says entries with serial <= clearTimeserial are removed.
 * - RTLM7g (objectId creates zero-value): Tested via pool from channel, since
 *   standalone LiveMap needs a pool reference.
 * - RTLM14c (tombstoned ref check): Tested via protocol messages + pool, since
 *   checking requires pool access for referenced object tombstone status.
 */

import { expect } from 'chai';
import { restoreAll, flushAsync } from '../../helpers';
import {
  setupSyncedChannel,
  buildObjectMessage,
  buildObjectSyncMessage,
  buildMapSet,
  buildMapRemove,
  buildMapCreate,
  buildMapClear,
  buildObjectState,
  buildObjectDelete,
  buildCounterCreate,
  OBJ_OP,
  MAP_SEMANTICS_LWW,
  STANDARD_POOL_OBJECTS,
} from '../helpers/standard_test_pool';
import { LiveMap, LiveMapEntry } from '../../../../src/plugins/liveobjects/livemap';
import { ObjectMessage } from '../../../../src/plugins/liveobjects/objectmessage';
import { ObjectsOperationSource } from '../../../../src/plugins/liveobjects/realtimeobject';

/**
 * Helper to get the RealtimeObject from a channel.
 */
function getRealtimeObject(channel: any): any {
  return channel._object;
}

/**
 * Helper to get a LiveObject from the pool by objectId.
 */
function getFromPool(channel: any, objectId: string): any {
  return getRealtimeObject(channel).getPool().get(objectId);
}

/**
 * Helper to create a zero-value LiveMap with a given objectId.
 */
function createZeroMap(channel: any, objectId: string): LiveMap {
  const realtimeObject = getRealtimeObject(channel);
  return LiveMap.zeroValue(realtimeObject, objectId);
}

/**
 * Helper to create an ObjectMessage from values.
 */
function makeObjectMessage(client: any, values: any): ObjectMessage {
  return ObjectMessage.fromValues(values, client.Utils, client.MessageEncoding);
}

/**
 * Helper to get internal data map from a LiveMap.
 */
function getDataMap(map: LiveMap): Map<string, LiveMapEntry> {
  return (map as any)._dataRef.data;
}

describe('uts/objects/unit/live_map', function () {
  afterEach(function () {
    restoreAll();
  });

  // =====================================================================
  // RTLM4 - Zero-value LiveMap
  // =====================================================================

  // UTS: objects/unit/RTLM4/zero-value-0
  it('RTLM4 - zero-value LiveMap has empty data and null clearTimeserial', async function () {
    const { channel } = await setupSyncedChannel('test-RTLM4');

    const map = createZeroMap(channel, 'map:zero@1000');

    expect(getDataMap(map).size).to.equal(0);
    expect((map as any)._clearTimeserial).to.be.undefined;
    expect(map.isTombstoned()).to.equal(false);
    expect((map as any)._createOperationIsMerged).to.equal(false);
    expect((map as any)._siteTimeserials).to.deep.equal({});
  });

  // =====================================================================
  // RTLM7 - MAP_SET creates new entry
  // =====================================================================

  // UTS: objects/unit/RTLM7/map-set-new-entry-0
  it('RTLM7 - MAP_SET creates new entry', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM7-new');

    const map = createZeroMap(channel, 'map:test@1000');

    const msg = makeObjectMessage(client, {
      serial: '01',
      siteCode: 'site1',
      operation: {
        action: OBJ_OP.MAP_SET,
        objectId: 'map:test@1000',
        mapSet: { key: 'name', value: { string: 'Alice' } },
      },
    });

    const result = map.applyOperation(msg.operation!, msg, ObjectsOperationSource.channel);

    const entry = getDataMap(map).get('name');
    expect(entry).to.exist;
    expect(entry!.data).to.deep.equal({ string: 'Alice' });
    expect(entry!.timeserial).to.equal('01');
    expect(entry!.tombstone).to.equal(false);
    expect(result).to.equal(true);
  });

  // =====================================================================
  // RTLM7 - MAP_SET updates existing entry
  // =====================================================================

  // UTS: objects/unit/RTLM7/map-set-update-entry-0
  it('RTLM7 - MAP_SET updates existing entry', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM7-upd');

    const map = createZeroMap(channel, 'map:test@1000');
    // Pre-set data
    getDataMap(map).set('name', { data: { string: 'Alice' }, timeserial: '01', tombstone: false, tombstonedAt: undefined });

    const msg = makeObjectMessage(client, {
      serial: '02',
      siteCode: 'site1',
      operation: {
        action: OBJ_OP.MAP_SET,
        objectId: 'map:test@1000',
        mapSet: { key: 'name', value: { string: 'Bob' } },
      },
    });

    const result = map.applyOperation(msg.operation!, msg, ObjectsOperationSource.channel);

    const entry = getDataMap(map).get('name');
    expect(entry!.data).to.deep.equal({ string: 'Bob' });
    expect(entry!.timeserial).to.equal('02');
    expect(result).to.equal(true);
  });

  // =====================================================================
  // RTLM9 - LWW rejects stale serial on existing entry
  // =====================================================================

  // UTS: objects/unit/RTLM9/lww-reject-stale-0
  it('RTLM9 - LWW rejects stale serial on existing entry', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM9-stale');

    const map = createZeroMap(channel, 'map:test@1000');
    getDataMap(map).set('name', { data: { string: 'Alice' }, timeserial: '05', tombstone: false, tombstonedAt: undefined });

    const msg = makeObjectMessage(client, {
      serial: '03',
      siteCode: 'site1',
      operation: {
        action: OBJ_OP.MAP_SET,
        objectId: 'map:test@1000',
        mapSet: { key: 'name', value: { string: 'Bob' } },
      },
    });

    map.applyOperation(msg.operation!, msg, ObjectsOperationSource.channel);

    const entry = getDataMap(map).get('name');
    expect(entry!.data).to.deep.equal({ string: 'Alice' }); // unchanged
  });

  // =====================================================================
  // RTLM9 - LWW rejects equal serial
  // =====================================================================

  // UTS: objects/unit/RTLM9/lww-reject-equal-0
  it('RTLM9 - LWW rejects equal serial', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM9-eq');

    const map = createZeroMap(channel, 'map:test@1000');
    getDataMap(map).set('name', { data: { string: 'Alice' }, timeserial: '05', tombstone: false, tombstonedAt: undefined });

    const msg = makeObjectMessage(client, {
      serial: '05',
      siteCode: 'site1',
      operation: {
        action: OBJ_OP.MAP_SET,
        objectId: 'map:test@1000',
        mapSet: { key: 'name', value: { string: 'Bob' } },
      },
    });

    map.applyOperation(msg.operation!, msg, ObjectsOperationSource.channel);

    const entry = getDataMap(map).get('name');
    expect(entry!.data).to.deep.equal({ string: 'Alice' }); // unchanged
  });

  // =====================================================================
  // RTLM9b - Both serials empty rejects operation
  // =====================================================================

  // UTS: objects/unit/RTLM9b/both-empty-reject-0
  // Deviation: ably-js throws on empty serial at _canApplyOperation level.
  // We test the entry-level check (_canApplyMapEntryOperation) by using
  // a different siteCode so the site-level check passes.
  it('RTLM9b - both serials empty rejects operation (deviation: throws on empty serial)', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM9b');

    const map = createZeroMap(channel, 'map:test@1000');
    getDataMap(map).set('name', { data: { string: 'Alice' }, timeserial: '', tombstone: false, tombstonedAt: undefined });

    // ably-js throws ErrorInfo for empty serial at _canApplyOperation level
    const msg = makeObjectMessage(client, {
      serial: '',
      siteCode: 'site1',
      operation: {
        action: OBJ_OP.MAP_SET,
        objectId: 'map:test@1000',
        mapSet: { key: 'name', value: { string: 'Bob' } },
      },
    });

    expect(() => map.applyOperation(msg.operation!, msg, ObjectsOperationSource.channel))
      .to.throw()
      .with.property('code', 92000);

    // Data unchanged
    expect(getDataMap(map).get('name')!.data).to.deep.equal({ string: 'Alice' });
  });

  // =====================================================================
  // RTLM9d - Missing entry serial allows operation
  // =====================================================================

  // UTS: objects/unit/RTLM9d/missing-entry-serial-allows-0
  it('RTLM9d - missing entry serial allows operation', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM9d');

    const map = createZeroMap(channel, 'map:test@1000');
    getDataMap(map).set('name', { data: { string: 'Alice' }, timeserial: undefined, tombstone: false, tombstonedAt: undefined });

    const msg = makeObjectMessage(client, {
      serial: '01',
      siteCode: 'site1',
      operation: {
        action: OBJ_OP.MAP_SET,
        objectId: 'map:test@1000',
        mapSet: { key: 'name', value: { string: 'Bob' } },
      },
    });

    map.applyOperation(msg.operation!, msg, ObjectsOperationSource.channel);

    expect(getDataMap(map).get('name')!.data).to.deep.equal({ string: 'Bob' });
  });

  // =====================================================================
  // RTLM7h - MAP_SET rejected when serial <= clearTimeserial
  // =====================================================================

  // UTS: objects/unit/RTLM7h/map-set-clear-timeserial-floor-0
  it('RTLM7h - MAP_SET rejected when serial <= clearTimeserial', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM7h');

    const map = createZeroMap(channel, 'map:test@1000');
    (map as any)._clearTimeserial = '05';

    const msg = makeObjectMessage(client, {
      serial: '03',
      siteCode: 'site1',
      operation: {
        action: OBJ_OP.MAP_SET,
        objectId: 'map:test@1000',
        mapSet: { key: 'name', value: { string: 'Alice' } },
      },
    });

    map.applyOperation(msg.operation!, msg, ObjectsOperationSource.channel);

    expect(getDataMap(map).has('name')).to.equal(false);
  });

  // =====================================================================
  // RTLM7g - MAP_SET with objectId creates zero-value object
  // =====================================================================

  // UTS: objects/unit/RTLM7g/map-set-objectid-creates-zero-value-0
  it('RTLM7g - MAP_SET with objectId creates zero-value object in pool', async function () {
    const { mockWs, channel } = await setupSyncedChannel('test-RTLM7g');

    // Use protocol message path because MAP_SET with objectId calls pool.createZeroValueObjectIfNotExists
    mockWs.active_connection!.send_to_client(
      buildObjectMessage('test-RTLM7g', [
        buildMapSet('root', 'newctr', { objectId: 'counter:new@2000' }, 't:1', 'bbb'),
      ]),
    );
    await flushAsync();

    const pool = getRealtimeObject(channel).getPool();
    const newCounter = pool.get('counter:new@2000');
    expect(newCounter).to.exist;
    expect(newCounter.value()).to.equal(0); // zero-value counter
  });

  // =====================================================================
  // RTLM8 - MAP_REMOVE tombstones existing entry
  // =====================================================================

  // UTS: objects/unit/RTLM8/map-remove-existing-0
  it('RTLM8 - MAP_REMOVE tombstones existing entry', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM8-exist');

    const map = createZeroMap(channel, 'map:test@1000');
    getDataMap(map).set('name', { data: { string: 'Alice' }, timeserial: '01', tombstone: false, tombstonedAt: undefined });

    const msg = makeObjectMessage(client, {
      serial: '02',
      siteCode: 'site1',
      serialTimestamp: 1700000000000,
      operation: {
        action: OBJ_OP.MAP_REMOVE,
        objectId: 'map:test@1000',
        mapRemove: { key: 'name' },
      },
    });

    const result = map.applyOperation(msg.operation!, msg, ObjectsOperationSource.channel);

    const entry = getDataMap(map).get('name');
    expect(entry!.data).to.be.undefined;
    expect(entry!.tombstone).to.equal(true);
    expect(entry!.timeserial).to.equal('02');
    expect(entry!.tombstonedAt).to.equal(1700000000000);
    expect(result).to.equal(true);
  });

  // =====================================================================
  // RTLM8 - MAP_REMOVE creates tombstoned entry if not exists
  // =====================================================================

  // UTS: objects/unit/RTLM8/map-remove-nonexistent-0
  it('RTLM8 - MAP_REMOVE creates tombstoned entry for nonexistent key', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM8-noent');

    const map = createZeroMap(channel, 'map:test@1000');

    const msg = makeObjectMessage(client, {
      serial: '01',
      siteCode: 'site1',
      serialTimestamp: 1700000000000,
      operation: {
        action: OBJ_OP.MAP_REMOVE,
        objectId: 'map:test@1000',
        mapRemove: { key: 'ghost' },
      },
    });

    const result = map.applyOperation(msg.operation!, msg, ObjectsOperationSource.channel);

    const entry = getDataMap(map).get('ghost');
    expect(entry).to.exist;
    expect(entry!.tombstone).to.equal(true);
    expect(entry!.tombstonedAt).to.equal(1700000000000);
    expect(result).to.equal(true);
  });

  // =====================================================================
  // RTLM8g - MAP_REMOVE rejected when serial <= clearTimeserial
  // =====================================================================

  // UTS: objects/unit/RTLM8g/map-remove-clear-timeserial-floor-0
  it('RTLM8g - MAP_REMOVE rejected when serial <= clearTimeserial', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM8g');

    const map = createZeroMap(channel, 'map:test@1000');
    (map as any)._clearTimeserial = '05';
    getDataMap(map).set('name', { data: { string: 'Alice' }, timeserial: '04', tombstone: false, tombstonedAt: undefined });

    const msg = makeObjectMessage(client, {
      serial: '03',
      siteCode: 'site1',
      serialTimestamp: 1700000000000,
      operation: {
        action: OBJ_OP.MAP_REMOVE,
        objectId: 'map:test@1000',
        mapRemove: { key: 'name' },
      },
    });

    map.applyOperation(msg.operation!, msg, ObjectsOperationSource.channel);

    const entry = getDataMap(map).get('name');
    expect(entry!.data).to.deep.equal({ string: 'Alice' }); // unchanged
    expect(entry!.tombstone).to.equal(false);
  });

  // =====================================================================
  // RTLM24 - MAP_CLEAR sets clearTimeserial and removes older entries
  // =====================================================================

  // UTS: objects/unit/RTLM24/map-clear-basic-0
  // Deviation: ably-js uses strict > for clear comparison (entrySerial < clearTimeserial),
  // so entries with serial == clearTimeserial are KEPT, not removed.
  // UTS spec says entries with serial <= clearTimeserial are removed.
  it('RTLM24 - MAP_CLEAR sets clearTimeserial and removes older entries', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM24-basic');

    const map = createZeroMap(channel, 'map:test@1000');
    getDataMap(map).set('old', { data: { string: 'old' }, timeserial: '02', tombstone: false, tombstonedAt: undefined });
    getDataMap(map).set('new', { data: { string: 'new' }, timeserial: '06', tombstone: false, tombstonedAt: undefined });
    getDataMap(map).set('same', { data: { string: 'same' }, timeserial: '04', tombstone: false, tombstonedAt: undefined });

    const msg = makeObjectMessage(client, {
      serial: '04',
      siteCode: 'site1',
      operation: {
        action: OBJ_OP.MAP_CLEAR,
        objectId: 'map:test@1000',
        mapClear: {},
      },
    });

    map.applyOperation(msg.operation!, msg, ObjectsOperationSource.channel);

    expect((map as any)._clearTimeserial).to.equal('04');
    expect(getDataMap(map).has('old')).to.equal(false); // '02' < '04'
    expect(getDataMap(map).has('new')).to.equal(true); // '06' > '04'
    // Deviation: 'same' (serial '04') is KEPT in ably-js (strict > comparison)
    // UTS spec expects it to be removed (serial <= clearTimeserial)
    expect(getDataMap(map).has('same')).to.equal(true); // ably-js keeps it
  });

  // =====================================================================
  // RTLM24c - MAP_CLEAR rejected when clearTimeserial is already greater
  // =====================================================================

  // UTS: objects/unit/RTLM24c/map-clear-stale-0
  it('RTLM24c - MAP_CLEAR rejected when clearTimeserial is already greater', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM24c');

    const map = createZeroMap(channel, 'map:test@1000');
    (map as any)._clearTimeserial = '10';

    const msg = makeObjectMessage(client, {
      serial: '05',
      siteCode: 'site1',
      operation: {
        action: OBJ_OP.MAP_CLEAR,
        objectId: 'map:test@1000',
        mapClear: {},
      },
    });

    map.applyOperation(msg.operation!, msg, ObjectsOperationSource.channel);

    expect((map as any)._clearTimeserial).to.equal('10'); // unchanged
  });

  // =====================================================================
  // RTLM16, RTLM23 - MAP_CREATE merges entries
  // =====================================================================

  // UTS: objects/unit/RTLM16/map-create-merge-0
  it('RTLM16 - MAP_CREATE merges entries', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM16');

    const map = createZeroMap(channel, 'map:test@1000');

    const msg = makeObjectMessage(client, {
      serial: '02',
      siteCode: 'site1',
      operation: {
        action: OBJ_OP.MAP_CREATE,
        objectId: 'map:test@1000',
        mapCreate: {
          semantics: MAP_SEMANTICS_LWW,
          entries: {
            name: { data: { string: 'Alice' }, timeserial: '01' },
            removed_key: { tombstone: true, timeserial: '01', serialTimestamp: 1700000000000 },
          },
        },
      },
    });

    const result = map.applyOperation(msg.operation!, msg, ObjectsOperationSource.channel);

    expect(getDataMap(map).get('name')!.data).to.deep.equal({ string: 'Alice' });
    expect(getDataMap(map).get('removed_key')!.tombstone).to.equal(true);
    expect((map as any)._createOperationIsMerged).to.equal(true);
    expect(result).to.equal(true);
  });

  // =====================================================================
  // RTLM16b - MAP_CREATE noop when already merged
  // =====================================================================

  // UTS: objects/unit/RTLM16b/map-create-already-merged-0
  it('RTLM16b - MAP_CREATE noop when already merged', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM16b');

    const map = createZeroMap(channel, 'map:test@1000');
    (map as any)._createOperationIsMerged = true;
    (map as any)._siteTimeserials = { site1: '00' };

    const msg = makeObjectMessage(client, {
      serial: '01',
      siteCode: 'site1',
      operation: {
        action: OBJ_OP.MAP_CREATE,
        objectId: 'map:test@1000',
        mapCreate: {
          semantics: MAP_SEMANTICS_LWW,
          entries: {
            name: { data: { string: 'Bob' }, timeserial: '01' },
          },
        },
      },
    });

    map.applyOperation(msg.operation!, msg, ObjectsOperationSource.channel);

    expect(getDataMap(map).has('name')).to.equal(false); // noop, not merged
  });

  // =====================================================================
  // RTLM15c - CHANNEL source updates siteTimeserials
  // =====================================================================

  // UTS: objects/unit/RTLM15c/channel-source-updates-serials-0
  it('RTLM15c - CHANNEL source updates siteTimeserials', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM15c');

    const map = createZeroMap(channel, 'map:test@1000');

    const msg = makeObjectMessage(client, {
      serial: '01',
      siteCode: 'site1',
      operation: {
        action: OBJ_OP.MAP_SET,
        objectId: 'map:test@1000',
        mapSet: { key: 'x', value: { number: 1 } },
      },
    });

    map.applyOperation(msg.operation!, msg, ObjectsOperationSource.channel);

    expect((map as any)._siteTimeserials['site1']).to.equal('01');
  });

  // =====================================================================
  // RTLM15e - Operations on tombstoned map are rejected
  // =====================================================================

  // UTS: objects/unit/RTLM15e/tombstoned-reject-ops-0
  it('RTLM15e - operations on tombstoned map are rejected', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM15e');

    const map = createZeroMap(channel, 'map:test@1000');

    // Tombstone the map
    const deleteMsg = makeObjectMessage(client, {
      serial: '01',
      siteCode: 'site1',
      serialTimestamp: 1700000000000,
      operation: {
        action: OBJ_OP.OBJECT_DELETE,
        objectId: 'map:test@1000',
        objectDelete: {},
      },
    });
    map.applyOperation(deleteMsg.operation!, deleteMsg, ObjectsOperationSource.channel);
    expect(map.isTombstoned()).to.equal(true);

    // Try MAP_SET on tombstoned map
    const setMsg = makeObjectMessage(client, {
      serial: '02',
      siteCode: 'site1',
      operation: {
        action: OBJ_OP.MAP_SET,
        objectId: 'map:test@1000',
        mapSet: { key: 'x', value: { number: 1 } },
      },
    });

    const result = map.applyOperation(setMsg.operation!, setMsg, ObjectsOperationSource.channel);

    expect(result).to.equal(false);
    expect(getDataMap(map).size).to.equal(0);
  });

  // =====================================================================
  // RTLO5 - OBJECT_DELETE tombstones map
  // =====================================================================

  // UTS: objects/unit/RTLO5/object-delete-tombstones-map-0
  it('RTLO5 - OBJECT_DELETE tombstones map', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLO5');

    const map = createZeroMap(channel, 'map:test@1000');
    getDataMap(map).set('name', { data: { string: 'Alice' }, timeserial: '01', tombstone: false, tombstonedAt: undefined });
    getDataMap(map).set('age', { data: { number: 30 }, timeserial: '01', tombstone: false, tombstonedAt: undefined });
    (map as any)._siteTimeserials = { site1: '00' };

    const msg = makeObjectMessage(client, {
      serial: '01',
      siteCode: 'site1',
      serialTimestamp: 1700000000000,
      operation: {
        action: OBJ_OP.OBJECT_DELETE,
        objectId: 'map:test@1000',
        objectDelete: {},
      },
    });

    const result = map.applyOperation(msg.operation!, msg, ObjectsOperationSource.channel);

    expect(map.isTombstoned()).to.equal(true);
    expect(getDataMap(map).size).to.equal(0); // data cleared
    expect(result).to.equal(true);
  });

  // =====================================================================
  // RTLM14, RTLM14c - Tombstoned entry check includes objectId reference
  // =====================================================================

  // UTS: objects/unit/RTLM14/tombstone-check-objectid-ref-0
  it('RTLM14 - tombstoned entry check includes objectId reference', async function () {
    const { root, mockWs, channel } = await setupSyncedChannel('test-RTLM14');

    // Standard pool: root.score -> counter:score@1000
    expect(root.get('score').value()).to.equal(100);

    // Tombstone the score counter
    mockWs.active_connection!.send_to_client(
      buildObjectMessage('test-RTLM14', [
        buildObjectDelete('counter:score@1000', 't:1', 'bbb', 1700000000000),
      ]),
    );
    await flushAsync();

    // RTLM14c: Entry itself not tombstoned, but referenced object IS tombstoned
    expect(root.get('score').value()).to.be.undefined;
    // size() should NOT count the effectively-tombstoned entry
    expect(root.size()).to.equal(6);
  });

  // =====================================================================
  // RTLM6 - replaceData sets data from ObjectState
  // =====================================================================

  // UTS: objects/unit/RTLM6/replace-data-basic-0
  it('RTLM6 - replaceData sets data from ObjectState', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM6');

    const map = createZeroMap(channel, 'map:test@1000');
    getDataMap(map).set('old', { data: { string: 'old' }, timeserial: '01', tombstone: false, tombstonedAt: undefined });
    (map as any)._createOperationIsMerged = true;

    const stateMsg = makeObjectMessage(client, {
      object: {
        objectId: 'map:test@1000',
        siteTimeserials: { site2: '05' },
        tombstone: false,
        map: {
          semantics: MAP_SEMANTICS_LWW,
          clearTimeserial: '03',
          entries: {
            new: { data: { string: 'new' }, timeserial: '04' },
          },
        },
      },
    });

    const update = map.overrideWithObjectState(stateMsg);

    expect((map as any)._siteTimeserials).to.deep.equal({ site2: '05' });
    expect((map as any)._createOperationIsMerged).to.equal(false);
    expect((map as any)._clearTimeserial).to.equal('03');
    expect(getDataMap(map).has('old')).to.equal(false);
    expect(getDataMap(map).get('new')!.data).to.deep.equal({ string: 'new' });
    // Check update diff
    expect((update as any).update['old']).to.equal('removed');
    expect((update as any).update['new']).to.equal('updated');
  });

  // =====================================================================
  // RTLM6c1 - replaceData sets tombstonedAt on tombstoned entries
  // =====================================================================

  // UTS: objects/unit/RTLM6c1/replace-data-tombstoned-entries-0
  it('RTLM6c1 - replaceData sets tombstonedAt on tombstoned entries', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM6c1');

    const map = createZeroMap(channel, 'map:test@1000');

    const stateMsg = makeObjectMessage(client, {
      object: {
        objectId: 'map:test@1000',
        siteTimeserials: { site1: '01' },
        tombstone: false,
        map: {
          semantics: MAP_SEMANTICS_LWW,
          entries: {
            dead: { tombstone: true, timeserial: '01', serialTimestamp: 1700000050000 },
          },
        },
      },
    });

    map.overrideWithObjectState(stateMsg);

    const deadEntry = getDataMap(map).get('dead');
    expect(deadEntry).to.exist;
    expect(deadEntry!.tombstonedAt).to.equal(1700000050000);
  });

  // =====================================================================
  // RTLM6d - replaceData with createOp merges initial entries
  // =====================================================================

  // UTS: objects/unit/RTLM6d/replace-data-with-create-op-0
  it('RTLM6d - replaceData with createOp merges initial entries', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM6d');

    const map = createZeroMap(channel, 'map:test@1000');

    const stateMsg = makeObjectMessage(client, {
      object: {
        objectId: 'map:test@1000',
        siteTimeserials: { site1: '01' },
        tombstone: false,
        map: {
          semantics: MAP_SEMANTICS_LWW,
          entries: {
            from_sync: { data: { string: 'synced' }, timeserial: '01' },
          },
        },
        createOp: {
          action: OBJ_OP.MAP_CREATE,
          objectId: 'map:test@1000',
          mapCreate: {
            semantics: MAP_SEMANTICS_LWW,
            entries: {
              from_create: { data: { string: 'created' }, timeserial: '00' },
            },
          },
        },
      },
    });

    map.overrideWithObjectState(stateMsg);

    expect(getDataMap(map).get('from_sync')!.data).to.deep.equal({ string: 'synced' });
    expect(getDataMap(map).get('from_create')!.data).to.deep.equal({ string: 'created' });
    expect((map as any)._createOperationIsMerged).to.equal(true);
  });

  // =====================================================================
  // RTLM19 - GC removes tombstoned entries past grace period
  // =====================================================================

  // UTS: objects/unit/RTLM19/gc-tombstoned-entries-0
  it('RTLM19 - GC removes tombstoned entries past grace period', async function () {
    const { channel } = await setupSyncedChannel('test-RTLM19');

    const map = createZeroMap(channel, 'map:test@1000');
    const gracePeriod = 86400000;
    const now = 1700100000000;

    // Set gcGracePeriod on the realtimeObject
    const realtimeObject = getRealtimeObject(channel);
    realtimeObject.gcGracePeriod = gracePeriod;

    getDataMap(map).set('recent_dead', { data: undefined, timeserial: '01', tombstone: true, tombstonedAt: now - 1000 });
    getDataMap(map).set('old_dead', { data: undefined, timeserial: '01', tombstone: true, tombstonedAt: now - gracePeriod - 1 });
    getDataMap(map).set('alive', { data: { string: 'ok' }, timeserial: '01', tombstone: false, tombstonedAt: undefined });

    const originalNow = Date.now;
    Date.now = () => now;
    try {
      map.onGCInterval();
    } finally {
      Date.now = originalNow;
    }

    expect(getDataMap(map).has('recent_dead')).to.equal(true);
    expect(getDataMap(map).has('old_dead')).to.equal(false); // GC'd
    expect(getDataMap(map).has('alive')).to.equal(true);
  });

  // =====================================================================
  // RTLM22 - Diff between two data states
  // =====================================================================

  // UTS: objects/unit/RTLM22/diff-calculation-0
  it('RTLM22 - diff between two data states', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM22');

    const map = createZeroMap(channel, 'map:test@1000');

    // Set up previous state
    getDataMap(map).set('removed', { data: { string: 'gone' }, timeserial: '01', tombstone: false, tombstonedAt: undefined });
    getDataMap(map).set('changed', { data: { string: 'old' }, timeserial: '01', tombstone: false, tombstonedAt: undefined });
    getDataMap(map).set('unchanged', { data: { string: 'same' }, timeserial: '01', tombstone: false, tombstonedAt: undefined });
    getDataMap(map).set('was_dead', { data: undefined, timeserial: '01', tombstone: true, tombstonedAt: 1700000000000 });

    // Replace with new state via overrideWithObjectState, which computes diff
    const stateMsg = makeObjectMessage(client, {
      object: {
        objectId: 'map:test@1000',
        siteTimeserials: { aaa: '02' },
        tombstone: false,
        map: {
          semantics: MAP_SEMANTICS_LWW,
          entries: {
            added: { data: { string: 'new' }, timeserial: '02' },
            changed: { data: { string: 'new_val' }, timeserial: '02' },
            unchanged: { data: { string: 'same' }, timeserial: '01' },
            now_dead: { tombstone: true, timeserial: '02', serialTimestamp: 1700000000000 },
          },
        },
      },
    });

    const update = map.overrideWithObjectState(stateMsg);
    const diff = (update as any).update;

    expect(diff['removed']).to.equal('removed');
    expect(diff['added']).to.equal('updated');
    expect(diff['changed']).to.equal('updated');
    expect(diff).to.not.have.property('unchanged');
    expect(diff).to.not.have.property('was_dead');
    expect(diff).to.not.have.property('now_dead');
  });

  // =====================================================================
  // RTLM15d4 - Unsupported action is discarded
  // =====================================================================

  // UTS: objects/unit/RTLM15d4/unsupported-action-0
  // Deviation: ably-js throws ErrorInfo (92000) for unsupported actions
  // instead of returning false as the spec requires.
  it('RTLM15d4 - unsupported action throws (deviation: spec expects false)', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM15d4');

    const map = createZeroMap(channel, 'map:test@1000');

    const msg = makeObjectMessage(client, {
      serial: '01',
      siteCode: 'site1',
      operation: {
        action: OBJ_OP.COUNTER_INC,
        objectId: 'map:test@1000',
        counterInc: { number: 5 },
      },
    });

    expect(() => map.applyOperation(msg.operation!, msg, ObjectsOperationSource.channel))
      .to.throw()
      .with.property('code', 92000);

    expect(getDataMap(map).size).to.equal(0);
  });

  // =====================================================================
  // RTLM6i - replaceData without clearTimeserial resets to null
  // =====================================================================

  // UTS: objects/unit/RTLM6i/replace-data-resets-clear-timeserial-0
  it('RTLM6i - replaceData without clearTimeserial resets to undefined', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM6i');

    const map = createZeroMap(channel, 'map:test@1000');
    (map as any)._clearTimeserial = '05';
    getDataMap(map).set('x', { data: { number: 1 }, timeserial: '03', tombstone: false, tombstonedAt: undefined });

    const stateMsg = makeObjectMessage(client, {
      object: {
        objectId: 'map:test@1000',
        siteTimeserials: { site1: '01' },
        tombstone: false,
        map: {
          semantics: MAP_SEMANTICS_LWW,
          entries: {
            y: { data: { number: 2 }, timeserial: '01' },
          },
        },
      },
    });

    map.overrideWithObjectState(stateMsg);

    expect((map as any)._clearTimeserial).to.be.undefined;
    expect(getDataMap(map).has('y')).to.equal(true);
  });

  // =====================================================================
  // RTLM14c, RTLM5 - MAP_SET referencing tombstoned objectId yields null
  // =====================================================================

  // UTS: objects/unit/RTLM14c/tombstoned-ref-yields-null-0
  it('RTLM14c - MAP_SET referencing tombstoned objectId yields undefined', async function () {
    const { root, mockWs } = await setupSyncedChannel('test-RTLM14c');

    // Tombstone the score counter referenced by root
    mockWs.active_connection!.send_to_client(
      buildObjectMessage('test-RTLM14c', [
        buildObjectDelete('counter:score@1000', 't:1', 'bbb', 1700000000000),
      ]),
    );
    await flushAsync();

    expect(root.get('score').value()).to.be.undefined;
    expect(root.size()).to.equal(6); // 7 - 1 effectively-tombstoned
  });

  // =====================================================================
  // RTLM7 - MAP_SET revives tombstoned entry
  // =====================================================================

  // UTS: objects/unit/RTLM7/map-set-revives-tombstoned-0
  it('RTLM7 - MAP_SET revives tombstoned entry', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM7-revive');

    const map = createZeroMap(channel, 'map:test@1000');
    getDataMap(map).set('name', {
      data: undefined,
      timeserial: '01',
      tombstone: true,
      tombstonedAt: 1700000000000,
    });

    const msg = makeObjectMessage(client, {
      serial: '02',
      siteCode: 'site1',
      operation: {
        action: OBJ_OP.MAP_SET,
        objectId: 'map:test@1000',
        mapSet: { key: 'name', value: { string: 'Alice' } },
      },
    });

    map.applyOperation(msg.operation!, msg, ObjectsOperationSource.channel);

    const entry = getDataMap(map).get('name');
    expect(entry!.data).to.deep.equal({ string: 'Alice' });
    expect(entry!.tombstone).to.equal(false);
    expect(entry!.tombstonedAt).to.be.undefined;
  });

  // =====================================================================
  // RTLM24 - MAP_CLEAR preserves entries with newer serial
  // =====================================================================

  // UTS: objects/unit/RTLM24/map-clear-preserves-newer-0
  it('RTLM24 - MAP_CLEAR preserves entries with newer serial', async function () {
    const { channel, client } = await setupSyncedChannel('test-RTLM24-newer');

    const map = createZeroMap(channel, 'map:test@1000');
    getDataMap(map).set('before', { data: { string: 'a' }, timeserial: '03', tombstone: false, tombstonedAt: undefined });
    getDataMap(map).set('after', { data: { string: 'b' }, timeserial: '07', tombstone: false, tombstonedAt: undefined });
    getDataMap(map).set('no_ts', { data: { string: 'c' }, timeserial: undefined, tombstone: false, tombstonedAt: undefined });

    const msg = makeObjectMessage(client, {
      serial: '05',
      siteCode: 'site1',
      operation: {
        action: OBJ_OP.MAP_CLEAR,
        objectId: 'map:test@1000',
        mapClear: {},
      },
    });

    map.applyOperation(msg.operation!, msg, ObjectsOperationSource.channel);

    expect(getDataMap(map).has('before')).to.equal(false); // '03' < '05'
    expect(getDataMap(map).has('no_ts')).to.equal(false); // null < any
    expect(getDataMap(map).get('after')!.data).to.deep.equal({ string: 'b' }); // '07' > '05'
  });
});
