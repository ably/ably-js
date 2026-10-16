# Temporal REST plugin: decision log

This log records the key decisions made while implementing the Ably REST SDK plugin for Temporal described in
[AITRFC-029](https://ably.atlassian.net/wiki/spaces/AI/pages/5488541698/AITRFC-029+Ideas+for+supporting+developers+building+with+Ably+on+Temporal)
("Non-streamed content via Ably REST SDK plugin"). Each entry gives the decision, the reasoning, and the
alternatives that were considered. Entries marked **(open)** are worth a second opinion before release.

## Scope

### 1. Only the REST plugin idea from the RFC is implemented

The RFC lists several ideas: the REST plugin, streaming via REST, streaming co-located with the LLM call, an Ably
sink for workflow streams, ingress rules and integration rules. Only the REST plugin is implemented here. It is the
first item in the RFC's recommended approach, and the only one that is a self-contained SDK change. The others
need server work (streaming REST, ingress and integration rules) or a Realtime client (the sink and co-located
streaming).

### 2. Wrapped API surface

The plugin wraps everything on a REST channel and a few client-level methods.

- **Channel methods:** `publish`, `history`, `status`, `getMessage`, `updateMessage`, `deleteMessage`,
  `appendMessage` and `getMessageVersions`.
- **Channel sub-APIs:** `presence.get`/`history`, `annotations.publish`/`delete`/`get` and `object.get`/`publish`.
- **Client methods:** `time`, `request`, `batchPublish` and `batchPresence`. `request` is the escape hatch for any
  REST endpoint the plugin does not wrap.
- **Push admin:** all of `push.admin`: `publish`, `createApnsBroadcast`, `liveActivity.start`/`update`/`end`,
  `deviceRegistrations.save`/`get`/`list`/`remove`/`removeWhere` and
  `channelSubscriptions.save`/`list`/`listChannels`/`remove`/`removeWhere`. `push.admin` is part of `Ably.Rest`
  without the Push plugin. It is wrapped rather than left to `request`, because `request` resolves with an Ably
  error response instead of throwing it, so a 5xx would never be retried and a 4xx would not fail the activity.
  See decision 26 for how the push admin calls are retried.

These are not wrapped:

- **`stats`:** of little use from an agent workflow.
- **`auth.*`:** token issuing belongs in the application's auth server, not in workflow code.
- **`push.activate` and the other device methods of `push`:** a workflow is not a device.
- **`object.generateObjectId`:** create operations do not need a pre-generated ID.
- **Channel options in workflow code:** they are configured on the worker. See decision 13.

## Packaging

### 3. Shipped inside `ably` as `ably/temporal` and `ably/temporal/workflow`, not as a separate `@ably/temporal` (open)

AITDR-036 recommends moving the plugin to a separate `@ably/temporal` package, with `ably` as a peer dependency, so
that it has its own semver. The prototype has not moved yet. The rest of this decision records why it started inside
`ably`.

The RFC sketches a separate `@ably/temporal` package. Instead, the plugin is two subpath exports of `ably`, built
the same way as `ably/react`:

- `ably/temporal` is the worker entry point: the plugin and the activities.
- `ably/temporal/workflow` is the workflow-safe entry point: the proxy.

The reasons are:

- The work was requested in this repository.
- `ably/react` and `ably/liveobjects` set the precedent for framework integrations here.
- Shipping in lockstep with the client lets the activities use client internals safely (see decision 12).

The main cost is that every `ably` install now carries optional peer dependencies on `@temporalio/*` (see decision
5). Splitting it into its own package later would only take a new `package.json`, because the source has no
dependencies on client internals other than the one in decision 12.

### 4. Source in `src/platform/temporal/`, built with `tsc` like `react-hooks`

The plugin is Node-only. It needs no UMD or CDN bundle, and it benefits from declarations generated alongside the
JavaScript. `tsc` builds it to `temporal/cjs` and `temporal/mjs`, which is the `react-hooks` pattern, not the
esbuild pattern used by push and liveobjects.

The layout departs from `react` in a few ways:

- **No `package.json` in `temporal/cjs` or `temporal/`.** Node resolves a package's self-reference (`ably`
  importing `ably`) through the nearest `package.json`, which must carry the `exports`. A nested `package.json`
  stops the built worker entry point from loading `ably` inside this repository, which breaks the in-repo tests.
  The root `package.json` has no `type`, so the CJS output is CommonJS anyway. `temporal/mjs` does get
  `{"type": "module"}`.
  - One consequence is that the ESM worker entry point cannot load `ably` from inside this repository. Installed
    copies are unaffected, as a check against a packed tarball confirmed.
- **node10 resolution uses generated stubs.** `temporal/index.d.ts` and `temporal/workflow.d.ts` are copied from
  `src/platform/temporal/res/`. attw is green in every resolution mode, and fails without the stubs.
  - The alternatives were rejected: `typesVersions` risks the core package's own types, a nested
    `temporal/workflow/package.json` breaks self-reference, and committed stubs would sit inside the gitignored
    output directory.
