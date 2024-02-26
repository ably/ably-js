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
import { ModulesMap, RealtimePresenceModule } from './modulesmap';
import { TransportNames } from 'common/constants/TransportName';
import Platform, { TransportImplementations } from 'common/platform';
import { VcdiffDecoder } from '../types/message';
import ConsistentHash from 'consistent-hash';

/**
 `BaseRealtime` is an export of the tree-shakable version of the SDK, and acts as the base class for the `DefaultRealtime` class exported by the non tree-shakable version.
 */
class BaseRealtime extends BaseClient {
  readonly _RealtimePresence: RealtimePresenceModule | null;
  readonly _decodeVcdiff: VcdiffDecoder | null;
  // Extra transport implementations available to this client, in addition to those in Platform.Transports.bundledImplementations
  readonly _additionalTransportImplementations: TransportImplementations;
  _channels: Channels;
  connection: Connection;
  readonly _channelGroups: ChannelGroups | null;

  constructor(options: ClientOptions, modules: ModulesMap) {
    super(options, modules);
    Logger.logAction(Logger.LOG_MINOR, 'Realtime()', '');
    this._additionalTransportImplementations = BaseRealtime.transportImplementationsFromModules(modules);
    this._RealtimePresence = modules.RealtimePresence ?? null;
    this._decodeVcdiff = (modules.Vcdiff ?? (Platform.Vcdiff.supported && Platform.Vcdiff.bundledDecode)) || null;
    this.connection = new Connection(this, this.options);
    this._channels = new Channels(this);
    this._channelGroups = modules.ChannelGroups ? new modules.ChannelGroups(this._channels) : null;
    if (options.autoConnect !== false) this.connect();
  }

  private static transportImplementationsFromModules(modules: ModulesMap) {
    const transports: TransportImplementations = {};

    if (modules.WebSocketTransport) {
      transports[TransportNames.WebSocket] = modules.WebSocketTransport;
    }
    if (modules.XHRStreaming) {
      transports[TransportNames.XhrStreaming] = modules.XHRStreaming;
    }
    if (modules.XHRPolling) {
      transports[TransportNames.XhrPolling] = modules.XHRPolling;
    }

    return transports;
  }

  get channels() {
    return this._channels as any;
  }

  get channelGroups() {
    return this._channelGroups;
  }

  connect(): void {
    Logger.logAction(Logger.LOG_MINOR, 'Realtime.connect()', '');
    this.connection.connect();
  }

  close(): void {
    Logger.logAction(Logger.LOG_MINOR, 'Realtime.close()', '');
    this.connection.close();
  }
}

class ChannelGroups {
  groups: Record<string, ChannelGroup> = {};

  constructor(readonly channels: Channels) {}

  async get(filter: string, options?: API.ChannelGroupOptions): Promise<ChannelGroup> {
    let group = this.groups[filter];

    if (group) {
      return group;
    }

    group = this.groups[filter] = new ChannelGroup(this.channels, filter, options);
    await group.join();

    return group;
  }
}

class ConsumerGroup extends EventEmitter {
  private channel?: RealtimeChannel;
  private currentMembers: string[] = [];
  private hashring?: ConsistentHash;
  private myClientId?: string;

  constructor(readonly channels: Channels, readonly consumerGroupName?: string) {
    super();
  }

  async join() {
    if (!this.consumerGroupName) {
      // If no name is specified, then don't enforce the consumer group
      // this is the equivalent of a no-op group where every channel
      // is considered to be assigned to this client.
      return;
    }

    this.channel = this.channels.get(this.consumerGroupName, { params: { rewind: '1' } });
    this.myClientId = this.channels.realtime.options.clientId!;
    this.hashring = new ConsistentHash();
    this.hashring.add(this.myClientId);

    try {
      await this.channel.presence.enter(null);
      await this.channel!.presence!.subscribe(async () => {
        await this.computeMembership();
      });
    } catch (err) {
      Logger.logAction(
        Logger.LOG_ERROR,
        'ConsumerGroup.join()',
        'failed to enter presence set on consumer group channel:' + err
      );
    }
  }

