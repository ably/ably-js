/*
 * Base init case
 */
var _jsonp_ = {};
var jsonp_ = {};
var jsonpTransport = 'jsonp';

jsonp_.jsonpbase0 = function (test) {
	sharedTests.connectionWithTransport(test, jsonpTransport);
};

/*
 * Publish and subscribe, json transport
 */
jsonp_.jsonppublish0 = function (test) {
	sharedTests.publishWithTransport(test, jsonpTransport);
};


/*
 * Check heartbeat
 */
jsonp_.jsonpheartbeat0 = function (test) {
	sharedTests.heartbeatWithTransport(test, jsonpTransport);
};