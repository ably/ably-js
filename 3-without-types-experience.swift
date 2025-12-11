/*
So, let's assume for now that we're not going to have the ability for a user to specify the shape of their channel object. What is the Swift API going to look like?

Well, basically, it's going to look like the API described in the TS exampleWithNoUserTypes.

Given that this will be the only API available to Swift users, we want to be sure that this API is pleasant for users to work with in Swift.

My main concern with this API is the fact that in this API `PathObject`s expose the union of all methods on all LiveObject types. I don't like this for the following reasons:

1. Editor autocomplete will expose a large list of methods to users, a large chunk of which aren't relevant to the LiveObject type that a user expects to actually find at that path. This list will only grow as we add further LiveObject types (e.g. LiveList).
2. There isn't a good solution for handling method name clashes between different LiveObject types.

I think that the method name clashes are the more intractable of the two problems. To give an example, consider the case where in the future we add a LiveList type, where LiveList has an `entries()` method that returns an array of `PathObject`s. (This is based directly on an example that Mike did earlier this year: https://github.com/lawrence-forooghian/ably-liveobjects-realtime-api-demo/blob/aae71dc35efc816178bc0d3536a415eaa9bef550/typescript/src/types/pathobjects.ts#L126-L140)

If we try to combine all LiveObject methods into a single interface, what is the Swift return type of the `entries()` method?

Our options:

1. return `Any` and document that if the `PathObject` resolves to a LiveMap then you get key-value pairs, and it resolves to a LiveList then you get a flat array — this is nasty and removes type-safety

2. return an enum (that is, a discriminated union), whose value is populated based on the resolved value
*/

enum Entries {
    case liveMapEntries([(key: String, value: PathObject]))
    case liveListEntries([PathObject])
}

/*
— this is a bit cumbersome to work with but is an option

3. declare various overloads of the `entries()` method, differentiated by return type:
*/

protocol PathObject {
    /// Returns a non-empty list only if this PathObject resolves to a LiveMap
    func entries() -> [(key: String, value: PathObject])

    /// Returns a non-empty list only if this PathObject resolves to a LiveList
    func entries() -> (key: String, value: PathObject)
}

/*
— the user would have to indicate at the call site which of these two overloads they wish to invoke (differently to TypeScript "overloads", there would be two different method implementations and the compiler needs to know which to dispatch to), for which Swift does not provide any particularly nice mechanism, and in fact Swift in general discourages the use of overloading based on return type

4. avoid the clash by giving different names to the `entries()` variants; that is, call one `listEntries()` and one `mapEntries()`

— this is an option but then we're increasing the already-bloated union of PathObject methods even further
*/

/*
None of the above options are fantastic.

What would our options be if we didn't insist on `PathObject` exposing the union of all LiveObject methods (which, as far as I am aware, is not an explicit design goal)?

Note that options 3 and 4 require the user to specify, at the call site of `entries()`, which LiveObject type they expect to find at that path. I think that, in general, it is reasonable to expect the user to know which kind of LiveObject they expect to find at a given path.

So, what if, before being able to call any type-specific methods on a PathObject, we made the user call a method to convert that PathObject into a type-specific proxy PathObject?

(Show, from plugin branch: 1. the asLiveMap / asLiveCounter API; 2. the example in example.swift)
*/

/*
For similar reasons, have made similar changes to the Instance API, too (I haven't covered this API in TS):

- an Instance does not let you call any type-specific LiveObjects methods
- there are asLiveMap / asLiveCounter properties (show these and the example) that return non-nil only if the underlying value is of the corresponding type
- as a consequence, if you have a LiveCounterInstance or a LiveMapInstance, it is guaranteed that the underlying instance is of the corresponding type. This means that, for example, LiveCounterInstance.value does not have an "if not a LiveCounter" case like in JS, and always returns a non-nil value
*/
