# Thoughts on a man-in-the-middle-server for replacing some private API usage

**Note:** Most of the contents of this note are now better explained in [this RFC](https://ably.atlassian.net/wiki/x/IYDItQ); keeping this note around for now because there are some details I didn’t include there for brevity.

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

It’s a mature piece of software, too, currently on something like version 12, seems to be actively developed.

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
- run mitmproxy with `mitmdump --set stream_large_bodies=1 --mode local:node -s test/interception-proxy/src/mitmproxy_addon.py`
- run Node tests with `NODE_EXTRA_CA_CERTS=~/.mitmproxy/mitmproxy-ca-cert.pem npm run test:node`
- to connect to the control API for now, use `websocat ws://localhost:8001`

TODO (something to do with injecting a message)

TODO need to figure out how it’ll work when running across multiple test cases — how to distinguish between different connections (e.g. ignoring ones from accidental lingering clients)

## mitmproxy limitations

- sounds like [you can’t intercept PING / PONG frames](https://github.com/mitmproxy/mitmproxy/blob/8cf0cba1cb6e87f1cf48789e90526b75caa5436d/docs/src/content/concepts-protocols.md?plain=1#L56) — this might be an issue. TODO double check whether our tests _currently_ make use of ping / pong (I don't think they do)

### mitmproxy and Comet

Evgenii said that we perhaps don't need to worry about Comet for now (i.e. if this doesn't work out then I’ll try running the test suite with just websockets)

see https://docs.mitmproxy.org/stable/overview-features/#streaming

note that you can't manipulate streamed responses; is that an issue? in web i don't think we stream any more; what about in Node?

## Replacing a few usages of private API in tests

- `test/realtime/connection.test.js` - spies on `transport.send` to listen for `MESSAGE`, check its properties, and then continue the test

## JSON-RPC notifications sent by our little mitmproxy addon when running

It connects to the control API described below and sends a notification, method `mitmproxyReady`, no params.

## JSON-RPC methods implemented in TypeScript proxy server

Implemented via text WebSocket messages exchanged between proxy and test suite. The WebSocket server is run by the proxy at `http://localhost:8001`.

### `startInterception`

The test suite calls this method on the proxy at the start of the test suite. It:

- results in an error if there is already an active test suite
- marks the WebSocket connection as belonging the active test suite (there is currently no way to undo this; to set a new active test suite you must restart the proxy)
- sets up a proxy for intercepting traffic (this may require cooperation from the tests; see `mode` below)

Request params is one of the following objects:

- `{ 'mode': 'local', 'pid': number }`: transparently intercept traffic from the process with the given PID (note that this is currently only used on macOS; in Linux we do interception by UID, see test-node.yml workflow for now)
- `{ 'mode': 'proxy' }`: run an HTTP proxy which listens on port 8080

Response result is an empty object.

### `transformInterceptedMessage`

The proxy calls this method on the active test suite each time a WebSocket message is intercepted. The test suite must return a result telling the proxy what to do with the message. Subsequent messages intercepted on that WebSocket connection, in the direction described by `fromClient`, will be queued pending the test suite’s reply.

Request params is an object with the following properties:

- `id`: a unique identifier for this message
- `connectionID`: a unique identifer for the intercepted WebSocket connection that this message belongs to
- `type`:
  - `binary` if the intercepted message is of Binary type
  - `text` if it is of Text type
- `data`: the data of the intercepted WebSocket message
  - if `type` is `binary`, then this value is Base64-encoded
- `fromClient`: describes the direction in which the intercepted message was sent

Response result is one of the following objects:

- `{ "action": "drop" }`: this will cause the proxy to drop the intercepted message
- `{ "action": "replace", "type": "binary", "data": "(…)" }`: this will cause the proxy to replace the intercepted message with a message of Binary type whose data is the result of Base64-decoding the `data` property
- `{ "action": "replace", "type": "text", "data": "(…)" }`: this will cause the proxy to replace the intercepted message with a message of Text type whose data is the value of the `data` property

### Writing a proxy that sits behind mitmproxy in order to control WebSocket connection lifetime

The idea is that we’ll build a proxy (i.e. something that mitmproxy knows how to tunnel WebSocket requests through), which will be the thing that actually manages the lifetime of the WebSocket connection to the client. And then, if it turns out that for some other reason we can’t use mitmproxy, we can just give up on interception and instead add a mode for this server to work as a reverse proxy.

And, as a bonus, I can write this server in TypeScript, which means not having to battle with Python.

OK, I’ve pulled across the code, now I need to write a proxy and figure out how to make mitmproxy target it.

So, how do we get mitmproxy to intercept everything using `local` mode, but then send it upstream to another proxy? Let’s play around.

1. start an mitmproxy that acts as a normal HTTP proxy (this mimics the proxy we’ll eventually implement ourselves): `mitmproxy --listen-port 8081`

1. start an mitmproxy in `local` mode that intercepts `curl` traffic: `mitmproxy --mode local:curl`. Now the question is how do we make this one forward to our upstream proxy (i.e. http://localhost:8081)? The only functionality I can see in mitmproxy for forwarding to an upstream proxy is the [upstream proxy mode](https://docs.mitmproxy.org/stable/concepts-modes/#upstream-proxy), but that’s a mode; is it mutually exclusive from `local` mode? Let’s try `mitmproxy --mode local:curl --mode upstream:http://localhost:8081`.

OK, [maintainer replied to my question](https://github.com/mitmproxy/mitmproxy/discussions/6786#discussioncomment-9044517) saying that’s not possible:

> This commands starts two proxy modes: First, proxy all local cURL traffic. Second, spawn an HTTP proxy on port 8080 that will forward all traffic to another HTTP proxy upstream at `localhost:8081`. Proxy modes are not "interconnected". There currently is no (easy) way to use an upstream proxy with local redirect mode.

So, we can’t use this TS server as a proxy server. What about if we write it as an application server? Either configuring the test suite to use it directly, or configuring mitmproxy to intercept and rewrite the destination server.

How would we do the latter? Can we do [this example](https://docs.mitmproxy.org/stable/addons-examples/#http-redirect-requests) ("redirect HTTP requests to another server"), but somehow for WebSocket?

Let's run an application server inside the server I created, then take it from there.

OK, have got mitmproxy set up to intercept in local mode and then change the upstream server to my local app server. It seems to be doing that successfully (tested in websocat). Run with:

`mitmdump --set stream_large_bodies=1 --mode local:websocat -s test/mitmproxy_addon_2.py` (or `local:node` for test suite)

Now we need to set it to grab the original host so that it can open a connection to it. Let’s set a header? So I think that in normal proxy usage things are different — I think the proxy uses the `Host` header (which the agent that forwarded it the request doesn’t modify) to know where to forward to. But presumably mitmproxy is modifying that header.

But how does a proxy know what scheme to use? i.e. whether to open with HTTPS or not. Here’s ChatGPT:

> Yes, a proxy can determine whether to use HTTPS (HTTP over TLS) to communicate with the upstream server based on several factors:
>
> 1. **Protocol Detection**: The proxy can examine the initial request from the client to determine if it's an HTTPS request. If the request uses the HTTPS protocol (`https://`), the proxy can infer that it needs to establish an HTTPS connection with the upstream server.
>
> 2. **Explicit Configuration**: The proxy can be configured explicitly to use HTTPS for certain URLs or domains. This configuration tells the proxy to always use HTTPS when forwarding requests to these destinations.
>
> 3. **Forwarded Protocol Header**: Some proxies use a "Forwarded" or similar header to indicate the original protocol (HTTP or HTTPS) used by the client. This header can be used by the proxy to determine whether to use HTTPS when communicating with the upstream server.
>
> 4. **Environment Variables**: In some setups, environment variables or other configuration mechanisms can be used to indicate whether HTTPS should be used. The proxy can check these variables to make the decision.
>
> The exact method used depends on the proxy software and its configuration. However, proxies typically have mechanisms in place to determine whether to use HTTPS when communicating with upstream servers.

The `Forwarded` header isn’t defined in HTTP spec, but rather in another RFC. See [MDN docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Forwarded).

So let’s have:

- `Ably-Test-Host`: like `Host`
- `Ably-Test-Proto`: either `ws` or `wss`

## Notes from Thu 4 Apr that I didn’t previously incorporate here

### About managing WebSocket connection lifetime

hmm, all the test things are saying

```
  1) realtime/auth
       auth_token_expires_with_web_socket_binary_transport:

      Verify correct disconnect statusCode
      + expected - actual

      -400
      +401
```

(why is the test suite sometimes just hanging?)

OK, I think there's an actual issue here. What's happening is that the client is receiving the CONNECTED protocol message, then we intercept the DISCONNECTED but the server closes the connection before we have a chance to process the DISCONNECTED, so what ends up happening is that the client sees the close before the disconnected and we end up with the wrong status code.

so for this to work we'd want to delay:

- the delivery of the `CLOSE` frame from the server to the client
- "passing on" the server’s closing of the TCP connection (my TCP knowledge is shaky here so I don't know what that means exactly)

until after we've delivered the DISCONNECTED

is this possible in mitmproxy? would it have been possible in that kotlin thing?

the problem is that mitmproxy doesn't work at a frame level AFAIK

what we want to do is when mitmproxy finds out a websocket connection has been closed by server, to keep _its_ websocket connection with the client open until it's delivered all the stuff from the server, then pass along the `CLOSE` frame and close the connection

is there a proper way to do with with mitmproxy? is there a hack way to do it? (will ask)

this is how mitmproxy handles a connection closure: https://github.com/mitmproxy/mitmproxy/blob/8cf0cba1cb6e87f1cf48789e90526b75caa5436d/mitmproxy/proxy/layers/websocket.py#L202-L215 — not sure exactly what's happening here but it seems to be immediately doing _something_ with the close event...?

`yield ws.send2(ws_event)` and `yield commands.CloseConnection(ws.conn)` (don’t know what the difference is)

OK, I've [asked about this in mitmproxy discussions](https://github.com/mitmproxy/mitmproxy/discussions/6784)

### About Comet

see https://docs.mitmproxy.org/stable/overview-features/#streaming

note that you can't manipulate streamed responses; is that an issue? in web i don't think we stream any more; what about in Node?

start 09:48 with `--set stream_large_bodies=1`
