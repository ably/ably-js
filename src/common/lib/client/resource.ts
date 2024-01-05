import Platform from '../../platform';
import * as Utils from '../util/utils';
import Logger from '../util/logger';
import Auth from './auth';
import HttpMethods from '../../constants/HttpMethods';
import ErrorInfo, { IPartialErrorInfo, PartialErrorInfo } from '../types/errorinfo';
import BaseClient from './baseclient';
import { MsgPack } from 'common/types/msgpack';
import { RequestCallbackHeaders } from 'common/types/http';
import { ErrnoException } from '../../types/http';

async function withAuthDetails<T>(
  client: BaseClient,
  headers: RequestCallbackHeaders | undefined,
  params: Record<string, any>,
  opCallback: Function
): Promise<ResourceResult<T>> {
  if (client.http.supportsAuthHeaders) {
    const authHeaders = await client.auth.getAuthHeaders();
    return opCallback(Utils.mixin(authHeaders!, headers), params);
  } else {
    const authParams = await client.auth.getAuthParams();
    return opCallback(headers, Utils.mixin(authParams!, params));
  }
}

function unenvelope<T>(
  result: ResourceResult<T>,
  MsgPack: MsgPack | null,
  format: Utils.Format | null
): ResourceResult<T> {
  if (result._err && !result._body) {
    return { _err: result._err };
  }

  let body = result._body;

  if (!result._unpacked) {
    try {
      body = Utils.decodeBody(body, MsgPack, format);
    } catch (e) {
      if (Utils.isErrorInfoOrPartialErrorInfo(e)) {
        return { _err: e };
      } else {
        return { _err: new PartialErrorInfo(Utils.inspectError(e), null) };
      }
    }
  }

  if (!body) {
    return { _err: new PartialErrorInfo('unenvelope(): Response body is missing', null) };
  }

  const { statusCode: wrappedStatusCode, response, headers: wrappedHeaders } = body as Record<string, any>;

  if (wrappedStatusCode === undefined) {
    /* Envelope already unwrapped by the transport */
    return { ...result, _body: body, _unpacked: true };
  }

  if (wrappedStatusCode < 200 || wrappedStatusCode >= 300) {
    /* handle wrapped errors */
    let wrappedErr = (response && response.error) || result._err;
    if (!wrappedErr) {
      wrappedErr = new Error('Error in unenveloping ' + body);
      wrappedErr.statusCode = wrappedStatusCode;
    }
    return {
      _err: wrappedErr,
      _body: response,
      _headers: wrappedHeaders,
      _unpacked: true,
      _statusCode: wrappedStatusCode,
    };
  }

  return {
    _err: result._err,
    _body: response,
    _headers: wrappedHeaders,
    _unpacked: true,
    _statusCode: wrappedStatusCode,
  };
}

function paramString(params: Record<string, any>) {
  const paramPairs = [];
  if (params) {
    for (const needle in params) {
      paramPairs.push(needle + '=' + params[needle]);
    }
  }
  return paramPairs.join('&');
}

function urlFromPathAndParams(path: string, params: Record<string, any>) {
  return path + (params ? '?' : '') + paramString(params);
}

function logResult<T>(result: ResourceResult<T>, method: HttpMethods, path: string, params: Record<string, string>) {
  if (result._err) {
    Logger.logAction(
      Logger.LOG_MICRO,
      'Resource.' + method + '()',
      'Received Error; ' + urlFromPathAndParams(path, params) + '; Error: ' + Utils.inspectError(result._err)
    );
  } else {
    Logger.logAction(
      Logger.LOG_MICRO,
      'Resource.' + method + '()',
      'Received; ' +
        urlFromPathAndParams(path, params) +
        '; Headers: ' +
        paramString(result._headers as Record<string, any>) +
        '; StatusCode: ' +
        result._statusCode +
        '; Body: ' +
        (Platform.BufferUtils.isBuffer(result._body) ? result._body.toString() : result._body)
    );
  }
}

export interface ResourceResponse<T> {
  _body?: T;
  _headers?: RequestCallbackHeaders;
  _unpacked?: boolean;
  _statusCode?: number;
}

