/**
 * UTS: Message Type Tests
 *
 * Spec points: TM1, TM2, TM3, TM4, TM5, TM2a, TM2b, TM2c, TM2d, TM2e, TM2f, TM2g, TM2h, TM2i
 * Source: uts/test/rest/unit/types/message_types.md
 */

import { expect } from 'chai';
import { Ably } from '../../helpers';

const Message = Ably.Rest.Message;

describe('uts/rest/types/message_types', function () {
  /**
   * TM2a - id attribute
   */
  it('TM2a - id attribute', function () {
    const msg = Message.fromValues({ id: 'msg-1' });
    expect(msg.id).to.equal('msg-1');
  });

  /**
   * TM2b - name attribute
   */
  it('TM2b - name attribute', function () {
    const msg = Message.fromValues({ name: 'test' });
    expect(msg.name).to.equal('test');
  });

  /**
   * TM2c - data attribute (string)
   */
  it('TM2c - data attribute (string)', function () {
    const msg = Message.fromValues({ data: 'hello' });
    expect(msg.data).to.equal('hello');
  });

  /**
   * TM2c - data attribute (object)
   */
  it('TM2c - data attribute (object)', function () {
    const msg = Message.fromValues({ data: { key: 'value' } });
    expect(msg.data).to.deep.equal({ key: 'value' });
  });

  /**
   * TM2d - clientId attribute
   */
  it('TM2d - clientId attribute', function () {
    const msg = Message.fromValues({ clientId: 'user-1' });
    expect(msg.clientId).to.equal('user-1');
  });

  /**
   * TM2e - connectionId attribute
   */
  it('TM2e - connectionId attribute', function () {
    const msg = Message.fromValues({ connectionId: 'conn-1' });
    expect(msg.connectionId).to.equal('conn-1');
  });

  /**
   * TM2f - timestamp attribute
   */
  it('TM2f - timestamp attribute', function () {
    const msg = Message.fromValues({ timestamp: 1234567890000 });
    expect(msg.timestamp).to.equal(1234567890000);
  });

  /**
   * TM2g - encoding attribute
   */
  it('TM2g - encoding attribute', function () {
    const msg = Message.fromValues({ encoding: 'json' });
    expect(msg.encoding).to.equal('json');
  });

  /**
   * TM2h - extras attribute
   */
  it('TM2h - extras attribute', function () {
    const msg = Message.fromValues({
      extras: { push: { notification: { title: 'Hi' } } },
    });
    expect(msg.extras).to.deep.equal({ push: { notification: { title: 'Hi' } } });
    expect(msg.extras.push.notification.title).to.equal('Hi');
  });

  /**
   * TM2i - serial attribute
   */
  it('TM2i - serial attribute', function () {
    const msg = Message.fromValues({ serial: '01234567890:0' });
    expect(msg.serial).to.equal('01234567890:0');
  });

  /**
   * TM3 - deserialization from wire JSON via fromEncoded
   */
  it('TM3 - deserialization from wire JSON', async function () {
    const msg = await Message.fromEncoded({
      name: 'test',
      data: 'hello',
      id: 'msg-1',
      clientId: 'sender-client',
      connectionId: 'conn-456',
      timestamp: 1234567890000,
      extras: { headers: { 'x-custom': 'value' } },
    });

    expect(msg.id).to.equal('msg-1');
    expect(msg.name).to.equal('test');
    expect(msg.data).to.equal('hello');
    expect(msg.clientId).to.equal('sender-client');
    expect(msg.connectionId).to.equal('conn-456');
    expect(msg.timestamp).to.equal(1234567890000);
    expect(msg.extras).to.deep.equal({ headers: { 'x-custom': 'value' } });
  });

  /**
   * TM2 - null/missing attributes are undefined
   *
   * When a Message is constructed with only partial fields, the
   * unspecified attributes should be undefined (not defaulted).
   */
  it('TM2 - null/missing attributes are undefined', function () {
    const msg = Message.fromValues({ name: 'test' });

    expect(msg.name).to.equal('test');
    expect(msg.data).to.be.undefined;
    expect(msg.clientId).to.be.undefined;
    expect(msg.connectionId).to.be.undefined;
    expect(msg.id).to.be.undefined;
    expect(msg.timestamp).to.be.undefined;
  });

  /**
   * TM3 - fromEncoded with all fields
   *
   * Verify that fromEncoded correctly deserializes a wire message
   * containing all standard fields.
   */
  it('TM3 - fromEncoded with all fields', async function () {
    const msg = await Message.fromEncoded({
      id: 'id1',
      name: 'test',
      data: 'hello',
      clientId: 'c1',
      connectionId: 'conn1',
      timestamp: 1700000000000,
      encoding: null,
      extras: { key: 'val' },
    });

    expect(msg.id).to.equal('id1');
    expect(msg.name).to.equal('test');
    expect(msg.data).to.equal('hello');
    expect(msg.clientId).to.equal('c1');
    expect(msg.connectionId).to.equal('conn1');
    expect(msg.timestamp).to.equal(1700000000000);
    expect(msg.extras).to.deep.equal({ key: 'val' });
  });

  /**
   * TM2 - binary data preserved
   *
   * When fromEncoded receives base64-encoded data with encoding 'base64',
   * it should decode it to a binary type (Buffer or Uint8Array) and
   * clear the encoding.
   */
  it('TM2 - binary data preserved via base64 decoding', async function () {
    const msg = await Message.fromEncoded({
      data: 'SGVsbG8=',
      encoding: 'base64',
    });

    // After decoding, data should be a Buffer or Uint8Array
    const isBinary = Buffer.isBuffer(msg.data) || msg.data instanceof Uint8Array;
    expect(isBinary).to.be.true;
    // Encoding should be consumed (null) after decode
    expect(msg.encoding).to.be.null;
    // Verify the decoded content is 'Hello'
    const text = Buffer.from(msg.data).toString('utf8');
    expect(text).to.equal('Hello');
  });

  /**
   * TM4 - toJSON serialization
   *
   * If Message exposes a toJSON method, verify it returns an object
   * with the expected name and data keys.
   */
  it('TM4 - toJSON serialization', function () {
    const msg = Message.fromValues({ name: 'event', data: 'payload' });

    if (typeof (msg as any).toJSON === 'function') {
      const json = (msg as any).toJSON();
      expect(json).to.have.property('name', 'event');
      expect(json).to.have.property('data', 'payload');
    } else {
      // DEVIATION: ably-js Message may not expose toJSON directly.
      // Verify JSON.stringify produces expected output instead.
      const json = JSON.parse(JSON.stringify(msg));
      expect(json).to.have.property('name', 'event');
      expect(json).to.have.property('data', 'payload');
    }
  });
});
