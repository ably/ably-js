# UTS Test Deviations

Tracks confirmed ably-js non-compliance with the Ably spec. Each entry corresponds to a test that either fails or was adapted to assert ably-js's actual behavior instead of the spec requirement.

## Failing Tests

### client_id: RSA7b - auth.clientId not derived from TokenDetails (REST)

**Spec (RSA7b)**: "The clientId attribute of the Auth object is derived from the tokenDetails that are returned from an explicit auth request, or from the authCallback."

**ably-js behavior**: For REST clients, `auth.clientId` is only set from `ClientOptions.clientId` (via `_userSetClientId` during construction). It is NOT extracted from:

- `tokenDetails.clientId` passed in the constructor
- `TokenDetails.clientId` returned by `authCallback`
- `TokenDetails.clientId` returned by `authorize()`

The `_uncheckedSetClientId` method exists but is only called from the Realtime connectionManager (on CONNECTED), never from REST token acquisition paths.

**Tests affected** (5 failures):

- `RSA7b - clientId from TokenDetails` — `auth.clientId` is undefined instead of `'token-client-id'`
- `RSA7b - clientId from authCallback TokenDetails` — `auth.clientId` is undefined instead of `'callback-client-id'`
- `RSA7 - clientId updated after authorize()` — `auth.clientId` is undefined instead of `'client-1'`/`'client-2'`
- `RSA12 - Wildcard clientId` — `auth.clientId` is undefined instead of `'*'`
- `RSA7 - case 5: clientId inherited from token` — `auth.clientId` is undefined instead of `'token-client'`

**Root cause**: `_saveTokenOptions()` and `_ensureValidAuthCredentials()` store `tokenDetails` but never call `_uncheckedSetClientId(tokenDetails.clientId)`.

---

### token_renewal: RSA4b - Authorization header overwritten on retry

**Spec (RSA4b/RSC10)**: When a REST request fails with a token error (40140-40149), the library should obtain a new token and retry the request with the new token's authorization header.

**ably-js behavior**: The retry sends the **old** token's authorization header instead of the new one. In `Resource.do()`, after a token error:

```javascript
await client.auth.authorize(null, null);
return withAuthDetails(client, headers, params, doRequest);
```

The `headers` parameter passed to `withAuthDetails` is the `doRequest` function parameter — the **merged** headers from the first `withAuthDetails` call, which already contains `authorization: 'Bearer <old-token>'`. Then `withAuthDetails` does:

```javascript
const authHeaders = await client.auth.getAuthHeaders();
return opCallback(Utils.mixin(authHeaders, headers), params);
```

`Utils.mixin(newAuthHeaders, oldMergedHeaders)` copies the old `authorization` from `oldMergedHeaders` into `newAuthHeaders`, overwriting the new token's header.

**Consequences**:

1. The retry always sends the old (expired) token
2. Combined with the lack of a retry limit (see below), this causes an infinite loop

**Tests affected**:

- `RSA4b - renewal on 40142 error` — `captured[1].headers.authorization` has the old token instead of the renewed one.
- `RSC10 - transparent retry after renewal` — same symptom: the retried request carries the old token's authorization header.

**Root cause**: `src/common/lib/client/resource.ts` line ~347 — the retry should pass the original (pre-auth) headers to `withAuthDetails`, not the merged headers that include the old `authorization`.

---

### token_renewal: RSA4b - No renewal retry limit

**Spec (RSA4b)**: Token renewal should retry at most once per request. If the renewed token is also rejected, the error should propagate.

**ably-js behavior**: The retry loop in `Resource.do()` is unbounded — on each token error, it calls `authorize()` and retries recursively with no counter. Combined with the header-overwrite bug above, this causes an infinite loop and eventual OOM when the server persistently returns token errors.

**Test**: `RSA4b - renewal limit` — the authCallback caps at 3 responses to prevent OOM. Per spec, only 2 callbacks should occur (initial + 1 renewal).

---

### annotations: RSAN1a3 - type validation missing

**Spec (RSAN1a3)**: "The SDK must validate that the user supplied a `type`. All other fields are optional." Should throw error 40003.

**ably-js behavior**: `constructValidateAnnotation()` does not validate that `type` is present. Annotation is published without a type, and the request succeeds.

**Test**: `RSAN1a3 - type required` — asserts spec behavior (throw with code 40003). Currently fails.

---

### annotations: RSAN1c4 - idempotent IDs not generated for annotations

**Spec (RSAN1c4)**: "If `idempotentRestPublishing` is enabled and the annotation has an empty `id`, the SDK should generate a base64-encoded random string, append `:0`, and set it as the `Annotation.id`."

