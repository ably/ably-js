var Defaults = {
	protocolVersion:   1,
	REST_HOST:         'rest.ably.io',
	WS_HOST:           'realtime.ably.io',
	FALLBACK_HOSTS:    ['A.ably-realtime.com', 'B.ably-realtime.com', 'C.ably-realtime.com', 'D.ably-realtime.com', 'E.ably-realtime.com'],
	WS_PORT:           80,
	WSS_PORT:          443,
	connectTimeout:    15000,
	disconnectTimeout: 30000,
	suspendedTimeout:  120000,
	cometRecvTimeout:  90000,
	cometSendTimeout:  10000,
	transports:        ['xhr', 'web_socket', 'flash_socket', 'jsonp'],
	transportPriority: {'web_socket': 2, 'flash_socket': 2, 'xhr': 1, 'jsonp': 0},
	flashTransport:    {swfLocation: 'swf/WebSocketMainInsecure-0.9.swf'}
};
