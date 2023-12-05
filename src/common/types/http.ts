import Platform from 'common/platform';
import HttpMethods from '../constants/HttpMethods';
import BaseClient from '../lib/client/baseclient';
import ErrorInfo, { IPartialErrorInfo } from '../lib/types/errorinfo';
import Logger from 'common/lib/util/logger';
import * as Utils from 'common/lib/util/utils';

export type PathParameter = string | ((host: string) => string);
export type RequestCallbackHeaders = Partial<Record<string, string | string[]>>;
export type RequestCallbackError = ErrnoException | IPartialErrorInfo;
export type RequestCallback = (
  error?: RequestCallbackError | null,
  body?: unknown,
  headers?: RequestCallbackHeaders,
  unpacked?: boolean,
  statusCode?: number
) => void;
export type RequestParams = Record<string, string> | null;

export interface IHttpStatic {
  new (client?: BaseClient): IHttp;
  methods: Array<HttpMethods>;
  methodsWithBody: Array<HttpMethods>;
  methodsWithoutBody: Array<HttpMethods>;
}

export type HttpRequestBody =
  | Buffer /* from looking at what the Node implementation will take */
  | string /* from looking at what auth sends */
  | ArrayBuffer /* from looking at what Rest.request creates when encoding MsgPack */
  | null;

export interface IHttp {
  supportsAuthHeaders: boolean;
  supportsLinkHeaders: boolean;

  _getHosts: (client: BaseClient) => string[];
  doUri(
    method: HttpMethods,
    uri: string,
    headers: Record<string, string> | null,
    body: HttpRequestBody,
    params: RequestParams,
    callback?: RequestCallback
  ): void;
  checkConnectivity?: (callback: (err?: ErrorInfo | null, connected?: boolean) => void) => void;

  /**
   * @param error An error returned by {@link doUri}’s callback.
   */
  shouldFallback(error: RequestCallbackError): boolean;
}

function addingParamsToUri(uri: string, params: Record<string, any> | null) {
  return uri + (params ? '?' : '') + paramString(params);
}

function paramString(params: Record<string, any> | null) {
  const paramPairs = [];
  if (params) {
    for (const needle in params) {
      paramPairs.push(needle + '=' + params[needle]);
    }
  }
  return paramPairs.join('&');
}

function logResponseHandler(
  callback: RequestCallback | undefined,
  method: HttpMethods,
  uri: string,
  params: Record<string, string> | null
): RequestCallback {
  // TODO we need to understand what type we might expect the body to be
  return (err, body, headers, unpacked, statusCode) => {
    if (err) {
      Logger.logActionNoStrip(
        Logger.LOG_MICRO,
        'Http.' + method + '()',
        'Received Error; ' + addingParamsToUri(uri, params) + '; Error: ' + Utils.inspectError(err)
      );
    } else {
      Logger.logActionNoStrip(
        Logger.LOG_MICRO,
        'Http.' + method + '()',
        'Received; ' +
          addingParamsToUri(uri, params) +
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

function logRequest(method: HttpMethods, uri: string, body: HttpRequestBody, params: RequestParams) {
  if (Logger.shouldLog(Logger.LOG_MICRO)) {
    Logger.logActionNoStrip(
      Logger.LOG_MICRO,
      'Http.' + method + '()',
      'Sending; ' +
        addingParamsToUri(uri, params) +
        '; Body' +
        (Platform.BufferUtils.isBuffer(body) ? ' (Base64): ' + Platform.BufferUtils.base64Encode(body) : ': ' + body)
    );
  }
}

// TODO name, explain
export class Http {
  private readonly http: IHttp;
  checkConnectivity?: (callback: (err?: ErrorInfo | null, connected?: boolean) => void) => void;

  constructor(private readonly client?: BaseClient) {
    this.http = new Platform.Http(client);

    this.checkConnectivity = this.http.checkConnectivity
      ? (callback: (err?: ErrorInfo | null, connected?: boolean) => void) => this.http.checkConnectivity!(callback)
      : undefined;
  }

  get supportsAuthHeaders() {
    return this.http.supportsAuthHeaders;
  }

  get supportsLinkHeaders() {
    return this.http.supportsLinkHeaders;
  }

  _getHosts(client: BaseClient) {
    return this.http._getHosts(client);
  }

  do(
    method: HttpMethods,
    path: PathParameter,
    headers: Record<string, string> | null,
    body: HttpRequestBody,
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
          if (err && this.http.shouldFallback(err as ErrnoException)) {
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
        if (err && this.http.shouldFallback(err as ErrnoException) && candidateHosts.length) {
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
    body: HttpRequestBody,
    params: RequestParams,
    callback?: RequestCallback | undefined
  ): void {
    if (Logger.shouldLog(Logger.LOG_MICRO)) {
      callback = logResponseHandler(callback, method, uri, params);
    }

    logRequest(method, uri, body, params);

    this.http.doUri(method, uri, headers, body, params, callback);
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
