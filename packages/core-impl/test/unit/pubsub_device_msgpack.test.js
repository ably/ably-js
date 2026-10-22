'use strict';

/**
 * MessagePack in `@ably/pubsub-device`.
 *
 * The package's web and React Native bundles leave MessagePack out, so a client from them uses JSON
 * even when it asks for the binary protocol, until it is given the `MsgPack` plugin from
 * `@ably/pubsub-device/msgpack`. Its Node.js bundles, like `@ably/pubsub-server`'s, keep MessagePack
 * and use it by default. Exercises the built bundles through the workspace symlink, as
 * pubsub_side_agent.test.js does; Node-only, like the rest of test/unit, so the web bundles are
 * loaded by their file paths, which the package's export conditions would otherwise not resolve to
 * under Node.js.
 */
define(['chai'], function (chai) {
  const { expect } = chai;
  const PubSubDevice = require('@ably/pubsub-device');
  const PubSubDeviceDebug = require('@ably/pubsub-device/debug');
  const PubSubDeviceWeb = require('../../../device/dist/index.js');
  const PubSubDeviceWebDebug = require('../../../device/dist/debug.js');
  const PubSubServer = require('@ably/pubsub-server');
  const { MsgPack } = require('@ably/pubsub-device/msgpack');

  // Constructs a client that never connects and returns whether it settled on the binary protocol.
  // An HTTP client holds no connection, so only a realtime one is closed.
  function usesBinaryProtocol(createClient, options) {
    const client = createClient({ key: 'app.key:secret', autoConnect: false, ...options });
    try {
      return client.options.useBinaryProtocol;
    } finally {
      if (client.connection) client.close();
    }
  }

  describe('pubsub_device_msgpack', function () {
    for (const [entryPoint, PubSub] of [
      ['@ably/pubsub-device (web)', PubSubDeviceWeb],
      ['@ably/pubsub-device/debug (web)', PubSubDeviceWebDebug],
    ]) {
      it(`a ${entryPoint} client uses JSON without the MsgPack plugin`, function () {
        expect(usesBinaryProtocol(PubSub.createClient, {})).to.equal(false);
        expect(usesBinaryProtocol(PubSub.createClient, { useBinaryProtocol: true })).to.equal(false);
      });

      it(`a ${entryPoint} client uses MessagePack with the MsgPack plugin`, function () {
        expect(usesBinaryProtocol(PubSub.createClient, { useBinaryProtocol: true, plugins: { MsgPack } })).to.equal(
          true,
        );
        expect(usesBinaryProtocol(PubSub.createClient, { plugins: { MsgPack } })).to.equal(false);
      });
    }

    for (const [entryPoint, PubSub] of [
      ['@ably/pubsub-device (Node.js)', PubSubDevice],
      ['@ably/pubsub-device/debug (Node.js)', PubSubDeviceDebug],
    ]) {
      it(`a ${entryPoint} client uses MessagePack without a plugin`, function () {
        expect(usesBinaryProtocol(PubSub.createClient, {})).to.equal(true);
        expect(usesBinaryProtocol(PubSub.createClient, { useBinaryProtocol: false })).to.equal(false);
      });

      it(`a ${entryPoint} client accepts the MsgPack plugin`, function () {
        expect(usesBinaryProtocol(PubSub.createClient, { plugins: { MsgPack } })).to.equal(true);
      });
    }

    it('the MsgPack plugin encodes and decodes', function () {
      const value = { name: 'event', data: [1, 'two', { three: true }] };
      expect(MsgPack.decode(MsgPack.encode(value))).to.deep.equal(value);
    });

    it('a @ably/pubsub-server client uses MessagePack without a plugin', function () {
      expect(usesBinaryProtocol(PubSubServer.createRealtimeClient, {})).to.equal(true);
      expect(usesBinaryProtocol(PubSubServer.createHttpClient, {})).to.equal(true);
    });
  });
});
