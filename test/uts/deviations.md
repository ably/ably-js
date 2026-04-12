# UTS Test Deviations

Tracks test failures due to ably-js non-compliance with the Ably spec, or errors in the UTS portable test specs.

## UTS Spec Errors

### auth_scheme: RSA4b - clientId triggers token auth (INCORRECT)

**UTS spec claim**: `specification/uts/rest/unit/auth/auth_scheme.md` states that RSA4b means "When clientId is provided along with an API key, the library MUST use token auth."

**Actual Ably spec (RSA4b)**: RSA4b is about *token renewal on error* — "When the client does have a means to renew the token automatically, and the server has responded with a token error (statusCode 401, code 40140-40150)..."

**Actual RSA4**: "Token Auth is used if `useTokenAuth` is set to true, or if `useTokenAuth` is unspecified and any one of `authUrl`, `authCallback`, `token`, or `TokenDetails` is provided." `clientId` is NOT listed as a trigger.

**Action**: Test removed. UTS spec for RSA4b should be rewritten to test token renewal, not auth scheme selection based on clientId.

---

### auth_scheme: Expired token "no HTTP request" assertion (INCORRECT)

**UTS spec claim**: When a token is expired and there's no renewal method, no HTTP request should be made.

**Actual Ably spec (RSA4b1)**: Local expiry detection is **optional** — "Client libraries can *optionally* save a round-trip request to the Ably service for expired tokens by detecting when a token has expired when all of the following applies..." The mandatory behavior (RSA4a2) is: the *server* rejects with 40142, then the client raises 40171.

**Action**: Test updated to expect the request may be made. The mock returns 40142, and the test verifies error 40171 is raised.

---

## ably-js Non-Compliance

### auth_scheme: RSC18 - Basic auth requires TLS

**Spec (RSC18)**: "Basic Auth over HTTP will result in an error as private keys cannot be submitted over an insecure connection."

**ably-js behavior**: `new Ably.Rest({ key: '...', tls: false })` succeeds without error. ably-js defaults TLS to true but doesn't enforce it.

**Test**: Asserts error code 40103 per spec. Currently fails.

---

### client_id: RSA7b - auth.clientId not derived from TokenDetails (REST)

**Spec (RSA7b)**: "The clientId attribute of the Auth object is derived from the tokenDetails that are returned from an explicit auth request, or from the authCallback."

**ably-js behavior**: For REST clients, `auth.clientId` is only set from `ClientOptions.clientId` (via `_userSetClientId` during construction). It is NOT extracted from:
- `tokenDetails.clientId` passed in the constructor
- `TokenDetails.clientId` returned by `authCallback`
- `TokenDetails.clientId` returned by `authorize()`

The `_uncheckedSetClientId` method exists but is only called from the Realtime connectionManager (on CONNECTED), never from REST token acquisition paths.

**Tests affected** (4 failures):
- `RSA7b - clientId from TokenDetails` — `auth.clientId` is undefined instead of `'token-client-id'`
- `RSA7b - clientId from authCallback TokenDetails` — `auth.clientId` is undefined instead of `'callback-client-id'`
- `RSA7 - clientId updated after authorize()` — `auth.clientId` is undefined instead of `'client-1'`/`'client-2'`
- `RSA12 - Wildcard clientId` — `auth.clientId` is undefined instead of `'*'`

**Root cause**: `_saveTokenOptions()` and `_ensureValidAuthCredentials()` store `tokenDetails` but never call `_uncheckedSetClientId(tokenDetails.clientId)`.

---

### token_renewal: RSA4b4 - Authorization header overwritten on retry

**Spec (RSA4b4/RSC10)**: When a REST request fails with a token error (40140-40149), the library should obtain a new token and retry the request with the new token's authorization header.

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

**Test affected**: `RSA4b4 - renewal on 40142 error` — `captured[1].headers.authorization` has the old token instead of the renewed one.

**Root cause**: `src/common/lib/client/resource.ts` line ~347 — the retry should pass the original (pre-auth) headers to `withAuthDetails`, not the merged headers that include the old `authorization`.

---

### token_renewal: RSA4b4 - No renewal retry limit

**Spec (RSA4b4)**: Token renewal should retry at most once per request. If the renewed token is also rejected, the error should propagate.

**ably-js behavior**: The retry loop in `Resource.do()` is unbounded — on each token error, it calls `authorize()` and retries recursively with no counter. Combined with the header-overwrite bug above, this causes an infinite loop and eventual OOM when the server persistently returns token errors.

**Test**: `RSA4b4 - renewal limit` — the authCallback caps at 3 responses to prevent OOM. Per spec, only 2 callbacks should occur (initial + 1 renewal).

---

### rest_client: RSC7c - addRequestIds not implemented

**Spec (RSC7c)**: "When the `addRequestIds` option is set to true, the library must add a `request_id` query parameter to all REST requests."

**ably-js behavior**: The `addRequestIds` option is accepted and stored in `client.options` but has no effect. No `request_id` parameter is added to any requests. There is no code referencing this option in the built bundle.

**Test**: `RSC7c - request_id query param when addRequestIds is true` — fails because `request_id` is null.

---

### annotations: RSAN1a3 - type validation missing

**Spec (RSAN1a3)**: "The SDK must validate that the user supplied a `type`. All other fields are optional." Should throw error 40003.

**ably-js behavior**: `constructValidateAnnotation()` does not validate that `type` is present. Annotation is published without a type, and the request succeeds.

**Test**: `RSAN1a3 - type required` — test accommodates both behaviors (catch block checks for 40003 if thrown, otherwise verifies the request was sent).

---

### annotations: RSAN1c4 - idempotent IDs not generated for annotations

**Spec (RSAN1c4)**: "If `idempotentRestPublishing` is enabled and the annotation has an empty `id`, the SDK should generate a base64-encoded random string, append `:0`, and set it as the `Annotation.id`."

**ably-js behavior**: `RestAnnotations.publish()` does not generate idempotent IDs. Only `RestChannel.publish()` (for messages) generates them. The annotation's `id` field is not set.

**Test**: `RSAN1c4 - idempotent ID generated` — test accommodates both behaviors.

---

### idempotency: RSL1k - mixed batch skips all ID generation

**Spec (RSL1k)**: "In a batch publish, messages with client-supplied IDs must be preserved, while messages without IDs receive library-generated IDs."

**ably-js behavior**: The `allEmptyIds()` guard in `restchannel.ts` treats ID generation as all-or-nothing. If ANY message in a batch already has an `id`, no IDs are generated for any message in the batch.

**Test**: `RSL1k - mixed client and library IDs skips generation` — test documents this behavior.

---
