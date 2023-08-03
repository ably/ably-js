import * as Utils from '../util/utils';
import BaseClient from './baseclient';
import EventEmitter from '../util/eventemitter';
import Logger from '../util/logger';
import Connection from './connection';
import RealtimeChannel from './realtimechannel';
import ErrorInfo from '../types/errorinfo';
import ProtocolMessage from '../types/protocolmessage';
import { ChannelOptions } from '../../types/channel';
import ClientOptions from '../../types/ClientOptions';
import * as API from '../../../../ably';
import ConnectionManager from '../transport/connectionmanager';
import { ModulesMap } from './modulesmap';

/**
 `BaseRealtime` is an export of the tree-shakable version of the SDK, and acts as the base class for the `BaseRealtime` class exported by the non tree-shakable version.
 */
class BaseRealtime extends BaseClient {
  _channels: any;
  connection: Connection;

  constructor(options: ClientOptions, modules: ModulesMap) {
    super(options, modules);
    Logger.logAction(Logger.LOG_MINOR, 'Realtime()', '');
    this.connection = new Connection(this, this.options);
    this._channels = new Channels(this);
    if (options.autoConnect !== false) this.connect();
  }

  get channels() {
    return this._channels;
  }

  connect(): void {
    Logger.logAction(Logger.LOG_MINOR, 'Realtime.connect()', '');
    this.connection.connect();
  }

  close(): void {
    Logger.logAction(Logger.LOG_MINOR, 'Realtime.close()', '');
    this.connection.close();
  }

  static Utils = Utils;
  static ConnectionManager = ConnectionManager;
  static ProtocolMessage = ProtocolMessage;
}

class Channels extends EventEmitter {
  realtime: BaseRealtime;
  all: Record<string, RealtimeChannel>;

  constructor(realtime: BaseRealtime) {
    super();
    this.realtime = realtime;
    this.all = Object.create(null);
    realtime.connection.connectionManager.on('transport.active', () => {
      this.onTransportActive();
    });
  }

  channelSerials(): { [name: string]: string } {
    let serials: { [name: string]: string } = {};
    for (const name of Utils.keysArray(this.all, true)) {
      const channel = this.all[name];
      if (channel.properties.channelSerial) {
        serials[name] = channel.properties.channelSerial;
      }
    }
    return serials;
  }

  // recoverChannels gets the given channels and sets their channel serials.
  recoverChannels(channelSerials: { [name: string]: string }) {
    for (const name of Utils.keysArray(channelSerials, true)) {
      const channel = this.get(name);
      channel.properties.channelSerial = channelSerials[name];
    }
  }

  // Access to this method is synchronised by ConnectionManager#processChannelMessage.
  async processChannelMessage(msg: ProtocolMessage) {
    const channelName = msg.channel;
    if (channelName === undefined) {
      Logger.logAction(
        Logger.LOG_ERROR,
        'Channels.processChannelMessage()',
        'received event unspecified channel, action = ' + msg.action
      );
      return;
    }
    const channel = this.all[channelName];
    if (!channel) {
      Logger.logAction(
        Logger.LOG_ERROR,
        'Channels.processChannelMessage()',
        'received event for non-existent channel: ' + channelName
      );
      return;
    }
    await channel.processMessage(msg);
  }

  /* called when a transport becomes connected; reattempt attach/detach
   * for channels that are attaching or detaching. */
  onTransportActive() {
    for (const channelName in this.all) {
      const channel = this.all[channelName];
      if (channel.state === 'attaching' || channel.state === 'detaching') {
        channel.checkPendingState();
      } else if (channel.state === 'suspended') {
        channel._attach(false, null);
      } else if (channel.state === 'attached') {
        // Note explicity request the state, channel.attach() would do nothing
        // as its already attached.
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

  get(name: string, channelOptions?: ChannelOptions) {
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

  getDerived(name: string, deriveOptions: API.Types.DeriveOptions, channelOptions?: ChannelOptions) {
    if (deriveOptions.filter) {
      const filter = Utils.toBase64(deriveOptions.filter);
      const match = Utils.matchDerivedChannel(name);
      name = `[filter=${filter}${match.qualifierParam}]${match.channelName}`;
    }
    return this.get(name, channelOptions);
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
  }
}

export default BaseRealtime;
