/**
 * UTS Proxy Integration: REST Fallback Tests
 *
 * Spec points: RSC15l, RSC15l2, RSC15l4
 * Source: specification/uts/rest/integration/proxy/rest_fallback.md
 */

import { expect } from 'chai';
import {
  Ably,
  SANDBOX_ENDPOINT,
  setupSandbox,
  teardownSandbox,
  getApiKey,
} from '../../integration/sandbox';
import { createProxySession, waitForProxy, ProxySession } from '../../../../uts/realtime/integration/helpers/proxy';

describe('uts/rest/integration/proxy/rest_fallback', function () {
  this.timeout(120000);

  let session: ProxySession | null = null;

  before(async function () {
    await waitForProxy();
    await setupSandbox();
  });

  after(async function () {
    await teardownSandbox();
  });

  afterEach(async function () {
    if (session) {
      await session.close();
      session = null;
    }
  });

  /**
   * RSC15l2 — Request timeout triggers fallback via proxy
   *
   * The proxy delays the first /time request beyond httpRequestTimeout.
   * The SDK should time out and retry on a fallback host (also routed
   * through the proxy, where the rule has expired after times:1).
   */
  it('RSC15l2 - request timeout triggers fallback', async function () {
    session = await createProxySession({
      rules: [
        {
          match: { type: 'http_request', pathContains: '/time' },
          action: {
            type: 'http_delay',
            delayMs: 20000,
          },
          times: 1,
          comment: 'RSC15l2: Delay first /time request beyond httpRequestTimeout',
        },
      ],
    });

    const restClient = new Ably.Rest({
      authCallback: (_params: any, cb: any) => {
        const innerRest = new Ably.Rest({ key: getApiKey(), endpoint: SANDBOX_ENDPOINT } as any);
        innerRest.auth.requestToken().then(
          (token: any) => cb(null, token),
          (err: any) => cb(err, null),
        );
      },
      endpoint: 'localhost',
      fallbackHosts: ['localhost'],
      port: session.proxyPort,
      tls: false,
      useBinaryProtocol: false,
      httpRequestTimeout: 3000,
    } as any);

    const result = await restClient.time();

    expect(result).to.be.a('number');
    expect(result).to.be.greaterThan(0);

    // Proxy log should show at least two /time requests (initial + fallback retry)
    const log = await session.getLog();
    const timeRequests = log.filter((e) => e.type === 'http_request' && e.path && e.path.includes('/time'));
    expect(timeRequests.length).to.be.at.least(2);
  });

  /**
   * RSC15l4 — CloudFront Server header triggers fallback via proxy
   *
   * The proxy returns a 403 with Server: CloudFront on the first /time
   * request. The SDK should treat this as a retryable server error and
   * retry on a fallback host.
   */
  it('RSC15l4 - CloudFront Server header triggers fallback', async function () {
    // DEVIATION: see deviations.md — ably-js does not inspect the Server response header
    if (!process.env.RUN_DEVIATIONS) this.skip();
    session = await createProxySession({
      rules: [
        {
          match: { type: 'http_request', pathContains: '/time' },
          action: {
            type: 'http_respond',
            status: 403,
            body: { error: { message: 'Forbidden', code: 40300, statusCode: 403 } },
            headers: { Server: 'CloudFront' },
          },
          times: 1,
          comment: 'RSC15l4: CloudFront 403 on first /time request',
        },
      ],
    });

    const restClient = new Ably.Rest({
      authCallback: (_params: any, cb: any) => {
        const innerRest = new Ably.Rest({ key: getApiKey(), endpoint: SANDBOX_ENDPOINT } as any);
        innerRest.auth.requestToken().then(
          (token: any) => cb(null, token),
          (err: any) => cb(err, null),
        );
      },
      endpoint: 'localhost',
      fallbackHosts: ['localhost'],
      port: session.proxyPort,
      tls: false,
      useBinaryProtocol: false,
    } as any);

    const result = await restClient.time();

    expect(result).to.be.a('number');
    expect(result).to.be.greaterThan(0);

    // Proxy log should show at least two /time requests (initial + fallback retry)
    const log = await session.getLog();
    const timeRequests = log.filter((e) => e.type === 'http_request' && e.path && e.path.includes('/time'));
    expect(timeRequests.length).to.be.at.least(2);

    // First response was the injected 403 with CloudFront header
    const httpResponses = log.filter((e) => e.type === 'http_response');
    expect(httpResponses[0].status).to.equal(403);
  });
});
