import ProtocolMessage from '../types/protocolmessage';
import EventEmitter from '../util/eventemitter';
import * as Utils from '../util/utils';
import Channel from './channel';
import Logger from '../util/logger';
import RealtimePresence from './realtimepresence';
import Message, { CipherOptions } from '../types/message';
import ChannelStateChange from './channelstatechange';
import ErrorInfo, { IPartialErrorInfo, PartialErrorInfo } from '../types/errorinfo';
import PresenceMessage from '../types/presencemessage';
import ConnectionErrors from '../transport/connectionerrors';
import * as API from '../../../../ably';
import ConnectionManager from '../transport/connectionmanager';
import ConnectionStateChange from './connectionstatechange';
import { ErrCallback, PaginatedResultCallback, StandardCallback } from '../../types/utils';
import Realtime from './realtime';

interface RealtimeHistoryParams {
  start?: number;
  end?: number;
  direction?: string;
  limit?: number;
  untilAttach?: boolean;
  from_serial?: string;
}

const actions = ProtocolMessage.Action;
const noop = function () {};

function validateChannelOptions(options?: API.Types.ChannelOptions) {
  if (options && 'params' in options && !Utils.isObject(options.params)) {
    return new ErrorInfo('options.params must be an object', 40000, 400);
  }
  if (options && 'modes' in options) {
    if (!Utils.isArray(options.modes)) {
      return new ErrorInfo('options.modes must be an array', 40000, 400);
    }
    for (let i = 0; i < options.modes.length; i++) {
      const currentMode = options.modes[i];
      if (
        !currentMode ||
        typeof currentMode !== 'string' ||
        !Utils.arrIn(ProtocolMessage.channelModes, String.prototype.toUpperCase.call(currentMode))
      ) {
        return new ErrorInfo('Invalid channel mode: ' + currentMode, 40000, 400);
      }
    }
  }
}

class RealtimeChannel extends Channel {
  realtime: Realtime;
  presence: RealtimePresence;
  connectionManager: ConnectionManager;
  state: API.Types.ChannelState;
  subscriptions: EventEmitter;
  filteredSubscriptions?: Map<
    API.Types.messageCallback<Message>,
    Map<API.Types.MessageFilter, API.Types.messageCallback<Message>[]>
  >;
  syncChannelSerial?: string | null;
  properties: {
    attachSerial: string | null | undefined;
    channelSerial: string | null | undefined;
  };
  errorReason: ErrorInfo | string | null;
  _requestedFlags: Array<API.Types.ChannelMode> | null;
  _mode?: null | number;
  _attachResume: boolean;
  _decodingContext: { channelOptions: API.Types.ChannelOptions; plugins: any; baseEncodedPreviousPayload: undefined };
  _lastPayload: {
    messageId?: string | null;
    protocolMessageChannelSerial?: string | null;
    decodeFailureRecoveryInProgress: null | boolean;
  };
  _allChannelChanges: EventEmitter;
  params?: Record<string, any>;
  modes: string[] | undefined;
  stateTimer?: number | NodeJS.Timeout | null;
  retryTimer?: number | NodeJS.Timeout | null;
  retryCount: number = 0;

  constructor(realtime: Realtime, name: string, options?: API.Types.ChannelOptions) {
    super(realtime, name, options);
    Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel()', 'started; name = ' + name);
    this.realtime = realtime;
    this.presence = new RealtimePresence(this);
    this.connectionManager = realtime.connection.connectionManager;
    this.state = 'initialized';
    this.subscriptions = new EventEmitter();
    this.syncChannelSerial = undefined;
    this.properties = {
      attachSerial: undefined,
      channelSerial: undefined,
    };
    this.setOptions(options);
    this.errorReason = null;
    this._requestedFlags = null;
    this._mode = null;
    this._attachResume = false;
    this._decodingContext = {
      channelOptions: this.channelOptions,
      plugins: realtime.options.plugins || {},
      baseEncodedPreviousPayload: undefined,
    };
    this._lastPayload = {
      messageId: null,
      protocolMessageChannelSerial: null,
      decodeFailureRecoveryInProgress: null,
    };
    /* Only differences between this and the public event emitter is that this emits an
     * update event for all ATTACHEDs, whether resumed or not */
    this._allChannelChanges = new EventEmitter();
  }

