/* Assumes process.env defined, or window.__env__ or populated via globals.env.js and karam-env-preprocessor plugin */

define(function(require) {
	var environment = isBrowser ? (window.__env__ || {}) : process.env,
		ablyEnvironment = environment.ABLY_ENV || 'sandbox',
		wsHost = environment.ABLY_REALTIME_HOST,
		host = environment.ABLY_REST_HOST,
		port = environment.ABLY_PORT,
		tlsPort = environment.ABLY_TLS_PORT,
		tls = ('ABLY_USE_TLS' in environment) ? (environment.ABLY_USE_TLS.toLowerCase() !== 'false') : true;

	if (isBrowser) {
		var url = window.location.href,
			keysValues = url.split(/[\?&]+/),
			query = {};

		for(i = 0; i < keysValues.length; i++) {
			var keyValue = keysValues[i].split("=");
			query[keyValue[0]] = keyValue[1];
		}

		if(query['env'])      ablyEnvironment = query['env'];
		if(query['ws_host'])  wsHost = query['ws_host'];
		if(query['host'])     host = query['host'];
		if(query['port'])     port = query['port'];
		if(query['tls_port']) tlsPort = query['tls_port'];
		if(query['tls'])      tls = query['tls'].toLowerCase() !== 'false';
	}

	return module.exports = {
		environment: ablyEnvironment,
		wsHost:      wsHost,
		restHost:    host,
		port:        port,
		tlsPort:     tlsPort,
		tls:         tls
	};
});
