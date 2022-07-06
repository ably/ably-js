import Ably = require('./ably');

/**
 * BEGIN CANONICAL DOCSTRING
 * The `Rest` object offers a simple stateless API to interact directly with Ably's REST API.
 * END CANONICAL DOCSTRING
 *
 * BEGIN LEGACY DOCSTRING
 * The Ably REST client offers a simple stateless API to interact directly with Ably’s REST API.
 *
 * The REST library is typically used server-side to issue tokens, publish messages, and retrieve message history. If you are building a client-side application, you may want to consider using our stateful Ably Realtime client libraries.
 * END LEGACY DOCSTRING
 */
export declare class Rest extends Ably.Rest.Promise {}
/**
 * BEGIN LEGACY DOCSTRING
 * The Ably Realtime client establishes and maintains a persistent connection to Ably and provides methods to publish and subscribe to messages over a low latency realtime connection.
 *
 *
 *
 * The Realtime client extends the REST client and as such provides the functionality available in the REST client in addition to Realtime-specific features.
 *
 *
 *
 * @augments Rest
 * END LEGACY DOCSTRING
 */
export declare class Realtime extends Ably.Realtime.Promise {}

// Re-export the Types namespace.
import Types = Ably.Types;
export { Types };
