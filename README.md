# Ably Pub/Sub JavaScript SDK

Build any realtime experience using Ably’s Pub/Sub JavaScript SDK. Supported on all popular platforms and frameworks, including Node, React, and Web Workers.

Ably Pub/Sub provides flexible APIs that deliver features such as pub-sub messaging, message history, presence, and push notifications. Utilizing Ably’s realtime messaging platform, applications benefit from its highly performant, reliable, and scalable infrastructure.

Ably LiveObjects is also available as a Pub/Sub JavaScript SDK plugin. You can use LiveObjects to synchronize application state across your clients at scale.

Find out more:

* [Ably Pub/Sub docs](https://ably.com/docs/basics)
* [Ably Pub/Sub Examples](https://ably.com/examples?product=pubsub)

---

## Getting started

Everything you need to get started with Ably:

- [Getting started with Pub/Sub in JavaScript](https://ably.com/docs/getting-started/javascript)
- [Getting started with Pub/Sub in React](https://ably.com/docs/getting-started/react)
- [Getting started with LiveObjects in JavaScript](https://ably.com/docs/liveobjects/quickstart)

---

## Supported platforms

Ably aims to support a wide range of platforms and browsers. If you experience any compatibility issues, open an issue in the repository or contact [Ably support](https://ably.com/support).

The following platforms are supported:

| Platform | Support |
|----------|---------|
| Node.js | >=16.x or later. See `engines` in [package.json](https://github.com/ably/ably-js/blob/main/package.json). |
| React | >=16.8.x |
| TypeScript | Type definitions are included in the package. |
| [Webpack](#webpack-installation) | Browser and server-side bundling supported. |
| Web Workers | Browser bundle and [modular](#modular-variant) support. |

The following browser versions are supported:

| Browser | Version |
|---------|---------|
| Chrome | >=58 (April 19, 2017). |
| Firefox | >=52 (March 7, 2017). |
| Edge | >=79 (December 15, 2020). |
| Safari | >=11 (September 19, 2017). |
| Opera | >=45 (May 10, 2017). |

> [!NOTE]
> Versions 1.2.x of the SDK support Internet Explorer >=9 and other older browsers, as well as Node.js >=8.17.

> [!IMPORTANT]
> SDK versions < 1.2.36 will be [deprecated](https://ably.com/docs/platform/deprecate/protocol-v1) from November 1, 2025.

---

## Webpack installation

The Ably Pub/Sub SDK includes support for Webpack compiling browsers.

<details>
<summary>Webpack installation details.</summary>

If you're compiling for the browser, Webpack will resolve `ably` from `node_modules` automatically when included in your `package.json`. You can then:

```javascript
require('ably');
// or, for ES6/TypeScript:
import * as Ably from 'ably';
```

With `target: 'browser'`, Webpack uses the browser-compatible CommonJS build by default.

If needed, for example with custom targets:

- **Webpack 5**: add an alias in your config:

  ```javascript
  alias: {
    ably: path.resolve(__dirname, 'node_modules/ably/build/ably.js'),
  }
  ```
- **Webpack < 5**: directly import:

  ```javascript
  import * as Ably from 'ably/build/ably.js';
  ```
</details>

## Modular variant

The Pub/Sub SDK has a modular (tree-shakable) variant to build with a small bundle sizes.

<details>
<summary>Modular variant details.</summary>

Aimed at those who are concerned about their app's bundle size, the modular variant of the library allows you to create a client which has only the functionality that you choose. Unused functionality can then be tree-shaken by your module bundler.

The modular variant of the library provides:

- a `BaseRealtime` class;
- various plugins that add functionality to a `BaseRealtime` instance, such as `Rest`, `RealtimePresence`, etc.

To use this variant of the library, import the `BaseRealtime` class from `ably/modular`, along with the plugins that you wish to use. Then, pass these plugins to the `BaseRealtime` constructor as shown in the example below:

```javascript
import { BaseRealtime, WebSocketTransport, FetchRequest, RealtimePresence } from 'ably/modular';

const client = new BaseRealtime({
  key: 'YOUR_ABLY_API_KEY', // Replace with a real key from the Ably dashboard
  plugins: {
    WebSocketTransport,
    FetchRequest,
    RealtimePresence,
  },
});
```

You must provide:

- at least one HTTP request implementation; that is, one of `FetchRequest` or `XHRRequest`;
- at least one realtime transport implementation; that is, one of `WebSocketTransport` or `XHRPolling`.

`BaseRealtime` offers the same API as the `Realtime` class described in the rest of this `README`. This means that you can develop an application using the default variant of the SDK and switch to the modular version when you wish to optimize your bundle size.

In order to further reduce bundle size, the modular variant of the SDK performs less logging than the default variant. It only logs:

- messages that have a `logLevel` of 1 (that is, errors)
- a small number of other network events

If you require more verbose logging, use the default variant of the SDK.

For more information view the [TypeDoc references](https://sdk.ably.com/builds/ably/ably-js/main/typedoc/modules/modular.html).

</details>

---

## Contribute

Read the [CONTRIBUTING.md](./CONTRIBUTING.md) guidelines to contribute to Ably.

---

## Releases

The [CHANGELOG.md](/ably/ably-js/blob/main/CHANGELOG.md) contains details of the latest releases for this SDK. You can also view all Ably releases on [changelog.ably.com](https://changelog.ably.com).

---

## Support, Feedback, and Troubleshooting

For help or technical support, visit Ably's [support page](https://ably.com/support) or GitHub Issues](https://github.com/ably/ably-js-nativescript/issues) for community-reported bugs and discussions.

### Chrome extensions

Ably Pub/Sub works out-of-the-box in background scripts for Chrome extensions using manifest v2. However, since manifest v3 background pages are no longer supported, you will need to run Ably Pub/Sub JavaScript SDK inside a service worker.

<details>
<summary>Chrome extensions support details.</summary>

If you are using this SDK in a service worker, note:

- In versions of Chrome before 116, active WebSockets would not reset the 30s service worker idle timer, resulting in the client being closed prematurely.
- In versions 116 and above, service workers will stay active as long as a client is connected.

To ensure compatibility, add the following to your `manifest.json`:

If you are using this SDK's realtime features, for example, WebSockets in a service worker, note:

- In versions of Chrome before 116, active WebSockets would not reset the 30s service worker idle timer, resulting in the client being closed prematurely.
- In versions 116 and above, service workers will stay active as long as a client is connected.

To ensure compatibility, add the following to your `manifest.json`:

```json
{
  // ...
  "minimum_chrome_version": "116",
  // ...
}
```

</details>

### Avoiding "connection limit exceeded" errors during development

If you're hitting a "connection limit exceeded" error and see rising connection counts in your Ably dashboard, it's likely due to multiple `Ably.Realtime` instances being created during development.

<details>
<summary>Errors during developments support details.</summary>

Even for `use client` components, Next.js may execute them on the server during pre-rendering. This can create unintended `Ably.Realtime` connections from Node.js that remain open until you restart the development server.

Prevent server-side connections using `autoConnect` and a window check:

```typescript
const client = new Ably.Realtime({
  key: 'your-ably-api-key',
  autoConnect: typeof window !== 'undefined',
});
```

Creating the client inside [React](https://github.com/ably/ably-js/blob/main/docs/react.md#Usage) components can lead to a new connection on every render. To prevent this, move the new `Ably.Realtime()` call outside of component functions.

In development environments that use Hot Module Replacement (HMR), such as React, Vite, or Next.js, saving a file can recreate the Ably.Realtime client, while previous instances remain connected. Over time, this leads to a growing number of active connections with each code edit. To fix: Move the client to a separate file (e.g., `ably-client.js`) and import it. This ensures the client is recreated only when that file changes.

</details>

### Next.js with App Router and Turbopack

If you encounter a `Failed to compile Module not found` error or warnings related to `keyv` when using Ably Pub/Sub JavaScript SDK with [Next.js](https://nextjs.org/docs/app/api-reference/next-config-js/serverComponentsExternalPackages), add `ably` to the `serverComponentsExternalPackages` list in `next.config.js`.

<details>
<summary>Errors during developments support details.</summary>

The following example adds `ably` to the `serverComponentsExternalPackages` list in `next.config.js`:

```javascript
const nextConfig = {
  // ...
  experimental: {
    serverComponentsExternalPackages: ['ably'],
  },
};
```

The issue is coming from the fact that when using App Router specifically, dependencies used inside Server Components and Route Handlers will automatically be bundled by Next.js. This causes issues with some packages, usually the ones that have complex `require` statements, for example, requiring some packages dynamically during runtime. `keyv` is one of those packages as it uses `require` statement dynamically when requiring its adapters (see [code in repo](https://github.com/jaredwray/keyv/blob/main/packages/keyv/src/index.ts#L102)):

`keyv` ends up being one of `ably-js`'s upstream dependencies for the node.js bundle, which causes the errors above when using it with Next.js App Router.

Using `serverComponentsExternalPackages` opts out from using Next.js bundling for specific packages and uses native Node.js `require` instead.
This is a common problem in App Router for a number of packages (for example, see next.js issue [vercel/next.js#52876](https://github.com/vercel/next.js/issues/52876)), and using `serverComponentsExternalPackages` is the recommended approach here.

</details>

### Genral errors during development

If you encounter an error such as `connection limit exceeded` during development, it may be caused by one of the following issues:

#### Server-side rendering (SSR)

Use the `autoConnect` option to prevent the client from connecting when rendered on the server:

```typescript
const client = new Ably.Realtime({ key: 'your-ably-api-key', autoConnect: typeof window !== 'undefined' });
```

#### Component re-renders

Avoid creating the client inside React components. Instead, move the client instantiation outside of the component to prevent it from being recreated on every render.

#### Hot module replacement (HMR)

To avoid duplicate client instances caused by hot reloads, move the new `Ably.Realtime()` call into a separate file, for example, `ably.js` and export the client from there. This ensures a single shared instance is reused during development.