- **No explicit `types` conditions in `exports`.** tsc emits a `.d.ts` beside every `.js`, which is enough.
- **`build:temporal` deletes `temporal/` before building**, so stale files never ship.

### 5. Temporal packages are optional peer dependencies with a `1.x` range (open)

The plugin uses these packages:

- `@temporalio/plugin`, which provides `SimplePlugin` and was first released in 1.13.2.
- `@temporalio/workflow`, for `getRandomStream`, which was first released in 1.18.0. The 1.17.0 tarball has no
  `random-streams` module and 1.18.0 does.
- `@temporalio/activity` and `@temporalio/common`.

All four are optional peer dependencies with the range `1.x`, not `^1.18.0`. npm checks an optional peer whenever
the package is present in the tree. With `^1.18.0`, any application that has an older `@temporalio/*` would get
`ERESOLVE` when upgrading `ably`, even if it never uses the plugin. The packaging agent reproduced this with
`@temporalio/common@1.17.0`. That would make a minor `ably` release breaking for those users.

The real minimums are enforced at runtime instead:

- Before 1.13.2, `@temporalio/plugin` does not exist, so the worker entry point fails to load with Node's
  module-not-found error.
- Before 1.18.0, the workflow throws a `TypeError` naming the required version the first time it assigns message
  IDs. The error fails the workflow task, so the workflow resumes once the worker is redeployed with a supported
  version. With `idempotentPublishing: false`, the workflow side works on earlier versions.

`summary` was checked as well: it exists on `ActivityOptions` and `LocalActivityOptions` in 1.18.0. Development and
testing use 1.24.0, which was the latest release at the time of writing. `@temporalio/*` needs Node.js 20.3 or later,
so the plugin does too. The core library still supports Node 16.

### 6. Development install: `main`'s `node_modules` were cloned, not reinstalled

`npm ci` failed in the worktree:

```
--min-release-age cannot be provided when using --before
```

The user's `~/.npmrc` sets `min-release-age`, and npm passes `--before` while it prepares this repository's git
dependencies, which conflicts with it.

Overriding a supply-chain safety setting is not my call. Instead, `main`'s `node_modules` was cloned with
copy-on-write; `main` has an identical `package-lock.json`. The Temporal packages were then added with
`npm install --save-dev`, which still honoured `min-release-age`.

That install moved `webpack` from 5.107.2 to 5.111.1, along with `terser`, `enhanced-resolve` and `schema-utils`.
The new versions are within the existing semver ranges and are required by `@temporalio/worker`. `npm run
build:node` and the full `npm run build` both still pass.

### 7. Workflow-safety is enforced by lint

`src/platform/temporal/.eslintrc.json` applies two rules.

**Explicit `.js` extensions** are required on relative imports everywhere, because the ESM output needs them.

**Workflow-safe imports** are required in `src/workflow.ts`, `src/workflow/**` and `src/common/**`:

- **Rejected:**
  - Runtime imports of `ably` and `ably/*`.
  - The worker-only Temporal packages. The list is taken from Temporal's own bundler `disallowedModules`.
  - Node built-ins.
  - Any import of the worker modules or the worker entry point, even a type-only one. A type import would drag
    worker types into the workflow `.d.ts`.
- **Allowed:** type-only imports of `ably` and `ably/liveobjects`, which must use `import type`.

The packaging agent tested the rules against 39 cases.

Known gaps:

- A dynamic `import('ably')` is not caught.
- Node globals such as `Buffer` are not caught.

### 8. CI

`.github/workflows/test-temporal.yml` runs these steps on Node 20.x, 22.x and 24.x:

1. `npm ci --ignore-scripts`. This skips the root `prepare` full build, as `test-node.yml` does; the test scripts
   build what they need. The packaging agent checked every skipped dependency install script. All of them only
   validate or print notices, and the native binaries arrive through optional dependencies.
2. `npm run typecheck:temporal`.
3. The unit tests.
4. The workflow tests.
5. The sandbox integration tests.

`check.yml` needs no change. Its attw step discovers the new entry points, and a whole-package attw run is green.

## Behaviour

### 9. Activity names are namespaced with `ably.`

The activities are named `ably.channel.publish`, `ably.channel.presence.get`, `ably.batchPublish` and so on.

`SimplePlugin` merges a plugin's activities into the worker's activities with an object spread. If a name
collides, the plugin's activity silently replaces the application's own. The Temporal AI SDK plugin uses bare
names such as `invokeModel`. Namespacing avoids collisions and makes the activities easy to spot in the Temporal UI.

### 10. Idempotent publishing uses IDs that the workflow derives deterministically

ably-js normally generates a random message ID base once per `publish()` call. A Temporal activity retry calls
`publish()` again, so the retry gets a new ID, and Ably cannot deduplicate it.

The workflow-side proxy therefore assigns the IDs itself, in the form `<uuid>:<index>`. The base comes from
`getRandomStream('ably.temporal.messageIds')`, so it is replay-safe. This has several effects:

