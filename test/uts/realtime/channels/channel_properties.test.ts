/**
 * UTS: Channel Properties Tests
 *
 * Spec points: RTL15a, RTL15b, RTL15b1
 * Source: uts/test/realtime/unit/channels/channel_properties_test.md
 *
 * Tests channel properties: attachSerial and channelSerial tracking,
 * update from protocol messages, and clearing on state transitions.
 */

import { expect } from 'chai';
import { MockWebSocket } from '../../mock_websocket';
import { Ably, installMockWebSocket, enableFakeTimers, restoreAll, trackClient, flushAsync } from '../../helpers';

describe('uts/realtime/channels/channel_properties', function () {
  afterEach(function () {
    restoreAll();
  });

  /**
   * RTL15a - attachSerial updated from ATTACHED message
   */
  it('RTL15a - attachSerial from ATTACHED', async function () {
    let attachCount = 0;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) {
          // ATTACH
          attachCount++;
          mock.active_connection!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            channelSerial: `attach-serial-${attachCount}`,
            flags: 0,
          });
        }
        if (msg.action === 12) {
          // DETACH
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

    const channel = client.channels.get('test-RTL15a');
    // Before connect — attachSerial should be null
    expect(channel.properties.attachSerial).to.satisfy((v: any) => !v);

    client.connect();
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    await channel.attach();
    expect(channel.properties.attachSerial).to.equal('attach-serial-1');

    await channel.detach();
    await channel.attach();
    expect(channel.properties.attachSerial).to.equal('attach-serial-2');
    client.close();
  });

  /**
   * RTL15a - attachSerial updated on server-initiated reattach
   */
  it('RTL15a - attachSerial updated on additional ATTACHED', async function () {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) {
          // ATTACH
          mock.active_connection!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            channelSerial: 'initial-serial',
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

    const channel = client.channels.get('test-RTL15a-update');
    await channel.attach();
    expect(channel.properties.attachSerial).to.equal('initial-serial');

    // Server sends unsolicited ATTACHED with new serial
    mock.active_connection!.send_to_client({
      action: 11, // ATTACHED
      channel: 'test-RTL15a-update',
      channelSerial: 'updated-serial',
      flags: 0,
    });
    await flushAsync();

    expect(channel.properties.attachSerial).to.equal('updated-serial');
    client.close();
  });

  /**
   * RTL15b - channelSerial updated from ATTACHED message
   */
  it('RTL15b - channelSerial from ATTACHED', async function () {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) {
          // ATTACH
          mock.active_connection!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            channelSerial: 'serial-001',
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

    const channel = client.channels.get('test-RTL15b');
    expect(channel.properties.channelSerial).to.satisfy((v: any) => !v);

    client.connect();
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    await channel.attach();
    expect(channel.properties.channelSerial).to.equal('serial-001');
    client.close();
  });

  /**
   * RTL15b - channelSerial updated from MESSAGE and PRESENCE actions
   */
  it('RTL15b - channelSerial updated from MESSAGE', async function () {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) {
          // ATTACH
          mock.active_connection!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            channelSerial: 'serial-001',
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

    const channel = client.channels.get('test-RTL15b-msg', { attachOnSubscribe: false });
    await channel.attach();
    expect(channel.properties.channelSerial).to.equal('serial-001');

    // MESSAGE with channelSerial updates it
    mock.active_connection!.send_to_client({
      action: 15, // MESSAGE
      channel: 'test-RTL15b-msg',
      channelSerial: 'serial-002',
      messages: [{ name: 'test', data: 'data' }],
    });
    await flushAsync();
    expect(channel.properties.channelSerial).to.equal('serial-002');
    client.close();
  });

  /**
   * RTL15b1 - channelSerial cleared on DETACHED state
   */
  it('RTL15b1 - channelSerial cleared on detach', async function () {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) {
          // ATTACH
          mock.active_connection!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            channelSerial: 'serial-001',
            flags: 0,
          });
        }
        if (msg.action === 12) {
          // DETACH
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

    const channel = client.channels.get('test-RTL15b1-detach');
    await channel.attach();
    expect(channel.properties.channelSerial).to.equal('serial-001');

    await channel.detach();
    expect(channel.state).to.equal('detached');
    expect(channel.properties.channelSerial).to.satisfy((v: any) => !v);
    client.close();
  });

  /**
   * RTL15b1 - channelSerial cleared on FAILED state
   */
  it('RTL15b1 - channelSerial cleared on failed', async function () {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) {
          // ATTACH
          mock.active_connection!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            channelSerial: 'serial-001',
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

    const channel = client.channels.get('test-RTL15b1-failed');
    await channel.attach();
    expect(channel.properties.channelSerial).to.equal('serial-001');

    // Send channel ERROR → FAILED
    mock.active_connection!.send_to_client({
      action: 9, // ERROR
      channel: 'test-RTL15b1-failed',
      error: { message: 'Error', code: 90001, statusCode: 500 },
    });
    await new Promise<void>((resolve) => channel.once('failed', resolve));

    expect(channel.state).to.equal('failed');
    expect(channel.properties.channelSerial).to.satisfy((v: any) => !v);
    client.close();
  });

  /**
   * RTL15b1 - channelSerial cleared on SUSPENDED state
   */
  it('RTL15b1 - channelSerial cleared on suspended', async function () {
    let attachCount = 0;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) {
          // ATTACH
          attachCount++;
          if (attachCount === 1) {
            mock.active_connection!.send_to_client({
              action: 11, // ATTACHED
              channel: msg.channel,
              channelSerial: 'serial-001',
              flags: 0,
            });
          }
          // Don't respond to second ATTACH — let it timeout
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
      await flushAsync();
    }

    const channel = client.channels.get('test-RTL15b1-suspended');
    await channel.attach();
    expect(channel.properties.channelSerial).to.equal('serial-001');

    // Server sends DETACHED (triggers reattach attempt)
    mock.active_connection!.send_to_client({
      action: 13, // DETACHED
      channel: 'test-RTL15b1-suspended',
      error: { message: 'Server detach', code: 90001, statusCode: 500 },
    });

    // Pump and advance past timeout to reach suspended
    for (let i = 0; i < 10; i++) {
      clock.tick(0);
      await flushAsync();
    }
    await clock.tickAsync(150);

    expect(channel.state).to.equal('suspended');
    expect(channel.properties.channelSerial).to.satisfy((v: any) => !v);
    client.close();
  });

  /**
   * RTL15b - channelSerial not updated when field is not populated
   *
   * Receiving a MESSAGE without a channelSerial should not clear or change
   * the existing channelSerial.
   */
  it('RTL15b - channelSerial unchanged when not in message', async function () {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) {
          // ATTACH
          mock.active_connection!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            channelSerial: 'serial-001',
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

    const channel = client.channels.get('test-RTL15b-noupdate', { attachOnSubscribe: false });
    await channel.attach();
    expect(channel.properties.channelSerial).to.equal('serial-001');

    // Server sends MESSAGE without channelSerial
    mock.active_connection!.send_to_client({
      action: 15, // MESSAGE
      channel: 'test-RTL15b-noupdate',
      messages: [{ name: 'event', data: 'data' }],
    });

    await flushAsync();

    // channelSerial should remain unchanged
    expect(channel.properties.channelSerial).to.equal('serial-001');
    client.close();
  });

  /**
   * RTL15b - channelSerial not updated from irrelevant actions
   *
   * Receiving a protocol message with a different action (e.g. DETACHED)
   * should not update channelSerial even if the message contains a
   * channelSerial field. A server-initiated DETACHED triggers reattach
   * (RTL13a), so we verify the final channelSerial comes from the new
   * ATTACHED, not from the DETACHED message.
   */
  it('RTL15b - channelSerial not from irrelevant actions', async function () {
    let attachCount = 0;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) {
          // ATTACH
          attachCount++;
          mock.active_connection!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            channelSerial: 'serial-001',
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

    const channel = client.channels.get('test-RTL15b-irrelevant');
    await channel.attach();
    expect(channel.properties.channelSerial).to.equal('serial-001');

    // Server sends DETACHED with a channelSerial field (triggers RTL13a reattach)
    mock.active_connection!.send_to_client({
      action: 13, // DETACHED
      channel: 'test-RTL15b-irrelevant',
      channelSerial: 'serial-should-not-apply',
      error: { code: 90198, statusCode: 500, message: 'Detached' },
    });

    // Wait for the reattach to complete
    await new Promise<void>((resolve) => {
      const check = () => {
        if (channel.state === 'attached' && attachCount >= 2) return resolve();
        channel.once('attached', check);
      };
      check();
    });

    // channelSerial should be from the new ATTACHED, not from the DETACHED
    expect(attachCount).to.equal(2);
    expect(channel.properties.channelSerial).to.equal('serial-001');
    client.close();
  });
});
