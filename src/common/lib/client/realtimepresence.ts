import * as Utils from '../util/utils';
import EventEmitter from '../util/eventemitter';
import Logger from '../util/logger';
import PresenceMessage, { WirePresenceMessage } from '../types/presencemessage';
import type { CipherOptions } from '../types/basemessage';
import ErrorInfo, { PartialErrorInfo } from '../types/errorinfo';
import RealtimeChannel from './realtimechannel';
import Multicaster from '../util/multicaster';
import ChannelStateChange from './channelstatechange';
import { ErrCallback } from '../../types/utils';
import { PaginatedResult } from './paginatedresource';
import { PresenceMap, RealtimePresenceParams } from './presencemap';

interface RealtimeHistoryParams {
  start?: number;
  end?: number;
  direction?: string;
  limit?: number;
  untilAttach?: boolean;
  from_serial?: string | null;
}

function getClientId(realtimePresence: RealtimePresence) {
  return realtimePresence.channel.client.auth.clientId;
}

function isAnonymousOrWildcard(realtimePresence: RealtimePresence) {
  const realtime = realtimePresence.channel.client;
  /* If not currently connected, we can't assume that we're an anonymous
   * client, as realtime may inform us of our clientId in the CONNECTED
   * message. So assume we're not anonymous and leave it to realtime to
   * return an error if we are */
  const clientId = realtime.auth.clientId;
  return (!clientId || clientId === '*') && realtime.connection.state === 'connected';
}

/* Callback is called only in the event of an error */
function waitAttached(channel: RealtimeChannel, callback: ErrCallback, action: () => void) {
  switch (channel.state) {
    case 'attached':
    case 'suspended':
      action();
      break;
    case 'initialized':
    case 'detached':
    case 'detaching':
    case 'attaching':
      Utils.whenPromiseSettles(channel.attach(), function (err: Error | null) {
        if (err) callback(err);
        else action();
      });
      break;
    default:
      callback(ErrorInfo.fromValues(channel.invalidStateError()));
  }
}

class RealtimePresence extends EventEmitter {
  channel: RealtimeChannel;
  pendingPresence: { presence: WirePresenceMessage; callback: ErrCallback }[];
  syncComplete: boolean;
  members: PresenceMap;
  _myMembers: PresenceMap;
  subscriptions: EventEmitter;
  name?: string;

  constructor(channel: RealtimeChannel) {
    super(channel.logger);
    this.channel = channel;
    this.syncComplete = false;
    this.members = new PresenceMap(this, (item) => item.clientId + ':' + item.connectionId);
    // RTP17h: Store own members by clientId only.
    this._myMembers = new PresenceMap(this, (item) => item.clientId!);
    this.subscriptions = new EventEmitter(this.logger);
    this.pendingPresence = [];
  }

  async enter(data: unknown): Promise<void> {
    if (isAnonymousOrWildcard(this)) {
      throw new ErrorInfo('clientId must be specified to enter a presence channel', 40012, 400);
    }
    return this._enterOrUpdateClient(undefined, undefined, data, 'enter');
  }

  async update(data: unknown): Promise<void> {
    if (isAnonymousOrWildcard(this)) {
      throw new ErrorInfo('clientId must be specified to update presence data', 40012, 400);
    }
    return this._enterOrUpdateClient(undefined, undefined, data, 'update');
  }

  async enterClient(clientId: string, data: unknown): Promise<void> {
    return this._enterOrUpdateClient(undefined, clientId, data, 'enter');
  }

  async updateClient(clientId: string, data: unknown): Promise<void> {
    return this._enterOrUpdateClient(undefined, clientId, data, 'update');
  }

  async _enterOrUpdateClient(
    id: string | undefined,
    clientId: string | undefined,
    data: unknown,
    action: string,
  ): Promise<void> {
    const channel = this.channel;
    if (!channel.connectionManager.activeState()) {
      throw channel.connectionManager.getError();
    }

    Logger.logAction(
      this.logger,
      Logger.LOG_MICRO,
      'RealtimePresence.' + action + 'Client()',
      'channel = ' + channel.name + ', id = ' + id + ', client = ' + (clientId || '(implicit) ' + getClientId(this)),
    );

    const presence = PresenceMessage.fromData(data);
    presence.action = action;
    if (id) {
      presence.id = id;
    }
    if (clientId) {
      presence.clientId = clientId;
    }
    const wirePresMsg = await presence.encode(channel.channelOptions as CipherOptions);

    switch (channel.state) {
      case 'attached':
        return channel.sendPresence([wirePresMsg]);
      case 'initialized':
      case 'detached':
        channel.attach();
      // eslint-disable-next-line no-fallthrough
      case 'attaching':
        return new Promise((resolve, reject) => {
          this.pendingPresence.push({
            presence: wirePresMsg,
            callback: (err) => (err ? reject(err) : resolve()),
          });
        });
      default: {
        const err = new PartialErrorInfo(
          'Unable to ' + action + ' presence channel while in ' + channel.state + ' state',
          90001,
        );
        err.code = 90001;
        throw err;
      }
    }
  }

