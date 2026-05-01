/**
 * UTS: Connection errorReason Tests
 *
 * Spec points: RTN25
 * Source: uts/test/realtime/unit/connection/error_reason_test.md
 */

import { expect } from 'chai';
import { MockWebSocket } from '../../mock_websocket';
import { MockHttpClient } from '../../mock_http';
import { Ably, trackClient, installMockWebSocket, installMockHttp, enableFakeTimers, restoreAll } from '../../helpers';

describe('uts/realtime/connection/error_reason', function () {
  afterEach(function () {
    restoreAll();
  });

  /**
   * RTN25 - errorReason set on connection errors (FAILED state)
   */
  it('RTN25 - errorReason set on fatal error', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        conn.respond_with_error({
          action: 9, // ERROR
          error: { code: 40005, statusCode: 400, message: 'Invalid API key' },
        });
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'invalid.key:secret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    // Initially errorReason should be null
    expect(client.connection.errorReason).to.be.null;

    client.connection.once('failed', () => {
      expect(client.connection.errorReason).to.not.be.null;
      expect(client.connection.errorReason!.code).to.equal(40005);
      expect(client.connection.errorReason!.statusCode).to.equal(400);
      done();
    });

    client.connect();
  });

  /**
   * RTN25 - errorReason on DISCONNECTED state
   */
  it('RTN25 - errorReason set on DISCONNECTED', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        conn.respond_with_refused();
      },
    });
    installMockWebSocket(mock.constructorFn);

    // Mock HTTP for connectivity checker
    const httpMock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => req.respond_with(200, 'yes'),
    });
    installMockHttp(httpMock);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
      fallbackHosts: [],
    });
    trackClient(client);

    client.connection.once('disconnected', () => {
      expect(client.connection.errorReason).to.not.be.null;
      expect(client.connection.errorReason!.message).to.be.a('string');
      done();
    });

    client.connect();
  });

  /**
   * RTN25 - errorReason on SUSPENDED state
   */
  it('RTN25 - errorReason set on SUSPENDED', async function () {
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
      autoConnect: false,
      useBinaryProtocol: false,
      disconnectedRetryTimeout: 500,
      connectionStateTtl: 2000,
      fallbackHosts: [],
    } as any);
    trackClient(client);

    client.connect();

    // Advance past connectionStateTtl (2s) in small increments
    for (let i = 0; i < 10; i++) {
      await clock.tickAsync(500);
      if (client.connection.state === 'suspended') break;
    }

    expect(client.connection.state).to.equal('suspended');
    expect(client.connection.errorReason).to.not.be.null;
    expect(client.connection.errorReason!.message).to.be.a('string');
    client.close();
  });

  /**
   * RTN25 - errorReason on token errors
   */
  it('RTN25 - errorReason on token error', function (done) {
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
      token: 'expired_token',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    client.connection.once('disconnected', () => {
      expect(client.connection.errorReason).to.not.be.null;
      expect(client.connection.errorReason!.code).to.equal(40142);
      expect(client.connection.errorReason!.statusCode).to.equal(401);
      done();
    });

    client.connect();
  });

  /**
   * RTN25 - errorReason cleared on successful reconnection
   */
  it('RTN25 - errorReason cleared on successful reconnect', function (done) {
    let connectionAttemptCount = 0;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        connectionAttemptCount++;
        if (connectionAttemptCount === 1) {
          conn.respond_with_refused();
        } else {
          conn.respond_with_connected();
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
      disconnectedRetryTimeout: 15,
      fallbackHosts: [],
    });
    trackClient(client);

    client.connection.once('disconnected', function () {
      try {
        expect(client.connection.errorReason).to.not.be.null;
      } catch (err) {
        return done(err);
      }

      client.connection.once('connected', function () {
        try {
          expect(client.connection.errorReason).to.be.null;
          client.close();
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    client.connect();
  });

  /**
   * RTN25 - errorReason on protocol-level ERROR message
   */
  it('RTN25 - errorReason on protocol ERROR message', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        conn.respond_with_error({
          action: 9, // ERROR
          error: { code: 50000, statusCode: 500, message: 'Internal server error' },
        });
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    client.connection.once('failed', () => {
      expect(client.connection.errorReason).to.not.be.null;
      expect(client.connection.errorReason!.code).to.equal(50000);
      expect(client.connection.errorReason!.statusCode).to.equal(500);
      expect(client.connection.errorReason!.message).to.contain('Internal server error');
      done();
    });

    client.connect();
  });

  /**
   * RTN25 - errorReason propagated to ConnectionStateChange events
   */
  it('RTN25 - errorReason in ConnectionStateChange', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        conn.respond_with_error({
          action: 9, // ERROR
          error: { code: 40003, statusCode: 400, message: 'Access token invalid' },
        });
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    client.connection.once('failed', (stateChange: any) => {
      // State change has reason populated
      expect(stateChange.reason).to.not.be.null;
      expect(stateChange.reason.code).to.equal(40003);
      expect(stateChange.reason.statusCode).to.equal(400);

      // Connection errorReason matches state change reason
      expect(client.connection.errorReason).to.not.be.null;
      expect(client.connection.errorReason!.code).to.equal(stateChange.reason.code);
      done();
    });

    client.connect();
  });
});
