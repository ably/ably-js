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
	/* Undocumented, but part of the api and can be used by customers: */
	httpRequestTimeout         : 15000,
	channelRetryTimeout        : 15000,
	fallbackRetryTimeout       : 600000,
	/* For internal / test use only: */
	connectionStateTtl         : 120000,
	realtimeRequestTimeout     : 10000,
	recvTimeout                : 90000,
	preferenceConnectTimeout   : 6000,
	parallelUpgradeDelay       : 6000
};
Defaults.httpMaxRetryCount = 3;
Defaults.maxMessageSize    = 65536;

Defaults.errorReportingUrl = 'https://errors.ably.io/api/15/store/';
Defaults.errorReportingHeaders = {
	"X-Sentry-Auth": "Sentry sentry_version=7, sentry_key=a04e33c8674c451f8a310fbec029acf5, sentry_client=ably-js/0.1",
	"Content-Type": "application/json"
};

Defaults.version          = '1.1.24';
Defaults.libstring        = Platform.libver + '-' + Defaults.version;
Defaults.apiVersion       = '1.1';

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

Defaults.getFallbackHosts = function(options) {
	var fallbackHosts = options.fallbackHosts,
		httpMaxRetryCount = typeof(options.httpMaxRetryCount) !== 'undefined' ? options.httpMaxRetryCount : Defaults.httpMaxRetryCount;

	return fallbackHosts ? Utils.arrChooseN(fallbackHosts, httpMaxRetryCount) : [];
};

Defaults.getHosts = function(options) {
	return [options.restHost].concat(Defaults.getFallbackHosts(options));
};

function checkHost(host) {
	if(typeof host !== 'string') {
		throw new ErrorInfo('host must be a string; was a ' + typeof host, 40000, 400);
	};
	if(!host.length) {
		throw new ErrorInfo('host must not be zero-length', 40000, 400);
	};
}

Defaults.objectifyOptions = function(options) {
	if(typeof options == 'string') {
		return (options.indexOf(':') == -1) ? {token: options} : {key: options};
	}
	return options;
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
		Logger.logAction(Logger.LOG_ERROR, 'Defaults.normaliseOptions', 'closeOnUnload was true and a session recovery function was set - these are mutually exclusive, so unsetting the latter');
		options.recover = null;
	}

	if(!('closeOnUnload' in options)) {
		/* Have closeOnUnload default to true unless we have any indication that
		 * the user may want to recover the connection */
		options.closeOnUnload = !options.recover;
	}

	if(options.transports && Utils.arrIn(options.transports, 'xhr')) {
		Logger.deprecated('transports: ["xhr"]', 'transports: ["xhr_streaming"]');
		Utils.arrDeleteValue(options.transports, 'xhr');
		options.transports.push('xhr_streaming');
	}

	if(!('queueMessages' in options))
		options.queueMessages = true;

	var production = false;
	if(options.restHost) {
		options.realtimeHost = options.realtimeHost || options.restHost;
	} else {
		var environment = (options.environment && String(options.environment).toLowerCase()) || Defaults.ENVIRONMENT;
		production = !environment || (environment === 'production');
		options.restHost = production ? Defaults.REST_HOST : environment + '-' + Defaults.REST_HOST;
		options.realtimeHost = production ? Defaults.REALTIME_HOST : environment + '-' + Defaults.REALTIME_HOST;
	}
	options.fallbackHosts = (production || options.fallbackHostsUseDefault) ? Defaults.FALLBACK_HOSTS : options.fallbackHosts;
	Utils.arrForEach((options.fallbackHosts || []).concat(options.restHost, options.realtimeHost), checkHost);

	options.port = options.port || Defaults.PORT;
	options.tlsPort = options.tlsPort || Defaults.TLS_PORT;
	options.maxMessageSize = options.maxMessageSize || Defaults.maxMessageSize;
	if(!('tls' in options)) options.tls = true;

	/* Allow values passed in options to override default timeouts */
	options.timeouts = {};
	for(var prop in Defaults.TIMEOUTS) {
		options.timeouts[prop] = options[prop] || Defaults.TIMEOUTS[prop];
	};

	if('useBinaryProtocol' in options) {
		options.useBinaryProtocol = Platform.supportsBinary && options.useBinaryProtocol;
	} else {
		options.useBinaryProtocol = Platform.preferBinary;
	}

	if(options.clientId) {
		var headers = options.headers = options.headers || {};
		headers['X-Ably-ClientId'] = BufferUtils.base64Encode(BufferUtils.utf8Encode(options.clientId));
	}

	if(!('idempotentRestPublishing' in options)) {
		options.idempotentRestPublishing = false;
	}

	if(options.promises && !Platform.Promise) {
		Logger.logAction(Logger.LOG_ERROR, 'Defaults.normaliseOptions', '{promises: true} was specified, but no Promise constructor found; disabling promises');
		options.promises = false;
	}

	return options;
};
