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
includeScript('./platform.js');
includeScript('./lib/util/defaults.js');
includeScript('./lib/util/bufferutils.js');
includeScript('../common/lib/util/utils.js');
includeScript('./lib/util/http.js');
includeScript('../common/lib/util/defaults.js');
includeScript('../common/lib/util/eventemitter.js');
includeScript('../common/lib/util/logger.js');
includeScript('../common/lib/util/multicaster.js');
includeScript('./lib/util/crypto.js');
includeScript('../common/lib/types/errorinfo.js');
includeScript('../common/lib/types/message.js');
includeScript('../common/lib/types/presencemessage.js');
includeScript('../common/lib/types/stats.js');
includeScript('../common/lib/types/devicedetails.js');
includeScript('../common/lib/types/pushchannelsubscription.js');
includeScript('../common/lib/client/resource.js');
includeScript('../common/lib/client/paginatedresource.js');
includeScript('../common/lib/client/auth.js');
includeScript('../common/lib/client/presence.js');
includeScript('../common/lib/client/push.js');
includeScript('../common/lib/client/channel.js');
includeScript('../common/lib/client/rest.js');

var Rest = module.exports = context.Rest;
Rest.BufferUtils = context.BufferUtils;
Rest.Crypto = context.Crypto;
Rest.Defaults = context.Defaults;
Rest.Http = context.Http;
Rest.Resource = context.Resource;
Rest.Utils = context.Utils;
Rest.Message = context.Message;
Rest.PresenceMessage = context.PresenceMessage;
