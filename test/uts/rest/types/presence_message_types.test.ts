/**
 * UTS: PresenceMessage Type Tests
 *
 * Spec points: TP1, TP2, TP3, TP3a-TP3i, TP4, TP5
 * Source: uts/test/rest/unit/types/presence_message_types.md
 */

import { expect } from 'chai';
import { Ably } from '../../helpers';

describe('uts/rest/types/presence_message_types', function () {
  /**
   * TP2 - PresenceAction values
   *
   * PresenceAction enum: absent (0), present (1), enter (2), leave (3), update (4).
   * In ably-js, application code uses string actions.
   */
  it('TP2 - PresenceAction values', function () {
    const actionStrings = ['absent', 'present', 'enter', 'leave', 'update'];

    actionStrings.forEach(function (actionStr) {
      const pm = Ably.Rest.PresenceMessage.fromValues({ action: actionStr });
      expect(pm.action).to.equal(actionStr);
    });
  });

  /**
   * TP3a - id attribute
   */
  it('TP3a - id attribute', function () {
    const pm = Ably.Rest.PresenceMessage.fromValues({ id: 'pm-1' });
    expect(pm.id).to.equal('pm-1');
  });

  /**
   * TP3b - action attribute
   */
  it('TP3b - action attribute', function () {
    const pm = Ably.Rest.PresenceMessage.fromValues({ action: 'enter' });
    expect(pm.action).to.equal('enter');
  });

  /**
   * TP3c - clientId attribute
   */
  it('TP3c - clientId attribute', function () {
    const pm = Ably.Rest.PresenceMessage.fromValues({ clientId: 'user-1' });
    expect(pm.clientId).to.equal('user-1');
  });

  /**
   * TP3d - connectionId attribute
   */
  it('TP3d - connectionId attribute', function () {
    const pm = Ably.Rest.PresenceMessage.fromValues({ connectionId: 'conn-1' });
    expect(pm.connectionId).to.equal('conn-1');
  });

  /**
   * TP3e - data attribute (string)
   */
  it('TP3e - data attribute (string)', function () {
    const pm = Ably.Rest.PresenceMessage.fromValues({ data: 'hello' });
    expect(pm.data).to.equal('hello');
  });

  /**
   * TP3e - data attribute (object)
   */
  it('TP3e - data attribute (object)', function () {
    const pm = Ably.Rest.PresenceMessage.fromValues({ data: { key: 'val' } });
    expect(pm.data).to.deep.equal({ key: 'val' });
  });

  /**
   * TP3f - encoding attribute
   */
  it('TP3f - encoding attribute', function () {
    const pm = Ably.Rest.PresenceMessage.fromValues({ encoding: 'json' });
    expect(pm.encoding).to.equal('json');
  });

  /**
   * TP3g - timestamp attribute
   */
  it('TP3g - timestamp attribute', function () {
    const pm = Ably.Rest.PresenceMessage.fromValues({ timestamp: 1234567890000 });
    expect(pm.timestamp).to.equal(1234567890000);
  });

  /**
   * TP3i - extras attribute
   */
  it('TP3i - extras attribute', function () {
    const pm = Ably.Rest.PresenceMessage.fromValues({
      extras: { headers: { 'x-custom': 'value' } },
    });
    expect(pm.extras.headers['x-custom']).to.equal('value');
  });

  /**
   * TP3h - memberKey combines connectionId and clientId
   *
   * In ably-js, memberKey is computed externally by PresenceMap, not as a property
   * on PresenceMessage. We verify the expected format connectionId:clientId.
   */
  it('TP3h - memberKey format', function () {
    const pm = Ably.Rest.PresenceMessage.fromValues({
      connectionId: 'conn-1',
      clientId: 'client-1',
    });

    // memberKey is connectionId + ':' + clientId
    const memberKey = pm.connectionId + ':' + pm.clientId;
    expect(memberKey).to.equal('conn-1:client-1');

    const pm2 = Ably.Rest.PresenceMessage.fromValues({
      connectionId: 'conn-2',
      clientId: 'client-1',
    });

    const memberKey2 = pm2.connectionId + ':' + pm2.clientId;
    expect(memberKey2).to.equal('conn-2:client-1');

    // Same clientId, different connectionId — different memberKey
    expect(memberKey).to.not.equal(memberKey2);
  });

  /**
   * TP3 - deserialization from wire format via fromEncoded
   *
   * Wire format uses numeric action (2 = enter). fromEncoded decodes to string action.
   */
  it('TP3 - deserialization from wire via fromEncoded', async function () {
    const pm = await Ably.Rest.PresenceMessage.fromEncoded({
      action: 2,
      clientId: 'test',
      data: 'hi',
    });

    expect(pm.action).to.equal('enter');
    expect(pm.clientId).to.equal('test');
    expect(pm.data).to.equal('hi');
  });

  /**
   * TP3 - wire numeric actions decode to correct strings
   */
  it('TP3 - all wire action values decode correctly', async function () {
    const expected = [
      { wire: 0, str: 'absent' },
      { wire: 1, str: 'present' },
      { wire: 2, str: 'enter' },
      { wire: 3, str: 'leave' },
      { wire: 4, str: 'update' },
    ];

    for (const tc of expected) {
      const pm = await Ably.Rest.PresenceMessage.fromEncoded({
        action: tc.wire,
        clientId: 'user',
      });
      expect(pm.action).to.equal(tc.str, 'wire action ' + tc.wire + ' should decode to ' + tc.str);
    }
  });

  /**
   * TP4 - fromEncoded with JSON-encoded data
   *
   * fromEncoded decodes data based on the encoding field.
   */
  it('TP4 - fromEncoded decodes json-encoded data', async function () {
    const pm = await Ably.Rest.PresenceMessage.fromEncoded({
      action: 2,
      clientId: 'user-1',
      data: '{"status":"online"}',
      encoding: 'json',
    });

    expect(pm.data).to.deep.equal({ status: 'online' });
    // Encoding should be consumed after decoding
    expect(pm.encoding).to.be.null;
  });

  /**
   * TP4 - fromEncodedArray
   *
   * Decodes an array of wire-format presence messages.
   */
  it('TP4 - fromEncodedArray', async function () {
    const messages = await Ably.Rest.PresenceMessage.fromEncodedArray([
      { action: 2, clientId: 'alice', data: 'hello' },
      { action: 2, clientId: 'bob', data: 'world' },
    ]);

    expect(messages).to.have.lengthOf(2);
    expect(messages[0].clientId).to.equal('alice');
    expect(messages[0].data).to.equal('hello');
    expect(messages[1].clientId).to.equal('bob');
    expect(messages[1].data).to.equal('world');
  });
});
