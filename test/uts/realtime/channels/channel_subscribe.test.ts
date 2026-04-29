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
        if (msg.action === 10) { // ATTACH
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
        if (msg.action === 10) { // ATTACH
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
        if (msg.action === 10) { // ATTACH
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
      action: 15, channel: 'test-RTL8a',
      messages: [{ name: 'msg1', data: 'first' }],
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    // Unsubscribe listener1
    channel.unsubscribe(listener1);

    // Second message — only listener2 gets it
    mock.active_connection!.send_to_client({
      action: 15, channel: 'test-RTL8a',
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
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    const channel = client.channels.get('test-RTL8b', { attachOnSubscribe: false });
    await channel.attach();

    const received: any[] = [];
    const listener = (msg: any) => received.push(msg);

    channel.subscribe('alpha', listener);
    channel.subscribe('beta', listener);

    // First batch
    mock.active_connection!.send_to_client({
      action: 15, channel: 'test-RTL8b',
      messages: [{ name: 'alpha', data: 'a1' }, { name: 'beta', data: 'b1' }],
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(received.length).to.equal(2);

    // Unsubscribe from 'alpha' only
    channel.unsubscribe('alpha', listener);

    // Second batch
    mock.active_connection!.send_to_client({
      action: 15, channel: 'test-RTL8b',
      messages: [{ name: 'alpha', data: 'a2' }, { name: 'beta', data: 'b2' }],
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
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    const channel = client.channels.get('test-RTL8c', { attachOnSubscribe: false });
    await channel.attach();

    const received: any[] = [];
    channel.subscribe((msg: any) => received.push(msg));
    channel.subscribe('named', (msg: any) => received.push(msg));

    // First message
    mock.active_connection!.send_to_client({
      action: 15, channel: 'test-RTL8c',
      messages: [{ name: 'named', data: 'first' }],
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    const countBefore = received.length;
    expect(countBefore).to.be.at.least(1);

    // Unsubscribe all
    channel.unsubscribe();

    // Second message
    mock.active_connection!.send_to_client({
      action: 15, channel: 'test-RTL8c',
      messages: [{ name: 'named', data: 'second' }],
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(received.length).to.equal(countBefore); // No new messages
    client.close();
  });
});
