# Usage of private APIs in ably-js test suite

Written at commit `50076ed`.

Investigating this as part of ECO-14.

Files come from running `find test -name '*.js'`.

Multiple similar usages of the same API in a given file are not necessarily repeated.

Not been particularly consistent here in explaining _why_ it uses a given API; sometimes I have, sometimes I haven't if it wasn't obvious or something.

Questions:

- when it does things like noop-ing `onProtocolMessage`, is it important whether it applies to a specific instance or not?
- what subtleties are there about whether when we override e.g. a send method, it's blocking other sends until resolved?
- things like `await channel.processMessage` in a test (actually, the `await` is a bit of a red herring, could just as easily be `onProtocolMessage`), how do we know when the client has actually processed the message so that we can proceed with the test? (understand better how much of an issue this is)
- how would patterns like restore the `original*` implementation work?

## Other notes

I haven’t mentioned the places where the tests use JS-specific public API, e.g. `transports` client option.

## `test/web_server.js`

None

## `test/realtime/delta.test.js`

- `channel._lastPayload.messageId = null`
  - to make decoding fail

## `test/realtime/encoding.test.js`

- `var BufferUtils = Ably.Realtime.Platform.BufferUtils;`
- `var Defaults = Ably.Rest.Platform.Defaults;`
  - just used for accessing library’s baked-in protocol version, to pass to `request()`

## `test/realtime/presence.test.js`

- `var createPM = Ably.protocolMessageFromDeserialized;`
- `var PresenceMessage = Ably.Realtime.PresenceMessage;`
- replacing `channel.sendPresence` with a version that checks the presence message’s client ID
- replacing `transport.send` with a version that checks the encoded data in the protocol message
- `channel.presence.members.waitSync(cb);`
- `var connId = realtime.connection.connectionManager.connectionId;`
- `channel.presence._myMembers.put(`
- `channel.sync();`
- stubbing out `channel.attachImpl`
- `channel.checkPendingState();`
- `Ably.Realtime.Platform.Config.nextTick(cb);`
- calling `channel.processMessage` to inject a protocol message

TODO what’s
var openConnections = res[1] && res[1].close ? [listenerRealtime, res[1]] : listenerRealtime;

## `test/realtime/event_emitter.test.js`

- `eventEmitter.emit('custom');` — RTE6 says that `emit` is internal

## `test/realtime/api.test.js`

None

## `test/realtime/crypto.test.js`

- `var BufferUtils = Ably.Realtime.Platform.BufferUtils;`
- `var msgpack = typeof window == 'object' ? Ably.msgpack : require('@ably/msgpack-js');`
- `Message.encode(testMessage, channelOpts)`
- `Message.decode(encryptedMessage, channelOpts);`
- `Message.fromValues(`
- `expect(channel.channelOptions.cipher.algorithm).to.equal('aes');` — `channel.channelOptions` is not public API

## `test/realtime/failure.test.js`

- `webSocketConnectTimeout: 50` client option
- replacing `channel.processMessage` to drop `ATTACHED`
- replacing `realtime.connection.connectionManager.activeProtocol.transport.onProtocolMessage` to drop `ACK`
- `Ably.Realtime.Platform.Config.nextTick(function () {`
- calling `realtime.connection.connectionManager.activeProtocol.transport.onProtocolMessage` to inject an `ERROR`
- calling `realtime.connection.connectionManager.on('transport.pending'` and then replacing this transport’s `onProtocolMessage` to change its `connectionDetails.maxIdleInterval`
- accessing `connection.connectionManager.activeProtocol.getTransport()` to inject a `DISCONNECTED`
- replacing `connectionManager.onChannelMessage` to listen for `MESSAGE`and then calling `requestState('attaching')` on a channel in response

## `test/realtime/channel.test.js`

