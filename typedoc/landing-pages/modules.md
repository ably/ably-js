# Ably JavaScript Client Library SDK API Reference (modular variant)

You are currently viewing the modular (tree-shakable) variant of the Ably JavaScript Client Library SDK. View the callback-based variant [here](../default/index.html).

To get started with the Ably JavaScript Client Library SDK, follow the [Quickstart Guide](https://ably.com/docs/quick-start-guide) or view the introductions to the [realtime](https://ably.com/docs/realtime/usage) and [REST](https://ably.com/docs/rest/usage) interfaces.

## No `static` class functionality

In contrast to the default variant of the SDK, the modular variant does not expose any functionality via `static` class properties or methods, since they cannot be tree-shaken by module bundlers. Instead, it exports free-standing functions which provide the same functionality. These are:

| `static` version                           | Replacement in modular variant                                          |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| `Crypto.generateRandomKey()`               | [`generateRandomKey()`](functions/generateRandomKey.html)               |
| `Crypto.getDefaultParams()`                | [`getDefaultCryptoParams()`](functions/getDefaultCryptoParams.html)     |
| `MessageStatic.fromEncoded()`              | [`decodeMessage()`](functions/decodeMessage.html)                       |
| `MessageStatic.fromEncoded()`              | [`decodeEncryptedMessage()`](functions/decodeEncryptedMessage.html)     |
| `MessageStatic.fromEncodedArray()`         | [`decodeMessages()`](functions/decodeMessages.html)                     |
| `MessageStatic.fromEncodedArray()`         | [`decodeEncryptedMessages()`](functions/decodeEncryptedMessages.html)   |
| `PresenceMessageStatic.fromEncoded()`      | [`decodePresenceMessage()`](functions/decodePresenceMessage.html)       |
| `PresenceMessageStatic.fromEncodedArray()` | [`decodePresenceMessages()`](functions/decodePresenceMessages.html)     |
| `PresenceMessageStatic.fromValues()`       | [`constructPresenceMessage()`](functions/constructPresenceMessage.html) |
