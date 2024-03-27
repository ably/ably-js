# Thoughts on a man-in-the-middle-server for replacing some private API usage

The context being that we eventually intend to use the ably-js test suite for the unified test suite.

See [`private-api-usage.md`](./private-api-usage.md) for the private APIs we’re referring to here.

## Requirements

TODO

Key realtime protocol-related methods used by tests (will look at REST later):

### Outgoing

- replacing `channel.sendPresence`
  - check presence message’s client ID
- replacing `transport.send`
  - check the encoded data in a protocol message
  - to look for an outgoing `AUTH` and check its properties
  - to check the `clientId` on the outgoing message
  - to listen for `MESSAGE`, check its properties, **and then continue the test**
- replacing `channel.sendMessage`
  - with an empty implementation, to "sabotage the reattach attempt"
  - with an implementation that fails the test if called
  - to check that only a `DETACH` is being sent, **and to continue the test once second `DETACH` sent**
- replacing `connectionManager.send`
  - to do `msg.setFlag('ATTACH_RESUME')` on the outgoing message
- accesses `var transport = realtime.connection.connectionManager.activeProtocol.transport.uri` or `.recvRequest.recvUri` to check the `v=3` query parameter
- checks `realtime.connection.connectionManager.httpHosts[0];` to check it’s using correct default host, also checks length of that array
- replacing `realtime.conneciton.connectionManager.tryATransport`
  - looking at the host that’s being used to connect, although not sure exactly to what end
  - to "simulate the internet being failed"
- replaces `realtime.connection.connectionManager.connectImpl`
  - to check `transportParams.format`

### Incoming

- calling `channel.processMessage`
  - inject a protocol message
