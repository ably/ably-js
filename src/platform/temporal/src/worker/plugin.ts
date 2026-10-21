import type * as Ably from 'ably';
import { SimplePlugin } from '@temporalio/plugin';
import { createActivities } from './activities.js';

/** Options for {@link AblyHttpPlugin}. */
export interface AblyHttpPluginOptions {
  /**
   * The Ably REST client that the plugin's activities use. Construct it as you would any `Ably.Rest` client. To use
   * `channel.object` from workflows, construct it with the `LiveObjects` plugin from `ably/liveobjects`.
   */
  client: Ably.Rest;
  /**
   * Whether to record the Temporal execution that performed each operation. When enabled, the
   * {@link TemporalMetadataKeys | Temporal metadata} is added to the `extras.headers` of every published message,
   * and to the `metadata` of every update, delete and append operation. The application's own header or metadata
   * values take precedence over the plugin's when their keys collide.
   *
   * @defaultValue `true`
   */
  temporalMetadata?: boolean;
}

/**
 * A Temporal worker plugin that registers the Ably activities, which perform Ably REST operations on behalf of
 * workflows. Workflow code calls them through `TemporalAblyHttpClient` from `ably/temporal/workflow`.
 *
 * ```ts
 * const client = new Ably.Rest({ key: process.env.ABLY_API_KEY });
 *
 * const worker = await Worker.create({
 *   // ...
 *   plugins: [new AblyHttpPlugin({ client })],
 * });
 * ```
 *
 * The activities are registered under the names in {@link ActivityNames}, which all start with `ably.`.
 */
export class AblyHttpPlugin extends SimplePlugin {
  /** The Ably REST client that the plugin's activities use. */
  readonly client: Ably.Rest;

  /**
   * @param options - The plugin options, including the Ably REST client that the activities use.
   * @throws `TypeError` if `options.client` is not an Ably REST client.
   */
  constructor(options: AblyHttpPluginOptions) {
    const client = validateClient(options);
    super({
      name: 'AblyHttpPlugin',
      activities: createActivities(client, { temporalMetadata: options.temporalMetadata }),
    });
    this.client = client;
  }
}

/**
 * Returns `options.client`, after checking that it is an Ably REST client. The check is structural, because the
 * client may come from a different copy of the Ably SDK than the one this module would import.
 */
function validateClient(options: AblyHttpPluginOptions | undefined): Ably.Rest {
  const client: unknown = options?.client;
  if (typeof client !== 'object' || client === null || typeof (client as Ably.Rest).channels?.get !== 'function') {
    throw new TypeError(
      'AblyHttpPlugin options do not include an Ably REST client in `client`. Construct an Ably.Rest client and pass it as `client`, for example `new AblyHttpPlugin({ client: new Ably.Rest({ key: process.env.ABLY_API_KEY }) })`.',
    );
  }
  return client as Ably.Rest;
}
