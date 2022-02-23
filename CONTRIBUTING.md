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
2. Create a new branch for the release, for example `release/1.2.3`
3. Update the CHANGELOG.md with any customer-affecting changes since the last release and add this to the git index
4. Run `npm version <VERSION_NUMBER> --no-git-tag-version` with the new version and add the changes to the git index
5. Create a PR for the release branch
6. Once the release PR is landed to the `main` branch, checkout the `main` branch locally (remember to pull the remote changes) and run `npm run build`
7. Run `git tag <VERSION_NUMBER>` with the new version and push the tag to git
8. Ensure that the infrastructure repository is in the same directory as `ably-js` and is up to date with the remote main branch
9. Run `npm run grunt -- release:deploy` (requires the SDKDeveloper AWS role) - pushes commit and tag, then publishes to the Ably CDN
10. Run `npm publish .` (should require OTP) - publishes to NPM
11. Visit https://github.com/ably/ably-js/tags and add release notes to the release (generally you can just copy the notes you added to the CHANGELOG)
12. For nontrivial releases: update the ably-js submodule ref in the realtime repo
13. Update the [Ably Changelog](https://changelog.ably.com/) (via [headwayapp](https://headwayapp.co/)) with these changes (again, you can just copy the notes you added to the CHANGELOG)

## Test suite

To run the Mocha tests, simply run the following command:

    npm test

## Mocha Tests

Run the Mocha test suite

    npm run test:node

Or run just one or more test files

    npm run test:node -- --test=spec/realtime/auth.test.js

### Debugging the mocha tests locally with a debugger

Run the following command to launch tests with the debugger enabled. The tests will block until you attach a debugger.

    node --inspect-brk=9229 node_modules/.bin/grunt test:node

Alternatively you can also run the tests for single file

    node --inspect-brk=9229 node_modules/.bin/grunt test:node --test=test/spec/presence.test.js

The included vscode launch config allows you to launch and attach the debugger in one step, simply open the test
file you want to run and start debugging. Note that breakpoint setting for realtime code will be within the
browser/static directory, not the raw source files, and breakpoints in files under spec/test should work directly.

### Debugging the tests in a browser with Mocha test runner

Run the following command to start a local Mocha test runner web server

    npm run test:webserver

Open your browser to [http://localhost:3000](http://localhost:3000). If you are using a remote browser, refer to https://docs.saucelabs.com/reference/sauce-connect/ for instructions on setting up a local tunnel to your Mocha runner web server.

Note: If any files have been added or remove, running the task `npm run requirejs` will ensure all the necessary RequireJS dependencies are loaded into the browser by updating spec/support/browser_file_list.js

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
