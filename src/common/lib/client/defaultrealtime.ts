import BaseRealtime from './baserealtime';

/**
 `DefaultRealtime` is the class that the SDK exports as `Realtime`. This is currently the only Realtime class exported by the SDK. When we introduce the forthcoming tree-shakable version of the SDK, which will export `BaseRealtime`, `DefaultRealtime` will remain an export of the non-tree-shakable version.
 */
export class DefaultRealtime extends BaseRealtime {}
