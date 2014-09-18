/*
 * Choose best available transport
 */
var auto_transport_ = {};

auto_transport_.auto_transport_base0 = function (test) {
	simple.connectionWithTransport(test);
};

/*
 * Publish and subscribe, json transport
 */
auto_transport_.auto_transport_publish0 = function (test) {
	simple.publishWithTransport(test);
};

/*
 * Check heartbeat
 */
auto_transport_.auto_transport_heartbeat0 = function (test) {
	simple.heartbeatWithTransport(test);
};
