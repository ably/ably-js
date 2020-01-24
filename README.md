# [Ably](https://www.ably.io)

[![npm version](https://badge.fury.io/js/ably.svg)](https://badge.fury.io/js/ably)
[![Bower version](https://badge.fury.io/bo/ably.svg)](https://badge.fury.io/bo/ably)

A JavaScript client library for [Ably Realtime](https://www.ably.io), a realtime data delivery platform.

This library currently targets the [Ably 1.1 client library specification](https://www.ably.io/documentation/client-lib-development-guide/features/). You can jump to the '[Known Limitations](#known-limitations)' section to see the features this client library does not yet support or [view our client library SDKs feature support matrix](https://www.ably.io/download/sdk-feature-support-matrix) to see the list of all the available features.

## Supported platforms

This SDK supports the following platforms:

**Browsers:** All major desktop and mobile browsers, including (but not limited to) Chrome, Firefox, IE (only version 8 or newer), Safari on iOS and macOS, Opera, and Android browsers.

**Webpack:** see [using Webpack in browsers](#using-webpack), or [our guide for serverside Webpack](#serverside-usage-with-webpack)

**Node.js:** version 4.5 or newer

**React Native:** see [ably-js-react-native](https://github.com/ably/ably-js-react-native)

**NativeScript:** see [ably-js-nativescript](https://github.com/ably/ably-js-nativescript)

**TypeScript:** see [below](#typescript)


We regression-test the library against a selection of those (which will change over time, but usually consists of the versions that are supported upstream, plus old versions of IE).

However, we aim to be compatible with a much wider set of platforms and browsers than we can possibly test on. That means we'll happily support (and investigate reported problems with) any reasonably-widely-used browser. So if you find any compatibility issues, please do [raise an issue](https://github.com/ably/ably-js/issues) in this repository or [contact Ably customer support](https://support.ably.io) for advice.

Ably-js has fallback mechanisms in order to be able to support older browsers; specifically it supports comet-based connections for browsers that do not support websockets, and this includes JSONP for browsers that do not support cross-origin XHR. Each of these fallback transport mechanisms is supported and tested on all the browsers we test against, even when those browsers do not themselves require those fallbacks. These mean that the library should be compatible with nearly any browser on most platforms.  Any known browser incompatibilities can be found [here](https://github.com/ably/ably-js/issues?q=is%3Aissue+is%3Aopen+label%3A%22compatibility%22).

## Known Limitations

This library currently does not support being the [target of a push notification](https://www.ably.io/documentation/general/push#activate) (i.e. web push)

## Async API style

This library exposes two API variants. Firstly, the original (and presently the default) callback-based API, which follows the usual node.js error-first callback style. Second, a promises-based API. With the promises variant, you can still pass a callback to methods and the callback will work as expected, but if you do not pass a callback, the method will return a promise. The API in use can be selected explicitly by requiring that specific variant when requiring/importing the library (or in the case of the browser version, when instantiating it). The usage instructions below make reference to both variants.

For this library version, and for all future 1.x versions, the callback-based API will be the default, and the promises-based variant will need to be explicitly selected, to avoid breaking backwards compatibility. However, a move to the promises-based variant as the default is possible at the next major release. If you are not handling promises, and want a version of the library that will not start returning promises for calls where you don't pass a callback in future versions, you can explicitly require the callback variant.

#### Version: 1.1.24

The latest stable version of the Ably JavaScript client library is version: 1.1.24 .

For complete API documentation, see the [Ably documentation](https://www.ably.io/documentation).

## For node.js

### Installation from npm

    npm install ably --save

and require as:

```javascript
var Ably = require('ably');
```

For the version of the library where async methods return promises, use `var Ably = require('ably/promises');` instead. For the explicitly-callback-based variant use `require('ably/callbacks')`– see [Async API style](#async-api-style).

For usage, jump to [Using the Realtime API](#using-the-realtime-api) or [Using the REST API](#using-the-rest-api)

#### Serverside usage with webpack

Add 'ably' to `externals` in your webpack config to exclude it from webpack processing, and require and use it in as a external module using require('ably') as above.

## For browsers

Include the Ably library in your HTML:

```html
<script src="https://cdn.ably.io/lib/ably.min-1.js"></script>
```

The Ably client library follows [Semantic Versioning](http://semver.org/). To lock into a major or minor version of the client library, you can specify a specific version number such as https://cdn.ably.io/lib/ably.min-1.js for all v1.* versions, or https://cdn.ably.io/lib/ably.min-1.0.js for all v1.0.* versions, or you can lock into a single release with https://cdn.ably.io/lib/ably.min-1.0.9.js. Note you can load the non-minified version by omitting `min-` from the URL such as https://cdn.ably.io/lib/ably-1.0.js. See https://github.com/ably/ably-js/tags for a list of tagged releases.

For usage, jump to [Using the Realtime API](#using-the-realtime-api) or [Using the REST API](#using-the-rest-api)

### TypeScript

The TypeScript typings are included in the package and so all you have to do is:

```typescript
import * as Ably from 'ably';
let options : Ably.Types.ClientOptions = { key: 'foo' };
let client = new Ably.Realtime(options); /* inferred type Ably.Realtime */
let channel = client.channels.get('feed'); /* inferred type Ably.Types.RealtimeChannel */
```

For the version of the library where async methods return promises, use `import * as Ably from 'ably/promises';` instead. For the explicitly-callback-based variant use `import * as Ably from 'ably/callbacks'` – see [Async API style](#async-api-style).

Intellisense in IDEs with TypeScript support is supported:

![TypeScript suggestions](./resources/typescript-demo.gif)

If you need to explicitly import the type definitions, see [ably.d.ts](./ably.d.ts) (or `promises.d.ts` if you're requiring the library as `ably/promises`).

### Using WebPack

(This applies to using webpack to compile for a browser; for node, see [Serverside usage with webpack](#serverside-usage-with-webpack))

WebPack will search your `node_modules` folder by default, so if you include `ably` in your `package.json` file, when running Webpack the following will allow you to `require('ably')` (or if using typescript or ES6 modules, `import * as Ably from 'ably';`). If your webpack target is set to 'browser', this will automatically use the browser commonjs distribution.

If that doesn't work for some reason (e.g. you are using a custom webpack target), you can reference the `ably-commonjs.js` static file directly: `require('ably/browser/static/ably-commonjs.js');` (or `import * as Ably from 'ably/browser/static/ably-commonjs.js'` for typescript / ES6 modules)

## React Native

See the [ably-js-react-native repo](https://github.com/ably/ably-js-react-native) for React Native usage details.

## NativeScript

See the [ably-js-nativescript repo](https://github.com/ably/ably-js-nativescript) for NativeScript usage details.

## Using the Realtime API

This readme gives some basic examples; for our full API documentation, please go to https://www.ably.io/documentation .

### Introduction

All examples assume a client has been created as follows:

```javascript
// basic auth with an API key
var client = new Ably.Realtime(<key string>)

// using a Client Options object, see https://www.ably.io/documentation/rest/usage#options
// which must contain at least one auth option, i.e. at least
// one of: key, token, tokenDetails, authUrl, or authCallback
var client = new Ably.Realtime(<options>)

// For a version of the library where async methods return promises if
// you don't pass a callback:
var client = new Ably.Realtime.Promise(<options / key string>)

// For the explicitly-callback-based variant (see 'Async API style' above):
var client = new Ably.Rest.Callbacks(<options / key string>)
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
channel.subscribe(function(message) {
  message.name // 'greeting'
  message.data // 'Hello World!'
});
```

Only certain events:

```javascript
channel.subscribe('myEvent', function(message) {
  message.name // 'myEvent'
  message.data // 'myData'
});
```

### Publishing to a channel


```javascript
// Publish a single message with name and data
channel.publish('greeting', 'Hello World!');

// Optionally, you can use a callback to be notified of success or failure
channel.publish('greeting', 'Hello World!', function(err) {
  if(err) {
    console.log('publish failed with error ' + err);
  } else {
    console.log('publish succeeded');
  }
})

// Publish several messages at once
channel.publish([{name: 'greeting', data: 'Hello World!'}, ...], callback);
```

### Querying the History

```javascript
channel.history(function(err, messagesPage) {
  messagesPage                                    // PaginatedResult
  messagesPage.items                              // array of Message
  messagesPage.items[0].data                      // payload for first message
  messagesPage.items.length                       // number of messages in the current page of history
  messagesPage.hasNext()                          // true if there are further pages
  messagesPage.isLast()                           // true if this page is the last page
  messagesPage.next(function(nextPage) { ... });  // retrieves the next page as PaginatedResult
});

// Can optionally take an options param, see https://www.ably.io/documentation/rest-api/#message-history
channel.history({start: ..., end: ..., limit: ..., direction: ...}, function(err, messagesPage) { ...});
```

### Presence on a channel

Getting presence:

```javascript
channel.presence.get(function(err, presenceSet) {
  presenceSet                                     // array of PresenceMessages
});
```
Note that presence#get on a realtime channel does not return a
PaginatedResult, as the library maintains a local copy of the presence set.

Entering (and leaving) the presence set:

```javascript
channel.presence.enter('my status', function(err) {
  // now I am entered
});

channel.presence.update('new status', function(err) {
  // my presence data is updated
});

channel.presence.leave(function(err) {
  // I've left the presence set
});
```

If you are using a client which is allowed to use any clientId --
that is, if you didn't specify a clientId when initializing the
client, and are using basic auth or a token witha wildcard clientId (see
https://www.ably.io/documentation/general/authentication for more information), you
can use

```javascript
channel.presence.enterClient('myClientId', 'status', function(err) { ... });
// and similiarly, updateClient and leaveClient
```


### Querying the Presence History

```javascript
channel.presence.history(function(err, messagesPage) { // PaginatedResult
  messagesPage.items                              // array of PresenceMessage
  messagesPage.items[0].data                      // payload for first message
  messagesPage.items.length                       // number of messages in the current page of history
  messagesPage.hasNext()                           // true if there are further pages
  messagesPage.isLast()                           // true if this page is the last page
  messagesPage.next(function(nextPage) { ... });  // retrieves the next page as PaginatedResult
});

// Can optionally take an options param, see https://www.ably.io/documentation/rest-api/#message-history
channel.presence.history({start: ..., end: ..., limit: ..., direction: ...}, function(err, messagesPage) { ...});
```

### Symmetrical end-to-end encrypted payloads on a channel

When a 128 bit or 256 bit key is provided to the library, the `data` attributes of all messages are encrypted and decrypted automatically using that key. The secret key is never transmitted to Ably. See https://www.ably.io/documentation/realtime/encryption

```javascript
// Generate a random 256-bit key for demonstration purposes (in
// practice you need to create one and distribute it to clients yourselves)
Ably.Realtime.Crypto.generateRandomKey(function(err, key) {
	var channel = client.channels.get('channelName', { cipher: { key: key } })

	channel.subscribe(function(message) {
		message.name // 'name is not encrypted'
		message.data // 'sensitive data is encrypted'
	});

	channel.publish('name is not encrypted', 'sensitive data is encrypted');
})
```

You can also change the key on an existing channel using setOptions (which takes a callback which is called after the new encryption settings have taken effect):
```javascript
channel.setOptions({cipher: {key: <key>}}, function() {
	// New encryption settings are in effect
})
```

## Using the REST API

This readme gives some basic examples. For our full API documentation, please go to https://www.ably.io/documentation .

### Introduction

All examples assume a client and/or channel has been created as follows:

```javascript
// basic auth with an API key
var client = new Ably.Rest(<key string>)

// using a Client Options object, see https://www.ably.io/documentation/realtime/usage#client-options
// which must contain at least one auth option, i.e. at least
// one of: key, token, tokenDetails, authUrl, or authCallback
var client = new Ably.Rest(<options>)

// For a version of the library where async methods return promises if
// you don't pass a callback:
var client = new Ably.Rest.Promise(<options / key string>)

// For the explicitly-callback-based variant (see 'Async API style' above):
var client = new Ably.Rest.Callbacks(<options / key string>)
```

Given:

```javascript
var channel = client.channels.get('test');
```

### Publishing to a channel

```javascript
// Publish a single message with name and data
channel.publish('greeting', 'Hello World!');

// Optionally, you can use a callback to be notified of success or failure
channel.publish('greeting', 'Hello World!', function(err) {
  if(err) {
    console.log('publish failed with error ' + err);
  } else {
    console.log('publish succeeded');
  }
})

// Publish several messages at once
channel.publish([{name: 'greeting', data: 'Hello World!'}, ...], callback);
```

### Querying the History

```javascript
channel.history(function(err, messagesPage) {
  messagesPage                                    // PaginatedResult
  messagesPage.items                              // array of Message
  messagesPage.items[0].data                      // payload for first message
  messagesPage.items.length                       // number of messages in the current page of history
  messagesPage.hasNext()                          // true if there are further pages
  messagesPage.isLast()                           // true if this page is the last page
  messagesPage.next(function(nextPage) { ... });  // retrieves the next page as PaginatedResult
});

// Can optionally take an options param, see https://www.ably.io/documentation/rest-api/#message-history
channel.history({start: ..., end: ..., limit: ..., direction: ...}, function(err, messagesPage) { ...});
```

### Presence on a channel

```javascript
channel.presence.get(function(err, presencePage) { // PaginatedResult
  presencePage.items                              // array of PresenceMessage
  presencePage.items[0].data                      // payload for first message
  presencePage.items.length                       // number of messages in the current page of members
  presencePage.hasNext()                          // true if there are further pages
  presencePage.isLast()                           // true if this page is the last page
  presencePage.next(function(nextPage) { ... });  // retrieves the next page as PaginatedResult
});
```

### Querying the Presence History

```javascript
channel.presence.history(function(err, messagesPage) { // PaginatedResult
  messagesPage.items                              // array of PresenceMessage
  messagesPage.items[0].data                      // payload for first message
  messagesPage.items.length                       // number of messages in the current page of history
  messagesPage.hasNext()                          // true if there are further pages
  messagesPage.isLast()                           // true if this page is the last page
  messagesPage.next(function(nextPage) { ... });  // retrieves the next page as PaginatedResult
});

// Can optionally take an options param, see https://www.ably.io/documentation/rest-api/#message-history
channel.history({start: ..., end: ..., limit: ..., direction: ...}, function(err, messagesPage) { ...});
```

### Generate Token and Token Request

See https://www.ably.io/documentation/general/authentication for an
explanation of Ably's authentication mechanism.

Requesting a token:
```javascript
client.auth.requestToken(function(err, tokenDetails) {
  // tokenDetails is instance of TokenDetails
  // see https://www.ably.io/documentation/rest/authentication/#token-details for its properties

  // Now we have the token, we can send it to someone who can instantiate a client with it:
  var clientUsingToken = new Ably.Realtime(tokenDetails.token);
});

// requestToken can take two optional params
// tokenParams: https://www.ably.io/documentation/rest/authentication/#token-params
// authOptions: https://www.ably.io/documentation/rest/authentication/#auth-options
client.auth.requestToken(tokenParams, authOptions, function(err, tokenDetails) { ... });
```

Creating a token request (for example, on a server in response to a
request by a client using the `authCallback` or `authUrl` mechanisms):

```javascript
client.auth.createTokenRequest(function(err, tokenRequest) {
  // now send the tokenRequest back to the client, which will
  // use it to request a token and connect to Ably
});

// createTokenRequest can take two optional params
// tokenParams: https://www.ably.io/documentation/rest/authentication/#token-params
// authOptions: https://www.ably.io/documentation/rest/authentication/#auth-options
client.auth.createTokenRequest(tokenParams, authOptions, function(err, tokenRequest) { ... });
```

### Fetching your application's stats

```javascript
client.stats(function(err, statsPage) {        // statsPage as PaginatedResult
  statsPage.items                              // array of Stats
  statsPage.items[0].inbound.rest.messages.count; // total messages published over REST
  statsPage.items.length;                      // number of stats in the current page of history
  statsPage.hasNext()                          // true if there are further pages
  statsPage.isLast()                           // true if this page is the last page
  statsPage.next(function(nextPage) { ... });  // retrieves the next page as PaginatedResult
});
```

### Fetching the Ably service time

```javascript
client.time(function(err, time) { ... }); // time is in ms since epoch
```

## Test suite

To run both the NodeUnit & Karma Browser tests, simply run the following command:

    npm test

## NodeUnit Tests

Run the NodeUnit test suite

    npm run test:nodeunit

Or run just one or more test files

    npm run test:nodeunit -- --test spec/realtime/auth.test.js

## Browser Tests

Browser tests are run using [Karma test runner](http://karma-runner.github.io/0.12/index.html).

### To build & run the tests in a single step

    npm run test:karma

### Debugging the tests in your browser with NodeUnit test runner

Simply open [spec/nodeunit.html](./spec/nodeunit.html) in your browser to run the test suite with a nice GUI.

Note: If any files have been added or remove, running the task `npm run requirejs` will ensure all the necessary RequireJS dependencies are loaded into the browser by updating spec/support/browser_file_list.js

### Debugging the tests in a remote browser with NodeUnit test runner

Run the following command to start a local Nodeunit test runner web server

    npm run test:webserver

Open your browser to [http://localhost:3000](http://localhost:3000). If you are using a remote browser, refer to https://docs.saucelabs.com/reference/sauce-connect/ for instructions on setting up a local tunnel to your Nodeunit runner web server.

### Debugging the tests in your browser with Karma

If you would like to run the tests through Karma, then:

Start a Karma server

    karma server

You can optionally connect your browser to the server, visit http://localhost:9876/

Click on the Debug button in the top right, and open your browser's debugging console.

Then run the tests against the Karma server.  The `test:karma:run` command will concatenate the Ably files beforehand so any changes made in the source will be reflected in the test run.

    npm run test:karma:run

### Testing environment variables for Node.js

All tests are run against the sandbox environment by default.  However, the following environment variables can be set before running the Karma server to change the environment the tests are run against.

* `ABLY_ENV` - defaults to sandbox, however this can be set to another known environment such as 'staging'
* `ABLY_REALTIME_HOST` - explicitly tell the client library to use an alternate host for real-time websocket communication.
* `ABLY_REST_HOST` - explicitly tell the client library to use an alternate host for REST communication.
* `ABLY_PORT` - non-TLS port to use for the tests, defaults to 80
* `ABLY_TLS_PORT` - TLS port to use for the tests, defaults to 443
* `ABLY_USE_TLS` - true or false to enable/disable use of TLS respectively
* `ABLY_LOG_LEVEL` - Log level for the client libraries, defaults to 2, 4 is `MICRO`

### Testing environment variables for browser tests

When using the test webserver `npm run test:webserver` the following test variables can be configured by appending them as params in the URL such as `http://localhost:3000/nodeunit.html?log_level=4`.

* `env` - defaults to sandbox, however this can be set to another known environment such as 'staging'
* `realtime_host` - explicitly tell the client library to use an alternate host for real-time websocket communication.
* `host` - explicitly tell the client library to use an alternate host for REST communication.
* `port` - non-TLS port to use for the tests, defaults to 80
* `tls_port` - TLS port to use for the tests, defaults to 443
* `tls` - true or false to enable/disable use of TLS respectively
* `log_level` - Log level for the client libraries, defaults to 2, 4 is `MICRO`

## Support, feedback and troubleshooting

Please visit http://support.ably.io/ for access to our knowledgebase and to ask for any assistance.

You can also view the [community reported Github issues](https://github.com/ably/ably-js/issues).

To see what has changed in recent versions, see the [CHANGELOG](CHANGELOG.md).

#### Browser-specific issues

* ["Unable to parse request body" error when publishing large messages from old versions of Internet Explorer](https://support.ably.io/solution/articles/3000062360-ably-js-unable-to-parse-request-body-error-when-publishing-large-messages-from-old-browsers)

## Contributing

1. Fork it
2. When pulling to local, make sure to also pull the `ably-common` repo (`git submodule init && git submodule update`)
3. Make sure you have installed the right version of Node (see the `.nvmrc` file to find the version of Node required to develop this project)
4. Create your feature branch (`git checkout -b my-new-feature`)
5. Commit your changes (`git commit -am 'Add some feature'`)
   Note: don't commit files generated in `browser/static/*`, unless you are about to make a release.
6. Ensure you have added suitable tests and the test suite is passing(`npm test`)
7. Ensure the [type definitions](https://github.com/ably/ably-js/blob/master/ably.d.ts) have been updated if the public API has changed
8. Ensure you stick to the version of JS used by the library (currently ES3). (The minfication task (`npm run grunt -- closureCompiler:ably.js`) will enforce that you stick to ES3 syntax, but will not enforce that you don't use, for example, new methods)
9. Push to the branch (`git push origin my-new-feature`)
10. Create a new Pull Request

## Release Process

- Make sure the tests are passing in ci for the branch you're building
- Update the CHANGELOG.md with any customer-affecting changes since the last release
- Run `npm run grunt -- release:patch` (or: "major", "minor", "patch", "prepatch")
- Run `npm run grunt -- release:deploy`
- Visit https://github.com/ably/ably-js/tags and add release notes to the release (generally you can just copy the notes you added to the CHANGELOG)
- For nontrivial releases: update the ably-js submodule ref in the realtime repo

## Credits

Automated browser testing supported by

[<img src="./resources/Browserstack-logo@2x.png" width="200px"></img>](https://www.browserstack.com/)

## License

Copyright (c) 2017 Ably Real-time Ltd, Licensed under the Apache License, Version 2.0.  Refer to [LICENSE](LICENSE) for the license terms.
