import EventEmitter from '../util/eventemitter';
import Logger from '../util/logger';
import Annotation from '../types/annotation';
import { actions, flags } from '../types/protocolmessagecommon';
import { fromValues as protocolMessageFromValues } from '../types/protocolmessage';
import ErrorInfo from '../types/errorinfo';
import RealtimeChannel from './realtimechannel';
import RestAnnotations, { RestGetAnnotationsParams, constructValidateAnnotation } from './restannotations';
import type { PaginatedResult } from './paginatedresource';
import type Message from '../types/message';
import type { Properties } from '../util/utils';

class RealtimeAnnotations {
  private channel: RealtimeChannel;
  private logger: Logger;
  private subscriptions: EventEmitter;

  constructor(channel: RealtimeChannel) {
    this.channel = channel;
    this.logger = channel.logger;
    this.subscriptions = new EventEmitter(this.logger);
  }

  async publish(msgOrSerial: string | Message, annotationValues: Partial<Properties<Annotation>>): Promise<void> {
    const channelName = this.channel.name;
    const annotation = constructValidateAnnotation(msgOrSerial, annotationValues);
    const wireAnnotation = await annotation.encode();

    this.channel.throwIfUnpublishableState();

    Logger.logAction(
      this.logger,
      Logger.LOG_MICRO,
      'RealtimeAnnotations.publish()',
      'channelName = ' +
        channelName +
        ', sending annotation with messageSerial = ' +
        annotation.messageSerial +
        ', type = ' +
        annotation.type,
    );

    const pm = protocolMessageFromValues({
      action: actions.ANNOTATION,
      channel: channelName,
      annotations: [wireAnnotation],
    });
    await this.channel.sendAndAwaitAck(pm);
  }

  async delete(msgOrSerial: string | Message, annotationValues: Partial<Properties<Annotation>>): Promise<void> {
    annotationValues.action = 'annotation.delete';
    await this.publish(msgOrSerial, annotationValues);
  }

  async subscribe(..._args: unknown[] /* [type], listener */): Promise<void> {
    const args = RealtimeChannel.processListenerArgs(_args);
    const event = args[0];
    const listener = args[1];
    const channel = this.channel;

    if (channel.state === 'failed') {
      throw ErrorInfo.fromValues(channel.invalidStateError());
    }

    this.subscriptions.on(event, listener);

    if (this.channel.channelOptions.attachOnSubscribe !== false) {
      await channel.attach();
    }

    // explicit check for attach state in case attachOnSubscribe=false
    if (this.channel.state === 'attached' && (this.channel._mode & flags.ANNOTATION_SUBSCRIBE) === 0) {
      const err = new ErrorInfo({
        message:
          "You are trying to add an annotation listener, but you haven't requested the annotation_subscribe channel mode in ChannelOptions, so this won't do anything (we only deliver annotations to clients who have explicitly requested them)",
        code: 93001,
        statusCode: 400,
        hint: 'Enable the mode on the channel with channel.setOptions({ modes: ["subscribe", "annotation_subscribe"] }), which re-attaches with the new mode (calling channels.get(name, { modes }) on an existing channel throws, and appending to channel.modes does not enable it server-side). If the re-attach is rejected by the server, confirm the channel namespace has "Message annotations, updates, appends, and deletes" enabled in the Ably dashboard and that your API key has annotation-subscribe capability on this channel. If you have the Ably CLI installed, `ably apps rules list` shows which namespaces have it enabled and `ably auth keys list` shows the capabilities of your key.',
      });
      Logger.logActionNoStrip(
        this.logger,
        Logger.LOG_MAJOR,
        'RealtimeAnnotations.subscribe()',
        err.message + '; hint=' + err.hint,
      );
      // The call is about to throw, so undo the listener registration above to avoid leaking a handler.
      this.subscriptions.off(event, listener);
      throw err;
    }
  }

  unsubscribe(..._args: unknown[] /* [event], listener */): void {
    const args = RealtimeChannel.processListenerArgs(_args);
    const event = args[0];
    const listener = args[1];
    this.subscriptions.off(event, listener);
  }

  _processIncoming(annotations: Annotation[]): void {
    for (const annotation of annotations) {
      this.subscriptions.emit(annotation.type || '', annotation);
    }
  }

  async get(
    msgOrSerial: string | Message,
    params: RestGetAnnotationsParams | null,
  ): Promise<PaginatedResult<Annotation>> {
    return RestAnnotations.prototype.get.call(this, msgOrSerial, params);
  }
}

export default RealtimeAnnotations;
