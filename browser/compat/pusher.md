Ably Pusher Compatibility Library
=================================

This library provides an API compatibility library allowing web applications written to use
the Pusher API to switch to using the Ably service with minimal changes.

Changes Required
----------------

- Instead of including the Pusher library, add the following <script> elements to your HTML document:

     <script src="http://crypto-js.googlecode.com/svn/tags/3.1.2/build/rollups/aes.js"></script>
     <script src="http://crypto-js.googlecode.com/svn/tags/3.1.2/build/rollups/hmac-sha256.js"></script>
     <script src="http://cdn.ably.io/lib/ably.js"></script>
     <script src="http://cdn.ably.io/lib/compat-pusher.js"></script>

- Instead of passing in a Pusher application key as the first parameter to the Pusher() function, pass in
a valid Ably access key.

- If you want to subscribe to presence channels, you must pass in a client identifier using the 'ablyClientId'
option to the Pusher() function.

- The 'authEndpoint' option to the Pusher() function is mapped to the Ably 'authUrl' option. The functionality
of the server serving that URL is similar, but will need to be modified slightly. Please see the Ably
documentation for details.

- The 'auth.params' option to the Pusher() function is mapped to the Ably 'authParams' option.

- The 'auth.headers' option to the Pusher() function is mapped to the Ably 'authHeaders' option.

- If you do not use the 'authEndpoint' parameter, basic authentication will be used. In this case, the
'encrypted' option must be set to true


Compatibility
-------------

- 'Pusher' function: 'authTransport', 'cluster', 'disableStats' and 'disableFlash' methods are not supported.

- Pusher restricts you to using client messaging only on authenticated private and presence channels. This
compatibility library does not enforce that restriction.

