import Logger from '../util/logger';
import Platform from 'common/platform';
import { encode as encodeMessage, decode as decodeMessage, getMessagesSize, CipherOptions } from './message';
import * as Utils from '../util/utils';
import * as API from '../../../../ably';
import { MsgPack } from 'common/types/msgpack';

const actions = ['absent', 'present', 'enter', 'leave', 'update'];

function toActionValue(actionString: string) {
  return actions.indexOf(actionString);
}

export async function fromEncoded(
  logger: Logger,
  encoded: unknown,
  options?: API.ChannelOptions,
): Promise<PresenceMessage> {
  const msg = fromValues(encoded as PresenceMessage | Record<string, unknown>, true);
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
  encodedArray: unknown[],
  options?: API.ChannelOptions,
): Promise<PresenceMessage[]> {
  return Promise.all(
    encodedArray.map(function (encoded) {
      return fromEncoded(logger, encoded, options);
    }),
  );
}

export function fromValues(
  values: PresenceMessage | Record<string, unknown>,
  stringifyAction?: boolean,
): PresenceMessage {
  if (stringifyAction) {
    values.action = actions[values.action as number];
  }
  return Object.assign(new PresenceMessage(), values);
}

export { encodeMessage as encode };
export const decode = decodeMessage;

export async function fromResponseBody(
  body: Record<string, unknown>[],
  options: CipherOptions,
  logger: Logger,
  MsgPack: MsgPack | null,
  format?: Utils.Format,
): Promise<PresenceMessage[]> {
  const messages: PresenceMessage[] = [];
  if (format) {
    body = Utils.decodeBody(body, MsgPack, format);
  }

  for (let i = 0; i < body.length; i++) {
    const msg = (messages[i] = fromValues(body[i], true));
    try {
      await decode(msg, options);
    } catch (e) {
      Logger.logAction(logger, Logger.LOG_ERROR, 'PresenceMessage.fromResponseBody()', (e as Error).toString());
    }
  }
  return messages;
}

export function fromValuesArray(values: unknown[]): PresenceMessage[] {
  const count = values.length,
    result = new Array(count);
  for (let i = 0; i < count; i++) result[i] = fromValues(values[i] as Record<string, unknown>);
  return result;
}

export function fromData(data: unknown): PresenceMessage {
  if (data instanceof PresenceMessage) {
    return data;
  }
  return fromValues({
    data,
  });
}

export { getMessagesSize };

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
}

export default PresenceMessage;
