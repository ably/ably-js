import Realtime from './realtime';
import RealtimeChannel from './realtimechannel';
import ErrorInfo from '../types/errorinfo';
import PresenceMessage from '../types/presencemessage';
import { Types } from '../../../../ably';
import errorCallback = Types.errorCallback;

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

class Space {
  name: string;
  private options: SpaceOptions;
  private realtime: Realtime;
  private channel: RealtimeChannel;

  constructor(name: string, options: SpaceOptions, realtime: Realtime) {
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
    presence.get({ clientId }, function (err: ErrorInfo, members: PresenceMessage[] | undefined) {
      if (err) {
        return callback({ message: 'Could not retrieve the members set for space', code: 40000, statusCode: 400 });
      }

      if (members && members.length === 1) {
        // TODO: Work on error messages and their codes
        // TODO: Do we want to fail here or just inform the user
        return callback({ message: 'Client has already entered the space', code: 40000, statusCode: 400 });
      } else {
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
        return callback({ message: 'Member not present in space, leave operation redundant', code: 40000, statusCode: 404 });
      }
    });
  }

  members(callback: (err: ErrorInfo | undefined, members: unknown[]) => void) {
    let members = this.channel.presence.members.list({});

    callback(
      undefined,
      members.map((value: PresenceMessage) => ({
        id: value.id,
        data: value.data,
      }))
    );
  }
}

type SpaceOptions = {
  data?: any;
};

export default Spaces;
