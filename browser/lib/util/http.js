this.Http = (function() {
	function Http() {}

	if(ConnectionManager.httpTransports.xhr) {
		Http.get = XHRTransport.get;
		Http.post = XHRTransport.post;
	} else {
		Http.get = JSONPTransport.get;
	}

	return Http;
})();
