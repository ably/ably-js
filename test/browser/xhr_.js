/*
 * Base init case
 */
var _xhr_ = {};
var xhr_ = {};
var xhrTransport = 'xhr';

xhr_.xhrbase0 = function (test) {
	sharedTests.connectionWithTransport(test, xhrTransport);
};

/*
 * Publish and subscribe, json transport
 */
xhr_.xhrppublish0 = function (test) {
	sharedTests.publishWithTransport(test, xhrTransport);
};

/*
 * Check heartbeat
 */
xhr_.xhrheartbeat0 = function (test) {
	sharedTests.heartbeatWithTransport(test, xhrTransport);
};


