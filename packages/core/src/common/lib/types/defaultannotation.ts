import * as API from '../../../../ably';
import Logger from '../util/logger';
import Annotation, { fromEncoded, fromEncodedArray, WireAnnotation } from './annotation';
import type { Properties } from '../util/utils';

/**
 `DefaultAnnotation` is the class that the non tree-shakable version of the library exports as `Annotation`, and that `DefaultPubSubHttpClient` and `DefaultPubSubRealtimeClient` also carry as their `Annotation` static property. It introduces the static methods that the public API declares on the `Annotation` class.
 */
export class DefaultAnnotation extends Annotation {
  static async fromEncoded(encoded: unknown, inputOptions?: API.ChannelOptions): Promise<Annotation> {
    return fromEncoded(Logger.defaultLogger, encoded as WireAnnotation, inputOptions);
  }

  static async fromEncodedArray(encodedArray: Array<unknown>, options?: API.ChannelOptions): Promise<Annotation[]> {
    return fromEncodedArray(Logger.defaultLogger, encodedArray as WireAnnotation[], options);
  }

  static fromValues(values: Properties<Annotation>): Annotation {
    return Annotation.fromValues(values);
  }
}
