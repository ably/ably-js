# Migration guide for ably-js v2

Here’s how to migrate from ably-js v1 to v2:

1. [Stop using functionality that v1 deprecated and which v2 removes](#stop-using-v1-deprecated).
2. [Stop using other functionality that v2 removes](#stop-using-v2-removed).
3. [Update to v2 and handle its breaking changes](#update-to-v2-and-handle-breaking-changes).
4. (Optional) [Stop using functionality that v2 deprecates](#stop-using-v2-deprecated).
5. (Optional) [Take advantage of new features that v2 introduces](#use-v2-new-features).

<h2 id="stop-using-v1-deprecated">Stop using functionality that v1 deprecated and which v2 removes</h2>

Begin by updating to ably-js 1.2.50 or later, to make sure you see the deprecation log messages [described below](#stop-using-v1-deprecated-general).

Now, you need to stop using the functionality that is deprecated by v1 and which is removed in v2. Here we explain how.

The changes below are split into:

- general changes
- changes that only affect TypeScript users

If you’re not using any of the deprecated functionality described below, then this section does not affect you.

<h3 id="stop-using-v1-deprecated-general">General changes</h3>

In ably-js 1.2.50 or later, use of the following APIs will trigger a deprecation warning at runtime.

**Note about deprecation warnings:** These deprecation warnings take the form of error-level log messages emitted through the library’s logging mechanism (i.e. `ClientOptions.log.handler` or `ClientOptions.logHandler` if you’ve set these properties, or else `console.log()`). To find them in your logs, search for `Ably: Deprecation warning`.

- The `log` client option has been removed in v2. Equivalent functionality is provided by the `logLevel` and `logHandler` client options. Update your client options code of the form `{ log: { level: logLevel, handler: logHandler } }` to instead be `{ logLevel, logHandler }`.
- Changes to `Crypto.getDefaultParams()`:
  - The ability to pass a callback to this method has been removed in v2. This method now directly returns its result, instead of returning it asynchronously. Update your code so that it uses the return value of this method instead of passing a callback.
  - The ability to call this method without specifying an encryption key has been removed in v2. Update your code so that it instead passes an object whose `key` property contains an encryption key. That is, replace `Crypto.getDefaultParams()` with `Crypto.getDefaultParams({ key })`, where `key` is an encryption key that you have generated (for example from the `Crypto.generateRandomKey()` method).
  - The ability to pass the encryption key as the first argument of this method has been removed in v2. Update your code so that it instead passes an object whose `key` property contains the key. That is, replace `Crypto.getDefaultParams(key)` with `Crypto.getDefaultParams({ key })`.
- The `fallbackHostsUseDefault` client option has been removed in v2.
  - If you’re using this client option to force the library to make use of fallback hosts even though you’ve set the `environment` client option, then this is no longer necessary: remove your usage of the `fallbackHostsUseDefault` client option and the library will then automatically choose the correct fallback hosts to use for the specified environment.
  - If you’re using this client option to force the library to make use of fallback hosts even though you’re not using the primary Ably environment, then stop using `fallbackHostsUseDefault`, and update your code to either pass the `environment` client option (in which case the library will automatically choose the correct fallback hosts to use for the specified environment), or to pass the `fallbackHosts` client option to specify a custom list of fallback hosts to use (for example, if you’re using a custom CNAME, in which case Ably will have provided you with an explicit list of fallback hosts).
- The ability to use a boolean value for the `recover` client option has been removed in v2. If you wish for the connection to always be recovered, replace `{ recover: true }` with a function that always passes `true` to its callback: `{ recover: function(lastConnectionDetails, cb) { cb(true); } }`.
- The ability to pass an array of channel mode flags as the first argument of `RealtimeChannel.attach()` has been removed in v2. To set channel mode flags, populate the `modes` property of the channel options object that you pass to `Channels.get()` or `RealtimeChannel.setOptions()`.
- The `force` auth option has been removed in v2. If you’re using this option to force `authorize()` to fetch a new token even if the current token has not expired, this is no longer necessary, as `authorize()` now always fetches a new token. Update your code to no longer pass the `force` auth option. Note that, in general, passing an auth options argument to `authorize()` will overwrite the library’s stored auth options, which may not be what you want. In v1, the library contains a special case behavior where passing an auth options object which only contains `{ force: true }` will _not_ overwrite the stored options. This special case behavior has been removed in v2, so if you’re currently passing `authorize()` an auth options object which only contains `{ force: true }`, you should stop passing it an auth options object entirely.
- The `host` client option has been renamed to `restHost`. Update your code to use `restHost`.
- The `wsHost` client option has been renamed to `realtimeHost`. Update your code to use `realtimeHost`.
- The `queueEvents` client option has been renamed to `queueMessages`. Update your code to use `queueMessages`.
- `RealtimePresence`’s `on` method has been renamed to `subscribe`. Update your code to use `subscribe`.
- `RealtimePresence`’s `off` method has been renamed to `unsubscribe`. Update your code to use `unsubscribe`.
- `Auth`’s `authorise` method has been renamed to `authorize`. Update your code to use `authorize`.
- The `headers` client option has been removed in v2. Remove your use of this client option.

### Only TypeScript users

- In v2, the `stats()` method on `Rest` and `Realtime` no longer accepts an argument of type `any`. Make sure that any argument you pass to this method implements the `StatsParams` interface.
- In v2, `fromEncoded<T>` and `fromEncodedArray<T>` types, which were already not being used by the library, are no longer exported by the library. Remove your references to these types.

<h2 id="stop-using-v2-removed">Stop using other functionality that v2 removes</h2>

<h3 id="switch-from-callbacks-to-promises">Switch from the callbacks-based variant of the library to the promise-based variant</h3>

**Note:** This section is only relevant if you’re not already using v1’s promise-based API.

ably-js v1 offered a choice between styles of asynchronous programming. There was a variant of the library that implemented asynchronous function calls via callbacks, and another that implemented them via promises. Now that promises are widely supported across modern JavaScript engines, ably-js v2 removes the callbacks variant of the library, and only offers promise-based asynchronicity.

So, if you’re currently using the callbacks variant of the library, then before upgrading to v2 you should switch to using the promises variant. Here, we explain how to do this.

#### Choose the promises variant of the library instead of the callbacks variant

First, you should stop choosing the callbacks variant of the library, and instead choose the promises variant. How exactly you should change your code to achieve this depends on how you’re currently choosing the callbacks variant:

- If you’re implicitly choosing the callbacks variant of the library by writing `require('ably')`, then update your code to `require('ably/promises')`.
- If you’re explicitly choosing the callbacks variant through the subpath of the imported module — that is, if you’re writing `require('ably/callbacks')` — then update your code to `require('ably/promises')`.
- If you’re explicitly choosing the callbacks variant at the moment of instantiating the client — that is, if you’re writing `new Ably.Rest.Callbacks(…)` or `new Ably.Realtime.Callbacks(…)` — then update your code to use the `Promise` property instead, i.e. write `new Ably.Realtime.Promise(…)` or `new Ably.Rest.Promise(…)`.

#### Update your code to use the promise-based API

Now, update your code to use ably-js’s promise-based API instead of the callback-based API. The best way to do this is to consult the [documentation for v1’s promise-based API](https://ably.com/docs/sdk/js/v1.2/promises), to find the documentation for the promise-based version of each method that you’re using in your code. If you don’t want to do this, it’s generally sufficient to understand that the promise-based API differs from the callback-based API in a way that’s consistent across all methods. What follows is a description of this difference.

Given a method which, in the callback-based API, takes a callback of the form `(err, result)` as its final argument, its equivalent in the promise-based API does not take this final argument. Instead, it returns a promise. If the operation succeeds then this promise will be resolved with a value equivalent to the callback’s `result` argument, and if it fails then this promise will be rejected with a value equivalent to the callback’s `err` argument.

So, you need to update your code to stop passing this callback, and then make use of the returned promise. In general, JavaScript offers a couple of approaches for interacting with promises, and so now we’ll demonstrate how these apply to an example ably-js method call.

For example, given the following call to the callbacks-based version of `RestChannel.history()`:

```javascript
channel.history({ direction: 'forwards' }, (err, paginatedResult) => {
  if (err) {
    // Perform some sort of error handling
    return;
  }

  // Make use of paginatedResult
});
```

We could do one of the following:

1. Use JavaScript’s `await` keyword to retrieve the result of the operation, combined with the `catch` keyword for error handling:

   ```javascript
   try {
     const paginatedResult = await channel.history({ direction: 'forwards' });
     // Make use of paginatedResult
   } catch (err) {
     // Perform some sort of error handling
   }
   ```

2. Use the promise’s `then` method to retrieve the result of the operation, combined with its `catch` method for error handling:

   ```javascript
   channel
     .history({ direction: 'forwards' })
     .then((paginatedResult) => {
       // Make use of paginatedResult
     })
     .catch((err) => {
       // Perform some sort of error handling
     });
   ```

#### A caveat regarding `Crypto.generateRandomKey()`

**Important:** For historical reasons, the `Crypto.generateRandomKey()` method does not have a promise-based version in v1. That is, even in the promise-based variant of the SDK, it implements asynchronicity via callbacks. So, if you’re using this method, then you’ll need to keep using the callback-based version of this method until upgrading to v2, which replaces the callback-based variant of this method with a promise-based one. For more information see [here](#switch-to-promise-based-generateRandomKey).

<h2 id="update-to-v2-and-handle-breaking-changes">Update to v2 and handle its breaking changes</h2>

Next, update to ably-js version 2.0.0 or later.

Now, you need to address the other breaking changes introduced by v2. Here we explain how.

The changes below are split into:

- general changes
- changes that only affect TypeScript users

Some of these changes are only relevant if you’re using specific features of the library. The guidance below makes it clear when this is the case.

### General changes

#### Stop explicitly selecting the promise-based variant of the library

As [mentioned above](#switch-from-callbacks-to-promises), v2 of the library no longer offers a choice between a callbacks-based API and a promises-based API. This means that v1’s mechanism for choosing which variant to use has been removed, so you should stop using this mechanism.

- If you’re explicitly choosing the promises variant of the library through the subpath of the imported module — that is, if you’re writing `require('ably/promises')` — then update your code to `require('ably')`.
- If you’re explicitly choosing the promises variant at the moment of instantiating the client — that is, if you’re writing `new Ably.Rest.Promise(…)` or `new Ably.Realtime.Promise(…)` — then update your code to remove the use of the `Promise` property, i.e. write `new Ably.Realtime(…)` or `new Ably.Rest(…)`.

<h4 id="supported-platforms">Be aware of platforms that are no longer supported</h4>

v2 of the library drops support for some platforms that v1 supported. Most notably, it no longer supports Internet Explorer or Node.js versions below 16. For more information, see [this section of the Readme](../../../README.md#supported-platforms).

#### Be aware of a new endpoint to add to firewall whitelists

**Note:** This change is most likely to affect you if you’re already explicitly configuring your firewall (or instructing your users to configure their firewall) to allow realtime connections to Ably, as described in [this FAQ on ably.com](https://faqs.ably.com/if-i-need-to-whitelist-ablys-servers-from-a-firewall-which-ports-ips-and/or-domains-should-i-add).

When attempting to establish a realtime connection using WebSocket, v2 uses the `wss://ws-up.ably-realtime.com` endpoint to check if WebSocket connectivity is available. Update your firewall whitelist to allow connectivity to that endpoint.

#### Be aware of changes affecting environments where WebSocket connections may be blocked

In v1 of ably-js, realtime clients with multiple available transports would initially attempt to connect with the transport most likely to succeed (`xhr_polling` in web browsers). Upon the success of this initial connection, they would subsequently attempt to "upgrade" to a preferable transport such as WebSocket.

This behaviour has been changed in v2. Now, realtime clients will instead first attempt to connect to Ably using WebSocket, and only failover to alternative transports if this WebSocket connection attempt fails. For the vast majority of users this will result in a smoother initial connection sequence, however in environments where WebSocket connections are unavailable and time out instead of failing immediately (such as when using a corporate proxy which strips WebSocket headers) this may result in a slower initial connection. Once a connection is first established, transport preference will be cached in the web browser local storage so subsequent connections will use the best available transport. If you expect WebSocket connection attempts to always fail in your enviornment, you can skip the WebSocket connection step by explicitly providing a list of transports which omits the `web_socket` transport via the `transports` client option.

<h4 id="switch-to-promise-based-generateRandomKey">Switch to using the new promise-based API of <code>Crypto.generateRandomKey()</code></h4>

**Note:** This section is only relevant if you’re using the `Crypto.generateRandomKey()` method.

If you’re using the `Crypto.generateRandomKey()` method, you’ll need to change how you call this method. In v1, this method required that you pass a callback. In v2, it communicates its result by returning a promise.

So you need to change code that looks like this:

```javascript
Ably.Realtime.Crypto.generateRandomKey((err, key) => { … })
```

into code that makes use of the returned promise, for example by using the `await` keyword on it:

```javascript
const key = await Ably.Realtime.Crypto.generateRandomKey();
```

#### Update your usage of `request()` to pass a `version` argument

**Note:** This section is only relevant if you’re using the `Rest.request()` or `Realtime.request()` methods; that is, if you’re using the library to manually make a request to the Ably REST API.

The signature of this method has been changed; it now requires that you pass a `version` argument to specify the version of the REST API to use. For compatibility with v1 of this library, specify a version of `2`.

As an example, given the current code to [get the service time](https://ably.com/docs/api/rest-api#time):

```javascript
const time = await rest.request('get', '/time');
```

add an argument to specify the API version:

```javascript
const time = await rest.request('get', '/time', 2);
```

#### Update your usage of the result of the `stats()` method

**Note:** This section is only relevant if you’re using the `Rest.stats()` or `Realtime.stats()` method; that is, if you’re using the library to retrieve your application’s usage statistics.

The `Stats` type returned by the `Rest.stats()` and `Realtime.stats()` method has been simplified in v2. Specifically, there is a new property called `entries`, which is an object all of whose properties have numeric values. The `entries` property replaces the following properties:

- `all`
- `inbound`
- `outbound`
- `persisted`
- `connections`
- `channels`
- `apiRequests`
- `tokenRequests`
- `xchgProducer`
- `xchgConsumer`
- `pushStats`
- `processed`

You should migrate your code to use the `entries` property instead of these properties.

The main differences between the v1 `Stats` type and the `entries` property in v2 are:

- the various stats that count messages in different ways (`all`, `inbound`, `outbound`, `persisted`, `processed`) are now under `messages` instead of all in the top level
- `connections` is no longer broken down into `plain` and `tls`
- instead of top-level `apiRequests` and `tokenRequests`, which doesn't make much sense because token requests are API requests, you now have a top level `apiRequests` that’s broken down currently into `tokenRequests` and `other` with an `all` aggregate, with potential to split other out into more specific types later
- `push` is completely reorganised in a way that makes more sense

For more detailed information on `entries`, see the `Stats` type’s new `schema` property. It provides you with the URL of a [JSON Schema](https://json-schema.org/) which describes the structure of this `Stats` object. (Alternatively, if you wish to view this schema now, you can find it [here](https://github.com/ably/ably-common/blob/main/json-schemas/src/app-stats.json).)

As an example, given the following v1 code that uses the `stats()` API:

```javascript
const stats = await rest.stats();
const inboundMessageCount = stats[0].inbound.all.messages.count;
```

This is the equivalent v2 code:

```javascript
const stats = await rest.stats();
const inboundMessageCount = stats[0].entries['messages.inbound.all.messages.count'] ?? 0;
```

Notice that a given property may be absent from `entries`. If a property is absent, this is equivalent to its value being 0.

#### Be aware of changed `whenState()` behaviour

**Note:** This section is only relevant if you’re using the `RealtimeChannel.whenState()` or `Connection.whenState()` methods.

The `RealtimeChannel.whenState()` and `Connection.whenState()` methods now return `null` when the connection is already in the given state, instead of attempting to synthesize an artificial state change.

#### Be aware that the `fromEncoded()` and `fromEncodedArray()` methods are now async

**Note:** This section is only relevant if you’re using `Message` or `PresenceMessage`’s `fromEncoded` or `fromEncodedArray` methods.

`Message` and `PresenceMessage`’s `fromEncoded` and `fromEncodedArray` methods now operate asynchronously. That is, instead of returning the decoding result, they return a promise. Update your code to retrieve the result of these promises, for example by using the `await` keyword.

<h4 id="secure-context">Be aware that symmetric encryption in a browser now requires a secure context</h4>

**Note:** This section is only relevant if you’re using the `cipher` client option and running in a browser.

If you’re making use of the `cipher` client option to enable symmetric encryption on a channel, be aware that when running in a browser this functionality is now implemented using the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API). Hence, this functionality is only available when this API is available; namely, when the current environment is a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts). Roughly speaking, this means that you can now only use Ably channel encryption inside a web page when serving your page over HTTPS or from `localhost`.

<h4 id="no-more-CryptoJS">Be aware that the library no longer uses CryptoJS and hence no longer works with <code>WordArray</code></h4>

**Note:** This section is only relevant if you’re using the `cipher` client option and running in a browser.

When running in a browser, the library previously used the CryptoJS library for implementing symmetric encryption on a channel. As mentioned [here](#secure-context), the library now instead uses the built-in Web Crypto API.

This means that the library is no longer capable of interacting with CryptoJS’s `WordArray` type. Specifically:

- `Crypto.generateRandomKey()` now returns an `ArrayBuffer` instead of a `WordArray`.
- `Crypto.getDefaultParams({ key })` no longer accepts a `WordArray` key; pass an `ArrayBuffer` or `Uint8Array` instead.

#### Stop requesting the `xhr_streaming` and `xhr` transports

**Note:** This section is only relevant if you’re explicitly writing `"xhr_streaming"` or `"xhr"` as part of your `transports` client option.

v1 offered the `xhr_streaming` transport, also known as `xhr`, primarily to provide a performant realtime transport for browsers which did not support WebSocket connections. Since this limitation does not apply to any of the [browsers supported by v2](#supported-platforms), the `xhr_streaming` transport has been removed. If your `transports` client option contains `"xhr_streaming"` or `"xhr"`, remove this value. If you still wish to explicitly request a non-WebSocket transport, request `xhr_polling` instead.

#### Stop requesting the `jsonp` transport

**Note:** This section is only relevant if you’re explicitly writing `"jsonp"` as part of your `transports` client option.

v1 offered JSONP as a fallback transport for browsers that did not support cross-origin XHR. Since this limitation does not apply to any of the [browsers supported by v2](#supported-platforms), the JSONP transport has been removed. If your `transports` client option contains `"jsonp"`, remove this value.

#### Stop using the `noencryption` variant of the library

**Note:** This section is only relevant if you’re importing `ably/build/ably.noencryption.min.js` or using the `ably.noencryption.min-1.js` CDN build.

In v1, we provided a separate version of the library that did not support the `cipher` channel option. This was offered for those who did not wish to bloat their app’s bundle size with encryption code.

Since v2 [no longer uses the CryptoJS library](#no-more-CryptoJS), the `cipher` channel option functionality now has a much smaller impact on your app’s bundle size. So, we no longer offer the `noencryption` variant of the library.

Furthermore, v2 introduces the [modular variant of the library](#modular-variant), which is specifically aimed at those who are concerned about their app’s bundle size. It provides a general mechanism for choosing which Ably functionality you wish to include in your app’s bundle. So, if you do not wish to incur even the small bundle size overhead that the `cipher` channel option imposes, consider using the modular variant of the library without the `Crypto` module.

#### Stop using the special Web Worker build of the library

**Note:** This section is only relevant if you’re using ably-js inside a [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API).

In v1, if you wished to use ably-js inside a Web Worker, you had to use a special build of the library, by writing `import Ably from 'ably/build/ably-webworker.min'`.

In v2, the library can be used inside a Web Worker without needing to use a special build, and this special `ably-webworker` build no longer exists. So, update your code to `import Ably from 'ably'`.

#### Stop importing the `ably/build/ably-commonjs.js` or `ably/build/ably-commonjs.noencryption.js` files

**Note:** This section is only relevant if you’re importing `ably/build/ably-commonjs.js` or `ably/build/ably-commonjs.noencryption.js`.

The `ably/build/ably-commonjs.js` file no longer exists.

- If you’re currently writing `require('ably/build/ably-commonjs.js')`, write `require('ably')` instead.
- If you’re currently writing `import * as Ably from 'ably/build/ably-commonjs.js'`, write `import * as Ably from 'ably'` instead.

(The same applies for `ably-commonjs.noencryption.js`.)

### Only TypeScript users

#### Stop referring to the `Types` namespace

v1 exported many of its types inside the `Types` TypeScript namespace. v2 removes this namespace, and the types it contained are now exported at the top level. Remove your references to the `Types` namespace.

For example, code like this:

```typescript
let options: Ably.Types.ClientOptions = { key: 'foo' };
```

should now be written

```typescript
let options: Ably.ClientOptions = { key: 'foo' };
```

In order to avoid a clash with the existing top-level types of the same type, the `Types.Rest` and `Types.Realtime` types have been renamed to `RestClient` and `RealtimeClient`. If you’re referring to these types in your code (which is probably unlikely) then update these references.

<h4 id="stop-referring-to-suffixed-types">Stop referring to the <code>*Base</code>, <code>*Callbacks</code> and <code>*Promise</code> types</h4>

The v1 type declarations contained various sets of three related types in order to reflect the different asynchronicity styles offered by the SDK. For example, it had a `RealtimeChannelBase` type which contained functionality common to the callbacks-based and promises-based API of a realtime channel, and then `RealtimeChannelCallbacks` and `RealtimeChannelPromises` types which contained the APIs unique to those asynchronicity styles.

Now that [the callbacks-based variant of the library has been removed](#switch-from-callbacks-to-promises), we’ve simplified the types, removing the `*Callbacks` types and combining each pair of `*Base` and `*Promise` types into a single type. For example, where previously there existed three types that described a realtime channel, now there is just one, named `RealtimeChannel`. You should update your code to stop referring to the suffixed types. In general, this is a case of removing these suffixes from the type names.

#### Be aware that some properties might not be populated on messages received from Ably

The following properties of `Message` are now declared as optional:

- `clientId`
- `data`
- `encoding`
- `extras`
- `name`

This update to the type declarations reflects the fact that these properties are not (and never have been, despite what the v1 declarations suggested) guaranteed to be populated on a message received from Ably.

#### Be aware that the `Message` type now refers to a message that you publish to Ably

The `Message` type has been changed so that it represents a message that you publish to Ably (see [migration guidance for the changes to the type declaration for the `publish()` method](#publish-type-changes)). Since you are not required to populate the following properties of a message that you publish to Ably, they are now optional:

- `id`
- `timestamp`

If you were previously using the `Message` type to refer to a message received from Ably (e.g. from the `RealtimeChannel.subscribe()` or `RealtimeChannel.history()` methods), then switch to using the new `InboundMessage` type, which represents a message received from Ably; it’s a version of `Message` in which these two properties are _not_ optional (matching the v1 `Message` type).

<h4 id="publish-type-changes">Be aware that <code>publish()</code> is stricter about its arguments</h4>

In v1, the type declarations for the publishing methods `Channel.publish()` and `RealtimeChannel.publish()` stated that they accepted an argument of type `any`. This was inaccurate, as in fact there were expectations about the shape of the message or messages that you pass to these methods. Now, the type declarations state you must pass an object that satisfies the `Message` interface, or an array of such objects.

#### Be aware that enum-like namespaces have changed name

**Note:** It’s unlikely that you’re affected by this change.

In v1, there existed a pattern in the type declarations where a single name was used for a namespace and also a type whose possible values were the members of that namespace. For example:

```typescript
declare namespace ChannelState {
  type INITIALIZED = 'initialized';
  type ATTACHING = 'attaching';
  type ATTACHED = 'attached';
  type DETACHING = 'detaching';
  type DETACHED = 'detached';
  type SUSPENDED = 'suspended';
}

export type ChannelState =
  | ChannelState.FAILED
  | ChannelState.INITIALIZED
  | ChannelState.SUSPENDED
  | ChannelState.ATTACHED
  | ChannelState.ATTACHING
  | ChannelState.DETACHED
  | ChannelState.DETACHING;
```

In v2, the namespace has been changed so that its name has a plural inflection. For example, whilst the `ChannelState` _type_ maintains its name, the `ChannelState` _namespace_ is now called `ChannelStates`. Update your code accordingly.

Also, there was a type in v1 called `ChannelModes` which was just an alias for `Array<ChannelMode>`. In order to accommodate the naming scheme described above, the `ChannelModes` type no longer has its v1 meaning.

#### Stop relying on the declared inheritance relationship between REST and realtime types

In v1, the `Types.RealtimeBase` class is declared as inheriting from the `Types.RestBase` class. [As mentioned above](#stop-referring-to-suffixed-types), these classes no longer exist. Their replacements (the `RealtimeClient` and `RestClient` interfaces) do not declare an inheritance relationship.

<h2 id="stop-using-v2-deprecated">Stop using functionality that v2 deprecates</h2>

#### Use `Connection.createRecoveryKey()` instead of `Connection.recoveryKey`

**Note:** This section only applies if you’re using the `Connection.recoveryKey` property. You’re likely only using this if making use of the library’s connection recovery functionality, and have opted out of the library’s recovery key persistance functionality; that is, if you’re populating the `recover` client option with a string (as opposed to a callback).

The `Connection.recoveryKey` property is deprecated and will be removed in a future version. It has been replaced by the `Connection.createRecoveryKey()` method. The return value of this method is identical to the value of the `Connection.recoveryKey` property. Update your code to use this return value.

<h2 id="use-v2-new-features">Take advantage of new features that v2 introduces</h2>

<h3 id="modular-variant">Using the modular variant of the library</h3>

Aimed at those who are concerned about their app’s bundle size, the modular variant of the library allows you to create a client which has only the functionality that you choose. Unused functionality can then be tree-shaken by your module bundler.

To get started with the modular variant of the library, see [this section of the Readme](../../../README.md#modular-tree-shakable-variant).