  async computeMembership() {
    try {
      const result = await this.channel!.presence.get({ waitForSync: true });

      const memberIds = result?.filter((member) => member.clientId).map((member) => member.clientId!) || [];
      const { add, remove } = diffSets(this.currentMembers, memberIds);

      Logger.logAction(
        Logger.LOG_DEBUG,
        'ConsumerGroup.computeMembership()',
        'computed member diffs ' + { add, remove }
      );

      add.forEach((member) => {
        this.hashring!.add(member);
      });

      remove.forEach((member) => {
        this.hashring!.remove(member);
      });

      this.emit('membership');
    } catch (err) {
      Logger.logAction(
        Logger.LOG_ERROR,
        'ConsumerGroup.computeMembership()',
        'failed to get presence set on consumer group channel:' + err
      );
      return;
    }
  }

  assigned(channel: string): boolean {
    if (!this.consumerGroupName) {
      // Consumer group is not enabled, every channel
      // is considered assigned to this client
      return true;
    }
    return this.myClientId === this.hashring!.get(channel);
  }
}

class ChannelGroup {
  currentChannels: string[];
  active: RealtimeChannel;
  subsciptions: EventEmitter;
  subscribedChannels: Record<string, RealtimeChannel> = {};
  expression: RegExp;
  consumerGroup: ConsumerGroup;

  constructor(readonly channels: Channels, filter: string, options?: API.ChannelGroupOptions) {
    this.currentChannels = [];
    this.subsciptions = new EventEmitter();
    this.active = channels.get('active', { params: { rewind: '1' } });
    this.consumerGroup = new ConsumerGroup(channels, options?.consumerGroup?.name);
    this.consumerGroup.on('membership', () => this.updateActiveChannels(this.currentChannels));
    this.expression = new RegExp(filter);
  }

  async join() {
    await this.consumerGroup.join();
    this.active.subscribe((msg: any) => this.updateActiveChannels(msg.data.active));
  }

  private updateActiveChannels(activeChannels: string[]) {
    Logger.logAction(Logger.LOG_DEBUG, 'ChannelGroups.setActiveChannels', 'received active channels ' + activeChannels);

    const matched = activeChannels.filter((x) => this.expression.test(x)).filter((x) => this.consumerGroup.assigned(x));

    const { add, remove } = diffSets(this.currentChannels, matched);
    this.currentChannels = matched;

    Logger.logAction(Logger.LOG_DEBUG, 'ChannelGroups.setActiveChannels', 'computed channel diffs ' + { add, remove });

    this.removeSubscriptions(remove);
    this.addSubscrptions(add);
  }

  private addSubscrptions(channels: string[]) {
    channels.forEach((channel) => {
      if (this.subscribedChannels[channel]) {
        return;
      }

      this.subscribedChannels[channel] = this.channels.get(channel, { params: { rewind: '5s' } });
      this.subscribedChannels[channel].subscribe((msg: any) => {
        this.subsciptions.emit('message', channel, msg);
      });
    });
  }

  private removeSubscriptions(channels: string[]) {
    channels.forEach((channel) => {
      if (!this.subscribedChannels[channel]) {
        return;
      }

      this.subscribedChannels[channel].unsubscribe();
      delete this.subscribedChannels[channel];
    });
  }

  subscribe(cb: (channel: string, msg: any) => void) {
    this.subsciptions.on('message', cb);
  }
}

function diffSets(current: string[], updated: string[]): { add: string[]; remove: string[] } {
  const remove = current.filter((x) => !updated.includes(x));
  const add = updated.filter((x) => !current.includes(x));

  return { add, remove };
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
    const connectionStateToChannelState: Record<string, API.ChannelState> = {
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
      if (channel._shouldReattachToSetOptions(channelOptions, channel.channelOptions)) {
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

  getDerived(name: string, deriveOptions: API.DeriveOptions, channelOptions?: ChannelOptions) {
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
export { ChannelGroups };
