# [Ably](https://www.ably.io)

## Version 0.8.2

[![Build Status](https://travis-ci.org/ably/ably-js.png)](https://travis-ci.org/ably/ably-js)

This repo contains the ably javascript client libraries, both for the browser and nodejs.

For complete API documentation, see the [ably documentation](https://ably.io/documentation).

# For node.js

## Installation

### From npm

    npm install ably-js

### From a git url

    npm install <git url>

### From a local clone of this repo

    cd </path/to/this/repo>
    npm install

## Usage

### With Node.js

For the realtime library:

```javascript
var realtime = require('ably-js').Realtime;
```

For the rest-only library:

```javascript
var rest = require('ably-js').Rest;
```

### With the Browser library

Include the Ably library in your HTML:

```html
<script src="https://cdn.ably.io/lib/ably.min.js"></script>
```

The Ably client library follows [Semantic Versioning](http://semver.org/).  To lock into a major or minor verison of the client library, you can specify a specific version number such as http://cdn.ably.io/lib/ably.min-0.8.2.js or http://cdn.ably.io/lib/ably-0.8.2.js for the non-minified version.  See https://github.com/ably/ably-js/tags for a list of tagged releases.

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

// using token auth
var client = new Ably.Realtime(<token string>)
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
channel.publish('greeting', 'Hello World!')
```

### Querying the History

```javascript
channel.history(function(err, messagesPage) {
  messagesPage                                    // PaginatedResult
  messagesPage.items                              // array of Message
  messagesPage.items[0].data                      // payload for first message
  messagesPage.items.length                       // number of messages in the current page of history
  messagesPage.next(function(nextPage) { ... });  // retrieves the next page as PaginatedResult
  messagesPage.next == undefined                  // there are no more pages
});
```

### Presence on a channel

```javascript
channel.presence.get(function(err, presenceSet) {
  presenceSet                                     // array of PresenceMessages
});

channel.presence.enter('my status', function() {
  // now I am entered
});
```
Note that presence#get on a realtime channel does not return a
PaginatedResult, as the library maintains a local copy of the presence set.

### Querying the Presence History

```javascript
channel.presence.history(function(err, messagesPage) { // PaginatedResult
  messagesPage.items                              // array of PresenceMessage
  messagesPage.items[0].data                      // payload for first message
  messagesPage.items.length                       // number of messages in the current page of history
  messagesPage.next(function(nextPage) { ... });  // retrieves the next page as PaginatedResult
  messagesPage.next == undefined                  // there are no more pages
});
```

## Using the REST API

### Introduction

All examples assume a client and/or channel has been created as follows:

```javascript
// basic auth with an API key
var client = new Ably.Realtime(<key string>)

// using token auth
var client = new Ably.Realtime(<token string>)
```

Given:

```javascript
var channel = client.channels.get('test');
```

### Publishing to a channel

```javascript
channel.publish('greeting', 'Hello World!')
```

### Querying the History

```javascript
channel.history(function(err, messagesPage) {
  messagesPage                                    // PaginatedResult
  messagesPage.items                              // array of Message
  messagesPage.items[0].data                      // payload for first message
  messagesPage.items.length                       // number of messages in the current page of history
  messagesPage.next(function(nextPage) { ... });  // retrieves the next page as PaginatedResult
  messagesPage.next == undefined                  // there are no more pages
});
```

### Presence on a channel

```javascript
channel.presence.get(function(err, presencePage) { // PaginatedResult
  presencePage.items                              // array of PresenceMessage
  presencePage.items[0].data                      // payload for first message
  presencePage.items.length                       // number of messages in the current page of members
  presencePage.next(function(nextPage) { ... });  // retrieves the next page as PaginatedResult
  presencePage.next == undefined                  // there are no more pages
});
```

### Querying the Presence History

```javascript
channel.presence.history(function(err, messagesPage) { // PaginatedResult
  messagesPage.items                              // array of PresenceMessage
  messagesPage.items[0].data                      // payload for first message
  messagesPage.items.length                       // number of messages in the current page of history
  messagesPage.next(function(nextPage) { ... });  // retrieves the next page as PaginatedResult
  messagesPage.next == undefined                  // there are no more pages
});
```

### Generate Token and Token Request

```javascript
client.auth.requestToken(function(err, tokenDetails) {
  // tokenDetails is instance of TokenDetails
  token_details.token // token string, eg 'xVLyHw.CLchevH3hF....MDh9ZC_Q'
});
var clientUsingToken = new Ably.Rest(token_details.token);

client.auth.createTokenRequest(function(err, tokenRequest) {
  tokenRequest.keyName     // name of key used to derive token
  tokenRequest.clientId    // name of a clientId to be bound to the token
  tokenRequest.ttl         // time to live for token, in ms
  tokenRequest.timestamp   // timestamp of this request, in ms since epoch
  tokenRequest.capability  // capability string for this token
  tokenRequest.nonce       // non-replayable random string
  tokenRequest.mac         // HMAC of these params, generated with keyValue
```

### Fetching your application's stats

```javascript
client.stats(function(err, statsPage) {        // statsPage as PaginatedResult
  statsPage.items                              // array of Stats
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

To see what has changed in recent versions of Bundler, see the [CHANGELOG](CHANGELOG.md).

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Ensure you have added suitable tests and the test suite is passing(`grunt test`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create a new Pull Request

## License

Copyright (c) 2015 Ably Real-time Ltd, Licensed under the Apache License, Version 2.0.  Refer to [LICENSE](LICENSE) for the license terms.
