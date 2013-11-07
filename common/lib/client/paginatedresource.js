var PaginatedResource = (function() {

	function PaginatedResource(rest, path, headers, params, bodyHandler) {
		this.rest = rest;
		this.path = path;
		this.headers = headers;
		this.params = params;
		this.bodyHandler = bodyHandler;
		this.basePath = path.substr(0, path.lastIndexOf('/') + 1);
		this.current = null;
	}

	PaginatedResource.prototype.get = function(callback) {
		var self = this;
		Resource.get(this.rest, this.path, this.headers, this.params, function(err, body, headers) {
			if(err) {
				Logger.logAction(Logger.LOG_ERROR, 'PaginatedResource.get()', 'Unexpected error getting resource: err = ' + err);
				return;
			}
			var current = self.current = self.bodyHandler(body);
			var linkHeaders, relLinks;
			if(headers && (linkHeaders = (headers['Link'] || headers['link'])))
				relLinks = self.parseRelLinks(linkHeaders.split(','));

			callback(null, current, relLinks);
		});
	};

	PaginatedResource.prototype.parseRelLinks = function(linkHeaders) {
		var relLinks = {}, self = this;
		for(var i = 0; i < linkHeaders.length; i++) {
			var linkMatch = linkHeaders[i].match(/^\s*<(.+)>;\s*rel="(\w+)"$/);
			if(linkMatch) {
				var relLink = self.getRel(linkMatch[1]);
				if(relLink)
					relLinks[linkMatch[2]] = relLink;
			}
		}
		return relLinks;
	};

	PaginatedResource.prototype.getRel = function(linkUrl) {
		var urlMatch = linkUrl.match(/^\.\/(\w+)\?(.*)$/);
		if(!urlMatch) return null;

		var self = this;
		return function(callback) {
			(new PaginatedResource(self.rest, self.basePath + urlMatch[1], self.headers, Utils.parseQueryString(urlMatch[2]), self.bodyHandler)).get(callback);
		};
	};

	return PaginatedResource;
})();