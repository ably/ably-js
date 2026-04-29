/**
 * UTS: Realtime Client Stats Tests
 *
 * Spec points: RTC5, RTC5a, RTC5b
 * Source: uts/test/realtime/unit/client/realtime_stats.md
 *
 * RTC5: RealtimeClient#stats proxies to RestClient#stats.
 * These are representative tests from the REST stats suite using a Realtime client.
 */

import { expect } from 'chai';
import { MockHttpClient } from '../../mock_http';
import { Ably, trackClient, installMockHttp, restoreAll } from '../../helpers';

describe('uts/realtime/client/realtime_stats', function () {
  afterEach(function () {
    restoreAll();
  });

  /**
   * RTC5a - stats() sends GET /stats
   */
  it('RTC5a - stats() sends GET /stats', async function () {
    const captured = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, []);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Realtime({ key: 'appId.keyId:keySecret', autoConnect: false, useBinaryProtocol: false });
    trackClient(client);
    try {
      await client.stats();
    } catch (e) {
      // Response parsing may fail — we only care about the request
    }

    expect(captured).to.have.length.at.least(1);
    expect(captured[0].method.toUpperCase()).to.equal('GET');
    expect(captured[0].path).to.equal('/stats');
    client.close();
  });

  /**
   * RTC5b - stats() accepts params
   */
  it('RTC5b - stats() passes query params', async function () {
    const captured = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, []);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Realtime({ key: 'appId.keyId:keySecret', autoConnect: false, useBinaryProtocol: false });
    trackClient(client);
    try {
      await client.stats({ start: '1704067200000', limit: '10', direction: 'forwards' });
    } catch (e) {
      // Response parsing may fail
    }

    expect(captured).to.have.length.at.least(1);
    expect(captured[0].url.searchParams.get('start')).to.equal('1704067200000');
    expect(captured[0].url.searchParams.get('limit')).to.equal('10');
    expect(captured[0].url.searchParams.get('direction')).to.equal('forwards');
    client.close();
  });

  /**
   * RTC5 - stats() returns PaginatedResult
   */
  it('RTC5 - stats() returns PaginatedResult', async function () {
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        req.respond_with(200, [
          { all: { messages: { count: 10 } } },
        ]);
      },
    });
    installMockHttp(mock);

    const client = new Ably.Realtime({ key: 'appId.keyId:keySecret', autoConnect: false, useBinaryProtocol: false });
    trackClient(client);
    const result = await client.stats();

    expect(result.items).to.be.an('array');
    expect(result.items).to.have.length(1);
    client.close();
  });
});
