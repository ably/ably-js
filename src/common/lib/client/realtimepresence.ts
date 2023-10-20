import * as Utils from '../util/utils';
import Presence from './presence';
import EventEmitter from '../util/eventemitter';
import Logger from '../util/logger';
import PresenceMessage from '../types/presencemessage';
import ErrorInfo, { IPartialErrorInfo, PartialErrorInfo } from '../types/errorinfo';
import RealtimeChannel from './realtimechannel';
import Multicaster from '../util/multicaster';
import ChannelStateChange from './channelstatechange';
import { CipherOptions } from '../types/message';
import { ErrCallback, PaginatedResultCallback, StandardCallback } from '../../types/utils';
import { PaginatedResult } from './paginatedresource';

interface RealtimePresenceParams {
  waitForSync?: boolean;
  clientId?: string;
  connectionId?: string;
}

interface RealtimeHistoryParams {
  start?: number;
  end?: number;
  direction?: string;
  limit?: number;
  untilAttach?: boolean;
  from_serial?: string | null;
}

const noop = function () {};

function getClientId(realtimePresence: RealtimePresence) {
  return realtimePresence.channel.realtime.auth.clientId;
}

function isAnonymousOrWildcard(realtimePresence: RealtimePresence) {
  const realtime = realtimePresence.channel.realtime;
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
      channel.attach(function (err: Error) {
        if (err) callback(err);
        else action();
      });
      break;
    default:
      callback(ErrorInfo.fromValues(channel.invalidStateError()));
  }
}

function newerThan(item: PresenceMessage, existing: PresenceMessage) {
  /* RTP2b1: if either is synthesised, compare by timestamp */
  if (item.isSynthesized() || existing.isSynthesized()) {
    // RTP2b1a: if equal, prefer the newly-arrived one
    return (item.timestamp as number) >= (existing.timestamp as number);
  }

  /* RTP2b2 */
  const itemOrderings = item.parseId(),
    existingOrderings = existing.parseId();
  if (itemOrderings.msgSerial === existingOrderings.msgSerial) {
    return itemOrderings.index > existingOrderings.index;
  } else {
    return itemOrderings.msgSerial > existingOrderings.msgSerial;
  }
}

class RealtimePresence extends Presence {
  channel: RealtimeChannel;
  pendingPresence: { presence: PresenceMessage; callback: ErrCallback }[];
  syncComplete: boolean;
  members: PresenceMap;
  _myMembers: PresenceMap;
  subscriptions: EventEmitter;
  name?: string;

  constructor(channel: RealtimeChannel) {
    super(channel);
    this.channel = channel;
    this.syncComplete = false;
    this.members = new PresenceMap(this, (item) => item.clientId + ':' + item.connectionId);
    // RTP17h: Store own members by clientId only.
    this._myMembers = new PresenceMap(this, (item) => item.clientId!);
    this.subscriptions = new EventEmitter();
    this.pendingPresence = [];
  }

  enter(data: unknown, callback: ErrCallback): void | Promise<void> {
    if (isAnonymousOrWildcard(this)) {
      throw new ErrorInfo('clientId must be specified to enter a presence channel', 40012, 400);
    }
    return this._enterOrUpdateClient(undefined, undefined, data, 'enter', callback);
  }

  update(data: unknown, callback: ErrCallback): void | Promise<void> {
    if (isAnonymousOrWildcard(this)) {
      throw new ErrorInfo('clientId must be specified to update presence data', 40012, 400);
    }
    return this._enterOrUpdateClient(undefined, undefined, data, 'update', callback);
  }

  enterClient(clientId: string, data: unknown, callback: ErrCallback): void | Promise<void> {
    return this._enterOrUpdateClient(undefined, clientId, data, 'enter', callback);
  }

  updateClient(clientId: string, data: unknown, callback: ErrCallback): void | Promise<void> {
    return this._enterOrUpdateClient(undefined, clientId, data, 'update', callback);
  }

