/**
 * The core's web push plugin, which gives a client the ability to be activated as a target for
 * push notifications.
 *
 * ```javascript
 * import { createClient } from '@ably/pubsub-device';
 * import Push from '@ably/pubsub-device/push';
 *
 * const client = createClient({ key: 'your-ably-api-key', clientId: 'me', plugins: { Push } });
 * await client.push.activate();
 * ```
 *
 * Import-only. The core's `ably/push` declares no `require` condition, and its build is reachable
 * by no other exported path, so the only way to obtain the plugin is to import it — which makes
 * this subpath ESM-only too. `require()` of it fails, and these types say so by being ESM-only
 * rather than claiming a CommonJS entry point that cannot work.
 *
 * Use `@ably/pubsub-device/react-native-push` in a React Native application instead of this one.
 */
declare const Push: any;

export default Push;