- Every attempt of the activity publishes the same IDs.
- Ably deduplicates the attempts within its 2-minute idempotency window.
- The same stream supplies a key for the other calls that Ably deduplicates, in the form each endpoint expects:
  the `idempotencyKey` option for `updateMessage` and `deleteMessage`, and `<uuid>:0` as the `id` of an annotation.
  The sandbox suite checks that Ably deduplicates each of them. `publish` stays on message IDs rather than
  `?idempotencyKey=`, because Ably answers a keyed duplicate publish with `null` serials.
- Outside that window, subscribers can still deduplicate on `message.id`.

The specific stream name means a future plugin stream cannot shift the sequence. The named random stream also
keeps these draws out of the workflow's own `Math.random()`/`uuid4()` sequence, so upgrading the plugin cannot
change the random values the workflow code sees.

The proxy follows ably-js:

- IDs are generated only if every item lacks an `id`.
- Generation can be turned off with `TemporalRestOptions.idempotentPublishing: false`.

IDs are assigned to:

- `channel.publish`.
- Every spec passed to `batchPublish`. Each spec gets its own base.
- The operations passed to `object.publish`. The LiveObjects typings say that `RestObjectOperationBase.id` exists
  "to enable idempotent publishing". Without it, a retried `counterInc` would be applied twice.
  - **Exception (open):** no IDs are assigned to a call in which any operation is a `mapCreate` or
    `counterCreate`, with or without a `path`, or has a `path` containing `*`. `*CreateWithObjectId` operations do
    get IDs.
  - **Why, for a create at a path and a wildcard path:** the sandbox showed that Ably rejects any client-specified ID
    on them, with `40031`/`400`: "Client-specified message id missing or not a string in some messages of a
    multi-message ProtocolMessage". The server expands such an operation into several object messages: a create at
    a path also sets the new object on its parent map, and a wildcard can match several objects. The server code
    copies the operation's ID onto every expanded message, so the "`<base>:<index>`" check sees duplicates. No ID
    the client chooses can pass it.
  - **Why, for a create without a path:** Ably accepts the ID and discards a retry. But its response to the
    duplicate names the object that the retry would have created, which does not exist (`get` returns `40400`). The
    response is built from the retry's own request, not from the original message. Without an ID, a retry creates a
    second object, but the workflow gets back an object ID that exists, and nothing refers to the first one.
  - **This is not specific to the plugin.** Plain ably-js behaves the same way with these IDs.
  - **The whole call is skipped**, because Ably needs every message of a publish to have an ID, or none.
  - **Wildcards are checked conservatively:** any path containing `*` is skipped, even though a wildcard that
    matches exactly one object accepts an ID, because the number of matches is only known when Ably applies the
    operation.
  - **Cost, documented in `docs/temporal.md` under "Retried LiveObjects operations":**
    - a retried create without a path makes a second object;
    - a retried create at a path fails with a non-retryable `92007`, because the path now holds the object, so the
      workflow sees a failure for a create that succeeded;
    - a retried wildcard `counterInc` is applied twice.
  - **Rejected alternative:** rewriting a create at a path, in the activity, into a `*CreateWithObjectId` plus a
    `mapSet` on the parent path. The sandbox accepted IDs on that pair and deduplicated it. But a `mapSet` silently
    replaces an object that is already at the key, where a create at a path fails. Generating the object ID once in
    the workflow was also rejected. Ably rejects an object ID whose timestamp is more than about 2 minutes from
    server time (`92000`), so a retry after that would fail permanently.
  - **Follow-up:** the server changes in decision 25. Once they ship, the plugin assigns IDs to every operation.

Of the RFC's three retry strategies, this is "idempotency via Ably message IDs". It is the default because it
needs no client-side handling at all. The other two strategies are:

- "Tag with the activity ID and attempt number." This is also done, through metadata (see decision 11), so a
  client can still detect duplicates.
- "Delete and republish." This is not done, because it makes messages briefly disappear for subscribers and needs
  extra requests.

### 11. Temporal metadata is added to `extras.headers`, using flat camelCase keys

Every message published through `publish` or `batchPublish` gets these headers. Annotations and object
operations get none. The workflow fields are omitted when the activity was not started by a workflow:

- `temporalNamespace`
- `temporalWorkflowId`
- `temporalRunId`
- `temporalWorkflowType`
- `temporalActivityId`
- `temporalAttempt`

They are exported as `TemporalMetadataKeys`. The values come from `Context.current().info`, which carries the same
information for local and regular activities.

- **Why `extras.headers`:** Ably rejects unknown top-level `extras` fields, so `extras.headers` is the place for
  application metadata. It must be a flat map.
- **Why camelCase:** the keys work in subscription filter expressions without quoting. Dotted or hyphenated keys
  would need quoting.
- **Conflicts:** the application's own headers win over the plugin's.
- **Invalid input:** a message whose `extras` or `extras.headers` is not an object is left unchanged, so that Ably
  reports the error itself.
- **Update, delete and append:** the metadata goes in `MessageOperation.metadata` instead, as string values. That
  way it does not overwrite the message's own `extras`.