  invalidStateError(): ErrorInfo {
    return new ErrorInfo(
      'Channel operation failed as channel state is ' + this.state,
      90001,
      400,
      this.errorReason || undefined
    );
  }

  static processListenerArgs(args: unknown[]): any[] {
    /* [event], listener, [callback] */
    args = Array.prototype.slice.call(args);
    if (typeof args[0] === 'function') {
      args.unshift(null);
    }
    if (args[args.length - 1] == undefined) {
      args.pop();
    }
    return args;
  }

  setOptions(options?: API.Types.ChannelOptions, callback?: ErrCallback): void | Promise<void> {
    const previousChannelOptions = this.channelOptions;
    if (!callback) {
      if (this.rest.options.promises) {
        return Utils.promisify(this, 'setOptions', arguments);
      }
    }
    const _callback =
      callback ||
      function (err?: IPartialErrorInfo | null) {
        if (err) {
          Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.setOptions()', 'Set options failed: ' + err.toString());
        }
      };
    const err = validateChannelOptions(options);
    if (err) {
      _callback(err);
      return;
    }
    Channel.prototype.setOptions.call(this, options);
    if (this._decodingContext) this._decodingContext.channelOptions = this.channelOptions;
    if (this._shouldReattachToSetOptions(options, previousChannelOptions)) {
      /* This does not just do _attach(true, null, callback) because that would put us
       * into the 'attaching' state until we receive the new attached, which is
       * conceptually incorrect: we are still attached, we just have a pending request to
       * change some channel params. Per RTL17 going into the attaching state would mean
       * rejecting messages until we have confirmation that the options have changed,
       * which would unnecessarily lose message continuity. */
      this.attachImpl();
      // Ignore 'attaching' -- could be just due to to a resume & reattach, should not
      // call back setOptions until we're definitely attached with the new options (or
      // else in a terminal state)
      this._allChannelChanges.once(
        ['attached', 'update', 'detached', 'failed'],
        function (this: { event: string }, stateChange: ConnectionStateChange) {
          switch (this.event) {
            case 'update':
            case 'attached':
              _callback?.(null);
              return;
            default:
              _callback?.(stateChange.reason);
              return;
          }
        }
      );
    } else {
      _callback();
    }
  }

  _shouldReattachToSetOptions(options: API.Types.ChannelOptions | undefined, prevOptions: API.Types.ChannelOptions) {
    if (!(this.state === 'attached' || this.state === 'attaching')) {
      return false;
    }
    if (options?.params) {
      // Don't check against the `agent` param - it isn't returned in the ATTACHED message
      const requestedParams = omitAgent(options.params);
      const existingParams = omitAgent(prevOptions.params);

      if (Object.keys(requestedParams).length !== Object.keys(existingParams).length) {
        return true;
      }

      if (!Utils.shallowEquals(existingParams, requestedParams)) {
        return true;
      }
    }
    if (options?.modes) {
      if (!prevOptions.modes || !Utils.arrEquals(options.modes, prevOptions.modes)) {
        return true;
      }
    }
    return false;
  }

  publish(...args: any[]): void | Promise<void> {
    let messages = args[0];
    let argCount = args.length;
    let callback = args[argCount - 1];

    if (typeof callback !== 'function') {
      if (this.realtime.options.promises) {
        return Utils.promisify(this, 'publish', arguments);
      }
      callback = noop;
      ++argCount;
    }
    if (!this.connectionManager.activeState()) {
      callback(this.connectionManager.getError());
      return;
    }
    if (argCount == 2) {
      if (Utils.isObject(messages)) messages = [Message.fromValues(messages)];
      else if (Utils.isArray(messages)) messages = Message.fromValuesArray(messages);
      else
        throw new ErrorInfo(
          'The single-argument form of publish() expects a message object or an array of message objects',
          40013,
          400
        );
    } else {
      messages = [Message.fromValues({ name: args[0], data: args[1] })];
    }
    const maxMessageSize = this.realtime.options.maxMessageSize;
    Message.encodeArray(messages, this.channelOptions as CipherOptions, (err: Error | null) => {
      if (err) {
        callback(err);
        return;
      }
      /* RSL1i */
      const size = Message.getMessagesSize(messages);
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
      this.__publish(messages, callback);
    });
  }

