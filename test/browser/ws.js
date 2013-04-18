/*
 * Base init case
 */
var _ws = {};
var ws = this.ws = {};
var wsTransport = 'web_socket';

ws.wsbase0 = function (test) {
	sharedTests.connectionWithTransport(test, wsTransport);
};

/*
 * Publish and subscribe, json transport
 */
ws.wspublish0 = function (test) {
	sharedTests.publishWithTransport(test, wsTransport);
};

/*
 * Check heartbeat
 */
ws.wsheartbeat0 = function (test) {
	sharedTests.heartbeatWithTransport(test, wsTransport);
};