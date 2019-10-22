var Utils = (function() {
	var msgpack = Platform.msgpack;

	function Utils() {}

	function randomPosn(arrOrStr) {
		return Math.floor(Math.random() * arrOrStr.length);
	}

	/*
	 * Add a set of properties to a target object
	 * target: the target object
	 * props:  an object whose enumerable properties are
	 *         added, by reference only
	 */
	Utils.mixin = function(target) {
		for(var i = 1; i < arguments.length; i++) {
			var source = arguments[i];
			if(!source) { break; }
			var hasOwnProperty = source.hasOwnProperty;
			for(var key in source) {
				if(!hasOwnProperty || hasOwnProperty.call(source, key)) {
					target[key] = source[key];
				}
			}
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
	Utils.isArray = Array.isArray || function(ob) {
		return Object.prototype.toString.call(ob) == '[object Array]';
	};

	/*
	 * Ensures that an Array object is always returned
	 * returning the original Array of obj is an Array
	 * else wrapping the obj in a single element Array
	 */
	Utils.ensureArray = function(obj) {
		if(Utils.isEmptyArg(obj)) {
			return [];
		}
		if(Utils.isArray(obj)) {
			return obj;
		}
		return [obj];
	}

	/* ...Or an Object (in the narrow sense) */
	Utils.isObject = function(ob) {
		return Object.prototype.toString.call(ob) == '[object Object]';
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

	Utils.isOnlyPropIn = function(ob, property) {
		for(var prop in ob) {
			if(prop !== property) {
				return false;
			}
		}
		return true;
	};

	/*
	 * Determine whether or not an argument to an overloaded function is
	 * undefined (missing) or null.
	 * This method is useful when constructing functions such as (WebIDL terminology):
	 *   off([TreatUndefinedAs=Null] DOMString? event)
	 * as you can then confirm the argument using:
	 *   Utils.isEmptyArg(event)
	 */

	Utils.isEmptyArg = function(arg) {
		return arg === null || arg === undefined;
	}

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
	 * If platform has a built-in version we use that from Platform, else we
	 * define here (so can make use of other Utils fns)
	 * See node.js util.inherits
	 */
	Utils.inherits = Platform.inherits || function(ctor, superCtor) {
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

	Utils.arrIn = function(arr, val) {
		return Utils.arrIndexOf(arr, val) !== -1;
	};

	Utils.arrDeleteValue = function(arr, val) {
		var idx = Utils.arrIndexOf(arr, val);
		var res = (idx != -1);
		if(res)
			arr.splice(idx, 1);
		return res;
	};

	Utils.arrWithoutValue = function(arr, val) {
		var newArr = arr.slice();
		Utils.arrDeleteValue(newArr, val);
		return newArr;
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
		return result;
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
		return result;
	};

	Utils.arrForEach = Array.prototype.forEach ?
		function(arr, fn) {
			arr.forEach(fn);
		} :
		function(arr, fn) {
			var len = arr.length;
			for(var i = 0; i < len; i++) {
				fn(arr[i], i, arr);
			}
		};

	/* Useful when the function may mutate the array */
	Utils.safeArrForEach = function(arr, fn) {
		return Utils.arrForEach(arr.slice(), fn);
	};

	Utils.arrMap = Array.prototype.map ?
		function(arr, fn) {
			return arr.map(fn);
		} :
		function(arr, fn)	{
			var result = [],
				len = arr.length;
			for(var i = 0; i < len; i++) {
				result.push(fn(arr[i], i, arr));
			}
			return result;
		};

	Utils.arrFilter = Array.prototype.filter ?
		function(arr, fn) {
			return arr.filter(fn);
		} :
		function(arr, fn)	{
			var result = [],
				len = arr.length;
			for(var i = 0; i < len; i++) {
				if(fn(arr[i])) {
					result.push(arr[i]);
				}
			}
			return result;
		};

	Utils.arrEvery = Array.prototype.every ?
		function(arr, fn) {
			return arr.every(fn);
		} : function(arr, fn) {
			var len = arr.length;
			for(var i = 0; i < len; i++) {
				if(!fn(arr[i], i, arr)) {
					return false;
				};
			}
			return true;
		};

	Utils.allSame = function(arr, prop) {
		if(arr.length === 0) {
			return true;
		}
		var first = arr[0][prop];
		return Utils.arrEvery(arr, function(item) {
			return item[prop] === first;
		});
	};

	Utils.nextTick = Platform.nextTick;

	var contentTypes = {
		json:   'application/json',
		jsonp:  'application/javascript',
		xml:    'application/xml',
		html:   'text/html',
		msgpack: 'application/x-msgpack'
	};

	Utils.defaultGetHeaders = function(format) {
		var accept = contentTypes[format || 'json'];
		return {
			accept: accept,
			'X-Ably-Version': Defaults.apiVersion,
			'X-Ably-Lib': Defaults.libstring
		};
	};

	Utils.defaultPostHeaders = function(format) {
		var accept, contentType;
		accept = contentType = contentTypes[format || 'json'];

		return {
			accept: accept,
			'content-type': contentType,
			'X-Ably-Version': Defaults.apiVersion,
			'X-Ably-Lib': Defaults.libstring
		};
	};

	Utils.arrPopRandomElement = function(arr) {
		return arr.splice(randomPosn(arr), 1)[0];
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

	Utils.now = Date.now || function() {
		/* IE 8 */
		return new Date().getTime();
	};

	Utils.inspect = Platform.inspect;

	Utils.isErrorInfo = function(err) {
		return err.constructor.name == 'ErrorInfo'
	};

	Utils.inspectError = function(x) {
		/* redundant, but node vmcontext issue makes instanceof unreliable, and
		 * can't use just constructor test as could be a TypeError constructor etc. */
		return (x && (Utils.isErrorInfo(x) ||
			x.constructor.name == 'Error' ||
			x instanceof Error)) ?
			x.toString() :
			Utils.inspect(x);
	};

	Utils.inspectBody = function(body) {
		if(BufferUtils.isBuffer(body)) {
			return body.toString();
		} else if(typeof body === 'string') {
			return body;
		} else {
			return Platform.inspect(body);
		}
	};

	/* Data is assumed to be either a string or a buffer. */
	Utils.dataSizeBytes = function(data) {
		if(BufferUtils.isBuffer(data)) {
			return BufferUtils.byteLength(data);
		}
		if(typeof data === 'string') {
			return Platform.stringByteSize(data);
		}
		throw new Error("Expected input of Utils.dataSizeBytes to be a buffer or string, but was: " + (typeof data));
	};

	Utils.cheapRandStr = function() {
		return String(Math.random()).substr(2);
	};

	/* Takes param the minimum number of bytes of entropy the string must
	 * include, not the length of the string. String length produced is not
	 * guaranteed. */
	Utils.randomString = (Platform.getRandomValues && typeof Uint8Array !== 'undefined') ?
		function(numBytes) {
			var uIntArr = new Uint8Array(numBytes);
			Platform.getRandomValues(uIntArr);
			return BufferUtils.base64Encode(uIntArr);
		} : function(numBytes) {
			/* Old browser; fall back to Math.random. Could just use a
			 * CryptoJS version of the above, but want this to still work in nocrypto
			 * versions of the library */
			var charset = BufferUtils.base64CharSet;
			/* base64 has 33% overhead; round length up */
			var length = Math.round(numBytes * 4/3);
			var result = '';
			for(var i=0; i<length; i++) {
				result += charset[randomPosn(charset)];
			}
			return result;
		};

	Utils.randomHexString = (Platform.getRandomValues && typeof Uint8Array !== 'undefined') ?
		function(numBytes) {
			var uIntArr = new Uint8Array(numBytes);
			Platform.getRandomValues(uIntArr);
			return BufferUtils.hexEncode(uIntArr);
		} : function(numBytes) {
			var charset = BufferUtils.hexCharSet;
			var length = numBytes * 2;
			var result = '';
			for(var i=0; i<length; i++) {
				result += charset[randomPosn(charset)];
			}
			return result;
		};

	/* Pick n elements at random without replacement from an array */
	Utils.arrChooseN = function(arr, n) {
		var numItems = Math.min(n, arr.length),
			mutableArr = arr.slice(),
			result = [];
		for(var i = 0; i < numItems; i++) {
			result.push(Utils.arrPopRandomElement(mutableArr));
		}
		return result;
	};

	Utils.trim = String.prototype.trim ? function(str) {
		return str.trim();
	} : function(str) {
		return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
	};

	Utils.promisify = function(ob, fnName, args) {
		return new Promise(function(resolve, reject) {
			ob[fnName].apply(ob, Array.prototype.slice.call(args).concat(function(err, res) {
				err ? reject(err) : resolve(res);
			}));
		});
	};

	Utils.decodeBody = function(body, format) {
		return (format == 'msgpack') ? msgpack.decode(body) : JSON.parse(String(body));
	};

	Utils.encodeBody = function(body, format) {
		return (format == 'msgpack') ? msgpack.encode(body, true) : JSON.stringify(body);
	};

	return Utils;
})();
