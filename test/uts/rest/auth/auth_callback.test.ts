/**
 * UTS: Auth Callback Tests
 *
 * Spec points: RSA8c, RSA8d
 * Source: specification/uts/rest/unit/auth/auth_callback.md
 */

import { expect } from 'chai';
import { MockHttpClient } from '../../mock_http';
import { Ably, installMockHttp, restoreAll } from '../../helpers';

function simpleMock(captured) {
  return new MockHttpClient({
    onConnectionAttempt: (conn) => conn.respond_with_success(),
    onRequest: (req) => {
      captured.push(req);
      req.respond_with(200, []);
    },
  });
}

function authUrlMock(captured, tokenValue) {
  return new MockHttpClient({
    onConnectionAttempt: (conn) => conn.respond_with_success(),
    onRequest: (req) => {
      captured.push(req);
      if (req.url.host === 'auth.example.com') {
        req.respond_with(200, tokenValue || 'authurl-token', { 'content-type': 'text/plain' });
      } else {
        req.respond_with(200, []);
      }
    },
  });
}

describe('uts/rest/auth/auth_callback', function () {
  afterEach(function () {
    restoreAll();
  });

  /**
   * RSA8d - authCallback invoked for authentication
   */
  it('RSA8d - authCallback invoked for authentication', async function () {
    const captured = [];
    let callbackInvoked = false;

    installMockHttp(simpleMock(captured));

    const client = new Ably.Rest({
      authCallback: function (params, callback) {
        callbackInvoked = true;
        callback(null, 'callback-token');
      },
    });
    try { await client.stats(); } catch (e) { /* ok */ }

    expect(callbackInvoked).to.be.true;
    expect(captured).to.have.length(1);
    const expectedAuth = 'Bearer ' + Buffer.from('callback-token').toString('base64');
    expect(captured[0].headers.authorization).to.equal(expectedAuth);
  });

  /**
   * RSA8d - authCallback returning JWT string
   */
  it('RSA8d - authCallback returning JWT string', async function () {
    const captured = [];
    installMockHttp(simpleMock(captured));

    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-jwt-payload';
    const client = new Ably.Rest({
      authCallback: function (params, callback) {
        callback(null, jwt);
      },
    });
    try { await client.stats(); } catch (e) { /* ok */ }

    expect(captured).to.have.length(1);
    const expectedAuth = 'Bearer ' + Buffer.from(jwt).toString('base64');
    expect(captured[0].headers.authorization).to.equal(expectedAuth);
  });

  /**
   * RSA8d - authCallback returning TokenRequest
   */
  it('RSA8d - authCallback returning TokenRequest', async function () {
    const captured = [];

    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        if (req.path.match(/\/keys\/.*\/requestToken/)) {
          req.respond_with(200, {
            token: 'exchanged-token',
            expires: Date.now() + 3600000,
            issued: Date.now(),
          });
        } else {
          req.respond_with(200, []);
        }
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({
      authCallback: function (params, callback) {
        callback(null, {
          keyName: 'app.key',
          ttl: 3600000,
          timestamp: Date.now(),
          nonce: 'unique-nonce',
          mac: 'computed-mac',
        });
      },
    });
    try { await client.stats(); } catch (e) { /* ok */ }

    expect(captured.length).to.be.at.least(2);

    // First request was POST to /keys/.../requestToken
    expect(captured[0].method.toUpperCase()).to.equal('POST');
    expect(captured[0].path).to.match(/\/keys\/.*\/requestToken/);

    // Second request used the exchanged token
    const apiReq = captured[captured.length - 1];
    const expectedAuth = 'Bearer ' + Buffer.from('exchanged-token').toString('base64');
    expect(apiReq.headers.authorization).to.equal(expectedAuth);
  });

  /**
   * RSA8d - authCallback receives TokenParams
   */
  it('RSA8d - authCallback receives TokenParams', async function () {
    let receivedParams = null;

    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => req.respond_with(200, []),
    });
    installMockHttp(mock);

    const client = new Ably.Rest({
      authCallback: function (params, callback) {
        receivedParams = params;
        callback(null, 'test-token');
      },
    });
    await client.auth.authorize({
      clientId: 'requested-client-id',
      ttl: 7200000,
      capability: { channel1: ['publish'] },
    });

    expect(receivedParams).to.not.be.null;
    expect(receivedParams.clientId).to.equal('requested-client-id');
    expect(receivedParams.ttl).to.equal(7200000);
  });

  /**
   * RSA8c - authUrl invoked for authentication (GET)
   */
  it('RSA8c - authUrl invoked for authentication (GET)', async function () {
    const captured = [];
    installMockHttp(authUrlMock(captured));

    const client = new Ably.Rest({
      authUrl: 'https://auth.example.com/token',
    });
    try { await client.stats(); } catch (e) { /* ok */ }

    expect(captured.length).to.be.at.least(2);

    // First request was to authUrl
    const authReq = captured[0];
    expect(authReq.url.host).to.equal('auth.example.com');
    expect(authReq.path).to.equal('/token');
    expect(authReq.method.toUpperCase()).to.equal('GET');

    // Second request used the token
    const apiReq = captured[captured.length - 1];
    const expectedAuth = 'Bearer ' + Buffer.from('authurl-token').toString('base64');
    expect(apiReq.headers.authorization).to.equal(expectedAuth);
  });

  /**
   * RSA8c - authUrl with POST method
   */
  it('RSA8c - authUrl with POST method', async function () {
    const captured = [];

    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        if (req.url.host === 'auth.example.com') {
          req.respond_with(200, 'authurl-token', { 'content-type': 'text/plain' });
        } else {
          req.respond_with(200, []);
        }
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({
      authUrl: 'https://auth.example.com/token',
      authMethod: 'POST',
    });
    try { await client.stats(); } catch (e) { /* ok */ }

    const authReq = captured[0];
    expect(authReq.method.toUpperCase()).to.equal('POST');
  });

  /**
   * RSA8c - authUrl with custom headers
   */
  it('RSA8c - authUrl with custom headers', async function () {
    const captured = [];
    installMockHttp(authUrlMock(captured));

    const client = new Ably.Rest({
      authUrl: 'https://auth.example.com/token',
      authHeaders: {
        'X-Custom-Header': 'custom-value',
        'X-API-Key': 'my-api-key',
      },
    });
    try { await client.stats(); } catch (e) { /* ok */ }

    const authReq = captured[0];
    expect(authReq.headers['X-Custom-Header']).to.equal('custom-value');
    expect(authReq.headers['X-API-Key']).to.equal('my-api-key');
  });

  /**
   * RSA8c - authUrl with query params
   */
  it('RSA8c - authUrl with query params', async function () {
    const captured = [];
    installMockHttp(authUrlMock(captured));

    const client = new Ably.Rest({
      authUrl: 'https://auth.example.com/token',
      authParams: {
        client_id: 'my-client',
        scope: 'publish:*',
      },
    });
    try { await client.stats(); } catch (e) { /* ok */ }

    const authReq = captured[0];
    expect(authReq.url.searchParams.get('client_id')).to.equal('my-client');
    expect(authReq.url.searchParams.get('scope')).to.equal('publish:*');
  });

  /**
   * RSA8c - authUrl returning JWT string
   */
  it('RSA8c - authUrl returning JWT string', async function () {
    const captured = [];
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.jwt-body.signature';
    installMockHttp(authUrlMock(captured, jwt));

    const client = new Ably.Rest({
      authUrl: 'https://auth.example.com/jwt',
    });
    try { await client.stats(); } catch (e) { /* ok */ }

    const apiReq = captured[captured.length - 1];
    const expectedAuth = 'Bearer ' + Buffer.from(jwt).toString('base64');
    expect(apiReq.headers.authorization).to.equal(expectedAuth);
  });

  /**
   * RSA8d - authCallback error propagated
   */
  it('RSA8d - authCallback error propagated', async function () {
    const captured = [];
    installMockHttp(simpleMock(captured));

    const client = new Ably.Rest({
      authCallback: function (params, callback) {
        callback(new Error('Authentication server unavailable'));
      },
    });

    try {
      await client.stats();
      expect.fail('Expected request to throw');
    } catch (error) {
      expect(error.statusCode).to.equal(401);
    }

    // No API requests should have been made
    expect(captured).to.have.length(0);
  });

  /**
   * RSA8c - authUrl error propagated
   */
  it('RSA8c - authUrl error propagated', async function () {
    const captured = [];

    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        if (req.url.host === 'auth.example.com') {
          req.respond_with(500, { error: 'Internal server error' });
        } else {
          req.respond_with(200, []);
        }
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({
      authUrl: 'https://auth.example.com/token',
    });

    try {
      await client.stats();
      expect.fail('Expected request to throw');
    } catch (error) {
      // Error should indicate auth failure (statusCode may be 401 per RSA4e or 500)
      expect(error.statusCode).to.be.oneOf([401, 500]);
    }

    // Only authUrl request was made, not the API request
    expect(captured).to.have.length(1);
    expect(captured[0].url.host).to.equal('auth.example.com');
  });
});
