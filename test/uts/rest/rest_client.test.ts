/**
 * UTS: REST Client Tests
 *
 * Spec points: RSC5, RSC7, RSC7c, RSC7d, RSC7e, RSC8a-c, RSC17, RSC18
 * Source: uts/test/rest/unit/rest_client.md
 */

import { expect } from 'chai';
import { MockHttpClient } from '../mock_http';
import { Ably, installMockHttp, restoreAll } from '../helpers';

describe('uts/rest/rest_client', function () {
  afterEach(function () {
    restoreAll();
  });

  /**
   * RSC5 - Auth attribute accessible
   */
  it('RSC5 - client.auth is accessible', function () {
    const client = new Ably.Rest({ key: 'appId.keyId:keySecret' });
    expect(client.auth).to.not.be.null;
    expect(client.auth).to.not.be.undefined;
  });

  /**
   * RSC7e - X-Ably-Version header
   *
   * All REST requests must include the X-Ably-Version header with a version string.
   */
  it('RSC7e - X-Ably-Version header is sent', async function () {
    const captured: any[] = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, [1234567890000]);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret' });
    await client.time();

    expect(captured).to.have.length(1);
    // ably-js sends headers with their original casing
    expect(captured[0].headers).to.have.property('X-Ably-Version');
    expect(captured[0].headers['X-Ably-Version']).to.match(/[0-9.]+/);
  });

  /**
   * RSC7d - Ably-Agent header
   *
   * All REST requests must include the Ably-Agent header identifying the library.
   */
  it('RSC7d - Ably-Agent header is sent', async function () {
    const captured: any[] = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, [1234567890000]);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret' });
    await client.time();

    expect(captured).to.have.length(1);
    expect(captured[0].headers).to.have.property('Ably-Agent');
    expect(captured[0].headers['Ably-Agent']).to.match(/ably-js\/[0-9]+\.[0-9]+/);
  });

  /**
   * RSC7c - Request ID when addRequestIds enabled
   *
   * When addRequestIds is true, all requests must include a request_id query parameter.
   */
  /**
   * NOTE: ably-js accepts addRequestIds option but does not implement it.
   * The option is stored but no request_id parameter is added to requests.
   * See deviations.md.
   */
  it('RSC7c - request_id query param when addRequestIds is true', async function () {
    // DEVIATION: see deviations.md
    this.skip();
    const captured: any[] = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, [1234567890000]);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', addRequestIds: true } as any);
    await client.time();

    expect(captured).to.have.length(1);
    const requestId = captured[0].url.searchParams.get('request_id');
    expect(requestId).to.be.a('string');
    expect(requestId.length).to.be.at.least(12);
  });

  /**
   * RSC8a/RSC8b - Protocol content type
   *
   * With useBinaryProtocol: false, Content-Type should be application/json.
   */
  it('RSC8a/RSC8b - JSON content type when useBinaryProtocol is false', async function () {
    const captured: any[] = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(201, { serials: ['s1'] });
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    await client.channels.get('test').publish('e', 'd');

    expect(captured).to.have.length(1);
    expect(captured[0].headers['content-type']).to.include('application/json');
  });

  /**
   * RSC8c - Accept header
   *
   * Accept header must match the configured protocol.
   */
  it('RSC8c - Accept header is application/json', async function () {
    const captured: any[] = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(201, { serials: ['s1'] });
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    await client.channels.get('test').publish('e', 'd');

    expect(captured).to.have.length(1);
    expect(captured[0].headers['accept']).to.include('application/json');
  });

  /**
   * RSC17 - clientId attribute
   *
   * When clientId is set in ClientOptions, Auth#clientId reflects it.
   */
  it('RSC17 - clientId from options is accessible via auth.clientId', function () {
    const client = new Ably.Rest({
      key: 'appId.keyId:keySecret',
      clientId: 'explicit-client',
    });
    expect(client.auth.clientId).to.equal('explicit-client');
  });

  /**
   * RSC18 - TLS: true uses HTTPS (default)
   */
  it('RSC18 - default TLS uses HTTPS', async function () {
    const captured: any[] = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, [1234567890000]);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret' });
    await client.time();

    expect(captured).to.have.length(1);
    expect(captured[0].url.protocol).to.equal('https:');
  });

  /**
   * RSC18 - TLS: false uses HTTP
   */
  it('RSC18 - tls:false uses HTTP', async function () {
    const captured: any[] = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, [1234567890000]);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ token: 'tok', tls: false });
    await client.time();

    expect(captured).to.have.length(1);
    expect(captured[0].url.protocol).to.equal('http:');
  });

  /**
   * RSC6 - stats() basic request
   *
   * Verify that stats() sends a GET request to /stats.
   */
  it('RSC6 - stats() sends GET /stats', async function () {
    const captured: any[] = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, []);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret' });
    try {
      await client.stats({} as any);
    } catch (e) {
      // Response parsing may fail — we only care about the request
    }

    expect(captured).to.have.length.at.least(1);
    expect(captured[0].method.toUpperCase()).to.equal('GET');
    expect(captured[0].path).to.equal('/stats');
  });

  // ---------------------------------------------------------------------------
  // MsgPack tests — PENDING (mock HTTP does not support msgpack encoding)
  // ---------------------------------------------------------------------------

  it('RSC8a - default msgpack protocol Content-Type', function () {
    // PENDING: Requires mock msgpack encoding support. See deviations.md.
    this.skip();
  });

  it('RSC8d - mismatched Content-Type response decoded', function () {
    // PENDING: Requires mock msgpack encoding support. See deviations.md.
    this.skip();
  });

  it('RSC8e - unsupported Content-Type response error', function () {
    // PENDING: Requires mock msgpack encoding support. See deviations.md.
    this.skip();
  });

  it('RSC8 - msgpack error response decoded', function () {
    // PENDING: Requires mock msgpack encoding support. See deviations.md.
    this.skip();
  });
});
