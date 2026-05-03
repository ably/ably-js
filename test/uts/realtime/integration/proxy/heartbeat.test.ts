/**
 * UTS Proxy Integration: Heartbeat Tests
 *
 * Spec points: RTN23a
 * Source: specification/uts/realtime/integration/proxy/heartbeat.md
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
  generateJWT,
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

describe('uts/realtime/integration/proxy/heartbeat', function () {
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
   * RTN23a — Heartbeat starvation causes disconnect and reconnect
   *
   * The proxy suppresses all server-to-client frames after a 2s delay from
   * ws_connect, using suppress_onwards action. The SDK's idle timer fires
   * after maxIdleInterval + realtimeRequestTimeout (~15s + 5s = ~20s).
   * The SDK transitions to DISCONNECTED and reconnects. The suppress_onwards
   * rule has times: 1, so the second WS connection is unaffected.
   */
  it('RTN23a - heartbeat starvation causes disconnect and reconnect', async function () {
    session = await createProxySession({
      rules: [
        {
          match: { type: 'delay_after_ws_connect', delayMs: 2000 },
          action: { type: 'suppress_onwards' },
          times: 1,
          comment: 'RTN23a: Suppress all server frames after 2s to starve heartbeats',
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
      realtimeRequestTimeout: 5000,
    } as any);
    trackClient(client);

    // Record state changes for sequence verification
    const stateChanges: string[] = [];
    client.connection.on((change: any) => {
      stateChanges.push(change.current);
    });

    // Start connection
    client.connect();

    // SDK receives real CONNECTED from Ably (within the 2s before suppression starts)
    await waitForState(client, 'connected', 15000);

    // Capture connection details from the first connection
    const firstConnectionId = client.connection.id;
    expect(firstConnectionId).to.exist;

    // Now all server frames are suppressed. The SDK's idle timer will fire after
    // maxIdleInterval + realtimeRequestTimeout (~15s + 5s = ~20s).
    // The SDK transitions to DISCONNECTED and reconnects.
    // The suppress_onwards rule has times=1, so the second WS connection is unaffected.

    // Wait for disconnected (heartbeat starvation)
    await waitForState(client, 'disconnected', 45000);

    // Wait for reconnection
    await waitForState(client, 'connected', 30000);

    // Connection is re-established
    expect(client.connection.state).to.equal('connected');
    expect(client.connection.id).to.exist;
    expect(client.connection.key).to.exist;

    // State sequence shows: connecting -> connected -> disconnected -> connecting -> connected
    expect(stateChanges).to.include('connecting');
    expect(stateChanges).to.include('connected');
    expect(stateChanges).to.include('disconnected');

    const firstConnectingIdx = stateChanges.indexOf('connecting');
    const firstConnectedIdx = stateChanges.indexOf('connected');
    const disconnectedIdx = stateChanges.indexOf('disconnected');
    const secondConnectingIdx = stateChanges.indexOf('connecting', disconnectedIdx);
    const lastConnectedIdx = stateChanges.lastIndexOf('connected');

    expect(firstConnectingIdx).to.be.lessThan(firstConnectedIdx);
    expect(firstConnectedIdx).to.be.lessThan(disconnectedIdx);
    expect(secondConnectingIdx).to.be.greaterThan(disconnectedIdx);
    expect(lastConnectedIdx).to.be.greaterThan(secondConnectingIdx);

    // Proxy event log confirms two WebSocket connections
    const log = await session.getLog();
    const wsConnects = log.filter((e: any) => e.type === 'ws_connect');
    expect(wsConnects.length).to.be.at.least(2);

    // Second connection should include resume parameter (RTN15c)
    expect(wsConnects[1].queryParams?.resume).to.exist;

    await closeAndWait(client);
  });
});
