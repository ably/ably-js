// Now let's think about how we'd do the user-types example in Swift.

// (Until yesterday I had just decided this was not even worth trying, but let's briefly think it through, to think about whether we want to explore it further and whether we face similar challenges in Kotlin.)

func exampleWithUserTypes(channel: ARTRealtimeChannel) async throws {
    let object = try await channel.object.get<MyChannelObject>()

    // Immediately we run into our first problem: what is MyChannelObject in Swift?
}

// That is, what are our options for representing the following TypeScript type?

/*
type MyChannelObject = {
    topLevelCounter: LiveCounter,
    topLevelMap: LiveMap<{
        nestedEntry: string
    }>
}
*/

// The closest would be one of the following options:

// 1. A concrete class or struct

// e.g.

class MyChannelObject {
    var topLevelCounter: LiveCounter
    var topLevelMap: TopLevelMap

    class TopLevelMap {
        var nestedEntry: String
    }
}

// or

struct MyChannelObject {
    var topLevelCounter: LiveCounter
    var topLevelMap: TopLevelMap

    struct TopLevelMap {
        var nestedEntry: String
    }
}

// 2. A protocol (similar to an interface in TS I guess; describes a contract to which a concrete conforming type must conform)

// e.g.

protocol MyChannelObject {
    var topLevelCounter: LiveCounter { get }
    var topLevelMap: LiveMap { get }
}

protocol TopLevelMap {
    var nestedEntry: String { get }
}

// Note that, in either case, each additional layer of nesting introduces a new named type, which is cumbersome compared to TS (but, in isolation, tolerable).

/*
OK, let's assume we've got some user-defined type, MyChannelObject, that we can pass as the generic type argument to channel.object.get(). Now let's consider how we'd make the shape of this type propagate to the value that this method returns.

Let's go through the behaviours we observed in the TS exampleWithUserTypes:

1. Calling `.get()` only accepts known keys
2. When MyChannelObject describes a map entry as being a LiveCounter or a LiveMap, then this entry only accepts calls to the methods belonging to that specific type
3. When MyChannelObject describes a leaf value as having a specific primitive type, then calling `value()` on the `PathObject` fetched for that path returns that specific primitive type

These use the following TypeScript features:

- the `keyof` operator to create a type whose permissible values are the property names of some other object
- indexed access types `T[K]` (these allow us to look up the type of an object's property for a given key)
- conditional types, which allow us to derive a type from an underlying type by querying properties of the underlying type (see e.g. the PathObject<T>` type)

And they take advantage of TypeScript's lack of runtime type checks:

- `value()` may at runtime return some primitive value other than the one it is declared to return

Swift:

- does not have as flexible a type system as TypeScript and does not have a direct equivalent to conditional types
- has a mechanism called "key paths" which, whilst not the same as `keyof` and indexed access types, may help us achieve a similar result
- enforces runtime type checks; that is, there is no way for a method to return a value of a type other than its declared type

If we were to try and implement the user-custom-types API in Swift, the most promising option would probably be to use _code generation_. This could either be using Swift's built-in [macro system](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/macros/) (the key benefit here being that users would not need to incorporate an extra build step, but with restrictions on the sorts of code generations that could be performed), or with some external tool (which would require the user to add a further build step).

The generated code would need to:

- create derived types based on `MyChannelObject`
- generate code for performing runtime checking of primitive values
- generate types that represent known map keys (if the key paths approach turns out not to be viable, but then this would impact our ability to know the type of a map entry for a given key; we'd possibly have to generate a `get()` variant for each allowed key, e.g. `getFoo()`, `getBar()` etc)

(We could also consider asking the user to write all this code themselves, but it'd be a lot of boilerplate — I don't yet have a good sense of how much — and I think few would be willing.)

Also, the Swift macros mechanism:

- is still fairly new and I'm not sure of its limitations
- has been known to introduce significant increases to build time (that is, our users' build time), although Apple have been improving this

As mentioned above, it's only very recently that I've considered this even maybe viable, so it would need further investigation, and it may well turn out to be simply far too much work.
*/
