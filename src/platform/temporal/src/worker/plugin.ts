import * as Ably from 'ably';
import { SimplePlugin } from '@temporalio/plugin';
import { createActivities } from './activities.js';

/**
 * Options for {@link AblyRestPlugin}. Provide either `ably`, for the plugin to construct its own REST client, or
 * `client`, to use an existing one.
 */
export type AblyRestPluginOptions = (
  | {
      /** The options with which the plugin constructs the `Ably.Rest` client that its activities use. */
      ably: Ably.ClientOptions;
      client?: never;
    }
  | {
      /** An existing Ably REST client for the plugin's activities to use. */
      client: Ably.Rest;
      ably?: never;
    }
) & {
  /**
   * Whether to record the Temporal execution that performed each operation. When enabled, the
   * {@link TemporalMetadataKeys | Temporal metadata} is added to the `extras.headers` of every published message,
   * and to the `metadata` of every update, delete and append operation. The application's own header or metadata
   * values take precedence over the plugin's when their keys collide.
   *
   * @defaultValue `true`
   */
  temporalMetadata?: boolean;
  /**
   * Returns the options, such as a `cipher`, for a channel that workflows use. Every operation on the channel uses
   * these options, so channel options are configured on the worker rather than in workflow code, and cipher keys
   * stay out of the workflow history. Return `undefined` for a channel that needs no options.
   *
   * A channel that the application already got from `client` keeps the options the application gave it.
   *
   * ```ts
   * channelOptions: (name) => (name.startsWith('secure:') ? { cipher: { key: process.env.CHANNEL_KEY } } : undefined),
   * ```
   */
  channelOptions?: (name: string) => Ably.ChannelOptions | undefined;
};

/**
 * A Temporal worker plugin that registers the Ably activities, which perform Ably REST operations on behalf of
 * workflows. Workflow code calls them through `TemporalAblyRest` from `ably/temporal/workflow`.
 *
 * ```ts
 * const worker = await Worker.create({
 *   // ...
 *   plugins: [new AblyRestPlugin({ ably: { key: process.env.ABLY_API_KEY } })],
 * });
 * ```
 *
 * The activities are registered under the names in {@link ActivityNames}, which all start with `ably.`.
 */
export class AblyRestPlugin extends SimplePlugin {
  /** The Ably REST client that the plugin's activities use. */
  readonly client: Ably.Rest;

  /**
   * @param options - The plugin options. Exactly one of `ably` and `client` must be provided.
   * @throws An `Error` if both or neither of `ably` and `client` are provided.
   */
  constructor(options: AblyRestPluginOptions) {
    const client = resolveClient(options);
    super({
      name: 'AblyRestPlugin',
      activities: createActivities(client, {
        temporalMetadata: options.temporalMetadata,
        channelOptions: options.channelOptions,
      }),
    });
    this.client = client;
  }
}

function resolveClient(options: AblyRestPluginOptions | undefined): Ably.Rest {
  const { ably, client } = options ?? {};
  if (ably != null && client != null) {
    throw new Error(
      'AblyRestPlugin options include both `ably` and `client`. Pass `ably` with the ClientOptions for the plugin to construct a REST client, or `client` with an existing Ably.Rest instance, but not both.',
    );
  }
  if (client != null) {
    return client;
  }
  if (ably == null) {
    throw new Error(
      'AblyRestPlugin options include neither `ably` nor `client`. Pass `ably` with the ClientOptions for the plugin to construct a REST client, for example `{ ably: { key: process.env.ABLY_API_KEY } }`, or `client` with an existing Ably.Rest instance.',
    );
  }
  return new (restConstructor())(ably);
}

/**
 * Returns the `Ably.Rest` constructor. The `ably` package's Node.js entry point is a CommonJS bundle. When this
 * module is loaded as ESM, Node.js may not detect the bundle's named exports, in which case they are only available
 * on its default export.
 */
function restConstructor(): typeof Ably.Rest {
  return Ably.Rest ?? (Ably as unknown as { default: typeof Ably }).default.Rest;
}
