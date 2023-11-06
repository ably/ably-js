import { BaseRest } from './baserest';
import ClientOptions from '../../types/ClientOptions';
import { allCommonModules } from './modulesmap';

/**
 `DefaultRest` is the class that the non tree-shakable version of the SDK exports as `Rest`. It ensures that this version of the SDK includes all of the functionality which is optionally available in the tree-shakable version.
 */
export class DefaultRest extends BaseRest {
  constructor(options: ClientOptions | string) {
    super(options, allCommonModules);
  }
}
