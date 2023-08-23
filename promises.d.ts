import Ably = require('./ably');

/**
 * The `Rest` object offers a simple stateless API to interact directly with Ably's REST API.
 */
export declare class Rest extends Ably.Rest.Promise {}
/**
 * A client that extends the functionality of {@link Rest} and provides additional realtime-specific features.
 */
export declare class Realtime extends Ably.Realtime.Promise {}
/**
 * A generic Ably error object that contains an Ably-specific status code, and a generic status code. Errors returned from the Ably server are compatible with the `ErrorInfo` structure and should result in errors that inherit from `ErrorInfo`.
 */
export declare class ErrorInfo extends Types.ErrorInfo {}

// Re-export the Types namespace.
import Types = Ably.Types;
export { Types };
