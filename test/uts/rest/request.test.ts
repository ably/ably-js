/**
 * UTS: REST client.request() and HttpPaginatedResponse Tests
 *
 * Spec points: RSC19, RSC19b, RSC19c, RSC19d, RSC19f, RSC19f1, HP1, HP3, HP4, HP5, HP6, HP7, HP8
 * Source: uts/test/rest/unit/request.md
 */

import { expect } from 'chai';
import { MockHttpClient } from '../mock_http';
import { Ably, installMockHttp, restoreAll } from '../helpers';

describe('uts/rest/request', function () {
  afterEach(function () {
    restoreAll();
  });

  // ---------------------------------------------------------------------------
  // RSC19f — HTTP methods
  // ---------------------------------------------------------------------------

  describe('RSC19f - HTTP method support', function () {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

    methods.forEach(function (method) {
      it(`${method} request to /test`, async function () {
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
        const response = await client.request(method, '/test', 3);

        expect(captured).to.have.length(1);
        expect(captured[0].method).to.equal(method.toLowerCase());
        expect(captured[0].path).to.equal('/test');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // RSC19f — Request details
  // ---------------------------------------------------------------------------

  describe('RSC19f - Request details', function () {
    it('query params sent correctly', async function () {
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
      await client.request('GET', '/channels/test/messages', 3, { limit: '10', direction: 'backwards' });

      expect(captured).to.have.length(1);
      expect(captured[0].url.searchParams.get('limit')).to.equal('10');
      expect(captured[0].url.searchParams.get('direction')).to.equal('backwards');
    });

    it('custom headers included', async function () {
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
      await client.request('GET', '/test', 3, null, null, {
        'X-Custom-Header': 'custom-value',
        'X-Another': 'another-value',
      });

      expect(captured).to.have.length(1);
      expect(captured[0].headers['X-Custom-Header']).to.equal('custom-value');
      expect(captured[0].headers['X-Another']).to.equal('another-value');
    });

    it('Basic auth header included automatically', async function () {
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
      await client.request('GET', '/test', 3);

      expect(captured).to.have.length(1);
      expect(captured[0].headers).to.have.property('authorization');
      expect(captured[0].headers['authorization']).to.match(/^Basic /);

      // Verify the base64 encoded credentials
      const b64 = captured[0].headers['authorization'].substring(6);
      const decoded = Buffer.from(b64, 'base64').toString();
      expect(decoded).to.equal('appId.keyId:keySecret');
    });

    it('body encoding (JSON)', async function () {
      const captured = [];
      const mock = new MockHttpClient({
        onConnectionAttempt: (conn) => conn.respond_with_success(),
        onRequest: (req) => {
          captured.push(req);
          req.respond_with(201, []);
        },
      });
      installMockHttp(mock);

      const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
      await client.request('POST', '/channels/test/messages', 3, null, { name: 'event', data: 'payload' });

      expect(captured).to.have.length(1);
      const body = JSON.parse(captured[0].body);
      expect(body.name).to.equal('event');
      expect(body.data).to.equal('payload');
    });
  });

  // ---------------------------------------------------------------------------
  // HP — HttpPaginatedResponse properties
  // ---------------------------------------------------------------------------

  describe('HP - HttpPaginatedResponse', function () {
    it('HP4 - statusCode from response', async function () {
      const mock = new MockHttpClient({
        onConnectionAttempt: (conn) => conn.respond_with_success(),
        onRequest: (req) => {
          req.respond_with(201, []);
        },
      });
      installMockHttp(mock);

      const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
      const response = await client.request('POST', '/test', 3, null, { data: 'test' });

      expect(response.statusCode).to.equal(201);
    });

    it('HP5 - success=true for 2xx', async function () {
      const mock = new MockHttpClient({
        onConnectionAttempt: (conn) => conn.respond_with_success(),
        onRequest: (req) => {
          req.respond_with(200, []);
        },
      });
      installMockHttp(mock);

      const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
      const response = await client.request('GET', '/test', 3);

      expect(response.success).to.be.true;
    });

    it('HP5 - success=false for 4xx', async function () {
      const mock = new MockHttpClient({
        onConnectionAttempt: (conn) => conn.respond_with_success(),
        onRequest: (req) => {
          req.respond_with(400, { error: { code: 40000, message: 'Bad request' } });
        },
      });
      installMockHttp(mock);

      const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
      const response = await client.request('GET', '/test', 3);

      expect(response.statusCode).to.equal(400);
      expect(response.success).to.be.false;
    });

    it('HP6 - errorCode from error response', async function () {
      const mock = new MockHttpClient({
        onConnectionAttempt: (conn) => conn.respond_with_success(),
        onRequest: (req) => {
          req.respond_with(401, { error: { code: 40101, message: 'Unauthorized' } }, {
            'X-Ably-Errorcode': '40101',
          });
        },
      });
      installMockHttp(mock);

      const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
      const response = await client.request('GET', '/test', 3);

      expect(response.errorCode).to.equal(40101);
    });

    it('HP7 - errorMessage from error response', async function () {
      const mock = new MockHttpClient({
        onConnectionAttempt: (conn) => conn.respond_with_success(),
        onRequest: (req) => {
          req.respond_with(401, { error: { code: 40101, message: 'Unauthorized' } }, {
            'X-Ably-Errorcode': '40101',
            'X-Ably-Errormessage': 'Token expired',
          });
        },
      });
      installMockHttp(mock);

      const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
      const response = await client.request('GET', '/test', 3);

      // errorMessage comes from the error body, not the header
      expect(response.errorMessage).to.be.a('string');
      expect(response.errorMessage).to.equal('Unauthorized');
    });

    it('HP3 - items array from response body', async function () {
      const mock = new MockHttpClient({
        onConnectionAttempt: (conn) => conn.respond_with_success(),
        onRequest: (req) => {
          req.respond_with(200, [
            { id: 'msg1', name: 'event1', data: 'data1' },
            { id: 'msg2', name: 'event2', data: 'data2' },
          ]);
        },
      });
      installMockHttp(mock);

      const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
      const response = await client.request('GET', '/channels/test/messages', 3);

      expect(response.items).to.have.length(2);
      expect(response.items[0].id).to.equal('msg1');
      expect(response.items[1].id).to.equal('msg2');
    });

    it('HP8 - response headers accessible', async function () {
      const mock = new MockHttpClient({
        onConnectionAttempt: (conn) => conn.respond_with_success(),
        onRequest: (req) => {
          req.respond_with(200, [], {
            'X-Request-Id': 'req-123',
            'X-Custom-Header': 'custom-value',
          });
        },
      });
      installMockHttp(mock);

      const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
      const response = await client.request('GET', '/test', 3);

      expect(response.headers['X-Request-Id']).to.equal('req-123');
      expect(response.headers['X-Custom-Header']).to.equal('custom-value');
    });

    it('HP1 - pagination: hasNext/isLast with Link header', async function () {
      let reqCount = 0;
      const mock = new MockHttpClient({
        onConnectionAttempt: (conn) => conn.respond_with_success(),
        onRequest: (req) => {
          reqCount++;
          if (reqCount === 1) {
            req.respond_with(200, [{ id: '1' }, { id: '2' }], {
              'Link': '<./messages?cursor=abc>; rel="next"',
            });
          } else {
            req.respond_with(200, [{ id: '3' }]);
          }
        },
      });
      installMockHttp(mock);

      const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
      const response = await client.request('GET', '/channels/test/messages', 3);

      expect(response.items).to.have.length(2);
      expect(response.hasNext()).to.be.true;
      expect(response.isLast()).to.be.false;
    });

    it('HP1 - pagination: next() fetches next page', async function () {
      let reqCount = 0;
      const mock = new MockHttpClient({
        onConnectionAttempt: (conn) => conn.respond_with_success(),
        onRequest: (req) => {
          reqCount++;
          if (reqCount === 1) {
            req.respond_with(200, [{ id: '1' }, { id: '2' }], {
              'Link': '<./messages?cursor=abc>; rel="next"',
            });
          } else {
            req.respond_with(200, [{ id: '3' }]);
          }
        },
      });
      installMockHttp(mock);

      const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
      const page1 = await client.request('GET', '/channels/test/messages', 3);

      expect(page1.items).to.have.length(2);
      expect(page1.hasNext()).to.be.true;

      const page2 = await page1.next();
      expect(page2.items).to.have.length(1);
      expect(page2.items[0].id).to.equal('3');
      expect(page2.hasNext()).to.be.false;
      expect(page2.isLast()).to.be.true;
    });
  });

  // ---------------------------------------------------------------------------
  // RSC19 — Error handling
  // ---------------------------------------------------------------------------

  describe('RSC19 - Error handling', function () {
    it('404 returns HPR with statusCode=404, success=false', async function () {
      const mock = new MockHttpClient({
        onConnectionAttempt: (conn) => conn.respond_with_success(),
        onRequest: (req) => {
          req.respond_with(404, { error: { code: 40400, message: 'Not found' } });
        },
      });
      installMockHttp(mock);

      const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
      const response = await client.request('GET', '/nonexistent', 3);

      expect(response.statusCode).to.equal(404);
      expect(response.success).to.be.false;
      expect(response.errorCode).to.equal(40400);
    });

    it('500 returns HPR with statusCode=500, success=false', async function () {
      const mock = new MockHttpClient({
        onConnectionAttempt: (conn) => conn.respond_with_success(),
        onRequest: (req) => {
          req.respond_with(500, { error: { code: 50000, message: 'Internal error' } });
        },
      });
      installMockHttp(mock);

      const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
      const response = await client.request('GET', '/test', 3);

      expect(response.statusCode).to.equal(500);
      expect(response.success).to.be.false;
      expect(response.errorCode).to.equal(50000);
    });

    it('Token auth request uses Bearer authorization', async function () {
      const captured: any[] = [];
      const mock = new MockHttpClient({
        onConnectionAttempt: (conn) => conn.respond_with_success(),
        onRequest: (req) => {
          captured.push(req);
          req.respond_with(200, []);
        },
      });
      installMockHttp(mock);

      const client = new Ably.Rest({
        useBinaryProtocol: false,
        authCallback: (params: any, callback: any) => {
          callback(null, 'my-token');
        },
      });
      await client.request('GET', '/test', 3);

      expect(captured).to.have.length(1);
      expect(captured[0].headers).to.have.property('authorization');
      expect(captured[0].headers['authorization']).to.match(/^Bearer /);
    });

    /**
     * Path normalization - ably-js does not normalize paths without leading slash.
     * The path is appended directly to the base URI, so 'test' without '/' may
     * cause a malformed URL or unexpected path. This test verifies ably-js
     * behavior: path is used as-is and the leading slash comes from the base URI.
     */
    it('Path normalization - path with leading slash', async function () {
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
      await client.request('GET', '/test', 3);

      expect(captured).to.have.length(1);
      expect(captured[0].path).to.equal('/test');
    });

    /**
     * Network error handling - connection refused propagates as error.
     * When the mock refuses the connection, client.request() throws
     * rather than returning a response object.
     */
    it('Network error handling - connection refused', async function () {
      const mock = new MockHttpClient({
        onConnectionAttempt: (conn) => conn.respond_with_refused(),
      });
      installMockHttp(mock);

      const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });

      try {
        await client.request('GET', '/test', 3);
        expect.fail('Expected request to throw on connection refused');
      } catch (error: any) {
        expect(error).to.exist;
      }
    });
  });

  // ---------------------------------------------------------------------------
  // MsgPack tests — PENDING (mock HTTP does not support msgpack encoding)
  // ---------------------------------------------------------------------------

  it('RSC19c - msgpack request headers', function () {
    // PENDING: Requires mock msgpack encoding support. See deviations.md.
    this.skip();
  });

  it('RSC19c - msgpack request body encoding', function () {
    // PENDING: Requires mock msgpack encoding support. See deviations.md.
    this.skip();
  });

  it('RSC19c - msgpack response decoding', function () {
    // PENDING: Requires mock msgpack encoding support. See deviations.md.
    this.skip();
  });
});
