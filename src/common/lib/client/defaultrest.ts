import { BaseRest } from './baserest';

/**
 `DefaultRest` is the class that the SDK exports as `Rest`. This is currently the only REST class exported by the SDK. When we introduce the forthcoming tree-shakable version of the SDK, which will export `BaseRest`, `DefaultRest` will remain an export of the non-tree-shakable version.
 */
export class DefaultRest extends BaseRest {}
