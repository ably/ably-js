"use strict";
var fs   = require('fs');
var path = require('path');
var vm   = require('vm');

var includeScript = function(name) {
	var filename = path.resolve(__dirname, name);
	return vm.runInThisContext(fs.readFileSync(filename, 'utf8'), filename);
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

var Rest = module.exports = global.Rest;
Rest.BufferUtils = global.BufferUtils;
Rest.Crypto = global.Crypto;
Rest.Defaults = global.Defaults;
Rest.Http = global.Http;
Rest.Resource = global.Resource;
Rest.Utils = global.Utils;
Rest.Message = global.Message;
Rest.PresenceMessage = global.PresenceMessage;