  // Double underscore used to prevent type conflict with underlying Channel._publish method
  __publish(messages: Array<Message>, callback: ErrCallback) {
    Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.publish()', 'message count = ' + messages.length);
    const state = this.state;
    switch (state) {
      case 'failed':
      case 'suspended':
        callback(ErrorInfo.fromValues(this.invalidStateError()));
        break;
      default: {
        Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.publish()', 'sending message; channel state is ' + state);
        const msg = new ProtocolMessage();
        msg.action = actions.MESSAGE;
        msg.channel = this.name;
        msg.messages = messages;
        this.sendMessage(msg, callback);
        break;
      }
    }
  }

  onEvent(messages: Array<any>): void {
    Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.onEvent()', 'received message');
    const subscriptions = this.subscriptions;
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      subscriptions.emit(message.name, message);
    }
  }

  attach(
    flags?: API.Types.ChannelMode[] | ErrCallback,
    callback?: StandardCallback<ChannelStateChange | null>
  ): void | Promise<ChannelStateChange> {
    let _flags: API.Types.ChannelMode[] | null | undefined;
    if (typeof flags === 'function') {
      callback = flags;
      _flags = null;
    } else {
      _flags = flags;
    }
    if (!callback) {
      if (this.realtime.options.promises) {
        return Utils.promisify(this, 'attach', arguments);
      }
      callback = function (err?: ErrorInfo | null) {
        if (err) {
          Logger.logAction(Logger.LOG_MAJOR, 'RealtimeChannel.attach()', 'Channel attach failed: ' + err.toString());
        }
      };
    }
    if (_flags) {
      Logger.deprecated('channel.attach() with flags', 'channel.setOptions() with channelOptions.params');
      /* If flags requested, always do a re-attach. TODO only do this if
       * current mode differs from requested mode */
      this._requestedFlags = _flags as API.Types.ChannelMode[];
    } else if (this.state === 'attached') {
      callback(null, null);
      return;
    }

    this._attach(false, null, callback);
  }

  _attach(
    forceReattach: boolean,
    attachReason: ErrorInfo | null,
    callback?: StandardCallback<ChannelStateChange>
  ): void {
    if (!callback) {
      callback = function (err?: ErrorInfo | null) {
        if (err) {
          Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel._attach()', 'Channel attach failed: ' + err.toString());
        }
      };
    }

    const connectionManager = this.connectionManager;
    if (!connectionManager.activeState()) {
      callback(connectionManager.getError());
      return;
    }

    if (this.state !== 'attaching' || forceReattach) {
      this.requestState('attaching', attachReason);
    }

    this.once(function (this: { event: string }, stateChange: ChannelStateChange) {
      switch (this.event) {
        case 'attached':
          callback?.(null, stateChange);
          break;
        case 'detached':
        case 'suspended':
        case 'failed':
          callback?.(
            stateChange.reason ||
              connectionManager.getError() ||
              new ErrorInfo('Unable to attach; reason unknown; state = ' + this.event, 90000, 500)
          );
          break;
        case 'detaching':
          callback?.(new ErrorInfo('Attach request superseded by a subsequent detach request', 90000, 409));
          break;
      }
    });
  }

  attachImpl(): void {
    Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.attachImpl()', 'sending ATTACH message');
    const attachMsg = ProtocolMessage.fromValues({
      action: actions.ATTACH,
      channel: this.name,
      params: this.channelOptions.params,
      // RTL4c1: Includes the channel serial to resume from a previous message
      // or attachment.
      channelSerial: this.properties.channelSerial,
    });
    if (this._requestedFlags) {
      attachMsg.encodeModesToFlags(this._requestedFlags);
    } else if (this.channelOptions.modes) {
      attachMsg.encodeModesToFlags(Utils.allToUpperCase(this.channelOptions.modes) as API.Types.ChannelMode[]);
    }
    if (this._attachResume) {
      attachMsg.setFlag('ATTACH_RESUME');
    }
    if (this._lastPayload.decodeFailureRecoveryInProgress) {
      attachMsg.channelSerial = this._lastPayload.protocolMessageChannelSerial;
    }
    this.sendMessage(attachMsg, noop);
  }

  detach(callback: ErrCallback): void | Promise<void> {
    if (!callback) {
      if (this.realtime.options.promises) {
        return Utils.promisify(this, 'detach', arguments);
      }
      callback = noop;
    }
    const connectionManager = this.connectionManager;
    if (!connectionManager.activeState()) {
      callback(connectionManager.getError());
      return;
    }
    switch (this.state) {
      case 'suspended':
        this.notifyState('detached');
        callback();
        break;
      case 'detached':
        callback();
        break;
      case 'failed':
        callback(new ErrorInfo('Unable to detach; channel state = failed', 90001, 400));
        break;
      default:
        this.requestState('detaching');
      // eslint-disable-next-line no-fallthrough
      case 'detaching':
        this.once(function (this: { event: string }, stateChange: ChannelStateChange) {
          switch (this.event) {
            case 'detached':
              callback();
              break;
            case 'attached':
            case 'suspended':
            case 'failed':
              callback(
                stateChange.reason ||
                  connectionManager.getError() ||
                  new ErrorInfo('Unable to detach; reason unknown; state = ' + this.event, 90000, 500)
              );
              break;
            case 'attaching':
              callback(new ErrorInfo('Detach request superseded by a subsequent attach request', 90000, 409));
              break;
          }
        });
    }
  }

  detachImpl(callback?: ErrCallback): void {
    Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.detach()', 'sending DETACH message');
    const msg = ProtocolMessage.fromValues({ action: actions.DETACH, channel: this.name });
    this.sendMessage(msg, callback || noop);
  }

  subscribe(...args: unknown[] /* [event], listener, [callback] */): void | Promise<ChannelStateChange> {
    const [event, listener, callback] = RealtimeChannel.processListenerArgs(args);

    if (!callback && this.realtime.options.promises) {
      return Utils.promisify(this, 'subscribe', [event, listener]);
    }

    if (this.state === 'failed') {
      callback?.(ErrorInfo.fromValues(this.invalidStateError()));
      return;
    }

    // Filtered
    if (event && typeof event === 'object' && !Array.isArray(event)) {
      this._subscribeFilter(event, listener);
    } else {
      this.subscriptions.on(event, listener);
    }

    return this.attach(callback || noop);
  }

  _subscribeFilter(filter: API.Types.MessageFilter, listener: API.Types.messageCallback<Message>) {
    const filteredListener = (m: Message) => {
      const mapping: { [key in keyof API.Types.MessageFilter]: any } = {
        name: m.name,
        refTimeserial: m.extras?.ref?.timeserial,
        refType: m.extras?.ref?.type,
        isRef: !!m.extras?.ref?.timeserial,
        clientId: m.clientId,
      };
      // Check if any values are defined in the filter and if they match the value in the message object
      if (
        Object.entries(filter).find(([key, value]) =>
          value !== undefined ? mapping[key as keyof API.Types.MessageFilter] !== value : false
        )
      ) {
        return;
      }
      listener(m);
    };
    this._addFilteredSubscription(filter, listener, filteredListener);
    this.subscriptions.on(filteredListener);
  }

  // Adds a new filtered subscription
  _addFilteredSubscription(
    filter: API.Types.MessageFilter,
    realListener: API.Types.messageCallback<Message>,
    filteredListener: API.Types.messageCallback<Message>
  ) {
    if (!this.filteredSubscriptions) {
      this.filteredSubscriptions = new Map<
        API.Types.messageCallback<Message>,
        Map<API.Types.MessageFilter, API.Types.messageCallback<Message>[]>
      >();
    }
    if (this.filteredSubscriptions.has(realListener)) {
      const realListenerMap = this.filteredSubscriptions.get(realListener) as Map<
        API.Types.MessageFilter,
        API.Types.messageCallback<Message>[]
      >;
      // Add the filtered listener to the map, or append to the array if this filter has already been used
      realListenerMap.set(filter, realListenerMap?.get(filter)?.concat(filteredListener) || [filteredListener]);
    } else {
      this.filteredSubscriptions.set(
        realListener,
        new Map<API.Types.MessageFilter, API.Types.messageCallback<Message>[]>([[filter, [filteredListener]]])
      );
    }
  }

  _getAndDeleteFilteredSubscriptions(
    filter: API.Types.MessageFilter | undefined,
    realListener: API.Types.messageCallback<Message> | undefined
  ): API.Types.messageCallback<Message>[] {
    // No filtered subscriptions map means there has been no filtered subscriptions yet, so return nothing
    if (!this.filteredSubscriptions) {
      return [];
    }
    // Only a filter is passed in with no specific listener
    if (!realListener && filter) {
      // Return each listener which is attached to the specified filter object
      return Array.from(this.filteredSubscriptions.entries())
        .map(([key, filterMaps]) => {
          // Get (then delete) the maps matching this filter
          let listenerMaps = filterMaps.get(filter);
          filterMaps.delete(filter);
          // Clear the parent if nothing is left
          if (filterMaps.size === 0) {
            this.filteredSubscriptions?.delete(key);
          }
          return listenerMaps;
        })
        .reduce(
          (prev, cur) => (cur ? (prev as API.Types.messageCallback<Message>[]).concat(...cur) : prev),
          []
        ) as API.Types.messageCallback<Message>[];
    }

    // No subscriptions for this listener
    if (!realListener || !this.filteredSubscriptions.has(realListener)) {
      return [];
    }
    const realListenerMap = this.filteredSubscriptions.get(realListener) as Map<
      API.Types.MessageFilter,
      API.Types.messageCallback<Message>[]
    >;
    // If no filter is specified return all listeners using that function
    if (!filter) {
      // array.flat is not available unless we support es2019 or higher
      const listeners = Array.from(realListenerMap.values()).reduce((prev, cur) => prev.concat(...cur), []);
      // remove the listener from the map
      this.filteredSubscriptions.delete(realListener);
      return listeners;
    }

    let listeners = realListenerMap.get(filter);
    realListenerMap.delete(filter);

    return listeners || [];
  }

  unsubscribe(...args: unknown[] /* [event], listener */): void {
    const [event, listener] = RealtimeChannel.processListenerArgs(args);

    // If we either have a filtered listener, a filter or both we need to do additional processing to find the original function(s)
    if ((typeof event === 'object' && !listener) || this.filteredSubscriptions?.has(listener)) {
      this._getAndDeleteFilteredSubscriptions(event, listener).forEach((l) => this.subscriptions.off(l));
      return;
    }

    this.subscriptions.off(event, listener);
  }

  sync(): void {
    /* check preconditions */
    switch (this.state) {
      case 'initialized':
      case 'detaching':
      case 'detached':
        throw new PartialErrorInfo('Unable to sync to channel; not attached', 40000);
      default:
    }
    const connectionManager = this.connectionManager;
    if (!connectionManager.activeState()) {
      throw connectionManager.getError();
    }

    /* send sync request */
    const syncMessage = ProtocolMessage.fromValues({ action: actions.SYNC, channel: this.name });
    if (this.syncChannelSerial) {
      syncMessage.channelSerial = this.syncChannelSerial;
    }
    connectionManager.send(syncMessage);
  }

  sendMessage(msg: ProtocolMessage, callback?: ErrCallback): void {
    this.connectionManager.send(msg, this.realtime.options.queueMessages, callback);
  }

  sendPresence(presence: PresenceMessage | PresenceMessage[], callback?: ErrCallback): void {
    const msg = ProtocolMessage.fromValues({
      action: actions.PRESENCE,
      channel: this.name,
      presence: Utils.isArray(presence)
        ? PresenceMessage.fromValuesArray(presence)
        : [PresenceMessage.fromValues(presence)],
    });
    this.sendMessage(msg, callback);
  }

  onMessage(message: ProtocolMessage): void {
    if (
      message.action === actions.ATTACHED ||
      message.action === actions.MESSAGE ||
      message.action === actions.PRESENCE
    ) {
      // RTL15b
      this.setChannelSerial(message.channelSerial);
    }

    let syncChannelSerial,
      isSync = false;
    switch (message.action) {
      case actions.ATTACHED: {
        this.properties.attachSerial = message.channelSerial;
        this._mode = message.getMode();
        this.params = (message as any).params || {};
        const modesFromFlags = message.decodeModesFromFlags();
        this.modes = (modesFromFlags && Utils.allToLowerCase(modesFromFlags)) || undefined;
        const resumed = message.hasFlag('RESUMED');
        const hasPresence = message.hasFlag('HAS_PRESENCE');
        const hasBacklog = message.hasFlag('HAS_BACKLOG');
        if (this.state === 'attached') {
          if (!resumed) {
            /* On a loss of continuity, the presence set needs to be re-synced */
            this.presence.onAttached(hasPresence);
          }
          const change = new ChannelStateChange(this.state, this.state, resumed, hasBacklog, message.error);
          this._allChannelChanges.emit('update', change);
          if (!resumed || this.channelOptions.updateOnAttached) {
            this.emit('update', change);
          }
        } else if (this.state === 'detaching') {
          /* RTL5i: re-send DETACH and remain in the 'detaching' state */
          this.checkPendingState();
        } else {
          this.notifyState('attached', message.error, resumed, hasPresence, hasBacklog);
        }
        break;
      }

      case actions.DETACHED: {
        const detachErr = message.error
          ? ErrorInfo.fromValues(message.error)
          : new ErrorInfo('Channel detached', 90001, 404);
        if (this.state === 'detaching') {
          this.notifyState('detached', detachErr);
        } else if (this.state === 'attaching') {
          /* Only retry immediately if we were previously attached. If we were
           * attaching, go into suspended, fail messages, and wait a few seconds
           * before retrying */
          this.notifyState('suspended', detachErr);
        } else {
          this.requestState('attaching', detachErr);
        }
        break;
      }

      case actions.SYNC:
        /* syncs can have channelSerials, but might not if the sync is one page long */
        isSync = true;
        syncChannelSerial = this.syncChannelSerial = message.channelSerial;
        /* syncs can happen on channels with no presence data as part of connection
         * resuming, in which case protocol message has no presence property */
        if (!message.presence) break;
      // eslint-disable-next-line no-fallthrough
      case actions.PRESENCE: {
        const presence = message.presence as Array<PresenceMessage>;
        const { id, connectionId, timestamp } = message;

        const options = this.channelOptions;
        let presenceMsg: PresenceMessage;
        for (let i = 0; i < presence.length; i++) {
          try {
            presenceMsg = presence[i];
            PresenceMessage.decode(presenceMsg, options);
            if (!presenceMsg.connectionId) presenceMsg.connectionId = connectionId;
            if (!presenceMsg.timestamp) presenceMsg.timestamp = timestamp;
            if (!presenceMsg.id) presenceMsg.id = id + ':' + i;
          } catch (e) {
            Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.onMessage()', (e as Error).toString());
          }
        }
        this.presence.setPresence(presence, isSync, syncChannelSerial as any);
        break;
      }
      case actions.MESSAGE: {
        //RTL17
        if (this.state !== 'attached') {
          Logger.logAction(
            Logger.LOG_MAJOR,
            'RealtimeChannel.onMessage()',
            'Message "' +
              message.id +
              '" skipped as this channel "' +
              this.name +
              '" state is not "attached" (state is "' +
              this.state +
              '").'
          );
          return;
        }

        const messages = message.messages as Array<Message>,
          firstMessage = messages[0],
          lastMessage = messages[messages.length - 1],
          id = message.id,
          connectionId = message.connectionId,
          timestamp = message.timestamp;

        if (
          firstMessage.extras &&
          firstMessage.extras.delta &&
          firstMessage.extras.delta.from !== this._lastPayload.messageId
        ) {
          const msg =
            'Delta message decode failure - previous message not available for message "' +
            message.id +
            '" on this channel "' +
            this.name +
            '".';
          Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.onMessage()', msg);
          this._startDecodeFailureRecovery(new ErrorInfo(msg, 40018, 400));
          break;
        }

        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          try {
            Message.decode(msg, this._decodingContext);
          } catch (e) {
            /* decrypt failed .. the most likely cause is that we have the wrong key */
            Logger.logAction(Logger.LOG_ERROR, 'RealtimeChannel.onMessage()', (e as Error).toString());
            switch ((e as ErrorInfo).code) {
              case 40018:
                /* decode failure */
                this._startDecodeFailureRecovery(e as ErrorInfo);
                return;
              case 40019:
              /* No vcdiff plugin passed in - no point recovering, give up */
              // eslint-disable-next-line no-fallthrough
              case 40021:
                /* Browser does not support deltas, similarly no point recovering */
                this.notifyState('failed', e as ErrorInfo);
                return;
            }
          }
          if (!msg.connectionId) msg.connectionId = connectionId;
          if (!msg.timestamp) msg.timestamp = timestamp;
          if (!msg.id) msg.id = id + ':' + i;
        }
        this._lastPayload.messageId = lastMessage.id;
        this._lastPayload.protocolMessageChannelSerial = message.channelSerial;
        this.onEvent(messages);
        break;
      }

      case actions.ERROR: {
        /* there was a channel-specific error */
        const err = message.error as ErrorInfo;
        if (err && err.code == 80016) {
          /* attach/detach operation attempted on superseded transport handle */
          this.checkPendingState();
        } else {
          this.notifyState('failed', ErrorInfo.fromValues(err));
        }
        break;
      }

      default:
        Logger.logAction(
          Logger.LOG_ERROR,
          'RealtimeChannel.onMessage()',
          'Fatal protocol error: unrecognised action (' + message.action + ')'
        );
        this.connectionManager.abort(ConnectionErrors.unknownChannelErr());
    }
  }

  _startDecodeFailureRecovery(reason: ErrorInfo): void {
    if (!this._lastPayload.decodeFailureRecoveryInProgress) {
      Logger.logAction(Logger.LOG_MAJOR, 'RealtimeChannel.onMessage()', 'Starting decode failure recovery process.');
      this._lastPayload.decodeFailureRecoveryInProgress = true;
      this._attach(true, reason, () => {
        this._lastPayload.decodeFailureRecoveryInProgress = false;
      });
    }
  }

  onAttached(): void {
    Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.onAttached', 'activating channel; name = ' + this.name);
  }

  notifyState(
    state: API.Types.ChannelState,
    reason?: ErrorInfo | null,
    resumed?: boolean,
    hasPresence?: boolean,
    hasBacklog?: boolean
  ): void {
    Logger.logAction(
      Logger.LOG_MICRO,
      'RealtimeChannel.notifyState',
      'name = ' + this.name + ', current state = ' + this.state + ', notifying state ' + state
    );
    this.clearStateTimer();

    // RTP5a1
    if (Utils.arrIn(['detached', 'suspended', 'failed'], state)) {
      this.properties.channelSerial = null;
    }

    if (state === this.state) {
      return;
    }
    this.presence.actOnChannelState(state, hasPresence, reason);
    if (state === 'suspended' && this.connectionManager.state.sendEvents) {
      this.startRetryTimer();
    } else {
      this.cancelRetryTimer();
    }
    if (reason) {
      this.errorReason = reason;
    }
    const change = new ChannelStateChange(this.state, state, resumed, hasBacklog, reason);
    const logLevel = state === 'failed' ? Logger.LOG_ERROR : Logger.LOG_MAJOR;
    Logger.logAction(
      logLevel,
      'Channel state for channel "' + this.name + '"',
      state + (reason ? '; reason: ' + reason : '')
    );

    if (state !== 'attaching' && state !== 'suspended') {
      this.retryCount = 0;
    }

    /* Note: we don't set inProgress for pending states until the request is actually in progress */
    if (state === 'attached') {
      this.onAttached();
    }

    if (state === 'attached') {
      this._attachResume = true;
    } else if (state === 'detaching' || state === 'failed') {
      this._attachResume = false;
    }

    this.state = state;
    this._allChannelChanges.emit(state, change);
    this.emit(state, change);
  }

  requestState(state: API.Types.ChannelState, reason?: ErrorInfo | null): void {
    Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.requestState', 'name = ' + this.name + ', state = ' + state);
    this.notifyState(state, reason);
    /* send the event and await response */
    this.checkPendingState();
  }

  checkPendingState(): void {
    /* if can't send events, do nothing */
    const cmState = this.connectionManager.state;
    /* Allow attach messages to queue up when synchronizing, since this will be
     * the state we'll be in when upgrade transport.active triggers a checkpendingstate */
    if (!(cmState.sendEvents || cmState.forceQueueEvents)) {
      Logger.logAction(
        Logger.LOG_MINOR,
        'RealtimeChannel.checkPendingState',
        'sendEvents is false; state is ' + this.connectionManager.state.state
      );
      return;
    }

    Logger.logAction(
      Logger.LOG_MINOR,
      'RealtimeChannel.checkPendingState',
      'name = ' + this.name + ', state = ' + this.state
    );
    /* Only start the state timer running when actually sending the event */
    switch (this.state) {
      case 'attaching':
        this.startStateTimerIfNotRunning();
        this.attachImpl();
        break;
      case 'detaching':
        this.startStateTimerIfNotRunning();
        this.detachImpl();
        break;
      case 'attached':
        /* resume any sync operation that was in progress */
        this.sync();
        break;
      default:
        break;
    }
  }

  timeoutPendingState(): void {
    switch (this.state) {
      case 'attaching': {
        const err = new ErrorInfo('Channel attach timed out', 90007, 408);
        this.notifyState('suspended', err);
        break;
      }
      case 'detaching': {
        const err = new ErrorInfo('Channel detach timed out', 90007, 408);
        this.notifyState('attached', err);
        break;
      }
      default:
        this.checkPendingState();
        break;
    }
  }

  startStateTimerIfNotRunning(): void {
    if (!this.stateTimer) {
      this.stateTimer = setTimeout(() => {
        Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel.startStateTimerIfNotRunning', 'timer expired');
        this.stateTimer = null;
        this.timeoutPendingState();
      }, this.realtime.options.timeouts.realtimeRequestTimeout);
    }
  }

  clearStateTimer(): void {
    const stateTimer = this.stateTimer;
    if (stateTimer) {
      clearTimeout(stateTimer);
      this.stateTimer = null;
    }
  }

  startRetryTimer(): void {
    if (this.retryTimer) return;

    this.retryCount++;
    const retryDelay = Utils.getRetryTime(this.realtime.options.timeouts.channelRetryTimeout, this.retryCount);

    this.retryTimer = setTimeout(() => {
      /* If connection is not connected, just leave in suspended, a reattach
       * will be triggered once it connects again */
      if (this.state === 'suspended' && this.connectionManager.state.sendEvents) {
        this.retryTimer = null;
        Logger.logAction(Logger.LOG_MINOR, 'RealtimeChannel retry timer expired', 'attempting a new attach');
        this.requestState('attaching');
      }
    }, retryDelay);
  }

  cancelRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer as NodeJS.Timeout);
      this.retryTimer = null;
    }
  }

  history = function (
    this: RealtimeChannel,
    params: RealtimeHistoryParams | null,
    callback: PaginatedResultCallback<Message>
  ): void | Promise<PaginatedResultCallback<Message>> {
    Logger.logAction(Logger.LOG_MICRO, 'RealtimeChannel.history()', 'channel = ' + this.name);
    /* params and callback are optional; see if params contains the callback */
    if (callback === undefined) {
      if (typeof params == 'function') {
        callback = params;
        params = null;
      } else {
        if (this.rest.options.promises) {
          return Utils.promisify(this, 'history', arguments);
        }
        callback = noop;
      }
    }

    if (params && params.untilAttach) {
      if (this.state !== 'attached') {
        callback(new ErrorInfo('option untilAttach requires the channel to be attached', 40000, 400));
        return;
      }
      if (!this.properties.attachSerial) {
        callback(
          new ErrorInfo(
            'untilAttach was specified and channel is attached, but attachSerial is not defined',
            40000,
            400
          )
        );
        return;
      }
      delete params.untilAttach;
      params.from_serial = this.properties.attachSerial;
    }

    Channel.prototype._history.call(this, params, callback);
  } as any;

  whenState = ((state: string, listener: ErrCallback) => {
    return EventEmitter.prototype.whenState.call(this, state, this.state, listener);
  }) as any;

  /* @returns null (if can safely be released) | ErrorInfo (if cannot) */
  getReleaseErr(): ErrorInfo | null {
    const s = this.state;
    if (s === 'initialized' || s === 'detached' || s === 'failed') {
      return null;
    }
    return new ErrorInfo(
      'Can only release a channel in a state where there is no possibility of further updates from the server being received (initialized, detached, or failed); was ' +
        s,
      90001,
      400
    );
  }

  setChannelSerial(channelSerial?: string | null): void {
    Logger.logAction(
      Logger.LOG_MICRO,
      'RealtimeChannel.setChannelSerial()',
      'Updating channel serial; serial = ' + channelSerial + '; previous = ' + this.properties.channelSerial
    );

    // RTP17h: Only update the channel serial if its present (it won't always
    // be set).
    if (channelSerial) {
      this.properties.channelSerial = channelSerial;
    }
  }
}

function omitAgent(channelParams?: API.Types.ChannelParams) {
  const { agent: _, ...paramsWithoutAgent } = channelParams || {};
  return paramsWithoutAgent;
}

export default RealtimeChannel;
