import PlatformDefaults from 'platform-defaults';
import Platform from 'platform';
import BufferUtils from 'platform-bufferutils';
import Utils from './utils';
import Logger from './logger';
import ErrorInfo from '../types/errorinfo';

type ClientOptions = any;

const version = '1.2.9';

const Defaults = {
	...PlatformDefaults,
	ENVIRONMENT              : '',
	REST_HOST                : 'rest.ably.io',
	REALTIME_HOST            : 'realtime.ably.io',
	FALLBACK_HOSTS           : ['A.ably-realtime.com', 'B.ably-realtime.com', 'C.ably-realtime.com', 'D.ably-realtime.com', 'E.ably-realtime.com'],
	PORT                     : 80,
	TLS_PORT                 : 443,
	TIMEOUTS : {
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
	},
	httpMaxRetryCount : 3,
	maxMessageSize    : 65536,

	errorReportingUrl : 'https://errors.ably.io/api/15/store/',
	errorReportingHeaders : {
		"X-Sentry-Auth": "Sentry sentry_version=7, sentry_key=a04e33c8674c451f8a310fbec029acf5, sentry_client=ably-js/0.1",
		"Content-Type": "application/json"
	},

	version,
	libstring        : Platform.libver + '-' + version,
	apiVersion       : '1.2',
	getHost,
	getPort,
	getHttpScheme,
	environmentFallbackHosts,
	getFallbackHosts,
	getHosts,
	checkHost,
	objectifyOptions,
	normaliseOptions,
}

export function getHost(options: ClientOptions, host: string, ws: boolean) {
	if(ws)
		host = ((host == options.restHost) && options.realtimeHost) || host || options.realtimeHost;
	else
		host = host || options.restHost;

	return host;
};

export function getPort(options: ClientOptions, tls: boolean) {
	return (tls || options.tls) ? options.tlsPort : options.port;
};

export function getHttpScheme (options: ClientOptions) {
	return options.tls ? 'https://' : 'http://';
};

// construct environment fallback hosts as per RSC15i
export function environmentFallbackHosts (environment: string) {
	return [
		environment + '-a-fallback.ably-realtime.com',
		environment + '-b-fallback.ably-realtime.com',
		environment + '-c-fallback.ably-realtime.com',
		environment + '-d-fallback.ably-realtime.com',
		environment + '-e-fallback.ably-realtime.com'
	];
};

export function getFallbackHosts (options: ClientOptions) {
	var fallbackHosts = options.fallbackHosts,
		httpMaxRetryCount = typeof(options.httpMaxRetryCount) !== 'undefined' ? options.httpMaxRetryCount : Defaults.httpMaxRetryCount;

	return fallbackHosts ? Utils.arrChooseN(fallbackHosts, httpMaxRetryCount) : [];
};

export function getHosts (options: ClientOptions) {
	return [options.restHost].concat(getFallbackHosts(options));
};

function checkHost(host: string) {
	if(typeof host !== 'string') {
		throw new ErrorInfo('host must be a string; was a ' + typeof host, 40000, 400);
	};
	if(!host.length) {
		throw new ErrorInfo('host must not be zero-length', 40000, 400);
	};
}

export function objectifyOptions(options: ClientOptions) {
	if(typeof options == 'string') {
		return (options.indexOf(':') == -1) ? {token: options} : {key: options};
	}
	return options;
};

export function normaliseOptions(options: ClientOptions) {
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

	if(options.fallbackHostsUseDefault) {
		/* fallbackHostsUseDefault and fallbackHosts are mutually exclusive as per TO3k7 */
		if(options.fallbackHosts) {
			var msg = 'fallbackHosts and fallbackHostsUseDefault cannot both be set';
			Logger.logAction(Logger.LOG_ERROR, 'Defaults.normaliseOptions', msg);
			throw new ErrorInfo(msg, 40000, 400);
		}

		/* default fallbacks can't be used with custom ports */
		if(options.port || options.tlsPort) {
			var msg = 'fallbackHostsUseDefault cannot be set when port or tlsPort are set';
			Logger.logAction(Logger.LOG_ERROR, 'Defaults.normaliseOptions', msg);
			throw new ErrorInfo(msg, 40000, 400);
		}

		/* emit an appropriate deprecation warning */
		if(options.environment) {
			Logger.deprecatedWithMsg('fallbackHostsUseDefault', 'There is no longer a need to set this when the environment option is also set since the library will now generate the correct fallback hosts using the environment option.');
		} else {
			Logger.deprecated('fallbackHostsUseDefault', 'fallbackHosts: Ably.Defaults.FALLBACK_HOSTS');
		}

		/* use the default fallback hosts as requested */
		options.fallbackHosts = Defaults.FALLBACK_HOSTS;
	}

	if(options.recover === true) {
		Logger.deprecated('{recover: true}', '{recover: function(lastConnectionDetails, cb) { cb(true); }}');
		options.recover = function(lastConnectionDetails: unknown, cb: Function) { cb(true); };
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

	/* infer hosts and fallbacks based on the configured environment */
	var environment = (options.environment && String(options.environment).toLowerCase()) || Defaults.ENVIRONMENT;
	var production = !environment || (environment === 'production');

	if(!options.fallbackHosts && !options.restHost && !options.realtimeHost && !options.port && !options.tlsPort) {
		options.fallbackHosts = production ? Defaults.FALLBACK_HOSTS : environmentFallbackHosts(environment);
	}

	if(!options.realtimeHost) {
		/* prefer setting realtimeHost to restHost as a custom restHost typically indicates
		 * a development environment is being used that can't be inferred by the library */
		if(options.restHost) {
			Logger.logAction(Logger.LOG_MINOR, 'Defaults.normaliseOptions', 'restHost is set to "' + options.restHost + '" but realtimeHost is not set, so setting realtimeHost to "' + options.restHost + '" too. If this is not what you want, please set realtimeHost explicitly.');
			options.realtimeHost = options.restHost
		} else {
			options.realtimeHost = production ? Defaults.REALTIME_HOST : environment + '-' + Defaults.REALTIME_HOST;
		}
	}

	if(!options.restHost) {
		options.restHost = production ? Defaults.REST_HOST : environment + '-' + Defaults.REST_HOST;
	}

	Utils.arrForEach((options.fallbackHosts || []).concat(options.restHost, options.realtimeHost), checkHost);

	options.port = options.port || Defaults.PORT;
	options.tlsPort = options.tlsPort || Defaults.TLS_PORT;
	options.maxMessageSize = options.maxMessageSize || Defaults.maxMessageSize;
	if(!('tls' in options)) options.tls = true;

	/* Allow values passed in options to override default timeouts */
	options.timeouts = {};
	for(var prop in Defaults.TIMEOUTS) {
		options.timeouts[prop] = options[prop] || (Defaults.TIMEOUTS as Record<string, any>)[prop];
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
		options.idempotentRestPublishing = true;
	}

	if(options.promises && !Platform.Promise) {
		Logger.logAction(Logger.LOG_ERROR, 'Defaults.normaliseOptions', '{promises: true} was specified, but no Promise constructor found; disabling promises');
		options.promises = false;
	}

	return options;
};

export default Defaults;
