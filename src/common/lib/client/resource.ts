import Platform from '../../platform';
import * as Utils from '../util/utils';
import Logger from '../util/logger';
import Auth from './auth';
import HttpMethods from '../../constants/HttpMethods';
import ErrorInfo, { IPartialErrorInfo, PartialErrorInfo } from '../types/errorinfo';
import BaseClient from './baseclient';
import { MsgPack } from 'common/types/msgpack';
import { RequestCallbackHeaders } from 'common/types/http';

function withAuthDetails(
  client: BaseClient,
  headers: RequestCallbackHeaders | undefined,
  params: Record<string, any>,
  errCallback: Function,
  opCallback: Function
) {
  if (client.http.supportsAuthHeaders) {
    Utils.whenPromiseSettles(
      client.auth.getAuthHeaders(),
      function (err: Error | null, authHeaders?: Record<string, string>) {
        if (err) errCallback(err);
        else opCallback(Utils.mixin(authHeaders!, headers), params);
      }
    );
  } else {
    Utils.whenPromiseSettles(
      client.auth.getAuthParams(),
      function (err: Error | null, authParams?: Record<string, string>) {
        if (err) errCallback(err);
        else opCallback(headers, Utils.mixin(authParams!, params));
      }
    );
  }
}

function unenvelope<T>(
  callback: ResourceCallback<T>,
  MsgPack: MsgPack | null,
  format: Utils.Format | null
): ResourceCallback<T> {
  return (err, body, outerHeaders, unpacked, outerStatusCode) => {
    if (err && !body) {
      callback(err);
      return;
    }

    if (!unpacked) {
      try {
        body = Utils.decodeBody(body, MsgPack, format);
      } catch (e) {
        if (Utils.isErrorInfoOrPartialErrorInfo(e)) {
          callback(e);
        } else {
          callback(new PartialErrorInfo(Utils.inspectError(e), null));
        }
        return;
      }
    }

    if (!body) {
      callback(new PartialErrorInfo('unenvelope(): Response body is missing', null));
      return;
    }

    const { statusCode: wrappedStatusCode, response, headers: wrappedHeaders } = body as Record<string, any>;

    if (wrappedStatusCode === undefined) {
      /* Envelope already unwrapped by the transport */
      callback(err, body, outerHeaders, true, outerStatusCode);
      return;
    }

    if (wrappedStatusCode < 200 || wrappedStatusCode >= 300) {
      /* handle wrapped errors */
      let wrappedErr = (response && response.error) || err;
      if (!wrappedErr) {
        wrappedErr = new Error('Error in unenveloping ' + body);
        wrappedErr.statusCode = wrappedStatusCode;
      }
      callback(wrappedErr, response, wrappedHeaders, true, wrappedStatusCode);
      return;
    }

    callback(err, response, wrappedHeaders, true, wrappedStatusCode);
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

function logResponseHandler<T>(
  callback: ResourceCallback<T>,
  method: HttpMethods,
  path: string,
  params: Record<string, string>
): ResourceCallback {
  return (err, body, headers, unpacked, statusCode) => {
    if (err) {
      Logger.logAction(
        Logger.LOG_MICRO,
        'Resource.' + method + '()',
        'Received Error; ' + urlFromPathAndParams(path, params) + '; Error: ' + Utils.inspectError(err)
      );
    } else {
      Logger.logAction(
        Logger.LOG_MICRO,
        'Resource.' + method + '()',
        'Received; ' +
          urlFromPathAndParams(path, params) +
          '; Headers: ' +
          paramString(headers as Record<string, any>) +
          '; StatusCode: ' +
          statusCode +
          '; Body: ' +
          (Platform.BufferUtils.isBuffer(body) ? body.toString() : body)
      );
    }
    if (callback) {
      callback(err, body as T, headers, unpacked, statusCode);
    }
  };
}

export type ResourceCallback<T = unknown> = (
  err: IPartialErrorInfo | null,
  body?: T,
  headers?: RequestCallbackHeaders,
  unpacked?: boolean,
  statusCode?: number
) => void;

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
    let callback: ResourceCallback<T>;

    const promise = new Promise<ResourceResponse<T> | ResourceResult<T>>((resolve, reject) => {
      callback = (err, body, headers, unpacked, statusCode) => {
        if (throwError) {
          if (err) {
            reject(err);
          } else {
            resolve({ _body: body, _headers: headers, _unpacked: unpacked, _statusCode: statusCode });
          }
        } else {
          resolve({ _err: err, _body: body, _headers: headers, _unpacked: unpacked, _statusCode: statusCode });
        }
      };
    });

    if (Logger.shouldLog(Logger.LOG_MICRO)) {
      callback = logResponseHandler(callback!, method, path, params);
    }

    if (envelope) {
      callback = unenvelope(callback!, client._MsgPack, envelope);
      (params = params || {})['envelope'] = envelope;
    }

    function doRequest(this: any, headers: Record<string, string>, params: Record<string, any>) {
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

      client.http.do(method, path, headers, body, params, function (err, res, resHeaders, unpacked, statusCode) {
        if (err && Auth.isTokenErr(err as ErrorInfo)) {
          /* token has expired, so get a new one */
          Utils.whenPromiseSettles(client.auth.authorize(null, null), function (err: ErrorInfo | null) {
            if (err) {
              callback(err);
              return;
            }
            /* retry ... */
            withAuthDetails(client, headers, params, callback, doRequest);
          });
          return;
        }
        callback(err as ErrorInfo, res as T | undefined, resHeaders, unpacked, statusCode);
      });
    }

    withAuthDetails(client, headers, params, callback!, doRequest);

    return promise;
  }
}

export default Resource;
