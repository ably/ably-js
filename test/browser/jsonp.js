/*
 * Base init case
 */
var _jsonp = {};
var jsonp = this.jsonp = {};
var jsonpTransport = 'jsonp';

jsonp.jsonpbase0 = function (test) {
	sharedTests.connectionWithTransport(test, jsonpTransport);
};

/*
 * Publish and subscribe, json transport
 */
jsonp.jsonppublish0 = function (test) {
	sharedTests.publishWithTransport(test, jsonpTransport);
};


/*
 * Check heartbeat
 */
jsonp.jsonpheartbeat0 = function (test) {
	sharedTests.heartbeatWithTransport(test, jsonpTransport);
};