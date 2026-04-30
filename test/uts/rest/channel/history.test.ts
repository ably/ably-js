/**
 * UTS: REST Channel History Tests
 *
 * Spec points: RSL2, RSL2a, RSL2b, RSL2b1, RSL2b2, RSL2b3
 * Source: uts/test/rest/unit/channel/history.md
 */

import { expect } from 'chai';
import { MockHttpClient } from '../../mock_http';
import { Ably, installMockHttp, restoreAll } from '../../helpers';

describe('uts/rest/channel/history', function () {
  afterEach(function () {
    restoreAll();
  });

  /**
   * RSL2a - history returns PaginatedResult
   *
   * The history() method must return a PaginatedResult containing
   * Message objects deserialized from the response.
   */
  it('RSL2a - history returns PaginatedResult', async function () {
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        req.respond_with(200, [
          { id: '1', name: 'a', data: 'x' },
          { id: '2', name: 'b', data: 'y' },
        ]);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const ch = client.channels.get('test');
    const result = await ch.history();

    expect(result.items).to.have.length(2);
    expect(result.items[0].name).to.equal('a');
    expect(result.items[0].data).to.equal('x');
    expect(result.items[1].name).to.equal('b');
    expect(result.items[1].data).to.equal('y');
  });

  /**
   * RSL2b - history with start parameter
   *
   * The start parameter is an optional timestamp (ms since epoch)
   * that filters messages to those published at or after that time.
   */
  it('RSL2b - history with start parameter', async function () {
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
    const ch = client.channels.get('test');
    await ch.history({ start: 1000 });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('start')).to.equal('1000');
  });

  /**
   * RSL2b - history with end parameter
   *
   * The end parameter is an optional timestamp (ms since epoch)
   * that filters messages to those published at or before that time.
   */
  it('RSL2b - history with end parameter', async function () {
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
    const ch = client.channels.get('test');
    await ch.history({ end: 2000 });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('end')).to.equal('2000');
  });

  /**
   * RSL2b - history with direction parameter
   *
   * The direction parameter controls the ordering of results:
   * 'forwards' or 'backwards'.
   */
  it('RSL2b - history with direction parameter', async function () {
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
    const ch = client.channels.get('test');
    await ch.history({ direction: 'forwards' });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('direction')).to.equal('forwards');
  });

  /**
   * RSL2b - history with direction: backwards
   */
  it('RSL2b - history with direction backwards', async function () {
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
    const ch = client.channels.get('test');
    await ch.history({ direction: 'backwards' });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('direction')).to.equal('backwards');
  });

  /**
   * RSL2b1 - default direction is backwards
   *
   * When direction is not specified, it defaults to 'backwards'
   * (either omitted from the query or sent as 'backwards').
   */
  it('RSL2b1 - default direction is backwards', async function () {
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
    const ch = client.channels.get('test');
    await ch.history();

    expect(captured).to.have.length(1);
    const direction = captured[0].url.searchParams.get('direction');
    expect(direction === null || direction === 'backwards').to.be.true;
  });

  /**
   * RSL2b2 - limit parameter
   *
   * The limit parameter controls the maximum number of results returned.
   */
  it('RSL2b2 - limit parameter', async function () {
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
    const ch = client.channels.get('test');
    await ch.history({ limit: 10 });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('limit')).to.equal('10');
  });

  /**
   * RSL2b3 - default limit
   *
   * When limit is not specified, it defaults to 100
   * (either omitted from the query or sent as '100').
   */
  it('RSL2b3 - default limit', async function () {
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
    const ch = client.channels.get('test');
    await ch.history();

    expect(captured).to.have.length(1);
    const limit = captured[0].url.searchParams.get('limit');
    expect(limit === null || limit === '100').to.be.true;
  });

  /**
   * RSL2 - URL encoding of channel name
   *
   * Channel names containing special characters must be properly
   * URL-encoded in the request path.
   */
  it('RSL2 - URL encoding of channel name', async function () {
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
    const channelName = 'ns:my channel';
    const ch = client.channels.get(channelName);
    await ch.history();

    expect(captured).to.have.length(1);
    const expectedPath = `/channels/${encodeURIComponent(channelName)}/messages`;
    expect(captured[0].path).to.equal(expectedPath);
  });

  /**
   * RSL2 - History with combined time range (start and end)
   */
  it('RSL2 - history with start and end time range', async function () {
    const captured: any[] = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, [
          { name: 'event', data: 'in-range', timestamp: 1500 },
        ]);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    await client.channels.get('test').history({ start: 1000, end: 2000 });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('start')).to.equal('1000');
    expect(captured[0].url.searchParams.get('end')).to.equal('2000');
  });

  /**
   * RSL2 - URL encoding with colon in channel name
   */
  it('RSL2 - URL encoding with colon', async function () {
    const captured: any[] = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, []);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    await client.channels.get('namespace:channel').history();

    expect(captured).to.have.length(1);
    expect(captured[0].path).to.equal('/channels/' + encodeURIComponent('namespace:channel') + '/messages');
  });

  /**
   * RSL2 - URL encoding with slash in channel name
   */
  it('RSL2 - URL encoding with slash', async function () {
    const captured: any[] = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, []);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    await client.channels.get('path/to/channel').history();

    expect(captured).to.have.length(1);
    expect(captured[0].path).to.equal('/channels/' + encodeURIComponent('path/to/channel') + '/messages');
  });
});
