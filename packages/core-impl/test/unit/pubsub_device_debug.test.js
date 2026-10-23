'use strict';

/**
 * The logging of `@ably/pubsub-device` and `@ably/pubsub-device/debug`.
 *
 * The package root is built with every log below error level stripped, and the debug entry point
 * is the same client built with full logging, so the same client options must log nothing below
 * error level from the one and everything from the other. Exercises the built bundles through the
 * workspace symlink, as pubsub_side_agent.test.js does; Node-only, like the rest of test/unit.
 */
define(['chai'], function (chai) {
  const { expect } = chai;
  const PubSubCore = require('@ably/pubsub-core');
  const PubSubDevice = require('@ably/pubsub-device');
  const PubSubDeviceDebug = require('@ably/pubsub-device/debug');

  // Constructs a client at the most verbose log level and returns everything it logged. The client
  // never connects, so the logs are those of construction alone, which include several below
  // error level and none at it.
  function logsOfConstruction(createClient) {
    const logs = [];
    const client = createClient({
      key: 'app.key:secret',
      autoConnect: false,
      logLevel: 4,
      logHandler: (message) => logs.push(message),
    });
    client.close();
    return logs;
  }

  describe('pubsub_device_debug', function () {
    it('@ably/pubsub-device logs nothing below error level', function () {
      expect(logsOfConstruction(PubSubDevice.createClient)).to.deep.equal([]);
    });

    it('@ably/pubsub-device/debug logs below error level', function () {
      const logs = logsOfConstruction(PubSubDeviceDebug.createClient);
      expect(logs.some((message) => message.includes('BaseClient(): started'))).to.equal(true);
    });

    it('@ably/pubsub-device/debug exports what the package root exports', function () {
      expect(Object.keys(PubSubDeviceDebug).sort()).to.deep.equal(Object.keys(PubSubDevice).sort());
    });

    // The two entry points bundle separate copies of the client, but must share the core's one
    // runtime ErrorInfo, so that an error from either passes `instanceof` against both.
    it('@ably/pubsub-device/debug exports the core ErrorInfo', function () {
      expect(PubSubDeviceDebug.ErrorInfo).to.equal(PubSubCore.ErrorInfo);
      expect(PubSubDeviceDebug.ErrorInfo).to.equal(PubSubDevice.ErrorInfo);
    });

    it('a @ably/pubsub-device/debug client declares the device side', function () {
      const client = PubSubDeviceDebug.createClient({ key: 'app.key:secret', autoConnect: false });
      try {
        expect(client.options.agents).to.have.property('ably-pubsub-device');
      } finally {
        client.close();
      }
    });
  });
});
