import Platform from 'common/platform';
import * as Utils from './utils';
import Logger from './logger';
import ErrorInfo from 'common/lib/types/errorinfo';
import { version } from '../../../../package.json';
import ClientOptions, { DeprecatedClientOptions, NormalisedClientOptions } from 'common/types/ClientOptions';
import IDefaults from '../../types/IDefaults';

let agent = 'ably-js/' + version;

type CompleteDefaults = IDefaults & {
  ENVIRONMENT: string;
  REST_HOST: string;
  REALTIME_HOST: string;
  FALLBACK_HOSTS: string[];
  PORT: number;
  TLS_PORT: number;
  TIMEOUTS: {
    disconnectedRetryTimeout: number;
    suspendedRetryTimeout: number;
    httpRequestTimeout: number;
    channelRetryTimeout: number;
    fallbackRetryTimeout: number;
    connectionStateTtl: number;
    realtimeRequestTimeout: number;
    recvTimeout: number;
    preferenceConnectTimeout: number;
    parallelUpgradeDelay: number;
  };
  httpMaxRetryCount: number;
  maxMessageSize: number;
  version: string;
  protocolVersion: number;
  agent: string;
  getHost(options: ClientOptions, host?: string | null, ws?: boolean): string;
  getPort(options: ClientOptions, tls?: boolean): number | undefined;
  getHttpScheme(options: ClientOptions): string;
  environmentFallbackHosts(environment: string): string[];
  getFallbackHosts(options: NormalisedClientOptions): string[];
  getHosts(options: NormalisedClientOptions): string[];
  checkHost(host: string): void;
  getRealtimeHost(options: ClientOptions, production: boolean, environment: string): string;
  objectifyOptions(options: ClientOptions | string): ClientOptions;
  normaliseOptions(options: DeprecatedClientOptions): NormalisedClientOptions;
};

const Defaults = {
  ENVIRONMENT: '',
  REST_HOST: 'rest.ably.io',
  REALTIME_HOST: 'realtime.ably.io',
  FALLBACK_HOSTS: [
    'A.ably-realtime.com',
    'B.ably-realtime.com',
    'C.ably-realtime.com',
    'D.ably-realtime.com',
    'E.ably-realtime.com',
  ],
  PORT: 80,
  TLS_PORT: 443,
  TIMEOUTS: {
    /* Documented as options params: */
    disconnectedRetryTimeout: 15000,
    suspendedRetryTimeout: 30000,
    /* Undocumented, but part of the api and can be used by customers: */
    httpRequestTimeout: 15000,
    channelRetryTimeout: 15000,
    fallbackRetryTimeout: 600000,
    /* For internal / test use only: */
    connectionStateTtl: 120000,
    realtimeRequestTimeout: 10000,
    recvTimeout: 90000,
    preferenceConnectTimeout: 6000,
    parallelUpgradeDelay: 6000,
  },
  httpMaxRetryCount: 3,
  maxMessageSize: 65536,

  version,
  protocolVersion: 2,
  agent,
  getHost,
  getPort,
  getHttpScheme,
  environmentFallbackHosts,
  getFallbackHosts,
  getHosts,
  checkHost,
  objectifyOptions,
  normaliseOptions,
};

export function getHost(options: ClientOptions, host?: string | null, ws?: boolean): string {
  if (ws) host = (host == options.restHost && options.realtimeHost) || host || options.realtimeHost;
  else host = host || options.restHost;

  return host as string;
}

export function getPort(options: ClientOptions, tls?: boolean): number | undefined {
  return tls || options.tls ? options.tlsPort : options.port;
}

export function getHttpScheme(options: ClientOptions): string {
  return options.tls ? 'https://' : 'http://';
}

// construct environment fallback hosts as per RSC15i
export function environmentFallbackHosts(environment: string): string[] {
  return [
    environment + '-a-fallback.ably-realtime.com',
    environment + '-b-fallback.ably-realtime.com',
    environment + '-c-fallback.ably-realtime.com',
    environment + '-d-fallback.ably-realtime.com',
    environment + '-e-fallback.ably-realtime.com',
  ];
}

