# React hooks upgrade / migration guide

## `@ably-labs/react-hooks` to `ably 1.x`

### Hooks now return object

In previous versions of our react hooks, the `useChannel` and `usePresence` hooks returned arrays.
Since these hooks now return more values we've opted to change them to return objects.
You can still access the return values using simple destructuring syntax like in the below example:

```jsx
const { channel, ably } = useChannel('your-channel-name', (message) => {
  /* ... */
});

const { presenceData, updateStatus } = usePresence('your-channel-name');
```

### Replacing `configureAbly` with `AblyProvider`

In versions 1 and 2 of our react-hooks, we exported a function called `configureAbly` which was used to register an Ably client instance to global state.
This caused a few issues (most notably it made the hooks difficult to use with hot module reloading), so we have replaced the global configuration function with a context provider (`AblyProvider`)
The simplest way to use the context provider is to create your own ably-js client outside and then pass it as a prop to the `AblyProvider`.
All child components of the `AblyProvider` will then be able to use the hooks, making use of the provided Ably client instance. For this reason, we recommend putting the `AblyProvider` high up in your component tree, surrounding all components which may need to use Ably hooks.

For example, replace this:

```jsx
configureAbly(options);
```

With this:

```jsx
const client = new Ably.Realtime(options);

return <AblyProvider client={ably}>{children}</AblyProvider>;
```

If you were already using multiple Ably clients in the same react application, you may pass in an optional `id` prop to the provider, which you can then pass to the hooks to specify which Ably client instance the hook should use:

```jsx
const client = new Ably.Realtime(options);

return (
  <AblyProvider client={ably} id="foo">
    {children}
  </AblyProvider>
);

// in a child component:
useChannel({ channelName: 'my_channel', id: 'foo' }, (msg) => {
  console.log(msg);
});
```
