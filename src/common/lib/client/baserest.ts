import BaseClient from './baseclient';
import ClientOptions from '../../types/ClientOptions';
import { Rest } from './rest';
import Defaults from '../util/defaults';

/**
 `BaseRest` is an export of the tree-shakable version of the SDK, and acts as the base class for the `DefaultRest` class exported by the non tree-shakable version.

 It always includes the `Rest` plugin.
 */
export class BaseRest extends BaseClient {
  constructor(options: ClientOptions | string) {
    super(Defaults.objectifyOptions(options, { Rest }));
  }
}