export function getFallbackHosts(options: NormalisedClientOptions): string[] {
  const fallbackHosts = options.fallbackHosts,
    httpMaxRetryCount =
      typeof options.httpMaxRetryCount !== 'undefined' ? options.httpMaxRetryCount : Defaults.httpMaxRetryCount;

  return fallbackHosts ? Utils.arrChooseN(fallbackHosts, httpMaxRetryCount) : [];
}

export function getHosts(options: NormalisedClientOptions): string[] {
  return [options.restHost].concat(getFallbackHosts(options));
}

function checkHost(host: string): void {
  if (typeof host !== 'string') {
    throw new ErrorInfo('host must be a string; was a ' + typeof host, 40000, 400);
  }
  if (!host.length) {
    throw new ErrorInfo('host must not be zero-length', 40000, 400);
  }
}

function getRealtimeHost(options: ClientOptions, production: boolean, environment: string): string {
  if (options.realtimeHost) return options.realtimeHost;
  /* prefer setting realtimeHost to restHost as a custom restHost typically indicates
   * a development environment is being used that can't be inferred by the library */
  if (options.restHost) {
    Logger.logAction(
      Logger.LOG_MINOR,
      'Defaults.normaliseOptions',
      'restHost is set to "' +
        options.restHost +
        '" but realtimeHost is not set, so setting realtimeHost to "' +
        options.restHost +
        '" too. If this is not what you want, please set realtimeHost explicitly.'
    );
    return options.restHost;
  }
  return production ? Defaults.REALTIME_HOST : environment + '-' + Defaults.REALTIME_HOST;
}

function getTimeouts(options: ClientOptions) {
  /* Allow values passed in options to override default timeouts */
  const timeouts: Record<string, number> = {};
  for (const prop in Defaults.TIMEOUTS) {
    timeouts[prop] = (options as Record<string, number>)[prop] || (Defaults.TIMEOUTS as Record<string, number>)[prop];
  }
  return timeouts;
}

export function getAgentString(options: ClientOptions): string {
  let agentStr = Defaults.agent;
  if (options.agents) {
    for (var agent in options.agents) {
      agentStr += ' ' + agent + '/' + options.agents[agent];
    }
  }
  return agentStr;
}

export function objectifyOptions(options: ClientOptions | string): ClientOptions {
  if (typeof options == 'string') {
    return options.indexOf(':') == -1 ? { token: options } : { key: options };
  }
  return options;
}

