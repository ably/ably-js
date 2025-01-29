import * as API from '../../../../ably';
import Logger from '../util/logger';
import Annotation, { fromEncoded, fromEncodedArray, WireAnnotation } from './annotation';
import Platform from 'common/platform';
import type { Properties } from '../util/utils';

/**
 `DefaultAnnotation` is the class returned by `DefaultRest` and `DefaultRealtime`’s `Annotation` static property. It introduces the static methods described in the `AnnotationStatic` interface of the public API of the non tree-shakable version of the library.
 */
export class DefaultAnnotation extends Annotation {
  static async fromEncoded(encoded: unknown, inputOptions?: API.ChannelOptions): Promise<Annotation> {
    return fromEncoded(Logger.defaultLogger, Platform.Crypto, encoded as WireAnnotation, inputOptions);
  }

  static async fromEncodedArray(encodedArray: Array<unknown>, options?: API.ChannelOptions): Promise<Annotation[]> {
    return fromEncodedArray(Logger.defaultLogger, Platform.Crypto, encodedArray as WireAnnotation[], options);
  }

  static fromValues(values: Properties<Annotation>): Annotation {
    return Annotation.fromValues(values);
  }
}
