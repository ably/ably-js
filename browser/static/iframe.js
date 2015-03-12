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

var EventEmitter = (function() {

	/* public constructor */
	function EventEmitter() {
		this.any = [];
		this.events = {};
		this.anyOnce = [];
		this.eventsOnce = {};
	}

	/**
	 * Add an event listener
	 * @param event (optional) the name of the event to listen to
	 *        if not supplied, all events trigger a call to the listener
	 * @param listener the listener to be called
	 */
	EventEmitter.prototype.on = function(event, listener) {
		if(arguments.length == 1 && typeof(event) == 'function') {
			this.any.push(event);
		} else if(event === null) {
			this.any.push(listener);
		} else {
			var listeners = (this.events[event] || (this.events[event] = []));
			listeners.push(listener);
		}
	};

	/**
	 * Remove one or more event listeners
	 * @param event (optional) the name of the event whose listener
	 *        is to be removed. If not supplied, the listener is
	 *        treated as an 'any' listener
	 * @param listener (optional) the listener to remove. If not
	 *        supplied, all listeners are removed.
	 */
	EventEmitter.prototype.off = function(event, listener) {
		if(arguments.length == 0) {
			this.any = [];
			this.events = {};
			this.anyOnce = [];
			this.eventsOnce = {};
			return;
		}
		if(arguments.length == 1) {
			if(typeof(event) == 'function') {
				/* we take this to be the listener and treat the event as "any" .. */
				listener = event;
				event = null;
			}
			/* ... or we take event to be the actual event name and listener to be all */
		}
		var listeners, idx = -1;
		if(event === null) {
			/* "any" case */
			if(listener) {
				if(!(listeners = this.any) || (idx = Utils.arrIndexOf(listeners, listener)) == -1) {
					if(listeners = this.anyOnce)
						idx = Utils.arrIndexOf(listeners, listener);
				}
				if(idx > -1)
					listeners.splice(idx, 1);
			} else {
				this.any = [];
				this.anyOnce = [];
			}
			return;
		}
		/* "normal* case where event is an actual event */
		if(listener) {
			var listeners, idx = -1;
			if(!(listeners = this.events[event]) || (idx = Utils.arrIndexOf(listeners, listener)) == -1) {
				if(listeners = this.eventsOnce[event])
					idx = Utils.arrIndexOf(listeners, listener);
			}
			if(idx > -1)
				listeners.splice(idx, 1);
		} else {
			delete this.events[event];
			delete this.eventsOnce[event];
		}
	};

	/**
	 * Get the array of listeners for a given event; excludes once events
	 * @param event (optional) the name of the event, or none for 'any'
	 * @return array of events, or null if none
	 */
	EventEmitter.prototype.listeners = function(event) {
		if(event) {
			var listeners = (this.events[event] || []);
			if(this.eventsOnce[event])
				Array.prototype.push.apply(listeners, this.eventsOnce[event]);
			return listeners.length ? listeners : null;
		}
		return this.any.length ? this.any : null;
	};

	/**
	 * Emit an event
	 * @param event the event name
	 * @param args the arguments to pass to the listener
	 */
	EventEmitter.prototype.emit = function(event  /* , args... */) {
		var args = Array.prototype.slice.call(arguments, 1);
		var eventThis = {event:event};

		/* wrap the try/catch in a function improves performance by 30% */
		function callListener(listener) {
			try { listener.apply(eventThis, args); } catch(e) {
				Logger.logAction(Logger.LOG_ERROR, 'EventEmitter.emit()', 'Unexpected listener exception: ' + e + '; stack = ' + e.stack);
				throw e;
			}
		}
		if(this.anyOnce.length) {
			var listeners = this.anyOnce;
			this.anyOnce = [];
			for(var i = 0; i < listeners.length; i++)
				callListener((listeners[i]));
		}
		for(var i = 0; i < this.any.length; i++)
			this.any[i].apply(eventThis, args);
		var listeners = this.eventsOnce[event];
		if(listeners) {
			delete this.eventsOnce[event];
			for(var i = 0; i < listeners.length; i++)
				callListener((listeners[i]));
		}
		var listeners = this.events[event];
		if(listeners)
			for(var i = 0; i < listeners.length; i++)
				callListener((listeners[i]));
	};

	/**
	 * Listen for a single occurrence of an event
	 * @param event the name of the event to listen to
	 * @param listener the listener to be called
	 */
	EventEmitter.prototype.once = function(event, listener) {
		if(arguments.length == 1 && typeof(event) == 'function') {
			this.anyOnce.push(event);
		} else if(event === null) {
			this.anyOnce.push(listener);
		} else {
			var listeners = (this.eventsOnce[event] || (this.eventsOnce[event] = []));
			listeners.push(listener);
		}
	};

	return EventEmitter;
})();

