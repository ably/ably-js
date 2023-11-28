import RealtimeChannel from './realtimechannel';
import ProtocolMessage, { actions } from '../types/protocolmessage';
import * as Utils from '../util/utils';
import Logger from '../util/logger';
import Message, {
  fromValues as messageFromValues,
  fromValuesArray as messagesFromValuesArray,
  encodeArray as encodeMessagesArray,
  getMessagesSize,
  CipherOptions,
} from '../types/message';
import ErrorInfo from '../types/errorinfo';
import { ErrCallback } from '../../types/utils';
import { Acks } from './acks';

export class RealtimePublishing {
  static get Acks(): typeof Acks {
    return Acks;
  }

  static publish(channel: RealtimeChannel, ...args: any[]): void | Promise<void> {
    let messages = args[0];
    let argCount = args.length;
    let callback = args[argCount - 1];

    if (typeof callback !== 'function') {
      return Utils.promisify(this, 'publish', arguments);
    }
    if (!channel.connectionManager.activeState()) {
      callback(channel.connectionManager.getError());
      return;
    }
    if (argCount == 2) {
      if (Utils.isObject(messages)) messages = [messageFromValues(messages)];
      else if (Utils.isArray(messages)) messages = messagesFromValuesArray(messages);
      else
        throw new ErrorInfo(
          'The single-argument form of publish() expects a message object or an array of message objects',
          40013,
          400
        );
    } else {
      messages = [messageFromValues({ name: args[0], data: args[1] })];
    }
    const maxMessageSize = channel.client.options.maxMessageSize;
    encodeMessagesArray(messages, channel.channelOptions as CipherOptions, (err: Error | null) => {
      if (err) {
        callback(err);
        return;
      }
      /* RSL1i */
      const size = getMessagesSize(messages);
      if (size > maxMessageSize) {
        callback(
          new ErrorInfo(
            'Maximum size of messages that can be published at once exceeded ( was ' +
              size +
              ' bytes; limit is ' +
              maxMessageSize +
              ' bytes)',
            40009,
            400
          )
        );
        return;
      }
      this._publish(channel, messages, callback);
    });
  }

  static _publish(channel: RealtimeChannel, messages: Array<Message>, callback: ErrCallback) {
    Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.publish()', 'message count = ' + messages.length);
    const state = channel.state;
    switch (state) {
      case 'failed':
      case 'suspended':
        callback(ErrorInfo.fromValues(channel.invalidStateError()));
        break;
      default: {
        Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.publish()', 'sending message; channel state is ' + state);
        const msg = new ProtocolMessage();
        msg.action = actions.MESSAGE;
        msg.channel = channel.name;
        msg.messages = messages;
        channel.sendMessage(msg, callback);
        break;
      }
    }
  }
}
