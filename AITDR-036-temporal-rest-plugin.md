# AITDR-036: How the Ably REST plugin for Temporal is packaged and keeps retried calls safe

|                           |                                                                                                                                                                                                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                | DRAFT                                                                                                                                                                                                                                                                                                                                 |
| **Impact**                | Medium                                                                                                                                                                                                                                                                                                                                |
| **Driver**                | Owen Pearson                                                                                                                                                                                                                                                                                                                          |
| **Approver**              | _AI Transport engineering lead_; _AI Transport product_ (required: this adds a public package and a public `ably` API)                                                                                                                                                                                                                |
| **Contributors**          | _To be tagged_                                                                                                                                                                                                                                                                                                                        |
| **Informed**              | LiveObjects team (owns decision 4); SDK team (ably-js maintainers); DevEx (docs)                                                                                                                                                                                                                                                      |
| **Related documentation** | Relates to: [AITRFC-029](https://ably.atlassian.net/wiki/spaces/AI/pages/5488541698), [AITRFC-030](https://ably.atlassian.net/wiki/spaces/AI/pages/5492277270), [AITDR-031](https://ably.atlassian.net/wiki/spaces/AI/pages/5451546665), [PSDR8](https://ably.atlassian.net/wiki/spaces/CHN/pages/4656726029), ably/specification#475 |
| **Due date**              | 2026-10-27                                                                                                                                                                                                                                                                                                                            |
| **Outcome Summary**       |                                                                                                                                                                                                                                                                                                                                       |

## Background

Temporal workflow code has to be deterministic, so every request to Ably runs in an activity, and Temporal retries a failed activity. An activity can fail after its request reached Ably: the response is lost, the worker crashes, or the attempt times out while the request is still in flight. A retried Ably call is therefore the normal case, not an edge case.

AITRFC-029 proposed a REST SDK plugin: workflow code calls a client that mirrors `Ably.Rest`, and each call runs as an activity on the worker. We have built a working prototype of it in ably-js (`ably/temporal` and `ably/temporal/workflow`), with unit, workflow and Ably sandbox tests. Building it surfaced six decisions that shape the public API and need agreeing before it ships. One of them needs server work from the LiveObjects team, and two partly reverse what AITRFC-030 recommended.

AITRFC-030 argued that deriving message IDs saves little code and that concurrent or conditional requests would make derived IDs unsafe, so we should document the approach rather than ship an integration. Building the prototype changed that view. Deriving IDs correctly is subtle (the draw has to be replay-safe and must not disturb the workflow's own randomness), Ably's rules differ by endpoint, and the sandbox showed several cases where a naive ID makes things worse. That is the hard part, and it belongs in the SDK rather than in every customer's workflow.

## Relevant Data

### The REST client holds state worth keeping between calls

`Ably.Rest` keeps a working fallback host for 10 minutes after the primary fails, caches its token until it expires, and stores the server time offset. Node's keep-alive socket pool is module-global (`src/platform/nodejs/lib/util/http.ts`), so it survives regardless. Constructing a client per activity throws away the fallback host and the token: during a primary-host outage every activity would rediscover the fallback, and with token auth every activity would hit the customer's auth endpoint.

### Workflow code cannot hold a client or a live result

A workflow can be replayed on any worker at any time, from its history. Anything the workflow keeps between calls must be a plain value recorded in that history. A `PaginatedResult` holds a reference to the client and its HTTP machinery, so it cannot cross the activity boundary.

### Ably's idempotency coverage today varies by endpoint

| Operation                                                          | Retry with the same input                                                                                         | Can the caller check whether it landed?                           |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `publish`                                                          | Deduplicated on `?idempotencyKey=` or on client-supplied message IDs. A keyed duplicate returns `null` serials    | Yes: history, or the returned serials for a message-ID duplicate  |
| `batchPublish`                                                     | Deduplicated on client-supplied message IDs, per channel. No `?idempotencyKey=`                                   | Yes: history, or the returned serials                             |
| `updateMessage`, `deleteMessage`                                   | Deduplicated on `?idempotencyKey=`, returning the original `versionSerial`. Without it, each retry adds a version | Yes: `getMessageVersions`, matching a key in `operation.metadata` |
| `appendMessage`                                                    | Not idempotent. With `?idempotencyKey=`, the retry returns the first attempt's serial but appends the data again  | No. Appends do not appear in `getMessageVersions`                 |
| `annotations.publish`/`delete`                                     | Deduplicated on `annotation.id`, which ably-js never sets. Without it, a `total.v1` annotation counts twice       | Yes: `annotations.get`                                            |
| LiveObjects `object.publish`                                       | Deduplicated on operation IDs, except creates and wildcard paths (see decision 4)                                 | Yes: `object.get`                                                 |
| Push device registrations and channel subscriptions (save, remove) | Naturally idempotent: keyed upserts and deletes. A repeated delete returns 2xx                                    | Yes, by device ID. Lists by `clientId` or channel can lag         |
| Push `removeWhere`                                                 | A late retry also removes devices registered in between                                                           | List by `clientId`, which can lag                                 |
| Push publish, batch push publish                                   | Not idempotent. The device gets a second notification                                                             | No. A 2xx only means "queued", and nothing records what was sent  |
| `revokeTokens`                                                     | Repeats are harmless if `issuedBefore` is explicit. If omitted, a late retry revokes tokens issued in between     | No read endpoint                                                  |

Sources: `ably/realtime` `main`, read on 2026-10-13 and 2026-10-14, and sandbox probes on the same days.

`?idempotencyKey=` is the direction PSDR8 sets for message idempotency, replacing message IDs. On the server it is not a separate mechanism: the frontdoor makes the key the ID of the request's channel message, and the channel deduplicates it exactly as it does a message ID. So it shares the message ID's window and scope, and a key reused for a different operation on the same channel collides. A keyed duplicate publish returns `null` serials because the server looks up serials by message ID, and the request's messages have none. A retried append is applied twice because the server applies the append to the stored message before the channel recognises the duplicate.

The push handler gives every direct publish the fixed envelope ID `'direct'`, delivery fans out to devices after the request returns, and APNs, FCM and Web Push take no dedupe key, so making push publish idempotent is a substantial project rather than a parameter.

### Ably's deduplication window is about 2 minutes and best-effort

The channel keeps an ID for at least 130 seconds, and drops it on a once-a-minute sweep, so the window is between 130 and about 190 seconds. The sandbox deduplicated a `?idempotencyKey=` retry after 60 seconds, and not after 130 seconds. The check is scoped to one placement of the channel, so a retry that lands after the channel has moved to another server is not deduplicated.

### Temporal's default retry policy outlasts Ably's deduplication window

The default policy retries indefinitely, from 1 second doubling to a 100-second cap. The waits between attempts pass the deduplication window by the eighth attempt, after which Ably no longer recognises the ID.

### Temporal's own guidance names two safe options

Temporal's activity docs say an idempotency key is "enforced by the service you are calling", and recommend "a combination of the Workflow Run ID and the Activity ID". For an API without keys, Temporal's guidance ([blog](https://temporal.io/blog/idempotency-and-durable-execution), [forum](https://community.temporal.io/t/activity-external-call-idempotency/7543)) is: call it, "verify it succeeded with a read operation (that is idempotent)", and only then try again. Otherwise exactly-once is impossible "in the presence of timeouts".

## Outline of options

### 1. Where the Ably client lives

**A. One long-lived client per worker, owned by the plugin (recommended).** `AblyRestPlugin` constructs one `Ably.Rest` from `ClientOptions`, or takes an existing one, and every activity on the worker uses it.

- Strengths: keeps the fallback host, token and time offset across calls. Credentials stay on the worker and never enter workflow history. One client to configure, including `plugins: { LiveObjects }`.
- Weaknesses, each with how we mitigate it:
  - **Channel instances accumulate.** `channels.get` registers every name in `channels.all` until something releases it, so a worker that uses a channel per conversation would grow without bound. The activity releases each channel it added once no other activity on the worker is using it, and never releases a channel the application registered. A REST channel holds nothing but its options, so recreating it on the next call costs a few small objects, and a call in flight keeps its own reference after a release.
  - **Channel options are shared.** Two concurrent activities that each set their own options on one channel would race. Channel options such as a `cipher` are configured on the worker, as a `channelOptions(name)` function on the plugin, so every call on a channel uses the same options. This also keeps cipher keys out of workflow history, which stores activity inputs in plain text unless the customer has configured a payload codec.
  - **One identity per worker.** Every workflow on the worker uses the same credentials, as any backend service does. Messages can still carry their own `clientId`, which an API key or a wildcard-`clientId` token allows. Workflows that need different credentials send their Ably activities to another task queue with `activityOptions.taskQueue`, served by a worker whose plugin has those credentials. This is how Temporal gives activities different resources, and needs no new API.

**B. A new client per activity.**

- Strengths: no shared state, so per-call channel options and per-workflow credentials would be simple.
- Weaknesses: loses all the state above. Token auth would call the customer's auth endpoint on every activity. Per-call options and credentials would have to come from the workflow, which puts keys and secrets into its history.

**C. No plugin client; customers write their own activities (AITRFC-030's position).**

- Strengths: nothing new for us to maintain.
- Weaknesses: every customer rebuilds the same activities, error mapping and ID handling, and most will get retries wrong.

### 2. Where paginated-result state lives

**A. In workflow code, as stateless page cursors (recommended).** The activity returns `{ items, links }`, where each link is the query params from that page's `Link` header. `next()` in the workflow runs the same activity again with `links.next`. This is exactly what ably-js's `PaginatedResult.next()` does: a `GET` to the same path with those params.

- Strengths: replay-safe, works on any worker, and needs nothing kept on the worker. Mirrors the `PaginatedResult` API.
- Weaknesses: each page is an activity and a history event. Reads the links from `PaginatedResult`'s private `_relParams` in the prototype. A separate package (decision 6) cannot rely on that, so ably-js needs a public accessor.

**B. On the worker, behind a handle.** The activity keeps the `PaginatedResult` in memory and returns an ID.

- Strengths: no dependency on the link format.
- Weaknesses: breaks when the next page runs on another worker or after a restart, and leaks memory for abandoned pages.

**C. Fetch every page in one activity.**

- Strengths: one activity per query.
- Weaknesses: unbounded results run into Temporal's payload and history size limits and the activity timeout.

### 3. How idempotency keys are chosen

**A. Derived in the workflow from a named random stream seeded by the run, with caller-supplied IDs taking precedence (recommended).** For each call, the workflow draws a UUID from `getRandomStream('ably.temporal.messageIds')` and assigns `<uuid>:<index>` to the call's messages or operations. A call in which any item already has an `id` is published as it is, as ably-js does.

The draw is sent in whichever form each endpoint deduplicates on: message IDs for `publish` and `batchPublish`, `?idempotencyKey=` for `updateMessage` and `deleteMessage`, `annotation.id` for annotations, and operation IDs for LiveObjects. `publish` stays on message IDs for now, even though PSDR8 makes `?idempotencyKey=` the preferred form. A keyed duplicate returns `null` serials, so a retried publish would hand the workflow no serial for a later update or append. Once the server returns the original serials, `publish` moves to the key, which also keeps the derived ID off the message that subscribers see.

- Strengths: the same IDs on every attempt and every replay. Unguessable outside the workflow history, which matters because a duplicate ID silently suppresses a message (VUL-573). Concurrent and conditional calls each get their own draw, which answers AITRFC-030's concern. The named stream leaves the workflow's own `Math.random()` and `uuid4()` sequence untouched, so upgrading the plugin cannot change values the workflow sees. The IDs are visible in the activity inputs in the Temporal UI, so a workflow can match on them when checking an outcome.
- Weaknesses: scoped to one run, so a workflow reset or continue-as-new that repeats a publish gets a new ID. Callers who need dedupe across runs set the ID themselves, for example from the workflow ID and a step name. A caller-supplied `idempotencyKey` must be unique per operation on its channel, because publishes, updates, deletes and appends on a channel share one set of keys. Needs `@temporalio/workflow` 1.18.0 or later for named random streams.

**B. Derived on the worker from the run ID and activity ID, as Temporal suggests.**

- Strengths: needs no workflow-side code, and matches Temporal's docs.
- Weaknesses: guessable. The plugin also writes `temporalRunId` and `temporalActivityId` into `extras.headers`, so anyone subscribed could predict the next ID and suppress it. The workflow never sees the ID, so it cannot use it to check an outcome.

**C. No derived IDs; tag messages with the activity ID and attempt, and let subscribers dedupe (AITRFC-029's second strategy).**

- Strengths: simple, and the server does nothing new.
- Weaknesses: every subscriber has to dedupe, and LiveObjects operations cannot be deduped downstream at all. We still add the tags as `extras.headers`, alongside the IDs.

**D. Delete and republish (AITRFC-029's third strategy).**

- Strengths: works without any server dedupe.
- Weaknesses: messages briefly disappear for subscribers, and it doubles the requests.

### 4. How LiveObjects REST publishes become idempotent

The sandbox showed three gaps. Ably rejects any ID on a create at a path or a wildcard path (40031), because it expands the operation into several object messages that all copy the ID. A deduplicated create without a path returns an object ID that does not exist. A retried create at a path fails with 92007 even though the first attempt succeeded.

**A. Server changes (recommended).** In priority order, with sizes from reading `ably/realtime`:

1. Take the base ID from the operations, or a request-level `?idempotencyKey=`, and number the expanded messages from it. Removes the 40031. (S)
2. On a duplicate, return the original's `objectIds`, which core already has. (M)
3. When validation fails on a request that has an ID, check whether the ID has been seen, and if so answer as in 2. Makes a retried create at a path succeed. (M)
4. On a duplicate, compare the original's `clientId` with the incoming one and return a conflict on a mismatch, so change 2 cannot leak another client's object IDs. (S–M)
5. Investigate a longer dedupe window for object publishes.

- Strengths: fixes it for every REST client, not just Temporal. Matches the RSO3d4 spec text once its wording is corrected.
- Weaknesses: LiveObjects team time. Until it ships, the plugin publishes creates and wildcard operations without IDs, and documents the consequences.

**B. Rewrite a create at a path in the activity into a `*CreateWithObjectId` plus a `mapSet`.**

- Strengths: the sandbox accepts and dedupes IDs on that pair today.
- Weaknesses: `mapSet` silently replaces an object already at the key where a create fails, and the object ID's timestamp is rejected after about 2 minutes (92000), so a late retry fails permanently.

**C. Leave the server as it is and document the gaps.**

- Strengths: no server work.
- Weaknesses: a retried create either orphans an object or reports failure for a success, and every customer has to know which.

### 5. What we do for APIs that are not idempotent

**A. Document a verify-before-retry pattern, and at-most-once where nothing can be verified (recommended).** For a call whose outcome is unknown, the workflow runs it with a single attempt, and on an ambiguous failure checks with a read before trying again. Push publish cannot be checked, so we document running it at most once.

- Strengths: follows Temporal's own guidance. Works for every API, including ones we do not wrap and retries outside the dedupe window. No server work.
- Weaknesses: the customer writes the loop. The check can race a slow original request, so it narrows the window for duplicates rather than closing it. Conflicts with the SDK principle that "developers should not need to build their own retry logic", which we accept only for APIs that cannot be fixed on the server.

**B. Built-in checked helpers in the plugin, such as a checked `appendMessage`.**

- Strengths: no loop for the customer to write.
- Weaknesses: each helper encodes endpoint-specific matching and timing that we cannot make exact, and hides that a duplicate is still possible.

**C. Make every API idempotent on the server.**

- Strengths: the right end state.
- Weaknesses: push publish fans out to devices after the request returns, and APNs, FCM and Web Push have no dedupe key, so it would need per-device dedupe state in the push worker. Out of proportion to this plugin.

### 6. Whether the plugin ships inside `ably` or as its own package

The plugin depends on two Temporal APIs marked experimental: worker plugins (`@temporalio/plugin`, "APIs may change without notice") and named random streams (`getRandomStream`). Both are likely to change under us, and we expect to reshape the plugin's own API as customers use it.

**A. Subpath exports of `ably` (`ably/temporal` and `ably/temporal/workflow`), as in the prototype.**

- Strengths: one install, and the plugin is always the same version as the client, so it can read client internals such as `_relParams` safely. Follows `ably/react` and `ably/liveobjects`.
- Weaknesses: a breaking change to the plugin, including one forced by Temporal, needs an `ably` major or must wait for one. Marking the entry points `@experimental` only defers this until they are declared stable. Every `ably` install carries optional peer dependencies on `@temporalio/*`, which must use the range `1.x` rather than `^1.18.0`, because a stricter optional peer fails `npm install` with `ERESOLVE` for any app on an older Temporal, even one that never uses the plugin. The real minimum is then checked at runtime. The plugin needs Node.js 20.3, while `ably` supports Node.js 16. Node resolves `ably` importing itself only through the root `package.json`, which already forced workarounds in the build.

**B. A separate package, `@ably/temporal`, with `ably` as a peer dependency (recommended).**

- Strengths: its own semver, so the plugin can follow Temporal's experimental APIs and change its own API without touching `ably`'s version. Real peer ranges that npm enforces: `@temporalio/*` from 1.18.0, and `ably` from the release that exposes page links, and its own `engines`. Keeps Temporal out of `ably`'s `package.json`. Matches AITRFC-029.
- Weaknesses: only `ably`'s public API is safe to use, so ably-js must expose the page links before the package leaves preview. Customers can combine any `ably` and `@ably/temporal` within the peer range, so CI must test the oldest supported `ably` as well as the latest. A second package to release and document.

**C. Part of `@ably/ai-transport`.**

- Strengths: one package for AI Transport customers, alongside the `streamReply` helper that AITRFC-030 recommended.
- Weaknesses: the plugin is a general REST client for any Temporal user, not an AI feature. Customers who only want Ably from Temporal would install AI Transport, and the plugin's releases would be tied to AI Transport's.

## Recommendation

We go with option A for decisions 1 to 5, and option B for decision 6.

1. **Client:** we keep one client per worker. A client per activity (B) throws away exactly the state that makes REST calls cheap during an outage. Customer-written activities (C) is where customers are today, and the prototype shows how much they would have to get right. The mitigations in A are part of the decision: the plugin releases the channels it adds, takes channel options from a worker-side `channelOptions(name)`, and documents task-queue routing for workflows that need other credentials.
2. **Pagination:** cursors in the workflow are the only option that survives replay and worker restarts. Worker-held handles (B) fail both. Fetching every page (C) fails on large results. We will add a public accessor for the page links in ably-js so the plugin stops reading `_relParams`.
3. **Idempotency keys:** run-derived random IDs give the same dedupe as worker-derived IDs (B) without being guessable from the plugin's own headers. Tagging (C) and delete-and-republish (D) put the work on subscribers or flicker messages, and do nothing for LiveObjects. Caller-supplied IDs remain the answer for dedupe across runs. We extend the derived keys to annotations (`id`) and to `updateMessage` and `deleteMessage` (`?idempotencyKey=`), which Ably already dedupes on but ably-js never sets. `appendMessage` gets a key once the server stops applying a duplicate append, and `publish` moves from message IDs to `?idempotencyKey=` once a keyed duplicate returns the original serials.
4. **LiveObjects:** the server changes (A) fix the problem where it lives, for every REST client. The rewrite (B) changes create semantics and fails late retries. Documenting the gaps (C) is the interim state, not the end state. When change 3 ships, the plugin assigns IDs to every operation.
5. **Non-idempotent APIs:** we document verify-before-retry (A). Helpers (B) would promise more than they deliver, and server idempotency for push publish (C) is not proportionate. Once decisions 3 and 4 are done, this category holds only push publish, appends until their server fix ships, and retries outside the 2-minute window.
6. **Packaging:** a separate package (B), because the plugin sits on experimental Temporal APIs and will need breaking changes faster than `ably` can take majors. Subpath exports (A) tie every such change to an `ably` major, and put Temporal's peer dependencies on every `ably` install. Shipping in `@ably/ai-transport` (C) hides a general-purpose plugin inside an AI product. The cost of B is the public page-link accessor, which decision 2 needs anyway, and a compatibility matrix in CI. The package lives in its own repository, like `@ably/chat`, and starts at `0.x`.

### Public API

The plugin ships two entry points. The worker registers the plugin:

```typescript
// worker.ts
import { Worker } from '@temporalio/worker';
import { LiveObjects } from 'ably/liveobjects';
import { AblyRestPlugin } from '@ably/temporal';

const worker = await Worker.create({
  taskQueue: 'agents',
  workflowsPath: require.resolve('./workflows'),
  plugins: [
    new AblyRestPlugin({
      ably: { key: process.env.ABLY_API_KEY, plugins: { LiveObjects } }, // or: client: existingRest
      temporalMetadata: true, // default: workflow and activity IDs in extras.headers
      channelOptions: (name) => (name.startsWith('secure:') ? { cipher: { key: process.env.CHANNEL_KEY } } : undefined),
    }),
  ],
});
```

Workflow code uses `TemporalRest`, which mirrors `Ably.Rest`. Each method runs one activity, named `ably.<method>`:

```typescript
// workflows.ts
import { workflowInfo } from '@temporalio/workflow';
import { TemporalRest, getAblyErrorDetails } from '@ably/temporal/workflow';

const ably = new TemporalRest({
  activityOptions: { startToCloseTimeout: '30 seconds', scheduleToCloseTimeout: '90 seconds' },
  idempotentPublishing: true, // default
});

export async function agentWorkflow(): Promise<void> {
  const channel = ably.channels.get(`chat:${workflowInfo().workflowId}`);

  // Derived ID: the same on every attempt and replay of this run.
  await channel.publish('agent.status', { status: 'thinking' });

  // Caller-supplied ID: deduplicated across runs too.
  await channel.publish({ id: `${workflowInfo().workflowId}:reply`, name: 'agent.reply', data: 'Done' });

  // Pagination: next() runs the same activity with the cursor from the page's Link header.
  let page = await channel.history({ limit: 100 });
  while (page.hasNext()) page = (await page.next())!;

  await channel.object.publish({ path: 'progress', counterInc: { number: 1 } });
}
```

Wrapped: channel `publish`, `history`, `status`, `getMessage`, `updateMessage`, `deleteMessage`, `appendMessage`, `getMessageVersions`, `presence.get`/`history`, `annotations.*` and `object.get`/`publish`, all of `push.admin`, and client `time`, `request`, `batchPublish` and `batchPresence`. The calls in `push.admin` that send a notification or create an APNs broadcast channel (`publish`, `createApnsBroadcast` and `liveActivity.*`) run with a single attempt by default, because Ably does not deduplicate them and a retry sends the notification again. Setting `retryPushNotifications: true` on `TemporalRest` applies the caller's retry policy to them instead. A separate option stops a retry policy set for every call from retrying notifications by accident. `request()` reaches any other endpoint. `stats` and `auth.*` are not wrapped: workflows have little use for stats, and tokens belong on the application's auth server.

`push.admin` is wrapped rather than left to `request()` for two reasons. Push admin is where decision 5's guidance applies most, so it needs typed calls. And `request()`, like ably-js, resolves with an Ably error response instead of throwing it, so through `request()` a 5xx is never retried and a 4xx does not fail the activity. `push.admin` is part of `Ably.Rest` without the Push plugin, which is only needed to activate a device.

### Errors in workflow code

Every wrapped call runs as an activity, so a failed call throws Temporal's `ActivityFailure` in the workflow. Its `cause` depends on where the error came from. A call that runs as a local activity throws the cause itself, without the `ActivityFailure`:

| Source                                                             | `cause` of the `ActivityFailure`                                                                | Retried by Temporal                                                                                                             |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| An Ably error response, or an `ErrorInfo` thrown by ably-js        | `ApplicationFailure` of type `AblyError`                                                        | Only if the status is 500 or more, 408 or 429, or there is no status, or the code is 40170 (`authUrl` or `authCallback` failed) |
| A network error that ably-js does not wrap, such as `ECONNREFUSED` | An `ApplicationFailure` that Temporal builds from it, with the error's class name as its `type` | Yes                                                                                                                             |
| The activity timing out                                            | `TimeoutFailure`                                                                                | A start-to-close timeout is retried. A schedule-to-close timeout is final                                                       |

An invalid argument in workflow code, such as a non-object message, throws a non-retryable `ApplicationFailure` of type `AblyError` with code 40003 directly, before any activity runs. A workflow can list `AblyError` in `nonRetryableErrorTypes` to stop Temporal retrying any Ably error.

`getAblyErrorDetails(err)` walks the cause chain to the `AblyError` and returns its details, or `undefined` for any other failure:

- `code`: the Ably error code, or `null` if the response did not come from Ably, such as a 502 from a proxy.
- `statusCode`: the HTTP status, if there was one.
- `message`: what went wrong.
- `href`: a link to the documentation for the error code.
- `remediation`: the value of `ErrorInfo.remediation`, which is how to fix the error, written for a developer or a coding agent to act on. For example, an `authUrl` response with no `Content-Type` gets "Set a Content-Type response header on your authUrl endpoint: application/json for a TokenDetails/TokenRequest object, text/plain for a token string, or application/jwt for a JWT." ably-js sets it only on errors it raises itself, so errors returned by Ably's servers have none.
- `detail`: structured key-value metadata about the error, if any.

The original `ErrorInfo` stays on the `ApplicationFailure` as its `cause`, so its stack trace shows in the workflow history. The plugin does not convert the failure back into an `ErrorInfo` in the workflow. Workflow code that throws anything other than a Temporal failure fails the workflow task, which blocks the workflow rather than failing it.

### Verify-before-retry, as we will document it

The pattern needs a read that can confirm the call landed: `object.get` for LiveObjects, `getMessageVersions` with a key in `operation.metadata` for updates and deletes, `annotations.get`, and push admin lookups by device ID. Run the call in a regular activity, never a local one, with a single attempt. Treat a non-retryable `AblyError` as "did not happen", and a timeout or retryable error as "unknown". Before checking, wait longer than a request can stay in flight: ably-js allows about 25 seconds across fallback hosts.

```typescript
import { sleep, ActivityFailure, ApplicationFailure } from '@temporalio/workflow';
import { TemporalRest, getAblyErrorDetails } from '@ably/temporal/workflow';

const once = new TemporalRest({
  activityOptions: { startToCloseTimeout: '45 seconds', retry: { maximumAttempts: 1 } },
});
const reads = new TemporalRest();

/** Runs `call` until it succeeds or `landed` confirms that an earlier attempt did. */
async function withCheck(call: () => Promise<unknown>, landed: () => Promise<boolean>, isRejection = rejected) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await call();
    } catch (err) {
      if (isRejection(err)) throw err;
    }
    await sleep('30 seconds'); // let an in-flight attempt land before checking
    if (await landed()) return;
  }
  throw ApplicationFailure.nonRetryable('Ably call not confirmed after 4 attempts');
}

function rejected(err: unknown): boolean {
  const cause = err instanceof ActivityFailure ? err.cause : undefined;
  return cause instanceof ApplicationFailure && cause.nonRetryable;
}

export async function createVotesCounter(channelName: string): Promise<void> {
  await withCheck(
    () => once.channels.get(channelName).object.publish({ path: 'votes', counterCreate: { count: 0 } }),
    async () => {
      try {
        await reads.channels.get(channelName).object.get({ path: 'votes' });
        return true;
      } catch (err) {
        if (getAblyErrorDetails(err)?.code === 40400) return false;
        throw err;
      }
    },
    // 92007 means the path already holds an object, possibly the one an earlier attempt created
    (err) => rejected(err) && getAblyErrorDetails(err)?.code !== 92007,
  );
}
```

`object.get` rejecting a missing path with 40400 is still to be confirmed against the sandbox. Appends have no read that confirms them, so until the server dedupes them, use `updateMessage` with the full content where a duplicate matters.

Push publish has nothing to read back, so `push.admin.publish` runs at most once by default. Put an ID in the notification's `data` if the app needs to drop a duplicate. Push device registrations and channel subscriptions are keyed upserts and deletes, and are safe to retry with the default policy. Always pass `issuedBefore` to `revokeTokens`.

### Package layout

`@ably/temporal` has two entry points:

| Entry point               | Imported by   | Exports                                                                                              |
| ------------------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| `@ably/temporal`          | Worker code   | `AblyRestPlugin`, `createActivities`, `ActivityNames`, `TemporalMetadataKeys`, `getAblyErrorDetails` |
| `@ably/temporal/workflow` | Workflow code | `TemporalRest`, `TemporalPaginatedResult`, `TemporalHttpPaginatedResponse`, `getAblyErrorDetails`    |

`ably`, `@temporalio/activity`, `common`, `plugin` and `workflow` are peer dependencies, and `engines` requires Node.js 20.3, as Temporal does. The workflow entry point imports nothing at runtime from `ably`, so it bundles into Temporal's workflow sandbox, and lint enforces that. The only change to `ably` is a public accessor for a page's links.

### Also decided in the prototype

These follow from the six decisions above and are recorded with their alternatives in `TEMPORAL_PLUGIN_DECISIONS.md`:

- Ably errors become a non-retryable `ApplicationFailure` unless transient, so a 4xx is not retried forever, and a workflow can tell "did not happen" from "unknown".
- The default activity options do not cap retries to the 2-minute dedupe window. Durable retry through an outage is what Temporal users expect. The docs recommend `scheduleToCloseTimeout: '90 seconds'` where every retry must be deduplicated.
- Binary data crosses the activity boundary through a tagged base64 codec rather than a custom payload converter, which would have to be configured on every Temporal client.

## Action items

- [x] Owen Pearson: extend derived keys to `annotations.publish`/`delete` (`id`) and to `updateMessage`/`deleteMessage` (`?idempotencyKey=`) in the prototype, with sandbox tests. The sandbox confirms that Ably deduplicates a retry of each.
- [ ] Mutable messages owners: stop applying an append whose `idempotencyKey` was already seen. The append is currently applied before the channel recognises the duplicate. Decide whether appends should appear in `getMessageVersions`.
- [ ] Pub/sub owners: return the original serials for a publish deduplicated on `?idempotencyKey=`.
- [ ] Owen Pearson: write the verify-before-retry guidance into `docs/temporal.md`. The push guidance is written.
- [ ] LiveObjects team: schedule server changes 1–4 from decision 4, and correct the RSO3d4 wording in ably/specification#475.
- [ ] SDK team: agree a public accessor for a page's links in ably-js.
- [x] Owen Pearson: add channel release, `channelOptions(name)` and `push.admin` to the prototype, with push notifications sent with a single attempt by default.
- [ ] Owen Pearson: move the prototype into an `@ably/temporal` repository.
- [ ] Owen Pearson: check whether `createApnsBroadcast` and `liveActivity.*` are idempotent on the server.
- [ ] Docs: document `?idempotencyKey=` on publish and message operations in the REST API reference, including its window and that it is scoped to the channel.
- [ ] Product: approve the public API and the separate `@ably/temporal` package.

## Outcome

---

> **DR checklist**
>
> - [ ] Background states why the decision is needed now
> - [ ] At least two genuine options for each decision, each with strengths and weaknesses
> - [ ] Recommendation explains why each other option was rejected
> - [ ] Impact set; Driver and Approver filled in; product is an Approver (public interface change)
> - [ ] Shared in #all-rfcs-drs with a due date no more than 2 weeks out