var Logger = (function() {
	var consoleLogger = console && function() { console.log.apply(console, arguments); };

	var LOG_NONE  = 0,
	LOG_ERROR = 1,
	LOG_MAJOR = 2,
	LOG_MINOR = 3,
	LOG_MICRO = 4;

	var LOG_DEFAULT = LOG_MAJOR,
	LOG_DEBUG   = LOG_MICRO;

	var logLevel = LOG_DEFAULT;
	var logHandler = consoleLogger;

	/* public constructor */
	function Logger(args) {}

	/* public constants */
	Logger.LOG_NONE    = LOG_NONE,
	Logger.LOG_ERROR   = LOG_ERROR,
	Logger.LOG_MAJOR   = LOG_MAJOR,
	Logger.LOG_MINOR   = LOG_MINOR,
	Logger.LOG_MICRO   = LOG_MICRO;

	Logger.LOG_DEFAULT = LOG_DEFAULT,
	Logger.LOG_DEBUG   = LOG_DEBUG;

	/* public static functions */
	Logger.logAction = function(level, action, message) {
		if(level <= logLevel) {
			logHandler('Ably: ' + action + ': ' + message);
		}
	};

	Logger.setLog = function(level, handler) {
		if(level !== undefined) logLevel = level;
		if(handler !== undefined) logHandler = handler;
	};

	return Logger;
})();

var Multicaster = (function() {

	function Multicaster(members) {
		members = members || [];

		var handler = function() {
			for(var i = 0; i < members.length; i++) {
				var member = members[i];
				try { member.apply(null, arguments); } catch(e){} };
			};

		handler.push = function() {
			Array.prototype.push.apply(members, arguments);
		};
		return handler;
	};

	return Multicaster;
})();

