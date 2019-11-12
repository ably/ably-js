;(function() {
	"use strict";

	/*
	  Create a reference to the global scope - `window` for the browser window,
	  and `self` for web workers.
	*/
	var global = (typeof window === 'object' && window) || (typeof self === 'object' && self);
	var Ably = global.Ably = this;

	/*
	  Prevent libraries such as msgpack plugging into AMD or CommonJS
	  as the libraries loaded are expected in the `this` context.
	  `require` is only used within the Node.js library, the ably-js browser library
	  is built as a single JavaScript file.
	*/
	var define, exports, require;