export interface ResourceResult<T> extends ResourceResponse<T> {
  /**
   * Any error returned by the underlying HTTP client.
   */
  _err: IPartialErrorInfo | null;
}

class Resource {
  /**
   * @param throwError Whether to throw any error returned by the underlying HTTP client.
   *
   * If you specify `true`, then this method will return a `ResourceResponse<T>`, and if the underlying HTTP client returns an error, this method call will throw that error. If you specify `false`, then it will return a `ResourceResult<T>`, whose `_err` property contains any error that was returned by the underlying HTTP client.
   */
  static async get<T = unknown>(
    client: BaseClient,
    path: string,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    throwError: true
  ): Promise<ResourceResponse<T>>;
  static async get<T = unknown>(
    client: BaseClient,
    path: string,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    throwError: false
  ): Promise<ResourceResult<T>>;
  static async get<T = unknown>(
    client: BaseClient,
    path: string,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    throwError: boolean
  ): Promise<ResourceResponse<T> | ResourceResult<T>> {
    return Resource.do(HttpMethods.Get, client, path, null, headers, params, envelope, throwError ?? false);
  }

  /**
   * @param throwError Whether to throw any error returned by the underlying HTTP client.
   *
   * If you specify `true`, then this method will return a `ResourceResponse<T>`, and if the underlying HTTP client returns an error, this method call will throw that error. If you specify `false`, then it will return a `ResourceResult<T>`, whose `_err` property contains any error that was returned by the underlying HTTP client.
   */
  static async delete<T = unknown>(
    client: BaseClient,
    path: string,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    throwError: true
  ): Promise<ResourceResponse<T>>;
  static async delete<T = unknown>(
    client: BaseClient,
    path: string,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    throwError: false
  ): Promise<ResourceResult<T>>;
  static async delete<T = unknown>(
    client: BaseClient,
    path: string,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    throwError: boolean
  ): Promise<ResourceResponse<T> | ResourceResult<T>> {
    return Resource.do(HttpMethods.Delete, client, path, null, headers, params, envelope, throwError);
  }

  /**
   * @param throwError Whether to throw any error returned by the underlying HTTP client.
   *
   * If you specify `true`, then this method will return a `ResourceResponse<T>`, and if the underlying HTTP client returns an error, this method call will throw that error. If you specify `false`, then it will return a `ResourceResult<T>`, whose `_err` property contains any error that was returned by the underlying HTTP client.
   */
  static async post<T = unknown>(
    client: BaseClient,
    path: string,
    body: unknown,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    throwError: true
  ): Promise<ResourceResponse<T>>;
  static async post<T = unknown>(
    client: BaseClient,
    path: string,
    body: unknown,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    throwError: false
  ): Promise<ResourceResult<T>>;
  static async post<T = unknown>(
    client: BaseClient,
    path: string,
    body: unknown,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    throwError: boolean
  ): Promise<ResourceResponse<T> | ResourceResult<T>> {
    return Resource.do(HttpMethods.Post, client, path, body, headers, params, envelope, throwError);
  }

  /**
   * @param throwError Whether to throw any error returned by the underlying HTTP client.
   *
   * If you specify `true`, then this method will return a `ResourceResponse<T>`, and if the underlying HTTP client returns an error, this method call will throw that error. If you specify `false`, then it will return a `ResourceResult<T>`, whose `_err` property contains any error that was returned by the underlying HTTP client.
   */
  static async patch<T = unknown>(
    client: BaseClient,
    path: string,
    body: unknown,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    throwError: true
  ): Promise<ResourceResponse<T>>;
  static async patch<T = unknown>(
    client: BaseClient,
    path: string,
    body: unknown,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    throwError: false
  ): Promise<ResourceResult<T>>;
  static async patch<T = unknown>(
    client: BaseClient,
    path: string,
    body: unknown,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    throwError: boolean
  ): Promise<ResourceResponse<T> | ResourceResult<T>> {
    return Resource.do(HttpMethods.Patch, client, path, body, headers, params, envelope, throwError);
  }

