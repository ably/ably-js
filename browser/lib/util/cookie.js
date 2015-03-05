var Cookie = (function() {
	var isBrowser = (typeof(window) == 'object');
	function noop() {}

	function Cookie() {}

	if(isBrowser) {
		Cookie.create = function(name, value, ttl) {
			var expires = '';
			if(ttl) {
				var date = new Date();
				date.setTime(date.getTime() + ttl);
				expires = '; expires=' + date.toGMTString();
			}
			document.cookie = name + '=' + value + expires + '; path=/';
		};

		Cookie.read = function(name) {
			var nameEQ = name + '=';
			var ca = document.cookie.split(';');
			for(var i=0; i < ca.length; i++) {
				var c = ca[i];
				while(c.charAt(0)==' ') c = c.substring(1, c.length);
				if(c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
			}
			return null;
		};

		Cookie.erase = function(name) {
			createCookie(name, '', -1 * 3600 * 1000);
		};
	}

	return Cookie;
})();
