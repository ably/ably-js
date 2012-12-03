var Utils = (function() {
	var isBrowser = (typeof(window) == 'object');

	function Utils() {}

	/*
	 * Add a set of properties to a target object
	 * target: the target object
	 * props:  an object whose enumerable properties are
	 *         added, by reference only
	 */
	Utils.addProperties = Utils.mixin = function(target, src) {
		for(var prop in src)
			target[prop] = src[prop];
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
	 * Ensure a directory and its parents exists
	 * dirPath: path to the directory
	 */
	Utils.mkdirs = function(dirPath) {
		var pathElements = dirPath.split('/');
		dirPath = (dirPath[0] == '/') ? '/' : '';
		while(pathElements.length) {
			var elt = pathElements.shift();
			if(elt == '') continue;
			dirPath = path.resolve(dirPath, elt);
			if(path.existsSync(dirPath)) {
				var stat = fs.statSync(dirPath);
				if(stat.isFile())
					throw new Error('Utils.mkdirs: specified path is a file');
				if(stat.isDirectory())
					continue;
			}
			fs.mkdirSync(dirPath);
		}
		return dirPath;
	};

	/*
	 * Delete a directory, recursively deleting its
	 * children as required.
	 * dirPath: the directory to delete.
	 */
	Utils.deleteDir = function(dirPath) {
		if(!path.existsSync(dirPath))
			return;
		var stat = fs.statSync(dirPath);
		if(!stat.isDirectory())
			throw new Error('Utils.deleteDir: specified path is not a directory');

		var files = fs.readdirSync(dirPath);
		for(var i in files) {
			var item = path.resolve(dirPath, files[i]);
			stat = fs.statSync(item);
			if(stat.isFile())
				fs.unlinkSync(item);
			else
				Utils.deleteDir(item);
		}
		fs.rmdirSync(dirPath);
	};

	/*
	 * Copy a file, including cross-mount copy.
	 * Optionally force overwrite if destination already exists.
	 * source:    path to source file.
	 * dest:      path to destination (includes name of copied file)
	 * overwrite: boolean, force overwrite
	 */
	Utils.copyFile = function(source, dest, overwrite) {
		if(!path.existsSync(source))
			throw new Error('Utils.copyFile: specified source file does not exist');
		if(path.existsSync(dest)) {
			if(!overwrite)
				throw new Error('Utils.copyFile: specified dest file aleady exists');
			fs.unlink(dest);
		}
		var destDir = path.dirname(dest);
		Utils.mkdirs(destDir);
		var buf = new Buffer(1024);
		var sourceFd = fs.openSync(source, 'r');
		var destFd = fs.openSync(dest, 'w');
		var read;
		while((read = fs.readSync(sourceFd, buf, 0, 1024)) > 0)
			fs.writeSync(destFd, buf, 0, read);
		fs.closeSync(sourceFd);
		fs.fsyncSync(destFd);
		fs.closeSync(destFd);
	};

	/*
	 * Copy a directory, including cross-mount copy.
	 * Optionally force overwrite if destination already exists.
	 * source:    path to source directory.
	 * dest:      path to destination (includes name of copied directory)
	 * overwrite: boolean, force overwrite
	 */
	Utils.copyDir = function(source, dest, overwrite) {
		if(!path.existsSync(source))
			throw new Error('Utils.copyDir: specified source dir does not exist');
		if(path.existsSync(dest)) {
			if(!overwrite)
				throw new Error('Utils.copyDir: specified dest dir aleady exists');
			Utils.deleteDir(dest);
		}
		Utils.mkdirs(dest);
		var files = fs.readdirSync(source);
		for(var i in files) {
			var item = path.resolve(source, files[i]);
			stat = fs.statSync(item);
			if(stat.isFile())
				Utils.copyFile(item, path.resolve(dest, files[i]), false);
			else
				Utils.copyDir(item, path.resolve(dest, files[i]), false);
		}
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
	Utils.inherits = function(ctor, superCtor) {
		ctor.super_ = superCtor;
		ctor.prototype = Object.create(superCtor.prototype, {
			constructor: {
				value: ctor,
				enumerable: false,
				writable: true,
				configurable: true
			}
		});
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
		json:  'application/json',
		jsonp: 'application/javascript',
		xml:   'application/xml',
		html:  'text/html'
	};

	Utils.defaultHeaders = function(format) {
		var mimeType = contentTypes[format];
		return {
			accept: mimeType,
			'content-type': mimeType
		};
	};

	return Utils;
})();
