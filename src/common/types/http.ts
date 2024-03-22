import Defaults from 'common/lib/util/defaults';
import Platform from 'common/platform';
import BaseRealtime from 'common/lib/client/baserealtime';
import HttpMethods from '../constants/HttpMethods';
import BaseClient from '../lib/client/baseclient';
import ErrorInfo, { IPartialErrorInfo } from '../lib/types/errorinfo';
import Logger from 'common/lib/util/logger';
import * as Utils from 'common/lib/util/utils';

export type PathParameter = string | ((host: string) => string);
export type ResponseHeaders = Partial<Record<string, string | string[]>>;
export type RequestResultError = ErrnoException | IPartialErrorInfo;

/**
 * The `body`, `headers`, `unpacked`, and `statusCode` properties of a `RequestResult` may be populated even if its `error` property is non-null.
 */
export type RequestResult = {
  error: RequestResultError | null;
  body?: unknown;
  headers?: ResponseHeaders;
  unpacked?: boolean;
  statusCode?: number;
};

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

  /**
   * This method should not throw any errors; rather, it should communicate any error by populating the {@link RequestResult.error} property of the returned {@link RequestResult}.
   */
  doUri(
    method: HttpMethods,
    uri: string,
    headers: Record<string, string> | null,
    body: RequestBody | null,
    params: RequestParams,
  ): Promise<RequestResult>;

  checkConnectivity?: () => Promise<boolean>;

  /**
   * @param error An error from the {@link RequestResult.error} property of a result returned by {@link doUri}.
   */
  shouldFallback(error: RequestResultError): boolean;
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

function logResult(result: RequestResult, method: HttpMethods, uri: string, params: Record<string, string> | null) {
  if (result.error) {
    Logger.logActionNoStrip(
      Logger.LOG_MICRO,
      'Http.' + method + '()',
      'Received Error; ' + appendingParams(uri, params) + '; Error: ' + Utils.inspectError(result.error),
    );
  } else {
    Logger.logActionNoStrip(
      Logger.LOG_MICRO,
      'Http.' + method + '()',
      'Received; ' +
        appendingParams(uri, params) +
        '; Headers: ' +
        paramString(result.headers as Record<string, any>) +
        '; StatusCode: ' +
        result.statusCode +
        '; Body' +
        (Platform.BufferUtils.isBuffer(result.body)
          ? ' (Base64): ' + Platform.BufferUtils.base64Encode(result.body)
          : ': ' + result.body),
    );
  }
}

function logRequest(method: HttpMethods, uri: string, body: RequestBody | null, params: RequestParams) {
  if (Logger.shouldLog(Logger.LOG_MICRO)) {
    Logger.logActionNoStrip(
      Logger.LOG_MICRO,
      'Http.' + method + '()',
      'Sending; ' +
        appendingParams(uri, params) +
        '; Body' +
        (Platform.BufferUtils.isBuffer(body) ? ' (Base64): ' + Platform.BufferUtils.base64Encode(body) : ': ' + body),
    );
  }
}

export class Http {
  private readonly platformHttp: IPlatformHttp;
  checkConnectivity?: () => Promise<boolean>;

  constructor(private readonly client?: BaseClient) {
    this.platformHttp = new Platform.Http(client);

    this.checkConnectivity = this.platformHttp.checkConnectivity
      ? () => this.platformHttp.checkConnectivity!()
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

  /**
   * This method will not throw any errors; rather, it will communicate any error by populating the {@link RequestResult.error} property of the returned {@link RequestResult}.
   */
  async do(
    method: HttpMethods,
    path: PathParameter,
    headers: Record<string, string> | null,
    body: RequestBody | null,
    params: RequestParams,
  ): Promise<RequestResult> {
    try {
      /* Unlike for doUri, the presence of `this.client` here is mandatory, as it's used to generate the hosts */
      const client = this.client;
      if (!client) {
        return { error: new ErrorInfo('http.do called without client', 50000, 500) };
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
          const result = await this.doUri(method, uriFromHost(currentFallback.host), headers, body, params);
          if (result.error && this.platformHttp.shouldFallback(result.error as ErrnoException)) {
            /* unstore the fallback and start from the top with the default sequence */
            client._currentFallback = null;
            return this.do(method, path, headers, body, params);
          }
          return result;
        } else {
          /* Fallback expired; remove it and fallthrough to normal sequence */
          client._currentFallback = null;
        }
      }

      const hosts = this._getHosts(client);

      /* see if we have one or more than one host */
      if (hosts.length === 1) {
        return this.doUri(method, uriFromHost(hosts[0]), headers, body, params);
      }

      const tryAHost = async (candidateHosts: Array<string>, persistOnSuccess?: boolean): Promise<RequestResult> => {
        const host = candidateHosts.shift();
        const result = await this.doUri(method, uriFromHost(host as string), headers, body, params);
        if (result.error && this.platformHttp.shouldFallback(result.error as ErrnoException) && candidateHosts.length) {
          return tryAHost(candidateHosts, true);
        }
        if (persistOnSuccess) {
          /* RSC15f */
          client._currentFallback = {
            host: host as string,
            validUntil: Date.now() + client.options.timeouts.fallbackRetryTimeout,
          };
        }
        return result;
      };
      return tryAHost(hosts);
    } catch (err) {
      // Handle any unexpected error, to ensure we always meet our contract of not throwing any errors
      return { error: new ErrorInfo(`Unexpected error in Http.do: ${Utils.inspectError(err)}`, 500, 50000) };
    }
  }

  /**
   * This method will not throw any errors; rather, it will communicate any error by populating the {@link RequestResult.error} property of the returned {@link RequestResult}.
   */
  async doUri(
    method: HttpMethods,
    uri: string,
    headers: Record<string, string> | null,
    body: RequestBody | null,
    params: RequestParams,
  ): Promise<RequestResult> {
    try {
      logRequest(method, uri, body, params);

      const result = await this.platformHttp.doUri(method, uri, headers, body, params);

      if (Logger.shouldLog(Logger.LOG_MICRO)) {
        logResult(result, method, uri, params);
      }

      return result;
    } catch (err) {
      // Handle any unexpected error, to ensure we always meet our contract of not throwing any errors
      return { error: new ErrorInfo(`Unexpected error in Http.doUri: ${Utils.inspectError(err)}`, 500, 50000) };
    }
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
