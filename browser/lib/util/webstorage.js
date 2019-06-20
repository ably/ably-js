var WebStorage = (function() {
	var sessionSupported,
		localSupported,
		test = 'ablyjs-storage-test';

	/* Even just accessing the session/localStorage object can throw a
	 * security exception in some circumstances with some browsers. In
	 * others, calling setItem will throw. So have to check in this
	 * somewhat roundabout way. (If unsupported or no global object,
	 * will throw on accessing a property of undefined) */
	try {
		global.sessionStorage.setItem(test, test);
		global.sessionStorage.removeItem(test);
		sessionSupported = true;
	} catch(e) {
		sessionSupported = false;
	}

	try {
		global.localStorage.setItem(test, test);
		global.localStorage.removeItem(test);
		localSupported = true;
	} catch(e) {
		localSupported = false;
	}

	function WebStorage() {}

	function storageInterface(session) {
		return session ? global.sessionStorage : global.localStorage;
	}

	function set(name, value, ttl, session) {
		var wrappedValue = {value: value};
		if(ttl) {
			wrappedValue.expires = Utils.now() + ttl;
		}
		return storageInterface(session).setItem(name, JSON.stringify(wrappedValue));
	}

	function get(name, session) {
		var rawItem = storageInterface(session).getItem(name);
		if(!rawItem) return null;
		var wrappedValue = JSON.parse(rawItem);
		if(wrappedValue.expires && (wrappedValue.expires < Utils.now())) {
			storageInterface(session).removeItem(name);
			return null;
		}
		return wrappedValue.value;
	}

	function remove(name, session) {
		return storageInterface(session).removeItem(name);
	}

	if(localSupported) {
		WebStorage.set    = function(name, value, ttl) { return set(name, value, ttl, false); };
		WebStorage.get    = function(name) { return get(name, false); };
		WebStorage.remove = function(name) { return remove(name, false); };
	}

	if(sessionSupported) {
		WebStorage.setSession    = function(name, value, ttl) { return set(name, value, ttl, true); };
		WebStorage.getSession    = function(name) { return get(name, true); };
		WebStorage.removeSession = function(name) { return remove(name, true); };
	}

	return WebStorage;
})();