- `var createPM = Ably.protocolMessageFromDeserialized;`
- `expect(channel.channelOptions).to.deep.equal(channelOptions, 'Check requested channel options');` (`channelOptions` isn’t public API)
- listens for `channel._allChannelChanges.on(['update'],`
- replaces `channel.sendMessage` with an empty implementation (to "sabotage the reattach attempt")
- sets `realtime.options.timeouts.realtimeRequestTimeout = 100` i.e. modifies client options after creation
- calls `transport.onProtocolMessage` to inject `DETACHED`
- replaces `channel.sendMessage` to check that an `ATTACH` was received, and inside it then calls `transport.onProtocolMessage` to inject a `DETACHED`
- OK, have seen plenty of `onProtocolMessage` calls to inject a protocol message now; will only write if something particularly interesting seen
- replaces `channel.sendMessage` with an implementation which fails the test if called
- replaces `channel.sendMessage` to check that only a `DETACH` is being sent, and to continue the test once second `DETACH` sent

## `test/realtime/auth.test.js`

- `var http = new Ably.Realtime._Http();` — just uses this as an HTTP client to fetch a JWT
- spies on `rest.time` to count how many times called
- checks `rest.serverTimeOffset`
- spies on `transport.send` to look for an outgoing `AUTH` and check its properties

## `test/realtime/transports.test.js`

Transports are a JS-specific concept so might not be worth worrying too much about the contents of this file

- `const Defaults = Ably.Rest.Platform.Defaults;`
  - changes `Defaults.wsConnectivityUrl`
- `const defaultTransports = new Ably.Realtime({ key: 'xxx:yyy', autoConnect: false }).connection.connectionManager.transports;`
- `const baseTransport = new Ably.Realtime({ key: 'xxx:yyy', autoConnect: false, transports: availableTransports }).connection.connectionManager.baseTransport;`
- changes `Ably.Rest.Platform.Config.WebSocket`
  - replaces it with a `FakeWebSocket` class to simulate not emitting any events
- checks `realtime.connection.connectionManager.activeProtocol.transport.shortName`
- `webSocketSlowTimeout` and `webSocketConnectTimeout` client options
- checks `window.localStorage.getItem(transportPreferenceName)`
- sets `window.localStorage.setItem(transportPreferenceName`
- modifies `realtime.connection.connectionManager.checkWsConnectivity` to delay its completion until some other event has happened

## `test/realtime/utils.test.js`

Ah, I just realised that some of the properties on `shared_helper` actually refer to properties of the library, e.g. `helper.Utils` is actually `Ably.Realtime.Utils`. So perhaps I missed some usages of internal APIs in earlier files. But can figure that out later.

- this entire file is a test of the internal `utils.getRetryTime(…)` method

## `test/realtime/resume.test.js`

- `connectionManager.once('transport.active',` and inside the callback it makes an assertion on `transport.params.mode`
- sets a channel’s state: `suspendedChannel.state = 'suspended';`
- sabotages a resume by setting `connection.connectionManager`’s `conectionKey` and `connectionId` to garbage
- sets `connection.connectionManager.msgSerial` to some fixed value (not sure of motivation)
- calls `connection.connectionManager.disconnectAllTransports();`
- checks `connection.connectionManager.msgSerial` and `connection.connectionManager.connectionId`
- sabotages a resume by setting `realtime.auth.tokenDetails.token`
- modifies `realtime.auth.key` to something invalid in order to get a fatal resume error
- sets `connectionManager.lastActivity` to something far in the past
- sets `connectionManager.activeProtocol.getTransport().onProtocolMessage` to no-op so that last activity timer doesn’t get bumped
- spies on `connectionManager.tryATransport` to verify `transportParams.mode`
- modifies `connectionManager.send` to do `msg.setFlag('ATTACH_RESUME')` on the outgoing message

## `test/realtime/message.test.js`

- `let config = Ably.Realtime.Platform.Config;`
- `var createPM = Ably.protocolMessageFromDeserialized;`
- modifies `transport.send` to check the `clientId` on the outgoing `MESSAGE`
- checks `channel.filteredSubscriptions.has(listener)`
- accesses `connectionManager.connectionDetails`, modifies its `maxMessageSize`, then re-injects it via a `CONNECTED` passed to `onProtocolMessage()`
- bundling test performs some assertions about the contents of `realtime.connection.connectionManager.queuedMessages`

## `test/realtime/connection.test.js`

