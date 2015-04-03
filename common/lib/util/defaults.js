Defaults.protocolVersion          = 1;
Defaults.ENVIRONMENT              = '';
Defaults.HOST                     = 'rest.ably.io';
Defaults.WS_HOST                  = 'realtime.ably.io';
Defaults.FALLBACK_HOSTS           = ['A.ably-realtime.com', 'B.ably-realtime.com', 'C.ably-realtime.com', 'D.ably-realtime.com', 'E.ably-realtime.com'];
Defaults.PORT                     = 80;
Defaults.TLS_PORT                 = 443;
Defaults.connectTimeout           = 15000;
Defaults.disconnectTimeout        = 30000;
Defaults.suspendedTimeout         = 120000;
Defaults.recvTimeout              = 90000;
Defaults.sendTimeout              = 10000;
Defaults.connectionPersistTimeout = 15000;
Defaults.version                  = '0.7.7';

Defaults.getHost = function(options, host, ws) {
	if(ws)
		host = ((host == options.host) && options.wsHost) || host || options.wsHost;
	else
		host = host || options.host;

	return host;
};

Defaults.getPort = function(options, tls) {
	return (tls || options.tls) ? options.tlsPort : options.port;
};

Defaults.getHosts = function(options) {
	var hosts = [options.host],
		fallbackHosts = options.fallbackHosts;

	if(fallbackHosts) hosts = hosts.concat(fallbackHosts);
	return hosts;
};

Defaults.normaliseOptions = function(options) {
	if(options.host) {
		options.wsHost = options.wsHost || options.host;
	} else {
		var environment = (options.environment && String(options.environment).toLowerCase()) || Defaults.ENVIRONMENT,
			production = !environment || (environment === 'production');
		options.host = production ? Defaults.HOST : environment + '-' + Defaults.HOST;
		options.wsHost = production ? Defaults.WS_HOST : environment + '-' + Defaults.WS_HOST;
		options.fallbackHosts = production ? Defaults.FALLBACK_HOSTS : options.fallbackHosts;
	}
	options.port = options.port || Defaults.PORT;
	options.tlsPort = options.tlsPort || Defaults.TLS_PORT;
	if(!('tls' in options)) options.tls = true;

	return options;
};