  _enterOrUpdateClient(
    id: string | undefined,
    clientId: string | undefined,
    data: unknown,
    action: string,
    callback: ErrCallback
  ): void | Promise<void> {
    if (!callback) {
      if (typeof data === 'function') {
        callback = data as ErrCallback;
        data = null;
      } else {
        if (this.channel.realtime.options.promises) {
          return Utils.promisify(this, '_enterOrUpdateClient', [id, clientId, data, action]);
        }
        callback = noop;
      }
    }

    const channel = this.channel;
    if (!channel.connectionManager.activeState()) {
      callback(channel.connectionManager.getError());
      return;
    }

    Logger.logAction(
      Logger.LOG_MICRO,
      'RealtimePresence.' + action + 'Client()',
      'channel = ' + channel.name + ', id = ' + id + ', client = ' + (clientId || '(implicit) ' + getClientId(this))
    );

    const presence = PresenceMessage.fromData(data);
    presence.action = action;
    if (id) {
      presence.id = id;
    }
    if (clientId) {
      presence.clientId = clientId;
    }

    PresenceMessage.encode(presence, channel.channelOptions as CipherOptions, (err: IPartialErrorInfo) => {
      if (err) {
        callback(err);
        return;
      }
      switch (channel.state) {
        case 'attached':
          channel.sendPresence(presence, callback);
          break;
        case 'initialized':
        case 'detached':
          channel.attach();
        // eslint-disable-next-line no-fallthrough
        case 'attaching':
          this.pendingPresence.push({
            presence: presence,
            callback: callback,
          });
          break;
        default:
          err = new PartialErrorInfo(
            'Unable to ' + action + ' presence channel while in ' + channel.state + ' state',
            90001
          );
          err.code = 90001;
          callback(err);
      }
    });
  }

  leave(data: unknown, callback: ErrCallback): void | Promise<void> {
    if (isAnonymousOrWildcard(this)) {
      throw new ErrorInfo('clientId must have been specified to enter or leave a presence channel', 40012, 400);
    }
    return this.leaveClient(undefined, data, callback);
  }

  leaveClient(clientId?: string, data?: unknown, callback?: ErrCallback): void | Promise<void> {
    if (!callback) {
      if (typeof data === 'function') {
        callback = data as ErrCallback;
        data = null;
      } else {
        if (this.channel.realtime.options.promises) {
          return Utils.promisify(this, 'leaveClient', [clientId, data]);
        }
        callback = noop;
      }
    }

    const channel = this.channel;
    if (!channel.connectionManager.activeState()) {
      callback?.(channel.connectionManager.getError());
      return;
    }

    Logger.logAction(
      Logger.LOG_MICRO,
      'RealtimePresence.leaveClient()',
      'leaving; channel = ' + this.channel.name + ', client = ' + clientId
    );
    const presence = PresenceMessage.fromData(data);
    presence.action = 'leave';
    if (clientId) {
      presence.clientId = clientId;
    }

    switch (channel.state) {
      case 'attached':
        channel.sendPresence(presence, callback);
        break;
      case 'attaching':
        this.pendingPresence.push({
          presence: presence,
          callback: callback,
        });
        break;
      case 'initialized':
      case 'failed': {
        /* we're not attached; therefore we let any entered status
         * timeout by itself instead of attaching just in order to leave */
        const err = new PartialErrorInfo('Unable to leave presence channel (incompatible state)', 90001);
        callback?.(err);
        break;
      }
      default:
        callback?.(channel.invalidStateError());
    }
  }

  // Return type is any to avoid conflict with base Presence class
  get(this: RealtimePresence, params: RealtimePresenceParams, callback: StandardCallback<PresenceMessage[]>): any {
    const args = Array.prototype.slice.call(arguments);
    if (args.length == 1 && typeof args[0] == 'function') args.unshift(null);

    params = args[0] as RealtimePresenceParams;
    callback = args[1] as StandardCallback<PresenceMessage[]>;
    const waitForSync = !params || ('waitForSync' in params ? params.waitForSync : true);

    if (!callback) {
      if (this.channel.realtime.options.promises) {
        return Utils.promisify(this, 'get', args);
      }
      callback = noop;
    }

    function returnMembers(members: PresenceMap) {
      callback(null, params ? members.list(params) : members.values());
    }

    /* Special-case the suspended state: can still get (stale) presence set if waitForSync is false */
    if (this.channel.state === 'suspended') {
      if (waitForSync) {
        callback(
          ErrorInfo.fromValues({
            statusCode: 400,
            code: 91005,
            message: 'Presence state is out of sync due to channel being in the SUSPENDED state',
          })
        );
      } else {
        returnMembers(this.members);
      }
      return;
    }

    waitAttached(this.channel, callback, () => {
      const members = this.members;
      if (waitForSync) {
        members.waitSync(function () {
          returnMembers(members);
        });
      } else {
        returnMembers(members);
      }
    });
  }

