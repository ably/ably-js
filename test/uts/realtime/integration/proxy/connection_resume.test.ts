/**
 * UTS Proxy Integration: Connection Resume Tests
 *
 * Spec points: RTN15a, RTN15b, RTN15c6, RTN15c7, RTN15h1, RTN15h3
 * Source: specification/uts/realtime/integration/proxy/connection_resume.md
 */

import { expect } from 'chai';
import {
  Ably,
  setupSandbox,
  teardownSandbox,
  getApiKey,
  getKeyParts,
  trackClient,
  closeAndWait,
  connectAndWait,
  generateJWT,
  pollUntil,
  SANDBOX_ENDPOINT,
} from '../sandbox';
import { createProxySession, waitForProxy, ProxySession } from '../helpers/proxy';

function waitForState(client: any, targetState: string, timeout = 15000): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            `Timed out waiting for state '${targetState}' (current: ${client.connection.state})`,
          ),
        ),
      timeout,
    );
    if (client.connection.state === targetState) {
      clearTimeout(timer);
      resolve();
      return;
    }
    const listener = (stateChange: any) => {
      if (stateChange.current === targetState) {
        clearTimeout(timer);
        client.connection.off(listener);
        resolve();
      }
    };
    client.connection.on(listener);
  });
}

describe('uts/realtime/integration/proxy/connection_resume', function () {
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
   * RTN15a — Unexpected disconnect triggers resume
   *
   * Proxy passthrough, then imperative disconnect. Verify state sequence
   * (disconnected -> connecting -> connected) and that the 2nd ws_connect
   * has a `resume` query parameter.
   */
  it('RTN15a - unexpected disconnect triggers resume', async function () {
    session = await createProxySession({
      rules: [],
    });

    const { keyName, keySecret } = getKeyParts(getApiKey());
    const client = new Ably.Realtime({
      authCallback: (_params: any, cb: any) => {
        cb(null, generateJWT({ keyName, keySecret }));
      },
      endpoint: 'localhost',
      port: session.proxyPort,
      tls: false,
      useBinaryProtocol: false,
      autoConnect: false,
    } as any);
    trackClient(client);

    // Connect through proxy
    client.connect();
    await waitForState(client, 'connected', 15000);

    // Record state changes from this point
    const stateChanges: string[] = [];
    client.connection.on((change: any) => {
      stateChanges.push(change.current);
    });

    // Trigger unexpected disconnect via proxy imperative action
    await session.triggerAction({ type: 'disconnect' });

    // Wait for disconnected first, then reconnected
    await waitForState(client, 'disconnected', 10000);
    await waitForState(client, 'connected', 15000);

    // State changes should include disconnected -> connecting -> connected
    expect(stateChanges).to.include('disconnected');
    expect(stateChanges).to.include('connecting');
    expect(stateChanges).to.include('connected');
    const disconnectedIdx = stateChanges.indexOf('disconnected');
    const connectingIdx = stateChanges.indexOf('connecting');
    const connectedIdx = stateChanges.indexOf('connected');
    expect(disconnectedIdx).to.be.lessThan(connectingIdx);
    expect(connectingIdx).to.be.lessThan(connectedIdx);

    // Verify resume was attempted via proxy log
    const log = await session.getLog();
    const wsConnects = log.filter((e) => e.type === 'ws_connect');
    expect(wsConnects.length).to.be.at.least(2);

    // Second WebSocket connection should include resume query parameter
    expect(wsConnects[1].queryParams).to.exist;
    expect(wsConnects[1].queryParams!['resume']).to.exist;

    await closeAndWait(client);
  });

  /**
   * RTN15b, RTN15c6 — Resume preserves connectionId
   *
   * After unexpected disconnect and successful resume, the connection ID
   * remains the same and the resume query parameter contains the connection key.
   */
  it('RTN15b/RTN15c6 - resume preserves connectionId', async function () {
    session = await createProxySession({
      rules: [],
    });

    const { keyName, keySecret } = getKeyParts(getApiKey());
    const client = new Ably.Realtime({
      authCallback: (_params: any, cb: any) => {
        cb(null, generateJWT({ keyName, keySecret }));
      },
      endpoint: 'localhost',
      port: session.proxyPort,
      tls: false,
      useBinaryProtocol: false,
      autoConnect: false,
    } as any);
    trackClient(client);

    // Connect through proxy
    client.connect();
    await waitForState(client, 'connected', 15000);

    // Record connection identity before disconnect
    const originalConnectionId = client.connection.id;
    const originalConnectionKey = client.connection.key;
    expect(originalConnectionId).to.exist;
    expect(originalConnectionKey).to.exist;

    // Trigger unexpected disconnect
    await session.triggerAction({ type: 'disconnect' });

    // Wait for disconnected first, then reconnected
    await waitForState(client, 'disconnected', 10000);
    await waitForState(client, 'connected', 15000);

    // RTN15c6: Connection ID is preserved (successful resume)
    expect(client.connection.id).to.equal(originalConnectionId);

    // RTN15b: Second ws_connect URL includes resume={connectionKey}
    const log = await session.getLog();
    const wsConnects = log.filter((e) => e.type === 'ws_connect');
    expect(wsConnects.length).to.be.at.least(2);
    expect(wsConnects[1].queryParams).to.exist;
    expect(wsConnects[1].queryParams!['resume']).to.equal(originalConnectionKey);

    // No error reason on successful resume
    expect(client.connection.errorReason).to.be.null;

    await closeAndWait(client);
  });

  /**
   * RTN15c7 — Failed resume gets new connectionId
   *
   * Proxy replaces the 2nd CONNECTED (the resume response) with one containing
   * a different connectionId and error code 80008. SDK should accept the new
   * connection identity and expose the error.
   */
  it('RTN15c7 - failed resume gets new connectionId', async function () {
    session = await createProxySession({
      rules: [
        {
          match: { type: 'ws_frame_to_client', action: 'CONNECTED', count: 2 },
          action: {
            type: 'replace',
            message: {
              action: 4,
              connectionId: 'proxy-injected-new-id',
              connectionKey: 'proxy-injected-new-key',
              connectionDetails: {
                connectionKey: 'proxy-injected-new-key',
                clientId: null,
                maxMessageSize: 65536,
                maxInboundRate: 250,
                maxOutboundRate: 100,
                maxFrameSize: 524288,
                serverId: 'test-server',
                connectionStateTtl: 120000,
                maxIdleInterval: 15000,
              },
              error: {
                code: 80008,
                statusCode: 400,
                message: 'Unable to recover connection',
              },
            },
          },
          times: 1,
          comment: 'RTN15c7: Replace 2nd CONNECTED with failed resume (different connectionId + error 80008)',
        },
      ],
    });

    const { keyName, keySecret } = getKeyParts(getApiKey());
    const client = new Ably.Realtime({
      authCallback: (_params: any, cb: any) => {
        cb(null, generateJWT({ keyName, keySecret }));
      },
      endpoint: 'localhost',
      port: session.proxyPort,
      tls: false,
      useBinaryProtocol: false,
      autoConnect: false,
    } as any);
    trackClient(client);

    // Connect through proxy — first CONNECTED passes through normally
    client.connect();
    await waitForState(client, 'connected', 15000);

    // Record original identity
    const originalConnectionId = client.connection.id;
    expect(originalConnectionId).to.exist;
    expect(originalConnectionId).to.not.equal('proxy-injected-new-id');

    // Trigger disconnect — SDK will attempt resume
    await session.triggerAction({ type: 'disconnect' });

    // Wait for disconnected first, then reconnected
    // SDK reconnects, but proxy replaces the CONNECTED response with a new connectionId
    await waitForState(client, 'disconnected', 10000);
    await waitForState(client, 'connected', 15000);

    // RTN15c7: Connection ID changed (resume failed, got new connection)
    expect(client.connection.id).to.equal('proxy-injected-new-id');
    expect(client.connection.id).to.not.equal(originalConnectionId);

    // Connection key updated to the new one
    expect(client.connection.key).to.equal('proxy-injected-new-key');

    // Error reason is set indicating why resume failed
    expect(client.connection.errorReason).to.not.be.null;
    expect(client.connection.errorReason.code).to.equal(80008);

    // Connection is still CONNECTED (not FAILED — the server gave a new connection)
    expect(client.connection.state).to.equal('connected');

    // Verify resume was attempted in the proxy log
    const log = await session.getLog();
    const wsConnects = log.filter((e) => e.type === 'ws_connect');
    expect(wsConnects.length).to.be.at.least(2);
    expect(wsConnects[1].queryParams).to.exist;
    expect(wsConnects[1].queryParams!['resume']).to.exist;

    await closeAndWait(client);
  });

  /**
   * RTN15h1 — DISCONNECTED with token error + non-renewable token -> FAILED
   *
   * Proxy injects DISCONNECTED with error 40142 after 1s and closes the socket.
   * Client is configured with a token string only (no key, no authCallback)
   * so it cannot renew. SDK should transition to FAILED.
   */
  it('RTN15h1 - DISCONNECTED with token error and non-renewable token causes FAILED', async function () {
    session = await createProxySession({
      rules: [
        {
          match: { type: 'delay_after_ws_connect', delayMs: 1000 },
          action: {
            type: 'inject_to_client_and_close',
            message: {
              action: 6,
              error: {
                code: 40142,
                statusCode: 401,
                message: 'Token expired',
              },
            },
          },
          times: 1,
          comment: 'RTN15h1: Inject DISCONNECTED with token error (40142) after 1s',
        },
      ],
    });

    // Provision a real token from the sandbox so the initial connection succeeds
    const restClient = new Ably.Rest({ key: getApiKey(), endpoint: SANDBOX_ENDPOINT } as any);
    const tokenDetails = await restClient.auth.requestToken();

    // Use only the token string — no key, no authCallback — making it non-renewable
    const client = new Ably.Realtime({
      token: tokenDetails.token,
      endpoint: 'localhost',
      port: session.proxyPort,
      tls: false,
      useBinaryProtocol: false,
      autoConnect: false,
    } as any);
    trackClient(client);

    // Connect through proxy — initial connection succeeds with the real token
    client.connect();
    await waitForState(client, 'connected', 15000);

    // Record state changes
    const stateChanges: string[] = [];
    client.connection.on((change: any) => {
      stateChanges.push(change.current);
    });

    // After 1s the proxy injects DISCONNECTED with 40142 and closes the socket.
    // The SDK has a non-renewable token, so it cannot renew -> FAILED.
    await waitForState(client, 'failed', 15000);

    // RTN15h1: Ended in FAILED state
    expect(client.connection.state).to.equal('failed');

    // Error reason reflects the token error
    expect(client.connection.errorReason).to.not.be.null;
    expect(client.connection.errorReason.code).to.equal(40142);
    expect(client.connection.errorReason.statusCode).to.equal(401);

    // State changes should show the transition to FAILED
    expect(stateChanges).to.include('failed');

    // No need to close — already in FAILED state
  });

  /**
   * RTN15h3 — DISCONNECTED with non-token error triggers reconnect
   *
   * Proxy injects DISCONNECTED with error 80003 after 1s and closes the socket.
   * Rule fires once, so the reconnection attempt passes through cleanly.
   * SDK should reconnect and resume rather than transitioning to FAILED.
   */
  it('RTN15h3 - DISCONNECTED with non-token error triggers reconnect', async function () {
    session = await createProxySession({
      rules: [
        {
          match: { type: 'delay_after_ws_connect', delayMs: 1000 },
          action: {
            type: 'inject_to_client_and_close',
            message: {
              action: 6,
              error: {
                code: 80003,
                statusCode: 500,
                message: 'Service temporarily unavailable',
              },
            },
          },
          times: 1,
          comment: 'RTN15h3: Inject DISCONNECTED with non-token error (80003) after 1s, once only',
        },
      ],
    });

    const { keyName, keySecret } = getKeyParts(getApiKey());
    const client = new Ably.Realtime({
      authCallback: (_params: any, cb: any) => {
        cb(null, generateJWT({ keyName, keySecret }));
      },
      endpoint: 'localhost',
      port: session.proxyPort,
      tls: false,
      useBinaryProtocol: false,
      autoConnect: false,
    } as any);
    trackClient(client);

    // Connect through proxy
    client.connect();
    await waitForState(client, 'connected', 15000);

    // Record state changes
    const stateChanges: string[] = [];
    client.connection.on((change: any) => {
      stateChanges.push(change.current);
    });

    // After 1s the proxy injects DISCONNECTED with non-token error and closes.
    // The rule fires once, so the reconnection attempt passes through to the real server.

    // Wait for DISCONNECTED (from the injected message)
    await waitForState(client, 'disconnected', 10000);

    // SDK should automatically reconnect
    await waitForState(client, 'connected', 15000);

    // RTN15h3: SDK reconnected successfully (not FAILED)
    expect(client.connection.state).to.equal('connected');

    // State changes should show: disconnected -> connecting -> connected
    expect(stateChanges).to.include('disconnected');
    expect(stateChanges).to.include('connecting');
    expect(stateChanges).to.include('connected');
    const disconnectedIdx = stateChanges.indexOf('disconnected');
    const connectingIdx = stateChanges.indexOf('connecting');
    const connectedIdx = stateChanges.indexOf('connected');
    expect(disconnectedIdx).to.be.lessThan(connectingIdx);
    expect(connectingIdx).to.be.lessThan(connectedIdx);

    // Verify resume was attempted
    const log = await session.getLog();
    const wsConnects = log.filter((e) => e.type === 'ws_connect');
    expect(wsConnects.length).to.be.at.least(2);
    expect(wsConnects[1].queryParams).to.exist;
    expect(wsConnects[1].queryParams!['resume']).to.exist;

    // No error reason after successful reconnection
    expect(client.connection.errorReason).to.be.null;

    await closeAndWait(client);
  });
});
