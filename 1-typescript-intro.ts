import { RealtimeChannel, LiveMap, LiveCounter } from './ably'

// Let's start with a recap of the fundamentals of how TypeScript typings work in the path-based API.

// Throughout all our examples, we'll consider a channel whose Objects data has the following simple schema:
type MyChannelObject = {
    topLevelCounter: LiveCounter,
    topLevelMap: LiveMap<{
        nestedEntry: string
    }>
}

// This schema should be sufficient to illustrate some of the difficulties we face in Swift.

async function exampleWithUserTypes(channel: RealtimeChannel) {
    // In TypeScript:
    // - `object` has type LiveMapPathObject<MyChannelObject>
    // - when calling `.get(key)` on this object, the compiler will only let you pass known keys (that is, "topLevelCounter" and "topLevelMap")
    const object = await channel.object.get<MyChannelObject>()

    // In TypeScript:
    // - `topLevelCounter` has type LiveCounterPathObject
    // - the compiler will not let you call any LiveMap methods on it (e.g. `entries()`, `set()`)
    const topLevelCounter = object.get("topLevelCounter")

    // In TypeScript:
    // - `topLevelMap` has type LiveMapPathObject<{ nestedEntry: string }>
    // - the compiler will not let you call any LiveCounter methods on it (e.g. `increment()`)
    // - when calling `.get(key)` on this object, the compiler will only let you pass known keys (that is, "nestedEntry")
    const topLevelMap = object.get("topLevelMap")

    // In TypeScript:
    // - `nestedEntry` has type PrimitivePathObject<string>
    // - `nestedEntry.value()` returns `string | undefined`
    const nestedEntry = topLevelMap.get("nestedEntry");
}

async function exampleWithNoUserTypes(channel: RealtimeChannel) {
    // In TypeScript:
    // - `object` has type LiveMapPathObject<string, Value>
    // - when calling `.get(key)` on this object, the compiler will let you pass any string key
    const object = await channel.object.get()

    // In TypeScript:
    // - both `topLevelCounter` and `topLevelMap` have type AnyPathObject
    // - the compiler will let you call any LiveCounter or LiveMap method on either of them (e.g. `increment()`, `entries()`, `set()`)
    // - when calling `.get(key)` on these objects, the compiler will let you pass any string key
    const topLevelCounter = object.get("topLevelCounter")
    const topLevelMap = object.get("topLevelMap")

    // In TypeScript:
    // - `nestedEntry` has type AnyPathObject
    // - `nestedEntry.value()` returns `Primitive | undefined`
    const nestedEntry = topLevelMap.get("nestedEntry")
}

// The runtime type of the `object`, `topLevelCounter`, `topLevelMap`, and `nestedEntry` types is identical in the two above examples (because TypeScript types do not affect the generated JavaScript).
