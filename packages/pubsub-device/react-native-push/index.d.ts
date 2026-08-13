/**
 * The core's React Native push plugin. Unlike the web `@ably/pubsub-device/push` plugin, the push
 * environment is supplied by your application: pass an async storage implementation and a token
 * callback to `create()`, then register the result under the `Push` plugin key.
 *
 * ```javascript
 * import { createClient } from '@ably/pubsub-device';
 * import ReactNativePush from '@ably/pubsub-device/react-native-push';
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 * import messaging from '@react-native-firebase/messaging';
 *
 * const Push = ReactNativePush.create({
 *   storage: AsyncStorage,
 *   requestToken: async () => ({ transportType: 'fcm', token: await messaging().getToken() }),
 * });
 *
 * const client = createClient({
 *   authUrl: 'https://your-server.example.com/ably-token',
 *   clientId: 'me',
 *   plugins: { Push },
 * });
 * await client.push.activate();
 * ```
 *
 * Authenticate with `authUrl` or `authCallback` rather than `key`: an API key shipped inside a
 * mobile application binary can be extracted from it, and cannot be revoked without a release.
 *
 * Re-exported with `export =`, the form the core uses, so that the option types the namespace
 * declares stay reachable alongside `create`.
 */
import ReactNativePush = require('ably/react-native-push');

export = ReactNativePush;