- **Opting out:** set `AblyRestPluginOptions.temporalMetadata: false`.
- **Size cost (open):** the headers add about 200 to 250 bytes to each message, and ably-js counts them towards
  `maxMessageSize` across all the messages of a publish. A publish close to the limit, or one with many small
  messages (about 190 or more of 100 bytes each), can therefore fail with a non-retryable 40009 that plain ably-js
  would not have raised. The review reproduced this.
  - This is documented, along with the opt-out.
  - Dropping or trimming the metadata automatically near the limit was rejected. It would make the metadata
    unreliable for subscribers in exactly the cases that are hard to notice.

Because the headers include the attempt number, the content of a retry differs from the original attempt even
though the message ID is the same. Ably's deduplication is assumed to be keyed on the ID only. The sandbox
integration test checks that assumption.

### 12. Pagination uses stateless page cursors taken from the `Link` header

An activity returns a page as `{ items, links: { first?, current?, next? } }`. Each link is the query parameters
from that page's `Link` header. In the workflow, `TemporalPaginatedResult.next()` calls the same activity again
with `links.next` as its params.

That matches what ably-js does: `PaginatedResult.next()` and `HttpPaginatedResponse.next()` are both a `GET` to the
same path and headers, with those params. A worker test checks the equivalence for every wrapped paginated API.
For `request`, related pages are always fetched with a `GET`, even when the first request was a `POST`.

The links are read from `PaginatedResult`'s private `_relParams`. That dependency is acceptable only because the
plugin ships with the client (decision 3).

The public types are interfaces with internal implementation classes, mirroring `ably.d.ts`. `errorCode` and
`errorMessage` are typed `| null`, because ably-js returns `null` on success even though `ably.d.ts` says `number`
and `string`.

### 13. Channel options such as `cipher` are configured on the worker, and the activities release the channels they add

All workflows on a worker share one REST client, and so share its channel instances. If each call applied its own
channel options to a shared instance, two concurrent activities on the same channel could race. One could then
encrypt with the other's key. So channel options come from a `channelOptions(name)` function on the plugin, which
the activities call when they add a channel to the client. Every operation on the channel then uses the same
options, and cipher keys stay out of the workflow history. `channels.get()` in workflow code throws if it is passed
options (decision 18), so a caller that bypasses the types cannot publish plain text by mistake.

The activities count the activities using each channel, and release a channel they added once the count reaches
zero, so `client.channels.all` does not keep every channel the worker has used. A channel the application got from
the client is never released, and keeps the options the application gave it. A REST channel holds only its options,
so getting a released channel again is cheap.

### 14. A retried append is not deduplicated (open)

Ably deduplicates `updateMessage` and `deleteMessage` on `?idempotencyKey=` (decision 10), but applies a retried
append again even when the retry has the same key: the server appends the data before it recognises the duplicate.
If an `appendMessage` reaches Ably but its response is lost, the retry appends the same content again. The plugin
sends appends without a key, and this is documented as a known limitation.

With `idempotentPublishing: false`, publish retries are not deduplicated either. The worker's ably-js client
generates a fresh random ID on each attempt.

### 15. The default activity options are `startToCloseTimeout: '30 seconds'` and Temporal's default retry policy

A single REST call, including the client's own fallback-host retries (`httpMaxRetryDuration` 15s), fits within 30
seconds.

The defaults do not set `scheduleToCloseTimeout`, even though that would keep every retry inside Ably's
deduplication window. Durable retry through an Ably outage is the behaviour Temporal users expect, and `message.id`
still lets clients deduplicate outside the window.

With the default retry policy, the waits between attempts pass 2 minutes by the eighth attempt. After that, no
operation is deduplicated, and a repeated LiveObjects operation is applied again. `docs/temporal.md` therefore
recommends `scheduleToCloseTimeout: '90 seconds'` with the 30-second `startToCloseTimeout`, for workflows that need
every retry deduplicated. That leaves room for the last attempt, and the activity then fails with a timeout instead.
A longer dedupe window for object publishes is part of decision 25.

The activity proxy is created on each call, as the AI SDK plugin does. That lets `TemporalRest` be constructed at
workflow module scope, and lets each call carry a `summary` for the Temporal UI. `executeWithOptions` was not used
because it is marked experimental.

`TemporalRestOptions.localActivityOptions` opts in to local activities. They cut the latency of short publishes,
such as status updates.

### 16. Each activity has a summary naming the operation

The Temporal UI shows a summary for each activity:

- **Channel methods** use `<method> <channel>`, for example `publish chat:123` or `presence.get chat:123`.
- **Related pages** append ` (next page)`, ` (first page)` or ` (current page)`.
- **Client methods:** `time`; `request <METHOD> <path>`, without query params so values do not leak into the UI;
  `batchPublish (N channels)`; and `batchPresence (N channels)`.

A `summary` set by the caller in the activity options replaces these.

## Errors

### 17. Ably errors are mapped to an `ApplicationFailure` of type `AblyError`, and the `ActivityFailure` propagates unchanged

