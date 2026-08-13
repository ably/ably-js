// Re-exports the core's React Native push plugin, so a consumer of this package can activate push
// without also depending on `ably` directly.
//
// A CommonJS-style re-export, because the core declares this plugin with `export =` over a
// namespace that carries both `create` and the option types. `export =` is the only form that
// preserves the namespace's type members as well as its value, and it is why this subpath ships one
// CommonJS artifact rather than a CJS/ESM pair — matching the core, which also ships just the one.
import ReactNativePush = require('ably/react-native-push');

export = ReactNativePush;
