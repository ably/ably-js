/**
 * UTS: Channel Detach Tests
 *
 * Spec points: RTL5a, RTL5b, RTL5d, RTL5f, RTL5i, RTL5j, RTL5k, RTL5l
 * Source: uts/test/realtime/unit/channels/channel_detach_test.md
 *
 * Tests channel detach lifecycle: no-op patterns, concurrent detach,
 * DETACH message flow, timeout handling, and edge cases.
 *
 * Deviation: RTL5a (initialized detach) — ably-js transitions initialized
 *   channel to 'detached' (not a no-op) when connection is not connected.
 * Deviation: RTL5 (errorReason clearing) — ably-js does NOT clear errorReason
 *   on detach (same as RTL24 deviation in channel_attributes tests).
 * Deviation: RTL5k (ATTACHED while detached) — ably-js re-enters 'attached'
 *   state instead of sending DETACH when ATTACHED received while detached.
 */

import { expect } from 'chai';
import { MockWebSocket } from '../../mock_websocket';
import { Ably, installMockWebSocket, enableFakeTimers, restoreAll, trackClient } from '../../helpers';

describe('uts/realtime/channels/channel_detach', function () {
  afterEach(function () {
    restoreAll();
  });

  /**
   * RTL5a - Detach when initialized
   *
   * Deviation: ably-js transitions to 'detached' state (not a no-op)
   * when connection is not connected.
   */
  it('RTL5a - detach from initialized state', async function () {
    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    const channel = client.channels.get('test-RTL5a-init');
    expect(channel.state).to.equal('initialized');

    await channel.detach();
    client.close();
    // Deviation: ably-js transitions to 'detached' (not stays 'initialized')
    expect(channel.state).to.satisfy(
      (s: string) => s === 'initialized' || s === 'detached',
    );
  });

  /**
   * RTL5a - Detach when already detached is no-op
   */
  it('RTL5a - detach when already detached is no-op', async function () {
    let detachMessageCount = 0;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) { // ATTACH
          mock.active_connection!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            flags: 0,
          });
        }
        if (msg.action === 12) { // DETACH
          detachMessageCount++;
          mock.active_connection!.send_to_client({
            action: 13, // DETACHED
            channel: msg.channel,
          });
        }
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    client.connect();
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    const channel = client.channels.get('test-RTL5a-detached');
    await channel.attach();
    await channel.detach();
    expect(channel.state).to.equal('detached');
    expect(detachMessageCount).to.equal(1);

    // Second detach should be no-op
    await channel.detach();
    client.close();
    expect(channel.state).to.equal('detached');
    expect(detachMessageCount).to.equal(1);
  });

  /**
   * RTL5i - Concurrent detach while detaching waits for completion
   */
  it('RTL5i - concurrent detach while detaching', async function () {
    let detachMessageCount = 0;
    let pendingDetachChannel: string | null = null;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) { // ATTACH
          mock.active_connection!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            flags: 0,
          });
        }
        if (msg.action === 12) { // DETACH
          detachMessageCount++;
          pendingDetachChannel = msg.channel;
          // Don't respond — let test control timing
        }
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    client.connect();
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    const channel = client.channels.get('test-RTL5i');
    await channel.attach();

    // Start first detach
    const detach1 = channel.detach();

    // Wait for detaching state
    await new Promise<void>((resolve) => {
      if (channel.state === 'detaching') return resolve();
      channel.once('detaching', () => resolve());
    });

    // Start second detach while detaching
    const detach2 = channel.detach();

    // Now respond with DETACHED
    mock.active_connection!.send_to_client({
      action: 13, // DETACHED
      channel: pendingDetachChannel!,
    });

    await detach1;
    await detach2;

    client.close();
    expect(channel.state).to.equal('detached');
    expect(detachMessageCount).to.equal(1);
  });

  /**
   * RTL5b - Detach from failed state results in error
   */
  it('RTL5b - detach from failed state errors', async function () {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) { // ATTACH
          mock.active_connection!.send_to_client({
            action: 9, // ERROR
            channel: msg.channel,
            error: {
              message: 'Channel denied',
              code: 40160,
              statusCode: 401,
            },
          });
        }
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    client.connect();
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    const channel = client.channels.get('test-RTL5b');

    // Attach fails → channel enters FAILED
    try {
      await channel.attach();
    } catch (err) {
      // Expected
    }
    expect(channel.state).to.equal('failed');

    // Detach from FAILED should throw
    try {
      await channel.detach();
      expect.fail('Expected detach to throw');
    } catch (err: any) {
      expect(err).to.not.be.null;
      expect(err.code).to.equal(90001);
    }
    client.close();
    expect(channel.state).to.equal('failed');
  });

  /**
   * RTL5j - Detach from suspended transitions to detached immediately
   */
  it('RTL5j - detach from suspended is immediate', async function () {
    let detachMessageCount = 0;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) { // ATTACH
          // Don't respond — let it timeout
        }
        if (msg.action === 12) { // DETACH
          detachMessageCount++;
        }
      },
    });
    installMockWebSocket(mock.constructorFn);

    const clock = enableFakeTimers();

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
      realtimeRequestTimeout: 100,
    });
    trackClient(client);

    client.connect();
    for (let i = 0; i < 20; i++) {
      clock.tick(0);
      await new Promise((r) => setTimeout(r, 1));
    }

    const channel = client.channels.get('test-RTL5j');

    // Start attach (will timeout)
    const attachPromise = channel.attach().catch(() => {});

    for (let i = 0; i < 10; i++) {
      clock.tick(0);
      await new Promise((r) => setTimeout(r, 1));
    }

    // Advance past timeout
    await clock.tickAsync(150);
    await attachPromise;

    expect(channel.state).to.equal('suspended');

    // Detach from suspended should be immediate
    await channel.detach();
    client.close();
    expect(channel.state).to.equal('detached');
    expect(detachMessageCount).to.equal(0); // No DETACH message sent
  });

  /**
   * RTL5d - Normal detach flow
   */
  it('RTL5d - normal detach flow', async function () {
    let capturedDetachMsg: any = null;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) { // ATTACH
          mock.active_connection!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            flags: 0,
          });
        }
        if (msg.action === 12) { // DETACH
          capturedDetachMsg = msg;
          mock.active_connection!.send_to_client({
            action: 13, // DETACHED
            channel: msg.channel,
          });
        }
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    client.connect();
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    const channel = client.channels.get('test-RTL5d');
    await channel.attach();

    let stateDuringDetach: string | null = null;
    channel.once('detaching', () => {
      stateDuringDetach = channel.state;
    });

    await channel.detach();

    client.close();
    expect(stateDuringDetach).to.equal('detaching');
    expect(channel.state).to.equal('detached');
    expect(capturedDetachMsg).to.not.be.null;
    expect(capturedDetachMsg.action).to.equal(12);
    expect(capturedDetachMsg.channel).to.equal('test-RTL5d');
  });

  /**
   * RTL5f - Detach timeout returns to previous state
   */
  it('RTL5f - detach timeout returns to attached', async function () {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) { // ATTACH
          mock.active_connection!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            flags: 0,
          });
        }
        if (msg.action === 12) { // DETACH
          // Don't respond — simulate timeout
        }
      },
    });
    installMockWebSocket(mock.constructorFn);

    const clock = enableFakeTimers();

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
      realtimeRequestTimeout: 100,
    });
    trackClient(client);

    client.connect();
    for (let i = 0; i < 20; i++) {
      clock.tick(0);
      await new Promise((r) => setTimeout(r, 1));
    }

    const channel = client.channels.get('test-RTL5f');
    await channel.attach();
    expect(channel.state).to.equal('attached');

    // Start detach (will timeout)
    let detachError: any = null;
    const detachPromise = channel.detach().catch((err: any) => {
      detachError = err;
    });

    for (let i = 0; i < 10; i++) {
      clock.tick(0);
      await new Promise((r) => setTimeout(r, 1));
    }

    // Advance past timeout
    await clock.tickAsync(150);
    await detachPromise;

    // Should return to attached state
    expect(channel.state).to.equal('attached');
    expect(detachError).to.not.be.null;
  });

  /**
   * RTL5k - ATTACHED received while detaching sends new DETACH
   */
  it('RTL5k - ATTACHED while detaching triggers new DETACH', async function () {
    let detachMessageCount = 0;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) { // ATTACH
          mock.active_connection!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            flags: 0,
          });
        }
        if (msg.action === 12) { // DETACH
          detachMessageCount++;
          if (detachMessageCount === 1) {
            // First DETACH: respond with ATTACHED (simulating race condition)
            mock.active_connection!.send_to_client({
              action: 11, // ATTACHED
              channel: msg.channel,
              flags: 0,
            });
          } else {
            // Second DETACH: respond normally
            mock.active_connection!.send_to_client({
              action: 13, // DETACHED
              channel: msg.channel,
            });
          }
        }
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    client.connect();
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    const channel = client.channels.get('test-RTL5k');
    await channel.attach();

    await channel.detach();
    client.close();
    expect(channel.state).to.equal('detached');
    expect(detachMessageCount).to.equal(2); // Two DETACH messages sent
  });

  /**
   * RTL5l - Detach when connection not connected transitions immediately
   */
  it('RTL5l - detach when disconnected is immediate', async function () {
    let detachMessageCount = 0;
    let pendingConnection: any = null;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        pendingConnection = conn;
        // Don't respond — hold in connecting state
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 12) { // DETACH
          detachMessageCount++;
        }
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    client.connect();
    await new Promise<void>((resolve) => {
      if (client.connection.state === 'connecting') return resolve();
      client.connection.once('connecting', () => resolve());
    });

    const channel = client.channels.get('test-RTL5l');

    // Start attach while connecting
    const attachPromise = channel.attach();

    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    expect(channel.state).to.equal('attaching');

    // Now detach — should transition immediately since not connected
    await channel.detach();
    client.close();
    expect(channel.state).to.equal('detached');
    expect(detachMessageCount).to.equal(0);
  });

  /**
   * RTL5 - Detach emits state change events
   */
  it('RTL5 - detach emits state change events', async function () {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) { // ATTACH
          mock.active_connection!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            flags: 0,
          });
        }
        if (msg.action === 12) { // DETACH
          mock.active_connection!.send_to_client({
            action: 13, // DETACHED
            channel: msg.channel,
          });
        }
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    client.connect();
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    const channel = client.channels.get('test-RTL5-events');
    await channel.attach();

    const stateChanges: any[] = [];
    channel.on((change: any) => {
      stateChanges.push(change);
    });

    await channel.detach();

    client.close();
    expect(stateChanges.length).to.be.at.least(2);
    expect(stateChanges[0].current).to.equal('detaching');
    expect(stateChanges[0].previous).to.equal('attached');
    expect(stateChanges[1].current).to.equal('detached');
    expect(stateChanges[1].previous).to.equal('detaching');
  });
});
