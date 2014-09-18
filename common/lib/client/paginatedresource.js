var PaginatedResource = (function() {

	function getRelParams(linkUrl) {
		var urlMatch = linkUrl.match(/^\.\/(\w+)\?(.*)$/);
		return urlMatch && Utils.parseQueryString(urlMatch[2]);
	}

	function parseRelLinks(linkHeader) {
		if(typeof(linkHeader) == 'string')
			linkHeader = linkHeader.split(',');

		var relParams = {};
		for(var i = 0; i < linkHeader.length; i++) {
			var linkMatch = linkHeader[i].match(/^\s*<(.+)>;\s*rel="(\w+)"$/);
			if(linkMatch) {
				var params = getRelParams(linkMatch[1]);
				if(params)
					relParams[linkMatch[2]] = params;
			}
		}
		return relParams;
	}

	function PaginatedResource(rest, path, headers, params, envelope, bodyHandler) {
		this.rest = rest;
		this.path = path;
		this.headers = headers;
		this.params = params;
		this.envelope = envelope;
		this.bodyHandler = bodyHandler;
	}

	PaginatedResource.prototype.get = function(callback) {
		var self = this;
		Resource.get(this.rest, this.path, this.headers, this.params, this.envelope, function(err, body, headers) {
			if(err) {
				Logger.logAction(Logger.LOG_ERROR, 'PaginatedResource.get()', 'Unexpected error getting resource: err = ' + JSON.stringify(err));
				return;
			}
			var current, linkHeader, relLinks;
			try {
				current = self.bodyHandler(body);
			} catch(e) {
				callback(e);
				return;
			}

			if(headers && (linkHeader = (headers['Link'] || headers['link'])))
				relLinks = parseRelLinks(linkHeader);

			callback(null, current, relLinks);
		});
	};

	return PaginatedResource;
})();