  /**
   * @param throwError Whether to throw any error returned by the underlying HTTP client.
   *
   * If you specify `true`, then this method will return a `ResourceResponse<T>`, and if the underlying HTTP client returns an error, this method call will throw that error. If you specify `false`, then it will return a `ResourceResult<T>`, whose `_err` property contains any error that was returned by the underlying HTTP client.
   */
  static async put<T = unknown>(
    client: BaseClient,
    path: string,
    body: unknown,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    throwError: true
  ): Promise<ResourceResponse<T>>;
  static async put<T = unknown>(
    client: BaseClient,
    path: string,
    body: unknown,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    throwError: false
  ): Promise<ResourceResult<T>>;
  static async put<T = unknown>(
    client: BaseClient,
    path: string,
    body: unknown,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    throwError: boolean
  ): Promise<ResourceResponse<T> | ResourceResult<T>> {
    return Resource.do(HttpMethods.Put, client, path, body, headers, params, envelope, throwError);
  }

  static async do<T>(
    method: HttpMethods,
    client: BaseClient,
    path: string,
    body: unknown,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    throwError: boolean
  ): Promise<ResourceResponse<T> | ResourceResult<T>> {
    if (envelope) {
      (params = params || {})['envelope'] = envelope;
    }

    async function doRequest(
      this: any,
      headers: Record<string, string>,
      params: Record<string, any>
    ): Promise<ResourceResult<T>> {
      if (Logger.shouldLog(Logger.LOG_MICRO)) {
        Logger.logAction(
          Logger.LOG_MICRO,
          'Resource.' + method + '()',
          'Sending; ' + urlFromPathAndParams(path, params)
        );
      }

      if (Logger.shouldLog(Logger.LOG_MICRO)) {
        let decodedBody = body;
        if (headers['content-type']?.indexOf('msgpack') > 0) {
          try {
            if (!client._MsgPack) {
              Utils.throwMissingModuleError('MsgPack');
            }
            decodedBody = client._MsgPack.decode(body as Buffer);
          } catch (decodeErr) {
            Logger.logAction(
              Logger.LOG_MICRO,
              'Resource.' + method + '()',
              'Sending MsgPack Decoding Error: ' + Utils.inspectError(decodeErr)
            );
          }
        }
        Logger.logAction(
          Logger.LOG_MICRO,
          'Resource.' + method + '()',
          'Sending; ' + urlFromPathAndParams(path, params) + '; Body: ' + decodedBody
        );
      }

      // TODO mangle these property names too
      type HttpResult = {
        error?: ErrnoException | IPartialErrorInfo | null;
        body?: unknown;
        headers?: RequestCallbackHeaders;
        unpacked?: boolean;
        statusCode?: number;
      };

      const httpResult = await new Promise<HttpResult>((resolve) => {
        client.http.do(method, path, headers, body, params, function (error, body, headers, unpacked, statusCode) {
          resolve({ error, body, headers, unpacked, statusCode });
        });
      });

      if (httpResult.error && Auth.isTokenErr(httpResult.error as ErrorInfo)) {
        /* token has expired, so get a new one */
        await client.auth.authorize(null, null);
        /* retry ... */
        return withAuthDetails(client, headers, params, doRequest);
      }

      return {
        _err: httpResult.error as ErrorInfo,
        _body: httpResult.body as T | undefined,
        _headers: httpResult.headers,
        _unpacked: httpResult.unpacked,
        _statusCode: httpResult.statusCode,
      };
    }

    let result = await withAuthDetails<T>(client, headers, params, doRequest);

    if (envelope) {
      result = unenvelope(result, client._MsgPack, envelope);
    }

    if (Logger.shouldLog(Logger.LOG_MICRO)) {
      logResult(result, method, path, params);
    }

    if (throwError) {
      if (result._err) {
        throw result._err;
      } else {
        const response: Omit<ResourceResult<T>, '_err'> & Pick<Partial<ResourceResult<T>>, '_err'> = { ...result };
        delete response._err;
        return response;
      }
    }

    return result;
  }
}

export default Resource;
