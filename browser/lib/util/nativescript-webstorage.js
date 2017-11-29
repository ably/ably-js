var WebStorage = (function() {
	var appSettings = require("application-settings");

	function WebStorage() {}

	function set(name, value, ttl) {
		var wrappedValue = {value: value};
		if(ttl) {
			wrappedValue.expires = Utils.now() + ttl;
		}
		return appSettings.setString(name, JSON.stringify(wrappedValue));
	}

	function get(name) {
		var rawItem = appSettings.getString(name);
		if(!rawItem) return null;
		var wrappedValue = JSON.parse(rawItem);
		if(wrappedValue.expires && (wrappedValue.expires < Utils.now())) {
			appSettings.remove(name);
			return null;
		}
		return wrappedValue.value;
	}

	WebStorage.prototype.supportsLocal = true;
	WebStorage.prototype.supportsSession = false;

	WebStorage.prototype.set    = function(name, value, ttl) { return set(name, value, ttl); };
	WebStorage.prototype.get    = function(name) { return get(name); };
	WebStorage.prototype.remove = function(name) { return appSettings.remove(name); };

	return WebStorage;
})();
