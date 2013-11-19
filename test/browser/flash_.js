/*
 * Flash init case
 */
var _flash_ = {};
var flash_ = {};
var flashTransport = 'flash_socket';

flash_.flashbase0 = function (test) {
	sharedTests.connectionWithTransport(test, flashTransport);
};

/*
 * Publish and subscribe, json transport
 */
flash_.flashppublish0 = function (test) {
	sharedTests.publishWithTransport(test, flashTransport);
};

/*
 * Check heartbeat
 */
flash_.flashheartbeat0 = function (test) {
	sharedTests.heartbeatWithTransport(test, flashTransport);
};