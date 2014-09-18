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
includeScript('./lib/util/http.js');
includeScript('./lib/util/thriftutil.js');
includeScript('./lib/util/defaults.js');
includeScript('../common/lib/util/eventemitter.js');
includeScript('../common/lib/util/logger.js');
includeScript('../common/lib/util/utils.js');
includeScript('../common/lib/util/multicaster.js');
includeScript('./lib/util/crypto.js');
includeScript('../common/lib/transport/connectionerror.js');
includeScript('../common/lib/transport/connectionmanager.js');
includeScript('../common/lib/transport/transport.js');
includeScript('../common/lib/transport/websockettransport.js');
includeScript('../common/lib/transport/comettransport.js');
includeScript('../common/lib/types/data.js');
includeScript('../common/lib/types/message.js');
includeScript('../common/lib/types/presencemessage.js');
includeScript('../common/lib/types/serialize.js');
includeScript('../common/lib/client/resource.js');
includeScript('../common/lib/client/paginatedresource.js');
includeScript('../common/lib/client/auth.js');
includeScript('../common/lib/client/connectionstatechange.js');
includeScript('../common/lib/client/connection.js');
includeScript('../common/lib/client/channel.js');
includeScript('../common/lib/client/realtimechannel.js');
includeScript('../common/lib/client/presence.js');
includeScript('../common/lib/client/rest.js');
includeScript('../common/lib/client/realtime.js');
includeScript('./lib/transport/nodecomettransport.js');

var Realtime = module.exports = context.Realtime;
Realtime.Crypto = context.Crypto;
Realtime.Http = context.Http;