var Utils = (function() {
	var isBrowser = (typeof(window) == 'object');

	function Utils() {}

	/*
	 * Add a set of properties to a target object
	 * target: the target object
	 * props:  an object whose enumerable properties are
	 *         added, by reference only
	 */
	Utils.mixin = function(target, src) {
		for(var prop in src) {
			if(src.hasOwnProperty(prop))
				target[prop] = src[prop];
		}
		return target;
	};

	/*
	 * Add a set of properties to a target object
	 * target: the target object
	 * props:  an object whose enumerable properties are
	 *         added, by reference only
	 */
	Utils.copy = function(src) {
		return Utils.mixin({}, src);
	};

	/*
	 * Determine whether or not a given object is
	 * an array.
	 */
	Utils.isArray = function(ob) {
		return Object.prototype.toString.call(ob) == '[object Array]';
	};

	/*
	 * Determine whether or not an object contains
	 * any enumerable properties.
	 * ob: the object
	 */
	Utils.isEmpty = function(ob) {
		for(var prop in ob)
			return false;
		return true;
	};

	/*
	 * Perform a simple shallow clone of an object.
	 * Result is an object irrespective of whether
	 * the input is an object or array. All
	 * enumerable properties are copied.
	 * ob: the object
	 */
	Utils.shallowClone = function(ob) {
		var result = new Object();
		for(var prop in ob)
			result[prop] = ob[prop];
		return result;
	};

	/*
	 * Clone an object by creating a new object with the
	 * given object as its prototype. Optionally
	 * a set of additional own properties can be
	 * supplied to be added to the newly created clone.
	 * ob:            the object to be cloned
	 * ownProperties: optional object with additional
	 *                properties to add
	 */
	Utils.prototypicalClone = function(ob, ownProperties) {
		function F() {}
		F.prototype = ob;
		var result = new F();
		if(ownProperties)
			Utils.mixin(result, ownProperties);
		return result;
	};

	/*
	 * Declare a constructor to represent a subclass
	 * of another constructor
	 * See node.js util.inherits
	 */
	Utils.inherits = (typeof(require) !== 'undefined' && require('util').inherits) || function(ctor, superCtor) {
		ctor.super_ = superCtor;
		ctor.prototype = Utils.prototypicalClone(superCtor.prototype, { constructor: ctor });
	};

	/*
	 * Determine whether or not an object has an enumerable
	 * property whose value equals a given value.
	 * ob:  the object
	 * val: the value to find
	 */
	Utils.containsValue = function(ob, val) {
		for(var i in ob) {
			if(ob[i] == val)
				return true;
		}
		return false;
	};

	Utils.intersect = function(arr, ob) { return Utils.isArray(ob) ? Utils.arrIntersect(arr, ob) : Utils.arrIntersectOb(arr, ob); };

	Utils.isArray = Array.isArray ? Array.isArray : function(arr) { return Object.prototype.toString.call(arr) === '[object Array]'; };

	Utils.arrIntersect = function(arr1, arr2) {
		var result = [];
		for(var i = 0; i < arr1.length; i++) {
			var member = arr1[i];
			if(Utils.arrIndexOf(arr2, member) != -1)
				result.push(member);
		}
		return result;
	};

	Utils.arrIntersectOb = function(arr, ob) {
		var result = [];
		for(var i = 0; i < arr.length; i++) {
			var member = arr[i];
			if(member in ob)
				result.push(member);
		}
		return result;
	};

	Utils.arrSubtract = function(arr1, arr2) {
		var result = [];
		for(var i = 0; i < arr1.length; i++) {
			var element = arr1[i];
			if(Utils.arrIndexOf(arr2, element) == -1)
				result.push(element);
		}
		return result;
	};

	Utils.arrIndexOf = Array.prototype.indexOf
		? function(arr, elem, fromIndex) {
			return arr.indexOf(elem,  fromIndex);
		}
		: function(arr, elem, fromIndex) {
			fromIndex = fromIndex || 0;
			var len = arr.length;
			for(;fromIndex < len; fromIndex++) {
				if(arr[fromIndex] === elem) {
					return fromIndex;
				}
			}
			return -1;
		};

	/*
	 * Construct an array of the keys of the enumerable
	 * properties of a given object, optionally limited
	 * to only the own properties.
	 * ob:      the object
	 * ownOnly: boolean, get own properties only
	 */
	Utils.keysArray = function(ob, ownOnly) {
		var result = [];
		for(var prop in ob) {
			if(ownOnly && !ob.hasOwnProperty(prop)) continue;
			result.push(prop);
		}
		return result.length ? result : undefined;
	};

	/*
	 * Construct an array of the values of the enumerable
	 * properties of a given object, optionally limited
	 * to only the own properties.
	 * ob:      the object
	 * ownOnly: boolean, get own properties only
	 */
	Utils.valuesArray = function(ob, ownOnly) {
		var result = [];
		for(var prop in ob) {
			if(ownOnly && !ob.hasOwnProperty(prop)) continue;
			result.push(ob[prop]);
		}
		return result.length ? result : undefined;
	};

	Utils.nextTick = isBrowser ? function(f) { setTimeout(f, 0); } : process.nextTick;

	var contentTypes = {
		json:   'application/json',
		jsonp:  'application/javascript',
		xml:    'application/xml',
		html:   'text/html',
		msgpack: 'application/x-msgpack'
	};

	Utils.defaultGetHeaders = function(format) {
		format = format || 'json';
		var accept = (format === 'json') ? contentTypes.json : contentTypes[format] + ',' + contentTypes.json;
		return { accept: accept };
	};

	Utils.defaultPostHeaders = function(format) {
		format = format || 'json';
		var accept = (format === 'json') ? contentTypes.json : contentTypes[format] + ',' + contentTypes.json,
			contentType = (format === 'json') ? contentTypes.json : contentTypes[format];

		return {
			accept: accept,
			'content-type': contentType
		};
	};

	Utils.arrRandomElement = function(arr) {
		return arr.splice(Math.floor(Math.random() * arr.length));
	};

	Utils.toQueryString = function(params) {
		var parts = [];
		if(params) {
			for(var key in params)
				parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
		}
		return parts.length ? '?' + parts.join('&') : '';
	};

	Utils.parseQueryString = function(query) {
		var match,
			search = /([^?&=]+)=?([^&]*)/g,
			result = {};

		while (match = search.exec(query))
			result[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);

 		return result;
	};

	return Utils;
})();

var ProtocolMessage = (function() {
	var msgpack = (typeof(window) == 'object') ? window.Ably.msgpack : require('msgpack-js');

	function ProtocolMessage() {
		this.action = undefined;
		this.flags = undefined;
		this.id = undefined;
		this.timestamp = undefined;
		this.count = undefined;
		this.error = undefined;
		this.connectionId = undefined;
		this.connectionKey = undefined;
		this.connectionSerial = undefined;
		this.channel = undefined;
		this.channelSerial = undefined;
		this.msgSerial = undefined;
		this.messages = undefined;
		this.presence = undefined;
	}

	ProtocolMessage.Action = {
		'HEARTBEAT' : 0,
		'ACK' : 1,
		'NACK' : 2,
		'CONNECT' : 3,
		'CONNECTED' : 4,
		'DISCONNECT' : 5,
		'DISCONNECTED' : 6,
		'CLOSE' : 7,
		'CLOSED' : 8,
		'ERROR' : 9,
		'ATTACH' : 10,
		'ATTACHED' : 11,
		'DETACH' : 12,
		'DETACHED' : 13,
		'PRESENCE' : 14,
		'MESSAGE' : 15,
		'SYNC' : 16
	};

	ProtocolMessage.Flag = {
		'HAS_PRESENCE': 0,
		'HAS_BACKLOG': 1
	};

	ProtocolMessage.encode = function(msg, format) {
		return (format == 'msgpack') ? msgpack.encode(msg, true): JSON.stringify(msg);
	};

	ProtocolMessage.decode = function(encoded, format) {
		var decoded = (format == 'msgpack') ? msgpack.decode(encoded) : JSON.parse(String(encoded));
		return ProtocolMessage.fromDecoded(decoded);
	};

	ProtocolMessage.fromDecoded = function(decoded) {
		var error = decoded.error;
		if(error) decoded.error = ErrorInfo.fromValues(error);
		var messages = decoded.messages;
		if(messages) for(var i = 0; i < messages.length; i++) messages[i] = Message.fromDecoded(messages[i]);
		var presence = decoded.presence;
		if(presence) for(var i = 0; i < presence.length; i++) presence[i] = PresenceMessage.fromDecoded(presence[i]);
		return Utils.mixin(new ProtocolMessage(), decoded);
	};

	ProtocolMessage.fromValues = function(values) {
		return Utils.mixin(new ProtocolMessage(), values);
	};

	return ProtocolMessage;
})();

