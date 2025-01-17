import { MsgPack } from 'common/types/msgpack';
import * as API from '../../../../ably';
import { PresenceMessagePlugin } from '../client/modularplugins';
import { AnnotationsPlugin } from '../client/modularplugins';
import * as Utils from '../util/utils';
import ErrorInfo from './errorinfo';
import { WireMessage } from './message';
import PresenceMessage, { WirePresenceMessage } from './presencemessage';
import Annotation, { WireAnnotation } from './annotation';
import RealtimeAnnotations from '../client/realtimeannotations';
import RestAnnotations from '../client/restannotations';
import { flags, flagNames, channelModes, ActionName } from './protocolmessagecommon';
import type { Properties } from '../util/utils';

export const serialize = Utils.encodeBody;

function toStringArray(array?: any[]): string {
  const result = [];
  if (array) {
    for (let i = 0; i < array.length; i++) {
      result.push(array[i].toString());
    }
  }
  return '[ ' + result.join(', ') + ' ]';
}

export function deserialize(
  serialized: unknown,
  MsgPack: MsgPack | null,
  presenceMessagePlugin: PresenceMessagePlugin | null,
  annotationsPlugin: AnnotationsPlugin | null,
  format?: Utils.Format,
): ProtocolMessage {
  const deserialized = Utils.decodeBody<Record<string, unknown>>(serialized, MsgPack, format);
  return fromDeserialized(deserialized, presenceMessagePlugin, annotationsPlugin);
}

export function fromDeserialized(
  deserialized: Record<string, unknown>,
  presenceMessagePlugin: PresenceMessagePlugin | null,
  annotationsPlugin: AnnotationsPlugin | null,
): ProtocolMessage {
  let error: ErrorInfo | undefined;
  if (deserialized.error) {
    error = ErrorInfo.fromValues(deserialized.error as ErrorInfo);
  }

  let messages: WireMessage[] | undefined;
  if (deserialized.messages) {
    messages = WireMessage.fromValuesArray(deserialized.messages as Array<Properties<WireMessage>>);
  }

  let presence: WirePresenceMessage[] | undefined;
  if (presenceMessagePlugin && deserialized.presence) {
    presence = presenceMessagePlugin.WirePresenceMessage.fromValuesArray(
      deserialized.presence as Array<Properties<WirePresenceMessage>>,
    );
  }

  let annotations: WireAnnotation[] | undefined;
  if (annotationsPlugin && deserialized.annotations) {
    annotations = annotationsPlugin.WireAnnotation.fromValuesArray(
      deserialized.annotations as Array<Properties<WireAnnotation>>,
    );
  }

  return Object.assign(new ProtocolMessage(), { ...deserialized, presence, messages, annotations, error });
}

/**
 * Used by the tests.
 */
export function fromDeserializedIncludingDependencies(deserialized: Record<string, unknown>): ProtocolMessage {
  return fromDeserialized(
    deserialized,
    { PresenceMessage, WirePresenceMessage },
    { Annotation, WireAnnotation, RealtimeAnnotations, RestAnnotations },
  );
}

export function fromValues(values: Properties<ProtocolMessage>): ProtocolMessage {
  return Object.assign(new ProtocolMessage(), values);
}

export function stringify(
  msg: any,
  presenceMessagePlugin: PresenceMessagePlugin | null,
  annotationsPlugin: AnnotationsPlugin | null,
): string {
  let result = '[ProtocolMessage';
  if (msg.action !== undefined) result += '; action=' + ActionName[msg.action] || msg.action;

  const simpleAttributes = ['id', 'channel', 'channelSerial', 'connectionId', 'count', 'msgSerial', 'timestamp'];
  let attribute;
  for (let attribIndex = 0; attribIndex < simpleAttributes.length; attribIndex++) {
    attribute = simpleAttributes[attribIndex];
    if (msg[attribute] !== undefined) result += '; ' + attribute + '=' + msg[attribute];
  }

  if (msg.messages) result += '; messages=' + toStringArray(WireMessage.fromValuesArray(msg.messages));
  if (msg.presence && presenceMessagePlugin)
    result += '; presence=' + toStringArray(presenceMessagePlugin.WirePresenceMessage.fromValuesArray(msg.presence));
  if (msg.annotations && annotationsPlugin) {
    result += '; annotations=' + toStringArray(annotationsPlugin.WireAnnotation.fromValuesArray(msg.annotations));
  }
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
  messages?: WireMessage[];
  // This will be undefined if we skipped decoding this property due to user not requesting presence functionality — see `fromDeserialized`
  presence?: WirePresenceMessage[];
  annotations?: WireAnnotation[];
  auth?: unknown;
  connectionDetails?: Record<string, unknown>;
  params?: Record<string, string>;

  hasFlag = (flag: string): boolean => {
    return ((this.flags as number) & flags[flag]) > 0;
  };

  setFlag(flag: keyof typeof flags): number {
    return (this.flags = (this.flags as number) | flags[flag]);
  }

  getMode(): number {
    return (this.flags || 0) & flags.MODE_ALL;
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
