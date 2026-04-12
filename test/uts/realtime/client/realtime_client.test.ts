/**
 * UTS: Realtime Client Tests
 *
 * Spec points: RTC1a, RTC1b, RTC1c, RTC1f, RTC2, RTC3, RTC4, RTC13, RTC15, RTC16, RTC17
 * Source: uts/test/realtime/unit/client/realtime_client.md
 */

import { expect } from 'chai';
import { MockWebSocket } from '../../mock_websocket';
import { MockHttpClient } from '../../mock_http';
import { Ably, installMockWebSocket, installMockHttp, restoreAll } from '../../helpers';

describe('uts/realtime/client/realtime_client', function () {
  afterEach(function () {
    restoreAll();
  });

  // ── Attributes (no WebSocket mock needed) ─────────────────────────

  /**
   * RTC2 - Connection attribute
   */
  it('RTC2 - client.connection is accessible', function () {
    const client = new Ably.Realtime({ key: 'appId.keyId:keySecret', autoConnect: false });
    expect(client.connection).to.not.be.null;
    expect(client.connection).to.not.be.undefined;
    expect(client.connection.state).to.equal('initialized');
    expect(typeof client.connection.connect).to.equal('function');
    expect(typeof client.connection.close).to.equal('function');
    expect(typeof client.connection.ping).to.equal('function');
  });

  /**
   * RTC3 - Channels attribute
   */
  it('RTC3 - client.channels is accessible', function () {
    const client = new Ably.Realtime({ key: 'appId.keyId:keySecret', autoConnect: false });
    expect(client.channels).to.not.be.null;
    expect(client.channels).to.not.be.undefined;

    const ch = client.channels.get('test-RTC3');
    expect(ch).to.not.be.null;
    expect(ch.name).to.equal('test-RTC3');
  });

  /**
   * RTC4 - Auth attribute
   */
  it('RTC4 - client.auth is accessible', function () {
    const client = new Ably.Realtime({ key: 'appId.keyId:keySecret', autoConnect: false });
    expect(client.auth).to.not.be.null;
    expect(client.auth).to.not.be.undefined;
    expect(typeof client.auth.authorize).to.equal('function');
    expect(typeof client.auth.createTokenRequest).to.equal('function');
  });

  /**
   * RTC13 - Push attribute
   */
  it('RTC13 - client.push is accessible', function () {
    const client = new Ably.Realtime({ key: 'appId.keyId:keySecret', autoConnect: false });
    expect(client.push).to.not.be.null;
    expect(client.push).to.not.be.undefined;
    expect(client.push.admin).to.not.be.null;
    expect(client.push.admin).to.not.be.undefined;
  });

  /**
   * RTC17 - clientId attribute
   */
  it('RTC17 - clientId from options', function () {
    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      clientId: 'explicit-client-id',
      autoConnect: false,
    });
    expect(client.clientId).to.equal('explicit-client-id');
    expect(client.clientId).to.equal(client.auth.clientId);
  });

  // ── echoMessages (RTC1a) ──────────────────────────────────────────

  /**
   * RTC1a_1 - echoMessages defaults to true
   *
   * NOTE: ably-js does NOT send echo=true in the URL. It only sends
   * echo=false when echoMessages is explicitly false. The server
   * defaults to echoing. This is noted as a UTS spec ambiguity —
   * the spec asserts echo=="true" but the features spec just says
   * the default is true, not that it must be sent explicitly.
   */
  it('RTC1a - echoMessages default (echo param not sent)', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        // ably-js does not send echo=true; only sends echo=false when disabled
        const echoParam = conn.url.searchParams.get('echo');
        expect(echoParam).to.be.null;
        conn.respond_with_connected();
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    client.connection.once('connected', () => {
      client.close();
      done();
    });
  });

  /**
   * RTC1a_2 - echoMessages set to false
   */
  it('RTC1a - echoMessages false sends echo=false', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        expect(conn.url.searchParams.get('echo')).to.equal('false');
        conn.respond_with_connected();
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      echoMessages: false,
      useBinaryProtocol: false,
    });
    client.connection.once('connected', () => {
      client.close();
      done();
    });
  });

  // ── autoConnect (RTC1b) ───────────────────────────────────────────

  /**
   * RTC1b_1 - autoConnect defaults to true
   */
  it('RTC1b - autoConnect defaults to true', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        conn.respond_with_connected();
      },
    });
    installMockWebSocket(mock.constructorFn);

    // Not passing autoConnect: false — should connect immediately
    const client = new Ably.Realtime({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });

    client.connection.once('connected', () => {
      expect(mock.connect_attempts).to.have.length.at.least(1);
      client.close();
      done();
    });
  });

  /**
   * RTC1b_2 - autoConnect set to false
   */
  it('RTC1b - autoConnect false stays initialized', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: () => {
        throw new Error('Should not attempt connection');
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });

    expect(client.connection.state).to.equal('initialized');
    expect(mock.connect_attempts).to.have.length(0);

    // Wait briefly to confirm no connection attempt
    setTimeout(() => {
      expect(client.connection.state).to.equal('initialized');
      expect(mock.connect_attempts).to.have.length(0);
      done();
    }, 100);
  });

  /**
   * RTC1b_3 - Explicit connect after autoConnect false
   */
  it('RTC1b - explicit connect after autoConnect false', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        conn.respond_with_connected();
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });

    expect(client.connection.state).to.equal('initialized');

    client.connection.once('connected', () => {
      expect(mock.connect_attempts).to.have.length(1);
      client.close();
      done();
    });

    client.connect();
  });

  // ── recover (RTC1c) ──────────────────────────────────────────────

  /**
   * RTC1c_1 - recover string sent in connection request
   */
  it('RTC1c - recover key sent in URL', function (done) {
    const recoveryKey = JSON.stringify({
      connectionKey: 'previous-connection-key',
      msgSerial: 5,
      channelSerials: { channel1: 'serial1' },
    });

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        expect(conn.url.searchParams.get('recover')).to.equal('previous-connection-key');
        conn.respond_with_connected();
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      recover: recoveryKey,
      useBinaryProtocol: false,
    });

    client.connection.once('connected', () => {
      client.close();
      done();
    });
  });

  /**
   * RTC1c_3 - Invalid recovery key handled gracefully
   */
  it('RTC1c - invalid recovery key handled gracefully', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        // Invalid key should not appear as recover param
        expect(conn.url.searchParams.get('recover')).to.be.null;
        conn.respond_with_connected();
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      recover: 'invalid-not-a-valid-recovery-key',
      useBinaryProtocol: false,
    });

    client.connection.once('connected', () => {
      client.close();
      done();
    });
  });

  // ── transportParams (RTC1f) ───────────────────────────────────────

  /**
   * RTC1f_1 - transportParams included in connection URL
   */
  it('RTC1f - transportParams in URL', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        expect(conn.url.searchParams.get('customParam')).to.equal('customValue');
        expect(conn.url.searchParams.get('anotherParam')).to.equal('123');
        conn.respond_with_connected();
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      transportParams: { customParam: 'customValue', anotherParam: '123' },
      useBinaryProtocol: false,
    });

    client.connection.once('connected', () => {
      client.close();
      done();
    });
  });

  /**
   * RTC1f_2 - transportParams with different value types
   */
  it('RTC1f - transportParams value types stringified', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        expect(conn.url.searchParams.get('stringParam')).to.equal('hello');
        expect(conn.url.searchParams.get('numberParam')).to.equal('42');
        expect(conn.url.searchParams.get('boolTrueParam')).to.equal('true');
        expect(conn.url.searchParams.get('boolFalseParam')).to.equal('false');
        conn.respond_with_connected();
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      transportParams: {
        stringParam: 'hello',
        numberParam: 42,
        boolTrueParam: true,
        boolFalseParam: false,
      },
      useBinaryProtocol: false,
    });

    client.connection.once('connected', () => {
      client.close();
      done();
    });
  });

  /**
   * RTC1f1 - transportParams override library defaults
   */
  it('RTC1f1 - transportParams override defaults', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        expect(conn.url.searchParams.get('v')).to.equal('3');
        expect(conn.url.searchParams.get('heartbeats')).to.equal('false');
        conn.respond_with_connected();
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      transportParams: { v: '3', heartbeats: 'false' },
      useBinaryProtocol: false,
    });

    client.connection.once('connected', () => {
      client.close();
      done();
    });
  });

  // ── connect / close (RTC15, RTC16) ────────────────────────────────

  /**
   * RTC15a - connect() calls Connection#connect
   */
  it('RTC15 - connect() proxies to connection', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        conn.respond_with_connected();
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });

    expect(client.connection.state).to.equal('initialized');

    client.connection.once('connected', () => {
      expect(client.connection.state).to.equal('connected');
      client.close();
      done();
    });

    client.connect();
  });

  /**
   * RTC16a - close() calls Connection#close
   */
  it('RTC16 - close() proxies to connection', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg, conn) => {
        if (msg.action === 7) { // CLOSE
          conn.send_to_client({ action: 8 }); // CLOSED
        }
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      useBinaryProtocol: false,
    });

    client.connection.once('connected', () => {
      client.connection.once('closed', () => {
        expect(client.connection.state).to.equal('closed');
        done();
      });
      client.close();
    });
  });

  // ── Connection URL parameters ─────────────────────────────────────

  /**
   * Standard query parameters present in connection URL
   */
  it('Standard query params in connection URL', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        // v (protocol version)
        expect(conn.url.searchParams.get('v')).to.match(/^\d+$/);
        // format
        expect(conn.url.searchParams.get('format')).to.equal('json');
        // heartbeats
        expect(conn.url.searchParams.has('heartbeats')).to.be.true;
        // key (basic auth)
        expect(conn.url.searchParams.get('key')).to.equal('appId.keyId:keySecret');

        conn.respond_with_connected();
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      useBinaryProtocol: false,
    });

    client.connection.once('connected', () => {
      client.close();
      done();
    });
  });

  /**
   * RSC18 - TLS setting affects WebSocket URL scheme
   */
  it('RSC18 - TLS true uses wss://', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        expect(conn.url.protocol).to.equal('wss:');
        conn.respond_with_connected();
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      tls: true,
      useBinaryProtocol: false,
    });

    client.connection.once('connected', () => {
      client.close();
      done();
    });
  });

  it('RSC18 - TLS false uses ws://', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        expect(conn.url.protocol).to.equal('ws:');
        conn.respond_with_connected();
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      token: 'test-token',
      tls: false,
      useBinaryProtocol: false,
    });

    client.connection.once('connected', () => {
      client.close();
      done();
    });
  });

  /**
   * useBinaryProtocol affects format query param
   */
  it('useBinaryProtocol false sends format=json', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        expect(conn.url.searchParams.get('format')).to.equal('json');
        conn.respond_with_connected();
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      useBinaryProtocol: false,
    });

    client.connection.once('connected', () => {
      client.close();
      done();
    });
  });

  it('useBinaryProtocol true sends format=msgpack', function (done) {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        expect(conn.url.searchParams.get('format')).to.equal('msgpack');
        // Don't try to deliver CONNECTED — msgpack would fail
        // Just verify the URL param
        done();
      },
    });
    installMockWebSocket(mock.constructorFn);

    new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      useBinaryProtocol: true,
    });
  });
});
