import Ably = require('./ably');

export declare class Realtime extends Ably.Realtime.Promise {}
export declare class Rest extends Ably.Rest.Promise {}

// Re-export the Types namespace.
import Types = Ably.Types;
export { Types };