For a local activity, Temporal rejects the call in the workflow with the `ApplicationFailure` itself rather than an
`ActivityFailure`. `getAblyErrorDetails` accepts either.

When the activity catches an Ably `ErrorInfo`, it throws an `ApplicationFailure`:

- `type` is `'AblyError'`.
- The `ErrorInfo` fields go in `details[0]`: `code`, `statusCode`, `message`, `href`, `remediation` and `detail`.
- The failure is marked retryable only when the error is likely to be transient. That means one of: it has no
  `statusCode`, the `statusCode` is 500 or more, or the `statusCode` is 408 or 429.
- Code 40170 is also retryable. It means a failed `authUrl`/`authCallback`, and the registry says this is often a
  timeout or network error reaching the application's auth endpoint.

Without this mapping, Temporal would turn the error into a retryable failure of type `Error` and drop `code` and
`statusCode`. A 4xx error would then be retried until the timeout.

Some details of the mapping:

- **Recognising an `ErrorInfo`:** it is matched by shape, a numeric `code` and a string `message`, because it may
  come from the source or the built copy of the SDK.
- **An error response from outside Ably**, such as a 502 from a proxy, reaches the plugin with a code of `NaN`,
  because the response has no `X-Ably-Errorcode` header. It is reported with `code: null`, so the details survive
  the failure converter. It is still classified by its status.
- **A misconfigured auth endpoint (40170) is retried until fixed.** 40170 is retryable, so a deterministic failure,
  such as an `authUrl` that responds with the wrong `Content-Type`, retries under the default policy until the
  configuration is fixed. That matches how Temporal treats an activity that needs an operator to intervene. It is
  documented.
- **Other errors**, such as network errors from `got` with string codes like `ECONNREFUSED`, are rethrown unchanged.
  Temporal retries them.
- **The cause:** the original `ErrorInfo` is kept as the failure's `cause`, so its stack trace shows in the
  workflow history, as Temporal's AI plugins do. `getAblyErrorDetails` stops at the `ApplicationFailure`, so it is
  unaffected.

In workflow code, the `ActivityFailure` is thrown as it is, not converted into an `ErrorInfo`. A
non-`TemporalFailure` error thrown from a workflow fails the workflow _task_, which blocks the workflow instead of
failing it. `getAblyErrorDetails(err)` extracts the Ably details from the cause chain.

### 18. Errors raised by the plugin's own code

- **An invalid argument in workflow code**, such as an unsupported first argument to `publish`, throws an
  `ApplicationFailure` of type `AblyError` that is non-retryable and has Ably details. The workflow fails cleanly,
  and `getAblyErrorDetails` works on it.
  - The code is 40003 `invalid_parameter_value`, not the 40013 that ably-js uses at the same throw site, because
    40003's identifier matches the failure (CLAUDE.md). The message and remediation follow ably-js.
- **Other invalid arguments in workflow code** are rejected in the same way, before any activity runs. These come
  from JavaScript callers or calls typed `any`:

  - a message that is not an object, passed to `updateMessage`, `deleteMessage` or `appendMessage`;
  - a serial that is neither a string nor a message, passed to `getMessage`, `getMessageVersions` or `annotations.*`;
  - an annotation or a single object operation that is not an object;
  - a `request` method or path that is not a string;
  - a `batchPresence` argument that is not an array of strings;
  - channel options passed to `channels.get()`, which would otherwise be ignored silently, so a message meant to be
    encrypted would be published in plain text.

  Passed through unchecked, these make ably-js throw a plain `TypeError`. The activity would rethrow it unchanged,
  and Temporal would retry it forever. The independent review found this.

  Treating every `TypeError` in the activity as non-retryable was rejected. A fetch-based HTTP client reports
  network failures as `TypeError`, so that would stop retries of transient errors.

- **A missing `first`/`current` page link** uses 40400/404, like ably-js.
- **Setting both `activityOptions` and `localActivityOptions`** throws a `TypeError` from the `TemporalRest`
  constructor. This is a code bug, like Temporal's own `proxyActivities` option validation, which also throws a
  `TypeError`.
  - Failing the workflow task means in-flight workflows resume after a fixed deploy, instead of failing
    permanently.
  - It also works when `TemporalRest` is constructed at module scope.
- **Invalid `AblyRestPlugin` options** throw a plain `Error` with a remediation in its message, when the worker is
  constructed. No registered Ably code describes invalid plugin options, and the error never crosses the activity
  boundary.

## Data

### 19. Binary data crosses the activity boundary through a tagged base64 codec

Temporal's default payload converter is JSON, which turns a nested `Uint8Array` or `Buffer` into a meaningless
object. Every activity input and result therefore passes through `encodeForWire`/`decodeFromWire`. They replace
binary values, at any depth, with `{ __ablyTemporalBinary: '<base64>' }`, and restore them as `Uint8Array`.

A custom payload converter was rejected for two reasons:

- It applies to the whole worker.
- It must also be configured on every Temporal client, which is intrusive for a plugin.

Some details of the codec:

- It includes its own base64 implementation, because the workflow sandbox does not guarantee `Buffer` or
  `atob`/`btoa`.
