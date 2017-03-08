# Change Log

## [v1.0.0](https://github.com/ably/ably-js/tree/v1.0.0)

[Full Changelog](https://github.com/ably/ably-js/compare/0.9.0-beta.11...v1.0.0)

### v1.0 release and upgrade notes from v0.8

- See https://github.com/ably/docs/issues/235

**Fixed bugs:**

- Fail pending messages fails if the connection is closed [\#381](https://github.com/ably/ably-js/issues/381)

## [0.9.0-beta.11](https://github.com/ably/ably-js/tree/0.9.0-beta.11) (2017-03-03)
[Full Changelog](https://github.com/ably/ably-js/compare/0.9.0-beta.10...0.9.0-beta.11)

## [0.9.0-beta.10](https://github.com/ably/ably-js/tree/0.9.0-beta.10) (2017-03-02)
[Full Changelog](https://github.com/ably/ably-js/compare/0.9.0-beta.9...0.9.0-beta.10)

**Closed issues:**

- 1.0 blocker: RESUME flag + tests \(once implemented on backend\) [\#375](https://github.com/ably/ably-js/issues/375)
- 1.0 blocker: syncComplete fn -\> attr [\#374](https://github.com/ably/ably-js/issues/374)

## [0.9.0-beta.9](https://github.com/ably/ably-js/tree/0.9.0-beta.9) (2017-03-02)
[Full Changelog](https://github.com/ably/ably-js/compare/0.9.0-beta.8...0.9.0-beta.9)

## [0.9.0-beta.8](https://github.com/ably/ably-js/tree/0.9.0-beta.8) (2017-03-02)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.42...0.9.0-beta.8)

## [0.8.42](https://github.com/ably/ably-js/tree/0.8.42) (2017-02-27)
[Full Changelog](https://github.com/ably/ably-js/compare/0.9.0-beta.7...0.8.42)

**Closed issues:**

- Customer getting "Unable to connect \(no available host\)" without using custom hosts? [\#380](https://github.com/ably/ably-js/issues/380)

## [0.9.0-beta.7](https://github.com/ably/ably-js/tree/0.9.0-beta.7) (2017-02-15)
[Full Changelog](https://github.com/ably/ably-js/compare/0.9.0-beta.6...0.9.0-beta.7)

**Implemented enhancements:**

- 0.9 presence spec amendments [\#368](https://github.com/ably/ably-js/issues/368)

**Closed issues:**

- Regular JS errors appearing [\#360](https://github.com/ably/ably-js/issues/360)

**Merged pull requests:**

- TypeScript + JSPM + DefintelyTyped [\#376](https://github.com/ably/ably-js/pull/376) ([mattheworiordan](https://github.com/mattheworiordan))
- Presence suspended changes [\#370](https://github.com/ably/ably-js/pull/370) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.9.0-beta.6](https://github.com/ably/ably-js/tree/0.9.0-beta.6) (2017-01-03)
[Full Changelog](https://github.com/ably/ably-js/compare/0.9.0-beta.5...0.9.0-beta.6)

## [0.9.0-beta.5](https://github.com/ably/ably-js/tree/0.9.0-beta.5) (2017-01-03)
[Full Changelog](https://github.com/ably/ably-js/compare/0.9.0-beta.4...0.9.0-beta.5)

**Implemented enhancements:**

- Presence subscribe with multiple events does not work [\#289](https://github.com/ably/ably-js/issues/289)
- React-native [\#280](https://github.com/ably/ably-js/issues/280)
- Allow \>1 pending presence event [\#253](https://github.com/ably/ably-js/issues/253)

**Fixed bugs:**

- on\('attached'\) registration in an on\('attached'\) block fires immediately [\#364](https://github.com/ably/ably-js/issues/364)
- authUrl causing Node.js app crash [\#354](https://github.com/ably/ably-js/issues/354)
- Non-string clientId should be rejected [\#278](https://github.com/ably/ably-js/issues/278)

**Closed issues:**

- use 90007 for channel attach timeouts rather than 90000 [\#357](https://github.com/ably/ably-js/issues/357)
- Implement 0.9 extras field spec [\#356](https://github.com/ably/ably-js/issues/356)
- Implement 0.9 UPDATE event spec [\#355](https://github.com/ably/ably-js/issues/355)
- Investigate some rest requests failing when done over JSONP [\#351](https://github.com/ably/ably-js/issues/351)
- Investigate resume\_active tests failing on IE11 [\#350](https://github.com/ably/ably-js/issues/350)
- Possible issue with serverTimeOffset calculation for people in other timezones [\#205](https://github.com/ably/ably-js/issues/205)

**Merged pull requests:**

- Implement update event spec [\#363](https://github.com/ably/ably-js/pull/363) ([SimonWoolf](https://github.com/SimonWoolf))
- Add TypeScript typings support [\#359](https://github.com/ably/ably-js/pull/359) ([NathanaelA](https://github.com/NathanaelA))

## [0.9.0-beta.4](https://github.com/ably/ably-js/tree/0.9.0-beta.4) (2016-11-17)
[Full Changelog](https://github.com/ably/ably-js/compare/0.9.0-beta.3...0.9.0-beta.4)

**Implemented enhancements:**

- Use fork of nodeunit that outputs the errors  [\#246](https://github.com/ably/ably-js/issues/246)
- Suggestion: Improving the logs [\#60](https://github.com/ably/ably-js/issues/60)

**Fixed bugs:**

- authorise should store AuthOptions and TokenParams as defaults for subsequent requests [\#237](https://github.com/ably/ably-js/issues/237)

**Closed issues:**

- Remove compat libraries [\#307](https://github.com/ably/ably-js/issues/307)
- Need to rethink how channels get suspended on nonfatal conection errors [\#305](https://github.com/ably/ably-js/issues/305)
- Race conditions when upgrade is a different region from comet connection [\#153](https://github.com/ably/ably-js/issues/153)
- npm and buffertools install issue [\#10](https://github.com/ably/ably-js/issues/10)

## [0.9.0-beta.3](https://github.com/ably/ably-js/tree/0.9.0-beta.3) (2016-11-14)
[Full Changelog](https://github.com/ably/ably-js/compare/0.9.0-beta.2...0.9.0-beta.3)

## [0.9.0-beta.2](https://github.com/ably/ably-js/tree/0.9.0-beta.2) (2016-11-14)
[Full Changelog](https://github.com/ably/ably-js/compare/0.9.0-beta.1...0.9.0-beta.2)

## [0.9.0-beta.1](https://github.com/ably/ably-js/tree/0.9.0-beta.1) (2016-11-10)
[Full Changelog](https://github.com/ably/ably-js/compare/0.9.0-beta.0...0.9.0-beta.1)

## [0.9.0-beta.0](https://github.com/ably/ably-js/tree/0.9.0-beta.0) (2016-10-28)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.41...0.9.0-beta.0)

**Fixed bugs:**

- Detection of connection state change is too slow [\#99](https://github.com/ably/ably-js/issues/99)

## [0.8.41](https://github.com/ably/ably-js/tree/0.8.41) (2016-10-26)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.40...0.8.41)

## [0.8.40](https://github.com/ably/ably-js/tree/0.8.40) (2016-10-24)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.39...0.8.40)

**Closed issues:**

- Long lived connections don't seem to recover correctly [\#202](https://github.com/ably/ably-js/issues/202)

**Merged pull requests:**

- Fix ‘server’ header CORS warning for non-ably endpoints [\#345](https://github.com/ably/ably-js/pull/345) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.8.39](https://github.com/ably/ably-js/tree/0.8.39) (2016-10-21)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.38...0.8.39)

**Implemented enhancements:**

- Node build without crypto or buffertools [\#332](https://github.com/ably/ably-js/issues/332)

**Closed issues:**

- shasumcheck failed when install ably from npm? [\#343](https://github.com/ably/ably-js/issues/343)

**Merged pull requests:**

- Disable upgrade to xhr\_streaming if cloudflare headers detected [\#342](https://github.com/ably/ably-js/pull/342) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.8.38](https://github.com/ably/ably-js/tree/0.8.38) (2016-10-12)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.37...0.8.38)

**Fixed bugs:**

- closeOnUnload does not work in IE11 [\#338](https://github.com/ably/ably-js/issues/338)

## [0.8.37](https://github.com/ably/ably-js/tree/0.8.37) (2016-09-21)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.36...0.8.37)

**Closed issues:**

- Odd behaviour with firefox [\#334](https://github.com/ably/ably-js/issues/334)

**Merged pull requests:**

- Limit node http agent socket pool to 25 [\#336](https://github.com/ably/ably-js/pull/336) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.8.36](https://github.com/ably/ably-js/tree/0.8.36) (2016-09-14)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.35...0.8.36)

## [0.8.35](https://github.com/ably/ably-js/tree/0.8.35) (2016-09-12)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.34...0.8.35)

**Closed issues:**

- Review agent options for http [\#330](https://github.com/ably/ably-js/issues/330)

## [0.8.34](https://github.com/ably/ably-js/tree/0.8.34) (2016-09-08)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.33...0.8.34)

**Fixed bugs:**

- Unable to recover connection - causes connection to be closed / failed? [\#329](https://github.com/ably/ably-js/issues/329)
- Update `ws` version [\#326](https://github.com/ably/ably-js/issues/326)

**Closed issues:**

- Unable to install ably through NPM [\#328](https://github.com/ably/ably-js/issues/328)

**Merged pull requests:**

- Use foreverAgent for node http requests [\#331](https://github.com/ably/ably-js/pull/331) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.8.33](https://github.com/ably/ably-js/tree/0.8.33) (2016-08-19)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.32...0.8.33)

## [0.8.32](https://github.com/ably/ably-js/tree/0.8.32) (2016-08-17)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.31...0.8.32)

**Closed issues:**

- exception seen in ci [\#325](https://github.com/ably/ably-js/issues/325)

## [0.8.31](https://github.com/ably/ably-js/tree/0.8.31) (2016-08-10)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.30...0.8.31)

**Implemented enhancements:**

- Webpack support [\#318](https://github.com/ably/ably-js/issues/318)

**Fixed bugs:**

- Google crawler indexing our endpoints from JS library [\#317](https://github.com/ably/ably-js/issues/317)

**Merged pull requests:**

- Webpack support + remove legacy compat libraries [\#321](https://github.com/ably/ably-js/pull/321) ([mattheworiordan](https://github.com/mattheworiordan))

## [0.8.30](https://github.com/ably/ably-js/tree/0.8.30) (2016-07-18)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.29...0.8.30)

**Fixed bugs:**

- Quick reconnect after token TTL expires gets stuck in connecting [\#311](https://github.com/ably/ably-js/issues/311)

**Merged pull requests:**

- Fix presence messages ending an in-progress sync [\#319](https://github.com/ably/ably-js/pull/319) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.8.29](https://github.com/ably/ably-js/tree/0.8.29) (2016-07-15)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.28...0.8.29)

**Closed issues:**

- DETACHED with error still means detached, not failed [\#312](https://github.com/ably/ably-js/issues/312)

**Merged pull requests:**

- Emit any pre-connnect auth errors in a way the onConnect listeners will handle [\#314](https://github.com/ably/ably-js/pull/314) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.8.28](https://github.com/ably/ably-js/tree/0.8.28) (2016-07-13)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.27...0.8.28)

**Merged pull requests:**

- Make server-sent DETACHED always detach, not fail a channel [\#313](https://github.com/ably/ably-js/pull/313) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.8.27](https://github.com/ably/ably-js/tree/0.8.27) (2016-07-12)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.26...0.8.27)

**Implemented enhancements:**

- Transport preferences stored in client library without local storage [\#301](https://github.com/ably/ably-js/issues/301)

## [0.8.26](https://github.com/ably/ably-js/tree/0.8.26) (2016-07-11)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.25...0.8.26)

**Implemented enhancements:**

- Long-lived upgrades [\#299](https://github.com/ably/ably-js/issues/299)

**Fixed bugs:**

- Message queued indefinitely when reconnecting over XHR and failing to upgrade to WS [\#300](https://github.com/ably/ably-js/issues/300)

## [0.8.25](https://github.com/ably/ably-js/tree/0.8.25) (2016-07-06)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.24...0.8.25)

## [0.8.24](https://github.com/ably/ably-js/tree/0.8.24) (2016-07-06)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.23...0.8.24)

**Closed issues:**

- Safari can throw an exception when you use localstorage, even if it looks enabled [\#297](https://github.com/ably/ably-js/issues/297)
- require\('ably'\) fails [\#262](https://github.com/ably/ably-js/issues/262)

**Merged pull requests:**

- Add "lib=js-x.x.xx" qs param to connectParams [\#304](https://github.com/ably/ably-js/pull/304) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.8.23](https://github.com/ably/ably-js/tree/0.8.23) (2016-07-01)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.22...0.8.23)

**Implemented enhancements:**

- Improve test coverage for poor connectivity fixes [\#230](https://github.com/ably/ably-js/issues/230)
- When using node.js try WebSockets first as a transport [\#178](https://github.com/ably/ably-js/issues/178)
- Http fallback sequence tweaks [\#165](https://github.com/ably/ably-js/issues/165)
- Reinstate compatibility JS libaries [\#97](https://github.com/ably/ably-js/issues/97)
- Possible proxy method enhancements [\#54](https://github.com/ably/ably-js/issues/54)

**Fixed bugs:**

- Invalid transport every time [\#286](https://github.com/ably/ably-js/issues/286)
- Bitdefender "Scan SSL" setting strips transfer-encoding headers from streaming responses [\#277](https://github.com/ably/ably-js/issues/277)
- Do not persist authorise attributes force & timestamp  [\#192](https://github.com/ably/ably-js/issues/192)
- IE8 and 9 support [\#163](https://github.com/ably/ably-js/issues/163)
- Mistaken iFrame fallback  [\#160](https://github.com/ably/ably-js/issues/160)
- clientId should be derived from Connected ProtocolMessage, TokenDetails or TokenRequest clientId [\#158](https://github.com/ably/ably-js/issues/158)

**Closed issues:**

- don't sync if can't recover connection [\#288](https://github.com/ably/ably-js/issues/288)
- Find out why ci browser tests suddenly can't connect to saucelabs [\#263](https://github.com/ably/ably-js/issues/263)
- Errors in publish callbacks are lost. [\#194](https://github.com/ably/ably-js/issues/194)
- connectionManager should probably keep track of proposed transports [\#182](https://github.com/ably/ably-js/issues/182)
- Npm module ably-js does not exist [\#174](https://github.com/ably/ably-js/issues/174)

## [0.8.22](https://github.com/ably/ably-js/tree/0.8.22) (2016-06-24)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.21...0.8.22)

**Implemented enhancements:**

- Log non-secret connectionDetails [\#293](https://github.com/ably/ably-js/issues/293)

**Fixed bugs:**

- Quick detach never detaches [\#285](https://github.com/ably/ably-js/issues/285)
- ConnectionManager.sendImpl\(\): Unexpected exception in transport.send\(\): TypeError: Cannot read property 'send' of null [\#270](https://github.com/ably/ably-js/issues/270)

**Merged pull requests:**

- Presence wait for sync [\#295](https://github.com/ably/ably-js/pull/295) ([SimonWoolf](https://github.com/SimonWoolf))
- Log connectionDetails [\#294](https://github.com/ably/ably-js/pull/294) ([SimonWoolf](https://github.com/SimonWoolf))
- Rework upgrade mechanism [\#292](https://github.com/ably/ably-js/pull/292) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.8.21](https://github.com/ably/ably-js/tree/0.8.21) (2016-06-21)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.20...0.8.21)

**Merged pull requests:**

- Pass along CONNECTED errors [\#291](https://github.com/ably/ably-js/pull/291) ([SimonWoolf](https://github.com/SimonWoolf))
- Comet transport: pop pending items synchronously with sending them [\#290](https://github.com/ably/ably-js/pull/290) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.8.20](https://github.com/ably/ably-js/tree/0.8.20) (2016-06-13)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.19...0.8.20)

**Implemented enhancements:**

- Renewing a token as a matter of course is not an error [\#273](https://github.com/ably/ably-js/issues/273)

**Fixed bugs:**

- Attach / reattach presence SYNC issue [\#284](https://github.com/ably/ably-js/issues/284)

**Closed issues:**

- Crypto: old versions of IE generating a random key that doesn't correctly round-trip to base64 [\#281](https://github.com/ably/ably-js/issues/281)

**Merged pull requests:**

- Clear presence set on detach [\#287](https://github.com/ably/ably-js/pull/287) ([SimonWoolf](https://github.com/SimonWoolf))
- IE8/9 fix: CryptoJS wordarrays expect signed ints [\#282](https://github.com/ably/ably-js/pull/282) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.8.19](https://github.com/ably/ably-js/tree/0.8.19) (2016-05-18)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.18...0.8.19)

**Implemented enhancements:**

- Reduce verbosity of library  [\#268](https://github.com/ably/ably-js/issues/268)

**Fixed bugs:**

- Failure to reattach a failed channel [\#272](https://github.com/ably/ably-js/issues/272)

**Closed issues:**

- Utils.mixin fails when source argument is prototypeless [\#271](https://github.com/ably/ably-js/issues/271)

**Merged pull requests:**

- ErrorInfo: arg order, coercing Error objects [\#276](https://github.com/ably/ably-js/pull/276) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.8.18](https://github.com/ably/ably-js/tree/0.8.18) (2016-05-09)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.17...0.8.18)

**Implemented enhancements:**

- TODO: consider new `onPageRefresh: close | persist | none` connection option [\#259](https://github.com/ably/ably-js/issues/259)

**Fixed bugs:**

- Protocol error not moving client to failed state [\#254](https://github.com/ably/ably-js/issues/254)
- Should not reject presence enter if clientId is unknown [\#252](https://github.com/ably/ably-js/issues/252)
- Host fallback on unauthorized [\#250](https://github.com/ably/ably-js/issues/250)
- Poor connection never attaches and reports connection to be connected [\#195](https://github.com/ably/ably-js/issues/195)

**Closed issues:**

- Inconsistent connection state following an 80006 error [\#247](https://github.com/ably/ably-js/issues/247)

**Merged pull requests:**

- Dynamic auth [\#269](https://github.com/ably/ably-js/pull/269) ([paddybyers](https://github.com/paddybyers))
- Explicitly set binaryType to nodebuffer on websockets when in node [\#265](https://github.com/ably/ably-js/pull/265) ([paddybyers](https://github.com/paddybyers))

## [0.8.17](https://github.com/ably/ably-js/tree/0.8.17) (2016-04-05)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.16...0.8.17)

**Implemented enhancements:**

- CipherParam defaults [\#235](https://github.com/ably/ably-js/issues/235)

**Fixed bugs:**

- Runtime error when publishing an invalid payload [\#248](https://github.com/ably/ably-js/issues/248)

**Closed issues:**

- Browser and node treat string key cipherParam differently [\#238](https://github.com/ably/ably-js/issues/238)

**Merged pull requests:**

- Fixes for a couple of bugs triggered by closing the connection during a transport upgrade [\#249](https://github.com/ably/ably-js/pull/249) ([SimonWoolf](https://github.com/SimonWoolf))
- Standardise on initialized [\#244](https://github.com/ably/ably-js/pull/244) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.8.16](https://github.com/ably/ably-js/tree/0.8.16) (2016-03-01)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.15...0.8.16)

**Implemented enhancements:**

- New Crypto Spec [\#242](https://github.com/ably/ably-js/issues/242)

**Merged pull requests:**

- Upgrade when closing [\#241](https://github.com/ably/ably-js/pull/241) ([SimonWoolf](https://github.com/SimonWoolf))

## [0.8.15](https://github.com/ably/ably-js/tree/0.8.15) (2016-02-11)
[Full Changelog](https://github.com/ably/ably-js/compare/0.8.14...0.8.15)

**Implemented enhancements:**

- Update README  [\#171](https://github.com/ably/ably-js/issues/171)

**Merged pull requests:**

- README tweaks [\#232](https://github.com/ably/ably-js/pull/232) ([SimonWoolf](https://github.com/SimonWoolf))
- Remove deprecated iFrame static files [\#231](https://github.com/ably/ably-js/pull/231) ([mattheworiordan](https://github.com/mattheworiordan))
- Updated tests for spec [\#225](https://github.com/ably/ably-js/pull/225) ([adamgiacomelli](https://github.com/adamgiacomelli))

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
- Log protocol messages at micro level [\#139](https://github.com/ably/ably-js/pull/139) ([mattheworiordan](https://github.com/mattheworiordan))

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
- If client lib initialised with clientid, use that for auth if no new tokenParams object is supplied [\#115](https://github.com/ably/ably-js/pull/115) ([SimonWoolf](https://github.com/SimonWoolf))
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

- PaginatedResource API change  [\#28](https://github.com/ably/ably-js/issues/28)
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
