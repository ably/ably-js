/*
 * Flash init case
 */
var _flash = {};
var flash = this.flash = {};
var flashTransport = 'flash_socket';

flash.flashbase0 = function (test) {
	sharedTests.connectionWithTransport(test, flashTransport);
};

/*
 * Publish and subscribe, json transport
 */
flash.flashppublish0 = function (test) {
	sharedTests.publishWithTransport(test, flashTransport);
};

/*
 * Check heartbeat
 */
flash.flashheartbeat0 = function (test) {
	sharedTests.heartbeatWithTransport(test, flashTransport);
};