**ably-js behavior**: `RestAnnotations.publish()` does not generate idempotent IDs. Only `RestChannel.publish()` (for messages) generates them. The annotation's `id` field is not set.

**Test**: `RSAN1c4 - idempotent ID generated` — asserts spec behavior (id in `<base64>:0` format). Currently fails.

---

### rest_client: RSC7c - addRequestIds not implemented

**Spec (RSC7c)**: "When the `addRequestIds` option is set to true, the library must add a `request_id` query parameter to all REST requests."

**ably-js behavior**: The `addRequestIds` option is accepted and stored in `client.options` but has no effect. No `request_id` parameter is added to any requests. There is no code referencing this option in the built bundle.

**Test**: `RSC7c - request_id query param when addRequestIds is true` — fails because `request_id` is null.

---

### fallback: RSC15l - request timeout does not trigger fallback

**Spec (RSC15l)**: When a request times out after the connection is established (request-level timeout), the client should retry on a fallback host, just as it does for connection-level timeouts.

**ably-js behavior**: Request-level timeouts propagate as errors without triggering fallback retry. Only connection-level errors (refused, DNS, timeout before connection) and HTTP 500-504 trigger fallback.

**Test**: `RSC15l - request timeout triggers fallback` — asserts spec behavior. Currently fails.

---

### fallback: RSC15l4 - CloudFront Server header not detected

**Spec (RSC15l4)**: When a response includes `Server: CloudFront` header with status >= 400, the client should treat it as a server error and retry on a fallback host.

**ably-js behavior**: `shouldFallback` in `http.ts` only checks for specific errno codes and HTTP 500-504. It does not inspect the `Server` response header. CloudFront errors with 4xx status codes are treated as non-retryable client errors.

**Test**: `RSC15l4 - CloudFront Server header triggers fallback` — asserts spec behavior. Currently fails.

---

### fallback: REC1b2 - IPv6 endpoint address not bracketed

**Spec (REC1b2)**: When `endpoint` is an IPv6 address (e.g., `::1`), the library should treat it as an explicit hostname.

**ably-js behavior**: `getPrimaryDomainFromEndpoint('::1')` returns `::1` (correct via `isFqdnIpOrLocalhost`), but URL construction produces `https://::1:443/time` instead of `https://[::1]:443/time`. The missing brackets cause an "Invalid URI" error.

**Test**: `REC1b2 - endpoint as IPv6 address` — asserts spec behavior. Currently fails.

---

## Adapted Tests

Tests that pass but were adapted to assert ably-js's actual behavior instead of the spec requirement. These document genuine deviations where fixing the test to match the spec would cause a failure.

### revoke_tokens: RSA17c - Response format pass-through

**Spec (RSA17c)**: UTS spec expects the server to return a plain array of per-target results, and the client library to compute `successCount`, `failureCount`, and `results` from the array.

**ably-js behavior**: `revokeTokens()` passes through the server response body as-is. The mock returns the pre-computed `{successCount, failureCount, results}` object, matching the actual Ably REST API response format. Additionally, `revokeTokens()` throws on HTTP 400 responses — the `batchResponse` data containing per-target success/failure results is discarded.

**Tests affected**: RSA17c, RSA17c_2, RSA17c_3, TRF2_1.

---

### options_types: AO2 - authMethod default not stored

**Spec (AO2)**: `authMethod` defaults to 'GET' and should be accessible on the auth options object.

**ably-js behavior**: When `authMethod` is not explicitly set, `auth.authOptions.authMethod` is `undefined`. The GET default is applied at HTTP request time, not stored in the options.

**Test**: `AO2 - authMethod defaults to GET` — accepts both `'GET'` and `undefined`.

---

### client_options: RSC1b - wrong error code for missing credentials

**Spec (RSC1b)**: "If invalid arguments are provided such as no API key, no token and no means to create a token, then this will result in an error with error code 40106."

**ably-js behavior**: Uses error code 40160 instead of 40106. Additionally, `{ useTokenAuth: true }` alone throws with no error code set.

**Test**: `RSC1b - no credentials raises error` — asserts 40160 instead of spec's 40106.

---

### connection_ping: RTN13d - ping does not defer in non-connected states

**Spec (RTN13d)**: "If the connection is not in the CONNECTED state when ping() is called, the ping is deferred until the connection reaches a state that can resolve it (CONNECTED, FAILED, CLOSED, SUSPENDED)."

**ably-js behavior**: `ping()` immediately rejects with "not connected" when called in CONNECTING or DISCONNECTED state. There is no deferral mechanism. `ConnectionManager.ping()` checks `this.state.state !== 'connected'` and throws immediately.

