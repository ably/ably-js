require('nativescript-websockets');

/**
 * atob polyfill
 * @param input
 * @returns {string}
 * Based on From: https://github.com/davidchambers/Base64.js/blob/master/base64.js
 * License is Apache 2.0 also
 */
global.atob = function(input) {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var str = String(input).replace(/=+$/, '');
        if (str.length % 4 !== 0) {
            throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
        }
        for (
            // initialize result and counters
            var bc = 0, bs, buffer, idx = 0, output = '';
            // get next character
            buffer = str.charAt(idx++);
            // character found in table? initialize bit storage and add its ascii value;
            ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
                // and if not first of each 4 characters,
                // convert the first 8 bits to one ascii character
            bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
        ) {
            // try to find character in table (0-63, not found => -1)
            buffer = chars.indexOf(buffer);
        }
        return output;
    };

var randomBytes;
if (global.android) {
    randomBytes = function(size) {
        var sr = new java.security.SecureRandom();
        var buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.class.getField("TYPE").get(null), size);
        sr.nextBytes(buffer);
        return android.util.Base64.encodeToString(buffer, android.util.Base64.DEFAULT);
    };
} else {
    randomBytes = function(size) {
        var bytes = NSMutableData.dataWithLength(size);
        SecRandomCopyBytes(kSecRandomDefault, size, bytes.mutableBytes());
        return bytes.base64EncodedStringWithOptions(0);
    };
}

var Platform = {
    noUpgrade: false,
    binaryType: 'arraybuffer',
    WebSocket: WebSocket,
    xhrSupported: XMLHttpRequest,
    useProtocolHeartbeats: true,
    createHmac: null,
    msgpack: (typeof require === 'function') ? require('msgpack-js') : Ably.msgpack,
    supportsBinary: (typeof TextDecoder !== 'undefined') && TextDecoder,
    preferBinary: false,
    ArrayBuffer: ArrayBuffer,
    atob: global.atob,
    nextTick: function(f) { setTimeout(f, 0); },
    addEventListener: null,
    getRandomValues: function(arr, callback) {
        var bytes = randomBytes(arr.length);
        for (var i = 0; i < arr.length; i++) {
                arr[i] = bytes[i];
        }
        callback(null);
    }
};

