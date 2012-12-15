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

# Browser

## To build

    cd </path/to/this/repo>/browser

To build the first time, it is necessary to download the Google closure compiler.
This is done with the `tools` target:

    ant tools

To build the browser library and its variants:

    ant


## Usage

For the real-time library:

    var realtime = Ably.Realtime;

