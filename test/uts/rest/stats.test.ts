/**
 * UTS: REST Stats API Tests
 *
 * Spec points: RSC6, RSC6a, RSC6b1, RSC6b2, RSC6b3, RSC6b4
 * Source: uts/test/rest/unit/stats.md
 */

import { expect } from 'chai';
import { MockHttpClient } from '../mock_http';
import { Ably, installMockHttp, restoreAll } from '../helpers';

describe('uts/rest/stats', function () {
  afterEach(function () {
    restoreAll();
  });

  /**
   * RSC6a - stats() returns PaginatedResult with Stats objects
   *
   * The stats() method makes a GET request to /stats and returns a
   * PaginatedResult containing Stats objects.
   */
  it('RSC6a - stats() returns PaginatedResult with Stats objects', async function () {
    const captured = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, [
          { intervalId: '2024-01-01:00:00', unit: 'hour', all: { messages: { count: 100, data: 5000 }, all: { count: 100, data: 5000 } } },
          { intervalId: '2024-01-01:01:00', unit: 'hour', all: { messages: { count: 150, data: 7500 }, all: { count: 150, data: 7500 } } },
        ]);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const result = await client.stats();

    // Result should be a PaginatedResult with 2 items
    expect(result.items).to.have.length(2);
    expect(result.items[0].intervalId).to.equal('2024-01-01:00:00');
    expect(result.items[1].intervalId).to.equal('2024-01-01:01:00');
  });

  /**
   * RSC6a - stats() sends GET /stats
   *
   * The stats endpoint must be accessed via GET /stats.
   */
  it('RSC6a - stats() sends GET /stats', async function () {
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
    await client.stats();

    expect(captured).to.have.length(1);
    expect(captured[0].method).to.equal('get');
    expect(captured[0].path).to.equal('/stats');
  });

  /**
   * RSC6a - stats() sends authenticated request with standard headers
   *
   * The /stats endpoint requires authentication. Requests must include
   * valid credentials and standard Ably headers.
   */
  it('RSC6a - stats() sends authenticated request with standard headers', async function () {
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
    await client.stats();

    expect(captured).to.have.length(1);
    const request = captured[0];

    // Request must be authenticated
    expect(request.headers.authorization).to.match(/^Basic /);

    // Standard Ably headers must be present
    expect(request.headers).to.have.property('X-Ably-Version');
    expect(request.headers).to.have.property('Ably-Agent');
  });

  /**
   * RSC6b1 - stats() with start parameter
   *
   * start is an optional timestamp field represented as milliseconds
   * since epoch.
   */
  it('RSC6b1 - stats() with start parameter', async function () {
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
    await client.stats({ start: 1704067200000 });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('start')).to.equal('1704067200000');
  });

  /**
   * RSC6b1 - stats() with end parameter
   *
   * end is an optional timestamp field represented as milliseconds
   * since epoch.
   */
  it('RSC6b1 - stats() with end parameter', async function () {
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
    await client.stats({ end: 1706745599000 });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('end')).to.equal('1706745599000');
  });

  /**
   * RSC6b1 - stats() with start and end parameters
   *
   * Both start and end can be provided together. start must be <= end.
   */
  it('RSC6b1 - stats() with start and end parameters', async function () {
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
    await client.stats({ start: 1704067200000, end: 1706745599000 });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('start')).to.equal('1704067200000');
    expect(captured[0].url.searchParams.get('end')).to.equal('1706745599000');
  });

  /**
   * RSC6b2 - stats() with direction parameter
   *
   * direction backwards or forwards; if omitted the direction defaults
   * to the REST API default (backwards).
   */
  it('RSC6b2 - stats() with direction parameter', async function () {
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
    await client.stats({ direction: 'forwards' });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('direction')).to.equal('forwards');
  });

  /**
   * RSC6b2 - stats() direction defaults to backwards
   *
   * When direction is not specified, it is either omitted from the query
   * (letting the server apply the default) or sent as "backwards".
   */
  it('RSC6b2 - stats() direction defaults to backwards', async function () {
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
    await client.stats();

    expect(captured).to.have.length(1);
    const direction = captured[0].url.searchParams.get('direction');
    expect(direction === null || direction === 'backwards').to.be.true;
  });

  /**
   * RSC6b3 - stats() with limit parameter
   *
   * limit supports up to 1,000 items; if omitted the limit defaults
   * to the REST API default (100).
   */
  it('RSC6b3 - stats() with limit parameter', async function () {
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
    await client.stats({ limit: 10 });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('limit')).to.equal('10');
  });

  /**
   * RSC6b3 - stats() limit defaults to 100
   *
   * When limit is not specified, it is either omitted (server default)
   * or sent as "100".
   */
  it('RSC6b3 - stats() limit defaults to 100', async function () {
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
    await client.stats();

    expect(captured).to.have.length(1);
    const limit = captured[0].url.searchParams.get('limit');
    expect(limit === null || limit === '100').to.be.true;
  });

  /**
   * RSC6b4 - stats() with unit parameter (minute)
   */
  it('RSC6b4 - stats() with unit=minute', async function () {
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
    await client.stats({ unit: 'minute' });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('unit')).to.equal('minute');
  });

  /**
   * RSC6b4 - stats() with unit parameter (hour)
   */
  it('RSC6b4 - stats() with unit=hour', async function () {
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
    await client.stats({ unit: 'hour' });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('unit')).to.equal('hour');
  });

  /**
   * RSC6b4 - stats() with unit parameter (day)
   */
  it('RSC6b4 - stats() with unit=day', async function () {
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
    await client.stats({ unit: 'day' });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('unit')).to.equal('day');
  });

  /**
   * RSC6b4 - stats() with unit parameter (month)
   */
  it('RSC6b4 - stats() with unit=month', async function () {
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
    await client.stats({ unit: 'month' });

    expect(captured).to.have.length(1);
    expect(captured[0].url.searchParams.get('unit')).to.equal('month');
  });

  /**
   * RSC6b4 - stats() unit defaults to minute
   *
   * When unit is not specified, it is either omitted (server default)
   * or sent as "minute".
   */
  it('RSC6b4 - stats() unit defaults to minute', async function () {
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
    await client.stats();

    expect(captured).to.have.length(1);
    const unit = captured[0].url.searchParams.get('unit');
    expect(unit === null || unit === 'minute').to.be.true;
  });

  /**
   * RSC6b - stats() with all parameters combined
   *
   * All query parameters can be used together in a single request.
   */
  it('RSC6b - stats() with all parameters combined', async function () {
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
    await client.stats({
      start: 1704067200000,
      end: 1706745599000,
      direction: 'forwards',
      limit: 50,
      unit: 'hour',
    });

    expect(captured).to.have.length(1);
    const params = captured[0].url.searchParams;
    expect(params.get('start')).to.equal('1704067200000');
    expect(params.get('end')).to.equal('1706745599000');
    expect(params.get('direction')).to.equal('forwards');
    expect(params.get('limit')).to.equal('50');
    expect(params.get('unit')).to.equal('hour');
  });

  /**
   * RSC6a - stats() empty results
   *
   * Must handle empty result sets correctly.
   */
  it('RSC6a - stats() empty results', async function () {
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        req.respond_with(200, []);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const result = await client.stats();

    expect(result.items).to.have.length(0);
    expect(result.hasNext()).to.be.false;
    expect(result.isLast()).to.be.true;
  });

  /**
   * RSC6a - stats() error handling
   *
   * Errors from the stats endpoint must be properly propagated to the caller.
   */
  it('RSC6a - stats() error handling', async function () {
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        req.respond_with(401, {
          error: {
            message: 'Unauthorized',
            code: 40100,
            statusCode: 401,
          },
        });
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });

    try {
      await client.stats();
      expect.fail('Expected stats() to throw');
    } catch (error) {
      expect(error.statusCode).to.equal(401);
      expect(error.code).to.equal(40100);
    }
  });

  /**
   * RSC6a - stats() pagination with Link headers
   *
   * PaginatedResult supports navigation via Link headers (TG4, TG6).
   */
  it('RSC6a - stats() pagination with Link headers', async function () {
    const captured = [];
    let reqCount = 0;
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        reqCount++;
        if (reqCount === 1) {
          req.respond_with(200, [
            { intervalId: '2024-01-01:01:00', unit: 'hour' },
          ], {
            'Link': '<./stats?start=1704070800000&limit=1>; rel="next"',
          });
        } else {
          req.respond_with(200, [
            { intervalId: '2024-01-01:00:00', unit: 'hour' },
          ]);
        }
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });

    // First page
    const page1 = await client.stats({ limit: 1 });
    expect(page1.items).to.have.length(1);
    expect(page1.items[0].intervalId).to.equal('2024-01-01:01:00');
    expect(page1.hasNext()).to.be.true;
    expect(page1.isLast()).to.be.false;

    // Second page
    const page2 = await page1.next();
    expect(page2.items).to.have.length(1);
    expect(page2.items[0].intervalId).to.equal('2024-01-01:00:00');
    expect(page2.hasNext()).to.be.false;
    expect(page2.isLast()).to.be.true;
  });
});
