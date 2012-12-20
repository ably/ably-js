var Defaults = {
	protocolVersion:   1,
	REST_HOST:         'rest.ably.io',
	WS_HOST:           'realtime.ably.io',
	WS_PORT:           80,
	WSS_PORT:          443,
	connectTimeout:    15000,
	disconnectTimeout: 30000,
	suspendedTimeout:  120000,
	cometRecvTimeout:  90000,
	cometSendTimeout:  10000,
	transports:        ['web_socket', 'flash_socket', 'xhr', 'jsonp'],
	flashTransport:   {swfLocation: 'swf/WebSocketMainInsecure-0.9.swf'}
};
