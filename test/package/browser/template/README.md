# ably-js NPM package test (for browser)

This directory is intended to be used for testing the following aspects of the ably-js NPM package when used in a browser-based app:

- that its exports are correctly configured and provide access to ably-js’s functionality
- that its TypeScript typings are correctly configured and can be successfully used from a TypeScript-based app that imports the package

The file `src/index.ts` imports the ably-js package and exports a function which briefly exercises its functionality.

## Why is `ably` not in `package.json`?

The `ably` dependency gets added when we run the repository’s `test:package` package script. That script copies the contents of this `template` directory to a new temporary directory, and then adds the `ably` dependency to the copy. We do this so that we can check this directory’s `package-lock.json` into Git, without needing to modify it whenever ably-js’s dependencies change.

## Package scripts

This directory exposes three package scripts that are to be used for testing:

- `build`: Uses esbuild to create a bundle containing `src/index.ts` and ably-js.
- `test`: Using the bundle created by `build`, tests that the code that exercises ably-js’s functionality is working correctly in a browser.
- `typecheck`: Type-checks the code that imports ably-js.
