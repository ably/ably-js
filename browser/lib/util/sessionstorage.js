var SessionStorage = (function() {
	var supported = (typeof(window) == 'object') && window.sessionStorage;
	function SessionStorage() {}

	if(supported) {
		SessionStorage.set = function(name, value, ttl) {
			var wrappedValue = {value: value};
			if(ttl) {
				wrappedValue.expires = Utils.now() + ttl;
			}
			return window.sessionStorage.setItem(name, JSON.stringify(wrappedValue));
		}

		SessionStorage.get = function(name) {
			var rawItem = window.sessionStorage.getItem(name);
			if(!rawItem) return null;
			var wrappedValue = JSON.parse(rawItem);
			if(wrappedValue.expires && (wrappedValue.expires < Utils.now())) {
				var now = Utils.now()
				window.sessionStorage.removeItem(name);
				return null;
			}
			return wrappedValue.value;
		};

		SessionStorage.remove = function(name) {
			return window.sessionStorage.removeItem(name);
		};
	}

	return SessionStorage;
})();
