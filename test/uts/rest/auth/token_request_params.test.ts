/**
 * UTS: Token Request Parameter Defaults
 *
 * Spec points: RSA5, RSA6, RSA9
 * Source: specification/uts/rest/unit/auth/token_request_params.md
 *
 * Tests createTokenRequest() handling of ttl and capability defaults.
 * These are local signing operations — no HTTP requests needed.
 */

import { expect } from 'chai';
import { MockHttpClient } from '../../mock_http';
import { Ably, installMockHttp, restoreAll } from '../../helpers';

describe('uts/rest/auth/token_request_params', function () {
  afterEach(function () {
    restoreAll();
  });

  // Install a mock so the client can be constructed (even though
  // createTokenRequest doesn't make HTTP calls).
  function setup() {
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => req.respond_with(200, []),
    });
    installMockHttp(mock);
  }

  /**
   * RSA5 - TTL is null when not specified
   */
  it('RSA5 - TTL is null when not specified', async function () {
    setup();
    const client = new Ably.Rest({ key: 'appId.keyId:keySecret' });
    const tokenRequest = await client.auth.createTokenRequest(null, null);

    // TTL should be null/undefined, not defaulted to 3600000
    expect(tokenRequest.ttl).to.satisfy((v: any) => v === null || v === undefined);
  });

  /**
   * RSA5b - Explicit TTL is preserved
   */
  it('RSA5b - Explicit TTL is preserved', async function () {
    setup();
    const client = new Ably.Rest({ key: 'appId.keyId:keySecret' });
    const tokenRequest = await client.auth.createTokenRequest({ ttl: 7200000 }, null);

    expect(tokenRequest.ttl).to.equal(7200000);
  });

  /**
   * RSA5c - TTL from defaultTokenParams is used
   */
  it('RSA5c - TTL from defaultTokenParams is used', async function () {
    setup();
    const client = new Ably.Rest({
      key: 'appId.keyId:keySecret',
      defaultTokenParams: { ttl: 1800000 },
    });
    const tokenRequest = await client.auth.createTokenRequest(null, null);

    expect(tokenRequest.ttl).to.equal(1800000);
  });

  /**
   * RSA5d - Explicit TTL overrides defaultTokenParams
   */
  it('RSA5d - Explicit TTL overrides defaultTokenParams', async function () {
    setup();
    const client = new Ably.Rest({
      key: 'appId.keyId:keySecret',
      defaultTokenParams: { ttl: 1800000 },
    });
    const tokenRequest = await client.auth.createTokenRequest({ ttl: 600000 }, null);

    expect(tokenRequest.ttl).to.equal(600000);
  });

  /**
   * RSA6 - Capability is null when not specified
   */
  it('RSA6 - Capability is null when not specified', async function () {
    setup();
    const client = new Ably.Rest({ key: 'appId.keyId:keySecret' });
    const tokenRequest = await client.auth.createTokenRequest(null, null);

    // Capability should be null/undefined, not defaulted to '{"*":["*"]}'
    expect(tokenRequest.capability).to.satisfy((v: any) => v === null || v === undefined);
  });

  /**
   * RSA6b - Explicit capability is preserved
   */
  it('RSA6b - Explicit capability is preserved', async function () {
    setup();
    const client = new Ably.Rest({ key: 'appId.keyId:keySecret' });
    const tokenRequest = await client.auth.createTokenRequest(
      { capability: '{"channel-a":["publish","subscribe"]}' },
      null,
    );

    expect(tokenRequest.capability).to.equal('{"channel-a":["publish","subscribe"]}');
  });

  /**
   * RSA6c - Capability from defaultTokenParams is used
   */
  it('RSA6c - Capability from defaultTokenParams is used', async function () {
    setup();
    const client = new Ably.Rest({
      key: 'appId.keyId:keySecret',
      defaultTokenParams: { capability: '{"*":["subscribe"]}' },
    });
    const tokenRequest = await client.auth.createTokenRequest(null, null);

    expect(tokenRequest.capability).to.equal('{"*":["subscribe"]}');
  });

  /**
   * RSA6d - Explicit capability overrides defaultTokenParams
   */
  it('RSA6d - Explicit capability overrides defaultTokenParams', async function () {
    setup();
    const client = new Ably.Rest({
      key: 'appId.keyId:keySecret',
      defaultTokenParams: { capability: '{"*":["subscribe"]}' },
    });
    const tokenRequest = await client.auth.createTokenRequest(
      { capability: '{"channel-x":["publish"]}' },
      null,
    );

    expect(tokenRequest.capability).to.equal('{"channel-x":["publish"]}');
  });
});
