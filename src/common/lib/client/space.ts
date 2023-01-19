import Realtime from "./realtime";
import RealtimeChannel from "./realtimechannel";


class Spaces {

  spaces: Record<string, Space>;
  private realtime: Realtime;

  constructor(realtime: Realtime) {
    this.spaces = {};
    this.realtime = realtime;
  }

  get(name: string, options: SpaceOptions): Space {
    if(name.length === 0){
      throw new Error("Spaces must have a non-empty name");
    }
    // TODO: updating options
    if(this.spaces[name])
      return this.spaces[name];

    // make a space
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

  constructor(name: string, options: SpaceOptions, realtime: Realtime){
    this.name = name;
    this.options = options;
    this.realtime = realtime;

    // The channel name prefix here should be unique to avoid conflicts with non-space channels
    this.channel = this.realtime.channels.get(`_ably_space_${name}`);
  }

}

type SpaceOptions = {
  data?: any;
}


export default Spaces;