- A `Date` is left for the payload converter. Binary values and `Date`s passed to `decodeFromWire` are returned
  as they are, in case a custom payload converter delivers them without JSON encoding.
- An `Error` keeps its non-enumerable `message` and `cause`.
- As with `JSON.stringify()`, an object with a `toJSON()` method is replaced by its result, so values such as a
  `URL` or a decimal-library object are sent the way ably-js would send them.
  - This is safe for worker results. In ably-js, only the internal `Wire*` classes define `toJSON`, and they are
    never returned to callers.
- An object whose only key is one of the codec's tags is wrapped in an escape object, so that user data such as
  `{ __ablyTemporalBinary: 'hello' }` round-trips unchanged.
- An own `__proto__` key, such as one from `JSON.parse` of model output, is kept as an own property instead of
  setting the prototype.

On the worker, decoded bytes become a Node `Buffer`. ably-js's MessagePack encoder only encodes a `Buffer` as
binary; a plain `Uint8Array` is encoded as a map. That would corrupt binary data in the paths where ably-js passes
values through untouched, which are `batchPublish` messages and `request` bodies.

### 20. Message arguments are reduced to their serial

`getMessage`, `getMessageVersions` and the `annotations.*` methods accept a message in place of its serial, but
ably-js only reads its `serial`. A message that has a serial is therefore sent to the activity as the serial
alone. This keeps message data of up to 64 KiB out of the workflow history for each call. A message without a
serial is sent as it is, so that the activity fails with ably-js's own 40003 error.

### 21. How the worker loads `ably`

The worker entry point does `import * as Ably from 'ably'` and uses `Ably.Rest ?? Ably.default.Rest`, which works
in both formats:

- **Node CJS:** `require('ably')` has `Rest`.
- **Node ESM:** the namespace of the webpack CJS bundle has both a named `Rest` and `default.Rest`. This was
  checked on Node 20, 22 and 24.

A named import would fail at link time if Node's detection of CJS named exports ever missed `Rest`. A default
import would not match `ably.d.ts`.

### 22. The plugin does not close the Ably client

`AblyRestPlugin` registers no `runContext`. `Ably.Rest` has no public `close()`, and idle keep-alive sockets do not
keep the process alive. An injected client may also be shared with the application.

## Testing

### 23. Test layers

| Suite                       | What it runs                                                        | What it needs               |
| --------------------------- | ------------------------------------------------------------------- | --------------------------- |
| `test/temporal/unit`        | Codec tests, plus the worker activities with a real ably-js client. | Offline                     |
| `test/temporal/workflow`    | The workflow proxy against stub activities, plus end-to-end tests.  | A local Temporal dev server |
| `test/temporal/integration` | The plugin end to end against an Ably sandbox app.                  | Network access              |

- **Unit:** the worker tests use the UTS `MockHttpClient` and run activities in `MockActivityEnvironment`.
- **Workflow:** the dev server comes from `TestWorkflowEnvironment.createLocal()`, which downloads the Temporal CLI
  on first use.
- **The replay test** compares the activity arguments scheduled during replay with those from the original run. A
  negative control showed that `Worker.runReplayHistory` does not compare activity arguments, so an ID change alone
  would not fail a replay.
- **Type-checking the tests:** `test/temporal/tsconfig.json` includes DOM/webworker libs and
  `src/common/types/globals.d.ts`. The worker tests import the UTS helpers, which pull in client source written
  against the root tsconfig. The plugin's own build tsconfig remains the stricter check on its source.

### 24. The sandbox suite runs in CI on every PR

The sandbox tests check Ably server behaviour that the plugin depends on (see "Verification"), so they run with the
other Temporal suites. The cost is that an unavailable sandbox fails the Temporal workflow, as it already does for
the UTS integration tests.

## Follow-ups

### 25. Server changes to make LiveObjects REST publishes idempotent (open)

Proposed to the LiveObjects team. The plan below comes from reading `ably/realtime` at `b090cd8f`. Paths are
relative to that repository, and line numbers are approximate.

**How it works today:**

- `POST /channels/{ch}/object` is handled by `operation()` in `go/realtime/lib/state/rest/handlers.go`. Each
  operation is expanded into object messages, and every expanded message gets the operation's ID. The request is
  published as one channel message with no explicit ID.
- The base ID is derived by `getMessageBaseID` in `go/realtime/roles/frontdoor/protocol/protocol_message.go`, which
  requires `<base>:0..n-1`. Duplicate copies of one ID fail it, which is the `40031`.
- Dedupe is per channel message, keyed on the base ID, in the Node core Redis script
  `nodejs/realtime/common/lib/redis/scripts/channel/_chprocess_sparse.lua`. A duplicate is dropped whole. Content
  is not compared, and the index does not survive a channel relocate.
- On a duplicate, core replies with the original's message IDs and serials only (`ChannelMessageResponse` in
  `protocol/coordinator.proto`). `operation()` ignores that reply, and builds `objectIds` from its own expansion.
