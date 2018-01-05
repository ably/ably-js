# [Ably](https://www.ably.io)

A Javascript client library for [Ably Realtime](https://www.ably.io), a realtime data delivery platform.

## Version: 1.0.11

This repo contains the Ably Javascript client library, for the browser (including IE8+), Nodejs, React Native, NativeScript and Cordova.

For complete API documentation, see the [Ably documentation](https://www.ably.io/documentation).

## For node.js

### Installation from npm

    npm install ably

### Usage

For the realtime library:

```javascript
var realtime = require('ably').Realtime;
```

For the rest-only library:

```javascript
var rest = require('ably').Rest;
```

## For browsers

Include the Ably library in your HTML:

```html
<script src="https://cdn.ably.io/lib/ably.min-1.js"></script>
```

The Ably client library follows [Semantic Versioning](http://semver.org/). To lock into a major or minor version of the client library, you can specify a specific version number such as https://cdn.ably.io/lib/ably.min-1.js for all v1.* versions, or https://cdn.ably.io/lib/ably.min-1.0.js for all v1.0.* versions, or you can lock into a single release with https://cdn.ably.io/lib/ably.min-1.0.9.js. Note you can load the non-minified version by omitting `min-` from the URL such as https://cdn.ably.io/lib/ably-1.0.js. See https://github.com/ably/ably-js/tags for a list of tagged releases.

For the realtime library:

```javascript
var realtime = Ably.Realtime;
```

For the REST only library:

```javascript
var rest = Ably.Rest;
```

### For React Native

For React Native, do not use this package. Instead use the [ably-react-native](https://github.com/ably/ably-js-react-native) package, which wraps ably-js and adds react-native-specific dependencies. See [that repo](https://github.com/ably/ably-js-react-native) for install instructions.

### TypeScript support

The TypeScript typings are included in the package and so all you have to do is:

```javascript
 import * as Ably from 'ably';
 let realtime = new Ably.Realtime(options);
```

Additionally, the type definitions are registered with [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/ably).

### Using WebPack

WebPack will search your `node_modules` folder by default, so if you include `ably` in your `package.json` file, when running Webpack the following will allow you to `require` Ably. Alternatively, you can reference the `ably-commonjs.js` static file directly if not in your `node_modules` folder.

```javascript
var Ably = require('ably/browser/static/ably-commonjs.js');
var realtime = new Ably.Realtime(options);
```

If you are using ES6 and or a transpiler that suppots ES6 modules with WebPack, you can include Ably as follows:

```javascript
import Ably from 'ably/browser/static/ably-commonjs.js'
let realtime = new Ably.Realtime(options)
```

## For React Native

See the [ably-js-react-native repo](https://github.com/ably/ably-js-react-native) for React Native usage details.

## For NativeScript

See the [ably-js-nativescript repo](https://github.com/ably/ably-js-nativescript) for NativeScript usage details.

## Using the Realtime API

### Introduction

All examples assume a client has been created as follows:

```javascript
// basic auth with an API key
var client = new Ably.Realtime(<key string>)

// using a token string
var client = new Ably.Realtime(<token string>)

// using an Options object, see https://www.ably.io/documentation/rest/usage#options
// which must contain at least one auth option, i.e. at least
// one of: key, token, tokenDetails, authUrl, or authCallback
var client = new Ably.Realtime(<options>)
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

### Introduction

All examples assume a client and/or channel has been created as follows:

```javascript
// basic auth with an API key
var client = new Ably.Rest(<key string>)

// using token auth
var client = new Ably.Rest(<token string>)

// using an Options object, see https://www.ably.io/documentation/realtime/usage#client-options
// which must contain at least one auth option, i.e. at least
// one of: key, token, tokenDetails, authUrl, or authCallback
var client = new Ably.Rest(<options>)
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

    grunt test

## NodeUnit Tests

Run the NodeUnit test suite

    grunt test:nodeunit

Or run just one or more test files

    grunt test:nodeunit --test spec/realtime/auth.test.js

## Browser Tests

Browser tests are run using [Karma test runner](http://karma-runner.github.io/0.12/index.html).

### To build & run the tests in a single step

    grunt test:karma

### Debugging the tests in your browser with NodeUnit test runner

Simply open [spec/nodeunit.html](./spec/nodeunit.html) in your browser to run the test suite with a nice GUI.

Note: If any files have been added or remove, running the task `grunt requirejs` will ensure all the necessary RequireJS dependencies are loaded into the browser by updating spec/support/browser_file_list.js

### Debugging the tests in a remote browser with NodeUnit test runner

Run the following command to start a local Nodeunit test runner web server

    grunt test:webserver

Open your browser to [http://localhost:3000](http://localhost:3000). If you are usig a remote browser, refer to https://docs.saucelabs.com/reference/sauce-connect/ for instructions on setting up a local tunnel to your Nodeunit runner web server.

### Debugging the tests in your browser with Karma

If you would like to run the tests through Karma, then:

Start a Karma server

    karma server

You can optionally connect your browser to the server, visit http://localhost:9876/

Click on the Debug button in the top right, and open your browser's debugging console.

Then run the tests against the Karma server.  The `test:karma:run` command will concatenate the Ably files beforehand so any changes made in the source will be reflected in the test run.

    grunt test:karma:run

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

When using the test webserver `grunt test:webserver` the following test variables can be configured by appending them as params in the URL such as `http://localhost:3000/nodeunit.html?log_level=4`.

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
3. Create your feature branch (`git checkout -b my-new-feature`)
4. Commit your changes (`git commit -am 'Add some feature'`)
5. Ensure you have added suitable tests and the test suite is passing(`grunt test`)
6. Ensure the [type definitions](https://github.com/ably/ably-js/blob/master/ably.d.ts) have been updated if the public API has changed
7. Push to the branch (`git push origin my-new-feature`)
8. Create a new Pull Request

## Release Process

- Make sure you have the closure compiler installed, needed to generate
  the minified library. You can install it with `grunt compiler`
- `grunt release:patch` (or: "major", "minor", "patch", "prepatch")
- `grunt release:deploy`
- Visit https://github.com/ably/ably-js/tags and add release notes for the release including links to the changelog entry.
- If the [type definitions](https://github.com/ably/ably-js/blob/master/ably.d.ts) have changed, submit a [PR to DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/pull/14524).
- For nontrivial releases: update the ably-js submodule ref in the realtime repo

Warning: if publishing to npm, please use npm version 5.1, as 5.5 has a bug that results in the creation of an invalid package, see https://github.com/ably/ably-js/issues/422 and https://github.com/npm/npm/issues/18870 for more info

## License

Copyright (c) 2017 Ably Real-time Ltd, Licensed under the Apache License, Version 2.0.  Refer to [LICENSE](LICENSE) for the license terms.
