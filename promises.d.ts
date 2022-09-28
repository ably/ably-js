import Ably = require('./ably');

/**
 * The `Rest` object offers a simple stateless API to interact directly with Ably's REST API.
 */
export declare class Rest extends Ably.Rest.Promise {}
/**
 * A client that extends the functionality of {@link Rest} and provides additional realtime-specific features.
 */
export declare class Realtime extends Ably.Realtime.Promise {}

// Re-export the Types namespace.
import Types = Ably.Types;
export { Types };
