import Ably = require('./ably');

export declare class Rest extends Ably.Rest.Promise {}
export declare class Realtime extends Ably.Realtime.Promise {}

// Re-export the Types namespace.
import Types = Ably.Types;
export { Types };
