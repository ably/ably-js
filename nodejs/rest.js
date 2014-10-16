"use strict";
var fs   = require('fs');
var path = require('path');
var vm   = require('vm');

var context = vm.createContext({
	require:require,
	console:console,
	process:process,
	Buffer:Buffer,
	setTimeout:setTimeout,
	setInterval:setInterval,
	clearTimeout:clearTimeout,
	clearInterval:clearInterval,
	global:global
});

var includeScript = function(name) {
	var filename = path.resolve(__dirname, name);
	return vm.runInContext(fs.readFileSync(filename, 'utf8'), context, filename);
};

/* include libraries */
includeScript('./lib/util/bufferutils.js');
includeScript('./lib/util/http.js');
includeScript('./lib/util/defaults.js');
includeScript('../common/lib/util/eventemitter.js');
includeScript('../common/lib/util/logger.js');
includeScript('../common/lib/util/utils.js');
includeScript('./lib/util/crypto.js');
includeScript('../common/lib/types/data.js');
includeScript('../common/lib/types/message.js');
includeScript('../common/lib/types/presencemessage.js');
includeScript('../common/lib/client/resource.js');
includeScript('../common/lib/client/paginatedresource.js');
includeScript('../common/lib/client/auth.js');
includeScript('../common/lib/client/channel.js');
includeScript('../common/lib/client/rest.js');

var Rest = module.exports = context.Rest;
Rest.Crypto = context.Crypto;
Rest.Http = context.Http;
