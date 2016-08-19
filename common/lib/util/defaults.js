Defaults.protocolVersion          = 1;
Defaults.ENVIRONMENT              = '';
Defaults.REST_HOST                = 'rest.ably.io';
Defaults.REALTIME_HOST            = 'realtime.ably.io';
Defaults.FALLBACK_HOSTS           = ['A.ably-realtime.com', 'B.ably-realtime.com', 'C.ably-realtime.com', 'D.ably-realtime.com', 'E.ably-realtime.com'];
Defaults.PORT                     = 80;
Defaults.TLS_PORT                 = 443;
Defaults.TIMEOUTS = {
	/* Documented as options params: */
	disconnectedRetryTimeout   : 15000,
	suspendedRetryTimeout      : 30000,
	httpRequestTimeout         : 15000,
	/* Not documented: */
	connectionStateTtl         : 120000,
	realtimeRequestTimeout     : 10000,
	recvTimeout                : 90000,
	preferenceConnectTimeout   : 6000,
	parallelUpgradeDelay       : 4000
};
Defaults.httpMaxRetryCount = 3;

Defaults.version          = '0.8.33';
Defaults.libstring        = 'js-' + Defaults.version;
Defaults.apiVersion       = '0.8';

Defaults.getHost = function(options, host, ws) {
	if(ws)
		host = ((host == options.restHost) && options.realtimeHost) || host || options.realtimeHost;
	else
		host = host || options.restHost;

	return host;
};

Defaults.getPort = function(options, tls) {
	return (tls || options.tls) ? options.tlsPort : options.port;
};

Defaults.getHttpScheme = function(options) {
	return options.tls ? 'https://' : 'http://';
};

Defaults.getHosts = function(options) {
	var hosts = [options.restHost],
		fallbackHosts = options.fallbackHosts,
		httpMaxRetryCount = typeof(options.httpMaxRetryCount) !== 'undefined' ? options.httpMaxRetryCount : Defaults.httpMaxRetryCount;

	if(fallbackHosts) {
		hosts = hosts.concat(Utils.arrChooseN(fallbackHosts, httpMaxRetryCount));
	}
	return hosts;
};

Defaults.normaliseOptions = function(options) {
	/* Deprecated options */
	if(options.host) {
		Logger.deprecated('host', 'restHost');
		options.restHost = options.host;
	}
	if(options.wsHost) {
		Logger.deprecated('wsHost', 'realtimeHost');
		options.realtimeHost = options.wsHost;
	}
	if(options.queueEvents) {
		Logger.deprecated('queueEvents', 'queueMessages');
		options.queueMessages = options.queueEvents;
	}

	if(options.recover === true) {
		Logger.deprecated('{recover: true}', '{recover: function(lastConnectionDetails, cb) { cb(true); }}');
		options.recover = function(lastConnectionDetails, cb) { cb(true); };
	}

	if(typeof options.recover === 'function' && options.closeOnUnload === true) {
		Logger.logAction(LOG_ERROR, 'Defaults.normaliseOptions', 'closeOnUnload was true and a session recovery function was set - these are mutually exclusive, so unsetting the latter');
		options.recover = null;
	}

	if(options.transports && Utils.arrIn(options.transports, 'xhr')) {
		Logger.deprecated('transports: ["xhr"]', 'transports: ["xhr_streaming"]');
		Utils.arrDeleteValue(options.transports, 'xhr');
		options.transports.push('xhr_streaming');
	}

	if(!('queueMessages' in options))
		options.queueMessages = true;

	if(options.restHost) {
		options.realtimeHost = options.realtimeHost || options.restHost;
	} else {
		var environment = (options.environment && String(options.environment).toLowerCase()) || Defaults.ENVIRONMENT,
		production = !environment || (environment === 'production');
		options.restHost = production ? Defaults.REST_HOST : environment + '-' + Defaults.REST_HOST;
		options.realtimeHost = production ? Defaults.REALTIME_HOST : environment + '-' + Defaults.REALTIME_HOST;
		options.fallbackHosts = production ? Defaults.FALLBACK_HOSTS : options.fallbackHosts;
	}
	options.port = options.port || Defaults.PORT;
	options.tlsPort = options.tlsPort || Defaults.TLS_PORT;
	if(!('tls' in options)) options.tls = true;

	/* Allow values passed in options to override default timeouts */
	options.timeouts = {};
	for(var prop in Defaults.TIMEOUTS) {
		options.timeouts[prop] = options[prop] || Defaults.TIMEOUTS[prop];
	};

	return options;
};
