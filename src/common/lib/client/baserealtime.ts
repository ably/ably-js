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
import HashRing from '../util/hashring';

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
    // TODO(mschristensen): avoid using the same channel pool as that exposed via this.channels()
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

  get(filter: string, options?: API.ChannelGroupOptions): ChannelGroup {
    let group = this.groups[filter];
    if (group) {
      return group;
    }
    this.groups[filter] = new ChannelGroup(this.channels, filter, options);
    return this.groups[filter];
  }
}

class ConsumerGroup extends EventEmitter {
  consumerId: string;
  
  private channel?: RealtimeChannel;
  private currentMembers: string[] = [];
  private hashring: HashRing;

  constructor(readonly channels: Channels, readonly consumerGroupName?: string) {
    super();
    // The client ID can in fact be set on receipt of CONNECTED event from realtime,
    // but for these purposes we can rely on the client ID provided by the user.
    // If the client ID is not set, then we generate a random one.
    this.consumerId = this.channels.realtime.options.clientId || this.randomConsumerId();
    this.hashring = new HashRing([this.consumerId]);
  }

  private randomConsumerId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  async join() {
    if (!this.consumerGroupName) {
      // If no name is specified, then don't enforce the consumer group
      // this is the equivalent of a no-op group where every channel
      // is considered to be assigned to this client.
      return;
    }

    try {
      Logger.logAction(
        Logger.LOG_MAJOR,
        'ConsumerGroup.join()',
        'joining consumer group ' + this.consumerGroupName + ' as ' + this.consumerId
      );
      if (this.channel) {
        await this.computeMembership();
        return;
      }
      this.channel = this.channels.get(this.consumerGroupName);
      await this.channel.attach();
      await this.channel.presence.enter(null);
      await this.computeMembership();
      this.channel.presence.subscribe(() => this.computeMembership());
    } catch (err) {
      Logger.logAction(
        Logger.LOG_ERROR,
        'ConsumerGroup.join()',
        'failed to enter presence set on consumer group channel:' + err
      );
    }
  }

  async computeMembership() {
    if (!this.channel) {
      Logger.logAction(
        Logger.LOG_ERROR,
        'ConsumerGroup.computeMembership()',
        'compute membership called with no channel initialised'
      );
      return;
    }
    try {
      const result = await this.channel.presence.get({ waitForSync: true });

      const memberIds = result?.filter((member) => member.clientId).map((member) => member.clientId!) || [];
      const { add, remove } = diffSets(this.currentMembers, memberIds);

      Logger.logAction(
        Logger.LOG_DEBUG,
        'ConsumerGroup.computeMembership()',
        'computed member diffs add=' + add + ' remove=' + remove +
        ' consumerId=' + this.consumerId,
      );

      add.forEach((member) => {
        this.hashring.add(member);
      });

      remove.forEach((member) => {
        this.hashring.remove(member);
      });

      this.emit('membership');
    } catch (err) {
      Logger.logAction(
        Logger.LOG_ERROR,
        'ConsumerGroup.computeMembership()',
        'failed to get presence set on consumer group channel:' + err
      );
    }
  }

  assigned(channel: string): boolean {
    if (!this.consumerGroupName) {
      // Consumer group is not enabled, every channel
      // is considered assigned to this client
      return true;
    }
    return this.consumerId === this.hashring.get(channel);
  }
}

class ChannelGroup {
  activeChannels: string[] = [];
  assignedChannels: string[] = [];
  active: RealtimeChannel;
  subscriptions: EventEmitter;
  subscribedChannels: Record<string, RealtimeChannel> = {};
  expression: RegExp;
  consumerGroup: ConsumerGroup;

  constructor(readonly channels: Channels, filter: string, options?: API.ChannelGroupOptions) {
    this.subscriptions = new EventEmitter();
    this.active = channels.get(options?.activeChannel || '$ably:active', { params: { rewind: '1' } });
    this.consumerGroup = new ConsumerGroup(channels, options?.consumerGroup?.name);
    this.consumerGroup.on('membership', () => this.updateAssignedChannels());
    this.expression = new RegExp(filter); // eslint-disable-line security/detect-non-literal-regexp
  }

  async join() {
    await this.consumerGroup.join();
    await this.active.subscribe((msg: any) => {
      this.activeChannels = msg.data.active;
      this.updateAssignedChannels()
    });
  }

  private updateAssignedChannels() {
    Logger.logAction(
      Logger.LOG_DEBUG,
      'ChannelGroups.updateAssignedChannels',
      'activeChannels=' + this.activeChannels +
      ' assignedChannels=' + this.assignedChannels +
      ' consumerId=' + this.consumerGroup.consumerId,
    );
    
    const matched = this.activeChannels.filter((x) => this.expression.test(x)).filter((x) => this.consumerGroup.assigned(x));
    
    const { add, remove } = diffSets(this.assignedChannels, matched);
    this.assignedChannels = matched;

    Logger.logAction(
      Logger.LOG_MAJOR,
      'ChannelGroups.updateAssignedChannels',
      'computed channel diffs: add=' + add + ' remove=' + remove +
      ' consumerId=' + this.consumerGroup.consumerId,
    );

    this.removeSubscriptions(remove);
    this.addSubscriptions(add);
    Logger.logAction(
      Logger.LOG_MAJOR,
      'ChannelGroups.updateAssignedChannels',
      'assignedChannels=' + this.assignedChannels +
      ' consumerId=' + this.consumerGroup.consumerId,
    );
  }

  private addSubscriptions(channels: string[]) {
    channels.forEach((channel) => {
      if (this.subscribedChannels[channel]) {
        return;
      }

      this.subscribedChannels[channel] = this.channels.get(channel);
      this.subscribedChannels[channel]
        .setOptions({ params: { rewind: '5s' } })
        .then(() => {
          this.subscribedChannels[channel].subscribe((msg: any) => {
            this.subscriptions.emit('message', channel, msg);
          });
        })
        .catch((err) => {
          Logger.logAction(
            Logger.LOG_ERROR,
            'ChannelGroups.addSubscriptions()',
            'failed to set rewind options on channel ' + channel + ': ' + err
          );
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

  async subscribe(cb: (channel: string, msg: any) => void): Promise<void> {
    await this.join();
    this.subscriptions.on('message', cb);
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
      if (fromChannelStates.includes(channel.state)) {
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
