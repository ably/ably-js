/**
 * UTS: Channel Error Tests
 *
 * Spec points: RTL14
 * Source: uts/test/realtime/unit/channels/channel_error_test.md
 *
 * Tests channel-scoped ERROR protocol messages: transitions to FAILED,
 * errorReason population, isolation between channels.
 */

import { expect } from 'chai';
import { MockWebSocket } from '../../mock_websocket';
import { Ably, installMockWebSocket, restoreAll, trackClient } from '../../helpers';

describe('uts/realtime/channels/channel_error', function () {
  afterEach(function () {
    restoreAll();
  });

  /**
   * RTL14 - Channel ERROR transitions ATTACHED channel to FAILED
   */
  it('RTL14 - channel ERROR on attached channel', async function () {
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

    const channel = client.channels.get('test-RTL14-attached');
    await channel.attach();
    expect(channel.state).to.equal('attached');

    const stateChanges: any[] = [];
    channel.on((change: any) => stateChanges.push(change));

    // Server sends channel-scoped ERROR
    mock.active_connection!.send_to_client({
      action: 9, // ERROR
      channel: 'test-RTL14-attached',
      error: {
        message: 'Channel error',
        code: 40160,
        statusCode: 401,
      },
    });

    await new Promise<void>((resolve) => channel.once('failed', resolve));

    expect(channel.state).to.equal('failed');
    expect(channel.errorReason).to.not.be.null;
    expect(channel.errorReason!.code).to.equal(40160);
    expect(stateChanges.some((c: any) => c.current === 'failed')).to.be.true;
    // Connection should remain connected
    expect(client.connection.state).to.equal('connected');
    client.close();
  });

  /**
   * RTL14 - Channel ERROR transitions ATTACHING channel to FAILED
   */
  it('RTL14 - channel ERROR on attaching channel', async function () {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) {
          // ATTACH
          // Respond with channel-scoped ERROR instead of ATTACHED
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

    const channel = client.channels.get('test-RTL14-attaching');

    try {
      await channel.attach();
      expect.fail('Expected attach to fail');
    } catch (err: any) {
      expect(err.code).to.equal(40160);
    }

    expect(channel.state).to.equal('failed');
    expect(channel.errorReason).to.not.be.null;
    expect(channel.errorReason!.code).to.equal(40160);
    // Connection should remain connected
    expect(client.connection.state).to.equal('connected');
    client.close();
  });

  /**
   * RTL14 - Channel ERROR does not affect other channels
   */
  it('RTL14 - channel ERROR isolated to target channel', async function () {
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

    const channelA = client.channels.get('test-RTL14-chanA');
    const channelB = client.channels.get('test-RTL14-chanB');
    await channelA.attach();
    await channelB.attach();

    // Send ERROR only for channel A
    mock.active_connection!.send_to_client({
      action: 9, // ERROR
      channel: 'test-RTL14-chanA',
      error: {
        message: 'Channel A error',
        code: 40160,
        statusCode: 401,
      },
    });

    await new Promise<void>((resolve) => channelA.once('failed', resolve));

    expect(channelA.state).to.equal('failed');
    expect(channelA.errorReason!.code).to.equal(40160);
    // Channel B should be unaffected
    expect(channelB.state).to.equal('attached');
    // Connection should remain connected
    expect(client.connection.state).to.equal('connected');
    client.close();
  });

  /**
   * RTL14 - Channel ERROR completes pending detach with error
   */
  it('RTL14 - channel ERROR during detach', async function () {
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
            flags: 0,
          });
        }
        if (msg.action === 12) {
          // DETACH
          // Respond with ERROR instead of DETACHED
          mock.active_connection!.send_to_client({
            action: 9, // ERROR
            channel: msg.channel,
            error: {
              message: 'Detach denied',
              code: 90198,
              statusCode: 500,
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

    const channel = client.channels.get('test-RTL14-detach-error');
    await channel.attach();

    try {
      await channel.detach();
      expect.fail('Expected detach to fail');
    } catch (err: any) {
      expect(err).to.not.be.null;
    }

    // Channel should be FAILED (not DETACHED)
    expect(channel.state).to.equal('failed');
    expect(channel.errorReason).to.not.be.null;
    expect(channel.errorReason!.code).to.equal(90198);
    // Connection should remain connected
    expect(client.connection.state).to.equal('connected');
    client.close();
  });
});
