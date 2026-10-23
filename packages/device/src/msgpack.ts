// The MessagePack plugin, bundled from the private implementation.
//
// The package's web and React Native bundles leave MessagePack out, so a client from them uses
// JSON unless it is given this plugin under the `MsgPack` key of `ClientOptions.plugins`. Its
// Node.js bundles keep MessagePack, so need no plugin. The Node.js build of this subpath carries the
// Node.js codec, and every other build the web one, so that code shared between the two can pass
// the plugin on either.
export { MsgPack } from '../../core-impl/side/msgpack-exports';