var Defaults = {
	protocolVersion:          1,
	HOST:                     'rest.ably.io',
	WS_HOST:                  'realtime.ably.io',
	FALLBACK_HOSTS:           ['A.ably-realtime.com', 'B.ably-realtime.com', 'C.ably-realtime.com', 'D.ably-realtime.com', 'E.ably-realtime.com'],
	PORT:                     80,
	TLS_PORT:                 443,
	connectTimeout:           15000,
	disconnectTimeout:        30000,
	suspendedTimeout:         120000,
	recvTimeout:              90000,
	sendTimeout:              10000,
	connectionPersistTimeout: 15000,
	httpTransports:           ['xhr', 'iframe', 'jsonp'],
	transports:               ['web_socket', 'xhr', 'iframe', 'jsonp'],
	version:                  '0.7.3',
	minified:                 !(function _(){}).name
};

/* If an environment option is provided, the environment is prefixed to the domain
   i.e. rest.ably.io with environment sandbox becomes sandbox-rest.ably.io */
Defaults.environmentHost = function(environment, host) {
	if (!environment || (String(environment).toLowerCase() === 'production')) {
		return host;
	} else {
		return [String(environment).toLowerCase(), host].join('-');
	}
};

Defaults.getHost = function(options, host, ws) {
	var defaultHost = Defaults.environmentHost(options.environment, Defaults.HOST);
	host = host || options.host || defaultHost;
	if(ws)
		host = ((host == options.host) && (options.wsHost || host))
			|| ((host == defaultHost) && (Defaults.environmentHost(options.environment, Defaults.WS_HOST) || host))
			|| host;
	return host;
};

Defaults.getPort = function(options, tls) {
	return (tls || options.tls) ? (options.tlsPort || Defaults.TLS_PORT) : (options.port || Defaults.PORT);
};

Defaults.getHosts = function(options) {
	var hosts,
			options = options || {};
	if(options.host) {
		hosts = [options.host];
		if(options.fallbackHosts)
			hosts.concat(options.fallbackHosts);
	} else {
		hosts = [Defaults.environmentHost(options.environment, Defaults.HOST)].concat(Defaults.FALLBACK_HOSTS);
	}
	return hosts;
};

if (typeof exports !== 'undefined' && this.exports !== exports) {
	exports.defaults = Defaults;
}

