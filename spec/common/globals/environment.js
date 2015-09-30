/* Assumes process.env defined, or window.__env__ or populated via globals.env.js and karam-env-preprocessor plugin */

define(function(require) {
	var defaultLogLevel = 2,
		environment = isBrowser ? (window.__env__ || {}) : process.env,
		ablyEnvironment = environment.ABLY_ENV || 'sandbox',
		wsHost = environment.ABLY_REALTIME_HOST,
		host = environment.ABLY_REST_HOST,
		port = environment.ABLY_PORT || 80,
		tlsPort = environment.ABLY_TLS_PORT || 443,
		tls = ('ABLY_USE_TLS' in environment) ? (environment.ABLY_USE_TLS.toLowerCase() !== 'false') : true,
		logLevel = environment.ABLY_LOG_LEVEL || defaultLogLevel;

	if (isBrowser) {
		var url = window.location.href,
			keysValues = url.split(/[\?&]+/),
			query = {};

		for(i = 0; i < keysValues.length; i++) {
			var keyValue = keysValues[i].split("=");
			query[keyValue[0]] = keyValue[1];
		}

		if(query['env'])          ablyEnvironment = query['env'];
		if(query['reltime_host']) wsHost = query['realtime_host'];
		if(query['host'])         host = query['host'];
		if(query['port'])         port = query['port'];
		if(query['tls_port'])     tlsPort = query['tls_port'];
		if(query['tls'])          tls = query['tls'].toLowerCase() !== 'false';
		if(query['log_level'])    logLevel = Number(query['log_level']) || defaultLogLevel;
	}

	return module.exports = {
		environment: ablyEnvironment,
		wsHost:      wsHost,
		restHost:    host,
		port:        port,
		tlsPort:     tlsPort,
		tls:         tls,
		log:         { level: logLevel }
	};
});