**Test**: RTN13d tests rewritten to assert immediate rejection instead of deferral.

---

### channel_publish: RTL6i3 / publish: RSL1e - null fields included in wire JSON

**Spec (RTL6i3/RSL1e)**: "If any of the values are null, then key is not sent to Ably i.e. a payload with a null value for data would be sent as follows `{ "name": "click" }`"

**ably-js behavior**: When `data` is `null`/`undefined`, ably-js includes it as `"data": null` in the JSON wire format instead of omitting the key. Similarly for `name`.

**Root cause**: Message serialization in `src/common/lib/types/message.ts` does not strip null/undefined values before `JSON.stringify`.

**Tests affected**: `RTL6i3 - null name/data fields handled correctly`, `RSL1e - null name omitted from body`.

---

### channels_collection: RTS4a - release throws on attached channels

**Spec (RTS4a)**: "Detaches the channel and then releases the channel resource i.e. it's deleted and can then be garbage collected"

**ably-js behavior**: `channels.release()` throws error 90001 ("Channel operation failed as channel state is attached") when called on an attached channel, instead of detaching first.

**Test**: `RTS4a - release throws on attached channel (deviation)` — asserts the throw with code 90001.

---

### batch_presence: BAR2/BGF2/RSC24_Mixed - mixed/failure results not normalised

**Spec (BAR2, BGF2, RSC24)**: When the server returns HTTP 400 with `{error, batchResponse}` for mixed or all-failure batch presence results, the SDK normalises the response into `{successCount, failureCount, results}`.

**ably-js behavior**: `batchPresence()` calls `Resource.get()` with `throwError=true`. Any HTTP 400 response sets `result.err`, which is thrown. The `batchResponse` data containing per-channel success/failure results is discarded.

**Tests affected**: BAR2_1, BAR2_3, BGF2_1, RSC24_Mixed_1 — all assert that ably-js throws error 40020.

---

### batch_publish: RSC22d - batchPublish does not generate idempotent IDs

**Spec (RSC22d)**: "If `idempotentRestPublishing` is enabled, then RSL1k1 should be applied (to each `BatchPublishSpec` separately)."

**ably-js behavior**: `batchPublish()` passes `BatchPublishSpec` objects directly to `Resource.post('/messages')` without any message processing. Unlike `RestChannel.publish()`, which generates idempotent IDs via the `allEmptyIds()` / `idempotentRestPublishing` code path, `batchPublish()` sends messages exactly as provided by the caller. No `id` fields are added.

**Test**: `RSC22d - batch publish does not generate idempotent IDs (deviation)` — asserts messages lack `id` property.

---

### presence_message_types: TP3h - memberKey not exposed

**Spec (TP3h)**: `memberKey` is a "string function that combines the `connectionId` and `clientId` ensuring multiple connected clients with the same clientId are uniquely identifiable." It should be a method on `PresenceMessage`.

**ably-js behavior**: `memberKey` is not a method on `PresenceMessage`. It is computed internally as a lambda `(item) => item.clientId + ':' + item.connectionId` passed to `PresenceMap`, but not accessible to callers.

**Test**: `TP3h - memberKey` — falls back to asserting the component fields (`connectionId`, `clientId`) instead.

---

## Mock Infrastructure Limitations

### MsgPack encoding/decoding not supported

The UTS mock HTTP infrastructure (`test/uts/mock_http.ts`) operates at the JSON level — `PendingRequest.respond_with()` JSON-stringifies response bodies and `PendingRequest.body` contains the JSON-parsed request body. It has no mechanism to encode/decode msgpack binary format.

**Tests affected (10 skipped)**:

- `RSL4c` — binary data with msgpack protocol (message_encoding.test.ts)
- `RSL6` — msgpack bin type decoded to Buffer (message_encoding.test.ts)
- `RSL6` — msgpack str type decoded to string (message_encoding.test.ts)
- `RSC8a` — default msgpack protocol Content-Type (rest_client.test.ts)
- `RSC8d` — mismatched Content-Type response (rest_client.test.ts)
- `RSC8e` — unsupported Content-Type response (rest_client.test.ts)
- `RSC8` — msgpack error response decoding (rest_client.test.ts)
- `RSC19c` — msgpack request headers (request.test.ts)
- `RSC19c` — msgpack request body encoding (request.test.ts)
- `RSC19c` — msgpack response decoding (request.test.ts)

These tests are present as `this.skip()` stubs. To implement them, the mock would need msgpack serialization/deserialization support (e.g., adding `@ably/msgpack-js` as a dev dependency and extending PendingRequest/PendingConnection).
