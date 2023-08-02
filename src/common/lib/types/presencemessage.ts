import Logger from '../util/logger';
import Platform from 'common/platform';
import Message, { CipherOptions } from './message';
import * as Utils from '../util/utils';
import * as API from '../../../../ably';

function toActionValue(actionString: string) {
  return PresenceMessage.Actions.indexOf(actionString);
}

class PresenceMessage {
  action?: string | number;
  id?: string;
  timestamp?: number;
  clientId?: string;
  connectionId?: string;
  data?: string | Buffer | Uint8Array;
  encoding?: string;
  extras?: any;
  size?: number;

  static Actions = ['absent', 'present', 'enter', 'leave', 'update'];

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
   * Overload toJSON() to intercept JSON.stringify()
   * @return {*}
   */
  toJSON(): {
    id?: string;
    clientId?: string;
    action: number;
    data: string | Buffer | Uint8Array;
    encoding?: string;
    extras?: any;
  } {
    /* encode data to base64 if present and we're returning real JSON;
     * although msgpack calls toJSON(), we know it is a stringify()
     * call if it has a non-empty arguments list */
    let data = this.data as string | Buffer | Uint8Array;
    let encoding = this.encoding;
    if (data && Platform.BufferUtils.isBuffer(data)) {
      if (arguments.length > 0) {
        /* stringify call */
        encoding = encoding ? encoding + '/base64' : 'base64';
        data = Platform.BufferUtils.base64Encode(data);
      } else {
        /* Called by msgpack. toBuffer returns a datatype understandable by
         * that platform's msgpack implementation (Buffer in node, Uint8Array
         * in browsers) */
        data = Platform.BufferUtils.toBuffer(data);
      }
    }
    return {
      id: this.id,
      clientId: this.clientId,
      /* Convert presence action back to an int for sending to Ably */
      action: toActionValue(this.action as string),
      data: data,
      encoding: encoding,
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

  static encode = Message.encode;
  static decode = Message.decode;

  static fromResponseBody(
    body: Record<string, unknown>[],
    options: CipherOptions,
    format?: Utils.Format
  ): PresenceMessage[] {
    const messages: PresenceMessage[] = [];
    if (format) {
      body = Utils.decodeBody(body, format);
    }

    for (let i = 0; i < body.length; i++) {
      const msg = (messages[i] = PresenceMessage.fromValues(body[i], true));
      try {
        PresenceMessage.decode(msg, options);
      } catch (e) {
        Logger.logAction(Logger.LOG_ERROR, 'PresenceMessage.fromResponseBody()', (e as Error).toString());
      }
    }
    return messages;
  }

  static fromValues(values: PresenceMessage | Record<string, unknown>, stringifyAction?: boolean): PresenceMessage {
    if (stringifyAction) {
      values.action = PresenceMessage.Actions[values.action as number];
    }
    return Object.assign(new PresenceMessage(), values);
  }

  static fromValuesArray(values: unknown[]): PresenceMessage[] {
    const count = values.length,
      result = new Array(count);
    for (let i = 0; i < count; i++) result[i] = PresenceMessage.fromValues(values[i] as Record<string, unknown>);
    return result;
  }

  static fromEncoded(encoded: unknown, options?: API.Types.ChannelOptions): PresenceMessage {
    const msg = PresenceMessage.fromValues(encoded as PresenceMessage | Record<string, unknown>, true);
    /* if decoding fails at any point, catch and return the message decoded to
     * the fullest extent possible */
    try {
      PresenceMessage.decode(msg, options ?? {});
    } catch (e) {
      Logger.logAction(Logger.LOG_ERROR, 'PresenceMessage.fromEncoded()', (e as Error).toString());
    }
    return msg;
  }

  static fromEncodedArray(encodedArray: unknown[], options?: API.Types.ChannelOptions): PresenceMessage[] {
    return encodedArray.map(function (encoded) {
      return PresenceMessage.fromEncoded(encoded, options);
    });
  }

  static fromData(data: unknown): PresenceMessage {
    if (data instanceof PresenceMessage) {
      return data;
    }
    return PresenceMessage.fromValues({
      data,
    });
  }

  static getMessagesSize = Message.getMessagesSize;
}

export default PresenceMessage;
