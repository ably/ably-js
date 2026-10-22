// The web push plugin, bundled from the private implementation.
//
// One source serving both module systems, as every other subpath here does: the plugin is exposed
// under a name rather than as the module itself, so nothing needs the `export =` form that has no
// ESM spelling. See ../../core-impl/side/push-exports.ts.
export { Push } from '../../core-impl/side/push-exports';
