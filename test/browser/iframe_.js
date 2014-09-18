/*
 * Base init case
 */
var _iframe_ = {};
var iframe_ = {};
var iframeTransport = 'iframe';

if(simple.isTransportAvailable(iframeTransport)) {
	iframe_.iframebase0 = function (test) {
		simple.connectionWithTransport(test, iframeTransport);
	};

	/*
	 * Publish and subscribe, json transport
	 */
	iframe_.iframepublish0 = function (test) {
		simple.publishWithTransport(test, iframeTransport);
	};

	/*
	 * Check heartbeat
	 */
	iframe_.iframeheartbeat0 = function (test) {
		simple.heartbeatWithTransport(test, iframeTransport);
	};
}
