import { BaseRest } from './baserest';
import ClientOptions from '../../types/ClientOptions';
import { allCommonModularPlugins } from './modularplugins';
import Platform from 'common/platform';
import { DefaultMessage } from '../types/defaultmessage';
import { MsgPack } from 'common/types/msgpack';
import { DefaultPresenceMessage } from '../types/defaultpresencemessage';
import { Http } from 'common/types/http';
import Defaults from '../util/defaults';

/**
 `DefaultRest` is the class that the non tree-shakable version of the SDK exports as `Rest`. It ensures that this version of the SDK includes all of the functionality which is optionally available in the tree-shakable version.
 */
export class DefaultRest extends BaseRest {
  // The public typings declare that this requires an argument to be passed, but since we want to emit a good error message in the case where a non-TypeScript user does not pass an argument, tell the compiler that this is possible so that it forces us to handle it.
  constructor(options?: ClientOptions | string) {
    const MsgPack = DefaultRest._MsgPack;
    if (!MsgPack) {
      throw new Error('Expected DefaultRest._MsgPack to have been set');
    }

    super(
      Defaults.objectifyOptions(options, true, 'Rest', {
        ...allCommonModularPlugins,
        Crypto: DefaultRest.Crypto ?? undefined,
        MsgPack: DefaultRest._MsgPack ?? undefined,
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

  static _MsgPack: MsgPack | null = null;

  // Used by tests
  static _Http = Http;
}
