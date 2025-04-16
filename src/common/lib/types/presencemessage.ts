import Logger from '../util/logger';
import Platform from 'common/platform';
import {
  encode as encodeMessage,
  decode as decodeMessage,
  getMessagesSize,
  normalizeCipherOptions,
  encodeDataForWireProtocol,
} from './message';
import * as Utils from '../util/utils';
import * as API from '../../../../ably';

import type { IUntypedCryptoStatic } from 'common/types/ICryptoStatic';
import type { Properties } from '../util/utils';
import type RestChannel from '../client/restchannel';
import type RealtimeChannel from '../client/realtimechannel';
type Channel = RestChannel | RealtimeChannel;

const actions = ['absent', 'present', 'enter', 'leave', 'update'];

export type WireProtocolPresenceMessage = Omit<PresenceMessage, 'action'> & { action: number };

function toActionValue(actionString: string) {
  return actions.indexOf(actionString);
}

export async function fromEncoded(
  logger: Logger,
  Crypto: IUntypedCryptoStatic | null,
  encoded: WireProtocolPresenceMessage,
  inputOptions?: API.ChannelOptions,
): Promise<PresenceMessage> {
  const msg = fromWireProtocol(encoded);
  const options = normalizeCipherOptions(Crypto, logger, inputOptions ?? null);
  /* if decoding fails at any point, catch and return the message decoded to
   * the fullest extent possible */
  try {
    await decode(msg, options ?? {});
  } catch (e) {
    Logger.logAction(logger, Logger.LOG_ERROR, 'PresenceMessage.fromEncoded()', (e as Error).toString());
  }
  return msg;
}

export async function fromEncodedArray(
  logger: Logger,
  Crypto: IUntypedCryptoStatic | null,
  encodedArray: WireProtocolPresenceMessage[],
  options?: API.ChannelOptions,
): Promise<PresenceMessage[]> {
  return Promise.all(
    encodedArray.map(function (encoded) {
      return fromEncoded(logger, Crypto, encoded, options);
    }),
  );
}

// these forms of the functions are used internally when we have a channel instance
// already, so don't need to normalise channel options
export async function _fromEncoded(encoded: WireProtocolPresenceMessage, channel: Channel): Promise<PresenceMessage> {
  const msg = fromWireProtocol(encoded);
  try {
    await decode(msg, channel.channelOptions);
  } catch (e) {
    Logger.logAction(channel.logger, Logger.LOG_ERROR, 'PresenceMessage._fromEncoded()', (e as Error).toString());
  }
  return msg;
}

export async function _fromEncodedArray(
  encodedArray: WireProtocolPresenceMessage[],
  channel: Channel,
): Promise<PresenceMessage[]> {
  return Promise.all(
    encodedArray.map(function (encoded) {
      return _fromEncoded(encoded, channel);
    }),
  );
}

export function fromValues(values: Properties<PresenceMessage>): PresenceMessage {
  return Object.assign(new PresenceMessage(), values);
}

export function fromWireProtocol(values: WireProtocolPresenceMessage): PresenceMessage {
  const action = actions[values.action];
  return Object.assign(new PresenceMessage(), { ...values, action });
}

export { encodeMessage as encode };
export const decode = decodeMessage;

export function fromValuesArray(values: Properties<PresenceMessage>[]): PresenceMessage[] {
  return values.map(fromValues);
}

export function fromData(data: any): PresenceMessage {
  if (data instanceof PresenceMessage) {
    return data;
  }
  return fromValues({
    data,
  });
}

export { getMessagesSize };

class PresenceMessage {
  action?: string;
  id?: string;
  timestamp?: number;
  clientId?: string;
  connectionId?: string;
  data?: string | Buffer | Uint8Array;
  encoding?: string;
  extras?: any;
  size?: number;

  /* Returns whether this presenceMessage is synthesized, i.e. was not actually
   * sent by the connection (usually means a leave event sent 15s after a
   * disconnection). This is useful because synthesized messages cannot be
   * compared for newness by id lexicographically - RTP2b1
   */
  isSynthesized(): boolean {
    if (!this.id || !this.connectionId) {
      return true;
    }
    return this.id.substring(this.connectionId.length, 0) !== this.connectionId;
  }

  /* RTP2b2 */
  parseId(): { connectionId: string; msgSerial: number; index: number } {
    if (!this.id) throw new Error('parseId(): Presence message does not contain an id');
    const parts = this.id.split(':');
    return {
      connectionId: parts[0],
      msgSerial: parseInt(parts[1], 10),
      index: parseInt(parts[2], 10),
    };
  }

  /**
   * Overload toJSON() to intercept JSON.stringify().
   *
   * This will prepare the message to be transmitted over the wire to Ably.
   * It will encode the data payload according to the wire protocol used on the client.
   * It will transform any client-side enum string representations into their corresponding numbers, if needed (like "action" fields).
   */
  toJSON(): {
    id?: string;
    clientId?: string;
    action: number;
    data: string | Buffer | Uint8Array;
    encoding?: string;
    extras?: any;
  } {
    // we can infer the format used by client by inspecting with what arguments this method was called.
    // if JSON protocol is being used, the JSON.stringify() will be called and this toJSON() method will have a non-empty arguments list.
    // MSGPack protocol implementation also calls toJSON(), but with an empty arguments list.
    const format = arguments.length > 0 ? Utils.Format.json : Utils.Format.msgpack;
    const { data, encoding } = encodeDataForWireProtocol(this.data, this.encoding, format);

    return {
      id: this.id,
      clientId: this.clientId,
      /* Convert presence action back to an int for sending to Ably */
      action: toActionValue(this.action as string),
      data: data,
      encoding: encoding!,
      extras: this.extras,
    };
  }

  toString(): string {
    let result = '[PresenceMessage';
    result += '; action=' + this.action;
    if (this.id) result += '; id=' + this.id;
    if (this.timestamp) result += '; timestamp=' + this.timestamp;
    if (this.clientId) result += '; clientId=' + this.clientId;
    if (this.connectionId) result += '; connectionId=' + this.connectionId;
    if (this.encoding) result += '; encoding=' + this.encoding;
    if (this.data) {
      if (typeof this.data == 'string') result += '; data=' + this.data;
      else if (Platform.BufferUtils.isBuffer(this.data))
        result += '; data (buffer)=' + Platform.BufferUtils.base64Encode(this.data);
      else result += '; data (json)=' + JSON.stringify(this.data);
    }
    if (this.extras) {
      result += '; extras=' + JSON.stringify(this.extras);
    }
    result += ']';
    return result;
  }
}

export default PresenceMessage;
