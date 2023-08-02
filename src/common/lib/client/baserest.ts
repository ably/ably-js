import BaseClient from './baseclient';
import ClientOptions from '../../types/ClientOptions';
import { ModulesMap } from './modulesmap';
import { Rest } from './rest';

/**
 `BaseRest` is an export of the tree-shakable version of the SDK, and acts as the base class for the `BaseRest` class exported by the non tree-shakable version.

 It always includes the `Rest` module.
 */
export class BaseRest extends BaseClient {
  constructor(options: ClientOptions | string, modules: ModulesMap) {
    super(options, { Rest, ...modules });
  }
}
