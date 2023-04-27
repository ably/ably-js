import { Types } from '../../../../ably';
import * as Utils from '../util/utils';
import ErrorInfo from './errorinfo';
import Message from './message';
import PresenceMessage from './presencemessage';

const actions = {
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

const ActionName: string[] = [];
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

const simpleAttributes = 'id channel channelSerial connectionId count msgSerial timestamp'.split(' ');

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
  presence?: PresenceMessage[];
  auth?: unknown;
  connectionDetails?: Record<string, unknown>;

  static Action = actions;

  static channelModes = ['PRESENCE', 'PUBLISH', 'SUBSCRIBE', 'PRESENCE_SUBSCRIBE'];

  static ActionName = ActionName;

  hasFlag = (flag: string): boolean => {
    return ((this.flags as number) & flags[flag]) > 0;
  };

  setFlag(flag: Types.ChannelMode): number {
    return (this.flags = (this.flags as number) | flags[flag]);
  }

  getMode(): number | undefined {
    return this.flags && this.flags & flags.MODE_ALL;
  }

  encodeModesToFlags(modes: Types.ChannelMode[]): void {
    modes.forEach((mode) => this.setFlag(mode));
  }

  decodeModesFromFlags(): string[] | undefined {
    const modes: string[] = [];
    ProtocolMessage.channelModes.forEach((mode) => {
      if (this.hasFlag(mode)) {
        modes.push(mode);
      }
    });
    return modes.length > 0 ? modes : undefined;
  }

  static serialize = Utils.encodeBody;

  static deserialize = function (serialized: unknown, format?: Utils.Format): ProtocolMessage {
    const deserialized = Utils.decodeBody<Record<string, unknown>>(serialized, format);
    return ProtocolMessage.fromDeserialized(deserialized);
  };

  static fromDeserialized = function (deserialized: Record<string, unknown>): ProtocolMessage {
    const error = deserialized.error;
    if (error) deserialized.error = ErrorInfo.fromValues(error as ErrorInfo);
    const messages = deserialized.messages as Message[];
    if (messages) for (let i = 0; i < messages.length; i++) messages[i] = Message.fromValues(messages[i]);
    const presence = deserialized.presence as PresenceMessage[];
    if (presence) for (let i = 0; i < presence.length; i++) presence[i] = PresenceMessage.fromValues(presence[i], true);
    return Object.assign(new ProtocolMessage(), deserialized);
  };

  static fromValues(values: unknown): ProtocolMessage {
    return Object.assign(new ProtocolMessage(), values);
  }

  static stringify = function (msg: any): string {
    let result = '[ProtocolMessage';
    if (msg.action !== undefined) result += '; action=' + ProtocolMessage.ActionName[msg.action] || msg.action;

    let attribute;
    for (let attribIndex = 0; attribIndex < simpleAttributes.length; attribIndex++) {
      attribute = simpleAttributes[attribIndex];
      if (msg[attribute] !== undefined) result += '; ' + attribute + '=' + msg[attribute];
    }

    if (msg.messages) result += '; messages=' + toStringArray(Message.fromValuesArray(msg.messages));
    if (msg.presence) result += '; presence=' + toStringArray(PresenceMessage.fromValuesArray(msg.presence));
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
  };
}

export default ProtocolMessage;