- Path resolution and other validation run before publish, so a retry can fail before it reaches dedupe.

**Changes, in order:**

1. **Base ID for expanded operations (S).** Take the base from the operations' `<base>:<i>` IDs, or from a
   request-level `?idempotencyKey=` as message publish already accepts (ably/realtime#8022, #8409). Pass it
   explicitly as the channel message ID, and number the expanded messages `<base>:<j>`. This removes the `40031`.
2. **Return the original's `objectIds` on a duplicate (M).**
   - Add `duplicate` and the original's object IDs to `ChannelMessageResponse`, filled from the stored state
     messages' `operation.objectId` in Node core.
   - Pass them through gocore and frontdoor's `channel.Response`.
   - Return them from `operation()` when `duplicate` is set.
   - Two concurrent attempts with the same ID then both get the winner's object IDs, because the Redis `ZADD NX`
     lets exactly one through.
3. **Let a duplicate win over a validation failure (M).** When expansion or validation fails and the request has
   an ID, ask core whether that ID has been seen, with a check-only variant of the Lua script (no `ZADD`). If it
   has, answer as in change 2. If not, return the validation error. Because Redis persists the message before
   applying it, a failure caused by the original having already landed finds the original.
4. **Identity check on duplicates (S–M).** VUL-573 (Won't Do) showed that anyone with `object-publish` can suppress
   another client's operation by reusing its ID, because the dedupe key has no identity. Widening idempotency does
   not make that materially worse. But change 2 turns a silent drop into a success that reveals the original's
   object IDs. So on a duplicate, compare the original's `clientId` with the incoming one, and return a conflict
   on a mismatch. This needs a registered error code. It does not protect anonymous publishers, who share an empty
   `clientId`.
5. **Dedupe window (to investigate).** Temporal's default retry policy outlasts the 2-minute window (decision 15).
   A longer window for object publishes would help durable workflows. The object ID recency window (also about 2
   minutes) is a separate setting.

**Spec:** RSO3d4 in ably/specification#475 describes per-operation dedupe, but the server dedupes per request. The
suggested wording is: "`id` (optional): an idempotency key. All operations in a single publish must either omit `id`
or use `<base>:<index>`. The server deduplicates per request, keyed on `<base>`, within a limited window (currently
about 2 minutes). A retried request is not applied again, and returns the original's response, including its
`objectIds`. IDs should be unguessable." The last-but-one sentence only holds once change 2 ships.

**Plugin changes once these ship:**

- Assign IDs to every object operation, removing the exception in decision 10.
- Map the identity-conflict error to a non-retryable `AblyError`.
- Turn the two sandbox tests of today's server behaviour into tests of the new behaviour. They fail when the server
  changes, by design.

The plugin's IDs already fit the per-request semantics. Each call gets a fresh base, drawn from a stream seeded by
the workflow's random seed, so it is unguessable outside the Temporal history. A base is never reused with a
different set of operations.

### 26. Push admin calls use the caller's retry policy, and the docs say what a retry of each one does

Every push admin call runs with the retry policy in `activityOptions` or `localActivityOptions`, as every other call
does. Ably does not deduplicate the calls that send a notification or create a broadcast channel, so a retry of one
that reached Ably repeats it. Callers who would rather have the failure than a repeat make these calls from a
separate `TemporalRest` with `maximumAttempts: 1`.

At-least-once is the default for these reasons:

- **Temporal's model:** activities are at-least-once, and Temporal users expect their retry policy to apply. A plugin
  that overrides it for some calls is surprising.
- **A single attempt is not at-most-once anyway.** Within one attempt, ably-js sends the same request to a fallback
  host when the client has more than one host, as it does with the default endpoint. `shouldFallback` in
  `src/platform/nodejs/lib/util/http.ts` falls back on a connection error (`ENETUNREACH`, `EHOSTUNREACH`,
  `EHOSTDOWN`, `ENOTFOUND`, `ECONNRESET`, `ECONNREFUSED`), a timeout (`ETIMEDOUT`, `ESOCKETTIMEDOUT`) or an HTTP 500
  to 504 response, and `tryAHost` in `src/common/types/http.ts` tries the hosts in turn within
  `httpMaxRetryDuration`.
- **For most notifications a duplicate is better than a missed send.** A duplicate can be mitigated, for example with
  an ID in the payload's `data` that the app checks. A missed send can only be fixed by sending again.
- **Consistency:** appends are not deduplicated either (decision 14), and use the retry policy.

The risk is a `startToCloseTimeout` shorter than a request, with Temporal's unlimited default retries: every attempt
reaches Ably and times out, and each sends the notification again. The default of 30 seconds is longer than a
request can take with the default client options (`httpMaxRetryDuration` of 15 seconds, then a final
`httpRequestTimeout` of 10 seconds), and the docs say to keep it that way.

Each call was checked against the Ably server (`ably/realtime`,
`go/realtime/roles/frontdoor/transports/rest/liveactivity.go`) and Apple's documentation:

- **`publish`:** the server does not deduplicate it, so a retry sends the notification again.
- **`createApnsBroadcast`:** a retry creates a second Apple broadcast channel and orphans the first. Apple allows
  10,000 broadcast channels per app in each environment, and Ably has no call to list or delete one. A single
  attempt does not avoid the orphan: if an attempt fails after Apple created the channel, its ID is lost either way.
  Retrying at least returns a usable channel.
- **`liveActivity.start`:** a retry sends another push-to-start notification to each device, so users see two Live
  Activities.
- **`liveActivity.update`:** a retry sends the broadcast again, and neither Ably nor Apple deduplicates it. With the
  same payload and an `aps.timestamp` set in workflow code, the device shows the same state. A payload with an
  `alert` alerts again, and every retry counts against Apple's budget for priority 10 updates.
- **`liveActivity.end`:** idempotent. The server maps Apple's "channel not registered" response to 200, and retries a
  failed delete of the broadcast channel. The server test `TestLiveActivity_EndDeleteAndRetrySemantics` covers both.

## Verification

### Ably server behaviour observed on `nonprod:sandbox`

These were observed by the sandbox suite (`test/temporal/integration/sandbox.test.ts`) on 2026-10-13. Where a finding
came from a one-off scratch script rather than the committed suite, that is noted.

- **Numeric header values are accepted.** History returns `extras.headers` exactly as sent, with all six camelCase
  keys and `temporalAttempt` as the number `1`. This confirms decision 11.
- **Deduplication is keyed on the message ID and ignores differing `extras`.** The same ID was published twice,
  with `temporalAttempt` 1 and then 2, so the headers differed.
  - History holds exactly one message, carrying the attempt-1 headers.
  - The second publish succeeds and returns the original message's serial.
  - Control: two publishes without fixed IDs produce two messages.
  - This confirms decisions 10 and 11.
- **A permission error is not retried.** A subscribe-only key gets `40160`/`401` "Unauthorized to publish to
  channel". The plugin maps it to a non-retryable `AblyError`, and the activity runs once.
- **Message operations accept the string metadata.**
  - In the `mutable:` namespace, `updateMessage` and `appendMessage` from a workflow both succeed.
  - `getMessageVersions` shows the update with the Temporal metadata plus the caller's own keys.
  - `getMessage` shows the latest version's metadata.
  - Reads are eventually consistent, so the tests poll.
  - The append did not appear as a separate entry in `getMessageVersions`.
- **`batchPublish` is deduplicated by message ID, on each channel separately.**
  - A duplicate batch returns a result identical to the original, with the same `messageId` and serials.
  - Control: without IDs, each channel gets every message twice.
- **`object.publish` is deduplicated by operation ID.**
  - A retried `counterInc` is applied once.
  - A retried `[counterInc, mapSet]` is applied once as a whole, and does not overwrite a change made by another
    writer between the attempts.
  - Deduplication is keyed on the ID only.
  - Messages and object operations on a channel share one ID space.
- **`object.publish` rejects client-specified IDs on operations that Ably expands into several object
  messages** (`40031`/`400`). See the exception in decision 10. Without IDs, the same operations succeed.
- **A create without a path, discarded as a duplicate, gets a response naming an object that does not exist.** The
  retry returns the original's `messageId` but a different object ID, and `get` on it returns `40400`. This is why
  decision 10 publishes creates without IDs.
- **A repeated create at a path fails** with `92007`/`400` "path not processable: path did not lead to a single map
  in which to create the COUNTER_CREATE".
- **A `*CreateWithObjectId` plus a `mapSet` on the parent path, each with an ID, is accepted and deduplicated.**
  Re-sending the same object ID with new IDs does not create the object again. This came from a scratch script.
- **Ably rejects an object ID whose timestamp is about 2 minutes or more from server time**, with `92000`/`400`
  "invalid object id timestamp is outside recency window". 90 seconds old was accepted. This came from a scratch
  script.
- **Numeric operation metadata is rejected** with `40000`/`400` "Unable to parse request body". This came from a
  scratch script, not the committed suite. It is why decision 11 converts the metadata to strings.

### Checks run on the final state

| Check                                                                                | Result                                          |
| ------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `npm run build` (full, including `build:temporal`)                                   | passes                                          |
| `npm run lint`                                                                       | 0 errors (6 existing warnings)                  |
| `npx tsc --noEmit -p tsconfig.json` (root)                                           | passes                                          |
| `npm run typecheck:temporal`                                                         | passes                                          |
| Prettier on all changed files                                                        | clean                                           |
| `test/temporal/unit`                                                                 | 124 passing                                     |
| `test/temporal/workflow` (proxy and end-to-end, local Temporal dev server)           | 35 passing                                      |
| `test/temporal/integration` (Ably sandbox and local Temporal dev server)             | 26 passing                                      |
| `test/rest/message.test.js` and `history.test.js` against the rebuilt `ably-node.js` | 21 passing, checking the webpack bump           |
| attw on the packed package (run by the packaging agent)                              | all entry points green, including both new ones |

`npm ci` itself was not run, because of decision 6. CI runs it on a clean checkout.