  async leave(data: unknown): Promise<void> {
    if (isAnonymousOrWildcard(this)) {
      throw new ErrorInfo('clientId must have been specified to enter or leave a presence channel', 40012, 400);
    }
    return this.leaveClient(undefined, data);
  }

  async leaveClient(clientId?: string, data?: unknown): Promise<void> {
    const channel = this.channel;
    if (!channel.connectionManager.activeState()) {
      throw channel.connectionManager.getError();
    }

    Logger.logAction(
      this.logger,
      Logger.LOG_MICRO,
      'RealtimePresence.leaveClient()',
      'leaving; channel = ' + this.channel.name + ', client = ' + clientId,
    );
    const presence = PresenceMessage.fromData(data);
    presence.action = 'leave';
    if (clientId) {
      presence.clientId = clientId;
    }
    const wirePresMsg = await presence.encode(channel.channelOptions as CipherOptions);

    switch (channel.state) {
      case 'attached':
        return channel.sendPresence([wirePresMsg]);
      case 'attaching':
        return new Promise((resolve, reject) => {
          this.pendingPresence.push({
            presence: wirePresMsg,
            callback: (err) => (err ? reject(err) : resolve()),
          });
        });
      case 'initialized':
      case 'failed': {
        /* we're not attached; therefore we let any entered status
         * timeout by itself instead of attaching just in order to leave */
        throw new PartialErrorInfo('Unable to leave presence channel (incompatible state)', 90001);
      }
      default:
        throw channel.invalidStateError();
    }
  }

  async get(params?: RealtimePresenceParams): Promise<PresenceMessage[]> {
    const waitForSync = !params || ('waitForSync' in params ? params.waitForSync : true);

    return new Promise((resolve, reject) => {
      function returnMembers(members: PresenceMap) {
        resolve(params ? members.list(params) : members.values());
      }

      /* Special-case the suspended state: can still get (stale) presence set if waitForSync is false */
      if (this.channel.state === 'suspended') {
        if (waitForSync) {
          reject(
            ErrorInfo.fromValues({
              statusCode: 400,
              code: 91005,
              message: 'Presence state is out of sync due to channel being in the SUSPENDED state',
            }),
          );
        } else {
          returnMembers(this.members);
        }
        return;
      }

      waitAttached(
        this.channel,
        (err) => reject(err),
        () => {
          const members = this.members;
          if (waitForSync) {
            members.waitSync(function () {
              returnMembers(members);
            });
          } else {
            returnMembers(members);
          }
        },
      );
    });
  }

  async history(params: RealtimeHistoryParams | null): Promise<PaginatedResult<PresenceMessage>> {
    Logger.logAction(this.logger, Logger.LOG_MICRO, 'RealtimePresence.history()', 'channel = ' + this.name);
    // We fetch this first so that any plugin-not-provided error takes priority over other errors
    const restMixin = this.channel.client.rest.presenceMixin;

    if (params && params.untilAttach) {
      if (this.channel.state === 'attached') {
        delete params.untilAttach;
        params.from_serial = this.channel.properties.attachSerial;
      } else {
        throw new ErrorInfo(
          'option untilAttach requires the channel to be attached, was: ' + this.channel.state,
          40000,
          400,
        );
      }
    }

    return restMixin.history(this, params);
  }

  setPresence(presenceSet: PresenceMessage[], isSync: boolean, syncChannelSerial?: string): void {
    Logger.logAction(
      this.logger,
      Logger.LOG_MICRO,
      'RealtimePresence.setPresence()',
      'received presence for ' + presenceSet.length + ' participants; syncChannelSerial = ' + syncChannelSerial,
    );
    let syncCursor, match;
    const members = this.members,
      myMembers = this._myMembers,
      broadcastMessages = [],
      connId = this.channel.connectionManager.connectionId;

    if (isSync) {
      this.members.startSync();
      if (syncChannelSerial && (match = syncChannelSerial.match(/^[\w-]+:(.*)$/))) {
        syncCursor = match[1];
      }
    }

    for (let presence of presenceSet) {
      switch (presence.action) {
        case 'leave':
          if (members.remove(presence)) {
            broadcastMessages.push(presence);
          }
          if (presence.connectionId === connId && !presence.isSynthesized()) {
            myMembers.remove(presence);
          }
          break;
        case 'enter':
        case 'present':
        case 'update':
          if (members.put(presence)) {
            broadcastMessages.push(presence);
          }
          if (presence.connectionId === connId) {
            myMembers.put(presence);
          }
          break;
      }
    }
    /* if this is the last (or only) message in a sequence of sync updates, end the sync */
    if (isSync && !syncCursor) {
      members.endSync();
      this.channel.syncChannelSerial = null;
    }

    /* broadcast to listeners */
    for (let i = 0; i < broadcastMessages.length; i++) {
      const presence = broadcastMessages[i];
      this.subscriptions.emit(presence.action!, presence);
    }
  }

