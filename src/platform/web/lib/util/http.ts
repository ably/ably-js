import Platform from 'common/platform';
import * as Utils from 'common/lib/util/utils';
import Defaults from 'common/lib/util/defaults';
import ErrorInfo, { PartialErrorInfo } from 'common/lib/types/errorinfo';
import { ErrnoException, IHttp, RequestCallback, RequestParams } from 'common/types/http';
import HttpMethods from 'common/constants/HttpMethods';
import Rest from 'common/lib/client/rest';
import Realtime from 'common/lib/client/realtime';
import XHRRequest from '../transport/xhrrequest';
import XHRStates from 'common/constants/XHRStates';
import Logger from 'common/lib/util/logger';
import { StandardCallback } from 'common/types/utils';
import { createRequest, Request } from '../transport/jsonptransport';
import fetchRequest from '../transport/fetchrequest';
import { NormalisedClientOptions } from 'common/types/ClientOptions';
import { isSuccessCode } from 'common/constants/HttpStatusCodes';

function shouldFallback(errorInfo: ErrorInfo) {
  const statusCode = errorInfo.statusCode as number;
  /* 400 + no code = a generic xhr onerror. Browser doesn't give us enough
   * detail to know whether it's fallback-fixable, but it may be (eg if a
   * network issue), so try just in case */
  return (
    (statusCode === 408 && !errorInfo.code) ||
    (statusCode === 400 && !errorInfo.code) ||
    (statusCode >= 500 && statusCode <= 504)
  );
}

function getHosts(client: Rest | Realtime): string[] {
  /* If we're a connected realtime client, try the endpoint we're connected
   * to first -- but still have fallbacks, being connected is not an absolute
   * guarantee that a datacenter has free capacity to service REST requests. */
  const connection = (client as Realtime).connection,
    connectionHost = connection && connection.connectionManager.host;

  if (connectionHost) {
    return [connectionHost].concat(Defaults.getFallbackHosts(client.options));
  }

  return Defaults.getHosts(client.options);
}

