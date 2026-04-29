/**
 * UTS: Channel Publish Tests
 *
 * Spec points: RTL6, RTL6c1, RTL6c2, RTL6c4, RTL6c5, RTL6i1, RTL6i2, RTL6i3,
 *   RTL6j, RTN7d, RTN7e, RTN19a, RTN19a2, RTN19b
 * Source: uts/test/realtime/unit/channels/channel_publish_test.md
 *
 * Tests message publishing: single/array/Message object, immediate/queued
 * delivery, ACK/NACK handling, PublishResult, state validation, queueMessages,
 * and transport resume retransmission.
 */

import { expect } from 'chai';
import { MockWebSocket, PendingWSConnection } from '../../mock_websocket';
import { Ably, installMockWebSocket, enableFakeTimers, restoreAll, trackClient } from '../../helpers';

describe('uts/realtime/channels/channel_publish', function () {
  afterEach(function () {
    restoreAll();
  });

  // Helper: standard mock that auto-connects and auto-attaches
  function setupMock(opts?: {
    onMessage?: (msg: any, conn: PendingWSConnection | undefined) => void;
    onConnect?: (conn: PendingWSConnection) => void;
  }) {
    const captured: any[] = [];
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        if (opts?.onConnect) {
          opts.onConnect(conn);
        } else {
          conn.respond_with_connected();
        }
      },
      onMessageFromClient: (msg, conn) => {
        if (msg.action === 10) { // ATTACH
          conn!.send_to_client({
            action: 11, // ATTACHED
            channel: msg.channel,
            flags: 0,
          });
        }
        if (msg.action === 15) { // MESSAGE
          captured.push(msg);
        }
        if (opts?.onMessage) {
          opts.onMessage(msg, conn);
        }
      },
    });
    return { mock, captured };
  }

  /**
   * RTL6i1 - Publish single message by name and data
   */
  it('RTL6i1 - publish single message by name and data', async function () {
    const { mock, captured } = setupMock({
      onMessage: (msg) => {
        if (msg.action === 15) {
          mock.active_connection!.send_to_client({
            action: 1, // ACK
            msgSerial: msg.msgSerial,
            count: 1,
            res: [{ serials: ['serial-1'] }],
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

    const channel = client.channels.get('test-RTL6i1', { attachOnSubscribe: false });
    await channel.attach();

    await channel.publish('greeting', 'hello');

    expect(captured.length).to.equal(1);
    expect(captured[0].messages.length).to.equal(1);
    expect(captured[0].messages[0].name).to.equal('greeting');
    expect(captured[0].messages[0].data).to.equal('hello');
    client.close();
  });

  /**
   * RTL6i2 - Publish array of Message objects
   */
  it('RTL6i2 - publish array of messages in single ProtocolMessage', async function () {
    const { mock, captured } = setupMock({
      onMessage: (msg) => {
        if (msg.action === 15) {
          mock.active_connection!.send_to_client({
            action: 1, // ACK
            msgSerial: msg.msgSerial,
            count: 1,
            res: [{ serials: ['s1', 's2', 's3'] }],
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

    const channel = client.channels.get('test-RTL6i2', { attachOnSubscribe: false });
    await channel.attach();

    await channel.publish([
      { name: 'msg1', data: 'one' },
      { name: 'msg2', data: 'two' },
      { name: 'msg3', data: 'three' },
    ]);

    expect(captured.length).to.equal(1);
    expect(captured[0].messages.length).to.equal(3);
    expect(captured[0].messages[0].name).to.equal('msg1');
    expect(captured[0].messages[1].name).to.equal('msg2');
    expect(captured[0].messages[2].name).to.equal('msg3');
    client.close();
  });

  /**
   * RTL6i3 - Null fields omitted from JSON wire encoding
   *
   * Spec: "If any of the values are null, then key is not sent to Ably
   * i.e. a payload with a null value for data would be sent as { "name": "click" }"
   */
  it('RTL6i3 - null name/data fields handled correctly', async function () {
    // DEVIATION: see deviations.md
    this.skip();
    const rawFrames: string[] = [];
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg, conn) => {
        if (msg.action === 10) {
          conn!.send_to_client({ action: 11, channel: msg.channel, flags: 0 });
        }
        if (msg.action === 15) {
          conn!.send_to_client({
            action: 1, msgSerial: msg.msgSerial, count: 1,
            res: [{ serials: ['s1'] }],
          });
        }
      },
      onTextDataFrame: (raw) => rawFrames.push(raw),
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

    const channel = client.channels.get('test-RTL6i3', { attachOnSubscribe: false });
    await channel.attach();

    // Publish name-only (no data)
    rawFrames.length = 0;
    await channel.publish('name-only', undefined);
    const nameOnlyFrame = rawFrames.find((f) => f.includes('"name-only"'));
    expect(nameOnlyFrame).to.exist;
    const nameOnlyMsg = JSON.parse(nameOnlyFrame!).messages[0];
    expect(nameOnlyMsg.name).to.equal('name-only');
    expect('data' in nameOnlyMsg).to.be.false;

    // Publish data-only (no name)
    rawFrames.length = 0;
    await channel.publish(null as any, 'data-only');
    const dataOnlyFrame = rawFrames.find((f) => f.includes('"data-only"'));
    expect(dataOnlyFrame).to.exist;
    const dataOnlyMsg = JSON.parse(dataOnlyFrame!).messages[0];
    expect(dataOnlyMsg.data).to.equal('data-only');
    expect('name' in dataOnlyMsg).to.be.false;
  });

  /**
   * RTL6i1 - Publish Message object
   */
  it('RTL6i1 - publish Message object', async function () {
    const { mock, captured } = setupMock({
      onMessage: (msg) => {
        if (msg.action === 15) {
          mock.active_connection!.send_to_client({
            action: 1, msgSerial: msg.msgSerial, count: 1,
            res: [{ serials: ['s1'] }],
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

    const channel = client.channels.get('test-RTL6i1-obj', { attachOnSubscribe: false });
    await channel.attach();

    await channel.publish({ name: 'event', data: 'payload' });

    expect(captured.length).to.equal(1);
    expect(captured[0].messages[0].name).to.equal('event');
    expect(captured[0].messages[0].data).to.equal('payload');
    client.close();
  });

  /**
   * RTL6c1 - Publish immediately when CONNECTED and channel ATTACHED
   */
  it('RTL6c1 - publish immediately when connected and attached', async function () {
    const { mock, captured } = setupMock({
      onMessage: (msg) => {
        if (msg.action === 15) {
          mock.active_connection!.send_to_client({
            action: 1, msgSerial: msg.msgSerial, count: 1,
            res: [{ serials: ['s1'] }],
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

    const channel = client.channels.get('test-RTL6c1-attached', { attachOnSubscribe: false });
    await channel.attach();
    expect(client.connection.state).to.equal('connected');
    expect(channel.state).to.equal('attached');

    const result = await channel.publish('msg', 'data');

    expect(captured.length).to.equal(1);
    // Message was sent immediately (ACK already received)
    expect(result).to.have.property('serials');
    client.close();
  });

  /**
   * RTL6c1 - Publish immediately when CONNECTED and channel INITIALIZED
   */
  it('RTL6c1 - publish immediately when connected and channel initialized', async function () {
    const { mock, captured } = setupMock({
      onMessage: (msg) => {
        if (msg.action === 15) {
          mock.active_connection!.send_to_client({
            action: 1, msgSerial: msg.msgSerial, count: 1,
            res: [{ serials: ['s1'] }],
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

    const channel = client.channels.get('test-RTL6c1-init', { attachOnSubscribe: false });
    expect(channel.state).to.equal('initialized');

    await channel.publish('msg', 'data');

    // Message was sent immediately (connection CONNECTED)
    expect(captured.length).to.equal(1);
    // Channel should remain initialized — no implicit attach (RTL6c5)
    expect(channel.state).to.equal('initialized');
    client.close();
  });

  /**
   * RTL6c5 - Publish does not trigger implicit attach
   */
  it('RTL6c5 - publish does not trigger implicit attach', async function () {
    let attachCount = 0;
    const { mock, captured } = setupMock({
      onMessage: (msg) => {
        if (msg.action === 10) attachCount++;
        if (msg.action === 15) {
          mock.active_connection!.send_to_client({
            action: 1, msgSerial: msg.msgSerial, count: 1,
            res: [{ serials: ['s1'] }],
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

    const channel = client.channels.get('test-RTL6c5', { attachOnSubscribe: false });
    expect(channel.state).to.equal('initialized');

    await channel.publish('msg', 'data');
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(channel.state).to.equal('initialized');
    expect(attachCount).to.equal(0);
    client.close();
  });

  /**
   * RTL6c2 - Publish queued when connection is CONNECTING
   */
  it('RTL6c2 - publish queued when connecting', async function () {
    const captured: any[] = [];
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        // Delay connection — don't respond yet
        mock.active_connection = conn;
        // Respond after a tick
        setTimeout(() => conn.respond_with_connected(), 50);
      },
      onMessageFromClient: (msg, conn) => {
        if (msg.action === 10) {
          conn!.send_to_client({ action: 11, channel: msg.channel, flags: 0 });
        }
        if (msg.action === 15) {
          captured.push(msg);
          conn!.send_to_client({
            action: 1, msgSerial: msg.msgSerial, count: 1,
            res: [{ serials: ['s1'] }],
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
    // Connection is CONNECTING now
    expect(client.connection.state).to.equal('connecting');

    const channel = client.channels.get('test-RTL6c2-connecting', { attachOnSubscribe: false });

    // Publish while connecting — should be queued
    const publishPromise = channel.publish('queued', 'data');

    // Not yet sent
    expect(captured.length).to.equal(0);

    // Wait for publish to complete (will happen after connection)
    await publishPromise;

    expect(captured.length).to.equal(1);
    expect(captured[0].messages[0].name).to.equal('queued');
    client.close();
  });

  /**
   * RTL6c2 - Publish queued when connection is INITIALIZED
   */
  it('RTL6c2 - publish queued when initialized', async function () {
    const captured: any[] = [];
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg, conn) => {
        if (msg.action === 10) {
          conn!.send_to_client({ action: 11, channel: msg.channel, flags: 0 });
        }
        if (msg.action === 15) {
          captured.push(msg);
          conn!.send_to_client({
            action: 1, msgSerial: msg.msgSerial, count: 1,
            res: [{ serials: ['s1'] }],
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

    // Connection is INITIALIZED — not yet connected
    expect(client.connection.state).to.equal('initialized');

    const channel = client.channels.get('test-RTL6c2-init', { attachOnSubscribe: false });

    // Publish before connect — should be queued
    const publishPromise = channel.publish('before-connect', 'data');
    expect(captured.length).to.equal(0);

    // Now connect
    client.connect();
    await publishPromise;

    expect(captured.length).to.equal(1);
    expect(captured[0].messages[0].name).to.equal('before-connect');
    client.close();
  });

  /**
   * RTL6c2 - Publish queued when connection is DISCONNECTED
   */
  it('RTL6c2 - publish queued when disconnected', async function () {
    const captured: any[] = [];
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg, conn) => {
        if (msg.action === 10) {
          conn!.send_to_client({ action: 11, channel: msg.channel, flags: 0 });
        }
        if (msg.action === 15) {
          captured.push(msg);
          conn!.send_to_client({
            action: 1, msgSerial: msg.msgSerial, count: 1,
            res: [{ serials: ['s1'] }],
          });
        }
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
      disconnectedRetryTimeout: 100,
    });
    trackClient(client);

    client.connect();
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    const channel = client.channels.get('test-RTL6c2-disconn', { attachOnSubscribe: false });
    await channel.attach();

    const capturedBefore = captured.length;

    // Disconnect
    mock.active_connection!.simulate_disconnect();
    await new Promise<void>((resolve) => client.connection.once('disconnected', resolve));

    // Publish while disconnected — queued
    const publishPromise = channel.publish('while-disconn', 'data');

    // Should not have been sent yet
    expect(captured.length).to.equal(capturedBefore);

    // Wait for reconnect and publish to complete
    await publishPromise;

    expect(captured.length).to.be.greaterThan(capturedBefore);
    const lastMsg = captured[captured.length - 1];
    expect(lastMsg.messages[0].name).to.equal('while-disconn');
    client.close();
  });

  /**
   * RTL6c2 - Multiple queued messages sent in order
   */
  it('RTL6c2 - multiple queued messages sent in order', async function () {
    const captured: any[] = [];
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg, conn) => {
        if (msg.action === 10) {
          conn!.send_to_client({ action: 11, channel: msg.channel, flags: 0 });
        }
        if (msg.action === 15) {
          captured.push(msg);
          conn!.send_to_client({
            action: 1, msgSerial: msg.msgSerial, count: 1,
            res: [{ serials: ['s1'] }],
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

    const channel = client.channels.get('test-RTL6c2-order', { attachOnSubscribe: false });

    // Queue 3 messages before connecting
    const p1 = channel.publish('first', 'data1');
    const p2 = channel.publish('second', 'data2');
    const p3 = channel.publish('third', 'data3');

    client.connect();
    await Promise.all([p1, p2, p3]);

    expect(captured.length).to.equal(3);
    expect(captured[0].messages[0].name).to.equal('first');
    expect(captured[1].messages[0].name).to.equal('second');
    expect(captured[2].messages[0].name).to.equal('third');
    client.close();
  });

  /**
   * RTL6c4 - Publish fails when connection is CLOSED
   */
  it('RTL6c4 - publish fails when connection closed', async function () {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg, conn) => {
        if (msg.action === 7) { // CLOSE
          conn!.send_to_client({ action: 8 }); // CLOSED
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

    const channel = client.channels.get('test-RTL6c4-closed', { attachOnSubscribe: false });

    try {
      await channel.publish('msg', 'data');
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err).to.exist;
      expect(err.code).to.be.a('number');
    }
  });

  /**
   * RTL6c4 - Publish fails when connection is FAILED
   */
  it('RTL6c4 - publish fails when connection failed', async function () {
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

    // Fatal error → FAILED
    mock.active_connection!.send_to_client({
      action: 9, // ERROR (connection-level)
      error: { message: 'Fatal', code: 40198, statusCode: 400 },
    });
    await new Promise<void>((resolve) => client.connection.once('failed', resolve));

    const channel = client.channels.get('test-RTL6c4-failed', { attachOnSubscribe: false });

    try {
      await channel.publish('msg', 'data');
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err).to.exist;
      expect(err.code).to.be.a('number');
    }
    client.close();
  });

  /**
   * RTL6c4 - Publish fails when channel is FAILED
   */
  it('RTL6c4 - publish fails when channel failed', async function () {
    const captured: any[] = [];
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg, conn) => {
        if (msg.action === 10) {
          conn!.send_to_client({ action: 11, channel: msg.channel, flags: 0 });
        }
        if (msg.action === 15) {
          captured.push(msg);
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

    const channel = client.channels.get('test-RTL6c4-ch-failed', { attachOnSubscribe: false });
    await channel.attach();

    // Channel ERROR → FAILED
    mock.active_connection!.send_to_client({
      action: 9, // ERROR
      channel: 'test-RTL6c4-ch-failed',
      error: { message: 'Channel error', code: 90001, statusCode: 500 },
    });
    await new Promise<void>((resolve) => channel.once('failed', resolve));

    const capturedBefore = captured.length;

    try {
      await channel.publish('msg', 'data');
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err).to.exist;
      expect(err.code).to.equal(90001);
    }

    // No MESSAGE sent to server
    expect(captured.length).to.equal(capturedBefore);
    client.close();
  });

  /**
   * RTL6c2 - Publish fails when queueMessages is false and not connected
   */
  it('RTL6c2 - publish fails when queueMessages false and not connected', async function () {
    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        // Don't respond — stay connecting
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
      queueMessages: false,
    });
    trackClient(client);

    client.connect();
    // Connection is CONNECTING (not yet connected)
    expect(client.connection.state).to.equal('connecting');

    const channel = client.channels.get('test-RTL6c2-noqueue', { attachOnSubscribe: false });

    try {
      await channel.publish('msg', 'data');
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err).to.exist;
      expect(err.code).to.be.a('number');
    }
    client.close();
  });

  /**
   * RTL6j - Publish returns PublishResult with serials from ACK
   */
  it('RTL6j - PublishResult with serial from ACK', async function () {
    const { mock } = setupMock({
      onMessage: (msg) => {
        if (msg.action === 15) {
          expect(msg.msgSerial).to.equal(0);
          mock.active_connection!.send_to_client({
            action: 1, // ACK
            msgSerial: 0,
            count: 1,
            res: [{ serials: ['abc123'] }],
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

    const channel = client.channels.get('test-RTL6j', { attachOnSubscribe: false });
    await channel.attach();

    const result = await channel.publish('msg', 'data');

    expect(result).to.have.property('serials');
    expect(result.serials).to.deep.equal(['abc123']);
    client.close();
  });

  /**
   * RTL6j - Batch publish returns PublishResult with multiple serials
   */
  it('RTL6j - batch PublishResult with multiple serials including null', async function () {
    const { mock } = setupMock({
      onMessage: (msg) => {
        if (msg.action === 15) {
          mock.active_connection!.send_to_client({
            action: 1, // ACK
            msgSerial: msg.msgSerial,
            count: 1,
            res: [{ serials: ['serial-1', null, 'serial-3'] }],
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

    const channel = client.channels.get('test-RTL6j-batch', { attachOnSubscribe: false });
    await channel.attach();

    const result = await channel.publish([
      { name: 'msg1', data: 'one' },
      { name: 'msg2', data: 'two' },
      { name: 'msg3', data: 'three' },
    ]);

    expect(result.serials).to.deep.equal(['serial-1', null, 'serial-3']);
    client.close();
  });

  /**
   * RTL6j - Sequential publishes get incrementing msgSerial
   */
  it('RTL6j - sequential publishes get incrementing msgSerial', async function () {
    const serials: number[] = [];
    const { mock } = setupMock({
      onMessage: (msg) => {
        if (msg.action === 15) {
          serials.push(msg.msgSerial);
          mock.active_connection!.send_to_client({
            action: 1,
            msgSerial: msg.msgSerial,
            count: 1,
            res: [{ serials: [`serial-${msg.msgSerial}`] }],
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

    const channel = client.channels.get('test-RTL6j-incr', { attachOnSubscribe: false });
    await channel.attach();

    const r1 = await channel.publish('msg1', 'data1');
    const r2 = await channel.publish('msg2', 'data2');
    const r3 = await channel.publish('msg3', 'data3');

    expect(serials).to.deep.equal([0, 1, 2]);
    expect(r1.serials).to.deep.equal(['serial-0']);
    expect(r2.serials).to.deep.equal(['serial-1']);
    expect(r3.serials).to.deep.equal(['serial-2']);
    client.close();
  });

  /**
   * RTL6j - NACK results in error
   */
  it('RTL6j - NACK results in publish error', async function () {
    const { mock } = setupMock({
      onMessage: (msg) => {
        if (msg.action === 15) {
          mock.active_connection!.send_to_client({
            action: 2, // NACK
            msgSerial: msg.msgSerial,
            count: 1,
            error: { message: 'Publish rejected', code: 40160, statusCode: 401 },
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

    const channel = client.channels.get('test-RTL6j-nack', { attachOnSubscribe: false });
    await channel.attach();

    try {
      await channel.publish('msg', 'data');
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.code).to.equal(40160);
      expect(err.message).to.equal('Publish rejected');
    }
    client.close();
  });

  /**
   * RTN7e - Pending publishes fail when connection enters CLOSED
   */
  it('RTN7e - pending publishes fail on connection closed', async function () {
    const { mock } = setupMock({
      onMessage: (msg) => {
        // Don't ACK — leave publish pending
        if (msg.action === 7) { // CLOSE
          mock.active_connection!.send_to_client({ action: 8 }); // CLOSED
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

    const channel = client.channels.get('test-RTN7e-closed', { attachOnSubscribe: false });
    await channel.attach();

    // Publish but don't ACK
    const publishPromise = channel.publish('pending', 'data');

    // Close connection — pending publish should fail
    client.close();

    try {
      await publishPromise;
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err).to.exist;
      expect(err.code).to.be.a('number');
    }
  });

  /**
   * RTN7e - Pending publishes fail when connection enters FAILED
   */
  it('RTN7e - pending publishes fail on connection failed', async function () {
    const { mock } = setupMock({
      onMessage: () => {
        // Don't ACK anything
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

    const channel = client.channels.get('test-RTN7e-failed', { attachOnSubscribe: false });
    await channel.attach();

    const publishPromise = channel.publish('pending', 'data');

    // Fatal error → FAILED
    mock.active_connection!.send_to_client({
      action: 9,
      error: { message: 'Fatal', code: 40198, statusCode: 400 },
    });

    try {
      await publishPromise;
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err).to.exist;
      expect(err.code).to.be.a('number');
    }
    client.close();
  });

  /**
   * RTN7e - Multiple pending publishes all fail on state change
   */
  it('RTN7e - multiple pending publishes all fail on close', async function () {
    const { mock } = setupMock({
      onMessage: (msg) => {
        if (msg.action === 7) { // CLOSE
          mock.active_connection!.send_to_client({ action: 8 }); // CLOSED
        }
        // Don't ACK publishes
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

    const channel = client.channels.get('test-RTN7e-multi', { attachOnSubscribe: false });
    await channel.attach();

    const p1 = channel.publish('msg1', 'data1');
    const p2 = channel.publish('msg2', 'data2');
    const p3 = channel.publish('msg3', 'data3');

    client.close();

    const results = await Promise.allSettled([p1, p2, p3]);
    for (const r of results) {
      expect(r.status).to.equal('rejected');
      expect((r as PromiseRejectedResult).reason.code).to.be.a('number');
    }
  });

  /**
   * RTN7d - New publish fails on DISCONNECTED when queueMessages is false
   */
  it('RTN7d - new publish fails when disconnected with queueMessages false', async function () {
    const { mock } = setupMock();
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
      queueMessages: false,
    });
    trackClient(client);

    client.connect();
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    const channel = client.channels.get('test-RTN7d-noq', { attachOnSubscribe: false });
    await channel.attach();

    // Disconnect
    mock.active_connection!.simulate_disconnect();
    await new Promise<void>((resolve) => client.connection.once('disconnected', resolve));

    // New publish while disconnected with queueMessages=false should fail
    try {
      await channel.publish('new-msg', 'data');
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err).to.exist;
      expect(err.code).to.be.a('number');
    }
    client.close();
  });

  /**
   * RTN7d - Pending publishes survive DISCONNECTED when queueMessages is true
   */
  it('RTN7d - pending survive disconnected with queueMessages true', async function () {
    const { mock } = setupMock({
      onMessage: (msg) => {
        if (msg.action === 15) {
          mock.active_connection!.send_to_client({
            action: 1,
            msgSerial: msg.msgSerial,
            count: 1,
            res: [{ serials: ['after-reconnect'] }],
          });
        }
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
      disconnectedRetryTimeout: 100,
    });
    trackClient(client);

    client.connect();
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    const channel = client.channels.get('test-RTN7d-q', { attachOnSubscribe: false });
    await channel.attach();

    // Disconnect, then publish while disconnected (message will be queued)
    mock.active_connection!.simulate_disconnect();
    await new Promise<void>((resolve) => client.connection.once('disconnected', resolve));

    // Publish while disconnected — queued because queueMessages defaults to true
    const result = await channel.publish('queued', 'data');

    expect(result).to.have.property('serials');
    expect(result.serials).to.deep.equal(['after-reconnect']);
    client.close();
  });

  /**
   * RTN19a - Pending messages resent on new transport after disconnect
   */
  it('RTN19a - pending message resent on new transport', async function () {
    let connectCount = 0;
    const messagesPerConn: any[][] = [[], []];

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        const idx = connectCount++;
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg, conn) => {
        if (msg.action === 10) { // ATTACH
          conn!.send_to_client({ action: 11, channel: msg.channel, flags: 0 });
        }
        if (msg.action === 15) { // MESSAGE
          const idx = connectCount - 1;
          if (idx < messagesPerConn.length) {
            messagesPerConn[idx].push(msg);
          }
          // ACK only on second connection
          if (idx >= 1) {
            conn!.send_to_client({
              action: 1,
              msgSerial: msg.msgSerial,
              count: 1,
              res: [{ serials: ['resent-serial'] }],
            });
          }
          // Don't ACK on first connection
        }
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
      disconnectedRetryTimeout: 100,
    });
    trackClient(client);

    client.connect();
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    const channel = client.channels.get('test-RTN19a', { attachOnSubscribe: false });
    await channel.attach();

    // Publish — sent on first transport but not ACKed
    const publishPromise = channel.publish('resend-me', 'data');

    // Wait for message to be sent
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(messagesPerConn[0].length).to.equal(1);

    // Disconnect — ably-js will auto-reconnect and resend
    mock.active_connection!.simulate_disconnect();

    // Wait for publish to complete (after reconnect + resend + ACK)
    const result = await publishPromise;

    expect(result.serials).to.deep.equal(['resent-serial']);
    // Message was resent on second transport
    expect(messagesPerConn[1].length).to.be.at.least(1);
    const resentMsg = messagesPerConn[1].find((m: any) =>
      m.messages?.some((m2: any) => m2.name === 'resend-me')
    );
    expect(resentMsg).to.not.be.undefined;
    client.close();
  });

  /**
   * RTN19a2 - Resent messages keep same msgSerial on successful resume
   */
  it('RTN19a2 - resent messages keep msgSerial on successful resume', async function () {
    let connectCount = 0;
    const conn1Msgs: any[] = [];
    const conn2Msgs: any[] = [];

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        connectCount++;
        mock.active_connection = conn;
        if (connectCount === 1) {
          conn.respond_with_connected({
            connectionId: 'conn-1',
            connectionDetails: { connectionKey: 'key-1' },
          });
        } else {
          // Same connectionId = successful resume
          conn.respond_with_connected({
            connectionId: 'conn-1',
            connectionDetails: { connectionKey: 'key-1-resumed' },
          });
        }
      },
      onMessageFromClient: (msg, conn) => {
        if (msg.action === 10) {
          conn!.send_to_client({ action: 11, channel: msg.channel, flags: 0 });
        }
        if (msg.action === 15) {
          if (connectCount === 1) {
            conn1Msgs.push(msg);
            // Don't ACK
          } else {
            conn2Msgs.push(msg);
            // ACK on second connection
            conn!.send_to_client({
              action: 1,
              msgSerial: msg.msgSerial,
              count: 1,
              res: [{ serials: [`serial-${msg.msgSerial}`] }],
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
      disconnectedRetryTimeout: 100,
    });
    trackClient(client);

    client.connect();
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    const channel = client.channels.get('test-RTN19a2-resume', { attachOnSubscribe: false });
    await channel.attach();

    // Publish 2 messages without ACK
    const p1 = channel.publish('msg1', 'data1');
    const p2 = channel.publish('msg2', 'data2');

    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(conn1Msgs.length).to.equal(2);
    const origSerial1 = conn1Msgs[0].msgSerial;
    const origSerial2 = conn1Msgs[1].msgSerial;

    // Disconnect and reconnect (successful resume — same connectionId)
    mock.active_connection!.simulate_disconnect();

    await Promise.all([p1, p2]);

    // Resent messages should keep same msgSerials
    expect(conn2Msgs.length).to.be.at.least(2);
    const resent1 = conn2Msgs.find((m: any) => m.messages?.[0]?.name === 'msg1');
    const resent2 = conn2Msgs.find((m: any) => m.messages?.[0]?.name === 'msg2');
    expect(resent1?.msgSerial).to.equal(origSerial1);
    expect(resent2?.msgSerial).to.equal(origSerial2);
    client.close();
  });

  /**
   * RTN19a2 - Resent messages get new msgSerial on failed resume
   */
  it('RTN19a2 - resent messages get new msgSerial on failed resume', async function () {
    let connectCount = 0;
    const conn1Msgs: any[] = [];
    const conn2Msgs: any[] = [];

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        connectCount++;
        mock.active_connection = conn;
        if (connectCount === 1) {
          conn.respond_with_connected({
            connectionId: 'conn-1',
            connectionDetails: { connectionKey: 'key-1' },
          });
        } else {
          // Different connectionId = failed resume
          conn.respond_with_connected({
            connectionId: 'conn-2',
            connectionDetails: { connectionKey: 'key-2' },
          });
        }
      },
      onMessageFromClient: (msg, conn) => {
        if (msg.action === 10) {
          conn!.send_to_client({ action: 11, channel: msg.channel, flags: 0 });
        }
        if (msg.action === 15) {
          if (connectCount === 1) {
            conn1Msgs.push(msg);
            // Don't ACK
          } else {
            conn2Msgs.push(msg);
            conn!.send_to_client({
              action: 1,
              msgSerial: msg.msgSerial,
              count: 1,
              res: [{ serials: [`new-serial-${msg.msgSerial}`] }],
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
      disconnectedRetryTimeout: 100,
    });
    trackClient(client);

    client.connect();
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    const channel = client.channels.get('test-RTN19a2-newid', { attachOnSubscribe: false });
    await channel.attach();

    // Publish 2 messages without ACK
    const p1 = channel.publish('msg1', 'data1');
    const p2 = channel.publish('msg2', 'data2');

    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(conn1Msgs.length).to.equal(2);

    // Disconnect — reconnect with new connectionId (failed resume)
    mock.active_connection!.simulate_disconnect();

    await Promise.all([p1, p2]);

    // Resent messages should have new msgSerials starting from 0
    expect(conn2Msgs.length).to.be.at.least(2);
    const msgSerials = conn2Msgs
      .filter((m: any) => m.messages?.length)
      .map((m: any) => m.msgSerial);
    expect(msgSerials).to.include(0);
    expect(msgSerials).to.include(1);
    client.close();
  });

  /**
   * RTN19b - Pending ATTACH resent on new transport after disconnect
   */
  it('RTN19b - pending ATTACH resent after disconnect', async function () {
    let connectCount = 0;
    const attachMsgsPerConn: any[][] = [[], []];

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        const idx = connectCount++;
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg, conn) => {
        if (msg.action === 10) { // ATTACH
          const idx = connectCount - 1;
          if (idx < attachMsgsPerConn.length) {
            attachMsgsPerConn[idx].push(msg);
          }
          // Only respond on second connection
          if (idx >= 1) {
            conn!.send_to_client({
              action: 11, channel: msg.channel, flags: 0,
            });
          }
          // Don't respond on first connection — leave ATTACHING
        }
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
      disconnectedRetryTimeout: 100,
    });
    trackClient(client);

    client.connect();
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    const channel = client.channels.get('test-RTN19b-attach');

    // Start attach — won't get response on first connection
    const attachPromise = channel.attach();

    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(attachMsgsPerConn[0].length).to.equal(1);
    expect(channel.state).to.equal('attaching');

    // Disconnect — ably-js reconnects and resends pending ATTACH
    mock.active_connection!.simulate_disconnect();

    await attachPromise;
    expect(channel.state).to.equal('attached');

    // ATTACH was resent on second connection
    expect(attachMsgsPerConn[1].length).to.be.at.least(1);
    client.close();
  });

  /**
   * RTN19b - Pending DETACH resent on new transport after disconnect
   */
  it('RTN19b - pending DETACH resent after disconnect', async function () {
    let connectCount = 0;
    const detachMsgsPerConn: any[][] = [[], []];

    const mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        const idx = connectCount++;
        mock.active_connection = conn;
        conn.respond_with_connected();
      },
      onMessageFromClient: (msg, conn) => {
        if (msg.action === 10) { // ATTACH
          conn!.send_to_client({ action: 11, channel: msg.channel, flags: 0 });
        }
        if (msg.action === 12) { // DETACH
          const idx = connectCount - 1;
          if (idx < detachMsgsPerConn.length) {
            detachMsgsPerConn[idx].push(msg);
          }
          // Only respond on second connection
          if (idx >= 1) {
            conn!.send_to_client({ action: 13, channel: msg.channel });
          }
        }
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
      disconnectedRetryTimeout: 100,
    });
    trackClient(client);

    client.connect();
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    const channel = client.channels.get('test-RTN19b-detach');
    await channel.attach();

    // Start detach — won't get response on first connection
    const detachPromise = channel.detach();

    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(detachMsgsPerConn[0].length).to.equal(1);
    expect(channel.state).to.equal('detaching');

    // Disconnect — ably-js reconnects and resends pending DETACH
    mock.active_connection!.simulate_disconnect();

    await detachPromise;
    expect(channel.state).to.equal('detached');

    expect(detachMsgsPerConn[1].length).to.be.at.least(1);
    client.close();
  });
});
