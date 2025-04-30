# Ably Pub/Sub JavaScript SDK

Ably Pub/Sub JavaScript SDK is the official SDK for interacting with the [Ably realtime platform](https://ably.com/docs/platform#platform). Ably Pub/Sub JavaScript SDK supports building realtime applications with features like:

- [Pub/Sub messaging](https://ably.com/docs/realtime)
- [Channels](https://ably.com/docs/channels)
- [Presence](https://ably.com/docs/presence-occupancy/presence)
- [Message history](https://ably.com/docs/storage-history/history)
- [Delta compression](https://ably.com/docs/channels/options/deltas)
- [Push notifications](https://ably.com/docs/push)
- [Connection recovery](https://ably.com/docs/realtime/usage#connection-state-recovery)

---

## Supported Environments

| Environment      | Minimum Supported Version / Notes                                                                   |
|------------------|-----------------------------------------------------------------------------------------------------|
| **Chrome**       | 58 (April 19, 2017)                                                                                 |
| **Firefox**      | 52 (March 7, 2017)                                                                                  |
| **Edge**         | 79 (December 15, 2020)                                                                              |
| **Safari**       | 11 (September 19, 2017)                                                                             |
| **Opera**        | 45 (May 10, 2017)                                                                                   |
| **Node.js**      | 16.x or newer. 1.1.x supports Node.js 4.5+, 1.2.x supports 8.17+. No ESM bundle currently available.|
| **Webpack**      | Supported for both browser and server-side bundling.                                                |
| **Modular Build**| Supported via a tree-shakable variant of the library.                                               |
| **TypeScript**   | Typings included in the package.                                                                    |
| **React Hooks**  | Provides access to Ably realtime functionality.                                                     |
| **React Native** | All React Native platforms supported.                                                               |
| **NativeScript** | Supported via community-maintained wrapper.                                                         |
| **Web Workers**  | Supported in browser bundles and modular variant.                                                   |

---

## Installation

You can install Ably Pub/Sub JavaScript SDK via npm for Node.js and browser-based apps, or include it directly in the browser via a CDN.


### Node.js

Install the package using npm:

```bash
npm install ably --save
```
Install the package using npm:

```bash
npm install ably --save
```

Then require it in your code:
Then require it in your code:

```javascript
var Ably = require('ably');
```

### CDN
### CDN

Include the Ably SDK in your HTML:

```html
<script src="https://cdn.ably.com/lib/ably.min-2.js"></script>
```

---

## Quick Start

To quickly get up and running, use the Ably Pub/Sub [quickstart guide](https://ably.com/docs/getting-started/quickstart).

---

## Support, Troubleshooting, and Environment-Specific Issues

For help or technical support, visit Ably's [support page](https://ably.com/support).

### Chrome Extensions

Ably Pub/Sub JavaScript SDK works out-of-the-box in background scripts for Chrome extensions using manifest v2. However, since manifest v3 background pages are no longer supported, you will need to run Ably Pub/Sub JavaScript SDK inside a service worker.

If you are using this SDK in a service worker, note:

- In versions of Chrome before 116, active WebSockets would not reset the 30s service worker idle timer, resulting in the client being closed prematurely.
- In versions 116 and above, service workers will stay active as long as a client is connected.

To ensure compatibility, add the following to your `manifest.json`:

```json
{
  ...
  "minimum_chrome_version": "116",
  ...
}
```

### Next.js with App Router and Turbopack
### Next.js with App Router and Turbopack

If you encounter a `Failed to compile Module not found` error or warnings related to `keyv` when using Ably Pub/Sub JavaScript SDK with [Next.js](https://nextjs.org/docs/app/api-reference/next-config-js/serverComponentsExternalPackages), add `ably` to the `serverComponentsExternalPackages` list in `next.config.js`:

```javascript
const nextConfig = {
  // ...
  experimental: {
    serverComponentsExternalPackages: ['ably'],
  },
};
```

### Errors during development

If you encounter an error such as `connection limit exceeded` during development, it may be caused by one of the following issues:

#### Server-side rendering (SSR)

Use the `autoConnect` option to prevent the client from connecting when rendered on the server:

```typescript
const client = new Ably.Realtime({ key: 'your-ably-api-key', autoConnect: typeof window !== 'undefined' });
```
```typescript
const client = new Ably.Realtime({ key: 'your-ably-api-key', autoConnect: typeof window !== 'undefined' });
```

#### Component re-renders

Avoid creating the client inside React components. Instead, move the client instantiation outside of the component to prevent it from being recreated on every render.

#### Hot module replacement (HMR)

To avoid duplicate client instances caused by hot reloads, move the new `Ably.Realtime()` call into a separate file, for example, ably.js and export the client from there. This ensures a single shared instance is reused during development.

## Contribute

For contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Changelog

See the [CHANGELOG.md](./CHANGELOG.md) for details on updates and changes.