- calling `onProtocolMessage` (on a specific transport)

  - inject an `ERROR`
  - inject a `DISCONNECTED`
  - etc. inject protocol message (won't keep repeating)
  - accesses `connectionManager.connectionDetails`, modifies its `maxMessageSize`, then re-injects it via a `CONNECTED` passed to `onProtocolMessage()` (the point here being that maybe we can get this `connectionManager.connectionDetails` some other way, or just modify the original `CONNECTED`?)

- replacing `channel.processMessage`
  - drop an `ATTACHED`
  - spies on this to, after processing a received `SYNC`, inject a `PRESENCE`
- replacing `onProtocolMessage` (on a specific transport)
  - drop `ACK`
  - change protocol message’s `connectionDetails.maxIdleInterval`
  - with no-op so that last activity timer doesn’t get bumped
  - to look for `CONNECTED`, make an assertion about it, and then set its `connectionKey` and `clientId` to fixed values (so we can assert they’re subsequently used to populate some user-facing properties)
- replacing `connectionManager.onChannelMessage`
  - listen for `MESSAGE` and then run some code in response

## API thoughts

Ideal would be a 2-way communication between test suite and proxy server, that for each incoming message asks what you want to do with it (drop, or maintain with edits), instead of having to have a convoluted declarative API for pre-configuring what to do with messages. That will be the easiest drop-in for the existing private API usage.

## Implementation thoughts

Options:

1. a WebSocket server (application layer)

   - Ably clients created by the tests would be configured with this server’s URL as their `realtimeHost`
   - this would complicate the use of TLS; either the server would only operate over HTTPS, with the test client being configured to do the same, or we’d need to use self-signed certificates, which may be easy or hard to use depending on the client library under test
   - this would complicate the testing of things like `environment` client option or fallback hosts

2. a WebSocket proxy server (application layer)

   - e.g. a SOCKS5 proxy
   - the environment in which client library is running (e.g. browser, or JVM, or platform’s OS) would be (per language in 4.1 of RFC 6455) configured to use a proxy when using WebSocket to connect to `sandbox.ably.com`
   - client libraries’ WebSocket implementations would pick up this proxy configuration and ask the proxy to open a TCP connection to the library’s configured host (see _Proxy Usage_ in 4.1)
   - this would mean that we could let the client use its default URLs, and things like `environment`, default behaviour of fallback hosts etc would be easy to test
   - TLS: if we wanted to be able to MITM then we’d still need to work with self-signed certificates (TODO understand better)
   - main issue I foresee here is that we don’t specify that our libraries need to work correctly behind a WebSocket proxy, and have reason to believe that some don’t (e.g. https://github.com/ably/ably-java/issues/120, although it says that the ably-js WebSocket library supports SOCKS, and https://github.com/ably/ably-dotnet/issues/159). I know off the top of my head that the library we use for WebSocket in ably-cocoa does (claim to) work with proxies, and presumably it’d work fine in a browser in ably-js

- not sure whether Node has support for proxies (other than specifically configuring your HTTP / WS client)
- the other thing is that it would be nice to not need to have to make any global settings changes (e.g. OS proxy settings)

3. some lower-level option

   Some other option that’s less visible to the Ably client library. For example, see the [modes of operation offered by mitmproxy](https://docs.mitmproxy.org/stable/concepts-modes/).

   One question in that case is whether it would be easy to use an option like this for all of the runtime environments in which we want to run the unified test suite (e.g. iOS Simulator, Android emulator, …?)

## What about using mitmproxy?

It's an interesting idea — it gives us access to a bunch of alternatives for how we'd implement the proxy, e.g. 1. above I think can be done with mitmproxy’s reverse proxy mode, and 2. with its regular mode.

And then (TODO check) we'd have a unified API (i.e. abstraction) for doing the MITM-ing, regardless of the implementation details. Maybe, once I’ve got a better idea of the requirements, take a look at its API. (One problem is that I don’t know Python.)

mitmproxy has good platform compatibility (Mac, Windows, Linux, and has instructions for using with Android Emulator, iOS Simulator). And has good instructions for how to set up self-signed certificates.

It also means that I can use the proxy approach for now, which requires the least changes to the test suite, and then switch later on if / when necessary.

Also, someone has already made [a WebSocket-based tool](https://github.com/hacker1024/mitmproxy_remote_interceptions) that puts an external API on mitmproxy. Not sure if works with WebSocket.

## Playwright

Just noticed that this offers an API for e.g. intercepting WebSocket: https://playwright.dev/docs/network. Not very useful cross-platform though.

## What about other transports?

In the above, I’ve only considered the WebSocket transport. Haven’t taken into account what we’d do for ably-js’s Comet transports. But having a unified API between the test suite and the mock server would help to build a solution that works for all transports.

## What we’ve used in the past

TODO

## Using mitmproxy

Going to read the documentation

I’ve been using the Wireguard mode, which seems very easy to use (installed the macOS client from App Store). Oh, no, that doesn't seem to work, you need to run on a separate machine:

> With the current implementation, it is not possible to proxy all traffic of the host that mitmproxy itself is running on, since this would result in outgoing WireGuard packets being sent over the WireGuard tunnel themselves.

There's something coming called local redirect mode ([here](https://github.com/mitmproxy/mitmproxy/discussions/5795) referred to as `osproxy` mode), not sure how far along. Ah, it's apparently out on Mac now! [Here](https://mitmproxy.org/posts/local-redirect/macos/) is the blog post. You can target a process by PID or by name.

For Node to work with mitmproxy certs: `NODE_EXTRA_CA_CERTS=~/.mitmproxy/mitmproxy-ca-cert.pem npm run test:node`

I think I need to learn a bit of Python now?

## Writing mitmproxy addon

- install mitmproxy using pipx so that we can install websockets package
- `pipx inject mitmproxy websockets`
- run mitmproxy with `mitmdump --mode local:node -s test-proxy.py`
- run Node tests with `NODE_EXTRA_CA_CERTS=~/.mitmproxy/mitmproxy-ca-cert.pem npm run test:node`
- to connect to the control API for now, use `websocat ws://localhost:8001`


JSON-RPC calls to implement:

proxy to test suite:

- `method`: `transformInterceptedMessage`
- `params`: something like `{"id": "f72a3312-f899-4b4c-ab39-f5e90b915176", "content": "g6ZhY3Rpb24ErGNvbm5lY3Rpb25JZKpkeGtDLW10dEhYsWNvbm5lY3Rpb25EZXRhaWxziahjbGllbnRJZKEqrWNvbm5 lY3Rpb25LZXnZKmU3ZDJZd091Z0JhOVZWIWR4a0MtbXR0SFhBWE1KVzZnek1UNUYtNjgzYq5tYXhNZXNzYWdlU2l6Zc1AAK5tYXhJbmJvdW5kUmF0Zcz6r21heE91dGJvdW5kUmF0ZWSsbWF4RnJhb WVTaXplzgAEAACoc2VydmVySWTZPmZyb250ZW5kLjY3OTkuMS51cy1lYXN0LTEtQS5pLTBlY2RlYmVjMmNkMGJlOWExLmU3ZDJZd091Z0JhOVZWsmNvbm5lY3Rpb25TdGF0ZVR0bM4AAdTAr21heEl kbGVJbnRlcnZhbM06mA==", "from_client": false}`
- `result`: the message content, which is either `null` (to drop) or the Base64-encoded content of the message to replace it with (which might just be the original message content)

the way i think it’ll work is that the server will queue all subsequent messages (just in that direction? not sure) until the message has been transformed

test suite to proxy:

TODO (something to do with injecting a message)
