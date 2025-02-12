import EventEmitter from '../util/eventemitter';
import Logger from '../util/logger';
import Annotation from '../types/annotation';
import { actions, flags } from '../types/protocolmessagecommon';
import { fromValues as protocolMessageFromValues } from '../types/protocolmessage';
import ErrorInfo from '../types/errorinfo';
import RealtimeChannel from './realtimechannel';
import RestAnnotations, { RestGetAnnotationsParams } from './restannotations';
import type { PaginatedResult } from './paginatedresource';

class RealtimeAnnotations {
  private channel: RealtimeChannel;
  private logger: Logger;
  private subscriptions: EventEmitter;

  constructor(channel: RealtimeChannel) {
    this.channel = channel;
    this.logger = channel.logger;
    this.subscriptions = new EventEmitter(this.logger);
  }

  async publish(refSerial: string, refType: string, data: any): Promise<void> {
    const channelName = this.channel.name;
    const annotation = Annotation.fromValues({
      action: 'annotation.create',
      refSerial,
      refType,
      data,
    });

    const wireAnnotation = await annotation.encode();

    this.channel._throwIfUnpublishableState();

    Logger.logAction(
      this.logger,
      Logger.LOG_MICRO,
      'RealtimeAnnotations.publish()',
      'channelName = ' + channelName + ', sending annotation with refSerial = ' + refSerial + ', refType = ' + refType,
    );

    const pm = protocolMessageFromValues({
      action: actions.ANNOTATION,
      channel: channelName,
      annotations: [wireAnnotation],
    });
    return this.channel.sendMessage(pm);
  }

  async subscribe(..._args: unknown[] /* [refType], listener */): Promise<void> {
    const args = RealtimeChannel.processListenerArgs(_args);
    const event = args[0];
    const listener = args[1];
    const channel = this.channel;

    if (channel.state === 'failed') {
      throw ErrorInfo.fromValues(channel.invalidStateError());
    }

    await channel.attach();

    if ((this.channel._mode & flags.ANNOTATION_SUBSCRIBE) === 0) {
      throw new ErrorInfo(
        "You're trying to add an annotation listener, but you haven't requested the annotation_subscribe channel mode in ChannelOptions, so this won't do anything (we only deliver annotations to clients who have explicitly requested them)",
        93001,
        400,
      );
    }

    this.subscriptions.on(event, listener);
  }

  unsubscribe(..._args: unknown[] /* [event], listener */): void {
    const args = RealtimeChannel.processListenerArgs(_args);
    const event = args[0];
    const listener = args[1];
    this.subscriptions.off(event, listener);
  }

  _processIncoming(annotations: Annotation[]): void {
    for (const annotation of annotations) {
      this.subscriptions.emit(annotation.refType || '', annotation);
    }
  }

  async get(serial: string, params: RestGetAnnotationsParams | null): Promise<PaginatedResult<Annotation>> {
    return RestAnnotations.prototype.get.call(this, serial, params);
  }
}

export default RealtimeAnnotations;
