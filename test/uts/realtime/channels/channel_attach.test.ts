/**
 * UTS: Channel Attach Tests
 *
 * Spec points: RTL4a, RTL4b, RTL4c, RTL4c1, RTL4f, RTL4g, RTL4h,
 *              RTL4i, RTL4j, RTL4k, RTL4l, RTL4m
 * Source: uts/test/realtime/unit/channels/channel_attach_test.md
 *
 * Tests channel attach lifecycle: no-op patterns, concurrent attach,
 * ATTACH message contents, timeout handling, resume flags, modes/params.
 *
 * Deviation: RTL4g (errorReason clearing) — ably-js does NOT clear
 *   errorReason on successful re-attach from FAILED state.
 * Deviation: RTL16a (setOptions reattach) — ably-js does NOT transition
 *   through 'attaching' during setOptions reattach (see channel_options tests).
 */

import { expect } from 'chai';
import { MockWebSocket } from '../../mock_websocket';
import { MockHttpClient } from '../../mock_http';
import { Ably, installMockWebSocket, installMockHttp, enableFakeTimers, restoreAll, trackClient } from '../../helpers';

describe('uts/realtime/channels/channel_attach', function () {
  afterEach(function () {
    restoreAll();
  });

  /**
   * RTL4a - Attach when already attached is no-op
   */
  it('RTL4a - attach when already attached is no-op', async function () {
    let attachMessageCount = 0;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) { // ATTACH
          attachMessageCount++;
          mock.active_connection!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            flags: 0,
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

    const channel = client.channels.get('test-RTL4a');
    await channel.attach();
    expect(channel.state).to.equal('attached');
    expect(attachMessageCount).to.equal(1);

    // Second attach should be no-op
    const result = await channel.attach();
    client.close();
    expect(result).to.be.null;
    expect(attachMessageCount).to.equal(1); // No additional ATTACH sent
  });

  /**
   * RTL4h - Concurrent attach while attaching waits for completion
   */
  it('RTL4h - concurrent attach while attaching', async function () {
    let attachMessageCount = 0;
    let pendingAttachChannel: string | null = null;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) { // ATTACH
          attachMessageCount++;
          pendingAttachChannel = msg.channel;
          // Don't respond immediately — let the test control timing
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

    const channel = client.channels.get('test-RTL4h');

    // Start first attach (don't await yet)
    const attach1 = channel.attach();

    // Wait for the channel to enter attaching state
    await new Promise<void>((resolve) => {
      if (channel.state === 'attaching') return resolve();
      channel.once('attaching', () => resolve());
    });

    // Start second attach while still attaching
    const attach2 = channel.attach();

    // Now respond with ATTACHED
    mock.active_connection!.send_to_client({
      action: 11, // ATTACHED
      channel: pendingAttachChannel!,
      flags: 0,
    });

    // Both should resolve
    await attach1;
    await attach2;

    expect(channel.state).to.equal('attached');
    expect(attachMessageCount).to.equal(1); // Only one ATTACH message sent
    client.close();
  });

  /**
   * RTL4g - Attach from FAILED state
   *
   * Deviation: ably-js does NOT clear errorReason on successful re-attach.
   */
  it('RTL4g - attach from failed state', async function () {
    let attachCount = 0;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) { // ATTACH
          attachCount++;
          if (attachCount === 1) {
            // First attach: respond with ERROR
            mock.active_connection!.send_to_client({
              action: 9, // ERROR
              channel: msg.channel,
              error: {
                message: 'Channel denied',
                code: 40160,
                statusCode: 401,
              },
            });
          } else {
            // Subsequent attach: succeed
            mock.active_connection!.send_to_client({
              action: 11, // ATTACHED
              channel: msg.channel,
              flags: 0,
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

    const channel = client.channels.get('test-RTL4g');

    // First attach fails
    try {
      await channel.attach();
      expect.fail('Expected attach to fail');
    } catch (err: any) {
      expect(err.code).to.equal(40160);
    }
    expect(channel.state).to.equal('failed');
    expect(channel.errorReason).to.not.be.null;

    // Second attach from FAILED state should succeed
    await channel.attach();
    expect(channel.state).to.equal('attached');
    // Deviation: errorReason is NOT cleared in ably-js
    expect(channel.errorReason).to.not.be.null;
    client.close();
  });

  /**
   * RTL4b - Attach fails when connection is closed
   */
  it('RTL4b - attach fails when connection closed', async function () {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 7) { // CLOSE
          mock.active_connection!.send_to_client({
            action: 8, // CLOSED
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

    client.close();
    await new Promise<void>((resolve) => client.connection.once('closed', resolve));
    expect(client.connection.state).to.equal('closed');

    const channel = client.channels.get('test-RTL4b-closed');
    try {
      await channel.attach();
      expect.fail('Expected attach to fail');
    } catch (err: any) {
      expect(err).to.not.be.null;
    }
    expect(channel.state).to.not.equal('attached');
  });

  /**
   * RTL4b - Attach fails when connection is failed
   */
  it('RTL4b - attach fails when connection failed', async function () {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
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

    // Send a fatal ERROR to put connection in FAILED state
    mock.active_connection!.send_to_client({
      action: 9, // ERROR
      error: {
        message: 'Fatal error',
        code: 80000,
        statusCode: 400,
      },
    });
    await new Promise<void>((resolve) => client.connection.once('failed', resolve));

    const channel = client.channels.get('test-RTL4b-failed');
    try {
      await channel.attach();
      expect.fail('Expected attach to fail');
    } catch (err: any) {
      expect(err).to.not.be.null;
    }
    expect(channel.state).to.not.equal('attached');
  });

  /**
   * RTL4b - Attach fails when connection is suspended
   */
  it('RTL4b - attach fails when connection suspended', async function () {
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
      fallbackHosts: [],
    });
    trackClient(client);

    client.connect();

    // Pump event loop to let initial failure happen
    for (let i = 0; i < 30; i++) {
      clock.tick(0);
      await new Promise((r) => setTimeout(r, 1));
    }

    // Advance past connectionStateTtl to reach suspended
    await clock.tickAsync(121000);

    for (let i = 0; i < 30; i++) {
      clock.tick(0);
      await new Promise((r) => setTimeout(r, 1));
    }

    expect(client.connection.state).to.equal('suspended');

    const channel = client.channels.get('test-RTL4b-suspended');
    try {
      await channel.attach();
      expect.fail('Expected attach to fail');
    } catch (err: any) {
      expect(err).to.not.be.null;
    }
    expect(channel.state).to.not.equal('attached');
  });

  /**
   * RTL4i - Attach queued when connection is connecting
   */
  it('RTL4i - attach queued when connecting', async function () {
    let pendingConnection: any = null;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        pendingConnection = conn;
        // Don't respond yet — hold in connecting state
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) { // ATTACH
          mock.active_connection!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            flags: 0,
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
    // Wait for connecting state
    await new Promise<void>((resolve) => {
      if (client.connection.state === 'connecting') return resolve();
      client.connection.once('connecting', () => resolve());
    });

    const channel = client.channels.get('test-RTL4i');

    // Start attach while connecting (don't await)
    const attachPromise = channel.attach();

    // Channel should immediately enter attaching state
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    expect(channel.state).to.equal('attaching');

    // Complete the connection
    mock.active_connection = pendingConnection;
    pendingConnection.respond_with_connected();

    // Attach should complete
    await attachPromise;
    expect(channel.state).to.equal('attached');
    client.close();
  });

  /**
   * RTL4c - Attach sends ATTACH message and transitions to attaching
   */
  it('RTL4c - ATTACH message sent, transitions to attaching', async function () {
    let capturedAttachMsg: any = null;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) { // ATTACH
          capturedAttachMsg = msg;
          mock.active_connection!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            flags: 0,
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

    const channel = client.channels.get('test-RTL4c');

    let stateDuringAttach: string | null = null;
    channel.once('attaching', () => {
      stateDuringAttach = channel.state;
    });

    await channel.attach();

    expect(stateDuringAttach).to.equal('attaching');
    expect(channel.state).to.equal('attached');
    expect(capturedAttachMsg).to.not.be.null;
    expect(capturedAttachMsg.action).to.equal(10);
    expect(capturedAttachMsg.channel).to.equal('test-RTL4c');
    client.close();
  });

  /**
   * RTL4c1 - ATTACH message includes channelSerial when available
   *
   * First ATTACH has no channelSerial. After receiving ATTACHED with a
   * channelSerial, a subsequent reattach includes it.
   *
   * Note: Uses setOptions() to trigger reattach, since detach clears
   * channelSerial in ably-js.
   */
  it('RTL4c1 - ATTACH includes channelSerial on reattach', async function () {
    const capturedAttachMsgs: any[] = [];

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) { // ATTACH
          capturedAttachMsgs.push({ ...msg });
          mock.active_connection!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            channelSerial: 'serial-from-server-1',
            flags: 0,
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

    const channel = client.channels.get('test-RTL4c1');

    // First attach — no channelSerial yet
    await channel.attach();

    // Trigger reattach via setOptions (preserves channelSerial unlike detach)
    await channel.setOptions({ params: { rewind: '1' } });

    client.close();
    expect(capturedAttachMsgs.length).to.equal(2);
    // First ATTACH should have no channelSerial
    expect(capturedAttachMsgs[0].channelSerial).to.satisfy(
      (v: any) => !v,
      'First ATTACH should have no channelSerial',
    );
    // Second ATTACH should include the serial from the server
    expect(capturedAttachMsgs[1].channelSerial).to.equal('serial-from-server-1');
  });

  /**
   * RTL4f - Attach times out and transitions to suspended
   */
  it('RTL4f - attach timeout transitions to suspended', async function () {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (_msg) => {
        // Don't respond to ATTACH — simulate timeout
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

    // Connect using real-ish timing then switch to fake clock
    client.connect();

    // Pump to let connection establish
    for (let i = 0; i < 20; i++) {
      clock.tick(0);
      await new Promise((r) => setTimeout(r, 1));
    }
    expect(client.connection.state).to.equal('connected');

    const channel = client.channels.get('test-RTL4f');

    // Start attach (don't await — it will timeout)
    let attachError: any = null;
    const attachPromise = channel.attach().catch((err: any) => {
      attachError = err;
    });

    // Pump to let attach start
    for (let i = 0; i < 10; i++) {
      clock.tick(0);
      await new Promise((r) => setTimeout(r, 1));
    }

    // Advance past the timeout
    await clock.tickAsync(150);

    await attachPromise;

    expect(channel.state).to.equal('suspended');
    expect(attachError).to.not.be.null;
  });

  /**
   * RTL4k - ATTACH includes params from ChannelOptions
   */
  it('RTL4k - ATTACH includes params', async function () {
    let capturedAttachMsg: any = null;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) { // ATTACH
          capturedAttachMsg = msg;
          mock.active_connection!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            flags: 0,
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

    const channel = client.channels.get('test-RTL4k', {
      params: { rewind: '1', delta: 'vcdiff' },
    });

    await channel.attach();

    client.close();
    expect(capturedAttachMsg).to.not.be.null;
    expect(capturedAttachMsg.params).to.not.be.null;
    expect(capturedAttachMsg.params).to.not.be.undefined;
    expect(capturedAttachMsg.params.rewind).to.equal('1');
    expect(capturedAttachMsg.params.delta).to.equal('vcdiff');
  });

  /**
   * RTL4l - ATTACH includes modes as flags
   */
  it('RTL4l - ATTACH includes modes as flags', async function () {
    const PUBLISH = 131072;    // 1 << 17
    const SUBSCRIBE = 262144;  // 1 << 18

    let capturedAttachMsg: any = null;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) { // ATTACH
          capturedAttachMsg = msg;
          mock.active_connection!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            flags: PUBLISH | SUBSCRIBE,
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

    const channel = client.channels.get('test-RTL4l', {
      modes: ['PUBLISH', 'SUBSCRIBE'],
    });

    await channel.attach();

    client.close();
    expect(capturedAttachMsg).to.not.be.null;
    expect(capturedAttachMsg.flags).to.not.be.null;
    expect(capturedAttachMsg.flags).to.not.be.undefined;
    expect(capturedAttachMsg.flags & PUBLISH).to.not.equal(0);
    expect(capturedAttachMsg.flags & SUBSCRIBE).to.not.equal(0);
  });

  /**
   * RTL4m - Channel modes populated from ATTACHED response flags
   */
  it('RTL4m - modes populated from ATTACHED flags', async function () {
    const PUBLISH = 131072;    // 1 << 17
    const SUBSCRIBE = 262144;  // 1 << 18

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
            flags: PUBLISH | SUBSCRIBE,
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

    const channel = client.channels.get('test-RTL4m');
    await channel.attach();

    client.close();
    expect(channel.modes).to.not.be.null;
    expect(channel.modes).to.not.be.undefined;
    const modes = channel.modes!.map((m: string) => m.toUpperCase());
    expect(modes).to.include('PUBLISH');
    expect(modes).to.include('SUBSCRIBE');
  });

  /**
   * RTL4j - ATTACH_RESUME flag set for reattach
   *
   * First attach: ATTACH_RESUME not set.
   * Reattach while attached: ATTACH_RESUME is set.
   *
   * Deviation: ably-js clears _attachResume on detaching/failed transitions,
   * so detach+reattach does NOT set ATTACH_RESUME. Instead, we test via
   * setOptions() reattach which preserves the flag.
   */
  it('RTL4j - ATTACH_RESUME flag on reattach', async function () {
    const ATTACH_RESUME = 32; // 1 << 5
    const capturedAttachMsgs: any[] = [];

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) { // ATTACH
          capturedAttachMsgs.push({ ...msg });
          mock.active_connection!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            flags: 0,
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

    const channel = client.channels.get('test-RTL4j');

    // First attach (clean)
    await channel.attach();

    // Trigger reattach while attached via setOptions
    await channel.setOptions({ params: { rewind: '1' } });

    client.close();
    expect(capturedAttachMsgs.length).to.equal(2);

    // First ATTACH: ATTACH_RESUME should NOT be set
    const firstFlags = capturedAttachMsgs[0].flags || 0;
    expect(firstFlags & ATTACH_RESUME).to.equal(0);

    // Second ATTACH (reattach): ATTACH_RESUME should be set
    const secondFlags = capturedAttachMsgs[1].flags || 0;
    expect(secondFlags & ATTACH_RESUME).to.not.equal(0);
  });
});
