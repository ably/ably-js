# Contributing to ably-js

## Contributing

1. Fork it
2. When pulling to local, make sure to also pull the `ably-common` repo (`git submodule init && git submodule update`)
3. Create your feature branch (`git checkout -b my-new-feature`)
4. Commit your changes (`git commit -am 'Add some feature'`)
   Note: don't commit files generated in `browser/static/*`, unless you are about to make a release.
5. Ensure you have added suitable tests and the test suite is passing(`npm test`)
6. Ensure the [type definitions](https://github.com/ably/ably-js/blob/main/ably.d.ts) have been updated if the public API has changed
7. Ensure you stick to the version of JS used by the library (currently ES3). (The minfication task (`npm run grunt -- closureCompiler:ably.js`) will enforce that you stick to ES3 syntax, but will not enforce that you don't use, for example, new methods)
8. Push the branch (`git push origin my-new-feature`)
9. Create a new Pull Request

## Release Process

1. Make sure the tests are passing in CI for the branch you're building
2. Update the CHANGELOG.md with any customer-affecting changes since the last release
3. Run `npm run grunt -- release:patch` (or: "major", "minor", "patch", "prepatch") - creates commit and local tag
4. Run `npm run grunt -- release:deploy` (requires specific directory structure outside of this repository - this will be documented in more detail but, for now, inspect [Gruntfile.js](Gruntfile.js) for details) - pushes commit and tag, then publishes to the Ably CDN
5. Run `npm publish .` (should require OTP) - publishes to NPM
6. Visit https://github.com/ably/ably-js/tags and add release notes to the release (generally you can just copy the notes you added to the CHANGELOG)
7. For nontrivial releases: update the ably-js submodule ref in the realtime repo

## Test suite

To run both the Mocha & Karma Browser tests, simply run the following command:

    npm test

## Mocha Tests

Run the Mocha test suite

    npm run test:mocha

Or run just one or more test files

    npm run test:mocha -- --test spec/realtime/auth.test.js

## Browser Tests

Browser tests are run using [Karma test runner](http://karma-runner.github.io/0.12/index.html).

### To build & run the tests in a single step

    npm run test:karma

### Debugging the tests in a remote browser with Mocha test runner

Run the following command to start a local Mocha test runner web server

    npm run test:webserver

Open your browser to [http://localhost:3000](http://localhost:3000). If you are using a remote browser, refer to https://docs.saucelabs.com/reference/sauce-connect/ for instructions on setting up a local tunnel to your Mocha runner web server.

Note: If any files have been added or remove, running the task `npm run requirejs` will ensure all the necessary RequireJS dependencies are loaded into the browser by updating spec/support/browser_file_list.js

### Debugging the tests in your browser with Karma

If you would like to run the tests through Karma, then:

Start a Karma server

    karma server

You can optionally connect your browser to the server, visit http://localhost:9876/

Click on the Debug button in the top right, and open your browser's debugging console.

Then run the tests against the Karma server. The `test:karma:run` command will concatenate the Ably files beforehand so any changes made in the source will be reflected in the test run.

    npm run test:karma:run

### Testing environment variables for Node.js

All tests are run against the sandbox environment by default. However, the following environment variables can be set before running the Karma server to change the environment the tests are run against.

- `ABLY_ENV` - defaults to sandbox, however this can be set to another known environment such as 'staging'
- `ABLY_REALTIME_HOST` - explicitly tell the client library to use an alternate host for real-time websocket communication.
- `ABLY_REST_HOST` - explicitly tell the client library to use an alternate host for REST communication.
- `ABLY_PORT` - non-TLS port to use for the tests, defaults to 80
- `ABLY_TLS_PORT` - TLS port to use for the tests, defaults to 443
- `ABLY_USE_TLS` - true or false to enable/disable use of TLS respectively
- `ABLY_LOG_LEVEL` - Log level for the client libraries, defaults to 2, 4 is `MICRO`

### Testing environment variables for browser tests

When using the test webserver `npm run test:webserver` the following test variables can be configured by appending them as params in the URL such as `http://localhost:3000/mocha.html?log_level=4`.

- `env` - defaults to sandbox, however this can be set to another known environment such as 'staging'
- `realtime_host` - explicitly tell the client library to use an alternate host for real-time websocket communication.
- `host` - explicitly tell the client library to use an alternate host for REST communication.
- `port` - non-TLS port to use for the tests, defaults to 80
- `tls_port` - TLS port to use for the tests, defaults to 443
- `tls` - true or false to enable/disable use of TLS respectively
- `log_level` - Log level for the client libraries, defaults to 2, 4 is `MICRO`
