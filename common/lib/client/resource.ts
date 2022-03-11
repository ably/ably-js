import Platform from 'platform';
import Http from 'platform-http';
import * as Utils from '../util/utils';
import Logger from '../util/logger';
import Auth from './auth';
import * as BufferUtils from 'platform-bufferutils';
import HttpMethods from '../../constants/HttpMethods';
import ErrorInfo from '../types/errorinfo';
import Rest from './rest';

const msgpack = Platform.msgpack;

function withAuthDetails(
  rest: Rest,
  headers: Record<string, string>,
  params: Record<string, any>,
  errCallback: Function,
  opCallback: Function,
) {
  if (rest.http.supportsAuthHeaders) {
    rest.auth.getAuthHeaders(function (err: Error, authHeaders: Record<string, string>) {
      if (err) errCallback(err);
      else opCallback(Utils.mixin(authHeaders, headers), params);
    });
  } else {
    rest.auth.getAuthParams(function (err: Error, authParams: Record<string, string>) {
      if (err) errCallback(err);
      else opCallback(headers, Utils.mixin(authParams, params));
    });
  }
}

function unenvelope(callback: Function, format: Utils.Format | null) {
  return function (
    err: Error,
    body: Record<string, any>,
    outerHeaders: Record<string, string>,
    unpacked: boolean,
    outerStatusCode: number,
  ) {
    if (err && !body) {
      callback(err);
      return;
    }

    if (!unpacked) {
      try {
        body = Utils.decodeBody(body, format);
      } catch (e) {
        callback(e);
        return;
      }
    }

    if (body.statusCode === undefined) {
      /* Envelope already unwrapped by the transport */
      callback(err, body, outerHeaders, true, outerStatusCode);
      return;
    }

    const wrappedStatusCode = body.statusCode,
      response = body.response,
      wrappedHeaders = body.headers;

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

function logResponseHandler(callback: Function, method: HttpMethods, path: string, params: Record<string, string>) {
  return function (err: Error, body: unknown, headers: Record<string, string>, unpacked: boolean, statusCode: number) {
    if (err) {
      Logger.logAction(
        Logger.LOG_MICRO,
        'Resource.' + method + '()',
        'Received Error; ' + urlFromPathAndParams(path, params) + '; Error: ' + Utils.inspectError(err),
      );
    } else {
      Logger.logAction(
        Logger.LOG_MICRO,
        'Resource.' + method + '()',
        'Received; ' +
          urlFromPathAndParams(path, params) +
          '; Headers: ' +
          paramString(headers) +
          '; StatusCode: ' +
          statusCode +
          '; Body: ' +
          (BufferUtils.isBuffer(body) ? body.toString() : body),
      );
    }
    if (callback) {
      callback(err, body, headers, unpacked, statusCode);
    }
  };
}

class Resource {
  static get(
    rest: Rest,
    path: string,
    origheaders: Record<string, string>,
    origparams: Record<string, any>,
    envelope: Utils.Format | null,
    callback: Function,
  ): void {
    Resource.do(HttpMethods.Get, rest, path, null, origheaders, origparams, envelope, callback);
  }

  static delete(
    rest: Rest,
    path: string,
    origheaders: Record<string, string>,
    origparams: Record<string, any>,
    envelope: Utils.Format | null,
    callback: Function,
  ): void {
    Resource.do(HttpMethods.Delete, rest, path, null, origheaders, origparams, envelope, callback);
  }

  static post(
    rest: Rest,
    path: string,
    body: unknown,
    origheaders: Record<string, string>,
    origparams: Record<string, any>,
    envelope: Utils.Format | null,
    callback: Function,
  ): void {
    Resource.do(HttpMethods.Post, rest, path, body, origheaders, origparams, envelope, callback);
  }

  static patch(
    rest: Rest,
    path: string,
    body: unknown,
    origheaders: Record<string, string>,
    origparams: Record<string, any>,
    envelope: Utils.Format | null,
    callback: Function,
  ): void {
    Resource.do(HttpMethods.Patch, rest, path, body, origheaders, origparams, envelope, callback);
  }

  static put(
    rest: Rest,
    path: string,
    body: unknown,
    origheaders: Record<string, string>,
    origparams: Record<string, any>,
    envelope: Utils.Format | null,
    callback: Function,
  ): void {
    Resource.do(HttpMethods.Put, rest, path, body, origheaders, origparams, envelope, callback);
  }

  static do(
    method: HttpMethods,
    rest: Rest,
    path: string,
    body: unknown,
    origheaders: Record<string, string>,
    origparams: Record<string, any>,
    envelope: Utils.Format | null,
    callback: Function,
  ): void {
    if (Logger.shouldLog(Logger.LOG_MICRO)) {
      callback = logResponseHandler(callback, method, path, origparams);
    }

    if (envelope) {
      callback = callback && unenvelope(callback, envelope);
      (origparams = origparams || {})['envelope'] = envelope;
    }

    function doRequest(this: any, headers: Record<string, string>, params: Record<string, any>) {
      if (Logger.shouldLog(Logger.LOG_MICRO)) {
        Logger.logAction(
          Logger.LOG_MICRO,
          'Resource.' + method + '()',
          'Sending; ' + urlFromPathAndParams(path, params),
        );
      }

      const args = [
        rest,
        path,
        headers,
        body,
        params,
        function (err: ErrorInfo, res: any, headers: Record<string, string>, unpacked: boolean, statusCode: number) {
          if (err && Auth.isTokenErr(err)) {
            /* token has expired, so get a new one */
            rest.auth.authorize(null, null, function (err: Error) {
              if (err) {
                callback(err);
                return;
              }
              /* retry ... */
              withAuthDetails(rest, origheaders, origparams, callback, doRequest);
            });
            return;
          }
          callback(err, res, headers, unpacked, statusCode);
        },
      ];
      if (!body) {
        // Removes the third argument (body) from the args array
        args.splice(3, 1);
      }

      if (Logger.shouldLog(Logger.LOG_MICRO)) {
        let decodedBody = body;
        if ((headers['content-type'] || '').indexOf('msgpack') > 0) {
          try {
            decodedBody = msgpack.decode(body as Buffer);
          } catch (decodeErr) {
            Logger.logAction(
              Logger.LOG_MICRO,
              'Resource.' + method + '()',
              'Sending MsgPack Decoding Error: ' + Utils.inspectError(decodeErr),
            );
          }
        }
        Logger.logAction(
          Logger.LOG_MICRO,
          'Resource.' + method + '()',
          'Sending; ' + urlFromPathAndParams(path, params) + '; Body: ' + decodedBody,
        );
      }
      (rest.http[method] as Function).apply(rest.http, args);
    }

    withAuthDetails(rest, origheaders, origparams, callback, doRequest);
  }
}

export default Resource;
