# [Ably](https://www.ably.com)

[![Features](https://github.com/ably/ably-js/actions/workflows/features.yml/badge.svg)](https://github.com/ably/ably-js/actions/workflows/features.yml)

_[Ably](https://ably.com) is the platform that powers synchronized digital experiences in realtime. Whether attending an event in a virtual venue, receiving realtime financial information, or monitoring live car performance data – consumers simply expect realtime digital experiences as standard. Ably provides a suite of APIs to build, extend, and deliver powerful digital experiences in realtime for more than 250 million devices across 80 countries each month. Organizations like Bloomberg, HubSpot, Verizon, and Hopin depend on Ably’s platform to offload the growing complexity of business-critical realtime data synchronization at global scale. For more information, see the [Ably documentation](https://ably.com/docs)._

[![npm version](https://img.shields.io/npm/v/ably.svg?style=flat)](https://img.shields.io/npm/v/ably.svg?style=flat)

This is a JavaScript client library for Ably Realtime.

This library currently targets the [Ably client library features spec](https://www.ably.com/docs/client-lib-development-guide/features/) Version 1.2. You can jump to the '[Known Limitations](#known-limitations)' section to see the features this client library does not yet support or [view our client library SDKs feature support matrix](https://www.ably.com/download/sdk-feature-support-matrix) to see the list of all the available features.

## Supported platforms

This SDK supports the following platforms:

**Browsers:** All major desktop and mobile browsers, including (but not limited to) Chrome, Firefox, Edge, Safari on iOS and macOS, Opera, and Android browsers. IE is not supported. See compatibility table below for more information on minimum supported versions for major browsers:

| Browser | Minimum supported version | Release date |
| ------- | :-----------------------: | -----------: |
| Chrome  |            58             | Apr 19, 2017 |
| Firefox |            52             |  Mar 7, 2017 |
| Edge    |            79             | Dec 15, 2020 |
| Safari  |            11             | Sep 19, 2017 |
| Opera   |            45             | May 10, 2017 |

**Webpack:** see [using Webpack in browsers](#using-webpack), or [our guide for serverside Webpack](#serverside-usage-with-webpack)

**Node.js:** version 16.x or newer. (1.1.x versions work on Node.js 4.5 or newer, 1.2.x versions work on Node.js 8.17 or newer). We do not currently provide an ESM bundle, please [contact us](https://www.ably.com/contact) if you would would like to use ably-js in a NodeJS ESM project.

**React:** We offer a set of React Hooks which make it seamless to use ably-js in your React application. See the [React Hooks documentation](./docs/react.md) for more details.

**React Native:** We aim to support all platforms supported by React Native. If you find any issues please raise an issue or [contact us](https://www.ably.com/contact).

**NativeScript:** see [ably-js-nativescript](https://github.com/ably/ably-js-nativescript)

**TypeScript:** see [below](#typescript)

**WebWorkers:** The browser bundle supports running in a [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) context. You can also use the [modular variant](#modular-tree-shakable-variant) of the library in Web Workers.

We test the library against a selection of browsers using their latest versions. Please refer to [the test-browser GitHub workflow](./.github/workflows/test-browser.yml) for the set of browsers that currently undergo CI testing.

We regression-test the library against a selection of Node.js versions, which will change over time. We will always support and test against current LTS Node.js versions, and optionally some older versions that are still supported by upstream dependencies. We reserve the right to drop support for non-LTS versions in a non-major release. We will update the `engines` field in [package.json](./package.json) whenever we change the Node.js versions supported by the project. Please refer to [the test-node GitHub workflow](./.github/workflows/test-node.yml) for the set of versions that currently undergo CI testing.

However, we aim to be compatible with a much wider set of platforms and browsers than we can possibly test on. That means we'll happily support (and investigate reported problems with) any reasonably-widely-used browser. So if you find any compatibility issues, please do [raise an issue](https://github.com/ably/ably-js/issues) in this repository or [contact Ably customer support](https://support.ably.com) for advice.

If you require support for older browsers and Node.js, you can use the security-maintained version 1 of the library. Install version 1 via [CDN link](https://cdn.ably.com/lib/ably.min-1.js), or from npm with `npm install ably@1 --save`. It supports IE versions 9 or newer, older versions of major browsers, and Node.js 8.17 or newer. Note that version 1 will only receive security updates and critical bug fixes, and won't include any new features.

For complete API documentation, see the [Ably documentation](https://www.ably.com/docs).

## Installation

### Node.js

    npm install ably --save

and require as:

```javascript
var Ably = require('ably');
```

For usage, jump to [Using the Realtime API](#using-the-realtime-api) or [Using the REST API](#using-the-rest-api).

#### Serverside usage with Webpack

If you are using a version older than 1.2.5 you will need to add 'ably' to `externals` in your Webpack config to exclude it from Webpack processing, and require and use it in as a external module using require('ably') as above.

### For browsers

Include the Ably library in your HTML:

```html
<script src="https://cdn.ably.com/lib/ably.min-1.js"></script>
```

The Ably client library follows [Semantic Versioning](http://semver.org/). To lock into a major or minor version of the client library, you can specify a specific version number such as https://cdn.ably.com/lib/ably.min-1.js for all v1._ versions, or https://cdn.ably.com/lib/ably.min-1.0.js for all v1.0._ versions, or you can lock into a single release with https://cdn.ably.com/lib/ably.min-1.0.9.js. Note you can load the non-minified version by omitting `min-` from the URL such as https://cdn.ably.com/lib/ably-1.0.js. See https://github.com/ably/ably-js/tags for a list of tagged releases.

For usage, jump to [Using the Realtime API](#using-the-realtime-api) or [Using the REST API](#using-the-rest-api).

#### Using Webpack

(This applies to using Webpack to compile for a browser; for Node.js, see [Serverside usage with Webpack](#serverside-usage-with-webpack))

Webpack will search your `node_modules` folder by default, so if you include `ably` in your `package.json` file, when running Webpack the following will allow you to `require('ably')` (or if using typescript or ES6 modules, `import * as Ably from 'ably';`). If your Webpack target is set to 'browser', this will automatically use the browser commonjs distribution.

If that doesn't work for some reason (e.g. you are using a custom Webpack target), you can use one of the solutions below depending on your Webpack version:

- for Webpack 5: you can use alias setting in the Webpack config like this:

  ```javascript
  // webpack.config.js
  const path = require('path');

  module.exports = {
    module: {
      rules: [
        {
          resolve: {
            alias: {
              ably: path.resolve(__dirname, 'node_modules/ably/build/ably.js'),
            },
          },
        },
      ],
    },
  };
  ```

- for Webpack before 5: you can reference the `ably.js` static file directly: `require('ably/build/ably.js');` (or `import * as Ably from 'ably/build/ably.js'` for typescript / ES6 modules).

#### Modular (tree-shakable) variant

Aimed at those who are concerned about their app’s bundle size, the modular variant of the library allows you to create a client which has only the functionality that you choose. Unused functionality can then be tree-shaken by your module bundler.

The modular variant of the library provides:

- a `BaseRealtime` class;
- various plugins that add functionality to a `BaseRealtime` instance, such as `Rest`, `RealtimePresence`, etc.

To use this variant of the library, import the `BaseRealtime` class from `ably/modular`, along with the plugins that you wish to use. Then, pass these plugins to the `BaseRealtime` constructor as shown in the example below:

```javascript
import { BaseRealtime, WebSocketTransport, FetchRequest, RealtimePresence } from 'ably/modular';

const client = new BaseRealtime({
  key: 'YOUR_ABLY_API_KEY' /* Replace with a real key from the Ably dashboard */,
  plugins: {
    WebSocketTransport,
    FetchRequest,
    RealtimePresence,
  },
});
```

You must provide:

- at least one HTTP request implementation; that is, one of `FetchRequest` or `XHRRequest`;
- at least one realtime transport implementation; that is, one of `WebSocketTransport` or `XHRPolling`.

`BaseRealtime` offers the same API as the `Realtime` class described in the rest of this `README`. This means that you can develop an application using the default variant of the SDK and switch to the modular version when you wish to optimize your bundle size.

In order to further reduce bundle size, the modular variant of the SDK performs less logging than the default variant. It only logs:

- messages that have a `logLevel` of 1 (that is, errors)
- a small number of other network events

If you need more verbose logging, use the default variant of the SDK.

For more information about the modular variant of the SDK, see the [generated documentation](https://sdk.ably.com/builds/ably/ably-js/main/typedoc/modules/modular.html) (this link points to the documentation for the `main` branch).

### TypeScript

The TypeScript typings are included in the package and so all you have to do is:

```typescript
import * as Ably from 'ably';

let options: Ably.ClientOptions = { key: 'foo' };
let client = new Ably.Realtime(options); /* inferred type Ably.Realtime */
let channel = client.channels.get('feed'); /* inferred type Ably.RealtimeChannel */
```

Intellisense in IDEs with TypeScript support is supported:

![TypeScript suggestions](./resources/typescript-demo.gif)

If you need to explicitly import the type definitions, see [ably.d.ts](./ably.d.ts).

## NativeScript

See the [ably-js-nativescript repo](https://github.com/ably/ably-js-nativescript) for NativeScript usage details.

## Using the Realtime API

This readme gives some basic examples; for our full API documentation, please go to https://www.ably.com/docs .

### Introduction

All examples assume a client has been created as follows:

```ts
// basic auth with an API key
var client = new Ably.Realtime(key: string);

// using a Client Options object, see https://www.ably.com/docs/rest/usage#client-options
// which must contain at least one auth option, i.e. at least
// one of: key, token, tokenDetails, authUrl, or authCallback
var client = new Ably.Realtime(options: ClientOptions);
```

### Connection

Successful connection:

```javascript
client.connection.on('connected', function() {
  # successful connection
});
```

Failed connection:

```javascript
client.connection.on('failed', function() {
  # failed connection
});
```

### Subscribing to a channel

Given:

```javascript
var channel = client.channels.get('test');
```

Subscribe to all events:

```javascript
channel.subscribe(function (message) {
  message.name; // 'greeting'
  message.data; // 'Hello World!'
});
```

Only certain events:

```javascript
channel.subscribe('myEvent', function (message) {
  message.name; // 'myEvent'
  message.data; // 'myData'
});
```

### Subscribing to a channel with deltas

Subscribing to a channel in delta mode enables [delta compression](https://www.ably.com/docs/realtime/channels/channel-parameters/deltas). This is a way for a client to subscribe to a channel so that message payloads sent contain only the difference (ie the delta) between the present message and the previous message on the channel.

Configuring a channel for deltas is detailed in the [@ably-forks/vcdiff-decoder documentation](https://github.com/ably-forks/vcdiff-decoder#usage).

Beyond specifying channel options, the rest is transparent and requires no further changes to your application. The `message.data` instances that are delivered to your listening function continue to contain the values that were originally published.

If you would like to inspect the `Message` instances in order to identify whether the `data` they present was rendered from a delta message from Ably then you can see if `extras.delta.format` equals `'vcdiff'`.

### Publishing to a channel

```javascript
// Publish a single message with name and data
await channel.publish('greeting', 'Hello World!');

// Publish several messages at once
await channel.publish([{name: 'greeting', data: 'Hello World!'}, ...]);
```

### Querying the History

```javascript
const messagesPage = channel.history()
messagesPage                                   // PaginatedResult
messagesPage.items                             // array of Message
messagesPage.items[0].data                     // payload for first message
messagesPage.items.length                      // number of messages in the current page of history
messagesPage.hasNext()                         // true if there are further pages
messagesPage.isLast()                          // true if this page is the last page
const nextPage = await messagesPage.next();    // retrieves the next page as PaginatedResult

// Can optionally take an options param, see https://www.ably.com/docs/rest-api/#message-history
const messagesPage = await channel.history({start: ..., end: ..., limit: ..., direction: ...});
```

### Presence on a channel

Getting presence:

```javascript
const presenceSet = channel.presence.get();
presenceSet; // array of PresenceMessages
```

Note that presence#get on a realtime channel does not return a
PaginatedResult, as the library maintains a local copy of the presence set.

Entering (and leaving) the presence set:

```javascript
await channel.presence.enter('my status');
// now I am entered

await channel.presence.update('new status');
// my presence data is updated

await channel.presence.leave()
// I've left the presence set
```

If you are using a client which is allowed to use any clientId --
that is, if you didn't specify a clientId when initializing the
client, and are using basic auth or a token witha wildcard clientId (see
https://www.ably.com/docs/general/authentication for more information), you
can use

```javascript
await channel.presence.enterClient('myClientId', 'status');
// and similarly, updateClient and leaveClient
```

### Querying the Presence History

```javascript
const messagesPage = channel.presence.history(); // PaginatedResult
messagesPage.items                               // array of PresenceMessage
messagesPage.items[0].data                       // payload for first message
messagesPage.items.length                        // number of messages in the current page of history
messagesPage.hasNext()                           // true if there are further pages
messagesPage.isLast()                            // true if this page is the last page
const nextPage = await messagesPage.next();      // retrieves the next page as PaginatedResult

// Can optionally take an options param, see https://www.ably.com/docs/rest-api/#message-history
const messagesPage = await channel.presence.history({start: ..., end: ..., limit: ..., direction: ...);
```

### Symmetrical end-to-end encrypted payloads on a channel

When a 128 bit or 256 bit key is provided to the library, the `data` attributes of all messages are encrypted and decrypted automatically using that key. The secret key is never transmitted to Ably. See https://www.ably.com/docs/realtime/encryption

```javascript
// Generate a random 256-bit key for demonstration purposes (in
// practice you need to create one and distribute it to clients yourselves)
const key = await Ably.Realtime.Crypto.generateRandomKey();
var channel = client.channels.get('channelName', { cipher: { key: key } });

channel.subscribe(function (message) {
  message.name; // 'name is not encrypted'
  message.data; // 'sensitive data is encrypted'
});

channel.publish('name is not encrypted', 'sensitive data is encrypted');
```

You can also change the key on an existing channel using setOptions (which completes after the new encryption settings have taken effect):

```javascript
await channel.setOptions({cipher: {key: <key>}});
// New encryption settings are in effect
```

### Message interactions

Message Interactions allow you to interact with messages previously sent to a channel. Once a channel is enabled with Message Interactions, messages received by that channel will contain a unique `timeSerial` that can be referenced by later messages.

Example emoji reaction to a message:

```javascript
function sendReaction(emoji) {
    channel.publish({ name: 'event_name', data: emoji, extras: { ref: { type: "com.ably.reaction", timeserial: "1656424960320-1" } } })
}
```

See https://www.ably.com/docs/realtime/messages#message-interactions for more detail.

### Fallback transport mechanisms

Ably-js has fallback transport mechanisms to ensure its realtime capabilities can function in network conditions (such as firewalls or proxies) that might prevent the client from establishing a WebSocket connection.

The default `Ably.Realtime` client includes these mechanisms by default. If you are using modular variant of the library, you may wish to provide the `BaseRealtime` instance with one or more alternative transport modules, namely `XHRStreaming` and/or `XHRPolling`, alongside `WebSocketTransport`, so your connection is less susceptible to these external conditions. For instructions on how to do this, refer to the [modular variant of the library](#modular-tree-shakable-variant) section.

Each of these fallback transport mechanisms is supported and tested on all the browsers we test against, even when those browsers do not themselves require those fallbacks.

## Using the REST API

This readme gives some basic examples. For our full API documentation, please go to https://www.ably.com/docs .

### Introduction

All examples assume a client and/or channel has been created as follows:

```ts
// basic auth with an API key
var client = new Ably.Rest(key: string);

// using a Client Options object, see https://www.ably.com/docs/realtime/usage#client-options
// which must contain at least one auth option, i.e. at least
// one of: key, token, tokenDetails, authUrl, or authCallback
var client = new Ably.Rest(options: ClientOptions);
```

Given:

```javascript
var channel = client.channels.get('test');
```

### Publishing to a channel

```javascript
// Publish a single message with name and data
try {
  channel.publish('greeting', 'Hello World!');
  console.log('publish succeeded');
} catch (err) {
  console.log('publish failed with error ' + err);
}

// Publish several messages at once
await channel.publish([{name: 'greeting', data: 'Hello World!'}, ...]);
```

### Querying the History

```javascript
const messagesPage = await channel.history();
messagesPage                                // PaginatedResult
messagesPage.items                          // array of Message
messagesPage.items[0].data                  // payload for first message
messagesPage.items.length                   // number of messages in the current page of history
messagesPage.hasNext()                      // true if there are further pages
messagesPage.isLast()                       // true if this page is the last page
const nextPage = await messagesPage.next(); // retrieves the next page as PaginatedResult

// Can optionally take an options param, see https://www.ably.com/docs/rest-api/#message-history
await channel.history({start: ..., end: ..., limit: ..., direction: ...});
```

### Presence on a channel

```javascript
const presencePage = await channel.presence.get() // PaginatedResult
presencePage.items                                // array of PresenceMessage
presencePage.items[0].data                        // payload for first message
presencePage.items.length                         // number of messages in the current page of members
presencePage.hasNext()                            // true if there are further pages
presencePage.isLast()                             // true if this page is the last page
const nextPage = await presencePage.next();       // retrieves the next page as PaginatedResult
```

### Querying the Presence History

```javascript
const messagesPage = channel.presence.history(); // PaginatedResult
messagesPage.items                               // array of PresenceMessage
messagesPage.items[0].data                       // payload for first message
messagesPage.items.length                        // number of messages in the current page of history
messagesPage.hasNext()                           // true if there are further pages
messagesPage.isLast()                            // true if this page is the last page
const nextPage = await messagesPage.next();      // retrieves the next page as PaginatedResult

// Can optionally take an options param, see https://www.ably.com/docs/rest-api/#message-history
const messagesPage = channel.history({start: ..., end: ..., limit: ..., direction: ...});
```

### Getting the status of a channel

```javascript
const channelDetails = await channel.status();
channelDetails.channelId        // The name of the channel
channelDetails.status.isActive  // A boolean indicating whether the channel is active
channelDetails.status.occupancy // Contains metadata relating to the occupants of the channel
```

### Generate Token and Token Request

See https://www.ably.com/docs/general/authentication for an
explanation of Ably's authentication mechanism.

Requesting a token:

```javascript
const tokenDetails = await client.auth.requestToken();
// tokenDetails is instance of TokenDetails
// see https://www.ably.com/docs/rest/authentication/#token-details for its properties

// Now we have the token, we can send it to someone who can instantiate a client with it:
var clientUsingToken = new Ably.Realtime(tokenDetails.token);

// requestToken can take two optional params
// tokenParams: https://www.ably.com/docs/rest/authentication/#token-params
// authOptions: https://www.ably.com/docs/rest/authentication/#auth-options
const tokenDetails = await client.auth.requestToken(tokenParams, authOptions);
```

Creating a token request (for example, on a server in response to a
request by a client using the `authCallback` or `authUrl` mechanisms):

```javascript
const tokenRequest = await client.auth.createTokenRequest();
// now send the tokenRequest back to the client, which will
// use it to request a token and connect to Ably

// createTokenRequest can take two optional params
// tokenParams: https://www.ably.com/docs/rest/authentication/#token-params
// authOptions: https://www.ably.com/docs/rest/authentication/#auth-options
const tokenRequest = await client.auth.createTokenRequest(tokenParams, authOptions);
```

### Fetching your application's stats

```javascript
const statsPage = await client.stats()          // statsPage as PaginatedResult
statsPage.items                                 // array of Stats
statsPage.items[0].inbound.rest.messages.count; // total messages published over REST
statsPage.items.length;                         // number of stats in the current page of history
statsPage.hasNext()                             // true if there are further pages
statsPage.isLast()                              // true if this page is the last page
const nextPage = await statsPage.next();        // retrieves the next page as PaginatedResult
```

### Fetching the Ably service time

```javascript
const time = await client.time(); // time is in ms since epoch
```

### Push activation

Push activation is supported for browser clients, via the Push plugin. In order to use push activation, you must pass in the plugin via client options.

You also need to provide a path to a service worker which will be registered when the client is activated, and will handle receipt of push notifications.

```javascript
import * as Ably from 'ably';
import Push from 'ably/push';

const client = new Ably.Rest({
    ...options,
    pushServiceWorkerUrl: '/my_service_worker.js',
    plugins: { Push }
});
```

Example service worker:

```javascript
// my_service_worker.js
self.addEventListener("push", async (event) => {
  const { notification } = event.data.json();
  self.registration.showNotification(notification.title, notification);
});
```

To register the device to receive push notifications, you must call the `activate` method:

```javascript
await client.push.activate();
```

Once the client is activated, you can subscribe to receive push notifcations on a channel:

```javascript
const channel = client.channels.get('my_push_channel');

// Subscribe the device to receive push notifcations for a channel...
await channel.push.subscribeDevice();

// ...or subscribe all devices associated with the client's cliendId to receive notifcations from the channel
await channel.push.subscribeClient();

// When you no longer need to be subscribed to push notifcations, you can remove the subscription:
await channel.push.unsubscribeDevice();
// Or:
await channel.push.unsubscribeClient();
```

Push activation works with the [Modular variant](#modular-tree-shakable-variant) of the library, but requires you to be using the Rest plugin.

For more information on publishing push notifcations over Ably, see the [Ably push documentation](https://ably.com/docs/push).

## Delta Plugin

From version 1.2 this client library supports subscription to a stream of Vcdiff formatted delta messages from the Ably service. For certain applications this can bring significant data efficiency savings.
This is an optional feature so our

See the [@ably-forks/vcdiff-decoder documentation](https://github.com/ably-forks/vcdiff-decoder#usage) for setup and usage examples.

## Support, feedback and troubleshooting

Please visit http://support.ably.com/ for access to our knowledgebase and to ask for any assistance.

You can also view the [community reported Github issues](https://github.com/ably/ably-js/issues).

To see what has changed in recent versions, see the [CHANGELOG](CHANGELOG.md).

#### Browser-specific issues

- ["Unable to parse request body" error when publishing large messages from old versions of Internet Explorer](https://support.ably.com/solution/articles/3000062360-ably-js-unable-to-parse-request-body-error-when-publishing-large-messages-from-old-browsers).

#### Chrome Extensions
ably-js works out-of-the-box in background scripts for Chrome extensions using manifest v2. However, since manifest v3 background pages are no longer supported so you will need to run ably-js inside a service worker.
If you are using an ably-js realtime client in a service worker, note that in versions of Chrome before 116, active WebSockets would not reset the 30s service worker idle timer, resulting in the client being closed prematurely, however, in versions 116 and above, service workers will stay active as long as a client is connected.
You can ensure that your extension only runs in versions 116 and above by adding the following to your `manifest.json`:

```json
{
  ...
  "minimum_chrome_version": "116",
  ...
}
```

#### Next.js with App Router and Turbopack

If you are using ably-js in your Next.js project with App Router and Turbopack enabled (via running `next dev --turbo`), you may encounter `Failed to compile Module not found` compilation error referencing `./node_modules/keyv/src/index.js` file or see `Critical dependency: the request of a dependency is an expression` warnings for the same `keyv` module.

To fix this, please add `ably` to the `serverComponentsExternalPackages` list in `next.config.js` (read more about this option [here](https://nextjs.org/docs/app/api-reference/next-config-js/serverComponentsExternalPackages)):

```javascript
const nextConfig = {
  // ...
  experimental: {
    serverComponentsExternalPackages: ['ably'],
  },
};
```

The issue is coming from the fact that when using App Router specifically dependencies used inside Server Components and Route Handlers will automatically be bundled by Next.js. This causes issues with some packages, usually the ones that have complex `require` statements, for example, requiring some packages dynamically during runtime. `keyv` is one of those packages as it uses `require` statement dynamically when requiring its adapters (see [code in repo](https://github.com/jaredwray/keyv/blob/main/packages/keyv/src/index.ts#L102)):

`keyv` ends up being one of `ably-js`'s upstream dependencies for node.js bundle, which causes the errors above when using it with Next.js App Router.

Using `serverComponentsExternalPackages` opt-outs from using Next.js bundling for specific packages and uses native Node.js `require` instead.
This is a common problem in App Router for a number of packages (for example, see next.js issue [vercel/next.js#52876](https://github.com/vercel/next.js/issues/52876)), and using `serverComponentsExternalPackages` is the recommended approach here.

## Contributing

For guidance on how to contribute to this project, see the [CONTRIBUTING.md](CONTRIBUTING.md).

## Credits

Automated browser testing supported by

[<img src="./resources/Browserstack-logo@2x.png" width="200px"></img>](https://www.browserstack.com/)
