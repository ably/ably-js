import * as Utils from '../util/utils';
import Rest from './rest';
import EventEmitter from '../util/eventemitter';
import Logger from '../util/logger';
import Connection from './connection';
import RealtimeChannel from './realtimechannel';
import Defaults from '../util/defaults';
import ErrorInfo from '../types/errorinfo';
import ProtocolMessage from '../types/protocolmessage';
import { ChannelOptions } from '../../types/channel';
import { ErrCallback } from '../../types/utils';
import ClientOptions, { DeprecatedClientOptions } from '../../types/ClientOptions';
import * as API from '../../../ably';
import ConnectionManager from "../transport/connectionmanager";
import Platform from 'common/platform';
import Message from '../types/message';

class Realtime extends Rest {
  channels: any;
  connection: Connection;


  constructor(options: ClientOptions) {
    super(options);
    Logger.logAction(Logger.LOG_MINOR, 'Realtime()', '');
    this.connection = new Connection(this, this.options);
    this.channels = new Channels(this);
    if (options.autoConnect !== false) this.connect();
  }

  connect(): void {
    Logger.logAction(Logger.LOG_MINOR, 'Realtime.connect()', '');
    this.connection.connect();
  }

  close(): void {
    Logger.logAction(Logger.LOG_MINOR, 'Realtime.close()', '');
    this.connection.close();
  }

  static Promise = function (options: DeprecatedClientOptions): Realtime {
    options = Defaults.objectifyOptions(options);
    options.promises = true;
    return new Realtime(options);
  };

  static Callbacks = Realtime;
  static Utils = Utils;
  static ConnectionManager = ConnectionManager;
  static Platform = Platform;
  static ProtocolMessage = ProtocolMessage;
  static Message = Message;

}

class Channels extends EventEmitter {
  realtime: Realtime;
  all: Record<string, RealtimeChannel>;
  inProgress: Record<string, RealtimeChannel>;

  constructor(realtime: Realtime) {
    super();
    this.realtime = realtime;
    this.all = {};
    this.inProgress = {};
    realtime.connection.connectionManager.on('transport.active', () => {
      this.onTransportActive();
    });
  }

  onChannelMessage(msg: ProtocolMessage) {
    const channelName = msg.channel;
    if (channelName === undefined) {
      Logger.logAction(
        Logger.LOG_ERROR,
        'Channels.onChannelMessage()',
        'received event unspecified channel, action = ' + msg.action
      );
      return;
    }
    const channel = this.all[channelName];
    if (!channel) {
      Logger.logAction(
        Logger.LOG_ERROR,
        'Channels.onChannelMessage()',
        'received event for non-existent channel: ' + channelName
      );
      return;
    }
    channel.onMessage(msg);
  }

  /* called when a transport becomes connected; reattempt attach/detach
   * for channels that are attaching or detaching.
   * Note that this does not use inProgress as inProgress is only channels which have already made
   * at least one attempt to attach/detach */
  onTransportActive() {
    for (const channelName in this.all) {
      const channel = this.all[channelName];
      if (channel.state === 'attaching' || channel.state === 'detaching') {
        channel.checkPendingState();
      } else if (channel.state === 'suspended') {
        channel.attach();
      }
    }
  }

  reattach(reason: ErrorInfo) {
    for (const channelId in this.all) {
      const channel = this.all[channelId];
      /* NB this should not trigger for merely attaching channels, as they will
       * be reattached anyway through the onTransportActive checkPendingState */
      if (channel.state === 'attached') {
        channel.requestState('attaching', reason);
      }
    }
  }

  resetAttachedMsgIndicators() {
    for (const channelId in this.all) {
      const channel = this.all[channelId];
      if (channel.state === 'attached') {
        channel._attachedMsgIndicator = false;
      }
    }
  }

  checkAttachedMsgIndicators(connectionId: string) {
    for (const channelId in this.all) {
      const channel = this.all[channelId];
      if (channel.state === 'attached' && channel._attachedMsgIndicator === false) {
        const msg =
          '30s after a resume, found channel which has not received an attached; channelId = ' +
          channelId +
          '; connectionId = ' +
          connectionId;
        Logger.logAction(Logger.LOG_ERROR, 'Channels.checkAttachedMsgIndicators()', msg);
        channel.requestState('attaching');
      }
    }
  }

  /* Connection interruptions (ie when the connection will no longer queue
   * events) imply connection state changes for any channel which is either
   * attached, pending, or will attempt to become attached in the future */
  propogateConnectionInterruption(connectionState: string, reason: ErrorInfo) {
    const connectionStateToChannelState: Record<string, API.Types.ChannelState> = {
      closing: 'detached',
      closed: 'detached',
      failed: 'failed',
      suspended: 'suspended',
    };
    const fromChannelStates = ['attaching', 'attached', 'detaching', 'suspended'];
    const toChannelState = connectionStateToChannelState[connectionState];

    for (const channelId in this.all) {
      const channel = this.all[channelId];
      if (Utils.arrIn(fromChannelStates, channel.state)) {
        channel.notifyState(toChannelState, reason);
      }
    }
  }

  get(name: string, channelOptions: ChannelOptions) {
    name = String(name);
    let channel = this.all[name];
    if (!channel) {
      channel = this.all[name] = new RealtimeChannel(this.realtime, name, channelOptions);
    } else if (channelOptions) {
      if (channel._shouldReattachToSetOptions(channelOptions)) {
        throw new ErrorInfo(
          'Channels.get() cannot be used to set channel options that would cause the channel to reattach. Please, use RealtimeChannel.setOptions() instead.',
          40000,
          400
        );
      }
      channel.setOptions(channelOptions);
    }
    return channel;
  }

  /* Included to support certain niche use-cases; most users should ignore this.
   * Please do not use this unless you know what you're doing */
  release(name: string) {
    name = String(name);
    const channel = this.all[name];
    if (!channel) {
      return;
    }
    const releaseErr = channel.getReleaseErr();
    if (releaseErr) {
      throw releaseErr;
    }
    delete this.all[name];
    delete this.inProgress[name];
  }

  /* Records operations currently pending on a transport; used by connectionManager to decide when
   * it's safe to upgrade. Note that a channel might be in the attaching state without any pending
   * operations (eg if attached while the connection state is connecting) - such a channel must not
   * hold up an upgrade, so is not considered inProgress.
   * Operation is currently one of either 'statechange' or 'sync' */
  setInProgress(channel: RealtimeChannel, operation: string, inProgress: boolean) {
    this.inProgress[channel.name] = this.inProgress[channel.name] || {};
    (this.inProgress[channel.name] as any)[operation] = inProgress;
    if (!inProgress && this.hasNopending()) {
      this.emit('nopending');
    }
  }

  onceNopending(listener: ErrCallback) {
    if (this.hasNopending()) {
      listener();
      return;
    }
    this.once('nopending', listener);
  }

  hasNopending() {
    return Utils.arrEvery(
      Utils.valuesArray(this.inProgress, true) as any,
      function (operations: Record<string, unknown>) {
        return !Utils.containsValue(operations, true);
      }
    );
  }
}

export default Realtime;
