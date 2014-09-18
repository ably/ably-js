/*
 * Flash init case
 */
var _flash_ = {};
var flash_ = {};
var flashTransport = 'flash_socket';

if(simple.isTransportAvailable(flashTransport)) {
	flash_.flashbase0 = function (test) {
		simple.connectionWithTransport(test, flashTransport);
	};

	/*
	 * Publish and subscribe, json transport
	 */
	flash_.flashppublish0 = function (test) {
		simple.publishWithTransport(test, flashTransport);
	};

	/*
	 * Check heartbeat
	 */
	flash_.flashheartbeat0 = function (test) {
		simple.heartbeatWithTransport(test, flashTransport);
	};
}
