import Defaults from 'common/lib/util/defaults';
import Platform from 'common/platform';
import BaseRealtime from 'common/lib/client/baserealtime';
import HttpMethods from '../constants/HttpMethods';
import BaseClient from '../lib/client/baseclient';
import ErrorInfo, { IPartialErrorInfo } from '../lib/types/errorinfo';
import Logger from 'common/lib/util/logger';
import * as Utils from 'common/lib/util/utils';

export type PathParameter = string | ((host: string) => string);
export type RequestCallbackHeaders = Partial<Record<string, string | string[]>>;
export type RequestCallbackError = ErrnoException | IPartialErrorInfo;
export type RequestCallback = (
  error: RequestCallbackError | null,
  body?: unknown,
  headers?: RequestCallbackHeaders,
  unpacked?: boolean,
  statusCode?: number
) => void;
export type RequestParams = Record<string, string> | null;
export type RequestBody =
  | Buffer // only on Node
  | ArrayBuffer // only on web
  | string;

export interface IPlatformHttpStatic {
  new (client?: BaseClient): IPlatformHttp;
  methods: Array<HttpMethods>;
  methodsWithBody: Array<HttpMethods>;
  methodsWithoutBody: Array<HttpMethods>;
}

export interface IPlatformHttp {
  supportsAuthHeaders: boolean;
  supportsLinkHeaders: boolean;

  doUri(
    method: HttpMethods,
    uri: string,
    headers: Record<string, string> | null,
    body: RequestBody | null,
    params: RequestParams,
    callback?: RequestCallback
  ): void;
  checkConnectivity?: (callback: (err?: ErrorInfo | null, connected?: boolean) => void) => void;

  /**
   * @param error An error returned by {@link doUri}’s callback.
   */
  shouldFallback(error: RequestCallbackError): boolean;
}

export function paramString(params: Record<string, any> | null) {
  const paramPairs = [];
  if (params) {
    for (const needle in params) {
      paramPairs.push(needle + '=' + params[needle]);
    }
  }
  return paramPairs.join('&');
}

export function appendingParams(uri: string, params: Record<string, any> | null) {
  return uri + (params ? '?' : '') + paramString(params);
}

function logResponseHandler(
  callback: RequestCallback | undefined,
  method: HttpMethods,
  uri: string,
  params: Record<string, string> | null
): RequestCallback {
  return (err, body, headers, unpacked, statusCode) => {
    if (err) {
      Logger.logActionNoStrip(
        Logger.LOG_MICRO,
        'Http.' + method + '()',
        'Received Error; ' + appendingParams(uri, params) + '; Error: ' + Utils.inspectError(err)
      );
    } else {
      Logger.logActionNoStrip(
        Logger.LOG_MICRO,
        'Http.' + method + '()',
        'Received; ' +
          appendingParams(uri, params) +
          '; Headers: ' +
          paramString(headers as Record<string, any>) +
          '; StatusCode: ' +
          statusCode +
          '; Body' +
          (Platform.BufferUtils.isBuffer(body) ? ' (Base64): ' + Platform.BufferUtils.base64Encode(body) : ': ' + body)
      );
    }
    if (callback) {
      callback(err, body, headers, unpacked, statusCode);
    }
  };
}

function logRequest(method: HttpMethods, uri: string, body: RequestBody | null, params: RequestParams) {
  if (Logger.shouldLog(Logger.LOG_MICRO)) {
    Logger.logActionNoStrip(
      Logger.LOG_MICRO,
      'Http.' + method + '()',
      'Sending; ' +
        appendingParams(uri, params) +
        '; Body' +
        (Platform.BufferUtils.isBuffer(body) ? ' (Base64): ' + Platform.BufferUtils.base64Encode(body) : ': ' + body)
    );
  }
}

export class Http {
  private readonly platformHttp: IPlatformHttp;
  checkConnectivity?: (callback: (err?: ErrorInfo | null, connected?: boolean) => void) => void;

  constructor(private readonly client?: BaseClient) {
    this.platformHttp = new Platform.Http(client);

    this.checkConnectivity = this.platformHttp.checkConnectivity
      ? (callback: (err?: ErrorInfo | null, connected?: boolean) => void) =>
          this.platformHttp.checkConnectivity!(callback)
      : undefined;
  }

  get supportsAuthHeaders() {
    return this.platformHttp.supportsAuthHeaders;
  }

  get supportsLinkHeaders() {
    return this.platformHttp.supportsLinkHeaders;
  }

  _getHosts(client: BaseClient) {
    /* If we're a connected realtime client, try the endpoint we're connected
     * to first -- but still have fallbacks, being connected is not an absolute
     * guarantee that a datacenter has free capacity to service REST requests. */
    const connection = (client as BaseRealtime).connection,
      connectionHost = connection && connection.connectionManager.host;

    if (connectionHost) {
      return [connectionHost].concat(Defaults.getFallbackHosts(client.options));
    }

    return Defaults.getHosts(client.options);
  }

  do(
    method: HttpMethods,
    path: PathParameter,
    headers: Record<string, string> | null,
    body: RequestBody | null,
    params: RequestParams,
    callback?: RequestCallback | undefined
  ): void {
    /* Unlike for doUri, the presence of `this.client` here is mandatory, as it's used to generate the hosts */
    const client = this.client;
    if (!client) {
      throw new Error('http.do called without client');
    }

    const uriFromHost =
      typeof path === 'function'
        ? path
        : function (host: string) {
            return client.baseUri(host) + path;
          };

    const currentFallback = client._currentFallback;
    if (currentFallback) {
      if (currentFallback.validUntil > Date.now()) {
        /* Use stored fallback */
        this.doUri(method, uriFromHost(currentFallback.host), headers, body, params, (err, ...args) => {
          if (err && this.platformHttp.shouldFallback(err as ErrnoException)) {
            /* unstore the fallback and start from the top with the default sequence */
            client._currentFallback = null;
            this.do(method, path, headers, body, params, callback);
            return;
          }
          callback?.(err, ...args);
        });
        return;
      } else {
        /* Fallback expired; remove it and fallthrough to normal sequence */
        client._currentFallback = null;
      }
    }

    const hosts = this._getHosts(client);

    /* see if we have one or more than one host */
    if (hosts.length === 1) {
      this.doUri(method, uriFromHost(hosts[0]), headers, body, params, callback);
      return;
    }

    const tryAHost = (candidateHosts: Array<string>, persistOnSuccess?: boolean) => {
      const host = candidateHosts.shift();
      this.doUri(method, uriFromHost(host as string), headers, body, params, (err, ...args) => {
        if (err && this.platformHttp.shouldFallback(err as ErrnoException) && candidateHosts.length) {
          tryAHost(candidateHosts, true);
          return;
        }
        if (persistOnSuccess) {
          /* RSC15f */
          client._currentFallback = {
            host: host as string,
            validUntil: Date.now() + client.options.timeouts.fallbackRetryTimeout,
          };
        }
        callback?.(err, ...args);
      });
    };
    tryAHost(hosts);
  }

  doUri(
    method: HttpMethods,
    uri: string,
    headers: Record<string, string> | null,
    body: RequestBody | null,
    params: RequestParams,
    callback?: RequestCallback | undefined
  ): void {
    logRequest(method, uri, body, params);

    if (Logger.shouldLog(Logger.LOG_MICRO)) {
      callback = logResponseHandler(callback, method, uri, params);
    }

    this.platformHttp.doUri(method, uri, headers, body, params, callback);
  }
}

export interface ErrnoException extends Error {
  errno?: number;
  code?: string;
  path?: string;
  syscall?: string;
  stack?: string;
  statusCode: number;
}
