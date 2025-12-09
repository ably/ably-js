# LiveObjects migration guide for ably-js v2.16

## Overview

ably-js v2.16 introduces significant improvements to the LiveObjects API, centered around a new path-based interaction model using `PathObject`. While these are breaking changes, they provide a more intuitive and robust experience.

**Key improvements:**

- **Path-based operations**: Interact with nested objects through paths that automatically resolve at runtime
- **Resilient subscriptions**: Subscribe to paths rather than specific object instances, making subscriptions resilient to object replacements
- **Simplified object creation**: Create deeply nested object structures in a single operation without explicit management of child objects or risk of creating orphaned objects

Here's how to migrate your LiveObjects usage to the new PathObject-based API introduced in ably-js v2.16:

1. [Understanding PathObject](#understanding-pathobject)
2. [Update to v2.16 or later and handle breaking changes](#update-to-v216-or-later-and-handle-breaking-changes).
3. (Optional) [Take advantage of new Objects features that v2.16 introduces](#take-advantage-of-new-objects-features-that-v216-introduces).

## Understanding PathObject

The core concept in the new API is the `PathObject`. Unlike the previous API where you worked directly with `LiveMap` and `LiveCounter` instances, a `PathObject` represents a **path to a location** within your channel's object hierarchy.

**Why path-based?** The previous instance-based approach had several limitations:

- Traversing object hierarchy required explicit checks for nulls to check if an object exists
- Instance-level subscriptions broke when an object at a path was replaced with a new instance
- Instance-level subscriptions for collection types lacked the ability to subscribe and receive updates for nested child objects

With `PathObject`, operations are evaluated against the current value at a path **when the operation is invoked**, not when the `PathObject` is created. This makes your code more resilient to changes in the object structure.

## Update to v2.16 or later and handle breaking changes

Begin by updating to ably-js version 2.16.0 or later.

Now, you need to address the breaking changes introduced by v2.16. Here we explain how.

The changes below are split into:

- general changes
- changes that only affect TypeScript users

### General changes

#### Update the entrypoint: `channel.objects` → `channel.object`

The API entrypoint has changed from plural `objects` to singular `object`, reflecting the single entry object per channel model.

**Before:**
```typescript
const channelObjects = channel.objects;
```

**After:**
```typescript
const channelObject = channel.object;
```

#### Replace `getRoot()` with `get()` and use `PathObject`

The `getRoot()` method has been replaced with `get()`, which returns a `PathObject` representing the entrypoint for your channel's object hierarchy.

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

**Accessing nested paths with `PathObject`:**

```typescript
// Chain .get() calls to navigate nested structures
const shape = myObject.get('shape');
const colour = myObject.get('shape').get('colour');
const border = myObject.get('shape').get('colour').get('border');

// Or use .at() to get a PathObject for a fully-qualified string path
const border = myObject.at('shape.colour.border');
```

**Understanding PathObject runtime resolution:**

The key difference with `PathObject` is that **operations resolve the path at runtime** when the method is called. This means:

- **Obtaining a PathObject never fails** - even if nothing exists at that path yet:
  ```typescript
  const shape = myObject.get('shape'); // Always succeeds, even if 'shape' doesn't exist
  ```

- **Access methods return empty defaults** when the path doesn't resolve to an appropriate object at runtime:
  ```typescript
  // If 'visits' doesn't exist or isn't a LiveCounter
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

This design allows you to safely create PathObjects and use access methods without extensive error checking, while mutation methods will fail fast if the path or type is incorrect at runtime.

#### Retrieve primitive values using `.value()`

To get the actual primitive value at a path, call `.value()` on the `PathObject`.

**Before:**
```typescript
const root = await channel.objects.getRoot();
const name = root.get('name'); // 'Alice'
```

**After:**
```typescript
const myObject = await channel.object.get();
const name = myObject.get('name').value(); // 'Alice'
// for counters, .value() still returns the counter value
const visitsCount = myObject.get('visits').value();
```

**Note:** `.value()` returns `undefined` if the value at the path is a LiveMap rather than a primitive or a LiveCounter.

#### Create objects using static `.create()` methods

Object creation now uses static factory methods (`LiveMap.create()` and `LiveCounter.create()`) and is always done in the context of setting a value at a path.

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
import { LiveCounter, LiveMap } from 'ably/objects';

const myObject = await channel.object.get();
await myObject.set('visits', LiveCounter.create(0));
await myObject.set('user', LiveMap.create({ name: 'Alice' }));
```

**Creating deeply nested structures:**

The new API allows you to create entire nested structures in a single operation:

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
await myObject.set('shape', LiveMap.create({
  name: 'circle',
  radius: 10,
  colour: LiveMap.create({
    border: 'red',
    fill: 'blue'
  })
}));
```

#### Update subscription signatures to receive operation context

Subscriptions now provide richer information about what changed, including the operation message that caused the update.

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
  // object: PathObject representing the updated path
  // message: ObjectMessage that carried the operation that led to the change, if applicable
  console.log('Updated path:', object.path());
  console.log('Operation:', message.operation);
  console.log('Client ID:', message.clientId);
  console.log('Connection ID:', message.connectionId);
});
```

**Path-based subscriptions with depth:**

Subscriptions can now observe changes at any depth below a path:

```typescript
// Subscribe to all changes within myObject - infinite depth (default behavior)
myObject.subscribe(({ object, message }) => {
  console.log('Something changed at:', object.path());
});

// Subscribe only to changes on this object - depth 1
myObject.subscribe(({ object, message }) => {
  console.log('This object changed:', object.path());
}, { depth: 1 });
```

#### Update batch API to use PathObject and `.create()` methods

The batch API now supports the new PathObject-based operations and object creation.

**Before:**
```typescript
// Object creation was not supported in batch, objects had to be created before calling .batch() method
const counter = await channel.objects.createCounter(100);

await channel.objects.batch((ctx) => {
  const root = ctx.getRoot();
  root.set('name', 'Alice');
  root.set('score', counter);
});
```

**After:**
```typescript
await channel.object.get().batch((ctx) => {
  // Object creation is now supported inside a batch
  ctx.set('name', 'Alice');
  ctx.set('score', LiveCounter.create(100));
  ctx.set('metadata', LiveMap.create({
    timestamp: Date.now().toString(),
    version: '1.0'
  }));
});
```

#### Access explicit object instances using `.instance()`

If you need to work with a specific `LiveMap` or `LiveCounter` instance (rather than a path), use the `.instance()` method.

**Use cases for `.instance()`:**

- When you want to track a specific object even as it moves in a collection
- When you need to access instance-specific metadata like `id()`

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

// Option 1: Use PathObject for path-based operations (recommended)
await myObject.get('players').get('player1').set('score', 100);

// Option 2: Get the explicit instance
const player = myObject.get('players').get('player1').instance();
// player is a LiveMap | undefined
if (player) {
  console.log(player.id()); // map:...
  await player.set('score', 100);
}
```

**Key difference:** `PathObject` methods resolve the object at the path each time they're called. `Instance` methods always operate on the same specific object instance.

**Understanding Instance runtime type checking:**

The `Instance` class behaves similarly to `PathObject` in terms of error handling, but operates on a specific object instance:

- **`.instance()` returns `undefined`** if no object exists at the path:
  ```typescript
  const player = myObject.get('nonexistent').instance();
  // player is undefined
  ```

- **Access methods return empty defaults** when called on the wrong instance type:
  ```typescript
  // Assume 'visits' is a LiveCounter, not a LiveMap
  const visits = myObject.get('visits').instance(); // Returns LiveCounter instance

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

**Instance subscriptions:**

You can still subscribe to specific object instances:

```typescript
const player = myObject.get('players').get('player1').instance();
if (player) {
  player.subscribe(({ object, message }) => {
    // Notified when this specific player instance changes
    // Automatically unsubscribed if the instance is deleted as part of the garbage collection procedure
  });
}
```

### Only TypeScript users

#### Update interface name: `Objects` → `RealtimeObject`

The `Objects` interface has been renamed to `RealtimeObject` for clarity and consistency with other Realtime types.

**Before:**
```typescript
import Ably from 'ably';
import Objects from 'ably/objects';

const client = new Ably.Realtime({
  key: 'your-key',
  plugins: { Objects }
});

const objectsAPI: Ably.Objects = channel.objects;
```

**After:**
```typescript
// The import and usage remain the same, only the interface name in TypeScript changes
import Ably from 'ably';
import Objects from 'ably/objects';

const client = new Ably.Realtime({
  key: 'your-key',
  plugins: { Objects }
});

// In TypeScript, the interface is now called RealtimeObject
const objectAPI: Ably.RealtimeObject = channel.object;
```

#### Remove usage of `AblyObjectsTypes` global

In v2.16, the global `AblyObjectsTypes` type has been removed. You must now provide type parameters that describe your object on a channel explicitly when calling `channel.object.get<T>()`.

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
import { LiveCounter, LiveMap } from 'ably';

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

## Take advantage of new Objects features that v2.16 introduces

### Object compact representation with `.compact()`

The `.compact()` method returns a regular JavaScript object representation of a LiveObject or value at a path, similar to the Objects REST API's compact format.

```typescript
const myObject = await channel.object.get();
await myObject.set('shape', LiveMap.create({
  name: 'circle',
  radius: 10,
  colour: LiveMap.create({
    border: 'red',
    fill: 'blue'
  })
}));

const compactRepresentation = myObject.get('shape').compact();
// Returns:
// {
//   "name": "circle",
//   "radius": 10,
//   "colour": {
//     "border": "red",
//     "fill": "blue"
//   }
// }

// Also works on instances
const shape = myObject.get('shape').instance();
if (shape) {
  const compact = shape.compact(); // Same result
}
```

The `.compact()` method automatically handles:

- Nested LiveMaps and LiveCounters
- Primitive values. Binary data is encoded as base64 strings
- Cyclic references - returning shared compacted object references for previously visited objects (points to the same compacted object)

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

### Implicit channel attach on `.get()` call

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
