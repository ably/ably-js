import { Types } from 'ably';
import { search } from 'jmespath';

export class FakeAblySdk {
  public clientId: string;
  public channels: ClientChannelsCollection;
  public connection: Connection;
  public options = { promises: true };

  constructor() {
    this.clientId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    this.connection = new Connection();
  }

  public connectTo(channels: FakeAblyChannels) {
    this.channels = new ClientChannelsCollection(this, channels);
    return this;
  }

  async request() {
    return;
  }
}

type EventListener = (...args: any[]) => unknown;

class EventEmitter {
  listeners: Map<string | string[], EventListener[]>;
  allEvtListeners: EventListener[];
  constructor() {
    this.listeners = new Map<string | string[], EventListener[]>();
    this.allEvtListeners = [];
  }

  on(eventOrListener: string | string[] | EventListener, listener?: EventListener) {
    if (eventOrListener && listener) {
      if (!Array.isArray(eventOrListener)) {
        eventOrListener = [eventOrListener as string];
      }
      eventOrListener.forEach((eventName) => {
        const listenerArr = this.listeners.get(eventName as string);
        if (listenerArr) {
          listenerArr.push(listener);
          return;
        }
        this.listeners.set(eventName as string | string[], [listener]);
      });
    } else {
      this.allEvtListeners.push(eventOrListener as EventListener);
    }
  }

  off(eventOrListener: string | string[] | EventListener, listener?: EventListener) {
    if (eventOrListener && listener) {
      const listenerArr = this.listeners.get(eventOrListener as string);
      if (listenerArr) {
        this.listeners.set(
          eventOrListener as string,
          listenerArr.filter((x) => x !== listener)
        );
        return;
      }
    } else {
      this.allEvtListeners = this.allEvtListeners.filter((x) => x !== listener);
    }
  }

  emit(event: string, ...args: any[]) {
    const listenerArr = this.listeners.get(event);
    const allListeners: EventListener[] = [];
    if (listenerArr) {
      allListeners.push(...listenerArr);
    }
    allListeners.push(...this.allEvtListeners);
    allListeners.forEach((listener) => {
      listener(...args);
    });
  }
}

class Connection extends EventEmitter {
  state: Types.ConnectionState;

  constructor() {
    super();
    this.state = 'initialized';
  }
}

export class ClientChannelsCollection {
  private client: FakeAblySdk;
  private channels: FakeAblyChannels;
  private _channelConnections: Map<string, ClientSingleChannelConnection | ClientSingleDerivedChannelConnection>;

  constructor(client: FakeAblySdk, channels: FakeAblyChannels) {
    this.client = client;
    this.channels = channels;
    this._channelConnections = new Map();
  }

  public get(name: string): ClientSingleChannelConnection {
    let channelConnection = this._channelConnections.get(name);
    if (channelConnection) {
      return channelConnection;
    } else {
      channelConnection = new ClientSingleChannelConnection(this.client, this.channels.get(name));
      this._channelConnections.set(name, channelConnection);
      return channelConnection;
    }
  }

  public getDerived(name: string, options: Types.DeriveOptions): ClientSingleDerivedChannelConnection {
    let channelConnection = this._channelConnections.get(name);
    if (channelConnection) return channelConnection as ClientSingleDerivedChannelConnection;

    const channel = this.channels.get(name);
    channelConnection = new ClientSingleDerivedChannelConnection(this.client, channel, options);
    this._channelConnections.set(name, channelConnection);
    return channelConnection;
  }
}

export class ClientSingleChannelConnection extends EventEmitter {
  private client: FakeAblySdk;
  private channel: Channel;

  public presence: any;
  public state: string;

  constructor(client: FakeAblySdk, channel: Channel) {
    super();
    this.client = client;
    this.channel = channel;
    this.presence = new ClientPresenceConnection(this.client, this.channel.presence);
    this.state = 'attached';
  }

  publish(messages: any, callback?: Types.errorCallback): void;
  publish(name: string, messages: any, callback?: Types.errorCallback): void;
  publish(name: string, messages: any, options?: Types.PublishOptions, callback?: Types.errorCallback): void;
  public publish(...rest: any[]) {
    this.channel.publish(this.client.clientId, rest);
  }

  public async subscribe(
    eventOrCallback: Types.messageCallback<Types.Message> | string | Array<string>,
    listener?: Types.messageCallback<Types.Message>
  ) {
    this.channel.subscribe(this.client.clientId, eventOrCallback, listener);
  }

  public unsubscribe() {
    this.channel.subscriptionsPerClient.delete(this.client.clientId);
  }

  public detach() {
    this.channel.subscriptionsPerClient.delete(this.client.clientId);
  }
}

export class ClientSingleDerivedChannelConnection extends EventEmitter {
  private client: FakeAblySdk;
  private channel: Channel;
  private deriveOpts: Types.DeriveOptions;

  constructor(client: FakeAblySdk, channel: Channel, deriveOptions?: Types.DeriveOptions) {
    super();
    this.client = client;
    this.channel = channel;
    this.deriveOpts = deriveOptions;
  }

  public async subscribe(
    eventOrCallback: Types.messageCallback<Types.Message> | string | Array<string>,
    listener?: Types.messageCallback<Types.Message>
  ) {
    if (typeof eventOrCallback === 'function') eventOrCallback.deriveOptions = this.deriveOpts;
    if (typeof listener === 'function') listener.deriveOpts = this.deriveOpts;
    this.channel.subscribe(this.client.clientId, eventOrCallback, listener);
  }

