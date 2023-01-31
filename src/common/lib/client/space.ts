import Realtime from './realtime';
import RealtimeChannel from './realtimechannel';
import ErrorInfo from '../types/errorinfo';
import PresenceMessage from '../types/presencemessage';
import { Types } from '../../../../ably';
import errorCallback = Types.errorCallback;
import Eventemitter from "../util/eventemitter";

class Spaces {
  spaces: Record<string, Space>;
  private realtime: Realtime;

  constructor(realtime: Realtime) {
    this.spaces = {};
    this.realtime = realtime;
  }

  get(name: string, options: SpaceOptions): Space {
    if (typeof name !== 'string' || name.length === 0) {
      throw new Error('Spaces must have a non-empty name');
    }

    if (this.spaces[name]) return this.spaces[name];

    let space = new Space(name, options, this.realtime);
    this.spaces[name] = space;
    return space;
  }
}

class Space extends Eventemitter {
  name: string;
  private options: SpaceOptions;
  private realtime: Realtime;
  private channel: RealtimeChannel;

  private members: SpaceMember[] = [];

  constructor(name: string, options: SpaceOptions, realtime: Realtime) {
    super();
    this.name = name;
    this.options = options;
    this.realtime = realtime;

    // The channel name prefix here should be unique to avoid conflicts with non-space channels
    this.channel = this.realtime.channels.get(`_ably_space_${name}`);


  }

  enter(data: unknown, callback: errorCallback) {
    if (!data || typeof data !== 'object') {
      return callback({ message: 'Data must be a JSON serializable Object', code: 40000, statusCode: 400 });
    }

    let clientId = this.realtime.auth.clientId || undefined;
    let presence = this.channel.presence;

    // TODO: Discuss if we actually want change this behaviour in contrast to presence (enter becomes an update)
    presence.get({ clientId }, (err: ErrorInfo, members: PresenceMessage[] | undefined) => {
      if (err) {
        return callback({ message: 'Could not retrieve the members set for space', code: 40000, statusCode: 400 });
      }

      if (members && members.length === 1) {
        // TODO: Work on error messages and their codes
        // TODO: Do we want to fail here or just inform the user
        return callback({ message: 'Client has already entered the space', code: 40000, statusCode: 400 });
      } else {
        this.syncMembers();
        return presence.enter(data, callback);
      }
    });
  }

  leave(callback: errorCallback) {
    let clientId = this.realtime.auth.clientId || undefined;
    let presence = this.channel.presence;

    presence.get({ clientId }, function (err: ErrorInfo, members: PresenceMessage[] | undefined) {
      if (err) {
        return callback({ message: 'Could not retrieve the members set for space', code: 40000, statusCode: 400 });
      }

      if (members && members.length >= 1) {
        return presence.leave(undefined, callback);
      } else {
        return callback({
          message: 'Member not present in space, leave operation redundant',
          code: 40000,
          statusCode: 404,
        });
      }
    });
  }

  private syncMembers(){
    this.channel.presence.members.list({}).filter((m)=>m.clientId).map((m)=>({
      clientId: m.clientId,
      lastEventTimestamp: new Date(),
      isConnected: true,
      data: JSON.parse(m.data as string),
    }));

    this.channel.presence.on('enter', (message: PresenceMessage)=>{
      this.updateMemberState(message.clientId, true, JSON.parse(message.data?.toString() as string));
    });

    this.channel.presence.on('leave', (message: PresenceMessage)=>{
      this.updateMemberState(message.clientId, false);
    });

    this.channel.presence.on('update', (message: PresenceMessage)=>{
      this.updateMemberState(message.clientId, true, JSON.parse(message.data as string));
    });
  }

  private updateMemberState(clientId: string | undefined, isConnected: boolean, data?: {[key: string]: any}) {
    const implicitClientId = clientId ?? this.realtime.auth.clientId;
    if(!implicitClientId) {
      return;
    }
    let member = this.members.find((m)=>m.clientId===clientId);
    if(!member) {
      this.emit("memberUpdate", member);
      return this.createMember(implicitClientId, isConnected, data || {});
    }
    member.isConnected = isConnected;
    if(data){
      // Member data is completely overridden
      member.data = data;
    }
    this.emit("memberUpdate", member);
  }

  private createMember(clientId: string, isConnected: boolean, data: {[key: string]: any}){
    this.members.push({clientId, isConnected, data, lastEventTimestamp: new Date()});
  }

}

type SpaceOptions = {
  data?: any;
};

type SpaceMember = {
  clientId: string,
  lastEventTimestamp: Date,
  isConnected: boolean,
  data: {[key: string]: any},
}

export default Spaces;
