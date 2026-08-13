// Re-exports the core's web push plugin, so a consumer of this package can activate push without
// also depending on `ably` directly.
//
// A default re-export rather than a star one, because the core declares this plugin with
// `export =`: the module *is* the plugin object, and there are no named exports to spread.
import Push from 'ably/push';

export default Push;
