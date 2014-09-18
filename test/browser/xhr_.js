/*
 * Base init case
 */
var _xhr_ = {};
var xhr_ = {};
var xhrTransport = 'xhr';

if(simple.isTransportAvailable(xhrTransport)) {
	xhr_.xhrbase0 = function (test) {
		simple.connectionWithTransport(test, xhrTransport);
	};

	/*
	 * Publish and subscribe, json transport
	 */
	xhr_.xhrppublish0 = function (test) {
		simple.publishWithTransport(test, xhrTransport);
	};

	/*
	 * Check heartbeat
	 */
	xhr_.xhrheartbeat0 = function (test) {
		simple.heartbeatWithTransport(test, xhrTransport);
	};
}