- creates a `recover` client option which uses knowledge of ably-js’s serialization of recovery key
- spies on `transport.send` to listen for `MESSAGE`, check its properties, and then continue the test
- calls `connectionManager.disconnectAllTransports();`
- listens for `connectionManager.once('connectiondetails')` in order to make some assertions about those details
- checks `realtime.options.maxMessageSize`

## `test/realtime/init.test.js`

- accesses `var transport = realtime.connection.connectionManager.activeProtocol.transport.uri` or `.recvRequest.recvUri` to check the `v=3` query parameter
- `expect(realtime.options).to.deep.equal(realtime.connection.connectionManager.options);`
- checks `realtime.connection.connectionManager.httpHosts[0];` to check it’s using correct default host, also checks length of that array
- checks that timeout-related client options are reflected in internal `realtime.connection.connectionManage.states.*.retryDelay` values
- spies on `realtime.connection.connectionManager.tryATransport`, looking at the host that’s being used to connect, although not sure exactly to what end
- checks `realtime.connection.connectionManager`’s `baseTransport` and `webSocketTransportAvailable`
- modifies `realtime.connection.connectionManager.pendingTransport.onProtocolMessage` to look for `CONNECTED`, make an assertion about it, and then set its `connectionKey` and `clientId` to fixed values (so we can assert they’re subsequently used to populate some user-facing properties)
- calls the `new Ably.Rest._Http()._getHosts(…)` API to check its result
- calls `helper.AblyRest().options.realtimeHost;` just to get a URL to be used in a realtime’s `fallbackHosts`

## `test/realtime/history.test.js`

None

## `test/realtime/connectivity.test.js`

- directly calls `new Ably.Realtime._Http().checkConnectivity()` and checks it succeeds (i.e. directly tests this method)

## `test/realtime/reauth.test.js`

None

## `test/realtime/sync.test.js`

- calling `channel.processMessage` to inject an `ATTACHED` with a presence flag, and then a `SYNC`, later on a `PRESENCE`
- spies on `channel.processMessage` to, after processing a received `SYNC`, inject a `PRESENCE`

## `test/browser/simple.test.js`

- checks whether a transport is available using `transport in Ably.Realtime.ConnectionManager.supportedTransports(Ably.Realtime._transports)`

## `test/browser/http.test.js`

- changes `Ably.Rest.Platform.Config.xhrSupported` to false to make it use Fetch

## `test/browser/connection.test.js`

(I guess that this is a test that we might not include in the unified test suite.)

- uses knowledge of library’s usage of `window.sessionStorage` for transport preference and recovery key
- fires an `"offline"` event, ditto `"offline"`
- replaces `connection.connectionManager.tryATransport` to "simulate the internet being failed"
- listens for `connection.connectionManager.once('transport.pending'` in order to know when to "sabotage the connection attempt", and then makes assertions about this transport (`isDisposed`, checking `realtime.connection.connectionManager.activeProtocol.transport`)
- dispatches a `"beforeunload"` event
- tests `realtime.connection.connectionManager.baseTransport` and `realtime.connection.connectionManager.webSocketTransportAvailable`

## `test/browser/modular.test.js`

- `const BufferUtils = BaseRest.Platform.BufferUtils;`
  - just used for Base64 and checking buffer equality, can be replaced easily
- replaces `rest.http.do` to check the `Content-Type` request header
- replaces `realtime.connection.connectionManager.connectImpl` to check `transportParams.format`
- spies on `realtime.connection.connectionManager.tryATransport` to check which transport being tried

## `test/common/globals/named_dependencies.js`

N/A

## `test/common/globals/environment.js`

N/A

## `test/common/ably-common/test/agents.test.js`

N/A

## `test/common/ably-common/.eslintrc.js`

N/A

## `test/common/ably-common/json-schemas/publish.js`

N/A

## `test/common/modules/client_module.js`

- uses `Ably.Realtime.Utils` for its `mixin` function

## `test/common/modules/testapp_manager.js`

- uses `ably.Realtime.Platform.BufferUtils`

## `test/common/modules/testapp_module.js`

None

## `test/common/modules/shared_helper.js`

