/**
 * UTS: Revoke Tokens Tests
 *
 * Spec points: RSA17, RSA17b, RSA17c, RSA17d, RSA17e, RSA17f, RSA17g, BAR2, TRS2, TRF2
 * Source: specification/uts/rest/unit/auth/revoke_tokens.md
 */

import { expect } from 'chai';
import { MockHttpClient } from '../../mock_http';
import { Ably, installMockHttp, restoreAll } from '../../helpers';

function revokeMock(captured, responseBody) {
  return new MockHttpClient({
    onConnectionAttempt: (conn) => conn.respond_with_success(),
    onRequest: (req) => {
      if (captured) captured.push(req);
      req.respond_with(200, responseBody || {
        successCount: 1,
        failureCount: 0,
        results: [{ target: 'clientId:alice', issuedBefore: 1700000000000, appliesAt: 1700000001000 }],
      });
    },
  });
}

describe('uts/rest/auth/revoke_tokens', function () {
  afterEach(function () {
    restoreAll();
  });

  /**
   * RSA17g - POST to /keys/{keyName}/revokeTokens
   */
  it('RSA17g - sends POST to correct path', async function () {
    const captured = [];
    installMockHttp(revokeMock(captured));

    const client = new Ably.Rest({ key: 'appId.keyName:keySecret', useBinaryProtocol: false });
    await client.auth.revokeTokens([{ type: 'clientId', value: 'alice' }]);

    expect(captured).to.have.length(1);
    expect(captured[0].method.toUpperCase()).to.equal('POST');
    expect(captured[0].path).to.equal('/keys/appId.keyName/revokeTokens');
  });

  /**
   * RSA17b - Single target specifier
   */
  it('RSA17b - single specifier sent as targets array', async function () {
    const captured = [];
    installMockHttp(revokeMock(captured));

    const client = new Ably.Rest({ key: 'appId.keyName:keySecret', useBinaryProtocol: false });
    await client.auth.revokeTokens([{ type: 'clientId', value: 'alice' }]);

    const body = JSON.parse(captured[0].body);
    expect(body.targets).to.deep.equal(['clientId:alice']);
  });

  /**
   * RSA17b - Multiple specifiers with different types
   */
  it('RSA17b - multiple specifiers', async function () {
    const captured = [];
    const responseBody = {
      successCount: 3,
      failureCount: 0,
      results: [
        { target: 'clientId:alice', issuedBefore: 1700000000000, appliesAt: 1700000001000 },
        { target: 'revocationKey:group-1', issuedBefore: 1700000000000, appliesAt: 1700000001000 },
        { target: 'channel:secret', issuedBefore: 1700000000000, appliesAt: 1700000001000 },
      ],
    };
    installMockHttp(revokeMock(captured, responseBody));

    const client = new Ably.Rest({ key: 'appId.keyName:keySecret', useBinaryProtocol: false });
    await client.auth.revokeTokens([
      { type: 'clientId', value: 'alice' },
      { type: 'revocationKey', value: 'group-1' },
      { type: 'channel', value: 'secret' },
    ]);

    const body = JSON.parse(captured[0].body);
    expect(body.targets).to.deep.equal([
      'clientId:alice',
      'revocationKey:group-1',
      'channel:secret',
    ]);
  });

  /**
   * RSA17c / BAR2 - All success result
   */
  it('RSA17c - all success result', async function () {
    const responseBody = {
      successCount: 2,
      failureCount: 0,
      results: [
        { target: 'clientId:alice', issuedBefore: 1700000000000, appliesAt: 1700000001000 },
        { target: 'clientId:bob', issuedBefore: 1700000000000, appliesAt: 1700000002000 },
      ],
    };
    installMockHttp(revokeMock(null, responseBody));

    const client = new Ably.Rest({ key: 'appId.keyName:keySecret', useBinaryProtocol: false });
    const result = await client.auth.revokeTokens([
      { type: 'clientId', value: 'alice' },
      { type: 'clientId', value: 'bob' },
    ]);

    expect(result.successCount).to.equal(2);
    expect(result.failureCount).to.equal(0);
    expect(result.results).to.have.length(2);
  });

  /**
   * TRS2 - Success result attributes
   */
  it('TRS2 - success result has target, issuedBefore, appliesAt', async function () {
    const responseBody = {
      successCount: 1,
      failureCount: 0,
      results: [
        { target: 'clientId:alice', issuedBefore: 1700000000000, appliesAt: 1700000001000 },
      ],
    };
    installMockHttp(revokeMock(null, responseBody));

    const client = new Ably.Rest({ key: 'appId.keyName:keySecret', useBinaryProtocol: false });
    const result = await client.auth.revokeTokens([{ type: 'clientId', value: 'alice' }]);

    const success = result.results[0];
    expect(success.target).to.equal('clientId:alice');
    expect(success.issuedBefore).to.equal(1700000000000);
    expect(success.appliesAt).to.equal(1700000001000);
  });

  /**
   * RSA17d - Token auth client fails with 40162
   */
  it('RSA17d - token auth client fails with 40162', async function () {
    const captured = [];
    installMockHttp(revokeMock(captured));

    const client = new Ably.Rest({ token: 'a.token.string' });

    try {
      await client.auth.revokeTokens([{ type: 'clientId', value: 'alice' }]);
      expect.fail('Expected revokeTokens to throw');
    } catch (error) {
      expect(error.code).to.equal(40162);
      expect(error.statusCode).to.equal(401);
    }

    // No HTTP request should have been made
    expect(captured).to.have.length(0);
  });

  /**
   * RSA17d - useTokenAuth flag also fails with 40162
   */
  it('RSA17d - useTokenAuth flag fails with 40162', async function () {
    const captured = [];
    installMockHttp(revokeMock(captured));

    const client = new Ably.Rest({ key: 'appId.keyName:keySecret', useTokenAuth: true });

    try {
      await client.auth.revokeTokens([{ type: 'clientId', value: 'alice' }]);
      expect.fail('Expected revokeTokens to throw');
    } catch (error) {
      expect(error.code).to.equal(40162);
      expect(error.statusCode).to.equal(401);
    }

    expect(captured).to.have.length(0);
  });

  /**
   * RSA17e - issuedBefore included when specified
   */
  it('RSA17e - issuedBefore included in request body', async function () {
    const captured = [];
    installMockHttp(revokeMock(captured));

    const client = new Ably.Rest({ key: 'appId.keyName:keySecret', useBinaryProtocol: false });
    await client.auth.revokeTokens(
      [{ type: 'clientId', value: 'alice' }],
      { issuedBefore: 1699999000000 },
    );

    const body = JSON.parse(captured[0].body);
    expect(body.issuedBefore).to.equal(1699999000000);
  });

  /**
   * RSA17e - issuedBefore omitted when not provided
   */
  it('RSA17e - issuedBefore omitted when not provided', async function () {
    const captured = [];
    installMockHttp(revokeMock(captured));

    const client = new Ably.Rest({ key: 'appId.keyName:keySecret', useBinaryProtocol: false });
    await client.auth.revokeTokens([{ type: 'clientId', value: 'alice' }]);

    const body = JSON.parse(captured[0].body);
    expect(body).to.not.have.property('issuedBefore');
  });

  /**
   * RSA17f - allowReauthMargin included when true
   */
  it('RSA17f - allowReauthMargin included', async function () {
    const captured = [];
    installMockHttp(revokeMock(captured));

    const client = new Ably.Rest({ key: 'appId.keyName:keySecret', useBinaryProtocol: false });
    await client.auth.revokeTokens(
      [{ type: 'clientId', value: 'alice' }],
      { allowReauthMargin: true },
    );

    const body = JSON.parse(captured[0].body);
    expect(body.allowReauthMargin).to.equal(true);
  });

  /**
   * RSA17f - allowReauthMargin omitted when not provided
   */
  it('RSA17f - allowReauthMargin omitted when not provided', async function () {
    const captured = [];
    installMockHttp(revokeMock(captured));

    const client = new Ably.Rest({ key: 'appId.keyName:keySecret', useBinaryProtocol: false });
    await client.auth.revokeTokens([{ type: 'clientId', value: 'alice' }]);

    const body = JSON.parse(captured[0].body);
    expect(body).to.not.have.property('allowReauthMargin');
  });

  /**
   * RSA17f - Both issuedBefore and allowReauthMargin together
   */
  it('RSA17f - both options together', async function () {
    const captured = [];
    installMockHttp(revokeMock(captured));

    const client = new Ably.Rest({ key: 'appId.keyName:keySecret', useBinaryProtocol: false });
    await client.auth.revokeTokens(
      [{ type: 'clientId', value: 'alice' }],
      { issuedBefore: 1699999000000, allowReauthMargin: true },
    );

    const body = JSON.parse(captured[0].body);
    expect(body.targets).to.deep.equal(['clientId:alice']);
    expect(body.issuedBefore).to.equal(1699999000000);
    expect(body.allowReauthMargin).to.equal(true);
  });

  /**
   * RSA17 - Server error propagated
   */
  it('RSA17 - server error propagated', async function () {
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        req.respond_with(500, {
          error: { code: 50000, statusCode: 500, message: 'Internal error' },
        });
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyName:keySecret', useBinaryProtocol: false });

    try {
      await client.auth.revokeTokens([{ type: 'clientId', value: 'alice' }]);
      expect.fail('Expected revokeTokens to throw');
    } catch (error) {
      expect(error.code).to.equal(50000);
      expect(error.statusCode).to.equal(500);
    }
  });

  /**
   * RSA17 - Request uses Basic authentication
   */
  it('RSA17 - request uses Basic auth', async function () {
    const captured = [];
    installMockHttp(revokeMock(captured));

    const client = new Ably.Rest({ key: 'appId.keyName:keySecret', useBinaryProtocol: false });
    await client.auth.revokeTokens([{ type: 'clientId', value: 'alice' }]);

    expect(captured[0].headers.authorization).to.match(/^Basic /);
    const expectedAuth = 'Basic ' + Buffer.from('appId.keyName:keySecret').toString('base64');
    expect(captured[0].headers.authorization).to.equal(expectedAuth);
  });
});
