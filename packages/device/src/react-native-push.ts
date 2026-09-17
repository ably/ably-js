// The React Native push plugin, bundled from the private implementation.
//
// One source serving both module systems, for the same reason as ./push.ts. Unlike the web push
// plugin, this one is configured before use: pass an async storage implementation and a token
// callback to `ReactNativePush.create()`, then register the result under the `Push` plugin key.
export { ReactNativePush } from '../../core-impl/side/react-native-push-exports';
