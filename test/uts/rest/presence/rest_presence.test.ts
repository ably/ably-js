/**
 * UTS: REST Presence Tests
 *
 * Spec points: RSP1, RSP1a, RSP1b, RSP3, RSP3a, RSP3a1, RSP3a2, RSP3a3,
 *              RSP3b, RSP3c, RSP4, RSP4a, RSP4b1, RSP4b2, RSP4b3,
 *              RSP5, RSP5a, RSP5b, RSP5e
 * Source: uts/test/rest/unit/presence/rest_presence.md
 */

import { expect } from 'chai';
import { MockHttpClient } from '../../mock_http';
import { Ably, installMockHttp, restoreAll } from '../../helpers';

describe('uts/rest/presence/rest_presence', function () {
  afterEach(function () {
    restoreAll();
  });

  // ---------------------------------------------------------------------------
  // RSP1 - Presence object
  // ---------------------------------------------------------------------------

  /**
   * RSP1a - presence accessible
   *
   * channel.presence must exist and be an object.
   */
  it('RSP1a - presence accessible on channel', function () {
    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test');

    expect(channel.presence).to.be.an('object');
    expect(channel.presence).to.not.be.null;
  });

  /**
   * RSP1b - same instance
   *
   * Accessing channel.presence multiple times must return the same instance.
   */
  it('RSP1b - channel.presence returns same instance', function () {
    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test');

    const presence1 = channel.presence;
    const presence2 = channel.presence;
    expect(presence1).to.equal(presence2);
  });

  // ---------------------------------------------------------------------------
  // RSP3 - presence.get()
  // ---------------------------------------------------------------------------

  /**
   * RSP3a - GET to correct path
   *
   * presence.get() must send a GET request to /channels/{name}/presence.
   */
  it('RSP3a - get() sends GET to /channels/{name}/presence', async function () {
    const captured = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, []);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test-channel');
    await channel.presence.get();

    expect(captured).to.have.length(1);
    expect(captured[0].method).to.equal('get');
    expect(captured[0].path).to.equal('/channels/test-channel/presence');
  });

  /**
   * RSP3b - returns PresenceMessage objects
   *
   * presence.get() must return a PaginatedResult containing PresenceMessage
   * objects with action, clientId, connectionId, data, and timestamp.
   */
  it('RSP3b - get() returns PresenceMessage objects', async function () {
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        req.respond_with(200, [
          {
            action: 1,
            clientId: 'user-1',
            connectionId: 'conn-abc',
            data: 'hello',
            timestamp: 1609459200000,
          },
          {
            action: 1,
            clientId: 'user-2',
            connectionId: 'conn-def',
            data: 'world',
            timestamp: 1609459201000,
          },
        ]);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test');
    const result = await channel.presence.get();

    expect(result.items).to.have.length(2);

    const item0 = result.items[0];
    expect(item0.action).to.equal('present');
    expect(item0.clientId).to.equal('user-1');
    expect(item0.connectionId).to.equal('conn-abc');
    expect(item0.data).to.equal('hello');
    expect(item0.timestamp).to.equal(1609459200000);

    const item1 = result.items[1];
    expect(item1.action).to.equal('present');
    expect(item1.clientId).to.equal('user-2');
    expect(item1.connectionId).to.equal('conn-def');
    expect(item1.data).to.equal('world');
    expect(item1.timestamp).to.equal(1609459201000);
  });

  /**
   * RSP3c - empty list
   *
   * When the server returns an empty array, items.length must be 0.
   */
  it('RSP3c - get() with empty response returns empty items', async function () {
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        req.respond_with(200, []);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test');
    const result = await channel.presence.get();

    expect(result.items).to.have.length(0);
    expect(result.hasNext()).to.be.false;
    expect(result.isLast()).to.be.true;
  });

  /**
   * RSP3a1 - limit param
   *
   * get({limit: 50}) must send limit=50 as a query parameter.
   */
  it('RSP3a1 - get() with limit param sends limit query parameter', async function () {
    const captured = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, []);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test');
    await channel.presence.get({ limit: 50 });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('limit')).to.equal('50');
  });

  /**
   * RSP3a2 - clientId filter
   *
   * get({clientId: 'specific'}) must send clientId=specific as a query parameter.
   */
  it('RSP3a2 - get() with clientId filter sends clientId query parameter', async function () {
    const captured = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, []);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test');
    await channel.presence.get({ clientId: 'specific' });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('clientId')).to.equal('specific');
  });

  /**
   * RSP3a3 - connectionId filter
   *
   * get({connectionId: 'conn123'}) must send connectionId=conn123 as a query parameter.
   */
  it('RSP3a3 - get() with connectionId filter sends connectionId query parameter', async function () {
    const captured = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, []);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test');
    await channel.presence.get({ connectionId: 'conn123' });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('connectionId')).to.equal('conn123');
  });

  // ---------------------------------------------------------------------------
  // RSP4 - presence.history()
  // ---------------------------------------------------------------------------

  /**
   * RSP4a - GET to history path
   *
   * presence.history() must send a GET request to /channels/{name}/presence/history.
   */
  it('RSP4a - history() sends GET to /channels/{name}/presence/history', async function () {
    const captured = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, []);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test-channel');
    await channel.presence.history();

    expect(captured).to.have.length(1);
    expect(captured[0].method).to.equal('get');
    expect(captured[0].path).to.equal('/channels/test-channel/presence/history');
  });

  /**
   * RSP4a - returns PresenceMessage with actions
   *
   * history() must return PresenceMessage objects with wire actions decoded
   * to strings: enter (2), leave (3), update (4).
   */
  it('RSP4a - history() returns PresenceMessage with decoded actions', async function () {
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        req.respond_with(200, [
          { action: 2, clientId: 'alice', data: 'joined', timestamp: 1609459200000 },
          { action: 3, clientId: 'bob', data: 'left', timestamp: 1609459201000 },
          { action: 4, clientId: 'carol', data: 'status', timestamp: 1609459202000 },
        ]);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test');
    const result = await channel.presence.history();

    expect(result.items).to.have.length(3);
    expect(result.items[0].action).to.equal('enter');
    expect(result.items[0].clientId).to.equal('alice');
    expect(result.items[1].action).to.equal('leave');
    expect(result.items[1].clientId).to.equal('bob');
    expect(result.items[2].action).to.equal('update');
    expect(result.items[2].clientId).to.equal('carol');
  });

  /**
   * RSP4b1 - start param
   *
   * history({start: 1609459200000}) must send start=1609459200000 as a query parameter.
   */
  it('RSP4b1 - history() with start param sends start query parameter', async function () {
    const captured = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, []);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test');
    await channel.presence.history({ start: 1609459200000 });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('start')).to.equal('1609459200000');
  });

  /**
   * RSP4b1 - end param
   *
   * history({end: 1609545600000}) must send end=1609545600000 as a query parameter.
   */
  it('RSP4b1 - history() with end param sends end query parameter', async function () {
    const captured = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, []);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test');
    await channel.presence.history({ end: 1609545600000 });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('end')).to.equal('1609545600000');
  });

  /**
   * RSP4b2 - direction forwards
   *
   * history({direction: 'forwards'}) must send direction=forwards as a query parameter.
   */
  it('RSP4b2 - history() with direction forwards sends direction query parameter', async function () {
    const captured = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, []);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test');
    await channel.presence.history({ direction: 'forwards' });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('direction')).to.equal('forwards');
  });

  /**
   * RSP4b3 - limit param
   *
   * history({limit: 50}) must send limit=50 as a query parameter.
   */
  it('RSP4b3 - history() with limit param sends limit query parameter', async function () {
    const captured = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, []);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test');
    await channel.presence.history({ limit: 50 });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('limit')).to.equal('50');
  });

  // ---------------------------------------------------------------------------
  // RSP5 - Decoding
  // ---------------------------------------------------------------------------

  /**
   * RSP5a - string data
   *
   * Plain string data must pass through without modification.
   */
  it('RSP5a - get() with plain string data passes through', async function () {
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        req.respond_with(200, [
          { action: 1, clientId: 'user-1', data: 'hello world' },
        ]);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test');
    const result = await channel.presence.get();

    expect(result.items).to.have.length(1);
    expect(result.items[0].data).to.equal('hello world');
  });

  /**
   * RSP5b - JSON encoded
   *
   * When encoding is "json", data must be decoded from JSON string to object,
   * and the encoding must be consumed (null after decoding).
   */
  it('RSP5b - get() with json encoding decodes data to object', async function () {
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        req.respond_with(200, [
          {
            action: 1,
            clientId: 'user-1',
            data: '{"status":"online","count":42}',
            encoding: 'json',
          },
        ]);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test');
    const result = await channel.presence.get();

    expect(result.items).to.have.length(1);
    expect(result.items[0].data).to.deep.equal({ status: 'online', count: 42 });
    // Encoding must be consumed after decoding
    expect(result.items[0].encoding).to.be.null;
  });

  /**
   * RSP5e - chained encoding
   *
   * When encoding is "json/base64", data must be decoded from base64 then JSON.
   * The encoding must be fully consumed (null after decoding).
   */
  it('RSP5e - get() with chained json/base64 encoding decodes correctly', async function () {
    // {"key":"value"} base64-encoded
    const jsonStr = '{"key":"value"}';
    const base64Data = Buffer.from(jsonStr).toString('base64');

    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        req.respond_with(200, [
          {
            action: 1,
            clientId: 'user-1',
            data: base64Data,
            encoding: 'json/base64',
          },
        ]);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test');
    const result = await channel.presence.get();

    expect(result.items).to.have.length(1);
    expect(result.items[0].data).to.deep.equal({ key: 'value' });
    // All encoding layers must be consumed
    expect(result.items[0].encoding).to.be.null;
  });

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  /**
   * RSP pagination - get with Link header
   *
   * When the server responds with a Link header containing a "next" relation,
   * hasNext() must return true and isLast() must return false.
   */
  it('RSP pagination - get() with Link header indicates hasNext', async function () {
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        req.respond_with(200, [
          { action: 1, clientId: 'user-1', data: 'hello' },
        ], {
          'Link': '<./presence?cursor=abc&limit=1>; rel="next"',
        });
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test');
    const result = await channel.presence.get({ limit: 1 });

    expect(result.items).to.have.length(1);
    expect(result.hasNext()).to.be.true;
    expect(result.isLast()).to.be.false;
  });

  /**
   * RSP pagination - history next page
   *
   * Navigating pages via next() must fetch the next page from the server.
   */
  it('RSP pagination - history() navigates pages via next()', async function () {
    let reqCount = 0;
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        reqCount++;
        if (reqCount === 1) {
          req.respond_with(200, [
            { action: 2, clientId: 'alice', timestamp: 1609459200000 },
          ], {
            'Link': '<./presence?cursor=page2&limit=1>; rel="next"',
          });
        } else {
          req.respond_with(200, [
            { action: 3, clientId: 'bob', timestamp: 1609459100000 },
          ]);
        }
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test');

    // First page
    const page1 = await channel.presence.history({ limit: 1 });
    expect(page1.items).to.have.length(1);
    expect(page1.items[0].action).to.equal('enter');
    expect(page1.items[0].clientId).to.equal('alice');
    expect(page1.hasNext()).to.be.true;

    // Second page
    const page2 = await page1.next();
    expect(page2.items).to.have.length(1);
    expect(page2.items[0].action).to.equal('leave');
    expect(page2.items[0].clientId).to.equal('bob');
    expect(page2.hasNext()).to.be.false;
    expect(page2.isLast()).to.be.true;
  });

  // ---------------------------------------------------------------------------
  // Errors
  // ---------------------------------------------------------------------------

  /**
   * RSP error - server error
   *
   * When the server responds with a 500 error, the operation must throw
   * with the appropriate error code.
   */
  it('RSP error - server error on get() throws with error code', async function () {
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        req.respond_with(500, {
          error: {
            code: 50000,
            statusCode: 500,
            message: 'Internal server error',
          },
        });
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test');

    try {
      await channel.presence.get();
      expect.fail('Expected get() to throw');
    } catch (error) {
      expect(error.statusCode).to.equal(500);
      expect(error.code).to.equal(50000);
    }
  });

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * RSP actions - all actions mapped
   *
   * Wire actions 1-4 must be decoded to present/enter/leave/update strings.
   */
  it('RSP actions - wire actions 1-4 decoded to correct strings', async function () {
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        req.respond_with(200, [
          { action: 1, clientId: 'u1' },
          { action: 2, clientId: 'u2' },
          { action: 3, clientId: 'u3' },
          { action: 4, clientId: 'u4' },
        ]);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test');
    const result = await channel.presence.get();

    expect(result.items).to.have.length(4);

    const expected = [
      { wire: 1, str: 'present' },
      { wire: 2, str: 'enter' },
      { wire: 3, str: 'leave' },
      { wire: 4, str: 'update' },
    ];

    for (let i = 0; i < expected.length; i++) {
      expect(result.items[i].action).to.equal(
        expected[i].str,
        'wire action ' + expected[i].wire + ' should decode to ' + expected[i].str
      );
    }
  });
});
