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

	function PaginatedResource(rest, path, headers, envelope, bodyHandler) {
		this.rest = rest;
		this.path = path;
		this.headers = headers;
		this.envelope = envelope;
		this.bodyHandler = bodyHandler;
	}

	PaginatedResource.prototype.get = function(params, callback) {
		this.requestPage(params)(callback);
	};

	PaginatedResource.prototype.requestPage = function(params) {
		var self = this;
		return function(callback) {
			Resource.get(self.rest, self.path, self.headers, params, self.envelope, function(err, body, headers, unpacked) {
				self.handlePage(err, body, headers, unpacked, callback);
			});
		};
	};

	PaginatedResource.prototype.handlePage = function(err, body, headers, unpacked, callback) {
		if(err) {
			Logger.logAction(Logger.LOG_ERROR, 'PaginatedResource.get()', 'Unexpected error getting resource: err = ' + JSON.stringify(err));
			callback(err);
			return;
		}
		var current, linkHeader, relLinks;
		try {
			current = this.bodyHandler(body, headers, unpacked);
		} catch(e) {
			callback(e);
			return;
		}

		if(headers && (linkHeader = (headers['Link'] || headers['link']))) {
			var relParams = parseRelLinks(linkHeader), self = this;
			for(var rel in relParams) {
				relLinks = relLinks || {};
				relLinks[rel] = self.requestPage(relParams[rel]);
			}
		}

		callback(null, current, relLinks);
	};

	return PaginatedResource;
})();