var PaginatedResource = (function() {
	var qs = require('querystring');
	var url = require('url');

	function PaginatedResource(rest, path, headers, params, bodyHandler) {
		this.rest = rest;
		this.path = path;
		this.headers = headers;
		this.params = params;
		this.bodyHandler = bodyHandler;
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
			if(linkMatch)
				relLinks[linkMatch[2]] = self.getRel(linkMatch[1]);
		}
		return relLinks;
	};

	PaginatedResource.prototype.getRel = function(linkUrl) {
		var relUrl = url.parse(linkUrl, true),
			relPath = url.resolve(this.path, relUrl.path),
			self = this;
		return function(callback) {
			(new PaginatedResource(self.rest, relPath, self.headers, relUrl.query, self.bodyHandler)).get(callback);
		};
	};

	return PaginatedResource;
})();