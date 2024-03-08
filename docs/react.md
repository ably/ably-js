# ably-js React Hooks

> [!IMPORTANT]
> The ably-js React Hooks are currently in the release candidate phase, and there may be breaking changes in a future non-major release.

Use Ably in your React application using idiomatic, easy to use, React Hooks!

Using this module you can:

- Interact with [Ably channels](https://ably.com/docs/channels) using a React Hook.
- [Publish messages](https://ably.com/docs/channels#publish) via Ably using the publish function the hooks provide
- Get notifications of user [presence on channels](https://ably.com/docs/presence-occupancy/presence)
- Enter presence and send presence updates

The hooks provide a simplified syntax for interacting with Ably, and manage the lifecycle of the Ably SDK instances for you taking care to subscribe and unsubscribe to channels and events when your react components re-render.

> [!NOTE]
> For more information what Ably is and concepts you need, please see the official [Ably documentation](https://ably.com/docs/). The official docs also include a more complete [React Hooks quickstart guide](https://ably.com/docs/getting-started/react).

---

<!-- @import "[TOC]" {cmd="toc" depthFrom=2 depthTo=6 orderedList=false} -->
<!-- code_chunk_output -->

- [Compatible React Versions](#compatible-react-versions)
- [Usage](#usage)
  - [useChannel](#usechannel)
  - [usePresence](#usepresence)
  - [usePresenceListener](#usepresencelistener)

<!-- /code_chunk_output -->
---

### Compatible React Versions

The hooks are compatible with all versions of React above 16.8.0

## Usage

Start by connecting your app to Ably using the `AblyProvider` component. See the [`ClientOptions` documentation](https://ably.com/docs/api/realtime-sdk/types?lang=javascript) for information about what options are available when creating an Ably client. If you want to use the `usePresence` or `usePresenceListener` hooks, you'll need to explicitly provide a `clientId`.

The `AblyProvider` should be high in your component tree, wrapping every component which needs to access Ably.

```jsx
import { AblyProvider } from "ably/react";
import * as Ably from "ably";

const client = new Ably.Realtime({ key: "your-ably-api-key", clientId: 'me' });

root.render(
  <AblyProvider client={client}>
    <App />
  </AblyProvider>
)
```

### Define Ably channels

Once you've set up `AblyProvider`, define Ably channels you want to use by utilizing the `ChannelProvider` component:

```jsx
<ChannelProvider channelName="your-channel-name">
  <Component />
</ChannelProvider>
```

After setting up `ChannelProvider`, you can employ the provided `hooks` in your code. Here's a basic example:

```javascript
const { channel } = useChannel("your-channel-name", (message) => {
    console.log(message);
});
```

Every time a message is sent to `your-channel-name` it'll be logged to the console. You can do whatever you need to with those messages.

> [!NOTE]
> Our react hooks are designed to run on the client-side, so if you are using server-side rendering, make sure that your components which use Ably react hooks are only rendered on the client side.

### Channel Options

We support providing [ChannelOptions](https://ably.com/docs/api/realtime-sdk/types#channel-options) for the `ChannelProvider` component:

This means you can use features like `rewind`:

```jsx
<ChannelProvider channelName="your-channel-name" options={{ params: { rewind: '1' } }}>
  <Component />
</ChannelProvider>
```

[Subscription filters](https://ably.com/docs/channels#filter-subscribe) are also supported:

```jsx
const deriveOptions = { filter: 'headers.email == `"rob.pike@domain.com"` || headers.company == `"domain"`' }

return (
  <ChannelProvider channelName="your-derived-channel-name" options={{ ... }} deriveOptions={deriveOptions}>
    <Component />
  </ChannelProvider>
)
```

> [!NOTE]
> Please note that attempts to publish to a derived channel (the one created or retrieved with a filter expression)
> using channel instance will fail, since derived channels support only `subscribe` capability.
> Use `publish` function returned by `useChannel` hook instead.

---

### useChannel

The useChannel hook lets you subscribe to an [Ably Channel](https://ably.com/docs/channels) and receive messages from it.

```javascript
const { channel, ably } = useChannel("your-channel-name", (message) => {
    console.log(message);
});
```

**Both the channel instance, and the Ably JavaScript SDK instance are returned from the useChannel call.**

`useChannel` really shines when combined with a regular react `useState` hook - for example, you could keep a list of messages in your app state, and use the `useChannel` hook to subscribe to a channel, and update the state when new messages arrive.

```javascript
const [messages, updateMessages] = useState([]);
const { channel } = useChannel("your-channel-name", (message) => {
    updateMessages((prev) => [...prev, message]);
});

// Convert the messages to list items to render in a react component
const messagePreviews = messages.map((msg, index) => <li key={index}>{msg.data.someProperty}</li>);
```

`useChannel` supports all of the parameter combinations of a regular call to `channel.subscribe`, so you can filter the messages you subscribe to by providing a `message type` to the `useChannel` function:

```javascript
useChannel("your-channel-name", "test-message", (message) => {
    console.log(message); // Only logs messages sent using the `test-message` message type
});
```

#### useChannel `publish` function

The `publish` function returned by `useChannel` can be used to send messages to the channel.

```javascript
const { publish } = useChannel("your-channel-name")
publish("test-message", { text: "message text" });
```

#### useChannel `channel` instance

The `useChannel` hook returns an instance of the channel, which is part of the Ably JavaScript SDK. This allows you to access the standard Ably JavaScript SDK functionalities associated with channels.

By providing both the channel instance and the Ably SDK instance through our useChannel hook, you gain the flexibility to execute various operations on the channel.

For instance, you can easily fetch the history of the channel using the following method:

```javascript
const { channel } = useChannel("your-channel-name", (message) => {
    console.log(message);
});

const history = channel.history((err, result) => {
    var lastMessage = resultPage.items[0];
    console.log('Last message: ' + lastMessage.id + ' - ' + lastMessage.data);
});
```

---

### usePresence

The usePresence hook [enters the presence set on a channel](https://ably.com/docs/presence-occupancy/presence) and enables you to send presence updates for current client. To find out more about Presence, see the [Presence documentation](https://ably.com/docs/presence-occupancy/presence).

```javascript
const { updateStatus } = usePresence("your-channel-name");

// The `updateStatus` function can be used to update the presence data for the current client
updateStatus("status");
```

You can optionally provide a second parameter when you `usePresence` to set an initial `presence data`.

```javascript
const { updateStatus } = usePresence("your-channel-name", "initial state");

// The `updateStatus` function can be used to update the presence data for the current client
updateStatus("new status");
```

The new state will be sent to the channel, and all clients subscribed to the channel (including current, if you've subscribed to updates using [`usePresenceListener` hook](#usepresencelistener)) will be notified of the change immediately.

`usePresence` supports objects and numbers, as well as strings:

```javascript
usePresence("your-channel-name", { foo: "bar" });
usePresence("another-channel-name", 123);
usePresence("third-channel-name", "initial status");
```

If you're using `TypeScript` there are type hints to make sure that value passed to `updateStatus` is of the same `type` as your initial constraint, or a provided generic type parameter:

```tsx
const TypedUsePresenceComponent = () => {
    // In this example MyPresenceType will be used for type checking updateStatus function.
    // If omitted, the shape of the initial value will be used, and if that's omitted, `any` will be the default.

    const { updateStatus } = usePresence<MyPresenceType>("testChannelName", { foo: "bar" });

    return (
        <button
            onClick={() => {
                {/* you will have Intellisense for updateStatus function here */}
                updateStatus({ foo: 'baz' });
            }}
        >
            Update presence data
        </button>
    );
}

interface MyPresenceType {
    foo: string;
}
```

---

### usePresenceListener

The usePresenceListener hook [subscribes you to presence 'enter', 'update' and 'leave' events on a channel](https://ably.com/docs/presence-occupancy/presence?lang=javascript#subscribe) - this will allow you to get notified when a user joins or leaves the channel, or updates its presence data. To find out more about Presence, see the [Presence documentation](https://ably.com/docs/presence-occupancy/presence).

**Please note** that fetching present members is executed as an effect, so it'll load in *after* your component renders for the first time.

```javascript
const { presenceData } = usePresenceListener("your-channel-name");

// Convert presence data to the list of items to render
const membersData = presenceData.map((msg, index) => <li key={index}>{msg.clientId}: {msg.data}</li>);
```

The `usePresenceListener` hook returns an array of presence messages - each message is a regular Ably JavaScript SDK `PresenceMessage` instance.

If you don't want to use the `presenceData` returned from `usePresenceListener`, you can configure a callback:

```javascript
usePresenceListener("your-channel-name", (presenceUpdate) => {
    console.log(presenceUpdate);
});
```

If you're using `TypeScript` there are type hints to make sure that presence data received are of the same `type` as a provided generic type parameter:

```tsx
const TypedUsePresenceListenerComponent = () => {
    // In this example MyPresenceType will be used for presenceData type hints.
    // If that's omitted, `any` will be the default.

    const { presenceData } = usePresenceListener<MyPresenceType>("testChannelName");

    const membersData = presenceData.map((presenceMsg, index) => {
        return (
            <li key={index}>
                {/* you will have Intellisense for presenceMsg.data of type MyPresenceType here */}
                {presenceMsg.clientId} - {presenceMsg.data.foo}
            </li>
        );
    });

    return <ul>{membersData}</ul>;
}

interface MyPresenceType {
    foo: string;
}
```

`presenceData` is a good way to store synchronised, per-client metadata, so types here are especially valuable.

### useConnectionStateListener

The `useConnectionStateListener` hook lets you attach a listener to be notified of [connection state changes](https://ably.com/docs/connect/states?lang=javascript). This can be useful for detecting when the client has lost connection.

```javascript
useConnectionStateListener((stateChange) => {
  console.log(stateChange.current) // the new connection state
  console.log(stateChange.previous) // the previous connection state
  console.log(stateChange.reason) // if applicable, an error indicating the reason for the connection state change
})
```

You can also pass in a filter to only listen to a set of connection states:

```javascript
useConnectionStateListener('failed', listener); // the listener only gets called when the connection state becomes failed
useConnectionStateListener(['failed', 'suspended'], listener); // the listener only gets called when the connection state becomes failed or suspended
```

### useChannelStateListener

The `useChannelStateListener` hook lets you attach a listener to be notified of [channel state changes](https://ably.com/docs/channels?lang=javascript#states). This can be useful for detecting when a channel error has occured.

```javascript
useChannelStateListener((stateChange) => {
  console.log(stateChange.current) // the new channel state
  console.log(stateChange.previous) // the previous channel state
  console.log(stateChange.reason) // if applicable, an error indicating the reason for the channel state change
})
```

You can also pass in a filter to only listen to a set of channel states:

```javascript
useChannelStateListener('failed', listener); // the listener only gets called when the channel state becomes failed
useChannelStateListener(['failed', 'suspended'], listener); // the listener only gets called when the channel state becomes failed or suspended
```

### useAbly

The `useAbly` hook lets you access the Ably client used by the `AblyProvider` context. This can be useful if you need to access ably-js APIs which aren't available through our react-hooks library.

```javascript
const client = useAbly();

client.authorize();
```

### Error Handling

When using the Ably react hooks, your Ably client may encounter a variety of errors, for example if it doesn't have permissions to attach to a channel it may encounter a channel error, or if it loses connection from the Ably network it may encounter a connection error.

To allow you to handle these errors, the `useChannel`, `usePresence` and `usePresenceListener` hooks return connection and channel errors so that you can react to them in your components:

```jsx
const { connectionError, channelError } = useChannel('my_channel', messageHandler);

if (connectionError) {
  // TODO: handle connection errors
} else if (channelError) {
  // TODO: handle channel errors
} else {
  return <AblyChannelComponent />
}
```

Alternatively, you can also pass callbacks to the hooks to be called when the client encounters an error:

```js
useChannel({
  channelName: 'my_channel',
  onConnectionError: (err) => { /* handle connection error */ },
  onChannelError: (err) => { /* handle channel error */ },
}, messageHandler);
```

### Usage with multiple clients

If you need to use multiple Ably clients on the same page, the easiest way to do so is to keep your clients in separate `AblyProvider` components. However, if you need to nest `AblyProvider`s, you can pass a string `ablyId` for each client as a prop to the provider.

```jsx
root.render(
  <AblyProvider client={client1} ablyId={'providerOne'}>
    <AblyProvider client={client2} ablyId={'providerTwo'}>
      <App />
    </AblyProvider>
  </AblyProvider>
)
```

This `ablyId` can then be passed in to each hook to specify which client to use.

```javascript
const ablyId = 'providerOne';

const client = useAbly(ablyId);

useChannel({ channelName: "your-channel-name", ablyId }, (message) => {
    console.log(message);
});

usePresence({ channelName: "your-channel-name", ablyId }, "initial state");

usePresenceListener({ channelName: "your-channel-name", ablyId }, (presenceUpdate) => {
    // ...
});
```

## NextJS warnings

Currently, when using our react library with NextJS you may encounter some warnings which arise due to some static checks against subdependencies of the library.
While these warnings won't affect the performance of the library and are safe to ignore, we understand that they are an annoyance and offer the following advice to prevent them from displaying:

### Critical dependency: the request of a dependency is an expression

This warning comes from keyv which is a subdependency of our NodeJS http client.
You can read more about the reason this warning is displayed at [jaredwray/keyv#45](https://github.com/jaredwray/keyv/issues/45).

You can avoid this warning by overriding the version of keyv used by adding the following to your package.json:

```json
"overrides": {
  "cacheable-request": {
    "keyv": "npm:@keyvhq/core@~1.6.6"
  }
}
```

### Module not found: Can't resolve 'bufferutil'/'utf-8-validate'

These warnings come from devDependencies which are conditionally loaded in the ws module (our NodeJS websocket client).
They aren't required for the websocket client to work, however NextJS will statically analyse imports and incorrectly assume that these are needed.

You can avoid this warning by adding the following to your next.config.js:

```javascript
module.exports = {
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    })
    return config
  },
}
```
