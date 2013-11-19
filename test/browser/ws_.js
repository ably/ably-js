/*
 * Base init case
 */
var _ws_ = {};
var ws_ = {};
var wsTransport = 'web_socket';

ws_.wsbase0 = function (test) {
	sharedTests.connectionWithTransport(test, wsTransport);
};

/*
 * Publish and subscribe, json transport
 */
ws_.wspublish0 = function (test) {
	sharedTests.publishWithTransport(test, wsTransport);
};

/*
 * Check heartbeat
 */
ws_.wsheartbeat0 = function (test) {
	sharedTests.heartbeatWithTransport(test, wsTransport);
};