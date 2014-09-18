Ably PubNub Compatibility Library
=================================

This library provides an API compatibility library allowing web applications written to use 
the PubNub API to switch to using the Ably service with minimal changes.

Changes Required
----------------

- Instead of including the PubNub library, add the following <script> elements to your HTML document:

     <script src="http://crypto-js.googlecode.com/svn/tags/3.1.2/build/rollups/aes.js"></script>
     <script src="http://crypto-js.googlecode.com/svn/tags/3.1.2/build/rollups/hmac-sha256.js"></script>
     <script src="http://cdn.ably.io/lib/ably.js"></script>
     <script src="http://cdn.ably.io/lib/compat-pubnub.js"></script>

- Instead of passing in the PubNub publish_key and subscribe_key values, pass in a valid Ably access
key using the 'ably_key' parameter.

- If using presence, the 'uuid' parameter must be passed in to the call to PUBNUB.init. Calling 'set_uuid'
afterward is not supported.


Compatibility
-------------

- 'set_uuid' method is not supported: To use presence, uuid must be specified in the call to PUBNUB.init()

- 'audit' method is not supported

- 'auth' method is not supported. Currently, only basic authentication over TLS is supported, using the
ably_key parameter passed to PUBNUB.init()

- 'grant' method is not supported

- 'replay' method is not supported

- Message history time limits are different between Ably and PUBNUB. Please see Ably documentation for details.

- 'init' method: 'publish_key', 'subscribe_key' and 'auth_key' parameters are not supported. Please use 'ably_key'
instead. 'noleave', 'keepalive', 'windowing' and 'jsonp' parameters are ignored.

- 'publish' method: 'publish_key' parameter not supported. Please use 'ably_key' in call to PUBNUB.init()

