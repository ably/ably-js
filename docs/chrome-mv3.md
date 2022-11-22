# Using Ably in a Chrome Extension with Manifest v3

In Manifest V3, Chrome extensions can [no longer use background pages in favor of service workers](https://developer.chrome.com/docs/extensions/mv3/migrating_to_service_workers/).
Chrome will [mark a service worker as inactive even if an active websocket connection is made](https://bugs.chromium.org/p/chromium/issues/detail?id=1152255).
This causes Ably to disconnect and new messages will not be received.
Unfortunately, this appears to be intended design so workarounds are needed to keep the service worker alive in order to continue receiving messages. Multiple workarounds are available, depending on your use-case.


### Using alarms
Alarms will reset the service worker's inactivity timer, or wake up an inactive service worker.
The alarm must have a period of less than 5 minutes in order to keep a service worker active consistently.
The minimum period required depends on the actions that your service worker performs, but it has to be at most 4.9 minutes.
Requires permission `alarms` to be added to manifest.json:
```json
{
  // ...
  "permissions": ["alarms"],
}
```

```js
chrome.alarms.create({ periodInMinutes: 0.3 })
chrome.alarms.onAlarm.addListener(() => {
	// This function will be called once the SW wakes up
});
```

[More Info](https://developer.chrome.com/docs/extensions/reference/alarms/)


### Connecting to a nativeMessaging host
If your Chrome extension connects to a native application, a service worker which is attached to a native application will not be marked as inactive as long as the native application is alive. To ensure that the native application exiting does not mark your service worker as inactive, make sure the connection can survive a restart of the native application.

```js
var port = chrome.runtime.connectNative('com.example.extension');
port.onDisconnect.addListener(function() {
  // Reconnect to avoid being marked as inactive
});

```

[More Info](https://developer.chrome.com/docs/apps/nativeMessaging/)

### Connecting to a tab
If your Chrome extension requires broad host permissions (e.g. `*://*/*`), connecting to a tab will keep your service worker active.
Requires `scripting` permission to be added to manifest.json:
```json
{
  // ...
  "permissions": ["scripting"],
}
```

```js
findTab();
chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'keepAlive') {
    setTimeout(() => port.disconnect(), 250e3);
    port.onDisconnect.addListener(() => findTab());
  }
});

const onUpdate = (tabId, info, tab) => /^https?:/.test(info.url) && findTab([tab]);
async function findTab(tabs) {
  if (chrome.runtime.lastError) { /* tab was closed before setTimeout ran */ }
  for (const {id: tabId} of tabs || await chrome.tabs.query({url: '*://*/*'})) {
    try {
      await chrome.scripting.executeScript({target: {tabId}, func: connect});
      chrome.tabs.onUpdated.removeListener(onUpdate);
      return;
    } catch (e) {}
  }
  chrome.tabs.onUpdated.addListener(onUpdate);
}
function connect() {
  chrome.runtime.connect({name: 'keepAlive'})
    .onDisconnect.addListener(connect);
}
```

[More Info](https://developer.chrome.com/docs/extensions/reference/scripting/)

### Connecting to a port
If you connect to a port, the service worker's inactivity timer will be reset. However, the port must be reconnected at an interval less than 5 minutes or the SW will be marked as inactive.

```js
chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'foo') return;
  port.onMessage.addListener(()=>{});
  port.onDisconnect.addListener(deleteTimer);
  port._timer = setTimeout(forceReconnect, 250e3, port);
});
function forceReconnect(port) {
  deleteTimer(port);
  port.disconnect();
}
function deleteTimer(port) {
  if (port._timer) {
    clearTimeout(port._timer);
    delete port._timer;
  }
}

```

[More Info](https://developer.chrome.com/docs/extensions/reference/runtime/#method-connect)

### Enterprise Extensions
[Enterprise extensions will continue to work on manifest v2 until January 2024](https://developer.chrome.com/docs/extensions/mv3/mv2-sunset/).
If your extension is installed as part of an enterprise policy, this means that you will have until January 2024 to continue using manifest v2.
