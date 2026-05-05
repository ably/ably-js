# UTS Test Deviations

Tracks confirmed ably-js non-compliance with the Ably spec. Each entry corresponds to a test that fails because ably-js behavior differs from the spec requirement. Tests assert spec behavior and are allowed to fail — the failures document genuine deviations.

Tests marked with `if (!process.env.RUN_DEVIATIONS) this.skip()` are skipped by default but can be run with `RUN_DEVIATIONS=1 npm run test:uts`.

## Skipped Deviations (RUN_DEVIATIONS=1 to run)

These tests assert spec behavior but are skipped by default because they are known to fail. Run with `RUN_DEVIATIONS=1` to execute them.

### realtime_client: RTC1a - echoMessages default does not send echo=true

**Spec (RTC1a)**: The `echoMessages` option (default true) should be sent as `echo=true` query parameter.

**ably-js behavior**: ably-js only sends `echo=false` when `echoMessages` is explicitly false. When `echoMessages` is true (default), no `echo` parameter is sent — the server defaults to echoing.

**Test**: `RTC1a - echoMessages default sends echo=true` — asserts `echo=true` per spec.

---

### channel_detach: RTL5k - ATTACHED while detached does not send DETACH

**Spec (RTL5k)**: If the channel receives an ATTACHED message while in the DETACHED state, it should send a new DETACH message.

**ably-js behavior**: ably-js re-enters 'attached' state instead of sending DETACH when ATTACHED is received while detached.

**Test**: `RTL5k - ATTACHED while detached sends DETACH` — asserts `detachMessageCount == 2` and `channel.state == 'detached'` per spec.

---

### update_events: RTN24 - connection.id/key not updated on UPDATE

**Spec (RTN24)**: When a CONNECTED message is received while already CONNECTED, the connection details (including `connection.id` and `connection.key`) should be updated.

**ably-js behavior**: ably-js does NOT update `connection.id` or `connection.key` on subsequent CONNECTED messages. Only internal connectionDetails (`maxIdleInterval`, `connectionStateTtl`, etc.) are overridden. `connection.id` and `connection.key` are only set during transport activation (initial connect or resume).

**Root cause**: `activateTransport()` in `connectionmanager.ts` — id/key are set there, not in the CONNECTED message handler.

**Test**: `RTN24 - ConnectionDetails updated on new CONNECTED message` — asserts `connection.id == 'connection-id-2'` per spec.

---

### presence_reentry: RTP17e - re-entry error message missing clientId

**Spec (RTP17e)**: Failed re-entry should emit UPDATE with error code 91004 and message indicating the failure and clientId.

**ably-js behavior**: The error message is `'Presence auto re-enter failed'` without including the clientId.

**Test**: `RTP17e - failed re-entry emits UPDATE with error` — asserts `message.includes('my-client')` per spec.

---

### message_types: TM4 - toJSON not a method on Message

**Spec (TM4)**: Message type must support serialization to JSON wire format via a `toJSON` method.

**ably-js behavior**: `Message` instances do not expose a `toJSON` method. Serialization is handled internally.

**Test**: `TM4 - toJSON serialization` — calls `msg.toJSON()`, which throws `TypeError: msg.toJSON is not a function`.

---

### client_options: RSC1b - wrong error code for missing credentials

**Spec (RSC1b)**: Error code should be 40106.

**ably-js behavior**: Uses error code 40160 instead of 40106. Additionally, `{ useTokenAuth: true }` alone throws with no error code set.

**Tests**: `RSC1b - no credentials raises error`, `RSC1b - clientId alone raises error` (realtime), `RSC1b - Error when no auth method available` (REST).

