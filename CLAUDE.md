# CLAUDE.md

Guidance for coding agents (and humans) working in this repository.

## Repository Overview

ably-js is the Ably realtime and REST client library for JavaScript/TypeScript, targeting browsers, Node.js, and React Native. The public API surface is defined in [ably.d.ts](./ably.d.ts). Source lives in `src/` (`common/` for shared client logic, `platform/` for platform-specific code and React hooks).

## Commands

```bash
npm run build          # Full build (webpack; slow). Platform-specific: build:node, build:browser, ...
npm test               # Build + run the Mocha test suite
npm run test:node -- test/realtime/auth.test.js   # Run one test file
npm run test:node -- --grep=test_name_here        # Run tests matching a pattern
npm run lint           # ESLint (lint:fix to autofix)
npm run format         # Prettier write (format:check to verify)
npm run docs           # Generate TypeDoc from ably.d.ts
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full test-suite, debugging, and release documentation.

## Coding Conventions

### Error messages and remediations

Errors constructed by the SDK (`ErrorInfo` / `PartialErrorInfo`) carry a `message` and, in most cases, a `remediation` (see the `ErrorInfo.remediation` docstring in [ably.d.ts](./ably.d.ts)). The two fields have distinct jobs:

- `message` says **what went wrong**: the failure and the condition that triggered it, written declaratively.
- `remediation` says **how to fix it**: the first thing the developer (or coding agent) reading the error should do, written imperatively. It must be actionable without further lookup.

For example:

```javascript
message: 'authUrl response is missing a Content-Type header',
remediation: 'Set a Content-Type response header on your authUrl endpoint: application/json for a TokenDetails/TokenRequest object, text/plain for a token string, or application/jwt for a JWT.',
```

#### When to add a remediation

Add a remediation to every SDK-originating throw site that a user of the public API can plausibly reach, provided it adds concrete value beyond the message: it names the exact fix (the API call, `ClientOptions` field, or config change), forecasts a server-side or dashboard-level wall the SDK cannot see from inside the process, or points at a diagnostic.

Do not add a remediation when:

- The site is only reachable internally, not via the public API. Leave a short comment saying so instead.
- The error is relayed from the server rather than authored by the SDK, so the SDK cannot know the remediation.
- All you can write is a rewording of the message. Improve the `message` instead; a remediation that restates the message is noise.

#### Writing rules

- **Accuracy is non-negotiable.** Verify every claim against the code path the error actually fires on, and against the Ably docs. A wrong remediation is worse than none: it sends the reader down a path the SDK has told them is correct.
- Never recommend a call that itself throws or errors in the state the error fires in. If one of the offered remedies errors when misapplied, say so in one line.
- Reference only public API, named exactly as the caller sees it (`presence.enterClient`, `ClientOptions.defaultTokenParams`), never internal identifiers or unshipped features.
- One instruction per sentence, separated by full stops rather than semicolons. Put facts in sentences, not parentheticals. No markdown or links: the string renders raw in consoles and logs.
- Phrase external-tool diagnostics conditionally ("If you have the Ably CLI installed, ..."), never imperatively, since the reader may not have the tool.
- Keep it concise, typically one to four sentences, and keep the wording consistent with sibling errors in the same family.
