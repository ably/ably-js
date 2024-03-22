import { MsgPack } from 'common/types/msgpack';
import * as API from '../../../../ably';
import { PresenceMessagePlugin } from '../client/modularplugins';
import * as Utils from '../util/utils';
import ErrorInfo from './errorinfo';
import Message, { fromValues as messageFromValues, fromValuesArray as messagesFromValuesArray } from './message';
import PresenceMessage, {
  fromValues as presenceMessageFromValues,
  fromValuesArray as presenceMessagesFromValuesArray,
} from './presencemessage';

export const actions = {
  HEARTBEAT: 0,
  ACK: 1,
  NACK: 2,
  CONNECT: 3,
  CONNECTED: 4,
  DISCONNECT: 5,
  DISCONNECTED: 6,
  CLOSE: 7,
  CLOSED: 8,
  ERROR: 9,
  ATTACH: 10,
  ATTACHED: 11,
  DETACH: 12,
  DETACHED: 13,
  PRESENCE: 14,
  MESSAGE: 15,
  SYNC: 16,
  AUTH: 17,
  ACTIVATE: 18,
};

export const ActionName: string[] = [];
Object.keys(actions).forEach(function (name) {
  ActionName[(actions as { [key: string]: number })[name]] = name;
});

const flags: { [key: string]: number } = {
  /* Channel attach state flags */
  HAS_PRESENCE: 1 << 0,
  HAS_BACKLOG: 1 << 1,
  RESUMED: 1 << 2,
  TRANSIENT: 1 << 4,
  ATTACH_RESUME: 1 << 5,
  /* Channel mode flags */
  PRESENCE: 1 << 16,
  PUBLISH: 1 << 17,
  SUBSCRIBE: 1 << 18,
  PRESENCE_SUBSCRIBE: 1 << 19,
};
const flagNames = Object.keys(flags);
flags.MODE_ALL = flags.PRESENCE | flags.PUBLISH | flags.SUBSCRIBE | flags.PRESENCE_SUBSCRIBE;

function toStringArray(array?: any[]): string {
  const result = [];
  if (array) {
    for (let i = 0; i < array.length; i++) {
      result.push(array[i].toString());
    }
  }
  return '[ ' + result.join(', ') + ' ]';
}

export const channelModes = ['PRESENCE', 'PUBLISH', 'SUBSCRIBE', 'PRESENCE_SUBSCRIBE'];

export const serialize = Utils.encodeBody;

export function deserialize(
  serialized: unknown,
  MsgPack: MsgPack | null,
  presenceMessagePlugin: PresenceMessagePlugin | null,
  format?: Utils.Format,
): ProtocolMessage {
  const deserialized = Utils.decodeBody<Record<string, unknown>>(serialized, MsgPack, format);
  return fromDeserialized(deserialized, presenceMessagePlugin);
}

export function fromDeserialized(
  deserialized: Record<string, unknown>,
  presenceMessagePlugin: PresenceMessagePlugin | null,
): ProtocolMessage {
  const error = deserialized.error;
  if (error) deserialized.error = ErrorInfo.fromValues(error as ErrorInfo);
  const messages = deserialized.messages as Message[];
  if (messages) for (let i = 0; i < messages.length; i++) messages[i] = messageFromValues(messages[i]);

  const presence = presenceMessagePlugin ? (deserialized.presence as PresenceMessage[]) : undefined;
  if (presenceMessagePlugin) {
    if (presence && presenceMessagePlugin)
      for (let i = 0; i < presence.length; i++)
        presence[i] = presenceMessagePlugin.presenceMessageFromValues(presence[i], true);
  }
  return Object.assign(new ProtocolMessage(), { ...deserialized, presence });
}

/**
 * Used by the tests.
 */
export function fromDeserializedIncludingDependencies(deserialized: Record<string, unknown>): ProtocolMessage {
  return fromDeserialized(deserialized, { presenceMessageFromValues, presenceMessagesFromValuesArray });
}

export function fromValues(values: unknown): ProtocolMessage {
  return Object.assign(new ProtocolMessage(), values);
}

export function stringify(msg: any, presenceMessagePlugin: PresenceMessagePlugin | null): string {
  let result = '[ProtocolMessage';
  if (msg.action !== undefined) result += '; action=' + ActionName[msg.action] || msg.action;

  const simpleAttributes = ['id', 'channel', 'channelSerial', 'connectionId', 'count', 'msgSerial', 'timestamp'];
  let attribute;
  for (let attribIndex = 0; attribIndex < simpleAttributes.length; attribIndex++) {
    attribute = simpleAttributes[attribIndex];
    if (msg[attribute] !== undefined) result += '; ' + attribute + '=' + msg[attribute];
  }

  if (msg.messages) result += '; messages=' + toStringArray(messagesFromValuesArray(msg.messages));
  if (msg.presence && presenceMessagePlugin)
    result += '; presence=' + toStringArray(presenceMessagePlugin.presenceMessagesFromValuesArray(msg.presence));
  if (msg.error) result += '; error=' + ErrorInfo.fromValues(msg.error).toString();
  if (msg.auth && msg.auth.accessToken) result += '; token=' + msg.auth.accessToken;
  if (msg.flags) result += '; flags=' + flagNames.filter(msg.hasFlag).join(',');
  if (msg.params) {
    let stringifiedParams = '';
    Utils.forInOwnNonNullProperties(msg.params, function (prop: string) {
      if (stringifiedParams.length > 0) {
        stringifiedParams += '; ';
      }
      stringifiedParams += prop + '=' + msg.params[prop];
    });
    if (stringifiedParams.length > 0) {
      result += '; params=[' + stringifiedParams + ']';
    }
  }
  result += ']';
  return result;
}

class ProtocolMessage {
  action?: number;
  flags?: number;
  id?: string;
  timestamp?: number;
  count?: number;
  error?: ErrorInfo;
  connectionId?: string;
  channel?: string;
  channelSerial?: string | null;
  msgSerial?: number;
  messages?: Message[];
  // This will be undefined if we skipped decoding this property due to user not requesting presence functionality — see `fromDeserialized`
  presence?: PresenceMessage[];
  auth?: unknown;
  connectionDetails?: Record<string, unknown>;

  hasFlag = (flag: string): boolean => {
    return ((this.flags as number) & flags[flag]) > 0;
  };

  setFlag(flag: API.ChannelMode): number {
    return (this.flags = (this.flags as number) | flags[flag]);
  }

  getMode(): number | undefined {
    return this.flags && this.flags & flags.MODE_ALL;
  }

  encodeModesToFlags(modes: API.ChannelMode[]): void {
    modes.forEach((mode) => this.setFlag(mode));
  }

  decodeModesFromFlags(): string[] | undefined {
    const modes: string[] = [];
    channelModes.forEach((mode) => {
      if (this.hasFlag(mode)) {
        modes.push(mode);
      }
    });
    return modes.length > 0 ? modes : undefined;
  }
}

export default ProtocolMessage;