**Issue**: [#2204](https://github.com/ably/ably-js/issues/2204)

---

### channel_publish: RTL6i3 / RSL1e - null fields included in wire JSON

**Spec (RTL6i3/RSL1e)**: Null values should be omitted from wire JSON.

**ably-js behavior**: Includes `"data": null` instead of omitting the key. Similarly for `name`.

**Tests**: `RTL6i3 - null name/data fields handled correctly` (realtime), `RSL1e - null name omitted from body`, `RSL1e - null data omitted from body` (REST).

**Issue**: [#2199](https://github.com/ably/ably-js/issues/2199)

---

### connection_ping: RTN13d - ping does not defer in non-connected states

**Spec (RTN13d)**: Ping should be deferred until the connection reaches a resolvable state.

**ably-js behavior**: `ping()` immediately rejects with "not connected".

**Test**: `RTN13d - ping deferred from CONNECTING until CONNECTED`.

**Issue**: [#2203](https://github.com/ably/ably-js/issues/2203)

---

### revoke_tokens: RSA17c - response format pass-through

**Spec (RSA17c)**: Client library should compute `successCount`, `failureCount`, and `results` from the server's raw array response.

**ably-js behavior**: Passes through the server response body as-is. Also throws on HTTP 400 responses.

**Tests**: `RSA17c - all success result`, `RSA17c_2 - mixed result normalised`, `RSA17c_3 - all failure normalised`, `TRF2_1 - failure details in results`.

**Issue**: [#2201](https://github.com/ably/ably-js/issues/2201)

---

### client_id: RSA7b - auth.clientId not derived from TokenDetails (REST)

**Spec (RSA7b)**: The clientId attribute of the Auth object should be derived from tokenDetails returned from auth requests.

**ably-js behavior**: `auth.clientId` is only set from `ClientOptions.clientId`, not extracted from tokenDetails.

**Tests**: `RSA7b - clientId from TokenDetails`, `RSA7b - clientId from authCallback TokenDetails`, `RSA7 - clientId updated after authorize()`, `RSA12 - Wildcard clientId`, `RSA7 - case 5: clientId inherited from token`.

**Issue**: [#2192](https://github.com/ably/ably-js/issues/2192)

---

### token_renewal: RSA4b - Authorization header overwritten on retry / no retry limit

**Spec (RSA4b/RSC10)**: Token renewal should use the new token's header and retry at most once.

**ably-js behavior**: The retry sends the old token's authorization header. The retry loop is unbounded.

**Tests**: `RSA4b - renewal on 40142 error`, `RSC10 - transparent retry after renewal`, `RSA4b - renewal limit`.

**Issue**: [#2193](https://github.com/ably/ably-js/issues/2193)

---

### annotations: RSAN1a3 - type validation missing

**Spec (RSAN1a3)**: The SDK must validate that the user supplied a `type`.

**ably-js behavior**: `constructValidateAnnotation()` does not validate that `type` is present.

**Tests**: `RSAN1a3 - type required` (realtime), `RTAN1a - publish validates type is required` (REST).

**Issue**: [#2194](https://github.com/ably/ably-js/issues/2194)

---

### annotations: RSAN1c4 / RSC22d - idempotent IDs not generated

**Spec (RSAN1c4)**: Annotations with empty `id` should get a generated idempotent ID. **Spec (RSC22d)**: Same for batch publish.

**ably-js behavior**: Neither `RestAnnotations.publish()` nor `batchPublish()` generates idempotent IDs.

**Tests**: `RSAN1c4 - idempotent ID generated`, `RSC22d - batch publish generates idempotent IDs`.

**Issue**: [#2195](https://github.com/ably/ably-js/issues/2195)

---

### rest_client: RSC7c - addRequestIds not implemented

**Spec (RSC7c)**: The `addRequestIds` option should add a `request_id` query parameter to all REST requests.

**ably-js behavior**: The option is accepted but has no effect.

**Test**: `RSC7c - request_id query param when addRequestIds is true`.

**Issue**: [#2196](https://github.com/ably/ably-js/issues/2196)

---

### fallback: RSC15l / RSC15l4 - request timeout and CloudFront header

**Spec (RSC15l)**: Request-level timeouts should trigger fallback. **Spec (RSC15l4)**: `Server: CloudFront` header with status >= 400 should trigger fallback.

**ably-js behavior**: Only connection-level errors and HTTP 500-504 trigger fallback. `Server` header not inspected.

**Tests**: `RSC15l - request timeout triggers fallback`, `RSC15l4 - CloudFront Server header triggers fallback`.

**Issue**: [#2197](https://github.com/ably/ably-js/issues/2197)

---

### fallback: REC1b2 - IPv6 endpoint address not bracketed

**Spec (REC1b2)**: IPv6 addresses should be supported as endpoint values.

**ably-js behavior**: URL construction produces `https://::1:443/time` instead of `https://[::1]:443/time`.

**Test**: `REC1b2 - endpoint as IPv6 address`.

**Issue**: [#2198](https://github.com/ably/ably-js/issues/2198)

---

### batch_presence: BAR2 / BGF2 / RSC24 - batch operations throw on HTTP 400

**Spec (BAR2/BGF2/RSC24)**: Batch operations should return per-target results including mixed success/failure.

**ably-js behavior**: Throws on HTTP 400 responses — the per-target result data is discarded.

**Tests**: `BAR2_1 - mixed results normalised`, `BAR2_3 - all failure normalised`, `BGF2_1 - failure result normalised with error details`, `RSC24_Mixed_1 - mixed results normalised`.

**Issue**: [#2201](https://github.com/ably/ably-js/issues/2201)

---

### options_types: AO2 - authMethod default not stored

**Spec (AO2)**: `authMethod` should default to `'GET'` and be stored in auth options.

**ably-js behavior**: Default `authMethod` is not stored.

**Test**: `AO2 - authMethod defaults to GET`.

**Issue**: [#2205](https://github.com/ably/ably-js/issues/2205)

---

### presence_message_types: TP3h - memberKey not exposed

**Spec (TP3h)**: `PresenceMessage` should expose a `memberKey` property.

**ably-js behavior**: `memberKey` is not exposed on `PresenceMessage`.

**Test**: `TP3h - memberKey format`.

**Issue**: [#2202](https://github.com/ably/ably-js/issues/2202)

---

### channels: RTL4c - errorReason not cleared on successful re-attach

**Spec (RTL4c, proposed)**: When a confirmation ATTACHED is received, the channel's errorReason should be set to null.

**ably-js behavior**: After a channel enters FAILED state, a subsequent successful `attach()` does not clear `errorReason`.

**Note**: This is a proposed spec change (see [specification#459](https://github.com/ably/specification/issues/459)).

**Tests**: `RTL4g - errorReason cleared on re-attach from FAILED`, `RTL4g - errorReason cleared on re-attach and detach`.

---

### presence_sync: RTP18a - new sync does not discard in-flight sync

**Spec (RTP18a)**: If a new SYNC sequence begins while one is in progress, the previous sync should be discarded.

**ably-js behavior**: Does not discard the previous sync.

**Test**: `RTP18a - new sync discards previous in-flight sync`.

---

### integration/auth: RSC10 - token renewal infinite loop with expired JWT

**Spec (RSC10)**: When a REST request fails with a token error (40140-40149), the client should renew the token and retry.

**ably-js behavior**: Same root cause as the unit test RSA4b deviation — `withAuthDetails` overwrites the new authorization header with the stale one from the previous attempt, causing an infinite retry loop. Confirmed against the sandbox: the authCallback is called hundreds of times, each returning a valid JWT, but the request always sends the old expired token.

**Test**: `RSC10 - token renewal with expired JWT` in `rest/integration/auth.test.ts`.

**Issue**: [#2193](https://github.com/ably/ably-js/issues/2193) (same root cause as unit test deviations RSA4b/RSC10)

---

### integration/push_admin: RSH1b2 - push device list pagination missing Link headers

**Spec (RSH1b2)**: `deviceRegistrations.list` with `limit` should support pagination via `hasNext()`.

**Server behavior**: The push admin `GET /push/deviceRegistrations` endpoint does not return `Link` headers when `limit` is used, even when more results exist. With 3 devices registered and `limit=2`, the response returns 2 items but `hasNext()` is false because there is no `Link: rel="next"` header.

**Test**: `RSH1b2 - list supports pagination with limit` in `rest/integration/push_admin.test.ts`.

**Issue**: [ably/realtime#8380](https://github.com/ably/realtime/issues/8380)

---

## Mock Infrastructure Limitations

### MsgPack encoding/decoding not supported

The UTS mock HTTP infrastructure operates at the JSON level. It has no mechanism to encode/decode msgpack binary format.

**Tests affected (10 skipped)**:

- `RSL4c` — binary data with msgpack protocol
- `RSL6` — msgpack bin/str type decoding (2 tests)
- `RSC8a` — default msgpack protocol Content-Type
- `RSC8d` — mismatched Content-Type response
- `RSC8e` — unsupported Content-Type response
- `RSC8` — msgpack error response decoding
- `RSC19c` — msgpack request headers/body/response (3 tests)