  history(
    params: RealtimeHistoryParams | null,
    callback: PaginatedResultCallback<PresenceMessage>
  ): void | Promise<PaginatedResult<PresenceMessage>> {
    Logger.logAction(Logger.LOG_MICRO, 'RealtimePresence.history()', 'channel = ' + this.name);
    /* params and callback are optional; see if params contains the callback */
    if (callback === undefined) {
      if (typeof params == 'function') {
        callback = params;
        params = null;
      } else {
        if (this.channel.realtime.options.promises) {
          return Utils.promisify(this, 'history', arguments);
        }
        callback = noop;
      }
    }

    if (params && params.untilAttach) {
      if (this.channel.state === 'attached') {
        delete params.untilAttach;
        params.from_serial = this.channel.properties.attachSerial;
      } else {
        callback(
          new ErrorInfo(
            'option untilAttach requires the channel to be attached, was: ' + this.channel.state,
            40000,
            400
          )
        );
      }
    }

    Presence.prototype._history.call(this, params, callback);
  }

  setPresence(presenceSet: PresenceMessage[], isSync: boolean, syncChannelSerial?: string): void {
    Logger.logAction(
      Logger.LOG_MICRO,
      'RealtimePresence.setPresence()',
      'received presence for ' + presenceSet.length + ' participants; syncChannelSerial = ' + syncChannelSerial
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

    for (let i = 0; i < presenceSet.length; i++) {
      const presence = PresenceMessage.fromValues(presenceSet[i]);
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
      this.subscriptions.emit(presence.action as string, presence);
    }
  }

  onAttached(hasPresence?: boolean): void {
    Logger.logAction(
      Logger.LOG_MINOR,
      'RealtimePresence.onAttached()',
      'channel = ' + this.channel.name + ', hasPresence = ' + hasPresence
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
      const multicaster = Multicaster.create();
      Logger.logAction(
        Logger.LOG_MICRO,
        'RealtimePresence.onAttached',
        'sending ' + pendingPresCount + ' queued presence messages'
      );
      for (let i = 0; i < pendingPresCount; i++) {
        const event = pendingPresence[i];
        presenceArray.push(event.presence);
        multicaster.push(event.callback);
      }
      this.channel.sendPresence(presenceArray, multicaster);
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
        Logger.LOG_MINOR,
        'RealtimeChannel.failPendingPresence',
        'channel; name = ' + this.channel.name + ', err = ' + Utils.inspectError(err)
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
    const myMembers = this._myMembers,
      reenterCb = (err?: ErrorInfo | null) => {
        if (err) {
          const msg = 'Presence auto-re-enter failed: ' + err.toString();
          const wrappedErr = new ErrorInfo(msg, 91004, 400);
          Logger.logAction(Logger.LOG_ERROR, 'RealtimePresence._ensureMyMembersPresent()', msg);
          const change = new ChannelStateChange(this.channel.state, this.channel.state, true, false, wrappedErr);
          this.channel.emit('update', change);
        }
      };

    for (const memberKey in myMembers.map) {
      const entry = myMembers.map[memberKey];
      Logger.logAction(
        Logger.LOG_MICRO,
        'RealtimePresence._ensureMyMembersPresent()',
        'Auto-reentering clientId "' + entry.clientId + '" into the presence set'
      );
      // RTP17g: Send ENTER containing the member id, clientId and data
      // attributes.
      this._enterOrUpdateClient(entry.id, entry.clientId, entry.data, 'enter', reenterCb);
    }
  }

  _synthesizeLeaves(items: PresenceMessage[]): void {
    const subscriptions = this.subscriptions;
    Utils.arrForEach(items, function (item) {
      const presence = PresenceMessage.fromValues({
        action: 'leave',
        connectionId: item.connectionId,
        clientId: item.clientId,
        data: item.data,
        encoding: item.encoding,
        timestamp: Utils.now(),
      });
      subscriptions.emit('leave', presence);
    });
  }

  /* Deprecated */
  on(...args: unknown[]): void {
    Logger.deprecated('presence.on', 'presence.subscribe');
    this.subscribe(...args);
  }

  /* Deprecated */
  off(...args: unknown[]): void {
    Logger.deprecated('presence.off', 'presence.unsubscribe');
    this.unsubscribe(...args);
  }

  subscribe(..._args: unknown[] /* [event], listener, [callback] */): void | Promise<void> {
    const args = RealtimeChannel.processListenerArgs(_args);
    const event = args[0];
    const listener = args[1];
    let callback = args[2];
    const channel = this.channel;

    if (!callback) {
      if (this.channel.realtime.options.promises) {
        return Utils.promisify(this, 'subscribe', [event, listener]);
      }
      callback = noop;
    }

    if (channel.state === 'failed') {
      callback(ErrorInfo.fromValues(channel.invalidStateError()));
      return;
    }

    this.subscriptions.on(event, listener);
    channel.attach(callback);
  }

  unsubscribe(..._args: unknown[] /* [event], listener */): void {
    const args = RealtimeChannel.processListenerArgs(_args);
    const event = args[0];
    const listener = args[1];
    this.subscriptions.off(event, listener);
  }
}

class PresenceMap extends EventEmitter {
  map: Record<string, PresenceMessage>;
  residualMembers: Record<string, PresenceMessage> | null;
  syncInProgress: boolean;
  presence: RealtimePresence;
  memberKey: (item: PresenceMessage) => string;

  constructor(presence: RealtimePresence, memberKey: (item: PresenceMessage) => string) {
    super();
    this.presence = presence;
    this.map = Object.create(null);
    this.syncInProgress = false;
    this.residualMembers = null;
    this.memberKey = memberKey;
  }

  get(key: string) {
    return this.map[key];
  }

  getClient(clientId: string) {
    const map = this.map,
      result = [];
    for (const key in map) {
      const item = map[key];
      if (item.clientId == clientId && item.action != 'absent') result.push(item);
    }
    return result;
  }

  list(params: RealtimePresenceParams) {
    const map = this.map,
      clientId = params && params.clientId,
      connectionId = params && params.connectionId,
      result = [];

    for (const key in map) {
      const item = map[key];
      if (item.action === 'absent') continue;
      if (clientId && clientId != item.clientId) continue;
      if (connectionId && connectionId != item.connectionId) continue;
      result.push(item);
    }
    return result;
  }

  put(item: PresenceMessage) {
    if (item.action === 'enter' || item.action === 'update') {
      item = PresenceMessage.fromValues(item);
      item.action = 'present';
    }
    const map = this.map,
      key = this.memberKey(item);
    /* we've seen this member, so do not remove it at the end of sync */
    if (this.residualMembers) delete this.residualMembers[key];

    /* compare the timestamp of the new item with any existing member (or ABSENT witness) */
    const existingItem = map[key];
    if (existingItem && !newerThan(item, existingItem)) {
      return false;
    }
    map[key] = item;
    return true;
  }

  values() {
    const map = this.map,
      result = [];
    for (const key in map) {
      const item = map[key];
      if (item.action != 'absent') result.push(item);
    }
    return result;
  }

  remove(item: PresenceMessage) {
    const map = this.map,
      key = this.memberKey(item);
    const existingItem = map[key];

    if (existingItem && !newerThan(item, existingItem)) {
      return false;
    }

    /* RTP2f */
    if (this.syncInProgress) {
      item = PresenceMessage.fromValues(item);
      item.action = 'absent';
      map[key] = item;
    } else {
      delete map[key];
    }

    return true;
  }

  startSync() {
    const map = this.map,
      syncInProgress = this.syncInProgress;
    Logger.logAction(
      Logger.LOG_MINOR,
      'PresenceMap.startSync()',
      'channel = ' + this.presence.channel.name + '; syncInProgress = ' + syncInProgress
    );
    /* we might be called multiple times while a sync is in progress */
    if (!this.syncInProgress) {
      this.residualMembers = Utils.copy(map);
      this.setInProgress(true);
    }
  }

  endSync() {
    const map = this.map,
      syncInProgress = this.syncInProgress;
    Logger.logAction(
      Logger.LOG_MINOR,
      'PresenceMap.endSync()',
      'channel = ' + this.presence.channel.name + '; syncInProgress = ' + syncInProgress
    );
    if (syncInProgress) {
      /* we can now strip out the ABSENT members, as we have
       * received all of the out-of-order sync messages */
      for (const memberKey in map) {
        const entry = map[memberKey];
        if (entry.action === 'absent') {
          delete map[memberKey];
        }
      }
      /* any members that were present at the start of the sync,
       * and have not been seen in sync, can be removed, and leave events emitted */
      this.presence._synthesizeLeaves(Utils.valuesArray(this.residualMembers as Record<string, PresenceMessage>));
      for (const memberKey in this.residualMembers) {
        delete map[memberKey];
      }
      this.residualMembers = null;

      /* finish, notifying any waiters */
      this.setInProgress(false);
    }
    this.emit('sync');
  }

  waitSync(callback: () => void) {
    const syncInProgress = this.syncInProgress;
    Logger.logAction(
      Logger.LOG_MINOR,
      'PresenceMap.waitSync()',
      'channel = ' + this.presence.channel.name + '; syncInProgress = ' + syncInProgress
    );
    if (!syncInProgress) {
      callback();
      return;
    }
    this.once('sync', callback);
  }

  clear() {
    this.map = {};
    this.setInProgress(false);
    this.residualMembers = null;
  }

  setInProgress(inProgress: boolean) {
    Logger.logAction(Logger.LOG_MICRO, 'PresenceMap.setInProgress()', 'inProgress = ' + inProgress);
    this.syncInProgress = inProgress;
    this.presence.syncComplete = !inProgress;
  }
}

export default RealtimePresence;
