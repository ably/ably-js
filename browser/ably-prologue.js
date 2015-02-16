(function() {
	window.Ably = {};

  /*
    Prevent libraries such as CryptoJS plugging into AMD or CommonJS
    as the libraries loaded are expected in the `this` context.
    `require` is only used within the Node.js library, the ably-js browser library
    is built as a single Javascript file.
  */
  var define = undefined,
      exports = undefined,
      require = undefined;
