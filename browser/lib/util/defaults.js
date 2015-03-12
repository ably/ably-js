var Defaults = {
	protocolVersion:          1,
	HOST:                     'rest.ably.io',
	WS_HOST:                  'realtime.ably.io',
	FALLBACK_HOSTS:           ['A.ably-realtime.com', 'B.ably-realtime.com', 'C.ably-realtime.com', 'D.ably-realtime.com', 'E.ably-realtime.com'],
	PORT:                     80,
	TLS_PORT:                 443,
	connectTimeout:           15000,
	disconnectTimeout:        30000,
	suspendedTimeout:         120000,
	recvTimeout:              90000,
	sendTimeout:              10000,
	connectionPersistTimeout: 15000,
	httpTransports:           ['xhr', 'iframe', 'jsonp'],
	transports:               ['web_socket', 'xhr', 'iframe', 'jsonp'],
	version:                  '0.7.3',
	minified:                 !(function _(){}).name
};

/* If an environment option is provided, the environment is prefixed to the domain
   i.e. rest.ably.io with environment sandbox becomes sandbox-rest.ably.io */
Defaults.environmentHost = function(environment, host) {
	if (!environment || (String(environment).toLowerCase() === 'production')) {
		return host;
	} else {
		return [String(environment).toLowerCase(), host].join('-');
	}
};

Defaults.getHost = function(options, host, ws) {
	var defaultHost = Defaults.environmentHost(options.environment, Defaults.HOST);
	host = host || options.host || defaultHost;
	if(ws)
		host = ((host == options.host) && (options.wsHost || host))
			|| ((host == defaultHost) && (Defaults.environmentHost(options.environment, Defaults.WS_HOST) || host))
			|| host;
	return host;
};

Defaults.getPort = function(options, tls) {
	return (tls || options.tls) ? (options.tlsPort || Defaults.TLS_PORT) : (options.port || Defaults.PORT);
};

Defaults.getHosts = function(options) {
	var hosts,
			options = options || {};
	if(options.host) {
		hosts = [options.host];
		if(options.fallbackHosts)
			hosts.concat(options.fallbackHosts);
	} else {
		hosts = [Defaults.environmentHost(options.environment, Defaults.HOST)].concat(Defaults.FALLBACK_HOSTS);
	}
	return hosts;
};

if (typeof exports !== 'undefined' && this.exports !== exports) {
	exports.defaults = Defaults;
}