var DomEvent = (function() {
	function DomEvent() {}

	DomEvent.addListener = function(target, event, listener) {
		if(target.addEventListener) {
			target.addEventListener(event, listener, false);
		} else {
			target.attachEvent('on'+event, function() { listener.apply(target, arguments); });
		}
	};

	DomEvent.removeListener = function(target, event, listener) {
		if(target.removeEventListener) {
			target.removeEventListener(event, listener, false);
		} else {
			target.detachEvent('on'+event, function() { listener.apply(target, arguments); });
		}
	};

	DomEvent.addMessageListener = function(target, listener) {
		DomEvent.addListener(target, 'message', listener);
	};

	DomEvent.removeMessageListener = function(target, listener) {
		DomEvent.removeListener(target, 'message', listener);
	};

	DomEvent.addUnloadListener = function(listener) {
		DomEvent.addListener(window, 'unload', listener);
	};

	return DomEvent;
})();
var XHRRequest = (function() {
	var noop = function() {};
	var idCounter = 0;
	var pendingRequests = {};

	/* duplicated here; because this is included standalone in iframe.js */
	var REQ_SEND = 0,
		REQ_RECV = 1,
		REQ_RECV_POLL = 2,
		REQ_RECV_STREAM = 3;

	function clearPendingRequests() {
		for(var id in pendingRequests)
			pendingRequests[id].dispose();
	}

	var isIE = window.XDomainRequest;
	var xhrSupported, xdrSupported;
	function isAvailable() {
		if(window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest()) {
			return (xhrSupported = true);
		}

		if(isIE && document.domain && (window.location.protocol == 'https:')) {
			return (xdrSupported = true);
		}

		return false;
	};

	function getContentType(xhr) {
		return xhr.getResponseHeader && xhr.getResponseHeader('Content-Type');
	}

	function XHRRequest(uri, headers, params, body, requestMode) {
		EventEmitter.call(this);
		params = params || {};
		params.rnd = String(Math.random()).substr(2);
		this.uri = uri + Utils.toQueryString(params);
		this.headers = headers || {};
		this.body = body;
		this.requestMode = requestMode;
		this.requestComplete = false;
		pendingRequests[this.id = String(++idCounter)] = this;
	}
	Utils.inherits(XHRRequest, EventEmitter);
	XHRRequest.isAvailable = isAvailable;

	var createRequest = XHRRequest.createRequest = function(uri, headers, params, body, requestMode) {
		return xhrSupported ? new XHRRequest(uri, headers, params, body, requestMode) : new XDRRequest(uri, headers, params, body, requestMode);
	};

	XHRRequest.prototype.complete = function(err, body, headers, unpacked) {
		if(!this.requestComplete) {
			this.requestComplete = true;
			if(body)
				this.emit('data', body);
			this.emit('complete', err, body, headers, unpacked);
			this.dispose();
		}
	};

	XHRRequest.prototype.abort = function() {
		this.dispose();
	};

	XHRRequest.prototype.exec = function() {
		var timeout = (this.requestMode == REQ_SEND) ? Defaults.sendTimeout : Defaults.recvTimeout,
			timer = this.timer = setTimeout(function() { xhr.abort(); }, timeout),
			body = this.body,
			method = body ? 'POST' : 'GET',
			headers = this.headers,
			xhr = this.xhr = new XMLHttpRequest(),
			self = this,
			accept = headers['accept'],
			responseType = 'text';

		if(!accept)
			headers['accept'] = 'application/json';
		else if(accept != 'application/json')
			responseType = 'arraybuffer';

		if(body) {
			var contentType = headers['content-type'] || (headers['content-type'] = 'application/json');
			if(contentType == 'application/json' && typeof(body) != 'string')
				body = JSON.stringify(body);
		}


		xhr.open(method, this.uri, true);
		xhr.responseType = responseType;
		xhr.withCredentials = 'true';

		for(var h in headers)
			xhr.setRequestHeader(h, headers[h]);

		var onerror = xhr.onerror = function(err) {
			err.code = 80000;
			self.complete(err);
		};
		xhr.onabort = function() {
			var err = new Error('Request cancelled');
			err.statusCode = 400;
			onerror(err);
		};
		xhr.ontimeout = function() {
			var err = new Error('Request timed out');
			err.statusCode = 408;
			onerror(err);
		};

		var streaming,
			statusCode,
			responseBody,
			contentType,
			successResponse,
			streamPos = 0,
			unpacked = false;

		function onResponse() {
			clearTimeout(timer);
			successResponse = (statusCode < 400);
			if(statusCode == 204) {
				self.complete();
				return;
			}
			streaming = (self.requestMode == REQ_RECV_STREAM && successResponse);
		}

		function onEnd() {
			try {
				var contentType = getContentType(xhr),
					json = contentType ? (contentType == 'application/json') : (xhr.responseType == 'text');

				responseBody = json ? xhr.responseText : xhr.response;
				if(!responseBody) {
					if(status != 204) {
						err = new Error('Incomplete response body from server');
						err.statusCode = 400;
						self.complete(err);
					}
					return;
				}

				if(json) {
					responseBody = JSON.parse(String(responseBody));
					unpacked = true;
				}
			} catch(e) {
				var err = new Error('Malformed response body from server: ' + e.message);
				err.statusCode = 400;
				self.complete(err);
				return;
			}

			if(successResponse) {
				self.complete(null, responseBody, (contentType && {'Content-Type': contentType}), unpacked);
				return;
			}

			var err = responseBody.error;
			if(!err) {
				err = new Error('Error response received from server: ' + statusCode);
				err.statusCode = statusCode;
			}
			self.complete(err);
		}

		function onProgress() {
			responseBody = xhr.responseText;
			var bodyEnd = responseBody.length - 1, idx, chunk;
			while((streamPos < bodyEnd) && (idx = responseBody.indexOf('\n', streamPos)) > -1) {
				chunk = responseBody.slice(streamPos, idx);
				streamPos = idx + 1;
				onChunk(chunk);
			}
		}

		function onChunk(chunk) {
			try {
				chunk = JSON.parse(chunk);
			} catch(e) {
				var err = new Error('Malformed response body from server: ' + e.message);
				err.statusCode = 400;
				self.complete(err);
				return;
			}
			self.emit('data', chunk);
		}

		function onStreamEnd() {
			onProgress();
			self.streamComplete = true;
			Utils.nextTick(function() {
				self.complete();
			});
		}

		xhr.onreadystatechange = function() {
			var readyState = xhr.readyState;
			if(readyState < 3) return;
			if(xhr.status !== 0) {
				if(statusCode === undefined) {
					statusCode = xhr.status;
					/* IE returns 1223 for 204: http://bugs.jquery.com/ticket/1450 */
					if(statusCode === 1223) statusCode = 204;
					onResponse();
				}
				if(readyState == 3 && streaming) {
					onProgress();
				} else if(readyState == 4) {
					if(streaming)
						onStreamEnd();
					else
						onEnd();
				}
			}
		};
		xhr.send(body);
	};

	XHRRequest.prototype.dispose = function() {
		var xhr = this.xhr;
		if(xhr) {
			xhr.onreadystatechange = xhr.onerror = xhr.onabort = xhr.ontimeout = noop;
			this.xhr = null;
			var timer = this.timer;
			if(timer) {
				clearTimeout(timer);
				this.timer = null;
			}
			if(!this.requestComplete)
				xhr.abort();
		}
		delete pendingRequests[this.id];
	};

	function XDRRequest(uri, headers, params, body, requestMode) {
		params.ua = 'xdr';
		XHRRequest.call(this, uri, headers, params, body, requestMode);
	}
	Utils.inherits(XDRRequest, XHRRequest);

   /**
	* References:
	* http://ajaxian.com/archives/100-line-ajax-wrapper
	* http://msdn.microsoft.com/en-us/library/cc288060(v=VS.85).aspx
	*/
	XDRRequest.prototype.exec = function() {
		var timeout = (this.requestMode == REQ_SEND) ? Defaults.sendTimeout : Defaults.recvTimeout,
			timer = this.timer = setTimeout(function() { xhr.abort(); }, timeout),
			body = this.body,
			method = body ? 'POST' : 'GET',
			xhr = this.xhr = new XDomainRequest(),
			self = this;

		if(body)
			if(typeof(body) == 'object') body = JSON.stringify(body);

		var onerror = xhr.onerror = function() {
			Logger.logAction(Logger.LOG_ERROR, 'Request.onerror()', '');
			var err = new Error('Error response');
			err.statusCode = 400;
			err.code = 80000;
			self.complete(err);
		};
		xhr.onabort = function() {
			Logger.logAction(Logger.LOG_ERROR, 'Request.onabort()', '');
			var err = new Error('Request cancelled');
			err.statusCode = 400;
			onerror(err);
		};
		xhr.ontimeout = function() {
			Logger.logAction(Logger.LOG_ERROR, 'Request.timeout()', '');
			var err = new Error('Request timed out');
			err.statusCode = 408;
			onerror(err);
		};

		var streaming,
			statusCode,
			responseBody,
			streamPos = 0;

		function onResponse() {
			clearTimeout(timer);
			responseBody = xhr.responseText;
			//Logger.logAction(Logger.LOG_MICRO, 'onResponse: ', responseBody);
			if(responseBody) {
				var idx = responseBody.length - 1;
				if(responseBody[idx] == '\n' || (idx = responseBody.indexOf('\n') > -1)) {
					var chunk = responseBody.slice(0, idx);
					try {
						chunk = JSON.parse(chunk);
						var err = chunk.error;
						if(err) {
							statusCode = err.statusCode || 500;
							self.complete(err);
						} else {
							statusCode = responseBody ? 201 : 200;
							streaming = (self.requestMode == REQ_RECV_STREAM);
							if(streaming) {
								streamPos = idx;
								if(!Utils.isEmpty(chunk)) {
									self.emit('data', chunk);
								}
							}
						}
					} catch(e) {
						err = new Error('Malformed response body from server: ' + e.message);
						err.statusCode = 400;
						self.complete(err);
						return;
					}
				}
			}
		}

		function onEnd() {
			try {
				responseBody = xhr.responseText;
				//Logger.logAction(Logger.LOG_MICRO, 'onEnd: ', responseBody);
				if(!responseBody || !responseBody.length) {
					if(status != 204) {
						err = new Error('Incomplete response body from server');
						err.statusCode = 400;
						self.complete(err);
					}
					return;
				}
				responseBody = JSON.parse(String(responseBody));
			} catch(e) {
				var err = new Error('Malformed response body from server: ' + e.message);
				err.statusCode = 400;
				self.complete(err);
				return;
			}
			self.complete(null, responseBody, {'Content-Type': 'application/json'}, true);
		}

		function onProgress() {
			responseBody = xhr.responseText;
			//Logger.logAction(Logger.LOG_MICRO, 'onProgress: ', responseBody);
			var bodyEnd = responseBody.length - 1, idx, chunk;
			while((streamPos < bodyEnd) && (idx = responseBody.indexOf('\n', streamPos)) > -1) {
				chunk = responseBody.slice(streamPos, idx);
				streamPos = idx + 1;
				onChunk(chunk);
			}
		}

		function onChunk(chunk) {
			try {
				chunk = JSON.parse(chunk);
			} catch(e) {
				var err = new Error('Malformed response body from server: ' + e.message);
				err.statusCode = 400;
				self.complete(err);
				return;
			}
			self.emit('data', chunk);
		}

		function onStreamEnd() {
			onProgress();
			self.streamComplete = true;
			Utils.nextTick(function() {
				self.complete();
			});
		}

		xhr.onprogress = function() {
			if(statusCode === undefined)
				onResponse();
			else if(streaming)
				onProgress();
		};

		xhr.onload = function() {
			if(statusCode === undefined) {
				onResponse();
				if(self.requestComplete)
					return;
			}
			if(streaming)
				onStreamEnd();
			else
				onEnd();
		};

		try {
			xhr.open(method, this.uri);
			xhr.send(body);
		} catch(e) {
			Logger.logAction(Logger.LOG_ERROR, 'Request.onStreamEnd()', 'Unexpected send exception; err = ' + e);
			onerror(e);
		}
	};

	XDRRequest.prototype.dispose = function() {
		var xhr = this.xhr;
		if(xhr) {
			xhr.onprogress = xhr.onload = xhr.onerror = xhr.onabort = xhr.ontimeout = noop;
			this.xhr = null;
			var timer = this.timer;
			if(timer) {
				clearTimeout(timer);
				this.timer = null;
			}
			if(!this.requestComplete)
				xhr.abort();
		}
		delete pendingRequests[this.id];
	};

	var isAvailable = XHRRequest.isAvailable();
	if(isAvailable) {
		DomEvent.addUnloadListener(clearPendingRequests);
		if(typeof(Http) !== 'undefined') {
			Http.supportsAuthHeaders = xhrSupported;
			Http.Request = function(uri, headers, params, body, callback) {
				var req = createRequest(uri, headers, params, body, REQ_SEND);
				req.once('complete', callback);
				req.exec();
				return req;
			};
		}
	}

	return XHRRequest;
})();

