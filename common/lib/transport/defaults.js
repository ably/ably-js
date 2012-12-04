var Defaults = {
	protocolVersion:   1,
	REST_HOST:         'rest.ably.io',
	CDN_HOST:          'rest.ably.io',
	WS_HOST:           'realtime.ably.io',
	WS_PORT:           80,
	WSS_PORT:          443,
	HOST_DEBUG:        'sandbox.ably.io',
	connectTimeout:    20000,
	disconnectTimeout: 60000,
	suspendedTimeout:  120000,
	cometRecvTimeout:  90000,
	cometSendTimeout:  10000,
	transports:        ['web_socket', 'flash_socket', 'xhr', 'jsonp']
};
