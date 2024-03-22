import BaseRealtime from './baserealtime';
import ClientOptions from '../../types/ClientOptions';
import { allCommonModularPlugins } from './modularplugins';
import * as Utils from '../util/utils';
import ConnectionManager from '../transport/connectionmanager';
import ProtocolMessage from '../types/protocolmessage';
import Platform from 'common/platform';
import { DefaultMessage } from '../types/defaultmessage';
import { MsgPack } from 'common/types/msgpack';
import RealtimePresence from './realtimepresence';
import { DefaultPresenceMessage } from '../types/defaultpresencemessage';
import WebSocketTransport from '../transport/websockettransport';
import { FilteredSubscriptions } from './filteredsubscriptions';
import {
  fromValues as presenceMessageFromValues,
  fromValuesArray as presenceMessagesFromValuesArray,
} from '../types/presencemessage';
import { Http } from 'common/types/http';
import Defaults from '../util/defaults';

/**
 `DefaultRealtime` is the class that the non tree-shakable version of the SDK exports as `Realtime`. It ensures that this version of the SDK includes all of the functionality which is optionally available in the tree-shakable version.
 */
export class DefaultRealtime extends BaseRealtime {
  // The public typings declare that this requires an argument to be passed, but since we want to emit a good error message in the case where a non-TypeScript user does not pass an argument, tell the compiler that this is possible so that it forces us to handle it.
  constructor(options?: ClientOptions | string) {
    const MsgPack = DefaultRealtime._MsgPack;
    if (!MsgPack) {
      throw new Error('Expected DefaultRealtime._MsgPack to have been set');
    }

    super(
      Defaults.objectifyOptions(options, true, 'Realtime', {
        ...allCommonModularPlugins,
        Crypto: DefaultRealtime.Crypto ?? undefined,
        MsgPack,
        RealtimePresence: {
          RealtimePresence,
          presenceMessageFromValues,
          presenceMessagesFromValuesArray,
        },
        WebSocketTransport,
        MessageInteractions: FilteredSubscriptions,
      }),
    );
  }

  static Utils = Utils;
  static ConnectionManager = ConnectionManager;
  static ProtocolMessage = ProtocolMessage;

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
