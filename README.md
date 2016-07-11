# [Ably](https://www.ably.io)

## Version: 0.8.26

[![Build Status](https://travis-ci.org/ably/ably-js.png)](https://travis-ci.org/ably/ably-js)

This repo contains the Ably javascript client library, for the browser (including IE8+), Nodejs, React Native, and Cordova.

For complete API documentation, see the [ably documentation](https://ably.io/documentation).

# For node.js

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

### For browsers

Include the Ably library in your HTML:

```html
<script src="https://cdn.ably.io/lib/ably.min.js"></script>
```

The Ably client library follows [Semantic Versioning](http://semver.org/).  To lock into a major or minor verison of the client library, you can specify a specific version number such as http://cdn.ably.io/lib/ably.min-0.8.26.js or http://cdn.ably.io/lib/ably-0.8.26.js for the non-minified version.  See https://github.com/ably/ably-js/tags for a list of tagged releases.

For the real-time library:

```javascript
var realtime = Ably.Realtime;
```

For the rest-only library:

```javascript
var rest = Ably.Rest;
```

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
channel.history({start: ..., end: ..., limit: ..., direction: ...}, function(err, messagesPage) { ...});
```

### Symmetrical end-to-end encrypted payloads on a channel

When a 128 bit or 256 bit key is provided to the library, the `data` attributes of all messages are encrypted and decrypted automatically using that key. The secret key is never transmitted to Ably. See https://www.ably.io/documentation/realtime/encryption

```javascript
// Generate a random 256-bit key for demonstration purposes (in
// practice you need to create one and distribute it to clients yourselves)
Ably.Realtime.Crypto.generateRandomKey(function(err, key) {
	var channel = client.channels.get('channelName', cipher: { key: key })

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
var client = new Ably.Realtime(<key string>)

// using token auth
var client = new Ably.Realtime(<token string>)

// using an Options object, see https://www.ably.io/documentation/realtime/usage#client-options
// which must contain at least one auth option, i.e. at least
// one of: key, token, tokenDetails, authUrl, or authCallback
var client = new Ably.Realtime(<options>)
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
}

// createTokenRequest can take two optional params
// tokenParams: https://www.ably.io/documentation/rest/authentication/#token-params
// authOptions: https://www.ably.io/documentation/rest/authentication/#auth-options
client.auth.createTokenRequest(tokenParams, authOptions, function(err, tokenRequest) { ... });
```

### Fetching your application's stats

```javascript
client.stats(function(err, statsPage) {        // statsPage as PaginatedResult
  statsPage.items                              // array of Stats
  statsPage.items[0].data                      // payload for first message
  statsPage.items.length                       // number of messages in the current page of history
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

## Contributing

1. Fork it
2. When pulling to local, make sure to also pull the `ably-common` repo (`git submodule init && git submodule update`)
3. Create your feature branch (`git checkout -b my-new-feature`)
4. Commit your changes (`git commit -am 'Add some feature'`)
5. Ensure you have added suitable tests and the test suite is passing(`grunt test`)
6. Push to the branch (`git push origin my-new-feature`)
7. Create a new Pull Request

## Releasing

- Make sure you have the closure compiler installed, needed to generate
  the minified library. You can install it with `grunt compiler`
- `grunt release:patch` (or: "major", "minor", "patch", "prepatch")
- `grunt release:deploy`

## License

Copyright (c) 2015 Ably Real-time Ltd, Licensed under the Apache License, Version 2.0.  Refer to [LICENSE](LICENSE) for the license terms.
