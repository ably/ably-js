var Defaults = {
	protocolVersion:   1,
	HOST:              'rt0.ably.io',
	HOST_CDN:          'localhost',
	HOST_DEBUG:        'sandbox.ably.io',
	PATH:              '/',
	HTTP_PORT:         8092,
	HTTPS_PORT:        443,
	WS_PORT:           8080,
	WSS_PORT:          443,
	STATIC_PATH:       '/',
	connectTimeout:    20000,
	disconnectTimeout: 60000,
	suspendedTimeout:  120000,
	cometRecvTimeout:  90000,
	cometSendTimeout:  10000,
	transports:        ['web_socket', 'flash_socket', 'xhr', 'jsonp']
};