- `var utils = clientModule.Ably.Realtime.Utils;`
- `var platform = clientModule.Ably.Realtime.Platform;`
  - uses `platform.Config.nextTick()`
- uses `var BufferUtils = platform.BufferUtils;`
- extracts `availableTransports` and `bestTransport` by reading `Ably.Realtime.ConnectionManager.supportedTransports(Ably.Realtime._transports)`
  - `availableTransports` used by `testOnAllTransports`
- `simulateDroppedConnection()` does the following:
  - `realtime.connection.connectionManager.requestState({ state: 'disconnected' })`
  - `realtime.connection.connectionManager.disconnectAllTransports();`
- `becomeSuspended()` does the following:
  - `realtime.connection.connectionManager.disconnectAllTransports();`
  - `realtime.connection.connectionManager.notifyState({ state: 'suspended' });`
- `callbackOnClose()`:
  - checks `realtime.connection.connectionManager.activeProtocol`
  - does `realtime.connection.connectionManager.activeProtocol.transport.on('disposed',`
- `isComet(transport)` and `isWebsocket(transport)` check for `"comet"` and `"wss:/"` which I guess is something internal?

## `test/support/junit_directory_path.js`

N/A

## `test/support/mocha_junit_reporter/index.js`

N/A

## `test/support/mocha_junit_reporter/shims/fs.js`

N/A

## `test/support/mocha_junit_reporter/build/node.js`

Generated

## `test/support/mocha_junit_reporter/build/browser.js`

Generated

## `test/support/root_hooks.js`

None

## `test/support/environment.vars.js`

None

## `test/support/runPlaywrightTests.js`

N/A

## `test/support/test_helper.js`

N/A

## `test/support/browser_file_list.js`

N/A

## `test/support/modules_helper.js`

N/A

## `test/support/browser_setup.js`

N/A

## `test/support/mocha_reporter.js`

N/A

## `test/support/playwrightSetup.js`

N/A

## `test/rest/bufferutils.test.js`

This file is a unit test of `Ably.Realtime.Platform.BufferUtils`; something we wouldn’t include in a unified test suite.

## `test/rest/presence.test.js`

- `var BufferUtils = Ably.Realtime.Platform.BufferUtils;`
  - I’m going to stop mentioning the use of BufferUtils as a test util now; the pattern is clear and not hard to fix.

## `test/rest/fallbacks.test.js`

- checks `rest._currentFallback.{host, validUntil}` to check that the working fallback has been stored correctly
- modifies `rest._currentFallback.validUntil` to check library correctly forgets stored fallback

## `test/rest/api.test.js`

None

## `test/rest/stats.test.js`

None

## `test/rest/batch.test.js`

None

## `test/rest/time.test.js`

None

## `test/rest/auth.test.js`

- ditto will stop mentioning usage of `Utils` for stuff that will be pretty easy to replace

None

## `test/rest/http.test.js`

- accesses `Ably.Rest.Platform.Defaults` to check its `version` is being used to populate `Ably-Agent`
- spies on `rest.http.do` to make assertions about request headers
- replaces `rest.http.do` to simulate a 204 response

## `test/rest/capability.test.js`

None

## `test/rest/push.test.js`

None

## `test/rest/message.test.js`

- spies on `channel._publish` to verify that client does / doesn’t add a `clientId`
  - ditto to check that idempotent REST publishing generates message IDs
  - ditto to check `params`
- overrides `Ably.Rest._Http.doUri` to fake a publish error

## `test/rest/init.test.js`

- accesses various properties of `rest.options` to check the effect of passing various things to the constructor

## `test/rest/history.test.js`

None

## `test/rest/defaults.test.js`

This appears to be a unit test of the `Defaults` class’s `normaliseOptions()`, `getHosts()`, and `getPort()` methods. ButI imagine it’s actually providing the test suite’s coverage of a buch of spec points which aren’t written in terms of this API.

## `test/rest/status.test.js`

None

## `test/rest/request.test.js`

- overrides `rest.http.do()` to check `X-Ably-Version` request header

## `test/package/browser/template/server/resources/runTest.js`

N/A

## `test/package/browser/template/playwright-lib.config.js`

N/A
