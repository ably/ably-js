import Realtime from "../lib/client/realtime";
import * as Y from 'yjs';
import RealtimeChannel from "../lib/client/realtimechannel";
import Message from "../lib/types/message";

export default class Docs {
  realtime: Realtime;
  providers: Map<string, SyncInboxProvider>;

  constructor(realtime: Realtime) {
    this.realtime = realtime;
    this.providers = new Map();
  }

  get(name: string) {
    const doc = new Y.Doc();
    this.providers.set(name, new SyncInboxProvider(this.realtime, name, doc));
    return doc;
  }
}

/**
 * A Yjs provider which broadcasts sync requests and updates on a single
 * channel, but receives sync replies on a client-specific inbox channel.
 */
export class SyncInboxProvider {
  client: Realtime;
  channel: RealtimeChannel;
  doc: Y.Doc;
  clientId: string;

  constructor(client: Realtime, channel: string, doc: Y.Doc) {
    this.client = client;
    this.channel = client.channels.get(channel);
    this.doc = doc;
    this.clientId = doc.clientID.toString();

    this.channel.subscribe(this.handleMessage.bind(this));

    this.doc.on('update', this.handleUpdate.bind(this));

    const inbox = client.channels.get(`${channel}:${this.clientId}`);
    inbox.subscribe(this.handleMessage.bind(this));

    const state = Y.encodeStateVector(doc);
    this.log('publishing syncStep1');
    this.channel.publish('syncStep1', state);
  }

  handleMessage(msg: Message) {
    this.log('message received');
    if (msg.clientId === this.clientId) return;
    this.log('and it\'s not an echo');

    switch (msg.name) {
      case 'syncStep1': {
        const inbox = this.client.channels.get(`${this.channel.name}:${msg.clientId}`);
        const reply = Y.encodeStateAsUpdate(this.doc, new Uint8Array(msg.data));
	this.log('publishing syncStep2');
        inbox.publish('syncStep2', reply);
        break;
      }
      case 'syncStep2':
        Y.applyUpdate(this.doc, new Uint8Array(msg.data), this);
        break;
      case 'update':
        Y.applyUpdate(this.doc, new Uint8Array(msg.data), this);
        break;
      default:
        console.error(`Unexpected message: ${msg.name}`);
        break;
    }
  }

  handleUpdate(update: Uint8Array, origin: SyncInboxProvider) {
    if (origin !== this) {
      this.channel.publish('update', update);
    }
  }

  log(message: string) {
    // console.log(`${this.clientId}: ${message}`);
  }
}
