var Defaults = {
	protocolVersion:   1,
	HOST:              'rest.ably.io',
	WS_HOST:           'realtime.ably.io',
	FALLBACK_HOSTS:    ['A.ably-realtime.com', 'B.ably-realtime.com', 'C.ably-realtime.com', 'D.ably-realtime.com', 'E.ably-realtime.com'],
	PORT:              80,
	TLS_PORT:          443,
	connectTimeout:    15000,
	disconnectTimeout: 30000,
	suspendedTimeout:  120000,
	cometRecvTimeout:  90000,
	cometSendTimeout:  10000,
	httpTransports:    ['comet'],
	transports:        ['web_socket', 'comet']
};

Defaults.getHost = function(options, host, ws) {
	host = host || options.host || Defaults.HOST;
	if(ws)
		host = ((host == options.host) && (options.wsHost || host))
			|| ((host == Defaults.HOST) && (Defaults.WS_HOST || host))
			|| host;
	return host;
};

Defaults.getPort = function(options) {
	return options.encrypted ? (options.tlsPort || Defaults.TLS_PORT) : (options.port || Defaults.PORT);
};

Defaults.getHosts = function(options) {
	var hosts;
	if(options.host) {
		hosts = [options.host];
		if(options.fallbackHosts)
			hosts.concat(options.fallbackHosts);
	} else {
		hosts = [options.host].concat(Defaults.FALLBACK_HOSTS);
	}
	return hosts;
};

