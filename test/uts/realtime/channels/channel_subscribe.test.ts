/**
 * UTS: Channel Subscribe Tests
 *
 * Spec points: RTL7a, RTL7b, RTL7f, RTL7g, RTL7h, RTL8a, RTL8b, RTL8c, RTL17
 * Source: uts/test/realtime/unit/channels/channel_subscribe_test.md
 *
 * Tests message subscription, name filtering, implicit attach,
 * echoMessages, and unsubscribe patterns.
 */

import { expect } from 'chai';
import { MockWebSocket } from '../../mock_websocket';
import { Ably, installMockWebSocket, restoreAll, trackClient } from '../../helpers';

describe('uts/realtime/channels/channel_subscribe', function () {
  afterEach(function () {
    restoreAll();
  });

  /**
   * RTL7a - Subscribe with no name receives all messages
   */
  it('RTL7a - subscribe receives all messages', async function () {
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

    const channel = client.channels.get('test-RTL7a', { attachOnSubscribe: false });
    await channel.attach();

    const received: any[] = [];
    channel.subscribe((msg: any) => received.push(msg));

    // Send three messages with different names
    mock.active_connection!.send_to_client({
      action: 15, // MESSAGE
      channel: 'test-RTL7a',
      messages: [
        { name: 'msg1', data: 'one' },
        { name: 'msg2', data: 'two' },
        { name: 'msg3', data: 'three' },
      ],
    });

    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(received.length).to.equal(3);
    expect(received[0].name).to.equal('msg1');
    expect(received[1].name).to.equal('msg2');
    expect(received[2].name).to.equal('msg3');
    client.close();
  });

  /**
   * RTL7b - Subscribe with name only receives matching messages
   */
  it('RTL7b - name-filtered subscribe', async function () {
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

    const channel = client.channels.get('test-RTL7b', { attachOnSubscribe: false });
    await channel.attach();

    const received: any[] = [];
    channel.subscribe('target', (msg: any) => received.push(msg));

    mock.active_connection!.send_to_client({
      action: 15, // MESSAGE
      channel: 'test-RTL7b',
      messages: [
        { name: 'other', data: 'skip' },
        { name: 'target', data: 'match' },
        { name: 'another', data: 'skip' },
      ],
    });

    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(received.length).to.equal(1);
    expect(received[0].name).to.equal('target');
    expect(received[0].data).to.equal('match');
    client.close();
  });

  /**
   * RTL7g - Subscribe triggers implicit attach
   */
  it('RTL7g - subscribe triggers implicit attach', async function () {
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

    const channel = client.channels.get('test-RTL7g');
    expect(channel.state).to.equal('initialized');

    // Subscribe triggers implicit attach (attachOnSubscribe defaults to true)
    channel.subscribe((msg: any) => {});

    // Wait for implicit attach to complete
    await new Promise<void>((resolve) => {
      if (channel.state === 'attached') return resolve();
      channel.once('attached', () => resolve());
    });

    expect(channel.state).to.equal('attached');
    expect(attachCount).to.equal(1);
    client.close();
  });

  /**
   * RTL7h - Subscribe does not attach when attachOnSubscribe is false
   */
  it('RTL7h - subscribe without attach when attachOnSubscribe false', async function () {
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

    const channel = client.channels.get('test-RTL7h', { attachOnSubscribe: false });
    expect(channel.state).to.equal('initialized');

    channel.subscribe((msg: any) => {});
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(channel.state).to.equal('initialized');
    expect(attachCount).to.equal(0);
    client.close();
  });

  /**
   * RTL7g - Subscribe does not re-attach when already attached
   */
  it('RTL7g - subscribe does not re-attach when already attached', async function () {
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

    const channel = client.channels.get('test-RTL7g-nodup');
    await channel.attach();
    expect(attachCount).to.equal(1);

    channel.subscribe((msg: any) => {});
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(attachCount).to.equal(1);
    client.close();
  });

  /**
   * RTL7f - echoMessages=false sends echo=false in connection URL
   *
   * UTS spec error: The UTS spec tests client-side echo suppression by
   * sending a MESSAGE with matching connectionId and asserting it's not
   * delivered. However, the features spec (RTL7f) only says "ensuring
   * published messages are not echoed back" — it does not specify client-side
   * vs server-side mechanism. ably-js uses server-side suppression via
   * echo=false URL parameter. Test verifies the parameter is set.
   */
  it('RTL7f - echoMessages false sets echo param in URL', async function () {
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
      echoMessages: false,
    });
    trackClient(client);

    client.connect();
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    // Check the WebSocket URL has echo=false
    const connUrl = mock.active_connection!.url;
    expect(connUrl.searchParams.get('echo')).to.equal('false');
    client.close();
  });

  /**
   * RTL8a - Unsubscribe specific listener
   */
  it('RTL8a - unsubscribe specific listener', async function () {
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

    const channel = client.channels.get('test-RTL8a', { attachOnSubscribe: false });
    await channel.attach();

    const received1: any[] = [];
    const received2: any[] = [];
    const listener1 = (msg: any) => received1.push(msg);
    const listener2 = (msg: any) => received2.push(msg);

    channel.subscribe(listener1);
    channel.subscribe(listener2);

    // First message — both listeners get it
    mock.active_connection!.send_to_client({
      action: 15,
      channel: 'test-RTL8a',
      messages: [{ name: 'msg1', data: 'first' }],
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    // Unsubscribe listener1
    channel.unsubscribe(listener1);

    // Second message — only listener2 gets it
    mock.active_connection!.send_to_client({
      action: 15,
      channel: 'test-RTL8a',
      messages: [{ name: 'msg2', data: 'second' }],
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(received1.length).to.equal(1);
    expect(received2.length).to.equal(2);
    client.close();
  });

  /**
   * RTL8b - Unsubscribe listener from specific name
   */
  it('RTL8b - unsubscribe from specific name', async function () {
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

    const channel = client.channels.get('test-RTL8b', { attachOnSubscribe: false });
    await channel.attach();

    const received: any[] = [];
    const listener = (msg: any) => received.push(msg);

    channel.subscribe('alpha', listener);
    channel.subscribe('beta', listener);

    // First batch
    mock.active_connection!.send_to_client({
      action: 15,
      channel: 'test-RTL8b',
      messages: [
        { name: 'alpha', data: 'a1' },
        { name: 'beta', data: 'b1' },
      ],
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(received.length).to.equal(2);

    // Unsubscribe from 'alpha' only
    channel.unsubscribe('alpha', listener);

    // Second batch
    mock.active_connection!.send_to_client({
      action: 15,
      channel: 'test-RTL8b',
      messages: [
        { name: 'alpha', data: 'a2' },
        { name: 'beta', data: 'b2' },
      ],
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    // Should have received alpha+beta (2) + beta only (1) = 3
    expect(received.length).to.equal(3);
    expect(received[2].name).to.equal('beta');
    client.close();
  });

  /**
   * RTL8c - Unsubscribe with no args removes all listeners
   */
  it('RTL8c - unsubscribe all', async function () {
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

    const channel = client.channels.get('test-RTL8c', { attachOnSubscribe: false });
    await channel.attach();

    const received: any[] = [];
    channel.subscribe((msg: any) => received.push(msg));
    channel.subscribe('named', (msg: any) => received.push(msg));

    // First message
    mock.active_connection!.send_to_client({
      action: 15,
      channel: 'test-RTL8c',
      messages: [{ name: 'named', data: 'first' }],
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    const countBefore = received.length;
    expect(countBefore).to.be.at.least(1);

    // Unsubscribe all
    channel.unsubscribe();

    // Second message
    mock.active_connection!.send_to_client({
      action: 15,
      channel: 'test-RTL8c',
      messages: [{ name: 'named', data: 'second' }],
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(received.length).to.equal(countBefore); // No new messages
    client.close();
  });

  /**
   * RTL17 - Messages not delivered when channel is not ATTACHED
   *
   * Per spec: "No messages should be passed to subscribers if the channel
   * is in any state other than ATTACHED."
   */
  it('RTL17 - messages not delivered when channel is not ATTACHED', async function () {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) {
          // ATTACH — don't respond, leave channel in ATTACHING
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

    const channel = client.channels.get('test-RTL17');
    const received: any[] = [];
    channel.subscribe((msg: any) => {
      received.push(msg);
    });

    // Channel should be in ATTACHING (subscribe triggers implicit attach)
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(channel.state).to.equal('attaching');

    // Send a MESSAGE while channel is ATTACHING
    mock.active_connection!.send_to_client({
      action: 15, // MESSAGE
      channel: 'test-RTL17',
      messages: [{ name: 'premature', data: 'should-not-deliver' }],
    });

    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    // Message should NOT have been delivered
    expect(received.length).to.equal(0);
    client.close();
  });

  /**
   * RTL7a - Subscribe receives multiple messages from a single ProtocolMessage
   */
  it('RTL7a - subscribe receives multiple messages from single ProtocolMessage', async function () {
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

    const channel = client.channels.get('test-RTL7a-multi', { attachOnSubscribe: false });
    await channel.attach();

    const received: any[] = [];
    channel.subscribe((msg: any) => received.push(msg));

    // Server sends a single ProtocolMessage with multiple messages
    mock.active_connection!.send_to_client({
      action: 15, // MESSAGE
      channel: 'test-RTL7a-multi',
      messages: [
        { name: 'batch1', data: 'first' },
        { name: 'batch2', data: 'second' },
        { name: 'batch3', data: 'third' },
      ],
    });

    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(received.length).to.equal(3);
    expect(received[0].name).to.equal('batch1');
    expect(received[1].name).to.equal('batch2');
    expect(received[2].name).to.equal('batch3');
    client.close();
  });

  /**
   * RTL7b - Multiple name-specific subscriptions are independent
   */
  it('RTL7b - multiple name-specific subscriptions are independent', async function () {
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

    const channel = client.channels.get('test-RTL7b-multi', { attachOnSubscribe: false });
    await channel.attach();

    const alphaMessages: any[] = [];
    const betaMessages: any[] = [];

    channel.subscribe('alpha', (msg: any) => alphaMessages.push(msg));
    channel.subscribe('beta', (msg: any) => betaMessages.push(msg));

    mock.active_connection!.send_to_client({
      action: 15, // MESSAGE
      channel: 'test-RTL7b-multi',
      messages: [
        { name: 'alpha', data: 'a1' },
        { name: 'beta', data: 'b1' },
        { name: 'alpha', data: 'a2' },
        { name: 'gamma', data: 'g1' },
      ],
    });

    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(alphaMessages.length).to.equal(2);
    expect(alphaMessages[0].data).to.equal('a1');
    expect(alphaMessages[1].data).to.equal('a2');

    expect(betaMessages.length).to.equal(1);
    expect(betaMessages[0].data).to.equal('b1');
    client.close();
  });

  /**
   * RTL7g - Subscribe triggers implicit attach from DETACHED state
   */
  it('RTL7g - subscribe triggers implicit attach from DETACHED state', async function () {
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

    const channel = client.channels.get('test-RTL7g-detached');
    await channel.attach();
    await channel.detach();
    expect(channel.state).to.equal('detached');
    expect(attachCount).to.equal(1);

    // Subscribe should trigger implicit attach from DETACHED
    channel.subscribe((msg: any) => {});

    await new Promise<void>((resolve) => {
      if (channel.state === 'attached') return resolve();
      channel.once('attached', () => resolve());
    });

    expect(channel.state).to.equal('attached');
    expect(attachCount).to.equal(2);
    client.close();
  });

  /**
   * RTL7g - Listener registered even if implicit attach fails
   */
  it('RTL7g - listener registered even if implicit attach fails', async function () {
    let attachAttempts = 0;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) {
          // ATTACH
          attachAttempts++;
          if (attachAttempts === 1) {
            // First attach fails with channel error
            mock.active_connection!.send_to_client({
              action: 9, // ERROR
              channel: msg.channel,
              error: { code: 40160, statusCode: 401, message: 'Not permitted' },
            });
          } else {
            // Subsequent attaches succeed
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

    const channel = client.channels.get('test-RTL7g-fail');

    const received: any[] = [];
    channel.subscribe((msg: any) => received.push(msg));

    // Wait for channel to enter FAILED from the rejected attach
    await new Promise<void>((resolve) => {
      if (channel.state === 'failed') return resolve();
      channel.once('failed', () => resolve());
    });
    expect(channel.state).to.equal('failed');

    // Re-attach the channel (second attempt will succeed)
    await channel.attach();
    expect(channel.state).to.equal('attached');

    // Verify the listener was registered despite the failed attach
    mock.active_connection!.send_to_client({
      action: 15, // MESSAGE
      channel: 'test-RTL7g-fail',
      messages: [{ name: 'test', data: 'after-reattach' }],
    });

    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(received.length).to.equal(1);
    expect(received[0].data).to.equal('after-reattach');
    client.close();
  });

  /**
   * RTL7g - Subscribe does not attach when already attaching
   */
  it('RTL7g - subscribe does not attach when already attaching', async function () {
    let attachCount = 0;

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg) => {
        if (msg.action === 10) {
          // ATTACH — don't respond, leave channel in ATTACHING
          attachCount++;
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

    const channel = client.channels.get('test-RTL7g-attaching');

    // Start attach but don't complete it
    channel.attach();
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(channel.state).to.equal('attaching');
    expect(attachCount).to.equal(1);

    // Subscribe while attaching — should not trigger another attach
    channel.subscribe((msg: any) => {});
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(channel.state).to.equal('attaching');
    expect(attachCount).to.equal(1); // No additional ATTACH message sent
    client.close();
  });

  /**
   * RTL7f - echoMessages=false sets echo=false in connection URL
   *
   * ably-js delegates echo suppression to the server via the echo=false
   * URL parameter. It does NOT filter messages client-side by connectionId.
   * This test verifies the URL parameter is set correctly.
   */
  it('RTL7f - echoMessages false sets echo param in URL', async function () {
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
      echoMessages: false,
    });
    trackClient(client);

    client.connect();
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    // Verify the echo=false parameter is set in the URL
    const connUrl = mock.active_connection!.url;
    expect(connUrl.searchParams.get('echo')).to.equal('false');
    client.close();
  });

  /**
   * RTL8a - Unsubscribe listener not currently subscribed is no-op
   */
  it('RTL8a - unsubscribe non-subscribed listener is no-op', async function () {
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

    const channel = client.channels.get('test-RTL8a-noop', { attachOnSubscribe: false });
    await channel.attach();

    const received: any[] = [];
    const activeListener = (msg: any) => received.push(msg);
    const unusedListener = (msg: any) => {};

    channel.subscribe(activeListener);

    // Unsubscribe a listener that was never subscribed — should be no-op
    channel.unsubscribe(unusedListener);

    mock.active_connection!.send_to_client({
      action: 15, // MESSAGE
      channel: 'test-RTL8a-noop',
      messages: [{ name: 'test', data: 'still-works' }],
    });

    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    // Existing subscription should be unaffected
    expect(received.length).to.equal(1);
    expect(received[0].data).to.equal('still-works');
    client.close();
  });
});
