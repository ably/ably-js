"use strict";

/* Test data loader module */

define(['spec/common/modules/testapp_manager'], function(testAppManager) {
	function loadTestDataBrowser(dataPath, callback) {
		var getOptions = {
			host: window.location.hostname,
			port: window.location.port,
			path: '/' + dataPath,
			method: 'GET',
			scheme: window.location.protocol.slice(0, -1),
			headers: { 'Content-Type': 'application/json' }
		};

		testAppManager.httpReq(getOptions, function(err, data) {
			try {
				data = JSON.parse(data);
			} catch(e) {
				callback(e);
				return;
			}
			callback(null, data);
		});
	}

	function loadTestDataNode(dataPath, callback) {
		var fs = require('fs'),
				path = require('path'),
				resolvedPath = path.resolve(__dirname, '../../..', dataPath);

		fs.readFile(resolvedPath, function(err, data) {
			if(err) {
				callback(err);
				return;
			}
			try {
				data = JSON.parse(data);
			} catch(e) {
				callback(e);
				return;
			}
			callback(null, data);
		});
	}

	return module.exports = {
		loadTestData: isBrowser ? loadTestDataBrowser : loadTestDataNode
	};
});
