"use strict";
var WebStorage = (function() {
	var path = require('path');
	var os = require('os');
	var mkdirs = require('node-mkdirs');
	var JSONStorage = require('node-localstorage').JSONStorage;

	function storedItem(value, ttl) {
		var item = {
			value: value
		};
		if(ttl) {
			item.expires = (Date.now() + ttl);
		}
		return item;
	}

	function valid(item) {
		var expires = item.expires;
		return !expires || (Date.now() < expires);
	}

	function WebStorage(client) {
		this.client = client;
		this.storagePath = null;
		this.localStorage = null;
		this.sessionStorage = new Map();
	}

	WebStorage.prototype.supportsLocal = true;
	WebStorage.prototype.supportsSession = true;

	WebStorage.prototype.initPath = function() {
		var storagePath = this.storagePath;
		if(!storagePath) {
			var options = this.client.options, appId;
			if(options.key) {
				appId = options.key.split('.')[0];
			} else {
				var authOptions = this.client.auth.authOptions,
					token = authOptions.tokenDetails.token;
				if(!token) {
					throw new Error('Unable to initialise WebStorage; no key or token available');
				}
				appId = token.split('.')[0];
			}
			storagePath = this.storagePath = path.resolve(os.homedir(), '.ably-js/localStorage', appId);
		}
		return storagePath;
	};

	WebStorage.prototype.init = function() {
		var localStorage = this.localStorage;
		if(!localStorage) {
			var storagePath = this.initPath();
			mkdirs(storagePath);
			console.log('**** storage path: ' + storagePath);
			localStorage = this.localStorage = new JSONStorage(storagePath);
		}
		return localStorage;
	};

	WebStorage.prototype.set = function(name, value, ttl) {
		this.init().setItem(name, storedItem(value, ttl));
	};

	WebStorage.prototype.get = function(name) {
		var localStorage = this.localStorage;
		if(localStorage) {
			var storedItem = localStorage.getItem(name);
			if(storedItem) {
				if(valid(storedItem)) {
					return storedItem.value;
				}
				localStorage.removeItem(name);
			}
		}
		return null;
	};

	WebStorage.prototype.remove = function(name) {
		var localStorage = this.localStorage;
		if(localStorage) {
			localStorage.removeItem(name);
		}
	};

	WebStorage.prototype.setSession = function(name, value, ttl) {
		this.sessionStorage.set(name, storedItem(value, ttl));
	};

	WebStorage.prototype.getSession = function(name) {
		var sessionStorage = this.sessionStorage;
		var storedItem = sessionStorage.get(name);
		if(storedItem) {
			if(valid(storedItem)) {
				return storedItem.value;
			}
			sessionStorage.delete(name);
		}
		return null;
	};

	WebStorage.prototype.removeSession = function(name) {
		this.sessionStorage.delete(name);
	};

	return WebStorage;
})();
