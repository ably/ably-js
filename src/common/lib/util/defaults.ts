import Platform from 'common/platform';
import * as Utils from './utils';
import Logger from './logger';
import ErrorInfo from 'common/lib/types/errorinfo';
import { version } from '../../../../package.json';
import ClientOptions, { NormalisedClientOptions } from 'common/types/ClientOptions';
import IDefaults from '../../types/IDefaults';
import { MsgPack } from 'common/types/msgpack';
import { IUntypedCryptoStatic } from 'common/types/ICryptoStatic';
import { ChannelOptions } from 'common/types/channel';
import { ModularPlugins } from '../client/modularplugins';

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
    httpMaxRetryDuration: number;
    channelRetryTimeout: number;
    fallbackRetryTimeout: number;
    connectionStateTtl: number;
    realtimeRequestTimeout: number;
    recvTimeout: number;
    webSocketConnectTimeout: number;
    webSocketSlowTimeout: number;
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
  getHosts(options: NormalisedClientOptions, ws?: boolean): string[];
  checkHost(host: string): void;
  objectifyOptions(
    options: undefined | ClientOptions | string,
    allowKeyOrToken: boolean,
    sourceForErrorMessage: string,
    logger: Logger,
    modularPluginsToInclude?: ModularPlugins,
  ): ClientOptions;
  normaliseOptions(options: ClientOptions, MsgPack: MsgPack | null, logger: Logger | null): NormalisedClientOptions;
  defaultGetHeaders(options: NormalisedClientOptions, headersOptions?: HeadersOptions): Record<string, string>;
  defaultPostHeaders(options: NormalisedClientOptions, headersOptions?: HeadersOptions): Record<string, string>;
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
    httpRequestTimeout: 10000,
    httpMaxRetryDuration: 15000,
    channelRetryTimeout: 15000,
    fallbackRetryTimeout: 600000,
    /* For internal / test use only: */
    connectionStateTtl: 120000,
    realtimeRequestTimeout: 10000,
    recvTimeout: 90000,
    webSocketConnectTimeout: 10000,
    webSocketSlowTimeout: 4000,
  },
  httpMaxRetryCount: 3,
  maxMessageSize: 65536,

  version,
  protocolVersion: 3,
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
  defaultGetHeaders,
  defaultPostHeaders,
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

export function getHosts(options: NormalisedClientOptions, ws?: boolean): string[] {
  const hosts = [options.restHost].concat(getFallbackHosts(options));
  return ws ? hosts.map((host) => getHost(options, host, true)) : hosts;
}

function checkHost(host: string): void {
  if (typeof host !== 'string') {
    throw new ErrorInfo('host must be a string; was a ' + typeof host, 40000, 400);
  }
  if (!host.length) {
    throw new ErrorInfo('host must not be zero-length', 40000, 400);
  }
}

