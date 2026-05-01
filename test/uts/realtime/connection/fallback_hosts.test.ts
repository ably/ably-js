/**
 * UTS: Fallback Hosts Tests
 *
 * Spec points: RTN17f, RTN17f1, RTN17g, RTN17h, RTN17i, RTN17j
 * Source: uts/test/realtime/unit/connection/fallback_hosts_test.md
 *
 * Note: Fallback host behavior is complex — involves connectivity checks,
 * host rotation, and coordination between realtime and REST.
 */

import { expect } from 'chai';
import { MockWebSocket } from '../../mock_websocket';
import { MockHttpClient } from '../../mock_http';
import { Ably, trackClient, installMockWebSocket, installMockHttp, restoreAll } from '../../helpers';

describe('uts/realtime/connection/fallback_hosts', function () {
  afterEach(function () {
    restoreAll();
  });

  /**
   * RTN17i - Always prefer primary domain first
   */
  it('RTN17i - primary domain tried first', function (done) {
    const connectionHosts: string[] = [];

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        connectionHosts.push(conn.url.hostname);
        mock.active_connection = conn;

        if (connectionHosts.length === 1) {
          // Primary fails
          conn.respond_with_refused();
        } else {
          // Fallback succeeds
          conn.respond_with_connected({
            connectionId: 'connection-id',
            connectionDetails: {
              connectionKey: 'connection-key',
              maxIdleInterval: 15000,
              connectionStateTtl: 120000,
            } as any,
          });
        }
      },
    });
    installMockWebSocket(mock.constructorFn);

    // Mock HTTP for connectivity check
    const httpMock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => req.respond_with(200, 'yes'),
    });
    installMockHttp(httpMock);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    client.connection.once('connected', () => {
      // First attempt was primary domain
      expect(connectionHosts[0]).to.equal('main.realtime.ably.net');
      // Second was a fallback
      expect(connectionHosts[1]).to.match(/main\.[a-e]\.fallback\.ably-realtime\.com/);
      expect(connectionHosts.length).to.be.at.least(2);
      client.close();
      done();
    });

    client.connect();
  });

  /**
   * RTN17f - Network errors trigger fallback host usage
   */
  it('RTN17f - connection refused triggers fallback', function (done) {
    const connectionHosts: string[] = [];

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        connectionHosts.push(conn.url.hostname);
        mock.active_connection = conn;

        if (connectionHosts.length === 1) {
          // Primary: connection refused
          conn.respond_with_refused();
        } else {
          conn.respond_with_connected({
            connectionId: 'connection-id',
            connectionDetails: {
              connectionKey: 'connection-key',
              maxIdleInterval: 15000,
              connectionStateTtl: 120000,
            } as any,
          });
        }
      },
    });
    installMockWebSocket(mock.constructorFn);

    const httpMock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => req.respond_with(200, 'yes'),
    });
    installMockHttp(httpMock);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    client.connection.once('connected', () => {
      expect(connectionHosts.length).to.be.at.least(2);
      expect(connectionHosts[0]).to.equal('main.realtime.ably.net');
      expect(connectionHosts[1]).to.match(/main\.[a-e]\.fallback\.ably-realtime\.com/);
      client.close();
      done();
    });

    client.connect();
  });

  /**
   * RTN17f1 - DISCONNECTED with 5xx triggers fallback
   */
  it('RTN17f1 - DISCONNECTED with 503 triggers fallback', function (done) {
    const connectionHosts: string[] = [];

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        connectionHosts.push(conn.url.hostname);
        mock.active_connection = conn;

        if (connectionHosts.length === 1) {
          // Primary: send DISCONNECTED with 503
          conn.respond_with_success();
          process.nextTick(() => {
            conn.send_to_client_and_close({
              action: 6, // DISCONNECTED
              error: {
                code: 50003,
                statusCode: 503,
                message: 'Service temporarily unavailable',
              },
            });
          });
        } else {
          conn.respond_with_connected({
            connectionId: 'connection-id',
            connectionDetails: {
              connectionKey: 'connection-key',
              maxIdleInterval: 15000,
              connectionStateTtl: 120000,
            } as any,
          });
        }
      },
    });
    installMockWebSocket(mock.constructorFn);

    const httpMock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => req.respond_with(200, 'yes'),
    });
    installMockHttp(httpMock);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    client.connection.once('connected', () => {
      expect(connectionHosts.length).to.be.at.least(2);
      expect(connectionHosts[0]).to.equal('main.realtime.ably.net');
      // Second attempt should be a fallback host
      expect(connectionHosts[1]).to.match(/main\.[a-e]\.fallback\.ably-realtime\.com/);
      client.close();
      done();
    });

    client.connect();
  });

  /**
   * RTN17g - Empty fallback set: custom host with no fallbacks
   *
   * DEVIATION: ably-js with custom realtimeHost and fallbackHosts:[] goes to
   * DISCONNECTED (not immediate error), then retries. We verify only the primary
   * host was tried and no fallback hosts were used.
   */
  it('RTN17g - custom host with no fallbacks does not try fallbacks', function (done) {
    const connectionHosts: string[] = [];

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        connectionHosts.push(conn.url.hostname);
        conn.respond_with_refused();
      },
    });
    installMockWebSocket(mock.constructorFn);

    const httpMock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => req.respond_with(200, 'yes'),
    });
    installMockHttp(httpMock);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      realtimeHost: 'custom.example.com',
      fallbackHosts: [],
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    client.connection.once('disconnected', () => {
      // Only the custom host was tried, no fallbacks
      expect(connectionHosts.length).to.equal(1);
      expect(connectionHosts[0]).to.equal('custom.example.com');
      done();
    });

    client.connect();
  });

  /**
   * RTN17h - Default fallback hosts match spec (REC2)
   */
  it('RTN17h - uses default fallback hosts from REC2', function (done) {
    const connectionHosts: string[] = [];

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        connectionHosts.push(conn.url.hostname);
        mock.active_connection = conn;

        if (connectionHosts.length === 1) {
          conn.respond_with_refused();
        } else {
          conn.respond_with_connected({
            connectionId: 'connection-id',
            connectionDetails: {
              connectionKey: 'connection-key',
              maxIdleInterval: 15000,
              connectionStateTtl: 120000,
            } as any,
          });
        }
      },
    });
    installMockWebSocket(mock.constructorFn);

    const httpMock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => req.respond_with(200, 'yes'),
    });
    installMockHttp(httpMock);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    client.connection.once('connected', () => {
      expect(connectionHosts.length).to.be.at.least(2);
      // Fallback host matches pattern: main.[a-e].fallback.ably-realtime.com
      const fallbackHost = connectionHosts[1];
      expect(fallbackHost).to.match(/main\.[a-e]\.fallback\.ably-realtime\.com/);
      client.close();
      done();
    });

    client.connect();
  });

  /**
   * RTN17j - Connectivity check before fallback
   */
  it('RTN17j - connectivity check performed before fallback', function (done) {
    const connectionHosts: string[] = [];
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        connectionHosts.push(conn.url.hostname);
        mock.active_connection = conn;

        if (connectionHosts.length === 1) {
          conn.respond_with_refused();
        } else {
          conn.respond_with_connected({
            connectionId: 'connection-id',
            connectionDetails: {
              connectionKey: 'connection-key',
              maxIdleInterval: 15000,
              connectionStateTtl: 120000,
            } as any,
          });
        }
      },
    });
    installMockWebSocket(mock.constructorFn);

    const httpMock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => req.respond_with(200, 'yes'),
    });
    installMockHttp(httpMock);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    client.connection.once('connected', () => {
      // Connectivity check was performed via HTTP mock
      const connectivityChecks = httpMock.captured_requests.filter((req) => req.url.href.includes('internet-up'));
      expect(connectivityChecks.length).to.be.at.least(1);

      // Connection proceeded to fallback after check
      expect(connectionHosts.length).to.be.at.least(2);
      client.close();
      done();
    });

    client.connect();
  });

  /**
   * RTN17j - Fallback hosts tried in random order
   *
   * This test is inherently probabilistic. We run multiple iterations and check
   * that not all fallback host orders are identical.
   */
  it('RTN17j - fallback hosts tried in random order', function (done) {
    const fallbackOrders: string[][] = [];
    let iterationsCompleted = 0;
    const totalIterations = 5;

    function runIteration() {
      restoreAll();

      const connectionHosts: string[] = [];
      const mock = new MockWebSocket({
        onConnectionAttempt: (conn) => {
          connectionHosts.push(conn.url.hostname);
          if (connectionHosts.length <= 3) {
            // Primary and first 2 fallbacks fail
            conn.respond_with_refused();
          } else {
            conn.respond_with_connected({
              connectionId: 'connection-id',
              connectionDetails: {
                connectionKey: 'connection-key',
                maxIdleInterval: 15000,
                connectionStateTtl: 120000,
              } as any,
            });
          }
        },
      });
      installMockWebSocket(mock.constructorFn);

      const httpMock = new MockHttpClient({
        onConnectionAttempt: (conn) => conn.respond_with_success(),
        onRequest: (req) => req.respond_with(200, 'yes'),
      });
      installMockHttp(httpMock);

      const client = new Ably.Realtime({
        key: 'appId.keyId:keySecret',
        autoConnect: false,
        useBinaryProtocol: false,
      });
      trackClient(client);

      client.connection.once('connected', () => {
        // Record fallback order (skip primary at index 0)
        fallbackOrders.push(connectionHosts.slice(1));
        client.close();
        iterationsCompleted++;

        if (iterationsCompleted < totalIterations) {
          runIteration();
        } else {
          // At least 2 different orderings should appear
          const uniqueOrders = new Set(fallbackOrders.map((o) => o.join(',')));
          expect(uniqueOrders.size).to.be.at.least(2);
          done();
        }
      });

      client.connect();
    }

    runIteration();
  });
});
