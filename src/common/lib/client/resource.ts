import Platform from '../../platform';
import * as Utils from '../util/utils';
import Logger from '../util/logger';
import Auth from './auth';
import HttpMethods from '../../constants/HttpMethods';
import ErrorInfo, { IPartialErrorInfo, PartialErrorInfo } from '../types/errorinfo';
import BaseClient from './baseclient';
import { MsgPack } from 'common/types/msgpack';
import {
  RequestBody,
  RequestCallbackHeaders,
  appendingParams as urlFromPathAndParams,
  paramString,
} from 'common/types/http';

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
          '; Body' +
          (Platform.BufferUtils.isBuffer(body)
            ? ' (Base64): ' + Platform.BufferUtils.base64Encode(body)
            : ': ' + Platform.Config.inspect(body))
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

class Resource {
  static get<T = unknown>(
    client: BaseClient,
    path: string,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    callback: ResourceCallback<T>
  ): void {
    Resource.do(HttpMethods.Get, client, path, null, headers, params, envelope, callback);
  }

  static delete(
    client: BaseClient,
    path: string,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    callback: ResourceCallback
  ): void {
    Resource.do(HttpMethods.Delete, client, path, null, headers, params, envelope, callback);
  }

  static post(
    client: BaseClient,
    path: string,
    body: RequestBody | null,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    callback: ResourceCallback
  ): void {
    Resource.do(HttpMethods.Post, client, path, body, headers, params, envelope, callback);
  }

  static patch(
    client: BaseClient,
    path: string,
    body: RequestBody | null,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    callback: ResourceCallback
  ): void {
    Resource.do(HttpMethods.Patch, client, path, body, headers, params, envelope, callback);
  }

  static put(
    client: BaseClient,
    path: string,
    body: RequestBody | null,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    callback: ResourceCallback
  ): void {
    Resource.do(HttpMethods.Put, client, path, body, headers, params, envelope, callback);
  }

  static do<T>(
    method: HttpMethods,
    client: BaseClient,
    path: string,
    body: RequestBody | null,
    headers: Record<string, string>,
    params: Record<string, any>,
    envelope: Utils.Format | null,
    callback: ResourceCallback<T>
  ): void {
    if (Logger.shouldLog(Logger.LOG_MICRO)) {
      callback = logResponseHandler(callback, method, path, params);
    }

    if (envelope) {
      callback = callback && unenvelope(callback, client._MsgPack, envelope);
      (params = params || {})['envelope'] = envelope;
    }

    function doRequest(this: any, headers: Record<string, string>, params: Record<string, any>) {
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

    withAuthDetails(client, headers, params, callback, doRequest);
  }
}

export default Resource;
