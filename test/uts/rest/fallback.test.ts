/**
 * UTS: REST Fallback and Endpoint Configuration Tests
 *
 * Spec points: RSC15, RSC15l, RSC15m, REC1a, REC1b2, REC1b4, REC1c2, REC1d1, REC2a2, REC2c6
 * Source: specification/uts/rest/unit/fallback.md
 */

import { expect } from 'chai';
import { MockHttpClient } from '../mock_http';
import { Ably, installMockHttp, restoreAll } from '../helpers';

describe('uts/rest/fallback', function () {
  afterEach(function () {
    restoreAll();
  });

  // ── Fallback behavior (RSC15) ──────────────────────────────────────

  /**
   * RSC15l - 500 triggers fallback
   *
   * When the primary host returns a 500 error, the client should retry
   * the request on a fallback host.
   */
  it('RSC15l - 500 triggers fallback', async function () {
    let requestCount = 0;
    const hosts = [];

    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        requestCount++;
        hosts.push(req.url.hostname);
        if (requestCount === 1) {
          req.respond_with(500, { error: { message: 'Server error', code: 50000, statusCode: 500 } });
        } else {
          req.respond_with(200, [1234567890000]);
        }
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'app.key:secret', useBinaryProtocol: false });
    const result = await client.time();

    expect(result).to.equal(1234567890000);
    expect(requestCount).to.equal(2);
    expect(hosts[0]).to.equal('main.realtime.ably.net');
    expect(hosts[1]).to.not.equal('main.realtime.ably.net');
    expect(hosts[1]).to.match(/^main\.[a-e]\.fallback\.ably-realtime\.com$/);
  });

  /**
   * RSC15l - connection refused triggers fallback
   *
   * When the primary host refuses the connection, the client should
   * retry on a fallback host.
   */
  it('RSC15l - connection refused triggers fallback', async function () {
    let connCount = 0;
    const connHosts = [];

    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => {
        connCount++;
        connHosts.push(conn.host);
        if (connCount === 1) {
          conn.respond_with_refused();
        } else {
          conn.respond_with_success();
        }
      },
      onRequest: (req) => {
        req.respond_with(200, [1234567890000]);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'app.key:secret', useBinaryProtocol: false });
    const result = await client.time();

    expect(result).to.equal(1234567890000);
    expect(connCount).to.equal(2);
    expect(connHosts[0]).to.equal('main.realtime.ably.net');
    expect(connHosts[1]).to.not.equal('main.realtime.ably.net');
    expect(connHosts[1]).to.match(/^main\.[a-e]\.fallback\.ably-realtime\.com$/);
  });

  /**
   * RSC15l - 4xx does NOT trigger fallback
   *
   * Client errors (4xx) are not retryable. The client should not attempt
   * a fallback host and should propagate the error immediately.
   */
  it('RSC15l - 4xx does NOT trigger fallback', async function () {
    let requestCount = 0;

    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        requestCount++;
        req.respond_with(400, { error: { message: 'Bad request', code: 40000, statusCode: 400 } });
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'app.key:secret', useBinaryProtocol: false });

    try {
      await client.time();
      expect.fail('Expected time() to throw');
    } catch (error) {
      expect(error.statusCode).to.equal(400);
    }

    expect(requestCount).to.equal(1);
  });

  /**
   * RSC15m - no fallback when fallbackHosts is empty
   *
   * When fallbackHosts is explicitly set to an empty array, the client
   * should not attempt any fallback and should fail after the primary host.
   */
  it('RSC15m - no fallback when fallbackHosts is empty', async function () {
    let requestCount = 0;

    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        requestCount++;
        req.respond_with(500, { error: { message: 'Server error', code: 50000, statusCode: 500 } });
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'app.key:secret', useBinaryProtocol: false, fallbackHosts: [] });

    try {
      await client.time();
      expect.fail('Expected time() to throw');
    } catch (error) {
      expect(error.statusCode).to.equal(500);
    }

    expect(requestCount).to.equal(1);
  });

  // ── Endpoint configuration (REC) ──────────────────────────────────

  /**
   * REC1a - default primary domain
   *
   * Without any endpoint configuration, the default primary host should
   * be main.realtime.ably.net.
   */
  it('REC1a - default primary domain', async function () {
    const captured = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, [1234567890000]);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'app.key:secret', useBinaryProtocol: false });
    await client.time();

    expect(captured).to.have.length(1);
    expect(captured[0].url.hostname).to.equal('main.realtime.ably.net');
  });

  /**
   * REC1b4 - endpoint as routing policy
   *
   * When endpoint is a simple name (no dots), it is treated as a routing
   * policy and the host becomes {endpoint}.realtime.ably.net.
   */
  it('REC1b4 - endpoint as routing policy', async function () {
    const captured = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, [1234567890000]);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'app.key:secret', useBinaryProtocol: false, endpoint: 'sandbox' });
    await client.time();

    expect(captured).to.have.length(1);
    expect(captured[0].url.hostname).to.equal('sandbox.realtime.ably.net');
  });

  /**
   * REC1b2 - endpoint as explicit hostname
   *
   * When endpoint contains dots, it is treated as an explicit hostname.
   */
  it('REC1b2 - endpoint as explicit hostname', async function () {
    const captured = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, [1234567890000]);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({
      key: 'app.key:secret',
      useBinaryProtocol: false,
      endpoint: 'custom.ably.example.com',
    });
    await client.time();

    expect(captured).to.have.length(1);
    expect(captured[0].url.hostname).to.equal('custom.ably.example.com');
  });

  /**
   * REC1d1 - restHost option
   *
   * The deprecated restHost option sets the REST host directly.
   */
  it('REC1d1 - restHost option', async function () {
    const captured = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, [1234567890000]);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({
      key: 'app.key:secret',
      useBinaryProtocol: false,
      restHost: 'custom.rest.example.com',
    });
    await client.time();

    expect(captured).to.have.length(1);
    expect(captured[0].url.hostname).to.equal('custom.rest.example.com');
  });

  /**
   * REC1c2 - environment option
   *
   * The deprecated environment option maps to {environment}.realtime.ably.net.
   */
  it('REC1c2 - environment option', async function () {
    const captured = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, [1234567890000]);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({
      key: 'app.key:secret',
      useBinaryProtocol: false,
      environment: 'sandbox',
    });
    await client.time();

    expect(captured).to.have.length(1);
    expect(captured[0].url.hostname).to.equal('sandbox.realtime.ably.net');
  });

  /**
   * REC2a2 - custom fallbackHosts
   *
   * When fallbackHosts is set to a custom list, the client should use
   * those hosts for fallback instead of the defaults.
   */
  it('REC2a2 - custom fallbackHosts', async function () {
    let requestCount = 0;
    const hosts = [];
    const customFallbacks = ['fb1.example.com', 'fb2.example.com'];

    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        requestCount++;
        hosts.push(req.url.hostname);
        if (requestCount === 1) {
          req.respond_with(500, { error: { message: 'Server error', code: 50000, statusCode: 500 } });
        } else {
          req.respond_with(200, [1234567890000]);
        }
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({
      key: 'app.key:secret',
      useBinaryProtocol: false,
      fallbackHosts: customFallbacks,
    });
    const result = await client.time();

    expect(result).to.equal(1234567890000);
    expect(requestCount).to.equal(2);
    expect(hosts[0]).to.equal('main.realtime.ably.net');
    expect(customFallbacks).to.include(hosts[1]);
  });

  /**
   * REC2c6 - custom restHost has no fallbacks
   *
   * When restHost is set to a custom domain, fallback hosts are not
   * available (unless explicitly provided). A 500 should not trigger retry.
   */
  it('REC2c6 - custom restHost has no fallbacks', async function () {
    let requestCount = 0;

    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        requestCount++;
        req.respond_with(500, { error: { message: 'Server error', code: 50000, statusCode: 500 } });
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({
      key: 'app.key:secret',
      useBinaryProtocol: false,
      restHost: 'custom.example.com',
    });

    try {
      await client.time();
      expect.fail('Expected time() to throw');
    } catch (error) {
      expect(error.statusCode).to.equal(500);
    }

    expect(requestCount).to.equal(1);
  });
});
