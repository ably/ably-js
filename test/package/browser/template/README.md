# ably-js NPM package test (for browser)

This directory is intended to be used for testing the following aspects of the ably-js NPM package when used in a browser-based app:

- that its exports are correctly configured and provide access to ably-js’s functionality
- that its TypeScript typings are correctly configured and can be successfully used from a TypeScript-based app that imports the package

It contains three files, each of which import ably-js in different manners, and provide a way to briefly exercise its functionality:

- `src/index-default.ts` imports the default ably-js package (`import { Realtime } from 'ably'`).
- `src/index-objects.ts` imports the Objects ably-js plugin (`import { Objects } from 'ably/objects'`).
- `src/index-modular.ts` imports the tree-shakable ably-js package (`import { BaseRealtime, WebSocketTransport, FetchRequest } from 'ably/modular'`).
- `src/ReactApp.tsx` imports React hooks from the ably-js package (`import { useChannel } from 'ably/react'`).

## Why is `ably` not in `package.json`?

The `ably` dependency gets added when we run the repository’s `test:package` package script. That script copies the contents of this `template` directory to a new temporary directory, and then adds the `ably` dependency to the copy. We do this so that we can check this directory’s `package-lock.json` into Git, without needing to modify it whenever ably-js’s dependencies change.

## React hooks tests

To test hooks imported from `ably/react` in React components, we used [Playwright for components](https://playwright.dev/docs/test-components). The main logic sits in `src/ReactApp.tsx`, and `AblyProvider` is configured in `playwright/index.tsx` file based on [this guide](https://playwright.dev/docs/test-components#hooks).

## Package scripts

This directory exposes three package scripts that are to be used for testing:

- `build`: Uses esbuild to create:
  1. a bundle containing `src/index-default.ts` and ably-js;
  2. a bundle containing `src/index-objects.ts` and ably-js.
  3. a bundle containing `src/index-modular.ts` and ably-js.
- `test`: Using the bundles created by `build` and playwright components setup, tests that the code that exercises ably-js’s functionality is working correctly in a browser.
- `typecheck`: Type-checks the code that imports ably-js.
