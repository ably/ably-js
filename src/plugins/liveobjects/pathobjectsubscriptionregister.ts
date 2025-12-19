import type BaseClient from 'common/lib/client/baseclient';
import type { EventCallback, Subscription } from '../../../ably';
import type { PathObjectSubscriptionEvent, PathObjectSubscriptionOptions } from '../../../liveobjects';
import { ObjectMessage } from './objectmessage';
import { DefaultPathObject } from './pathobject';
import { RealtimeObject } from './realtimeobject';

/**
 * Internal subscription entry that tracks a listener and its options
 */
export interface SubscriptionEntry {
  /** The listener function to call when events match */
  listener: EventCallback<PathObjectSubscriptionEvent>;
  /** The subscription options including depth */
  options: PathObjectSubscriptionOptions;
  /** The path this subscription is registered for */
  path: string[];
}

/**
 * Event data that LiveObjects provide when notifying of changes
 */
export interface PathEvent {
  /** The path where the event occurred */
  path: string[];
  /** Object message that caused this event */
  message?: ObjectMessage;
  /** Whether this event should bubble up to parent paths. Defaults to true if not specified. */
  bubbles?: boolean;
}

/**
 * Registry for managing PathObject subscriptions and routing events to appropriate listeners.
 * Handles depth-based filtering for subscription matching.
 *
 * @internal
 */
export class PathObjectSubscriptionRegister {
  private _client: BaseClient;
  private _subscriptions: Map<string, SubscriptionEntry> = new Map();
  private _nextSubscriptionId = 0;

  constructor(private _realtimeObject: RealtimeObject) {
    this._client = this._realtimeObject.getClient();
  }

  /**
   * Registers a new subscription for the given path.
   *
   * @param path - Array of keys representing the path to subscribe to
   * @param listener - Function to call when matching events occur
   * @param options - Subscription options including depth parameter
   * @returns Unsubscribe function
   */
  subscribe(
    path: string[],
    listener: EventCallback<PathObjectSubscriptionEvent>,
    options: PathObjectSubscriptionOptions,
  ): Subscription {
    if (options == null || typeof options !== 'object') {
      throw new this._client.ErrorInfo('Subscription options must be an object', 40000, 400);
    }

    if (options.depth !== undefined && options.depth <= 0) {
      throw new this._client.ErrorInfo(
        'Subscription depth must be greater than 0 or undefined for infinite depth',
        40003,
        400,
      );
    }

    const subscriptionId = (this._nextSubscriptionId++).toString();
    const entry: SubscriptionEntry = {
      listener,
      options,
      path: [...path], // Make a copy to avoid external mutations
    };

    this._subscriptions.set(subscriptionId, entry);

    return {
      unsubscribe: () => {
        this._subscriptions.delete(subscriptionId);
      },
    };
  }

  /**
   * Notifies all matching subscriptions about an event that occurred at the specified path(s).
   *
   * @param events - Array of path events to process
   */
  notifyPathEvents(events: PathEvent[]): void {
    for (const event of events) {
      this._processEvent(event);
    }
  }

  /**
   * Processes a single path event and calls all matching subscription listeners.
   */
  private _processEvent(event: PathEvent): void {
    for (const subscription of this._subscriptions.values()) {
      if (!this._shouldNotifySubscription(subscription, event)) {
        continue;
      }

      try {
        const subscriptionEvent: PathObjectSubscriptionEvent = {
          object: new DefaultPathObject(this._realtimeObject, this._realtimeObject.getPool().getRoot(), event.path),
          message: event.message?.toUserFacingMessage(this._realtimeObject.getChannel()),
        };

        subscription.listener(subscriptionEvent);
      } catch (error) {
        // Log error but don't let one subscription failure affect others
        this._client.Logger.logAction(
          this._client.logger,
          this._client.Logger.LOG_MINOR,
          'PathObjectSubscriptionRegister._processEvent()',
          `Error in PathObject subscription listener; path=${JSON.stringify(event.path)}, error=${error}`,
        );
      }
    }
  }

  /**
   * Determines if a subscription should be notified about an event at the given path.
   * Implements depth-based filtering logic and bubbling control.
   *
   * Depth examples (when event.bubbles is true):
   * - subscription at ["users"] with depth=undefined: matches ["users"], ["users", "emma"], ["users", "emma", "visits"], etc.
   * - subscription at ["users"] with depth=1: matches ["users"] only
   * - subscription at ["users"] with depth=2: matches ["users"], ["users", "emma"] only
   * - subscription at ["users"] with depth=3: matches ["users"], ["users", "emma"], ["users", "emma", "visits"] only
   *
   * Non-bubbling examples (when event.bubbles is false):
   * - Event at ["users", "emma"] with bubbles=false:
   *   - subscription at ["users"]: NOT triggered (no bubbling to parent)
   *   - subscription at ["users", "emma"]: triggered (exact path match)
   *
   * The depth calculation is: eventPath.length - subscriptionPath.length + 1
   * This means:
   * - Same level (["users"] -> ["users"]): 1 - 1 + 1 = 1 (depth=1)
   * - One level deeper (["users"] -> ["users", "emma"]): 2 - 1 + 1 = 2 (depth=2)
   * - Two levels deeper (["users"] -> ["users", "emma", "visits"]): 3 - 1 + 1 = 3 (depth=3)
   */
  private _shouldNotifySubscription(subscription: SubscriptionEntry, event: PathEvent): boolean {
    const subPath = subscription.path;
    const eventPath = event.path;
    const depth = subscription.options.depth;
    const bubbles = event.bubbles !== false; // Default to true if not specified

    // If event doesn't bubble, only match exact paths
    if (!bubbles) {
      return this._pathsAreEqual(eventPath, subPath);
    }

    // Otherwise check if the event path starts with the subscription path
    if (!this._pathStartsWith(eventPath, subPath)) {
      return false;
    }

    // If depth is undefined, allow infinite depth
    if (depth === undefined) {
      return true;
    }

    // Otherwise calculate the relative depth from subscription path to event path
    const relativeDepth = eventPath.length - subPath.length + 1;

    // Check if the event is within the allowed depth
    return relativeDepth <= depth;
  }

  /**
   * Checks if eventPath starts with subscriptionPath.
   *
   * @param eventPath - The path where the event occurred
   * @param subscriptionPath - The path that was subscribed to
   * @returns true if eventPath starts with subscriptionPath
   */
  private _pathStartsWith(eventPath: string[], subscriptionPath: string[]): boolean {
    if (subscriptionPath.length > eventPath.length) {
      return false;
    }

    for (let i = 0; i < subscriptionPath.length; i++) {
      if (eventPath[i] !== subscriptionPath[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if two paths are exactly equal.
   *
   * @param path1 - First path to compare
   * @param path2 - Second path to compare
   * @returns true if paths are exactly equal
   */
  private _pathsAreEqual(path1: string[], path2: string[]): boolean {
    return this._client.Utils.arrEquals(path1, path2);
  }
}
