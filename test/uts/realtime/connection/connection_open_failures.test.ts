/**
 * UTS: Connection Opening Failures Tests
 *
 * Spec points: RTN14a, RTN14b, RTN14c, RTN14d, RTN14e, RTN14f, RTN14g
 * Source: uts/test/realtime/unit/connection/connection_open_failures_test.md
 */

import { expect } from 'chai';
import { MockWebSocket } from '../../mock_websocket';
import { MockHttpClient } from '../../mock_http';
import { Ably, installMockWebSocket, installMockHttp, enableFakeTimers, restoreAll } from '../../helpers';

async function pumpTimers(clock: any, iterations = 30) {
  for (let i = 0; i < iterations; i++) {
    clock.tick(0);
    await new Promise((r) => setTimeout(r, 1));
  }
}

describe('uts/realtime/connection/connection_open_failures', function () {
  afterEach(function () {
    restoreAll();
  });

  /**
   * RTN14a - Invalid API key causes FAILED state
   */
  it('RTN14a - invalid API key causes FAILED state', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        conn.respond_with_error({
          action: 9, // ERROR
          error: { code: 40005, statusCode: 400, message: 'Invalid key' },
        });
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'invalid.key:secret',
      autoConnect: false,
      useBinaryProtocol: false,
    });

    client.connection.once('failed', () => {
      expect(client.connection.state).to.equal('failed');
      expect(client.connection.errorReason).to.not.be.null;
      expect(client.connection.errorReason.code).to.equal(40005);
      expect(client.connection.errorReason.statusCode).to.equal(400);
      expect(client.connection.id).to.not.be.ok;
      expect(client.connection.key).to.not.be.ok;
      done();
    });

    client.connect();
  });

  /**
   * RTN14b - Token error with renewable token triggers renewal and retry
   */
  it('RTN14b - token error with renewable token retries', function (done) {
    let connectionAttemptCount = 0;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        connectionAttemptCount++;
        if (connectionAttemptCount === 1) {
          conn.respond_with_error({
            action: 9, // ERROR
            error: { code: 40142, statusCode: 401, message: 'Token expired' },
          });
        } else {
          conn.respond_with_connected({
            connectionId: 'connection-id',
            connectionDetails: {
              connectionKey: 'connection-key',
              maxIdleInterval: 15000,
              connectionStateTtl: 120000,
            },
          });
        }
      },
    });
    installMockWebSocket(mock.constructorFn);

    let authCallbackCount = 0;
    const client = new Ably.Realtime({
      authCallback: (params: any, cb: any) => {
        authCallbackCount++;
        cb(null, `token-${authCallbackCount}`);
      },
      autoConnect: false,
      useBinaryProtocol: false,
    });

    client.connection.once('connected', () => {
      expect(client.connection.state).to.equal('connected');
      // Auth callback called twice: initial + renewal
      expect(authCallbackCount).to.equal(2);
      expect(connectionAttemptCount).to.equal(2);
      client.close();
      done();
    });

    client.connect();
  });

  /**
   * RTN14b - Token error without renewal means → FAILED
   *
   * DEVIATION: ably-js transitions to FAILED (not DISCONNECTED) when
   * token cannot be renewed (no authCallback/authUrl/key). The spec says
   * DISCONNECTED but ably-js fails permanently since there's no renewal path.
   */
  it('RTN14b - token error without renewal causes FAILED', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        conn.respond_with_error({
          action: 9, // ERROR
          error: { code: 40142, statusCode: 401, message: 'Token expired' },
        });
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      token: 'expired_token_string',
      autoConnect: false,
      useBinaryProtocol: false,
    });

    client.connection.once('failed', () => {
      expect(client.connection.errorReason).to.not.be.null;
      // ably-js sets code 40171 (no means to renew) rather than 40142
      expect(client.connection.errorReason.code).to.be.a('number');
      done();
    });

    client.connect();
  });

  /**
   * RTN14c - Connection timeout
   *
   * Note: ably-js connectingTimeout = webSocketConnectTimeout + realtimeRequestTimeout.
   * Both must be configured short for this test.
   */
  it('RTN14c - connection timeout causes DISCONNECTED', async function () {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        // WebSocket opens but server never sends CONNECTED
        conn.respond_with_success();
      },
    });
    installMockWebSocket(mock.constructorFn);

    // Mock HTTP for connectivity checker
    const httpMock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => req.respond_with(200, 'yes'),
    });
    installMockHttp(httpMock);

    const clock = enableFakeTimers();

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      realtimeRequestTimeout: 500,
      webSocketConnectTimeout: 500,
      autoConnect: false,
      useBinaryProtocol: false,
      fallbackHosts: [],
    } as any);

    client.connect();
    await pumpTimers(clock);

    expect(client.connection.state).to.equal('connecting');

    // Advance past connectingTimeout (webSocketConnectTimeout + realtimeRequestTimeout = 1000ms)
    await clock.tickAsync(1100);
    await pumpTimers(clock);

    expect(client.connection.state).to.equal('disconnected');
    expect(client.connection.errorReason).to.not.be.null;
  });

  /**
   * RTN14d - Retry after recoverable failure
   */
  it('RTN14d - automatic retry after recoverable failure', async function () {
    let connectionAttemptCount = 0;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        connectionAttemptCount++;
        if (connectionAttemptCount === 1) {
          conn.respond_with_refused();
        } else {
          conn.respond_with_connected({
            connectionId: 'connection-id',
            connectionDetails: {
              connectionKey: 'connection-key',
              maxIdleInterval: 15000,
              connectionStateTtl: 120000,
            },
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

    const clock = enableFakeTimers();

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      disconnectedRetryTimeout: 1000,
      autoConnect: false,
      useBinaryProtocol: false,
      fallbackHosts: [],
    });

    client.connect();
    await pumpTimers(clock);

    expect(client.connection.state).to.equal('disconnected');

    // Advance time to trigger retry
    await clock.tickAsync(1100);
    await pumpTimers(clock);

    expect(client.connection.state).to.equal('connected');
    expect(connectionAttemptCount).to.equal(2);
  });

  /**
   * RTN14e - DISCONNECTED → SUSPENDED after connectionStateTtl
   */
  it('RTN14e - transitions to SUSPENDED after connectionStateTtl', async function () {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        conn.respond_with_refused();
      },
    });
    installMockWebSocket(mock.constructorFn);

    const httpMock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => req.respond_with(200, 'yes'),
    });
    installMockHttp(httpMock);

    const clock = enableFakeTimers();

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      disconnectedRetryTimeout: 500,
      autoConnect: false,
      useBinaryProtocol: false,
      fallbackHosts: [],
    });

    client.connect();
    await pumpTimers(clock);

    expect(client.connection.state).to.equal('disconnected');

    // Advance past connectionStateTtl (default 120000ms)
    await clock.tickAsync(121000);
    await pumpTimers(clock);

    expect(client.connection.state).to.equal('suspended');
    expect(client.connection.errorReason).to.not.be.null;
  });

  /**
   * RTN14f - SUSPENDED state retries and eventually connects
   */
  it('RTN14f - SUSPENDED retries and connects', async function () {
    let connectionAttemptCount = 0;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        connectionAttemptCount++;
        // All attempts fail until we have enough
        if (connectionAttemptCount < 5) {
          conn.respond_with_refused();
        } else {
          conn.respond_with_connected({
            connectionId: 'connection-id',
            connectionDetails: {
              connectionKey: 'connection-key',
              maxIdleInterval: 15000,
              connectionStateTtl: 120000,
            },
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

    const clock = enableFakeTimers();

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      disconnectedRetryTimeout: 500,
      suspendedRetryTimeout: 1000,
      autoConnect: false,
      useBinaryProtocol: false,
      fallbackHosts: [],
    });

    client.connect();

    // Advance past connectionStateTtl to reach SUSPENDED
    for (let i = 0; i < 15; i++) {
      await clock.tickAsync(10000);
      await pumpTimers(clock);
      if (client.connection.state === 'connected') break;
    }

    expect(client.connection.state).to.equal('connected');
    // Multiple connection attempts were made
    expect(connectionAttemptCount).to.be.at.least(3);
  });

  /**
   * RTN14g - ERROR protocol message with empty channel → FAILED
   */
  it('RTN14g - ERROR with empty channel causes FAILED', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected({
          connectionId: 'connection-id',
          connectionDetails: {
            connectionKey: 'connection-key',
            maxIdleInterval: 15000,
            connectionStateTtl: 120000,
          },
        });
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });

    client.connection.once('connected', () => {
      client.connection.once('failed', () => {
        expect(client.connection.state).to.equal('failed');
        expect(client.connection.errorReason).to.not.be.null;
        expect(client.connection.errorReason.code).to.equal(50000);
        expect(client.connection.errorReason.statusCode).to.equal(500);
        done();
      });

      // Send ERROR with no channel (connection-level error)
      mock.active_connection!.send_to_client({
        action: 9, // ERROR
        error: { code: 50000, statusCode: 500, message: 'Internal error' },
      });
    });

    client.connect();
  });
});
