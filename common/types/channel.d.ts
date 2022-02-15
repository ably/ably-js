
import {Types} from "../../ably";

export interface ChannelOptions extends Types.ChannelOptions {
  channelCipher?: {
    algorithm: string;
    encrypt: Function;
    decrypt: Function;
  } | null;
}
