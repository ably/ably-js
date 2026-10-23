import { BaseHttp } from './basehttp';
import ClientOptions from '../../types/ClientOptions';
import { allCommonModularPlugins } from './modularplugins';
import Platform from 'common/platform';
import { DefaultMessage } from '../types/defaultmessage';
import { MsgPack } from 'common/types/msgpack';
import { DefaultPresenceMessage } from '../types/defaultpresencemessage';
import { DefaultAnnotation } from '../types/defaultannotation';
import { HttpRequester } from 'common/types/http';
import RealtimeAnnotations from './realtimeannotations';
import HttpAnnotations from './httpannotations';
import Annotation, { WireAnnotation } from '../types/annotation';
import Defaults from '../util/defaults';
import Logger from '../util/logger';

/**
 `DefaultPubSubHttpClient` is the stateless HTTP client behind the per-side packages' HTTP factory. It is exported by the non tree-shakable version of the SDK under this name for those packages' use only, and is absent from the public typings. It ensures that this version of the SDK includes all of the functionality which is optionally available in the tree-shakable version.
 */
export class DefaultPubSubHttpClient extends BaseHttp {
  // The public typings declare that this requires an argument to be passed, but since we want to emit a good error message in the case where a non-TypeScript user does not pass an argument, tell the compiler that this is possible so that it forces us to handle it.
  constructor(options?: ClientOptions | string) {
    super(
      Defaults.objectifyOptions(options, true, 'Http', Logger.defaultLogger, {
        ...allCommonModularPlugins,
        Crypto: DefaultPubSubHttpClient.Crypto ?? undefined,
        // Unset in the web and React Native bundles of `@ably/pubsub-device`, which leave MessagePack
        // to the `MsgPack` plugin: a caller passing it in `plugins` overrides this, as with any other
        // plugin.
        MsgPack: DefaultPubSubHttpClient._MsgPack ?? undefined,
        Annotations: {
          Annotation,
          WireAnnotation,
          RealtimeAnnotations,
          HttpAnnotations,
        },
      }),
    );
  }

  private static _Crypto: typeof Platform.Crypto = null;
  static get Crypto() {
    if (this._Crypto === null) {
      throw new Error('Encryption not enabled; use ably.encryption.js instead');
    }

    return this._Crypto;
  }
  static set Crypto(newValue: typeof Platform.Crypto) {
    this._Crypto = newValue;
  }

  static Message = DefaultMessage;
  static PresenceMessage = DefaultPresenceMessage;
  static Annotation = DefaultAnnotation;

  // Set by the platform entry point, except in the web and React Native bundles of
  // `@ably/pubsub-device`, whose clients use JSON unless given the `MsgPack` plugin.
  static _MsgPack: MsgPack | null = null;

  // Used by tests
  static _HttpRequester = HttpRequester;
}