  public unsubscribe() {
    this.channel.subscriptionsPerClient.delete(this.client.clientId);
  }
}

export class ClientPresenceConnection {
  private client: FakeAblySdk;
  private presence: ChannelPresence;

  constructor(client: FakeAblySdk, presence: ChannelPresence) {
    this.client = client;
    this.presence = presence;
  }

  public get() {
    return this.presence.get();
  }

  public update(data?: any) {
    const message = this.toPressenceMessage(data);
    this.presence.update(this.client.clientId, message);
  }

  public subscribe(key: string, callback: CallableFunction) {
    this.presence.subscribe(this.client.clientId, key, callback);
  }

  public leave(data?: any) {
    const message = this.toPressenceMessage(data);
    this.presence.leave(this.client.clientId, message);
  }

  public enter(data?: any) {
    const message = this.toPressenceMessage(data);
    this.presence.enter(this.client.clientId, message);
  }

  public unsubscribe(key: string) {
    this.presence.unsubscribe(this.client.clientId, key);
  }

  private toPressenceMessage(data: any) {
    return {
      clientId: this.client.clientId,
      data: data,
    };
  }
}

// "Fake Ably Server"

export class FakeAblyChannels {
  private _channels = new Map<string, Channel>();

  constructor(channels: string[] = []) {
    channels.forEach((channel) => this.get(channel));
  }

  public get(name: string): Channel {
    if (!this._channels.has(name)) {
      this._channels.set(name, new Channel(name));
    }

    return this._channels.get(name);
  }
}

export class Channel {
  name: string;
  presence: any;

  public subscriptionsPerClient = new Map<string, Map<string, CallableFunction[]>>();
  public publishedMessages: any[] = [];

  constructor(name: string) {
    this.name = name;
    this.presence = new ChannelPresence(this);
  }

  publish(clientId: string, messages: any, callback?: Types.errorCallback): void;
  publish(clientId: string, name: string, messages: any, callback?: Types.errorCallback): void;
  publish(
    clientId: string,
    name: string,
    messages: any,
    options?: Types.PublishOptions,
    callback?: Types.errorCallback
  ): void;
  public publish(clientId: string, ...rest: any[]) {
    const name = rest.length <= 2 ? '' : rest[0];
    const messages = rest.length <= 2 ? rest[0] : rest[1];

    for (const message of messages) {
      const messageEnvelope = {
        data: message,
      };

      for (const [, subscriptions] of this.subscriptionsPerClient.entries()) {
        let subs = [...subscriptions.values()].flat();
        if (name.length > 0) {
          subs = subs.filter((x) => x.name === name);
        }

        for (const subscription of subs) {
          const filter = subscription.deriveOptions?.filter;
          if (!filter) return subscription(messageEnvelope);
          const headers = messageEnvelope.data?.extras?.headers;
          const found = search({ headers }, filter);
          if (found) subscription(messageEnvelope);
        }
      }

      this.publishedMessages.push({ messageEnvelope });
    }
  }

  public async subscribe(
    clientId: string,
    eventOrCallback: Types.messageCallback<Types.Message> | string | Array<string>,
    listener?: Types.messageCallback<Types.Message>
  ) {
    if (!this.subscriptionsPerClient.has(clientId)) {
      this.subscriptionsPerClient.set(clientId, new Map<string, CallableFunction[]>());
    }

    const subsForClient = this.subscriptionsPerClient.get(clientId);

    const keys = [];
    let callback = listener;

    if (typeof eventOrCallback === 'string') {
      keys.push(eventOrCallback);
    } else if (Array.isArray(eventOrCallback)) {
      keys.push(...eventOrCallback);
    } else {
      keys.push('');
      callback = eventOrCallback;
    }

    for (const key of keys) {
      if (!subsForClient.has(key)) {
        subsForClient.set(key, []);
      }

      const subs = subsForClient.get(key);
      subs.push(callback);
    }
  }
}

export class ChannelPresence {
  public parent: Channel;
  public subscriptionsPerClient = new Map<string, Map<string, CallableFunction[]>>();
  public presenceObjects = new Map<string, any>();

  constructor(parent: Channel) {
    this.parent = parent;
  }

  public get() {
    return [...this.presenceObjects.entries()].map(([, data]) => {
      return data;
    });
  }

  public update(clientId: string, data?: any) {
    this.presenceObjects.set(clientId, data);
    this.triggerSubs('update', data);
  }

  public subscribe(clientId: string, key: string, callback: CallableFunction) {
    if (!this.subscriptionsPerClient.has(clientId)) {
      this.subscriptionsPerClient.set(clientId, new Map<string, CallableFunction[]>());
    }

    const subsForClient = this.subscriptionsPerClient.get(clientId);

    if (!subsForClient.has(key)) {
      subsForClient.set(key, []);
    }

    subsForClient.get(key).push(callback);
  }

  public leave(clientId: string, data?: any) {
    this.presenceObjects.delete(clientId);
    this.triggerSubs('leave', data);
  }

  public enter(clientId: string, data?: any) {
    this.presenceObjects.set(clientId, data);
    this.triggerSubs('enter', data);
  }

  public unsubscribe(clientId: string, key: string) {
    const subsForClient = this.subscriptionsPerClient.get(clientId);
    subsForClient?.set(key, []);
  }

  private triggerSubs(subType: string, data: any) {
    for (const [, subscriptions] of this.subscriptionsPerClient.entries()) {
      const subs = subscriptions.get(subType);
      for (const callback of subs) {
        callback(data);
      }
    }
  }
}
