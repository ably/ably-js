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
		var self = this;
		Resource.get(self.rest, self.path, self.headers, params, self.envelope, function(err, body, headers, unpacked) {
			self.handlePage(err, body, headers, unpacked, callback);
		});
	};

	PaginatedResource.prototype.handlePage = function(err, body, headers, unpacked, callback) {
		if(err) {
			Logger.logAction(Logger.LOG_ERROR, 'PaginatedResource.get()', 'Unexpected error getting resource: err = ' + JSON.stringify(err));
			callback(err);
			return;
		}
		var items, linkHeader, relParams;
		try {
			items = this.bodyHandler(body, headers, unpacked);
		} catch(e) {
			callback(e);
			return;
		}

		if(headers && (linkHeader = (headers['Link'] || headers['link']))) {
			relParams = parseRelLinks(linkHeader);
		}

		callback(null, new PaginatedResult(this, items, relParams));
	};

	function PaginatedResult(resource, items, relParams) {
		this.resource = resource;
		this.items = items;

		var self = this;
		if('first' in relParams)
			this.first = function(cb) { self.get(relParams.first, cb); };
		if('current' in relParams)
			this.current = function(cb) { self.get(relParams.current, cb); };
		if('next' in relParams)
			this.next = function(cb) { self.get(relParams.next, cb); };
	}

	PaginatedResult.prototype.get = function(params, callback) {
		var res = this.resource;
		Resource.get(res.rest, res.path, res.headers, params, res.envelope, function(err, body, headers, unpacked) {
			res.handlePage(err, body, headers, unpacked, callback);
		});
	};

	return PaginatedResource;
})();