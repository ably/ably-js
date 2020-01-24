# Change Log

This contains only the most important and/or user-facing changes; for a full changelog, see the commit history.

## [1.1.24](https://github.com/ably/ably-js/tree/1.1.24) (2020-01-24)
- Minor bug fix to comet transport
- Update ably-common submodule for errors.json parsing fix

## [1.1.23](https://github.com/ably/ably-js/tree/1.1.23) (2020-01-08)
- Disable bundling for messages with user-set ids

## [1.1.22](https://github.com/ably/ably-js/tree/1.1.22) (2019-10-28)
- Add some missing ClientOptions to typescript type definition file

## [1.1.21](https://github.com/ably/ably-js/tree/1.1.21) (2019-10-22)
- BufferUtils overhaul (consistent return type on browsers (ArrayBuffer vs WordArray), hexDecode, support typed arrays, and more
- Add error reporting mechanism

## [1.1.20](https://github.com/ably/ably-js/tree/1.1.20) (2019-10-05)
- Fix channel.history with promises bug when using the realtime client
- Auth no way to renew warning: upgrade to error

## [1.1.19](https://github.com/ably/ably-js/tree/1.1.19) (2019-10-03)
- Fix EventEmitter.once typings https://github.com/ably/ably-js/pull/610

## [1.1.18](https://github.com/ably/ably-js/tree/1.1.18) (2019-09-18)
- Fix typings for channel.presence.unsubscribe https://github.com/ably/ably-js/pull/608
- Tweak connection code for generic connection issues (80000 -> 80003)
- Make promisified rest.request() easier to use correctly

## [1.1.17](https://github.com/ably/ably-js/tree/1.1.17) (2019-09-03)
- Fix TS1036 tslint warning when importing ably/promises
- Add delta generation stats infrastructure

## [1.1.16](https://github.com/ably/ably-js/tree/1.1.16) (2019-07-24)
- Fix regression for browser commonjs distribution
- Allow non-ascii clientIds for REST requests

## [1.1.15](https://github.com/ably/ably-js/tree/1.1.15) (2019-07-02)
- Fix type definition for realtime presence.get() with the Promise API

## [1.1.14](https://github.com/ably/ably-js/tree/1.1.14) (2019-06-25)
- Add check for double-encoded tokens
- Reinstate message suppression based on connectionSerial to ensure no duplicate messages during transport upgrades
- Support running in a webworker context that uses `self` as the global object (thanks to Clifton Hensley for that contribution!)

## [1.1.13](https://github.com/ably/ably-js/tree/1.1.13) (2019-06-19)
- Log the content-type of an authUrl response

## [1.1.12](https://github.com/ably/ably-js/tree/1.1.12) (2019-06-10)
- Only ever deduplicate messages on the same channel
- Support uncompressed data stats

## [1.1.11](https://github.com/ably/ably-js/tree/1.1.11) (2019-05-22)
- Allow token strings (including JWT tokens) up to 128kB

## [1.1.10](https://github.com/ably/ably-js/tree/1.1.10) (2019-05-16)
- Fix channel#unsubscribe() throwing an error if called on a failed channel
(also removes the optional callback argument to subscribe(), which was
undocumented and almost useless anyway since it was only called in the
event of a failed channel)

## [1.1.9](https://github.com/ably/ably-js/tree/1.1.9) (2019-05-08)
- Auth: fix tokenParams missing from token requests in the event that no authParams are specified

## [1.1.8](https://github.com/ably/ably-js/tree/1.1.8) (2019-04-30)
- Auth: if you do multiple concurrent authorize()s, make sure the token from last one wins
- If fallback hosts are enabled and a connection is abruptly disconnected with a 5xx error, retry immediately to a fallback rather than waiting the usual 15s disconnectedRetryTimeout

## [1.1.7](https://github.com/ably/ably-js/tree/1.1.7) (2019-03-27)
- Catch common failure mode with poorly-implemented authCallback
- Fix typings of TokenParams.capability

## [1.1.6](https://github.com/ably/ably-js/tree/1.1.6) (2019-03-19)
- Improve handling of responso to active traffic management placement constraint error for smooth cluster handover
- Normalise statuscode for 40170-failure to obtain token from client auth callback to 401 per spec

## [1.1.5](https://github.com/ably/ably-js/tree/1.1.5) (2019-02-27)
- Only autoremove an expired token if we know the local offset from server time
- Fix tokenParams not being correctly mixed in to authParams in some circumstances

## [1.1.4](https://github.com/ably/ably-js/tree/1.1.4) (2019-02-25)
- Support PUSH, PATCH, and DELETE in Rest#request()
- Support arbitrary params for REST publishes
- Fix scope leak issue when using the minified version of the library

## [1.1.3](https://github.com/ably/ably-js/tree/1.1.3) (2019-02-11)
- Rewrite typescript typings to satisfy `tsc --strict`
- PNRG changes needed for newer versions of react-native

## [1.1](https://github.com/ably/ably-js/tree/1.1) (2019-02-06)
- Promises support
- Admin api for push notifications
- Many minor bugfixes

## [1.0.23](https://github.com/ably/ably-js/tree/1.0.23) (2019-01-21)
- Only make a single token request at a time
- Fix crash with react-native on some Android versions when making REST requests
- Tweak fallback host logic for connected realtime clients making REST requests

## [1.0.21](https://github.com/ably/ably-js/tree/1.0.21) (2019-01-07)
- Reinstate 'stop clientId forcing token auth' change (https://github.com/ably/ably-js/issues/542)
- Prioritise a tokenParam over an authParam of the same name
- Fix behaviour with multiple concurrent pings in-flight
- Use console.warn (if present) when logging at ERROR level
- Implement client-side-enforced maxMessageSize limit and bundling constraints
- Deduce streaming response from lack of content-length header even if no transfer-encoding

## [1.0.20](https://github.com/ably/ably-js/tree/1.0.20) (2018-12-02)
- Temporarily back out of clientId change due to CORS issue

## [1.0.19](https://github.com/ably/ably-js/tree/1.0.19) (2018-11-22)

- Expose rest#setLog method to change log level or handler at runtime
- Allow jsonp for REST requests even if allowComet is false
- Expose Rest.Message for node, for consistency with Realtime.Message
- Add updateOnAttached channel option to force 'update' event even if `resumed` is true
- Stop a clientId from forcing token auth (https://github.com/ably/ably-js/issues/542)
- Fix package bloat through mistaken node_modules_node6 includes (due to npm not correctly parsing .gitignore)

## [1.0.18](https://github.com/ably/ably-js/tree/1.0.18) (2018-09-27)

- Fix bug where connectionSerial was not getting reset after a resume failure (https://github.com/ably/ably-js/pull/540)

## [1.0.17](https://github.com/ably/ably-js/tree/1.0.17) (2018-09-19)

- Give presence.subscribe attach callback the same behaviour as channel.subscribe, for consistency (so it calls back once attached rather than only in the event of an attach error) (https://github.com/ably/ably-js/pull/526)
- Handle empty string response from an authUrl or authCallback as a token error
- Upgrade ws module to v5 (nodejs only) (https://github.com/ably/ably-js/pull/525)

**Note: this release drops support for nodejs versions < 4.5.** node v4 versions 4.5 or later are still supported; customers using node v4 are highly encouraged to update to the latest 4.x branch for security reasons

## [1.0.16](https://github.com/ably/ably-js/tree/1.0.16) (2018-06-25)

- Ensure a message id is included when serialized (https://github.com/ably/ably-js/pull/518)

## [1.0.15](https://github.com/ably/ably-js/tree/1.0.15) (2018-06-21)

- Add support for JWT (https://github.com/ably/ably-js/pull/511)
- Use https instead of git to pull dependencies (https://github.com/ably/ably-js/pull/515)
- Fix compilation issue with Google Closure compiler (https://github.com/ably/ably-js/pull/517)

## [1.0.14](https://github.com/ably/ably-js/tree/1.0.14) (2018-05-16)

- Avoid xhr with local files on chrome 65+ (https://github.com/ably/ably-js/pull/490)
- Update websocket library on node
- Improvements to Rest#request error handling
- Update nodejs supported versions
- TypeScript namespace change (`ablyLib` -> `Types` -- https://github.com/ably/ably-js/pull/492)

## [1.0.13](https://github.com/ably/ably-js/tree/1.0.13) (2018-02-01)

- Fix resume regression in 1.0.12

## [1.0.12](https://github.com/ably/ably-js/tree/1.0.12) (2018-01-30)

- Fix Typescript definition files (https://github.com/ably/ably-js/pull/444)
- Fix sync connection when an upgrade fails (https://github.com/ably/ably-js/pull/445)
- Fix encryption on IE9 and IE10 (https://github.com/ably/ably-js/pull/453)
- Fix crash on `Logger.LOG_ERROR` (https://github.com/ably/ably-js/pull/439/files)
- The `closeOnUnload` option now defaults to true (https://github.com/ably/ably-js/commit/293aed15d7ecaa001a3f834871b78d0403b195d7)


## [1.0.11](https://github.com/ably/ably-js/tree/1.0.11) (2017-12-11)

- Allow Message#fromEncoded to take a short-form (key-only) cipherParams (https://github.com/ably/ably-js/pull/438)

[note: 1.0.10 skipped due to buggy version on npm used to create package; see https://github.com/npm/npm/issues/18870]

## [1.0.9](https://github.com/ably/ably-js/tree/1.0.9) (2017-11-22)

- Add ability for an auth server to trigger a client to move to the failed state by returning an HTTP 403 [\#434](https://github.com/ably/ably-js/pull/434)

- Enable transient publishes when publish is called on a channel that isn't already attached [\#430](https://github.com/ably/ably-js/pull/430)

- Fix bug where qs params provided in an authUrl were being discarded after first use [\#433](https://github.com/ably/ably-js/pull/433)

- Default to logging timestamps on all platforms

- Tweak websocket error log levels to avoid logging non-error closes at ERROR level

[note: 1.0.8 was an npm-only release to fix a minor build error in the published artifact]

## [1.0.7](https://github.com/ably/ably-js/tree/1.0.7) (2017-10-12)

- Fix idle timeout bug when timer extended due to positive timeRemaning (if setTimeout is overly eager) [\#421](https://github.com/ably/ably-js/pull/421)

- Fix channel state change log message when error is not an ErrorInfo [\#420](https://github.com/ably/ably-js/pull/420)

- Stop network error trading a token request for a token failing the connection [\#419](https://github.com/ably/ably-js/pull/419)

## [1.0.6](https://github.com/ably/ably-js/tree/1.0.6) (2017-09-26)

- Fix issue where presence updates sent immediately after a recover can be ignored [\#412](https://github.com/ably/ably-js/pull/412)

- Fix authMethod being ignored if there are no authParams: [\#415](https://github.com/ably/ably-js/pull/415)

- Combine authParams with querystring params given in an authUrl, rather than replace: [\#418](https://github.com/ably/ably-js/pull/418)

## [1.0.5](https://github.com/ably/ably-js/tree/1.0.5) (2017-07-04)

- Fix issue with webpack module resolution: [\#404](https://github.com/ably/ably-js/pull/404)

- Implement Channels#release: [\#405](https://github.com/ably/ably-js/pull/405)

- Fix various bugs with useBinaryProtocol: true [\#406](https://github.com/ably/ably-js/pull/406)

## [1.0.4](https://github.com/ably/ably-js/tree/1.0.4) (2017-04-24)

- Have the default logHandler on node log timestamps (https://github.com/ably/ably-js/issues/399)

- Don't require Ably-protocol-level heartbeats by default on node (https://github.com/ably/ably-js/pull/398)

- Cherry-pick syncComplete fn->bool and other changes and fixes from 0.9 branch that didn't make it into 1.0.0

## [1.0.3](https://github.com/ably/ably-js/tree/1.0.3) (2017-04-17)

- Improved NativeScript supprot [\#392](https://github.com/ably/ably-js/pull/392)

- Fix bug in 1.0.2 where channels can never become reattached after a computer goes into sleep mode [\#396](https://github.com/ably/ably-js/pull/396)

## [1.0.2](https://github.com/ably/ably-js/tree/1.0.2) (2017-03-20)

- Don’t attempt a resume if last known activity was greater than the connectionStateTtl ago [\#389](https://github.com/ably/ably-js/pull/389)

## [1.0.1](https://github.com/ably/ably-js/tree/1.0.1) (2017-03-13)

- Only use websocket transport in node unless comet explicitly requested with `transports: ['comet']` or `transports: ['comet', 'web_socket']` [\#382](https://github.com/ably/ably-js/pull/382)

- Fix issue with multiple attaches happening after a failed resume [\#386](https://github.com/ably/ably-js/pull/386)

## [1.0](https://github.com/ably/ably-js/tree/1.0.0) (2017-03-08)

- Lots of changes; see https://github.com/ably/docs/issues/235 for the most important and/or breaking changes and upgrade notes, or the [full Changelog](https://github.com/ably/ably-js/compare/0.8.42...1.0.0)

## [0.8.42](https://github.com/ably/ably-js/tree/0.8.42) (2017-02-27)

- Fix presence issue when receive >9 presence updates from the same connection by backporting 0.9 presence newness algorithm  5ce4fa8

- Fix on('attached') registration in an on('attached') block firing immediately [\#364](https://github.com/ably/ably-js/issues/364)

## [0.8.41](https://github.com/ably/ably-js/tree/0.8.41) (2016-10-26)

- Fix occasional anomalously low presence set right after a sync [abb03f5](https://github.com/ably/ably-js/commit/abb03f5fb4dc86aa13ed60e2def030c30b151852)

## [0.8.40](https://github.com/ably/ably-js/tree/0.8.40) (2016-10-24)

- Fix ‘server’ header CORS warning in chrome for non-ably endpoints [\#345](https://github.com/ably/ably-js/pull/345)

## [0.8.39](https://github.com/ably/ably-js/tree/0.8.39) (2016-10-21)

- Disable xhr streaming if using cloudflare [\#342](https://github.com/ably/ably-js/pull/342)

## [0.8.38](https://github.com/ably/ably-js/tree/0.8.38) (2016-10-12)

- Node: remove runtime dependencies on crypto-js and buffertools [\#340](https://github.com/ably/ably-js/pull/340)

- Fix closeOnUnload on IE11 [\#338](https://github.com/ably/ably-js/issues/338)

## [0.8.37](https://github.com/ably/ably-js/tree/0.8.37) (2016-09-21)

- Node requests: limit max rest request TCP parallelism to 40 [\#336](https://github.com/ably/ably-js/pull/336)

## [0.8.36](https://github.com/ably/ably-js/tree/0.8.36) (2016-09-14)

- Backport subscribing with an event array fix from 0.9

## [0.8.35](https://github.com/ably/ably-js/tree/0.8.35) (2016-09-12)

- Node: try fallback hosts on ECONNRESET

## [0.8.34](https://github.com/ably/ably-js/tree/0.8.34) (2016-09-08)

- Node: keep TCP stream alive between REST requests; update `request` module [\#331](https://github.com/ably/ably-js/pull/331)

## [0.8.33](https://github.com/ably/ably-js/tree/0.8.33) (2016-08-19)

- Upgrade node websocket library for node 6 compatibility [\#326](https://github.com/ably/ably-js/pull/326)

## [0.8.32](https://github.com/ably/ably-js/tree/0.8.32) (2016-08-17)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.31...0.8.32)

- Rate-limit autoreconnect attempts to a maximum of 1 per second [\#322](https://github.com/ably/ably-js/pull/322)

- Fix REST fallback host functionality [\#327](https://github.com/ably/ably-js/pull/327)

## [0.8.31](https://github.com/ably/ably-js/tree/0.8.31) (2016-08-10)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.30...0.8.31)

- Add webpack/commonjs support [\#321](https://github.com/ably/ably-js/pull/321)

## [0.8.30](https://github.com/ably/ably-js/tree/0.8.30) (2016-07-18)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.29...0.8.30)

- Fix an issue where channels with large numbers of presence members (>100) could occasionally see a reduced presence set [\#319](https://github.com/ably/ably-js/pull/319)

## [0.8.29](https://github.com/ably/ably-js/tree/0.8.29) (2016-07-15)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.28...0.8.29)

- Fix an issue where messages retried across a transport upgrade could theoretically lead to duplicate messages [\#308](https://github.com/ably/ably-js/pull/308)

- Fix an issue where a client-detectable auth error on connect could cause the connect attempt to fail after the connect timeout (15s) rather than immediately [\#314](https://github.com/ably/ably-js/pull/314)

## [0.8.28](https://github.com/ably/ably-js/tree/0.8.28) (2016-07-13)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.27...0.8.28)

- Fix an issue where a server-sent channel detached message could cause the channel to go into the failed state [\#313](https://github.com/ably/ably-js/pull/313)

## [0.8.26](https://github.com/ably/ably-js/tree/0.8.26) (2016-07-11)
## [0.8.25](https://github.com/ably/ably-js/tree/0.8.25) (2016-07-06)

No net changes. 0.8.25 reverted a new header addition due to Ably not yet sending the correct `access-control-allow-headers` CORS headers for it; 0.8.26 re-adds it.

## [0.8.24](https://github.com/ably/ably-js/tree/0.8.24) (2016-07-06)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.23...0.8.24)

**Biggest changes:**

- Store transport preferences in memory not just localstorage, for node clients [\#303](https://github.com/ably/ably-js/pull/303)

- Fix issues with sync failures leading to lib sticking in the `synchronizing` state [\#302](https://github.com/ably/ably-js/pull/302)

- Add lib version string to connect querystring an as a header for REST [\#304](https://github.com/ably/ably-js/pull/304)

## [0.8.23](https://github.com/ably/ably-js/tree/0.8.23) (2016-07-01)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.22...0.8.23)

**Biggest changes:**

- Fix exception on accessing localStorage in Safari in private mode [\#298](https://github.com/ably/ably-js/pull/298)

- Fix bug causing transports to occasionally stick around after they should have been disconnected in some circumstances [\#296](https://github.com/ably/ably-js/pull/296)

- Sacrifice commas to appease IE8 [479152f](https://github.com/ably/ably-js/commit/479152f)

## [0.8.22](https://github.com/ably/ably-js/tree/0.8.22) (2016-06-24)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.21...0.8.22)

**Biggest changes:**

- Log and emit errors that occur on-connect (resume failures and upgrade failures) [\#291](https://github.com/ably/ably-js/pull/291)

- Rework upgrade flow so that all messages complete on one transport before switching to another, to avoid 'Invalid transport ID' message race condition [\#291](https://github.com/ably/ably-js/pull/291)

- Fix issue [\#285](https://github.com/ably/ably-js/issues/285) where a detach that happens during a presence sync could fail (also [\#291](https://github.com/ably/ably-js/pull/291))

- Log all connectionDetails on transport active (including the server you're connected to), not just clientId [\#294](https://github.com/ably/ably-js/pull/294)

- Implement `waitForSync` option in (realtime form of) `presence.get()` [\#295](https://github.com/ably/ably-js/pull/295)

## [0.8.21](https://github.com/ably/ably-js/tree/0.8.21) (2016-06-21)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.20...0.8.21)

**Biggest changes:**

- Fix bug where comet transports would occasionally send messages out of order if the sending rate is very high [\#290](https://github.com/ably/ably-js/pull/290)

## [0.8.20](https://github.com/ably/ably-js/tree/0.8.20) (2016-06-13)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.19...0.8.20)

**Biggest changes:**

- Rewrite the transport fallback sequence. It now starts with a polling transport (since some proxies break streaming transports) and then tries to upgrade to a websocket and streaming transport in parallel, picking the websocket if possible. It also remembers the best transport that worked (using HTML5 localstorage) and jumps straight to that if it can. [\#279](https://github.com/ably/ably-js/pull/279)

- Fix crypto bug when generating random data in IE 8 and 9 [\#282](https://github.com/ably/ably-js/pull/282)

- Disable JSONP transport when document is undefined, for React Native support [\#283](https://github.com/ably/ably-js/pull/283)

- Clear presence set on detach [\#287](https://github.com/ably/ably-js/pull/287)

## [0.8.19](https://github.com/ably/ably-js/tree/0.8.19) (2016-05-18)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.18...0.8.19)

**Biggest changes:**

- Fix connection state race condition when one transport drops while another is pending [\#274](https://github.com/ably/ably-js/pull/274)

- Make LOG\_MAJOR log level (i.e. level 3) much more friendly [\#275](https://github.com/ably/ably-js/pull/275)

- A few minor fixes to ErrorInfo [\#276](https://github.com/ably/ably-js/pull/276)

## [0.8.18](https://github.com/ably/ably-js/tree/0.8.18) (2016-05-09)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.17...0.8.18)

**Biggest changes:**

- Change default log level to LOG\_ERROR [c122a1f](https://github.com/ably/ably-js/commit/c122a1f)

- Add channel#errorReason [\#267](https://github.com/ably/ably-js/pull/267)

- Allow automatic re-authing (eg to use a new token) using auth#authorise() [\#261](https://github.com/ably/ably-js/pull/261)

- Allow ClientOptions#recover to take a callback (so you can decide whether to recover at the time) rather than just a boolean [\#266](https://github.com/ably/ably-js/pull/266)

## [0.8.17](https://github.com/ably/ably-js/tree/0.8.17) (2016-04-05)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.16...0.8.17)

**Biggest changes:**

- Don’t activate a transport that isn’t connected [\#255](https://github.com/ably/ably-js/pull/255)

- Don't try host fallbacks for token errors [\#251](https://github.com/ably/ably-js/pull/251)

- Standardise on 'initialize' event spelling [\#244](https://github.com/ably/ably-js/pull/244)

- Stop assuming that connection state won't change during a transport sync [\#249](https://github.com/ably/ably-js/pull/249)

- Don't reject a presence enter for lacking a clientId unless we're absolutely certain we're anonymous [\#256](https://github.com/ably/ably-js/pull/256)

## [0.8.16](https://github.com/ably/ably-js/tree/0.8.16) (2016-03-01)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.15...0.8.16)

**Biggest changes:**

- Implement latest version of the crypto spec [\#240](https://github.com/ably/ably-js/pull/240)

- Don't sync an upgrade transport that never got activated [\#241](https://github.com/ably/ably-js/pull/241)

## [0.8.15](https://github.com/ably/ably-js/tree/0.8.14) (2016-02-11)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.14...0.8.15)

**Biggest changes:**

- Expose presence message action as a string in the API [\#227](https://github.com/ably/ably-js/pull/233)

## [0.8.14](https://github.com/ably/ably-js/tree/0.8.14) (2016-02-09)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.13...0.8.14)

**Fixed bugs:**

- Token renewal does not seem to be working [\#203](https://github.com/ably/ably-js/issues/203)

- clientId from token auth is ignored for presence [\#198](https://github.com/ably/ably-js/issues/198)

- IE9 support [\#196](https://github.com/ably/ably-js/issues/196)

- ably-js-browsers failing in mobile safari [\#164](https://github.com/ably/ably-js/issues/164)

**Closed issues:**

- Proposal for new transport fallback behaviour [\#217](https://github.com/ably/ably-js/issues/217)

- Investigate whether encoding is being set correctly on presence data [\#200](https://github.com/ably/ably-js/issues/200)

**Merged pull requests:**

- enhance: Off removes all listeners for EventEmitter [\#227](https://github.com/ably/ably-js/pull/227) ([mattheworiordan](https://github.com/mattheworiordan))

- test\(realtime\): Testing echoMessages=true and echoMessages=false [\#226](https://github.com/ably/ably-js/pull/226) ([alex-georgiou](https://github.com/alex-georgiou))

- Safeguard Realtime Constructor [\#222](https://github.com/ably/ably-js/pull/222) ([CrowdHailer](https://github.com/CrowdHailer))

- Issue205 auth token expires fails [\#221](https://github.com/ably/ably-js/pull/221) ([mattheworiordan](https://github.com/mattheworiordan))

- Some proposed fixes for "Poor connection never attaches and reports connection to be connected \#195" [\#218](https://github.com/ably/ably-js/pull/218) ([SimonWoolf](https://github.com/SimonWoolf))

- Publish messages serially [\#215](https://github.com/ably/ably-js/pull/215) ([mattheworiordan](https://github.com/mattheworiordan))

- Adding README instructions for pulling ably-common submodule [\#214](https://github.com/ably/ably-js/pull/214) ([alex-georgiou](https://github.com/alex-georgiou))

- Token error update [\#209](https://github.com/ably/ably-js/pull/209) ([paddybyers](https://github.com/paddybyers))

- Routable format of connectionKey now applies to all transports [\#207](https://github.com/ably/ably-js/pull/207) ([paddybyers](https://github.com/paddybyers))

- Stop shimming async for requirejs [\#206](https://github.com/ably/ably-js/pull/206) ([SimonWoolf](https://github.com/SimonWoolf))

- Force token rerequest if realtime indicates token problems [\#204](https://github.com/ably/ably-js/pull/204) ([SimonWoolf](https://github.com/SimonWoolf))

- Fix presence data not getting encoded [\#201](https://github.com/ably/ably-js/pull/201) ([SimonWoolf](https://github.com/SimonWoolf))

- Presence: get clientId from Auth, not options directly [\#199](https://github.com/ably/ably-js/pull/199) ([SimonWoolf](https://github.com/SimonWoolf))

- Tweak xhr error handling [\#197](https://github.com/ably/ably-js/pull/197) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.8.13](https://github.com/ably/ably-js/tree/0.8.13) (2016-01-08)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.12...0.8.13)

**Fixed bugs:**

- Connection state incorrectly reported [\#187](https://github.com/ably/ably-js/issues/187)

**Merged pull requests:**

- Fix unsubscribe for all events & listeners [\#193](https://github.com/ably/ably-js/pull/193) ([mattheworiordan](https://github.com/mattheworiordan))

## [0.8.12](https://github.com/ably/ably-js/tree/0.8.12) (2015-12-20)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.11...0.8.12)

**Merged pull requests:**

- Add script for running tests in CI [\#186](https://github.com/ably/ably-js/pull/186) ([lmars](https://github.com/lmars))

## [0.8.11](https://github.com/ably/ably-js/tree/0.8.11) (2015-12-18)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.10...0.8.11)

**Fixed bugs:**

- No internet up test coverage [\#183](https://github.com/ably/ably-js/issues/183)

**Merged pull requests:**

- Remove presence leaveOnDisconnect test [\#185](https://github.com/ably/ably-js/pull/185) ([SimonWoolf](https://github.com/SimonWoolf))

- Connectivity check fixes & tests [\#184](https://github.com/ably/ably-js/pull/184) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.8.10](https://github.com/ably/ably-js/tree/0.8.10) (2015-12-17)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.9...0.8.10)

**Implemented enhancements:**

- Flexible handling of callback for auth methods [\#175](https://github.com/ably/ably-js/issues/175)

**Fixed bugs:**

- High priority spec incompatibilities [\#170](https://github.com/ably/ably-js/issues/170)

**Closed issues:**

- Xhr connections not starting a /recv request after /connect connection ends [\#180](https://github.com/ably/ably-js/issues/180)

**Merged pull requests:**

- Fix comet connections not starting a recv after the connect req closes [\#181](https://github.com/ably/ably-js/pull/181) ([SimonWoolf](https://github.com/SimonWoolf))

- Spec updates and miscellania [\#177](https://github.com/ably/ably-js/pull/177) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.8.9](https://github.com/ably/ably-js/tree/0.8.9) (2015-12-04)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.8...0.8.9)

**Implemented enhancements:**

- Spec validation [\#43](https://github.com/ably/ably-js/issues/43)

**Fixed bugs:**

- Highest priority item [\#172](https://github.com/ably/ably-js/issues/172)

**Merged pull requests:**

- Add support for authMethod: POST [\#173](https://github.com/ably/ably-js/pull/173) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.8.8](https://github.com/ably/ably-js/tree/0.8.8) (2015-11-20)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.7...0.8.8)

**Fixed bugs:**

- HTTP requests ignore `tls: false` attribute [\#166](https://github.com/ably/ably-js/issues/166)

- Presence callback error following an immediate disconnect [\#161](https://github.com/ably/ably-js/issues/161)

**Merged pull requests:**

- REST client: respect tls clientOption [\#167](https://github.com/ably/ably-js/pull/167) ([SimonWoolf](https://github.com/SimonWoolf))

- Don’t assume a callback exists if error occurs during presence enter/update [\#162](https://github.com/ably/ably-js/pull/162) ([SimonWoolf](https://github.com/SimonWoolf))

- clientId specs [\#145](https://github.com/ably/ably-js/pull/145) ([mattheworiordan](https://github.com/mattheworiordan))

## [0.8.7](https://github.com/ably/ably-js/tree/0.8.7) (2015-11-13)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.6...0.8.7)

**Merged pull requests:**

- Include version and license [\#159](https://github.com/ably/ably-js/pull/159) ([mattheworiordan](https://github.com/mattheworiordan))

## [0.8.6](https://github.com/ably/ably-js/tree/0.8.6) (2015-11-12)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.5...0.8.6)

**Implemented enhancements:**

- Switch arity of auth methods [\#137](https://github.com/ably/ably-js/issues/137)

- PresenceMessage action [\#45](https://github.com/ably/ably-js/issues/45)

- Emit errors [\#39](https://github.com/ably/ably-js/issues/39)

- README to include code examples and follow common format [\#38](https://github.com/ably/ably-js/issues/38)

- Share test app set up & encoding fixture data [\#34](https://github.com/ably/ably-js/issues/34)

- Integrate SauceLabs browser tests into ably-js [\#31](https://github.com/ably/ably-js/issues/31)

- License & CHANGELOG needs to be included [\#2](https://github.com/ably/ably-js/issues/2)

**Fixed bugs:**

- MsgPack cipher workaround [\#142](https://github.com/ably/ably-js/issues/142)

- Switch arity of auth methods [\#137](https://github.com/ably/ably-js/issues/137)

- connection.close does not always free up resources  [\#136](https://github.com/ably/ably-js/issues/136)

- XHR requests timing out leads to connection going into failed state [\#134](https://github.com/ably/ably-js/issues/134)

- connection\#ping throws exception if you don't pass it a callback [\#133](https://github.com/ably/ably-js/issues/133)

- Invalid encoding should not result in the data vanishing [\#121](https://github.com/ably/ably-js/issues/121)

- jsonp transport needs to set `envelope=json` param [\#113](https://github.com/ably/ably-js/issues/113)

- Token Params are not being sent through to authUrl [\#108](https://github.com/ably/ably-js/issues/108)

- Channels stay attached even if connection can't be resumed [\#105](https://github.com/ably/ably-js/issues/105)

- Calling channel.presence.enter doesn't attach to the channel if connectino has been closed and reopened [\#104](https://github.com/ably/ably-js/issues/104)

- Authentication etc. failures with comet incorrectly put connection into 'disconnected' state \(should be 'failed'\) [\#101](https://github.com/ably/ably-js/issues/101)

- Connection recovery after connect causing presence to fail [\#95](https://github.com/ably/ably-js/issues/95)

- Exception / error should be shown if trying to publish or modify presence on a closed connection [\#94](https://github.com/ably/ably-js/issues/94)

- Hard coded transport to work around bugs need to be removed [\#86](https://github.com/ably/ably-js/issues/86)

- Ably-js does not call error callback when channel attach fails when using comet transport [\#81](https://github.com/ably/ably-js/issues/81)

- When attach fails with 'superseded transport handle', ably-js retries immediately forever [\#71](https://github.com/ably/ably-js/issues/71)

- iFrame tests are failing in CI [\#62](https://github.com/ably/ably-js/issues/62)

- WsData exception [\#61](https://github.com/ably/ably-js/issues/61)

- Incorrect error shown in clients when account limits are hit [\#57](https://github.com/ably/ably-js/issues/57)

- IFrameTransport errors when connecting with tls: false [\#55](https://github.com/ably/ably-js/issues/55)

- ToJson bug [\#44](https://github.com/ably/ably-js/issues/44)

- No transport handle [\#40](https://github.com/ably/ably-js/issues/40)

- Bug on current master when running `karma` [\#36](https://github.com/ably/ably-js/issues/36)

- Travis CI builds failing consistenly [\#30](https://github.com/ably/ably-js/issues/30)

- Comet transport error [\#27](https://github.com/ably/ably-js/issues/27)

- Test client library with explicit binary protocol in JSBin [\#18](https://github.com/ably/ably-js/issues/18)

- iPad iOS6 timing issues [\#12](https://github.com/ably/ably-js/issues/12)

- Firefox 10 with Windows 7 fails because of incorrect mime type [\#11](https://github.com/ably/ably-js/issues/11)

- Internet Up URL & use of HTTPS [\#4](https://github.com/ably/ably-js/issues/4)

**Closed issues:**

- requestToken sending key? [\#157](https://github.com/ably/ably-js/issues/157)

- Wrong state change reason with token expiry [\#149](https://github.com/ably/ably-js/issues/149)

- On jsbin, get an exception creating websocket if tls: false [\#129](https://github.com/ably/ably-js/issues/129)

- Auth differences between ably-js and ably-ruby [\#116](https://github.com/ably/ably-js/issues/116)

- ably-js doesn't dispose of the websocket resource if the connection attempt times out [\#98](https://github.com/ably/ably-js/issues/98)

- Use the correct internet-up CDN [\#42](https://github.com/ably/ably-js/issues/42)

**Merged pull requests:**

- Presence map: normalise enter/update actions to present in \#put [\#152](https://github.com/ably/ably-js/pull/152) ([SimonWoolf](https://github.com/SimonWoolf))

- ably-js-browsers-all [\#151](https://github.com/ably/ably-js/pull/151) ([SimonWoolf](https://github.com/SimonWoolf))

- Pass on DISCONNECT errs; a few test fixes [\#150](https://github.com/ably/ably-js/pull/150) ([SimonWoolf](https://github.com/SimonWoolf))

- Allow iframe transport to work with local \(file://\) pages [\#148](https://github.com/ably/ably-js/pull/148) ([SimonWoolf](https://github.com/SimonWoolf))

- Connection\#ping: allow no callback, return a responseTime, add tests [\#146](https://github.com/ably/ably-js/pull/146) ([SimonWoolf](https://github.com/SimonWoolf))

- Convert WordArrays to ArrayBuffers when msgpack-encoding [\#143](https://github.com/ably/ably-js/pull/143) ([SimonWoolf](https://github.com/SimonWoolf))

- NodeCometTransport: clear request timeout on request error [\#141](https://github.com/ably/ably-js/pull/141) ([SimonWoolf](https://github.com/SimonWoolf))

- Use the correct internet up URL [\#140](https://github.com/ably/ably-js/pull/140) ([mattheworiordan](https://github.com/mattheworiordan))

- Log protocol messages at micro level [\#139](https://github.com/ably/ably-js/pull/139) ([mattheworiordan](https://github.com/mattheworiordan))

- Transport failures don’t necessarily imply connection failures [\#135](https://github.com/ably/ably-js/pull/135) ([SimonWoolf](https://github.com/SimonWoolf))

- Avoid ambiguity in received transport protocol message [\#132](https://github.com/ably/ably-js/pull/132) ([mattheworiordan](https://github.com/mattheworiordan))

- Various new-upgrade and test fixes [\#131](https://github.com/ably/ably-js/pull/131) ([SimonWoolf](https://github.com/SimonWoolf))

- Connection state events 3 [\#130](https://github.com/ably/ably-js/pull/130) ([SimonWoolf](https://github.com/SimonWoolf))

- Presence update when connection closed [\#128](https://github.com/ably/ably-js/pull/128) ([SimonWoolf](https://github.com/SimonWoolf))

- Tests no force ws; fix failure to callback on presence event causing implicit attach [\#127](https://github.com/ably/ably-js/pull/127) ([SimonWoolf](https://github.com/SimonWoolf))

- Ensure websocket object is disposed if it fails to connect [\#125](https://github.com/ably/ably-js/pull/125) ([SimonWoolf](https://github.com/SimonWoolf))

- Add some rest presence tests [\#124](https://github.com/ably/ably-js/pull/124) ([SimonWoolf](https://github.com/SimonWoolf))

- Invalid encodings [\#123](https://github.com/ably/ably-js/pull/123) ([SimonWoolf](https://github.com/SimonWoolf))

- Don't process duplicate messages or messages on inactive transports [\#122](https://github.com/ably/ably-js/pull/122) ([SimonWoolf](https://github.com/SimonWoolf))

- CipherParams conform to latest spec \(separate algorithm and keyLength\) [\#120](https://github.com/ably/ably-js/pull/120) ([SimonWoolf](https://github.com/SimonWoolf))

- Use ably-common submodule instead of inline json for test app setup [\#119](https://github.com/ably/ably-js/pull/119) ([SimonWoolf](https://github.com/SimonWoolf))

- Don’t include timestamp/connectionid in string/json representations of messages [\#117](https://github.com/ably/ably-js/pull/117) ([SimonWoolf](https://github.com/SimonWoolf))

- If client lib initialized with clientid, use that for auth if no new tokenParams object is supplied [\#115](https://github.com/ably/ably-js/pull/115) ([SimonWoolf](https://github.com/SimonWoolf))

- JSONP transport: use jsonp envelope [\#114](https://github.com/ably/ably-js/pull/114) ([SimonWoolf](https://github.com/SimonWoolf))

- Define error codes that result in failed rather than disconnected [\#112](https://github.com/ably/ably-js/pull/112) ([SimonWoolf](https://github.com/SimonWoolf))

- Explicitly disallow empty string clientIds [\#111](https://github.com/ably/ably-js/pull/111) ([SimonWoolf](https://github.com/SimonWoolf))

- Allow connection to inherit clientId from connectionDetails [\#110](https://github.com/ably/ably-js/pull/110) ([SimonWoolf](https://github.com/SimonWoolf))

- Some small connection, channel, and presence fixes [\#109](https://github.com/ably/ably-js/pull/109) ([SimonWoolf](https://github.com/SimonWoolf))

- Standardise on tabs [\#107](https://github.com/ably/ably-js/pull/107) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.8.5](https://github.com/ably/ably-js/tree/0.8.5) (2015-08-20)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.3...0.8.5)

**Implemented enhancements:**

- untilAttach for presence history is missing [\#93](https://github.com/ably/ably-js/issues/93)

**Closed issues:**

- presence\#history only available for rest channels, not realtime ones [\#84](https://github.com/ably/ably-js/issues/84)

- Saucelabs websockets support apparently sucks..? [\#82](https://github.com/ably/ably-js/issues/82)

**Merged pull requests:**

- support untilAttach for realtime presence history requests [\#96](https://github.com/ably/ably-js/pull/96) ([SimonWoolf](https://github.com/SimonWoolf))

- Force saucelabs to use varnish rather than squid as a proxy [\#90](https://github.com/ably/ably-js/pull/90) ([SimonWoolf](https://github.com/SimonWoolf))

- Fix a race condition in realtime publish tests [\#89](https://github.com/ably/ably-js/pull/89) ([SimonWoolf](https://github.com/SimonWoolf))

- Add grunt release:\[releasetype\] task [\#88](https://github.com/ably/ably-js/pull/88) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.8.3](https://github.com/ably/ably-js/tree/0.8.3) (2015-08-04)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.2...0.8.3)

**Implemented enhancements:**

- authCallback bug, test coverage & additional type support [\#72](https://github.com/ably/ably-js/issues/72)

- Does not support useTokenAuth client options [\#70](https://github.com/ably/ably-js/issues/70)

- No updateClient method [\#67](https://github.com/ably/ably-js/issues/67)

- createTokenRequest without key option [\#21](https://github.com/ably/ably-js/issues/21)

**Fixed bugs:**

- attaching and detaching events are not emitted [\#74](https://github.com/ably/ably-js/issues/74)

- attach on a channel for a failed client does not fail the attach [\#73](https://github.com/ably/ably-js/issues/73)

- authCallback bug, test coverage & additional type support [\#72](https://github.com/ably/ably-js/issues/72)

- Does not support useTokenAuth client options [\#70](https://github.com/ably/ably-js/issues/70)

- Calling attach twice on an invalid channels fails [\#66](https://github.com/ably/ably-js/issues/66)

- authUrl tests fail in Firefox [\#63](https://github.com/ably/ably-js/issues/63)

- Better error message for an invalid token from the authUrl or callback [\#56](https://github.com/ably/ably-js/issues/56)

- createTokenRequest without key option [\#21](https://github.com/ably/ably-js/issues/21)

**Closed issues:**

- Various functions require a callback with \(err, result\) but docs imply should work with just \(result\) [\#69](https://github.com/ably/ably-js/issues/69)

**Merged pull requests:**

- Presence history 3 [\#87](https://github.com/ably/ably-js/pull/87) ([paddybyers](https://github.com/paddybyers))

- createTokenRequest tweaks [\#83](https://github.com/ably/ably-js/pull/83) ([SimonWoolf](https://github.com/SimonWoolf))

- Add tests for authCallback and update its docstring [\#80](https://github.com/ably/ably-js/pull/80) ([SimonWoolf](https://github.com/SimonWoolf))

- Emit attaching [\#79](https://github.com/ably/ably-js/pull/79) ([paddybyers](https://github.com/paddybyers))

- Support untilAttach param in history requests for realtime channels [\#78](https://github.com/ably/ably-js/pull/78) ([paddybyers](https://github.com/paddybyers))

- Add useTokenAuth option [\#77](https://github.com/ably/ably-js/pull/77) ([SimonWoolf](https://github.com/SimonWoolf))

- Add Presence\#update and Presence\#updateClient methods [\#76](https://github.com/ably/ably-js/pull/76) ([SimonWoolf](https://github.com/SimonWoolf))

- Correct checks for existence of channel name in received message [\#68](https://github.com/ably/ably-js/pull/68) ([paddybyers](https://github.com/paddybyers))

- Auth url fixes2 [\#65](https://github.com/ably/ably-js/pull/65) ([paddybyers](https://github.com/paddybyers))

## [0.8.2](https://github.com/ably/ably-js/tree/0.8.2) (2015-07-01)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.1...0.8.2)

**Implemented enhancements:**

- Release as a bower module [\#1](https://github.com/ably/ably-js/issues/1)

## [0.8.1](https://github.com/ably/ably-js/tree/0.8.1) (2015-06-30)

[Full Changelog](https://github.com/ably/ably-js/compare/0.8.0...0.8.1)

**Implemented enhancements:**

- Improve logging [\#58](https://github.com/ably/ably-js/issues/58)

- Agree on handling of JSON value types [\#52](https://github.com/ably/ably-js/issues/52)

**Fixed bugs:**

- Malformed response body from server: Unexpected token X with Comet on Node.js [\#59](https://github.com/ably/ably-js/issues/59)

**Closed issues:**

- Connection state recovery is intermittent [\#48](https://github.com/ably/ably-js/issues/48)

- Presence\#enterClient errors if not supplied with a data param [\#47](https://github.com/ably/ably-js/issues/47)

- No keyName specified [\#41](https://github.com/ably/ably-js/issues/41)

**Merged pull requests:**

- Throw 411 error for unsupported data types [\#53](https://github.com/ably/ably-js/pull/53) ([SimonWoolf](https://github.com/SimonWoolf))

- Make sure boolean data is encoded correctly [\#51](https://github.com/ably/ably-js/pull/51) ([SimonWoolf](https://github.com/SimonWoolf))

- Allow data parameter to be optional for presence\#enter and channell\#subscribe \(2\) [\#50](https://github.com/ably/ably-js/pull/50) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.8.0](https://github.com/ably/ably-js/tree/0.8.0) (2015-04-29)

[Full Changelog](https://github.com/ably/ably-js/compare/0.7.9...0.8.0)

**Implemented enhancements:**

- Register  ably-js as ably in the npm directory [\#29](https://github.com/ably/ably-js/issues/29)

- Sparse stat support  [\#22](https://github.com/ably/ably-js/issues/22)

- Travis.CI support [\#3](https://github.com/ably/ably-js/issues/3)

**Fixed bugs:**

- Browser test error: authbase0 - displayError is not defined [\#35](https://github.com/ably/ably-js/issues/35)

- \[Object object\] in error messages makes it difficult to see what the problem is [\#24](https://github.com/ably/ably-js/issues/24)

- Connection issues [\#20](https://github.com/ably/ably-js/issues/20)

- Time function on Realtime blocks Node from exiting [\#9](https://github.com/ably/ably-js/issues/9)

- iFrame loading [\#8](https://github.com/ably/ably-js/issues/8)

## [0.7.9](https://github.com/ably/ably-js/tree/0.7.9) (2015-04-03)

[Full Changelog](https://github.com/ably/ably-js/compare/0.7.8...0.7.9)

## [0.7.8](https://github.com/ably/ably-js/tree/0.7.8) (2015-04-03)

[Full Changelog](https://github.com/ably/ably-js/compare/0.7.7...0.7.8)

## [0.7.7](https://github.com/ably/ably-js/tree/0.7.7) (2015-04-03)

[Full Changelog](https://github.com/ably/ably-js/compare/0.7.6...0.7.7)

## [0.7.6](https://github.com/ably/ably-js/tree/0.7.6) (2015-04-03)

[Full Changelog](https://github.com/ably/ably-js/compare/0.7.5...0.7.6)

**Fixed bugs:**

- Nodeunit tests in the browser [\#23](https://github.com/ably/ably-js/issues/23)

**Closed issues:**

- TypeError on presence.subscribe\(\) [\#26](https://github.com/ably/ably-js/issues/26)

## [0.7.5](https://github.com/ably/ably-js/tree/0.7.5) (2015-03-21)

[Full Changelog](https://github.com/ably/ably-js/compare/0.7.4...0.7.5)

## [0.7.4](https://github.com/ably/ably-js/tree/0.7.4) (2015-03-20)

[Full Changelog](https://github.com/ably/ably-js/compare/0.7.3...0.7.4)

**Closed issues:**

- Time out tests [\#15](https://github.com/ably/ably-js/issues/15)

## [0.7.3](https://github.com/ably/ably-js/tree/0.7.3) (2015-03-12)

[Full Changelog](https://github.com/ably/ably-js/compare/0.7.2...0.7.3)

## [0.7.2](https://github.com/ably/ably-js/tree/0.7.2) (2015-03-10)

[Full Changelog](https://github.com/ably/ably-js/compare/0.7.1...0.7.2)

**Fixed bugs:**

- Swallowing errors [\#6](https://github.com/ably/ably-js/issues/6)

**Closed issues:**

- Logger [\#14](https://github.com/ably/ably-js/issues/14)

- PhantomJS issues [\#13](https://github.com/ably/ably-js/issues/13)

- Node.js 0.12 [\#10](https://github.com/ably/ably-js/issues/10)

## [0.7.1](https://github.com/ably/ably-js/tree/0.7.1) (2015-02-11)

[Full Changelog](https://github.com/ably/ably-js/compare/0.7.0...0.7.1)

## [0.7.0](https://github.com/ably/ably-js/tree/0.7.0) (2015-01-12)

[Full Changelog](https://github.com/ably/ably-js/compare/0.6.3...0.7.0)

## [0.6.3](https://github.com/ably/ably-js/tree/0.6.3) (2014-12-09)

[Full Changelog](https://github.com/ably/ably-js/compare/0.6.1...0.6.3)

## [0.6.1](https://github.com/ably/ably-js/tree/0.6.1) (2014-11-27)

[Full Changelog](https://github.com/ably/ably-js/compare/0.6.0...0.6.1)

## [0.6.0](https://github.com/ably/ably-js/tree/0.6.0) (2014-11-27)

[Full Changelog](https://github.com/ably/ably-js/compare/0.5.0...0.6.0)

## [0.5.0](https://github.com/ably/ably-js/tree/0.5.0) (2014-01-13)

[Full Changelog](https://github.com/ably/ably-js/compare/0.2.1...0.5.0)

## [0.2.1](https://github.com/ably/ably-js/tree/0.2.1) (2013-04-29)

[Full Changelog](https://github.com/ably/ably-js/compare/0.2.0...0.2.1)

## [0.2.0](https://github.com/ably/ably-js/tree/0.2.0) (2013-04-17)

[Full Changelog](https://github.com/ably/ably-js/compare/0.1.1...0.2.0)

## [0.1.1](https://github.com/ably/ably-js/tree/0.1.1) (2012-12-05)

[Full Changelog](https://github.com/ably/ably-js/compare/0.1.0...0.1.1)

## [0.1.0](https://github.com/ably/ably-js/tree/0.1.0) (2012-12-04)



\* *This Change Log was automatically generated by [github_changelog_generator](https://github.com/skywinder/Github-Changelog-Generator)*
