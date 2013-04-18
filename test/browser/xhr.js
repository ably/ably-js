/*
 * Base init case
 */
var _xhr = {};
var xhr = this.xhr = {};
var xhrTransport = 'xhr';

xhr.xhrbase0 = function (test) {
	sharedTests.connectionWithTransport(test, xhrTransport);
};

/*
 * Publish and subscribe, json transport
 */
xhr.xhrppublish0 = function (test) {
	sharedTests.publishWithTransport(test, xhrTransport);
};

/*
 * Check heartbeat
 */
xhr.xhrheartbeat0 = function (test) {
	sharedTests.heartbeatWithTransport(test, xhrTransport);
};


