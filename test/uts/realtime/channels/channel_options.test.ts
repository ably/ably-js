/**
 * UTS: Channel Options Tests
 *
 * Spec points: TB2, TB2c, TB2d, TB3, TB4, RTS3b, RTS3c, RTS3c1,
 *              RTL16, RTL16a, RTS5, RTS5a, RTS5a1, RTS5a2, DO2a
 * Source: uts/test/realtime/unit/channels/channel_options.md
 *
 * Tests ChannelOptions attributes, setOptions, getDerived, and option
 * propagation through channels.get().
 *
 * Deviation: TB3 (withCipherKey) — ably-js uses { cipher: { key } } option,
 *   not a static constructor.
 * Deviation: RTS3c1 — ably-js channels.get() throws error 40000 when options
 *   would cause reattachment (rather than silently re-attaching).
 */

import { expect } from 'chai';
import { MockWebSocket } from '../../mock_websocket';
import { Ably, installMockWebSocket, restoreAll, trackClient } from '../../helpers';

describe('uts/realtime/channels/channel_options', function () {
  afterEach(function () {
    restoreAll();
  });

  /**
   * TB2 - ChannelOptions defaults
   */
  it('TB2 - default channel options', function () {
    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    const channel = client.channels.get('test-TB2');
    const opts = channel.channelOptions;
    expect(opts).to.not.be.null;
    // params and modes should be absent or empty by default
    expect(opts.params).to.satisfy((p: any) => !p || Object.keys(p).length === 0);
    expect(opts.modes).to.satisfy((m: any) => !m || m.length === 0);
    client.close();
  });

  /**
   * TB2c - ChannelOptions with params
   */
  it('TB2c - channel options with params', function () {
    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    const channel = client.channels.get('test-TB2c', {
      params: { rewind: '1', delta: 'vcdiff' },
    });

    expect(channel.channelOptions.params).to.deep.include({ rewind: '1', delta: 'vcdiff' });
    client.close();
  });

  /**
   * TB2d - ChannelOptions with modes
   */
  it('TB2d - channel options with modes', function () {
    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    const channel = client.channels.get('test-TB2d', {
      modes: ['PUBLISH', 'SUBSCRIBE'],
    });

    expect(channel.channelOptions.modes).to.include('PUBLISH');
    expect(channel.channelOptions.modes).to.include('SUBSCRIBE');
    expect(channel.channelOptions.modes).to.have.length(2);
    client.close();
  });

  /**
   * TB4 - attachOnSubscribe defaults to true
   */
  it('TB4 - attachOnSubscribe default', function () {
    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    const channel1 = client.channels.get('test-TB4-default');
    // attachOnSubscribe is not explicitly stored in channelOptions; it defaults to true
    // Check via the option or the absence of a false override
    expect(channel1.channelOptions.attachOnSubscribe).to.not.equal(false);

    const channel2 = client.channels.get('test-TB4-false', {
      attachOnSubscribe: false,
    });
    expect(channel2.channelOptions.attachOnSubscribe).to.equal(false);
    client.close();
  });

  /**
   * RTS3b - Options set on new channel via channels.get()
   */
  it('RTS3b - options set on new channel', function () {
    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    const channel = client.channels.get('test-RTS3b', {
      params: { rewind: '1' },
      modes: ['SUBSCRIBE'],
    });

    expect(channel.channelOptions.params).to.deep.include({ rewind: '1' });
    expect(channel.channelOptions.modes).to.include('SUBSCRIBE');
    client.close();
  });

  /**
   * RTS3c - Options updated on existing channel (when no reattach needed)
   */
  it('RTS3c - options updated on existing channel', function () {
    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    // Create channel with no special options
    const channel = client.channels.get('test-RTS3c');

    // Get same channel with new options that don't require reattach
    // (channel is in 'initialized' state, so params/modes change is OK)
    const sameChannel = client.channels.get('test-RTS3c', {
      params: { rewind: '1' },
    });

    expect(sameChannel).to.equal(channel);
    expect(channel.channelOptions.params).to.deep.include({ rewind: '1' });
    client.close();
  });

  /**
   * RTS3c1 - Error if options would trigger reattachment on attached channel
   */
  it('RTS3c1 - error when options change on attached channel', async function () {
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

    const channel = client.channels.get('test-RTS3c1');
    await channel.attach();
    expect(channel.state).to.equal('attached');

    // Changing params on an attached channel via get() should throw
    try {
      client.channels.get('test-RTS3c1', { params: { rewind: '1' } });
      expect.fail('Expected get() to throw');
    } catch (err: any) {
      expect(err.code).to.equal(40000);
    }
    client.close();
  });

  /**
   * RTL16 - setOptions updates channel options
   */
  it('RTL16 - setOptions updates channel options', async function () {
    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    const channel = client.channels.get('test-RTL16');

    // setOptions on an unattached channel should resolve immediately
    await channel.setOptions({
      params: { delta: 'vcdiff' },
      attachOnSubscribe: false,
    });

    expect(channel.channelOptions.params).to.deep.include({ delta: 'vcdiff' });
    expect(channel.channelOptions.attachOnSubscribe).to.equal(false);
    client.close();
  });

  /**
   * RTL16a - setOptions triggers reattachment when attached
   *
   * UTS spec error: The UTS spec asserts a state transition through 'attaching'
   * during setOptions reattach. However, the features spec (RTL16a) only says
   * "sends an ATTACH message...indicates success once the server has replied
   * with an ATTACHED" — it does NOT require a state machine transition. ably-js
   * stays in 'attached' during the reattach (deliberate: avoids RTL17 message
   * rejection). Test verifies attachCount instead of state transitions.
   */
  it('RTL16a - setOptions triggers reattachment when attached', async function () {
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

    const channel = client.channels.get('test-RTL16a');
    await channel.attach();
    expect(channel.state).to.equal('attached');
    expect(attachCount).to.equal(1);

    // setOptions with new params should send a new ATTACH message
    await channel.setOptions({
      params: { rewind: '1' },
    });

    expect(channel.state).to.equal('attached');
    expect(channel.channelOptions.params).to.deep.include({ rewind: '1' });
    // A second ATTACH was sent for the reattach
    expect(attachCount).to.equal(2);
    client.close();
  });

  /**
   * RTS5a - getDerived creates derived channel with filter
   */
  it('RTS5a - getDerived creates derived channel', function () {
    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    const channel = client.channels.getDerived('base-channel', {
      filter: "name == 'foo'",
    });

    expect(channel.name).to.match(/^\[filter=/);
    expect(channel.name).to.include('base-channel');
    client.close();
  });

  /**
   * RTS5a1 - Derived channel filter is base64 encoded
   */
  it('RTS5a1 - derived channel filter is base64 encoded', function () {
    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    const filter = "name == 'test'";
    const channel = client.channels.getDerived('test-channel', { filter });

    // Base64 encode the filter
    const expectedEncoded = Buffer.from(filter).toString('base64');
    expect(channel.name).to.equal(`[filter=${expectedEncoded}]test-channel`);
    client.close();
  });

  /**
   * RTS5 - getDerived with options sets them on channel
   */
  it('RTS5 - getDerived with channel options', function () {
    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    const channel = client.channels.getDerived(
      'test-RTS5',
      { filter: 'true' },
      { modes: ['SUBSCRIBE'], attachOnSubscribe: false },
    );

    expect(channel.channelOptions.modes).to.include('SUBSCRIBE');
    expect(channel.channelOptions.attachOnSubscribe).to.equal(false);
    client.close();
  });

  /**
   * DO2a - DeriveOptions filter attribute
   */
  it('DO2a - DeriveOptions filter attribute', function () {
    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    const filter = "name == 'event' && data.count > 10";
    const channel = client.channels.getDerived('test-DO2a', { filter });

    // Verify the filter was encoded into the channel name
    const expectedEncoded = Buffer.from(filter).toString('base64');
    expect(channel.name).to.include(`filter=${expectedEncoded}`);
    client.close();
  });
});
