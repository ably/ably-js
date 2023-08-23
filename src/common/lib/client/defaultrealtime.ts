import BaseRealtime from './baserealtime';
import ClientOptions from '../../types/ClientOptions';
import { allCommonModules } from './modulesmap';
import * as Utils from '../util/utils';
import ConnectionManager from '../transport/connectionmanager';
import ProtocolMessage from '../types/protocolmessage';
import Platform from 'common/platform';
import { DefaultMessage } from '../types/defaultmessage';
import { MsgPack } from 'common/types/msgpack';
import RealtimePresence from './realtimepresence';
import { DefaultPresenceMessage } from '../types/defaultpresencemessage';
import initialiseWebSocketTransport from '../transport/websockettransport';

/**
 `DefaultRealtime` is the class that the non tree-shakable version of the SDK exports as `Realtime`. It ensures that this version of the SDK includes all of the functionality which is optionally available in the tree-shakable version.
 */
export class DefaultRealtime extends BaseRealtime {
  constructor(options: ClientOptions) {
    const MsgPack = DefaultRealtime._MsgPack;
    if (!MsgPack) {
      throw new Error('Expected DefaultRealtime._MsgPack to have been set');
    }

    super(options, {
      ...allCommonModules,
      Crypto: DefaultRealtime.Crypto ?? undefined,
      MsgPack,
      RealtimePresence,
      WebSocketTransport: initialiseWebSocketTransport,
    });
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
}