const Http: typeof IHttp = class {
  static methods = [HttpMethods.Get, HttpMethods.Delete, HttpMethods.Post, HttpMethods.Put, HttpMethods.Patch];
  static methodsWithoutBody = [HttpMethods.Get, HttpMethods.Delete];
  static methodsWithBody = [HttpMethods.Post, HttpMethods.Put, HttpMethods.Patch];
  checksInProgress: Array<StandardCallback<boolean>> | null = null;
  options: NormalisedClientOptions;

  constructor(options: NormalisedClientOptions) {
    this.options = options || {};

    const connectivityCheckUrl = this.options.connectivityCheckUrl || Defaults.connectivityCheckUrl;
    const connectivityCheckParams = this.options.connectivityCheckParams;
    const connectivityUrlIsDefault = !this.options.connectivityCheckUrl;
    if (Platform.Config.xhrSupported) {
      this.supportsAuthHeaders = true;
      this.Request = function (
        method: HttpMethods,
        rest: Rest | null,
        uri: string,
        headers: Record<string, string> | null,
        params: RequestParams,
        body: unknown,
        callback: RequestCallback
      ) {
        const req = XHRRequest.createRequest(
          uri,
          headers,
          params,
          body,
          XHRStates.REQ_SEND,
          rest && rest.options.timeouts,
          method
        );
        req.once('complete', callback);
        req.exec();
        return req;
      };
      if (this.options.disableConnectivityCheck) {
        this.checkConnectivity = function (callback: (err: null, connectivity: true) => void) {
          callback(null, true);
        };
      } else {
        this.checkConnectivity = function (callback: (err: ErrorInfo | null, connectivity: boolean) => void) {
          Logger.logAction(
            Logger.LOG_MICRO,
            '(XHRRequest)Http.checkConnectivity()',
            'Sending; ' + connectivityCheckUrl
          );
          this.doUri(
            HttpMethods.Get,
            null as any,
            connectivityCheckUrl,
            null,
            null,
            connectivityCheckParams,
            function (
              err?: ErrorInfo | ErrnoException | null,
              responseText?: unknown,
              headers?: any,
              unpacked?: boolean,
              statusCode?: number
            ) {
              let result = false;
              if (!connectivityUrlIsDefault) {
                result = !err && isSuccessCode(statusCode as number);
              } else {
                result = !err && (responseText as string)?.replace(/\n/, '') == 'yes';
              }
              Logger.logAction(Logger.LOG_MICRO, '(XHRRequest)Http.checkConnectivity()', 'Result: ' + result);
              callback(null, result);
            }
          );
        };
      }
    } else if (Platform.Config.jsonpSupported) {
      this.Request = function (
        method: HttpMethods,
        rest: Rest | null,
        uri: string,
        headers: Record<string, string> | null,
        params: RequestParams,
        body: unknown,
        callback: RequestCallback
      ) {
        const req = createRequest(
          uri,
          headers,
          params,
          body,
          XHRStates.REQ_SEND,
          rest && rest.options.timeouts,
          method
        );
        req.once('complete', callback);
        Platform.Config.nextTick(function () {
          req.exec();
        });
        return req;
      };

      if (this.options.disableConnectivityCheck) {
        this.checkConnectivity = function (callback: (err: null, connectivity: true) => void) {
          callback(null, true);
        };
      } else {
        this.checkConnectivity = function (callback: (err: ErrorInfo | null, connectivity?: boolean) => void) {
          const upUrl = Defaults.jsonpInternetUpUrl;

          if (this.checksInProgress) {
            this.checksInProgress.push(callback);
            return;
          }
          this.checksInProgress = [callback];
          Logger.logAction(Logger.LOG_MICRO, '(JSONP)Http.checkConnectivity()', 'Sending; ' + upUrl);

          const req = new Request(
            'isTheInternetUp',
            upUrl as string,
            null,
            null,
            null,
            XHRStates.REQ_SEND,
            Defaults.TIMEOUTS
          );
          req.once('complete', (err: Error, response: string) => {
            const result = !err && response;
            Logger.logAction(Logger.LOG_MICRO, '(JSONP)Http.checkConnectivity()', 'Result: ' + result);
            for (let i = 0; i < (this.checksInProgress as Array<StandardCallback<boolean>>).length; i++)
              (this.checksInProgress as Array<StandardCallback<boolean>>)[i](null, result);
            this.checksInProgress = null;
          });
          Platform.Config.nextTick(function () {
            req.exec();
          });
        };
      }
    } else if (Platform.Config.fetchSupported) {
      this.supportsAuthHeaders = true;
      this.Request = fetchRequest;
      this.checkConnectivity = function (callback: (err: ErrorInfo | null, connectivity: boolean) => void) {
        Logger.logAction(Logger.LOG_MICRO, '(Fetch)Http.checkConnectivity()', 'Sending; ' + connectivityCheckUrl);
        this.doUri(
          HttpMethods.Get,
          null as any,
          connectivityCheckUrl,
          null,
          null,
          null,
          function (err?: ErrorInfo | ErrnoException | null, responseText?: unknown) {
            const result = !err && (responseText as string)?.replace(/\n/, '') == 'yes';
            Logger.logAction(Logger.LOG_MICRO, '(Fetch)Http.checkConnectivity()', 'Result: ' + result);
            callback(null, result);
          }
        );
      };
    } else {
      this.Request = (method, rest, uri, headers, params, body, callback) => {
        callback(new PartialErrorInfo('no supported HTTP transports available', null, 400), null);
      };
    }
  }

  /* Unlike for doUri, the 'rest' param here is mandatory, as it's used to generate the hosts */
  do(
    method: HttpMethods,
    rest: Rest,
    path: string,
    headers: Record<string, string> | null,
    body: unknown,
    params: RequestParams,
    callback?: RequestCallback
  ): void {
    const uriFromHost =
      typeof path == 'function'
        ? path
        : function (host: string) {
            return rest.baseUri(host) + path;
          };

    const currentFallback = rest._currentFallback;
    if (currentFallback) {
      if (currentFallback.validUntil > Utils.now()) {
        /* Use stored fallback */
        if (!this.Request) {
          callback?.(new PartialErrorInfo('Request invoked before assigned to', null, 500));
          return;
        }
        this.Request(
          method,
          rest,
          uriFromHost(currentFallback.host),
          headers,
          params,
          body,
          (err?: ErrnoException | ErrorInfo | null, ...args: unknown[]) => {
            // This typecast is safe because ErrnoExceptions are only thrown in NodeJS
            if (err && shouldFallback(err as ErrorInfo)) {
              /* unstore the fallback and start from the top with the default sequence */
              rest._currentFallback = null;
              this.do(method, rest, path, headers, body, params, callback);
              return;
            }
            callback?.(err, ...args);
          }
        );
        return;
      } else {
        /* Fallback expired; remove it and fallthrough to normal sequence */
        rest._currentFallback = null;
      }
    }

    const hosts = getHosts(rest);

    /* if there is only one host do it */
    if (hosts.length === 1) {
      this.doUri(method, rest, uriFromHost(hosts[0]), headers, body, params, callback as RequestCallback);
      return;
    }

    /* hosts is an array with preferred host plus at least one fallback */
    const tryAHost = (candidateHosts: Array<string>, persistOnSuccess?: boolean) => {
      const host = candidateHosts.shift();
      this.doUri(
        method,
        rest,
        uriFromHost(host as string),
        headers,
        body,
        params,
        function (err?: ErrnoException | ErrorInfo | null, ...args: unknown[]) {
          // This typecast is safe because ErrnoExceptions are only thrown in NodeJS
          if (err && shouldFallback(err as ErrorInfo) && candidateHosts.length) {
            tryAHost(candidateHosts, true);
            return;
          }
          if (persistOnSuccess) {
            /* RSC15f */
            rest._currentFallback = {
              host: host as string,
              validUntil: Utils.now() + rest.options.timeouts.fallbackRetryTimeout,
            };
          }
          callback?.(err, ...args);
        }
      );
    };
    tryAHost(hosts);
  }

  doUri(
    method: HttpMethods,
    rest: Rest | null,
    uri: string,
    headers: Record<string, string> | null,
    body: unknown,
    params: RequestParams,
    callback: RequestCallback
  ): void {
    if (!this.Request) {
      callback(new PartialErrorInfo('Request invoked before assigned to', null, 500));
      return;
    }
    this.Request(method, rest, uri, headers, params, body, callback);
  }

  Request?: (
    method: HttpMethods,
    rest: Rest | null,
    uri: string,
    headers: Record<string, string> | null,
    params: RequestParams,
    body: unknown,
    callback: RequestCallback
  ) => void;

  checkConnectivity?: (callback: (err: ErrorInfo | null, connectivity?: boolean) => void) => void = undefined;

  supportsAuthHeaders = false;
  supportsLinkHeaders = false;

  _getHosts = getHosts;
};

export default Http;