(function() {
	var origin = location.origin || location.protocol + "//" + location.hostname + (location.port ? ':' + location.port: '');
	var connectParams = Utils.parseQueryString(window.location.search);
	var parentOrigin = connectParams.origin;
	delete connectParams.origin;
	var authParams = ('access_token' in connectParams) ? {access_token: connectParams.access_token} : {key_id: connectParams.key_id, key_value:connectParams.key_value};
	var parentWindow = window.parent;
	var actions = ProtocolMessage.Action;

	//Logger.setLog(4);

	var REQ_SEND = 0,
		REQ_RECV = 1,
		REQ_RECV_POLL = 2,
		REQ_RECV_STREAM = 3;

	function encodeRequest(requestItems) {
		if(typeof(requestItems) != 'string')
			requestItems = JSON.stringify(requestItems);
		return requestItems;
	}

	function decodeResponse(responseData) {
		if(typeof(responseData) == 'string')
			responseData = JSON.parse(responseData);
		return responseData;
	}

	function errorMessage(err) {
		return new ProtocolMessage.fromValues({
			action: actions.ERROR,
			error: err
		});
	}

	function responseMessage(err, message) {
		if(err) {
			var errMessage = errorMessage(err);
			if(message)
				Utils.mixin(errMessage, message);
			message = errMessage;
		}
		return message;
	}

	function IframeAgent() {
		/* streaming defaults to true */
		this.stream = ('stream' in connectParams) ? connectParams.stream : true;
		this.sendRequest = null;
		this.recvRequest = null;
		this.pendingCallback = null;
		this.pendingItems = null;
		this.baseUri = this.sendUri = this.recvUri = null;

		var self = this;
		DomEvent.addMessageListener(window, function(ev) {self.onMessageEvent(ev.data); })
	}

	IframeAgent.prototype.connect = function() {
		var baseUri = this.baseUri = origin + '/comet/',
			connectUri = baseUri + 'connect',
			self = this;

		Logger.logAction(Logger.LOG_MINOR, 'IframeAgent.connect()', 'uri: ' + connectUri);

		/* this will be the 'recvRequest' so this connection can stream messages */
		var connectRequest = this.recvRequest = XHRRequest.createRequest(connectUri, null, connectParams, null, (this.stream ? REQ_RECV_STREAM : REQ_RECV));

		connectRequest.on('data', function(data) {
			/* intercept initial responses until connectionKey obtained */
			if(self.sendUri == null)
				self.checkConnectResponse(data);
			self.onData(data);
		});
		connectRequest.on('complete', function(err) {
			self.recvRequest = null;
			if(err) {
				self.postErrorEvent(err);
				return;
			}
		});
		connectRequest.exec();
	};

	IframeAgent.prototype.dispose = function() {
		if(this.recvRequest) {
			this.recvRequest.abort();
			this.recvRequest = null;
		}
	};

	IframeAgent.prototype.checkConnectResponse = function(responseData) {
		try {
			var items = decodeResponse(responseData);
			if(items && items.length)
				for(var i = 0; i < items.length; i++) {
					var message = items[i];
					if(message.action == actions.CONNECTED) {
						this.onConnect(message);
						break;
					}
				}
		} catch (e) {
			Logger.logAction(Logger.LOG_ERROR, 'IframeAgent.checkConnectResponse()', 'Unexpected exception handing channel event: ' + e);
		}
	};

	IframeAgent.prototype.onConnect = function(message) {
		var baseConnectionUri =  this.baseUri + message.connectionKey;
		Logger.logAction(Logger.LOG_MICRO, 'IframeAgent.onConnect()', 'baseUri = ' + baseConnectionUri);
		this.sendUri = baseConnectionUri + '/send';
		this.recvUri = baseConnectionUri + '/recv';

		var self = this;
		Utils.nextTick(function() {
			self.recv();
		})
	};

	IframeAgent.prototype.onMessageEvent = function(data) {
		var self = this;
		this.send(decodeResponse(data), function(err, response) {
			if(err) {
				self.postErrorEvent(err);
				return;
			}
			if(response)
				self.postMessageEvent(response);
		});
	};

	IframeAgent.prototype.send = function(msg, callback) {
		Logger.logAction(Logger.LOG_MICRO, 'IframeAgent.send()', 'msg = ' + JSON.stringify(msg));
		if(this.sendRequest) {
			/* there is a pending send, so queue this message */
			this.pendingItems = this.pendingItems || [];
			this.pendingItems.push(msg);

			this.pendingCallback = this.pendingCallback || Multicaster();
			this.pendingCallback.push(callback);
			return;
		}
		/* send this, plus any pending, now */
		var pendingItems = this.pendingItems || [];
		pendingItems.push(msg);
		this.pendingItems = null;

		var pendingCallback = this.pendingCallback;
		if(pendingCallback) {
			pendingCallback.push(callback);
			callback = pendingCallback;
			this.pendingCallback = null;
		}

		this.sendItems(pendingItems, callback);
	};

	IframeAgent.prototype.sendItems = function(items, callback) {
		var sendUri = this.sendUri,
			self = this;

		if(!sendUri) {
			callback({message:'Unable to send; not connected', code:80000, statusCode:400});
			return;
		}

		var sendRequest = this.sendRequest = XHRRequest.createRequest(sendUri, null, authParams, encodeRequest(items), REQ_SEND);
		sendRequest.on('complete', function(err, data) {
			if(err) Logger.logAction(Logger.LOG_ERROR, 'IframeAgent.sendItems()', 'on complete: err = ' + err);
			self.sendRequest = null;
			if(data) self.onData(data);

			var pendingItems = self.pendingItems;
			if(pendingItems) {
				self.pendingItems = null;
				var pendingCallback = self.pendingCallback;
				self.pendingCallback = null;
				Utils.nextTick(function() {
					self.sendItems(pendingItems, pendingCallback);
				});
			}
			callback(err);
		});
		sendRequest.exec();
	};

	IframeAgent.prototype.recv = function() {
		/* do nothing if there is an active request, which might be streaming */
		if(this.recvRequest)
			return;

		/* If we're no longer connected, do nothing */
		if(!this.isConnected)
			return;

		var self = this,
			recvRequest = this.recvRequest = XHRRequest.createRequest(this.recvUri, null, authParams, null, (self.stream ? REQ_RECV_STREAM : REQ_RECV_POLL));

		recvRequest.on('data', function(data) {
			self.onData(data);
		});
		recvRequest.on('complete', function(err) {
			self.recvRequest = null;
			if(err) {
				self.postErrorEvent(err);
				return;
			}
			Utils.nextTick(function() {
				self.recv();
			});
		});
		recvRequest.exec();
	};

	IframeAgent.prototype.onData = function(responseData) {
		this.postMessageEvent(responseData);
	};

	IframeAgent.prototype.postMessageEvent = function(items) {
		parentWindow.postMessage(encodeRequest(items), parentOrigin);
	};

	IframeAgent.prototype.postErrorEvent = function(err, message) {
		var item = responseMessage(err, message);
		this.postMessageEvent([item]);
	};

	(new IframeAgent()).connect();
})();



if(typeof Realtime !== 'undefined') {
	Ably.Rest = Rest;
	Ably.Realtime = Realtime;
	Realtime.ConnectionManager = ConnectionManager;
	Realtime.BufferUtils = Rest.BufferUtils = BufferUtils;
	if(typeof(Crypto) !== 'undefined') Realtime.Crypto = Rest.Crypto = Crypto;
	Realtime.Message = Rest.Message = Message;
	Realtime.PresenceMessage = Rest.PresenceMessage = PresenceMessage;
	Realtime.ProtocolMessage = Rest.ProtocolMessage = ProtocolMessage;
}
}).call({});
