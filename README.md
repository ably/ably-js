# ably-js

This repo contains the ably javascript client libraries, both for the browser and node.js.

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

For the real-time library:

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

The Ably client library follows [Semantic Versioning](http://semver.org/).  To lock into a major or minor verison of the client library, you can specify a specific version number such as http://cdn.ably.io/lib/ably.min-0.7.js or http://cdn.ably.io/lib/ably-0.7.js for the non-minified version.  See https://github.com/ably/ably-js/tags for a list of tagged releases.

For the real-time library:

```javascript
var realtime = Ably.Realtime;
```

For the rest-only library:

```javascript
var rest = Ably.Rest;
```

## Test suite

To run both the NodeUnit & Karma Browser tests, simply run the following command:

    grunt test

## NodeUnit Tests

Run the NodeUnit test suite

    grunt test:nodeunit

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

### Testing environment variables

All tests are run against the sandbox environment by default.  However, the following environment variables can be set before running the Karma server to change the environment the tests are run against.

* `ABLY_ENV` - defaults to sandbox, however this can be set to another known environment such as 'staging'
* `ABLY_REALTIME_HOST` - explicitly tell the client library to use an alternate host for real-time websocket communication.
* `ABLY_REST_HOST` - explicitly tell the client library to use an alternate host for REST communication.
* `ABLY_PORT` - non-TLS port to use for the tests, defaults to 80
* `ABLY_TLS_PORT` - TLS port to use for the tests, defaults to 443


# Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Ensure you have test coverage for new features and current test suites are still passing
4. Commit your changes (`git commit -am 'Add some feature'`)
5. Push to the branch (`git push origin my-new-feature`)
6. Create new Pull Request
