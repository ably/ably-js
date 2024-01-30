import Platform from 'common/platform';
import Defaults from 'common/lib/util/defaults';
import ErrorInfo, { PartialErrorInfo } from 'common/lib/types/errorinfo';
import { RequestBody, RequestCallback, RequestCallbackError, RequestParams } from 'common/types/http';
import HttpMethods from 'common/constants/HttpMethods';
import BaseClient from 'common/lib/client/baseclient';
import XHRStates from 'common/constants/XHRStates';
import Logger from 'common/lib/util/logger';
import { StandardCallback } from 'common/types/utils';
import { isSuccessCode } from 'common/constants/HttpStatusCodes';
import { ModulesMap } from 'common/lib/client/modulesmap';

export type HTTPRequestImplementations = Pick<ModulesMap, 'XHRRequest' | 'FetchRequest'>;

function createMissingImplementationError() {
  return new ErrorInfo(
    'No HTTP request module provided. Provide at least one of the FetchRequest or XHRRequest modules.',
    400,
    40000
  );
}

const Http = class {
  static methods = [HttpMethods.Get, HttpMethods.Delete, HttpMethods.Post, HttpMethods.Put, HttpMethods.Patch];
  static methodsWithoutBody = [HttpMethods.Get, HttpMethods.Delete];
  static methodsWithBody = [HttpMethods.Post, HttpMethods.Put, HttpMethods.Patch];
  // HTTP request implementations that are available even without a BaseClient object (needed by some tests which directly instantiate `Http` without a client)
  static bundledRequestImplementations: HTTPRequestImplementations;
  checksInProgress: Array<StandardCallback<boolean>> | null = null;
  private client: BaseClient | null;

  constructor(client?: BaseClient) {
    this.client = client ?? null;
    const connectivityCheckUrl = client?.options.connectivityCheckUrl || Defaults.connectivityCheckUrl;
    const connectivityCheckParams = client?.options.connectivityCheckParams ?? null;
    const connectivityUrlIsDefault = !client?.options.connectivityCheckUrl;

    const requestImplementations = {
      ...Http.bundledRequestImplementations,
      ...client?._additionalHTTPRequestImplementations,
    };
    const xhrRequestImplementation = requestImplementations.XHRRequest;
    const fetchRequestImplementation = requestImplementations.FetchRequest;
    const hasImplementation = !!(xhrRequestImplementation || fetchRequestImplementation);

    if (!hasImplementation) {
      throw createMissingImplementationError();
    }

    if (Platform.Config.xhrSupported && xhrRequestImplementation) {
      this.supportsAuthHeaders = true;
      this.Request = function (
        method: HttpMethods,
        uri: string,
        headers: Record<string, string> | null,
        params: RequestParams,
        body: RequestBody | null,
        callback: RequestCallback
      ) {
        const req = xhrRequestImplementation.createRequest(
          uri,
          headers,
          params,
          body,
          XHRStates.REQ_SEND,
          (client && client.options.timeouts) ?? null,
          method
        );
        req.once('complete', callback);
        req.exec();
        return req;
      };
      if (client?.options.disableConnectivityCheck) {
        this.checkConnectivity = async function () {
          return true;
        };
      } else {
        this.checkConnectivity = async function () {
          Logger.logAction(
            Logger.LOG_MICRO,
            '(XHRRequest)Http.checkConnectivity()',
            'Sending; ' + connectivityCheckUrl
          );
          return new Promise((resolve) => {
            this.doUri(
              HttpMethods.Get,
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
                resolve(result);
              }
            );
          });
        };
      }
    } else if (Platform.Config.fetchSupported && fetchRequestImplementation) {
      this.supportsAuthHeaders = true;
      this.Request = (method, uri, headers, params, body, callback) => {
        fetchRequestImplementation(method, client ?? null, uri, headers, params, body, callback);
      };
      this.checkConnectivity = async function () {
        Logger.logAction(Logger.LOG_MICRO, '(Fetch)Http.checkConnectivity()', 'Sending; ' + connectivityCheckUrl);
        return new Promise((resolve) => {
          this.doUri(HttpMethods.Get, connectivityCheckUrl, null, null, null, function (err, responseText) {
            const result = !err && (responseText as string)?.replace(/\n/, '') == 'yes';
            Logger.logAction(Logger.LOG_MICRO, '(Fetch)Http.checkConnectivity()', 'Result: ' + result);
            resolve(result);
          });
        });
      };
    } else {
      this.Request = (method, uri, headers, params, body, callback) => {
        const error = hasImplementation
          ? new PartialErrorInfo('no supported HTTP transports available', null, 400)
          : createMissingImplementationError();
        callback(error, null);
      };
    }
  }

  doUri(
    method: HttpMethods,
    uri: string,
    headers: Record<string, string> | null,
    body: RequestBody | null,
    params: RequestParams,
    callback: RequestCallback
  ): void {
    if (!this.Request) {
      callback(new PartialErrorInfo('Request invoked before assigned to', null, 500));
      return;
    }
    this.Request(method, uri, headers, params, body, callback);
  }

  private Request?: (
    method: HttpMethods,
    uri: string,
    headers: Record<string, string> | null,
    params: RequestParams,
    body: RequestBody | null,
    callback: RequestCallback
  ) => void;

  checkConnectivity?: () => Promise<boolean> = undefined;

  supportsAuthHeaders = false;
  supportsLinkHeaders = false;

  shouldFallback(errorInfo: RequestCallbackError) {
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
};

export default Http;
