import Platform from 'common/platform';
import * as Utils from 'common/lib/util/utils';
import Defaults from 'common/lib/util/defaults';
import ErrorInfo, { PartialErrorInfo } from 'common/lib/types/errorinfo';
import { IHttpStatic, RequestCallback, RequestParams } from 'common/types/http';
import HttpMethods from 'common/constants/HttpMethods';
import BaseClient from 'common/lib/client/baseclient';
import BaseRealtime from 'common/lib/client/baserealtime';
import XHRRequest from '../transport/xhrrequest';
import XHRStates from 'common/constants/XHRStates';
import Logger from 'common/lib/util/logger';
import { StandardCallback } from 'common/types/utils';
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

function getHosts(client: BaseClient): string[] {
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

const Http: IHttpStatic = class {
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
        client: BaseClient | null,
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
          client && client.options.timeouts,
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
            function (err, responseText, headers, unpacked, statusCode) {
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
    } else if (Platform.Config.fetchSupported) {
      this.supportsAuthHeaders = true;
      this.Request = fetchRequest;
      this.checkConnectivity = function (callback: (err: ErrorInfo | null, connectivity: boolean) => void) {
        Logger.logAction(Logger.LOG_MICRO, '(Fetch)Http.checkConnectivity()', 'Sending; ' + connectivityCheckUrl);
        this.doUri(HttpMethods.Get, null as any, connectivityCheckUrl, null, null, null, function (err, responseText) {
          const result = !err && (responseText as string)?.replace(/\n/, '') == 'yes';
          Logger.logAction(Logger.LOG_MICRO, '(Fetch)Http.checkConnectivity()', 'Result: ' + result);
          callback(null, result);
        });
      };
    } else {
      this.Request = (method, client, uri, headers, params, body, callback) => {
        callback(new PartialErrorInfo('no supported HTTP transports available', null, 400), null);
      };
    }
  }

  /* Unlike for doUri, the 'client' param here is mandatory, as it's used to generate the hosts */
  do(
    method: HttpMethods,
    client: BaseClient,
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
            return client.baseUri(host) + path;
          };

    const currentFallback = client._currentFallback;
    if (currentFallback) {
      if (currentFallback.validUntil > Utils.now()) {
        /* Use stored fallback */
        if (!this.Request) {
          callback?.(new PartialErrorInfo('Request invoked before assigned to', null, 500));
          return;
        }
        this.Request(method, client, uriFromHost(currentFallback.host), headers, params, body, (err?, ...args) => {
          // This typecast is safe because ErrnoExceptions are only thrown in NodeJS
          if (err && shouldFallback(err as ErrorInfo)) {
            /* unstore the fallback and start from the top with the default sequence */
            client._currentFallback = null;
            this.do(method, client, path, headers, body, params, callback);
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

    const hosts = getHosts(client);

    /* if there is only one host do it */
    if (hosts.length === 1) {
      this.doUri(method, client, uriFromHost(hosts[0]), headers, body, params, callback as RequestCallback);
      return;
    }

    /* hosts is an array with preferred host plus at least one fallback */
    const tryAHost = (candidateHosts: Array<string>, persistOnSuccess?: boolean) => {
      const host = candidateHosts.shift();
      this.doUri(method, client, uriFromHost(host as string), headers, body, params, function (err, ...args) {
        // This typecast is safe because ErrnoExceptions are only thrown in NodeJS
        if (err && shouldFallback(err as ErrorInfo) && candidateHosts.length) {
          tryAHost(candidateHosts, true);
          return;
        }
        if (persistOnSuccess) {
          /* RSC15f */
          client._currentFallback = {
            host: host as string,
            validUntil: Utils.now() + client.options.timeouts.fallbackRetryTimeout,
          };
        }
        callback?.(err, ...args);
      });
    };
    tryAHost(hosts);
  }

  doUri(
    method: HttpMethods,
    client: BaseClient | null,
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
    this.Request(method, client, uri, headers, params, body, callback);
  }

  Request?: (
    method: HttpMethods,
    client: BaseClient | null,
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
