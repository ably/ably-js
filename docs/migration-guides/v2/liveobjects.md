# LiveObjects migration guide for ably-js v2.16

## Overview

ably-js v2.16 introduces significant improvements to the LiveObjects API, centered around a new path-based interaction model using `PathObject`. While these are breaking changes, they provide a more intuitive and robust experience.

**Key improvements:**

- **Path-based operations**: Interact with nested objects through paths that automatically resolve at runtime
- **Resilient subscriptions**: Subscribe to paths rather than specific object instances, making subscriptions resilient to object replacements
- **Simplified object creation**: Create deeply nested object structures in a single operation without explicit management of child objects or risk of creating orphaned objects

Here's how to migrate your LiveObjects usage to the new PathObject-based API introduced in ably-js v2.16:

1. [Understand `PathObject`](#understand-pathobject).
2. [Update to v2.16 or later and handle breaking changes](#update-to-v216-or-later-and-handle-breaking-changes).
3. (Optional) [Take advantage of new LiveObjects features that v2.16 introduces](#take-advantage-of-new-liveobjects-features-that-v216-introduces).
4. (Optional) Check out [common migration patterns](#common-migration-patterns) for a quick reference.

## Understand `PathObject`

The core concept in the new API is the `PathObject`. Unlike the previous API where you worked directly with `LiveMap` and `LiveCounter` instances, a `PathObject` represents a **path to a location** within your channel's object hierarchy.

**Why path-based?** The previous instance-based approach had several limitations:

- Traversing object hierarchy required explicit checks for nulls to check if an object exists
- Instance-level subscriptions broke when an object at a path was replaced with a new instance
- Instance-level subscriptions for collection types lacked the ability to subscribe and receive updates for nested child objects

With `PathObject`, operations are evaluated against the current value at a path **when the operation is invoked**, not when the `PathObject` is created. This makes your code more resilient to changes in the object structure.

You can still access the specific underlying `Instance` using [`PathObject.instance()`](#access-explicit-object-instances-using-instance) when needed.

## Update to v2.16 or later and handle breaking changes

Begin by updating to ably-js version 2.16.0 or later.

Now, you need to address the breaking changes introduced by v2.16. Here we explain how.

The changes below are split into:

- [general changes](#general-changes)
- [changes that only affect TypeScript users](#only-typescript-users)

### General changes

#### Update LiveObjects plugin import

The LiveObjects plugin import has changed in several ways:

1. The import path has changed from `'ably/objects'` to `'ably/liveobjects'`
2. The plugin is now a named export instead of a default export
3. The plugin name has changed from `Objects` to `LiveObjects`, which also affects the key used in the `plugins` client option

**Before:**

```typescript
import * as Ably from 'ably';
import Objects from 'ably/objects';

const client = new Ably.Realtime({
  key: 'your-api-key',
  plugins: { Objects },
});
```

**After:**

```typescript
import * as Ably from 'ably';
import { LiveObjects } from 'ably/liveobjects';

const client = new Ably.Realtime({
  key: 'your-api-key',
  plugins: { LiveObjects },
});
```

**Note:** If you're using the UMD bundle via a `<script>` tag:

- The bundle filename has changed from `objects.umd.js` to `liveobjects.umd.js` (e.g., `https://cdn.ably.com/lib/liveobjects.umd.min-2.js` instead of `https://cdn.ably.com/lib/objects.umd.min-2.js`)
- The global variable name is now `AblyLiveObjectsPlugin` instead of `AblyObjectsPlugin`

#### Update the entrypoint: `channel.objects` → `channel.object`

The API entrypoint has changed from plural `channel.objects` to singular `channel.object`, reflecting the single entry object per channel model.

**Before:**

```typescript
const channelObjects = channel.objects;
```

**After:**

```typescript
const channelObject = channel.object;
```

#### Replace `getRoot()` with `get()` and use `PathObject`

The `objects.getRoot()` method has been replaced with `object.get()`, which returns a `PathObject` representing the entrypoint for your channel's object hierarchy.

**Before:**

```typescript
// root is a LiveMap instance
const root = await channel.objects.getRoot();

const childEntry = root.get('child'); // returns a LiveMap, LiveCounter, or a Primitive value
```

**After:**

```typescript
// myObject is a PathObject<LiveMap>
const myObject = await channel.object.get();

const childPathObject = myObject.get('child'); // returns a PathObject for a "child" path
```

**Access nested paths with `PathObject`:**

```typescript
// Chain .get() calls to navigate nested structures
const shape = myObject.get('shape');
const colour = myObject.get('shape').get('colour');
const border = myObject.get('shape').get('colour').get('border');

// Or use .at() to get a PathObject for a fully-qualified string path
const border = myObject.at('shape.colour.border');

// Call .path() to get a fully-qualified string path for a location
const path = myObject.get('shape').get('colour').get('border').path(); // shape.colour.border
```

**Understand `PathObject` runtime resolution:**

The key difference with `PathObject` is that **operations resolve the path at runtime** when the method is called. This means:

- **Obtaining a `PathObject` never fails** - even if nothing exists at that path yet:

  ```typescript
  const shape = myObject.get('shape'); // Always succeeds, even if 'shape' doesn't exist
  ```

- **Access methods return empty defaults** when the path doesn't resolve to an appropriate object at runtime:

  ```typescript
  // If 'visits' doesn't exist or isn't a primitive or a LiveCounter
  const visits = myObject.get('visits').value(); // undefined

  // If 'players' doesn't exist or isn't a LiveMap
  for (const [key, player] of myObject.get('players').entries()) {
    // Empty iterator - loop body never executes
  }
  ```

- **Mutation methods throw errors** when the path doesn't resolve to an appropriate object at runtime:

  ```typescript
  // If 'visits' doesn't exist at all
  await myObject.get('visits').increment(1);
  // Throws: path resolution error - Could not resolve value at path

  // If 'visits' exists but is not LiveCounter
  await myObject.get('visits').increment(1);
  // Throws: operation error - Cannot increment a non-LiveCounter object
  ```

This design enables you to safely create PathObjects and use access methods without extensive error checking, while mutation methods will fail fast if the path or type is incorrect at runtime.

#### Retrieve primitive values using `.value()`

Since `PathObject` and `Instance` now wrap underlying LiveObjects and primitive values, you need to call `.value()` to retrieve the actual value of a primitive or a LiveCounter.

**Before:**

```typescript
const root = await channel.objects.getRoot();
const name = root.get('name'); // 'Alice'
```

**After:**

```typescript
const myObject = await channel.object.get();
const name = myObject.get('name').value(); // 'Alice'
// For counters, .value() returns the counter's numeric value
const visitsCount = myObject.get('visits').value(); // 42
```

**Note:** `.value()` returns `undefined` if the value at the path is not a primitive or a LiveCounter.

#### Create objects using static `LiveCounter.create()` and `LiveMap.create()` methods

The `channel.objects.createCounter()` and `channel.objects.createMap()` methods have been removed. To create new objects, use the static factory methods `LiveCounter.create()` and `LiveMap.create()` to define the initial data, then pass the returned value types to mutation methods when setting a value in a collection.

**Before:**

```typescript
const root = await channel.objects.getRoot();
const counter = await channel.objects.createCounter(0);
const map = await channel.objects.createMap({ name: 'Alice' });
await root.set('visits', counter);
await root.set('user', map);
```

**After:**

```typescript
import { LiveCounter, LiveMap } from 'ably/liveobjects';

const myObject = await channel.object.get();
await myObject.set('visits', LiveCounter.create(0));
await myObject.set('user', LiveMap.create({ name: 'Alice' }));
```

**Create deeply nested structures:**

These static factory methods enable you to create entire nested structures in a single operation:

**Before:**

```typescript
const root = await channel.objects.getRoot();
const colour = await channel.objects.createMap({ border: 'red', fill: 'blue' });
const shape = await channel.objects.createMap({ name: 'circle', radius: 10, colour });
await root.set('shape', shape);
```

**After:**

```typescript
const myObject = await channel.object.get();
await myObject.set(
  'shape',
  LiveMap.create({
    name: 'circle',
    radius: 10,
    colour: LiveMap.create({
      border: 'red',
      fill: 'blue',
    }),
  }),
);
```

**Note:** `LiveMap.create()` and `LiveCounter.create()` return value types that describe the initial data for an object to be created when assigned to a collection. The actual LiveObject is created during the assignment operation. If you reuse the same value type in multiple assignments, each assignment will create a distinct LiveObject with its own unique object ID, rather than pointing to the same object:

```typescript
const myObject = await channel.object.get();

const counterValue = LiveCounter.create(0);
await myObject.set('visits', counterValue); // Creates LiveCounter A with ID "counter:abc..."
await myObject.set('downloads', counterValue); // Creates LiveCounter B with ID "counter:xyz..."
// Result: Two separate LiveCounter objects, each with different IDs
```

#### Update subscription signatures to receive operation context

The subscription callback signature has changed to provide more complete information. Previously, callbacks received a partial update object with limited operation metadata. Now, callbacks receive a structured context containing:

1. **`message`**: The complete `ObjectMessage` that carried the operation that led to the change
2. **`object`**: A reference to the updated `PathObject` or `Instance`, particularly useful for [deep subscriptions](#path-based-subscriptions-with-depth) to identify which nested object changed

**Before:**

```typescript
const root = await channel.objects.getRoot();
const counter = root.get('visits');
counter.subscribe((update) => {
  // update: { update: { amount: 5 }, clientId: 'my-client-id', connectionId: '...' }
  console.log('Counter changed by:', update.update.amount);
});

const shape = root.get('shape');
shape.subscribe((update) => {
  // update: { update: { "colour": "updated", "size": "removed" }, clientId: 'my-client-id', connectionId: '...' }
  console.log('Map changed:', update);
});
```

**After:**

```typescript
const myObject = await channel.object.get();

myObject.get('visits').subscribe(({ object, message }) => {
  // object: PathObject representing the path at which there was an object change
  // message: ObjectMessage that carried the operation that led to the change, if applicable
  console.log('Updated path:', object.path());
  console.log('Operation:', message.operation);
  console.log('Client ID:', message.clientId);
  console.log('Connection ID:', message.connectionId);
});
```

##### Path-based subscriptions with depth

Subscriptions on a `PathObject` can now observe changes at any depth below a path. The `.subscribe()` method now accepts an options object to configure the subscription depth:

```typescript
// Subscribe to all changes within myObject - infinite depth (default behavior)
myObject.subscribe(({ object, message }) => {
  console.log('Something changed at:', object.path());
});

// Subscribe only to changes on this object - depth 1
myObject.subscribe(
  ({ object, message }) => {
    console.log('This object changed:', object.path());
  },
  { depth: 1 },
);
```

#### Stop using lifecycle event subscriptions on LiveObject

LiveObjects no longer provide lifecycle events API for `deleted` events. Instead, deleted events are emitted via the regular subscription flow. As a result, LiveObject `.on()`, `.off()`, and `.offAll()` methods have been removed.

The `deleted` lifecycle event is now observable via regular subscriptions by checking `ObjectMessage.operation.action` equals `object.delete`.

**Before:**

```typescript
const root = await channel.objects.getRoot();
const shape = root.get('shape');

// Subscribe to 'deleted' lifecycle event
shape.on('deleted', () => {
  console.log('Object was deleted');
});
```

**After:**

```typescript
const myObject = await channel.object.get();

// Subscribe to changes and check for delete operations
myObject.get('shape').subscribe(({ object, message }) => {
  if (message?.operation.action === 'object.delete') {
    console.log('Object was deleted');
  }
});
```

#### Replace `unsubscribeAll()` with individual subscription management

The `unsubscribeAll()` method has been removed from LiveObject subscriptions. Instead, use the `unsubscribe()` method on individual `Subscription` objects returned by `.subscribe()` to deregister specific listeners.

**Before:**

```typescript
const root = await channel.objects.getRoot();
const visits = root.get('visits');

visits.subscribe((update) => console.log('Update 1', update));
visits.subscribe((update) => console.log('Update 2', update));

// Unsubscribe all listeners at once
visits.unsubscribeAll();
```

**After:**

```typescript
const myObject = await channel.object.get();
const visits = myObject.get('visits');

const subscription1 = visits.subscribe(({ object, message }) => console.log('Update 1', message));
const subscription2 = visits.subscribe(({ object, message }) => console.log('Update 2', message));

// Unsubscribe each listener individually
subscription1.unsubscribe();
subscription2.unsubscribe();
```

#### Replace `offAll()` with individual listener management

The `offAll()` method has been removed from the `RealtimeObject` status event API. Instead, deregister listeners individually using either the subscription object returned by `.on()`, or by calling `.off(event, callback)` with the callback reference.

**Before:**

```typescript
const channelObjects = channel.objects;

channelObjects.on('synced', () => console.log('Synced 1'));
channelObjects.on('synced', () => console.log('Synced 2'));

// Unregister all listeners at once
channelObjects.offAll();
```

**After:**

```typescript
const channelObject = channel.object;

// Option 1: Use the subscription object returned by .on()
const subscription1 = channelObject.on('synced', () => console.log('Synced 1'));
subscription1.off();

// Option 2: Use .off(event, callback) with a callback reference
const onSynced2 = () => console.log('Synced 2');
channelObject.on('synced', onSynced2);
channelObject.off('synced', onSynced2);
```

#### Change usage of `objects.batch()` to `PathObject.batch()`/`Instance.batch()`

The batch API, previously available at `channel.objects.batch()`, is now available as a `.batch()` method on any `PathObject` or `Instance` instead. It now supports object creation inside a batch function.

The batch context has the same API as the `Instance` class, except for `batch()` itself, with one key difference: **all mutation methods are synchronous**, just like in the previous version of `.batch()`.

**Before:**

```typescript
// Object creation was not supported in batch, objects had to be created before calling the .batch() method
const counter = await channel.objects.createCounter(100);

// Batch can only be called on channel.objects
await channel.objects.batch((ctx) => {
  const root = ctx.getRoot();
  root.set('name', 'Alice');
  root.set('score', counter);
});
```

**After:**

```typescript
const myObject = await channel.object.get();

// Batch is available on any PathObject or Instance - operations execute in that object's context
await myObject
  .get('shape')
  .get('colour')
  .batch((ctx) => {
    ctx.set('border', 'green');
    ctx.set('fill', 'yellow');
  });

// Batch on Instance
const shape = myObject.get('shape').instance();
if (shape) {
  await shape.batch((ctx) => {
    ctx.set('name', 'square');
    ctx.set('size', 50);
  });
}

await myObject.batch((ctx) => {
  // Object creation is now supported inside a batch
  ctx.set('score', LiveCounter.create(100));
  ctx.set(
    'metadata',
    LiveMap.create({
      timestamp: Date.now().toString(),
      version: '1.0',
    }),
  );
});
```

#### Access explicit object instances using `.instance()`

If you need to work with a specific `LiveMap` or `LiveCounter` instance (rather than a path), use the `.instance()` method.

**When to use `.instance()`:**

In most scenarios, using `PathObject` is recommended as it provides path-based operations that are resilient to object replacements. However, `.instance()` is useful when you need to:

1. **Subscribe to a specific instance regardless of its location**: Instance subscriptions follow the object even if it moves within the hierarchy or is stored in different map keys.

2. **Get the underlying object ID for REST API operations**: Each LiveMap and LiveCounter has a unique object ID (accessible via the `.id` property) that can be used with the LiveObjects REST API.

**Before:**

```typescript
const root = await channel.objects.getRoot();
const player = root.get('players').get('player1');
// player is a LiveMap instance
await player.set('score', 100);
```

**After:**

```typescript
const myObject = await channel.object.get();

// Option 1: Use PathObject for path-based operations (recommended for most cases)
await myObject.get('players').get('player1').set('score', 100);

// Option 2: Get the explicit instance when you need the object ID or instance subscriptions
const player = myObject.get('players').get('player1').instance();
// player is an Instance<LiveMap> | undefined
if (player) {
  // Get object ID for REST API operations
  const objectId = player.id; // e.g., "map:abc123..."

  // Subscribe to this instance, tracking it wherever it moves
  player.subscribe(({ object, message }) => {
    // Notified about changes to this specific player instance
    // even if it's moved to a different key (e.g., from 'player1' to 'player2')
  });

  await player.set('score', 100);
}
```

**Key difference:** `PathObject` methods resolve the object at the path each time they're called. `Instance` methods always operate on the same specific object instance.

**Understand `Instance` runtime type checking:**

The `Instance` class behaves similarly to `PathObject` in terms of error handling, but operates on a specific object instance:

- **`.instance()` returns `undefined`** if no object exists at the path:

  ```typescript
  const player = myObject.get('nonexistent').instance();
  // player is undefined
  ```

- **Access methods return empty defaults** when called on the wrong instance type:

  ```typescript
  // Assume 'visits' is a LiveCounter, not a LiveMap
  const visits = myObject.get('visits').instance(); // Returns Instance<LiveCounter>

  // Calling LiveMap-specific methods returns empty defaults
  for (const [key, value] of visits.entries()) {
    // Empty iterator - loop body never executes
  }

  const size = visits.size(); // Returns undefined
  ```

- **Mutation methods throw errors** when called on the wrong instance type:

  ```typescript
  // Assume 'metadata' is a LiveMap, not a LiveCounter
  const metadata = myObject.get('metadata').instance(); // Returns LiveMap instance

  // Calling LiveCounter-specific mutation throws an error
  await metadata.increment(1);
  // Throws: operation error - Cannot increment a non-LiveCounter instance
  ```

**Note:** The old API returned explicit `LiveMap` and `LiveCounter` instances directly. The new `Instance` class wraps these and provides the unified error handling behavior described above.

### Only TypeScript users

#### Update imports for LiveObjects types

All LiveObjects-related types have been moved from the `'ably'` export to `'ably/liveobjects'`. This consolidates all LiveObjects functionality in one place.

**Before:**

```typescript
import { Objects, LiveCounter, LiveMap } from 'ably';
```

**After:**

```typescript
import { RealtimeObject, LiveCounter, LiveMap } from 'ably/liveobjects';
```

#### Stop using global `AblyObjectsTypes` interface

The global `AblyObjectsTypes` interface has been removed. You should now provide a type parameter that describes your object on a channel explicitly when calling `channel.object.get<T>()`.

**Before:**

```typescript
import { LiveCounter, LiveMap } from 'ably';

declare global {
  interface AblyObjectsTypes {
    root: {
      players: LiveMap<{ name: string; score: LiveCounter }>;
      status: string;
    };
  }
}

const root = await channel.objects.getRoot(); // Automatically typed
```

**After:**

```typescript
import { LiveCounter, LiveMap } from 'ably/liveobjects';

type GameState = {
  players: LiveMap<{ name: string; score: LiveCounter }>;
  status: string;
};

const myObject = await channel.object.get<GameState>();
// myObject is now PathObject<LiveMap<GameState>>
```

The new PathObject API makes extensive use of TypeScript generics to provide type safety at compilation time. You can specify the expected shape of your objects and expect all PathObject and Instance API methods to correctly resolve the underlying type hierarchy:

```typescript
type UserProfile = {
  name: string;
  age: number;
  settings: LiveMap<{
    theme: string;
    notifications: boolean;
  }>;
  loginCount: LiveCounter;
};

const myObject = await channel.object.get<UserProfile>();

// TypeScript knows the structure
const name: string = myObject.get('name').value();
const settings = myObject.get('settings'); // PathObject<LiveMap<{ theme: string; notifications: boolean }>>
const theme: string = settings.get('theme').value();
const loginCount = myObject.get('loginCount'); // PathObject<LiveCounter>
const settingsCompact = settings.compact(); // { theme: string; notifications: boolean }
```

#### Update imports for renamed types

The following types have been renamed for clarity and consistency:

- `Objects` → `RealtimeObject`
- `OnObjectsEventResponse` → `StatusSubscription`
- `PrimitiveObjectValue` → `Primitive`
- `SubscribeResponse` → `Subscription`

#### Stop referring to removed types

The following types have been removed:

- `DefaultRoot`
- `LiveMapType`
- `LiveObjectUpdateCallback` - replaced by `EventCallback<T>` in the subscription API
- `LiveMapUpdate`, `LiveCounterUpdate`, `LiveObjectUpdate` - replaced by `PathObjectSubscriptionEvent` and `InstanceSubscriptionEvent` for `PathObject` and `Instance` subscription callbacks
- `LiveObjectLifecycleEvents` namespace and `LiveObjectLifecycleEvent` type - removed along with [LiveObject lifecycle events](#stop-using-lifecycle-event-subscriptions-on-liveobject)
- `LiveObjectLifecycleEventCallback` and `OnLiveObjectLifecycleEventResponse`
- `BatchCallback` - replaced by `BatchFunction<T>` in the batch API
- `BatchContextLiveMap` and `BatchContextLiveCounter`

#### Be aware of changes to LiveMap, LiveCounter, and LiveObject interfaces

The `LiveMap` and `LiveCounter` interfaces have been redesigned as empty branded interfaces used solely for type identification. They no longer provide concrete methods. The actual API surface for objects is now available through the `PathObject` and `Instance` types.

Additionally, `LiveObject` is now a union type: `LiveObject = LiveMap | LiveCounter`, and the `LiveMap` type parameter has changed from `LiveMap<T extends LiveMapType>` to `LiveMap<T extends Record<string, Value>>`.

To access the API methods, use `PathObject` or `Instance` types instead of working with the interfaces directly (for example, `PathObject<LiveMap<T>>` or `Instance<LiveCounter>`).

#### Be aware of changes to the BatchContext interface

The `BatchContext` interface has been redesigned as a generic type `BatchContext<T>` that operates on a specific object instance within a `BatchFunction`.

Key changes:

- The `getRoot()` method has been removed
- The context provides API methods corresponding to the underlying instance type (e.g., `BatchContext<LiveMap<T>>` provides LiveMap operations, `BatchContext<LiveCounter>` provides LiveCounter operations)

### Common migration patterns

#### Reading values

**Before:**

```typescript
const root = await channel.objects.getRoot();
const username = root.get('user').get('name'); // 'Alice'
const visits = root.get('visits').value(); // 42
```

**After:**

```typescript
const myObject = await channel.object.get();
const username = myObject.get('user').get('name').value(); // 'Alice'
const visits = myObject.get('visits').value(); // 42
```

#### Updating values

**Before:**

```typescript
const root = await channel.objects.getRoot();
await root.get('user').set('name', 'Bob');
await root.get('visits').increment(1);
```

**After:**

```typescript
const myObject = await channel.object.get();
await myObject.get('user').set('name', 'Bob');
await myObject.get('visits').increment(1);
```

#### Observing changes to a specific location

**Before:**

```typescript
const root = await channel.objects.getRoot();
let subscription = root.get('currentUser').subscribe(onUserUpdate);

// If currentUser is replaced, need to re-subscribe
root.subscribe((update) => {
  if (update.currentUser === 'updated') {
    subscription.unsubscribe();
    subscription = root.get('currentUser').subscribe(onUserUpdate);
  }
});
```

**After:**

```typescript
const myObject = await channel.object.get();

// PathObject subscription is resilient to instance changes
myObject.get('currentUser').subscribe(({ object, message }) => {
  // Always observes whatever is at the 'currentUser' path
  onUserUpdate(object, message);
});
```

#### Working with a specific object instance

**Before:**

```typescript
const root = await channel.objects.getRoot();
const leaderboard = root.get('leaderboard');
const player = leaderboard.get(0);

// Subscribe to a specific player instance
player.subscribe((update) => {
  // Follows this player even if they move in the leaderboard
});
```

**After:**

```typescript
const myObject = await channel.object.get();
const player = myObject.get('leaderboard').get(0).instance();

if (player) {
  player.subscribe(({ object, message }) => {
    // Follows this specific player instance
  });
}
```

## Take advantage of new LiveObjects features that v2.16 introduces

### Implicit channel attach on `object.get()` call

Previously, you needed to explicitly call `await channel.attach()` before accessing objects. The `channel.object.get()` method now performs an implicit attach, preventing a common issue where forgetting to attach would cause `channel.objects.getRoot()` call to hang indefinitely.

**Before:**

```typescript
await channel.attach(); // Explicit attach required - forgetting this would cause hangs
const root = await channel.objects.getRoot();
```

**After:**

```typescript
// No explicit attach needed - .get() handles it automatically
const myObject = await channel.object.get();
// The channel is automatically attached and synced
```

### Object compact representation with `.compact()` and `.compactJson()`

Two methods are available for converting LiveObjects to plain JavaScript objects:

- `.compact()` - returns an in-memory JavaScript object representation, presenting binary data as buffers (`Buffer` in Node.js, `ArrayBuffer` elsewhere) and using direct object references for cyclic structures
- `.compactJson()` - returns a JSON-serializable representation, encoding binary data as base64 strings and representing cyclic references as `{ objectId: string }`

#### Use `.compact()` to get in-memory object representation

```typescript
const myObject = await channel.object.get();
await myObject.set(
  'gameState',
  LiveMap.create({
    playerName: 'Alice',
    score: LiveCounter.create(100),
    avatar: new ArrayBuffer(8), // Binary data
    settings: LiveMap.create({
      theme: 'dark',
      volume: 80,
    }),
  }),
);

const compactRepresentation = myObject.get('gameState').compact();
// Returns:
// {
//   playerName: "Alice",
//   score: 100,                       // LiveCounter compacted to number
//   avatar: ArrayBuffer(8),
//   settings: {
//     theme: "dark",
//     volume: 80
//   }
// }

// Also works on instances
const gameState = myObject.get('gameState').instance();
if (gameState) {
  const compact = gameState.compact(); // Same result
}

// Individual counter compact
const score = myObject.get('gameState').get('score').compact(); // Returns: 100
```

#### Use `.compactJson()` to get JSON-serializable representation

Use `.compactJson()` when you need a JSON-serializable representation:

```typescript
const compactJson = myObject.get('gameState').compactJson();
// Returns:
// {
//   "playerName": "Alice",
//   "score": 100,
//   "avatar": "AAAAAAAAAAA=",         // binary data encoded as base64 string
//   "settings": {
//     "theme": "dark",
//     "volume": 80
//   }
// }

// Safe to serialize
const jsonString = JSON.stringify(compactJson);
```

### Async iterator API for subscriptions

You can now use async iterators with subscriptions, providing a modern way to handle updates.

```typescript
const myObject = await channel.object.get();

// Use for await...of to iterate over updates
for await (const { object, message } of myObject.subscribeIterator()) {
  console.log('Change at path:', object.path());
  console.log('Operation:', message.operation);

  // Break based on some condition
  if (shouldStop) {
    break; // This will automatically unsubscribe
  }
}
```

With depth control:

```typescript
// Only observe object-level changes
for await (const { object, message } of myObject.subscribeIterator({ depth: 1 })) {
  console.log('Object-level change:', object.path());
}
```
