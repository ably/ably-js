# React hooks migration guide for ably-js v2

Here’s how to migrate React hooks from ably-js v1 to v2:

1. [Use new `ChannelProvider` component](#use-new-channelprovider-component)
2. [Update usage of the `usePresence` hook, which has been split into two separate hooks](#update-usage-of-the-usepresence-hook-which-has-been-split-into-two-separate-hooks)
3. [Rename optional `id` field to `ablyId`](#rename-optional-id-field-to-ablyid)
4. (Optional) [Use new convenience function `publish` in `useChannel`](#optional-use-new-convenience-function-publish-in-usechannel)

## Use new `ChannelProvider` component

In previous versions, you were able to provide channel options as a parameter in the `useChannel`/`usePresence` hooks. This could, in some cases, lead to errors when using hooks with the same channel name but different options, or when attempting to dynamically change options for a channel.

To address these issues, the new version introduces the `ChannelProvider` component to define the channels you wish to use and their options. The ability to provide channel options using the `options` or `deriveOptions` parameters in `useChannel`/`usePresence` hooks has been removed.

Replace code that used `options` in the `useChannel` hook:

```jsx
const { channel } = useChannel(
  { channelName: 'your-channel-name', options: { params: { rewind: '1' } } },
  (message) => {
    console.log(message);
  },
);
```

With this:

```jsx
// in a parent component:
return (
  <ChannelProvider channelName="your-channel-name" options={{ params: { rewind: '1' } }}>
    {children}
  </ChannelProvider>
);

// in a child component:
const { channel } = useChannel({ channelName: 'your-channel-name' }, (message) => {
  console.log(message);
});
```

Replace code that used `deriveOptions` in `useChannel` hook:

```jsx
useChannel(
  {
    channelName: 'your-derived-channel-name',
    deriveOptions: { filter: 'headers.role == `"marketing"`' },
  },
  (message) => {
    console.log(message);
  },
);
```

With this:

```jsx
// in a parent component:
return (
  <ChannelProvider channelName="your-derived-channel-name" deriveOptions={{ filter: 'headers.role == `"marketing"`' }}>
    {children}
  </ChannelProvider>
);

// in a child component:
useChannel({ channelName: 'your-derived-channel-name' }, (message) => {
  console.log(message);
});
```

Replace code that used `options` in `usePresence` hook:

```jsx
const { updateStatus } = usePresence(
  { channelName: 'presence-channel-name', options: { modes: ['PRESENCE'] } },
  { foo: 'bar' },
);
```

With this:

```jsx
// in a parent component:
return (
  <ChannelProvider channelName="presence-channel-name" options={{ modes: ['PRESENCE'] }}>
    {children}
  </ChannelProvider>
);

// in a child component:
const { updateStatus } = usePresence({ channelName: 'presence-channel-name' }, { foo: 'bar' });
```

Additionally, if you were calling `.setOptions()` on a channel instance returned by the `useChannel` hook before, you must remove those calls and instead modify options provided to the `ChannelProvider` component if you want to change channel options during runtime.

Change this:

```jsx
const { channel } = useChannel({ channelName: 'your-channel-name' }, (message) => {
  console.log(message);
});
channel.setOptions({ params: { rewind: '1' } });
```

To this:

```jsx
// in a parent component:
// change channel options during runtime using state
const [options, setOptions] = useState({});
return (
  <ChannelProvider channelName="your-channel-name" options={options}>
    {children}
  </ChannelProvider>
);

// in a child component:
const { channel } = useChannel({ channelName: 'your-channel-name' }, (message) => {
  console.log(message);
});

// use the useState setter to change the options provided to the `ChannelProvider` component
setOptions({ params: { rewind: '1' } });
```

## Update usage of the `usePresence` hook, which has been split into two separate hooks

The functionality of the `usePresence` hook has been split into two separate hooks.

The `usePresence` hook can now only be used to enter the presence with optional initial state and update the presence status for the current client. It no longer returns the `presenceData` value and does not accept the `onPresenceUpdated` callback as its third parameter.

To listen for presence updates, a new hook called `usePresenceListener` has been introduced. This hook returns the `presenceData` object previously returned by `usePresence` and accepts an `onPresenceMessageReceived` callback as its second parameter, which is called on new presence messages.

Replace this:

```jsx
const { presenceData, updateStatus } = usePresence(
  { channelName: 'presence-channel-name' },
  { foo: 'bar' },
  (update) => {
    console.log(update);
  },
);
```

With this:

```jsx
const { updateStatus } = usePresence({ channelName: 'presence-channel-name' }, { foo: 'bar' });
const { presenceData } = usePresenceListener({ channelName: 'presence-channel-name' }, (update) => {
  console.log(update);
});
```

## Rename optional `id` field to `ablyId`

All instances of the `id` field, which optionally were used to specify the `AblyProvider` component and the underlying Ably client to use, have been renamed to `ablyId`.

Replace this:

```jsx
// in a parent component:
const client = new Ably.Realtime(options);

return (
  <AblyProvider client={ably} id="foo">
    {children}
  </AblyProvider>
);

// in a child component:
useChannel({ channelName: 'your-channel-name', id: 'foo' }, (message) => {
  console.log(message);
});
```

With this:

```jsx
// in a parent component:
const client = new Ably.Realtime(options);

return (
  <AblyProvider client={ably} ablyId="foo">
    <ChannelProvider channelName="your-channel-name" ablyId="foo">
      {children}
    </ChannelProvider>
  </AblyProvider>
);

// in a child component:
useChannel({ channelName: 'your-channel-name', ablyId: 'foo' }, (message) => {
  console.log(message);
});
```

## (Optional) Use new convenience function `publish` in `useChannel`

A new convenience function, `publish`, is now being returned by the `useChannel` hook. It performs the same function as calling `channel.publish()`. Additionally, using this dedicated `publish` function allows you to send messages to derived channels (channels with a filter qualifier) without attaching to the channel or using other workarounds.

It is recommended to use the dedicated `publish` function returned by the `useChannel` hook instead of calling `channel.publish()`.

Replace this:

```jsx
const { channel } = useChannel({ channelName: 'your-channel-name' });

channel.publish('test-message', {
  text: 'message text',
});
```

With this:

```jsx
const { publish } = useChannel({ channelName: 'your-channel-name' });

publish('test-message', {
  text: 'message text',
});
```