  onAttached(hasPresence?: boolean): void {
    Logger.logAction(
      this.logger,
      Logger.LOG_MINOR,
      'RealtimePresence.onAttached()',
      'channel = ' + this.channel.name + ', hasPresence = ' + hasPresence,
    );

    if (hasPresence) {
      this.members.startSync();
    } else {
      this._synthesizeLeaves(this.members.values());
      this.members.clear();
    }

    // RTP17f: Re-enter own members when moving into the attached state.
    this._ensureMyMembersPresent();

    /* NB this must be after the _ensureMyMembersPresent call, which may add items to pendingPresence */
    const pendingPresence = this.pendingPresence,
      pendingPresCount = pendingPresence.length;

    if (pendingPresCount) {
      this.pendingPresence = [];
      const presenceArray = [];
      const multicaster = Multicaster.create(this.logger);
      Logger.logAction(
        this.logger,
        Logger.LOG_MICRO,
        'RealtimePresence.onAttached',
        'sending ' + pendingPresCount + ' queued presence messages',
      );
      for (let i = 0; i < pendingPresCount; i++) {
        const event = pendingPresence[i];
        presenceArray.push(event.presence);
        multicaster.push(event.callback);
      }
      this.channel
        .sendPresence(presenceArray)
        .then(() => multicaster())
        .catch((err: ErrorInfo) => multicaster(err));
    }
  }

  actOnChannelState(state: string, hasPresence?: boolean, err?: ErrorInfo | null): void {
    switch (state) {
      case 'attached':
        this.onAttached(hasPresence);
        break;
      case 'detached':
      case 'failed':
        this._clearMyMembers();
        this.members.clear();
      /* falls through */
      case 'suspended':
        this.failPendingPresence(err);
        break;
    }
  }

  failPendingPresence(err?: ErrorInfo | null): void {
    if (this.pendingPresence.length) {
      Logger.logAction(
        this.logger,
        Logger.LOG_MINOR,
        'RealtimeChannel.failPendingPresence',
        'channel; name = ' + this.channel.name + ', err = ' + Utils.inspectError(err),
      );
      for (let i = 0; i < this.pendingPresence.length; i++)
        try {
          this.pendingPresence[i].callback(err);
          // eslint-disable-next-line no-empty
        } catch (e) {}
      this.pendingPresence = [];
    }
  }

  _clearMyMembers(): void {
    this._myMembers.clear();
  }

  _ensureMyMembersPresent(): void {
    const myMembers = this._myMembers;
    const connId = this.channel.connectionManager.connectionId;

    for (const memberKey in myMembers.map) {
      const entry = myMembers.map[memberKey];
      Logger.logAction(
        this.logger,
        Logger.LOG_MICRO,
        'RealtimePresence._ensureMyMembersPresent()',
        'Auto-reentering clientId "' + entry.clientId + '" into the presence set',
      );
      // RTP17g: Send ENTER containing the member id, clientId and data
      // attributes.
      // RTP17g1: suppress id if the connId has changed
      const id = entry.connectionId === connId ? entry.id : undefined;
      this._enterOrUpdateClient(id, entry.clientId, entry.data, 'enter').catch((err) => {
        const wrappedErr = new ErrorInfo('Presence auto re-enter failed', 91004, 400, err);
        Logger.logAction(
          this.logger,
          Logger.LOG_ERROR,
          'RealtimePresence._ensureMyMembersPresent()',
          'Presence auto re-enter failed; reason = ' + Utils.inspectError(err),
        );
        const change = new ChannelStateChange(this.channel.state, this.channel.state, true, false, wrappedErr);
        this.channel.emit('update', change);
      });
    }
  }

  _synthesizeLeaves(items: PresenceMessage[]): void {
    const subscriptions = this.subscriptions;
    items.forEach(function (item) {
      const presence = PresenceMessage.fromValues({
        action: 'leave',
        connectionId: item.connectionId,
        clientId: item.clientId,
        data: item.data,
        encoding: item.encoding,
        timestamp: Date.now(),
      });
      subscriptions.emit('leave', presence);
    });
  }

  async subscribe(..._args: unknown[] /* [event], listener */): Promise<void> {
    const args = RealtimeChannel.processListenerArgs(_args);
    const event = args[0];
    const listener = args[1];
    const channel = this.channel;

    if (channel.state === 'failed') {
      throw ErrorInfo.fromValues(channel.invalidStateError());
    }

    this.subscriptions.on(event, listener);

    // (RTP6d)
    if (channel.channelOptions.attachOnSubscribe !== false) {
      await channel.attach();
    }
  }

  unsubscribe(..._args: unknown[] /* [event], listener */): void {
    const args = RealtimeChannel.processListenerArgs(_args);
    const event = args[0];
    const listener = args[1];
    this.subscriptions.off(event, listener);
  }
}

export default RealtimePresence;
