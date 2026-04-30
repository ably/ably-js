/**
 * UTS: Auth.tokenDetails Tests
 *
 * Spec points: RSA16, RSA16a, RSA16b, RSA16c, RSA16d
 * Source: specification/uts/rest/unit/auth/token_details.md
 */

import { expect } from 'chai';
import { MockHttpClient } from '../../mock_http';
import { Ably, installMockHttp, restoreAll } from '../../helpers';

function simpleMock(captured) {
  return new MockHttpClient({
    onConnectionAttempt: (conn) => conn.respond_with_success(),
    onRequest: (req) => {
      if (captured) captured.push(req);
      req.respond_with(200, []);
    },
  });
}

describe('uts/rest/auth/token_details', function () {
  afterEach(function () {
    restoreAll();
  });

  /**
   * RSA16a - tokenDetails reflects token from authCallback
   */
  it('RSA16a - tokenDetails from authCallback', async function () {
    installMockHttp(simpleMock());

    const client = new Ably.Rest({
      authCallback: function (params, callback) {
        callback(null, {
          token: 'callback-token-abc',
          expires: Date.now() + 3600000,
          issued: Date.now(),
          clientId: 'my-client',
        });
      },
    });

    // Force token acquisition
    try { await client.stats(); } catch (e) { /* ok */ }

    expect(client.auth.tokenDetails).to.not.be.null;
    expect(client.auth.tokenDetails.token).to.equal('callback-token-abc');
    expect(client.auth.tokenDetails.clientId).to.equal('my-client');
    expect(client.auth.tokenDetails.expires).to.be.a('number');
    expect(client.auth.tokenDetails.issued).to.be.a('number');
  });

  /**
   * RSA16a - tokenDetails reflects token from requestToken (authorize with key)
   */
  it('RSA16a - tokenDetails from requestToken', async function () {
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        if (req.path.match(/\/keys\/.*\/requestToken/)) {
          req.respond_with(200, {
            token: 'requested-token-xyz',
            expires: Date.now() + 3600000,
            issued: Date.now(),
            keyName: 'appId.keyId',
            clientId: 'token-client',
          });
        } else {
          req.respond_with(200, []);
        }
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret' });
    await client.auth.authorize();

    expect(client.auth.tokenDetails).to.not.be.null;
    expect(client.auth.tokenDetails.token).to.equal('requested-token-xyz');
    expect(client.auth.tokenDetails.clientId).to.equal('token-client');
  });

  /**
   * RSA16b - tokenDetails created from token string in ClientOptions
   */
  it('RSA16b - tokenDetails from token string option', function () {
    installMockHttp(simpleMock());

    const client = new Ably.Rest({ token: 'standalone-token-string' });

    expect(client.auth.tokenDetails).to.not.be.null;
    expect(client.auth.tokenDetails.token).to.equal('standalone-token-string');
    // Other fields should be null/undefined since we only had the token string
    expect(client.auth.tokenDetails.expires).to.satisfy((v) => v === null || v === undefined);
    expect(client.auth.tokenDetails.issued).to.satisfy((v) => v === null || v === undefined);
    expect(client.auth.tokenDetails.clientId).to.satisfy((v) => v === null || v === undefined);
    expect(client.auth.tokenDetails.capability).to.satisfy((v) => v === null || v === undefined);
  });

  /**
   * RSA16b - tokenDetails created from token string in authCallback
   */
  it('RSA16b - tokenDetails from token string authCallback', async function () {
    installMockHttp(simpleMock());

    const client = new Ably.Rest({
      authCallback: function (params, callback) {
        callback(null, 'just-a-token-string');
      },
    });

    // Force token acquisition
    try { await client.stats(); } catch (e) { /* ok */ }

    expect(client.auth.tokenDetails).to.not.be.null;
    expect(client.auth.tokenDetails.token).to.equal('just-a-token-string');
    // Other fields should be null/undefined
    expect(client.auth.tokenDetails.expires).to.satisfy((v) => v === null || v === undefined);
    expect(client.auth.tokenDetails.issued).to.satisfy((v) => v === null || v === undefined);
  });

  /**
   * RSA16c - tokenDetails set on instantiation with tokenDetails option
   */
  it('RSA16c - tokenDetails set on instantiation', function () {
    installMockHttp(simpleMock());

    const client = new Ably.Rest({
      tokenDetails: {
        token: 'initial-token',
        expires: Date.now() + 3600000,
        issued: Date.now(),
        clientId: 'initial-client',
      },
    });

    expect(client.auth.tokenDetails).to.not.be.null;
    expect(client.auth.tokenDetails.token).to.equal('initial-token');
    expect(client.auth.tokenDetails.clientId).to.equal('initial-client');
  });

  /**
   * RSA16c - tokenDetails updated after explicit authorize()
   */
  it('RSA16c - tokenDetails updated after authorize()', async function () {
    let tokenCount = 0;

    installMockHttp(simpleMock());

    const client = new Ably.Rest({
      authCallback: function (params, callback) {
        tokenCount++;
        callback(null, {
          token: 'token-v' + tokenCount,
          expires: Date.now() + 3600000,
          issued: Date.now(),
          clientId: 'client-v' + tokenCount,
        });
      },
    });

    // First authorize
    await client.auth.authorize();
    const firstToken = client.auth.tokenDetails;

    // Second authorize
    await client.auth.authorize();
    const secondToken = client.auth.tokenDetails;

    expect(firstToken.token).to.equal('token-v1');
    expect(secondToken.token).to.equal('token-v2');
    expect(firstToken.token).to.not.equal(secondToken.token);
  });

  /**
   * RSA16c - tokenDetails updated after library-initiated renewal on 40142
   *
   * When a request fails with 40142 (token expired), the library renews
   * the token and tokenDetails should reflect the new token.
   */
  it('RSA16c - tokenDetails updated after 40142 renewal', async function () {
    let requestCount = 0;
    let tokenCount = 0;

    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        requestCount++;
        if (requestCount === 1) {
          req.respond_with(401, {
            error: { code: 40142, statusCode: 401, message: 'Token expired' },
          });
        } else {
          req.respond_with(200, []);
        }
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({
      authCallback: function (params, callback) {
        tokenCount++;
        callback(null, {
          token: 'token-v' + tokenCount,
          expires: Date.now() + 3600000,
          issued: Date.now(),
          clientId: 'client-v' + tokenCount,
        });
      },
    });

    // First authorize
    await client.auth.authorize();
    const firstToken = client.auth.tokenDetails;

    // Make a request that will fail with 40142, triggering renewal
    try { await client.stats(); } catch (e) { /* ok */ }
    const secondToken = client.auth.tokenDetails;

    expect(firstToken.token).to.equal('token-v1');
    expect(secondToken.token).to.equal('token-v2');
  });

  /**
   * RSA16d - tokenDetails null after failed renewal attempt
   *
   * When a token is invalidated and renewal fails, tokenDetails
   * should reflect the failure state.
   */
  it('RSA16d - tokenDetails after failed renewal', async function () {
    this.timeout(5000);
    let callbackCount = 0;
    let requestCount = 0;

    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        requestCount++;
        req.respond_with(401, {
          error: { code: 40142, statusCode: 401, message: 'Token expired' },
        });
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({
      authCallback: function (params, callback) {
        callbackCount++;
        if (callbackCount === 1) {
          callback(null, {
            token: 'first-token',
            expires: Date.now() + 3600000,
            issued: Date.now(),
          });
        } else {
          callback(new Error('Cannot obtain new token'));
        }
      },
    });

    // First authorize succeeds
    await client.auth.authorize();
    expect(client.auth.tokenDetails).to.not.be.null;
    expect(client.auth.tokenDetails.token).to.equal('first-token');

    // Make a request that fails with 40142, renewal will also fail
    try {
      await client.stats();
    } catch (e) {
      // Expected — renewal failed
    }

    // Spec (RSA16d): after failed renewal, tokenDetails MUST be null.
    // DEVIATION: ably-js may keep the stale token. See deviations.md.
    expect(callbackCount).to.equal(2);
    expect(client.auth.tokenDetails).to.be.null;
  });

  /**
   * RSA16d - tokenDetails null with basic auth
   */
  it('RSA16d - tokenDetails null with basic auth', async function () {
    installMockHttp(simpleMock());

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret' });
    try { await client.stats(); } catch (e) { /* ok */ }

    expect(client.auth.tokenDetails).to.satisfy((v) => v === null || v === undefined);
  });

  /**
   * RSA16d - tokenDetails null before first token obtained
   */
  it('RSA16d - tokenDetails null before first token', function () {
    installMockHttp(simpleMock());

    const client = new Ably.Rest({
      authCallback: function (params, callback) {
        callback(null, 'my-token');
      },
    });

    // No requests made yet
    expect(client.auth.tokenDetails).to.satisfy((v) => v === null || v === undefined);
  });

  /**
   * Edge case: tokenDetails preserved across multiple successful requests
   */
  it('tokenDetails preserved across requests', async function () {
    installMockHttp(simpleMock());

    const client = new Ably.Rest({
      authCallback: function (params, callback) {
        callback(null, {
          token: 'stable-token',
          expires: Date.now() + 3600000,
          issued: Date.now(),
          clientId: 'stable-client',
        });
      },
    });

    // Make multiple requests
    try { await client.stats(); } catch (e) { /* ok */ }
    const firstCheck = client.auth.tokenDetails;

    try { await client.stats(); } catch (e) { /* ok */ }
    const secondCheck = client.auth.tokenDetails;

    try { await client.stats(); } catch (e) { /* ok */ }
    const thirdCheck = client.auth.tokenDetails;

    expect(firstCheck.token).to.equal('stable-token');
    expect(secondCheck.token).to.equal('stable-token');
    expect(thirdCheck.token).to.equal('stable-token');
  });

  /**
   * Edge case: tokenDetails reflects capability from token
   */
  it('tokenDetails reflects capability', async function () {
    installMockHttp(simpleMock());

    const client = new Ably.Rest({
      authCallback: function (params, callback) {
        callback(null, {
          token: 'capable-token',
          expires: Date.now() + 3600000,
          issued: Date.now(),
          capability: '{"channel1":["publish","subscribe"],"channel2":["subscribe"]}',
        });
      },
    });

    try { await client.stats(); } catch (e) { /* ok */ }

    expect(client.auth.tokenDetails).to.not.be.null;
    expect(client.auth.tokenDetails.capability).to.equal(
      '{"channel1":["publish","subscribe"],"channel2":["subscribe"]}',
    );
  });
});
