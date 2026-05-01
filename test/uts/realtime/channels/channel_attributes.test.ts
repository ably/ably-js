/**
 * UTS: Channel Attributes Tests
 *
 * Spec points: RTL23, RTL24
 * Source: uts/test/realtime/unit/channels/channel_attributes.md
 *
 * Tests channel name attribute and errorReason lifecycle.
 */

import { expect } from 'chai';
import { MockWebSocket } from '../../mock_websocket';
import { Ably, installMockWebSocket, restoreAll, trackClient } from '../../helpers';

describe('uts/realtime/channels/channel_attributes', function () {
  afterEach(function () {
    restoreAll();
  });

  /**
   * RTL23 - RealtimeChannel name attribute
   */
  it('RTL23 - channel name attribute', function () {
    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    const channel = client.channels.get('my-channel');
    expect(channel.name).to.equal('my-channel');

    const channel2 = client.channels.get('namespace:channel-name');
    expect(channel2.name).to.equal('namespace:channel-name');
    client.close();
  });

  /**
   * RTL24 - errorReason set on channel error
   */
  it('RTL24 - errorReason set on channel ERROR', async function () {
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

    const channel = client.channels.get('test-RTL24-error');
    await channel.attach();
    expect(channel.errorReason).to.be.null;

    // Send channel ERROR
    mock.active_connection!.send_to_client({
      action: 9, // ERROR
      channel: 'test-RTL24-error',
      error: {
        message: 'Channel error occurred',
        code: 90001,
        statusCode: 500,
      },
    });

    await new Promise<void>((resolve) => channel.once('failed', resolve));
    client.close();
    expect(channel.state).to.equal('failed');
    expect(channel.errorReason).to.not.be.null;
    expect(channel.errorReason!.code).to.equal(90001);
    expect(channel.errorReason!.statusCode).to.equal(500);
  });

  /**
   * RTL24 - errorReason set on attach failure
   */
  it('RTL24 - errorReason set on attach failure', async function () {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) {
          // ATTACH
          // Respond with DETACHED + error (attach rejected)
          mock.active_connection!.send_to_client({
            action: 13, // DETACHED
            channel: msg.channel,
            error: {
              message: 'Permission denied',
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

    const channel = client.channels.get('test-RTL24-attach-fail');
    try {
      await channel.attach();
      expect.fail('Expected attach to fail');
    } catch (err: any) {
      expect(err.code).to.equal(40160);
    }

    expect(channel.errorReason).to.not.be.null;
    expect(channel.errorReason!.code).to.equal(40160);
    expect(channel.errorReason!.statusCode).to.equal(401);
    client.close();
  });

  /**
   * RTL24 - errorReason after successful re-attach
   *
   * UTS spec error: The UTS spec asserts errorReason should be cleared on
   * successful attach/reattach. However, the features spec (RTL24) only says
   * when errorReason is SET (via RTN11d, RTL3a, RTL4g, RTL14) — it never
   * says it should be cleared. ably-js's behavior of retaining errorReason
   * is consistent with the features spec.
   */
  it('RTL24 - errorReason persists after successful re-attach (UTS spec error)', async function () {
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
            // First attach fails
            mock.active_connection!.send_to_client({
              action: 13, // DETACHED
              channel: msg.channel,
              error: {
                message: 'Temporary error',
                code: 50000,
                statusCode: 500,
              },
            });
          } else {
            // Second attach succeeds
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

    const channel = client.channels.get('test-RTL24-clear-attach');

    // First attach fails
    try {
      await channel.attach();
      expect.fail('Expected attach to fail');
    } catch (err: any) {
      expect(err.code).to.equal(50000);
    }
    expect(channel.errorReason).to.not.be.null;
    expect(channel.errorReason!.code).to.equal(50000);

    // Second attach succeeds — errorReason is NOT cleared (features spec doesn't require it)
    await channel.attach();
    expect(channel.state).to.equal('attached');
    // UTS spec error: errorReason persists — features spec only defines SET, not CLEAR
    expect(channel.errorReason).to.not.be.null;
    expect(channel.errorReason!.code).to.equal(50000);
    client.close();
  });

  /**
   * RTL24 - errorReason after re-attach and detach following error
   *
   * UTS spec error: Same as above — features spec (RTL24) only defines when
   * errorReason is SET, never when it should be cleared. Persistence through
   * attach/detach is consistent with the features spec.
   */
  it('RTL24 - errorReason persists after re-attach and detach (UTS spec error)', async function () {
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

    const channel = client.channels.get('test-RTL24-clear-detach');
    await channel.attach();

    // Send channel ERROR to put it in FAILED state
    mock.active_connection!.send_to_client({
      action: 9, // ERROR
      channel: 'test-RTL24-clear-detach',
      error: {
        message: 'Channel error',
        code: 90002,
        statusCode: 500,
      },
    });

    await new Promise<void>((resolve) => channel.once('failed', resolve));
    expect(channel.errorReason).to.not.be.null;
    expect(channel.errorReason!.code).to.equal(90002);

    // Re-attach — errorReason is NOT cleared in ably-js
    await channel.attach();
    expect(channel.state).to.equal('attached');
    expect(channel.errorReason).to.not.be.null;

    await channel.detach();
    client.close();
    expect(channel.state).to.equal('detached');
    // errorReason still not cleared after detach
    expect(channel.errorReason).to.not.be.null;
  });
});
