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
<summary>Webpack installation details</summary>

If you are using a version older than 1.2.5 you will need to add `ably` to `externals` in your Webpack config to exclude it from Webpack processing, and require and use it as an external module using `require('ably')` as above.

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
<summary>Modular variant details</summary>

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

## Support, feedback and troubleshooting

Please visit http://support.ably.com/ for access to our knowledgebase and to ask for any assistance.

You can also view the [community reported Github issues](https://github.com/ably/ably-js/issues).

To see what has changed in recent versions, see the [CHANGELOG](CHANGELOG.md).

#### Browser-specific issues

- ["Unable to parse request body" error when publishing large messages from old versions of Internet Explorer](https://support.ably.com/solution/articles/3000062360-ably-js-unable-to-parse-request-body-error-when-publishing-large-messages-from-old-browsers).

#### Chrome Extensions

ably-js works out-of-the-box in background scripts for Chrome extensions using manifest v2. However, since manifest v3 background pages are no longer supported so you will need to run ably-js inside a service worker.
If you are using an ably-js realtime client in a service worker, note that in versions of Chrome before 116, active WebSockets would not reset the 30s service worker idle timer, resulting in the client being closed prematurely, however, in versions 116 and above, service workers will stay active as long as a client is connected.
You can ensure that your extension only runs in versions 116 and above by adding the following to your `manifest.json`:

```json
{
  ...
  "minimum_chrome_version": "116",
  ...
}
```

#### Next.js with App Router and Turbopack

If you are using ably-js in your Next.js project with App Router and Turbopack enabled (via running `next dev --turbo`), you may encounter `Failed to compile Module not found` compilation error referencing `./node_modules/keyv/src/index.js` file or see `Critical dependency: the request of a dependency is an expression` warnings for the same `keyv` module.

To fix this, please add `ably` to the `serverComponentsExternalPackages` list in `next.config.js` (read more about this option [here](https://nextjs.org/docs/app/api-reference/next-config-js/serverComponentsExternalPackages)):

```javascript
const nextConfig = {
  // ...
  experimental: {
    serverComponentsExternalPackages: ['ably'],
  },
};
```

The issue is coming from the fact that when using App Router specifically dependencies used inside Server Components and Route Handlers will automatically be bundled by Next.js. This causes issues with some packages, usually the ones that have complex `require` statements, for example, requiring some packages dynamically during runtime. `keyv` is one of those packages as it uses `require` statement dynamically when requiring its adapters (see [code in repo](https://github.com/jaredwray/keyv/blob/main/packages/keyv/src/index.ts#L102)):

`keyv` ends up being one of `ably-js`'s upstream dependencies for node.js bundle, which causes the errors above when using it with Next.js App Router.

Using `serverComponentsExternalPackages` opt-outs from using Next.js bundling for specific packages and uses native Node.js `require` instead.
This is a common problem in App Router for a number of packages (for example, see next.js issue [vercel/next.js#52876](https://github.com/vercel/next.js/issues/52876)), and using `serverComponentsExternalPackages` is the recommended approach here.

#### "Connection limit exceeded" error during development

If you're encountering a "Connection limit exceeded" error when trying to connect to Ably servers during the development of your application, and you notice spikes or linear increases in the connection count on the Ably dashboard for your app, this may be due to one of the following reasons:

- If you're using Next.js, your `Ably.Realtime` client instance may be created multiple times on the server side (i.e., in a Node.js process) as you're developing your app, due to Next.js server side rendering your components. Note that even for "Client Components" (i.e., components with the 'use client' directive), [Next.js may still run the component code on the server in order to pre-render HTML](https://nextjs.org/docs/app/building-your-application/rendering/client-components#how-are-client-components-rendered). Depending on your client configuration options, those clients may also successfully open a connection to Ably servers from that Node.js process, which won't close until you restart your development server.

  The simplest fix is to use the `autoConnect` client option and check if the client is created on the server side with a simple window object check, like this:

  ```typescript
  const client = new Ably.Realtime({ key: 'your-ably-api-key', autoConnect: typeof window !== 'undefined' });
  ```

  This will prevent the client from connecting to Ably servers if it is created on the server side, while not affecting your client side components.

- If you're using any React-based framework, you may be recreating the `Ably.Realtime` client instance on every component re-render. To avoid this, and to prevent potentially reaching the maximum connections limit on your account, move the client instantiation (`new Ably.Realtime`) outside of your components. You can find an example in our [React docs](./docs/react.md#Usage).

- The connection limit error can be caused by the Hot Reloading mechanism of your development environment (called Fast Refresh in newer Next.js versions, or more generally, Hot Module Replacement - HMR). When you edit and save a file that contains a `new Ably.Realtime()` call in an environment that supports HMR (such as React, Vite, or Next.js apps), the file gets refreshed and creates a new `Ably.Realtime` client instance. However, the previous client remains in memory, unaware of the replacement, and stays connected to Ably's realtime systems. As a result, your connection count will keep increasing with each file edit as new clients are created. This only resets when you manually refresh the browser page, which closes all clients. This behavior applies to any development environment with an HMR mechanism implemented.

  The solution is simple: move the `new Ably.Realtime()` call to a separate file, such as `ably-client.js`, and export the client instance from there. This way, the client instance will only be recreated when you specifically make changes to the `ably-client.js` file, which should be far less frequent than changes in the rest of the codebase.

