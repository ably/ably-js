/*
 * Base init case
 */
var _jsonp_ = {};
var jsonp_ = {};
var jsonpTransport = 'jsonp';

if(simple.isTransportAvailable(jsonpTransport)) {
	jsonp_.jsonpbase0 = function (test) {
		simple.connectionWithTransport(test, jsonpTransport);
	};

	/*
	 * Publish and subscribe, json transport
	 */
	jsonp_.jsonppublish0 = function (test) {
		simple.publishWithTransport(test, jsonpTransport);
	};


	/*
	 * Check heartbeat
	 */
	jsonp_.jsonpheartbeat0 = function (test) {
		simple.heartbeatWithTransport(test, jsonpTransport);
	};
}
