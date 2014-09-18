/*
 * Base init case
 */
var _ws_ = {};
var ws_ = {};
var wsTransport = 'web_socket';

if(simple.isTransportAvailable(wsTransport)) {
	ws_.wsbase0 = function (test) {
		simple.connectionWithTransport(test, wsTransport);
	};

	/*
	 * Publish and subscribe, json transport
	 */
	ws_.wspublish0 = function (test) {
		simple.publishWithTransport(test, wsTransport);
	};

	/*
	 * Check heartbeat
	 */
	ws_.wsheartbeat0 = function (test) {
		simple.heartbeatWithTransport(test, wsTransport);
	};
}