export function normaliseOptions(options: DeprecatedClientOptions): NormalisedClientOptions {
  /* Deprecated options */
  if (options.host) {
    Logger.deprecated('host', 'restHost');
    options.restHost = options.host;
  }
  if (options.wsHost) {
    Logger.deprecated('wsHost', 'realtimeHost');
    options.realtimeHost = options.wsHost;
  }
  if (options.queueEvents) {
    Logger.deprecated('queueEvents', 'queueMessages');
    options.queueMessages = options.queueEvents;
  }

  if (options.fallbackHostsUseDefault) {
    /* fallbackHostsUseDefault and fallbackHosts are mutually exclusive as per TO3k7 */
    if (options.fallbackHosts) {
      const msg = 'fallbackHosts and fallbackHostsUseDefault cannot both be set';
      Logger.logAction(Logger.LOG_ERROR, 'Defaults.normaliseOptions', msg);
      throw new ErrorInfo(msg, 40000, 400);
    }

    /* default fallbacks can't be used with custom ports */
    if (options.port || options.tlsPort) {
      const msg = 'fallbackHostsUseDefault cannot be set when port or tlsPort are set';
      Logger.logAction(Logger.LOG_ERROR, 'Defaults.normaliseOptions', msg);
      throw new ErrorInfo(msg, 40000, 400);
    }

    /* emit an appropriate deprecation warning */
    if (options.environment) {
      Logger.deprecatedWithMsg(
        'fallbackHostsUseDefault',
        'There is no longer a need to set this when the environment option is also set since the library will now generate the correct fallback hosts using the environment option.'
      );
    } else {
      Logger.deprecated('fallbackHostsUseDefault', 'fallbackHosts: Ably.Defaults.FALLBACK_HOSTS');
    }

    /* use the default fallback hosts as requested */
    options.fallbackHosts = Defaults.FALLBACK_HOSTS;
  }

  /* options.recover as a boolean is deprecated, and therefore is not part of the public typing */
  if ((options.recover as any) === true) {
    Logger.deprecated('{recover: true}', '{recover: function(lastConnectionDetails, cb) { cb(true); }}');
    options.recover = function (lastConnectionDetails: unknown, cb: (shouldRecover: boolean) => void) {
      cb(true);
    };
  }

  if (typeof options.recover === 'function' && options.closeOnUnload === true) {
    Logger.logAction(
      Logger.LOG_ERROR,
      'Defaults.normaliseOptions',
      'closeOnUnload was true and a session recovery function was set - these are mutually exclusive, so unsetting the latter'
    );
    options.recover = undefined;
  }

  if (!('closeOnUnload' in options)) {
    /* Have closeOnUnload default to true unless we have any indication that
     * the user may want to recover the connection */
    options.closeOnUnload = !options.recover;
  }

  if (options.transports && Utils.arrIn(options.transports, 'xhr')) {
    Logger.deprecated('transports: ["xhr"]', 'transports: ["xhr_streaming"]');
    Utils.arrDeleteValue(options.transports, 'xhr');
    options.transports.push('xhr_streaming');
  }

  if (!('queueMessages' in options)) options.queueMessages = true;

  /* infer hosts and fallbacks based on the configured environment */
  const environment = (options.environment && String(options.environment).toLowerCase()) || Defaults.ENVIRONMENT;
  const production = !environment || environment === 'production';

  if (!options.fallbackHosts && !options.restHost && !options.realtimeHost && !options.port && !options.tlsPort) {
    options.fallbackHosts = production ? Defaults.FALLBACK_HOSTS : environmentFallbackHosts(environment);
  }

  const restHost = options.restHost || (production ? Defaults.REST_HOST : environment + '-' + Defaults.REST_HOST);
  const realtimeHost = getRealtimeHost(options, production, environment);

  Utils.arrForEach((options.fallbackHosts || []).concat(restHost, realtimeHost), checkHost);

  options.port = options.port || Defaults.PORT;
  options.tlsPort = options.tlsPort || Defaults.TLS_PORT;
  if (!('tls' in options)) options.tls = true;

  const timeouts = getTimeouts(options);

  if ('useBinaryProtocol' in options) {
    options.useBinaryProtocol = Platform.Config.supportsBinary && options.useBinaryProtocol;
  } else {
    options.useBinaryProtocol = Platform.Config.preferBinary;
  }

  if (options.clientId) {
    const headers = (options.headers = options.headers || {});
    headers['X-Ably-ClientId'] = Platform.BufferUtils.base64Encode(Platform.BufferUtils.utf8Encode(options.clientId));
  }

  if (!('idempotentRestPublishing' in options)) {
    options.idempotentRestPublishing = true;
  }

  if (options.promises && !Platform.Config.Promise) {
    Logger.logAction(
      Logger.LOG_ERROR,
      'Defaults.normaliseOptions',
      '{promises: true} was specified, but no Promise constructor found; disabling promises'
    );
    options.promises = false;
  }

  let connectivityCheckParams = null;
  let connectivityCheckUrl = options.connectivityCheckUrl;
  if (options.connectivityCheckUrl) {
    let [uri, qs] = options.connectivityCheckUrl.split('?');
    connectivityCheckParams = qs ? Utils.parseQueryString(qs) : {};
    if (uri.indexOf('://') === -1) {
      uri = 'https://' + uri;
    }
    connectivityCheckUrl = uri;
  }

  return {
    ...options,
    useBinaryProtocol:
      'useBinaryProtocol' in options
        ? Platform.Config.supportsBinary && options.useBinaryProtocol
        : Platform.Config.preferBinary,
    realtimeHost,
    restHost,
    maxMessageSize: options.maxMessageSize || Defaults.maxMessageSize,
    timeouts,
    connectivityCheckParams,
    connectivityCheckUrl,
  };
}

export default Defaults as CompleteDefaults;

export function getDefaults(platformDefaults: IDefaults) {
  return Object.assign(Defaults, platformDefaults);
}