function getRealtimeHost(options: ClientOptions, production: boolean, environment: string, logger: Logger): string {
  if (options.realtimeHost) return options.realtimeHost;
  /* prefer setting realtimeHost to restHost as a custom restHost typically indicates
   * a development environment is being used that can't be inferred by the library */
  if (options.restHost) {
    Logger.logAction(
      logger,
      Logger.LOG_MINOR,
      'Defaults.normaliseOptions',
      'restHost is set to "' +
        options.restHost +
        '" but realtimeHost is not set, so setting realtimeHost to "' +
        options.restHost +
        '" too. If this is not what you want, please set realtimeHost explicitly.',
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

export function objectifyOptions(
  options: undefined | ClientOptions | string,
  allowKeyOrToken: boolean,
  sourceForErrorMessage: string,
  logger: Logger,
  modularPluginsToInclude?: ModularPlugins,
): ClientOptions {
  if (options === undefined) {
    const msg = allowKeyOrToken
      ? `${sourceForErrorMessage} must be initialized with either a client options object, an Ably API key, or an Ably Token`
      : `${sourceForErrorMessage} must be initialized with a client options object`;
    Logger.logAction(logger, Logger.LOG_ERROR, `${sourceForErrorMessage}()`, msg);
    throw new Error(msg);
  }

  let optionsObj: ClientOptions;

  if (typeof options === 'string') {
    if (options.indexOf(':') == -1) {
      if (!allowKeyOrToken) {
        const msg = `${sourceForErrorMessage} cannot be initialized with just an Ably Token; you must provide a client options object with a \`plugins\` property. (Set this Ably Token as the object’s \`token\` property.)`;
        Logger.logAction(logger, Logger.LOG_ERROR, `${sourceForErrorMessage}()`, msg);
        throw new Error(msg);
      }

      optionsObj = { token: options };
    } else {
      if (!allowKeyOrToken) {
        const msg = `${sourceForErrorMessage} cannot be initialized with just an Ably API key; you must provide a client options object with a \`plugins\` property. (Set this Ably API key as the object’s \`key\` property.)`;
        Logger.logAction(logger, Logger.LOG_ERROR, `${sourceForErrorMessage}()`, msg);
        throw new Error(msg);
      }

      optionsObj = { key: options };
    }
  } else {
    optionsObj = options;
  }

  if (modularPluginsToInclude) {
    optionsObj = { ...optionsObj, plugins: { ...modularPluginsToInclude, ...optionsObj.plugins } };
  }

  return optionsObj;
}

export function normaliseOptions(
  options: ClientOptions,
  MsgPack: MsgPack | null,
  logger: Logger | null, // should only be omitted by tests
): NormalisedClientOptions {
  const loggerToUse = logger ?? Logger.defaultLogger;

  if (typeof options.recover === 'function' && options.closeOnUnload === true) {
    Logger.logAction(
      loggerToUse,
      Logger.LOG_ERROR,
      'Defaults.normaliseOptions',
      'closeOnUnload was true and a session recovery function was set - these are mutually exclusive, so unsetting the latter',
    );
    options.recover = undefined;
  }

  if (!('closeOnUnload' in options)) {
    /* Have closeOnUnload default to true unless we have any indication that
     * the user may want to recover the connection */
    options.closeOnUnload = !options.recover;
  }

  if (!('queueMessages' in options)) options.queueMessages = true;

  /* infer hosts and fallbacks based on the configured environment */
  const environment = (options.environment && String(options.environment).toLowerCase()) || Defaults.ENVIRONMENT;
  const production = !environment || environment === 'production';

  if (!options.fallbackHosts && !options.restHost && !options.realtimeHost && !options.port && !options.tlsPort) {
    options.fallbackHosts = production ? Defaults.FALLBACK_HOSTS : environmentFallbackHosts(environment);
  }

  const restHost = options.restHost || (production ? Defaults.REST_HOST : environment + '-' + Defaults.REST_HOST);
  const realtimeHost = getRealtimeHost(options, production, environment, loggerToUse);

  (options.fallbackHosts || []).concat(restHost, realtimeHost).forEach(checkHost);

  options.port = options.port || Defaults.PORT;
  options.tlsPort = options.tlsPort || Defaults.TLS_PORT;
  if (!('tls' in options)) options.tls = true;

  const timeouts = getTimeouts(options);

  if (MsgPack) {
    if ('useBinaryProtocol' in options) {
      options.useBinaryProtocol = Platform.Config.supportsBinary && options.useBinaryProtocol;
    } else {
      options.useBinaryProtocol = Platform.Config.preferBinary;
    }
  } else {
    options.useBinaryProtocol = false;
  }

  const headers: Record<string, string> = {};
  if (options.clientId) {
    headers['X-Ably-ClientId'] = Platform.BufferUtils.base64Encode(Platform.BufferUtils.utf8Encode(options.clientId));
  }

  if (!('idempotentRestPublishing' in options)) {
    options.idempotentRestPublishing = true;
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

  let wsConnectivityCheckUrl = options.wsConnectivityCheckUrl;
  if (wsConnectivityCheckUrl && wsConnectivityCheckUrl.indexOf('://') === -1) {
    wsConnectivityCheckUrl = 'wss://' + wsConnectivityCheckUrl;
  }

  return {
    ...options,
    realtimeHost,
    restHost,
    maxMessageSize: options.maxMessageSize || Defaults.maxMessageSize,
    timeouts,
    connectivityCheckParams,
    connectivityCheckUrl,
    wsConnectivityCheckUrl,
    headers,
  };
}

export function normaliseChannelOptions(Crypto: IUntypedCryptoStatic | null, logger: Logger, options?: ChannelOptions) {
  const channelOptions = options || {};
  if (channelOptions.cipher) {
    if (!Crypto) Utils.throwMissingPluginError('Crypto');
    const cipher = Crypto.getCipher(channelOptions.cipher, logger);
    channelOptions.cipher = cipher.cipherParams;
    channelOptions.channelCipher = cipher.cipher;
  } else if ('cipher' in channelOptions) {
    /* Don't deactivate an existing cipher unless options
     * has a 'cipher' key that's falsey */
    channelOptions.cipher = undefined;
    channelOptions.channelCipher = null;
  }
  return channelOptions;
}

const contentTypes = {
  json: 'application/json',
  xml: 'application/xml',
  html: 'text/html',
  msgpack: 'application/x-msgpack',
  text: 'text/plain',
};

export interface HeadersOptions {
  format?: Utils.Format | 'xml' | 'html' | 'text';
  protocolVersion?: number;
}

const defaultHeadersOptions: Required<HeadersOptions> = {
  format: Utils.Format.json,
  protocolVersion: Defaults.protocolVersion,
};

export function defaultGetHeaders(
  options: NormalisedClientOptions,
  {
    format = defaultHeadersOptions.format,
    protocolVersion = defaultHeadersOptions.protocolVersion,
  }: HeadersOptions = {},
): Record<string, string> {
  const accept = contentTypes[format];
  return {
    accept: accept,
    'X-Ably-Version': protocolVersion.toString(),
    'Ably-Agent': getAgentString(options),
  };
}

export function defaultPostHeaders(
  options: NormalisedClientOptions,
  {
    format = defaultHeadersOptions.format,
    protocolVersion = defaultHeadersOptions.protocolVersion,
  }: HeadersOptions = {},
): Record<string, string> {
  let contentType;
  const accept = (contentType = contentTypes[format]);

  return {
    accept: accept,
    'content-type': contentType,
    'X-Ably-Version': protocolVersion.toString(),
    'Ably-Agent': getAgentString(options),
  };
}

export default Defaults as CompleteDefaults;

export function getDefaults(platformDefaults: IDefaults) {
  return Object.assign(Defaults, platformDefaults);
}
