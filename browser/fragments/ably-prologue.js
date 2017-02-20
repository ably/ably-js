;(function() {
	"use strict";
	var Ably = window.Ably = this;

  /*
    Prevent libraries such as msgpack plugging into AMD or CommonJS
    as the libraries loaded are expected in the `this` context.
    `require` is only used within the Node.js library, the ably-js browser library
    is built as a single Javascript file.
  */
  var define, exports, require;

