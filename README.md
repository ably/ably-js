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

For the real-time library:

    var realtime = require('ably-js').Realtime;

For the rest-only library:

    var rest = require('ably-js').Rest

## Tests

To run the test suite:

    nodeunit test/rest/all.js

    nodeunit test/realtime/all.js

# Browser

## To build

    cd </path/to/this/repo>

To build the first time, it is necessary to download the Google closure compiler.
This is done with the `compiler` target:

    grunt compiler

To build the browser library and its variants:

    grunt


## Usage

For the real-time library:

    var realtime = Ably.Realtime;


## Tests

To run the test suite:

    test/browser-server

Visit http://localhost:8092/ to run the tests in your browser

# Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Ensure you have test coverage for new features and current test suites are still passing
4. Commit your changes (`git commit -am 'Add some feature'`)
5. Push to the branch (`git push origin my-new-feature`)
6. Create new Pull Request
