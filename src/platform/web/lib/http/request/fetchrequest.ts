import HttpMethods from 'common/constants/HttpMethods';
import BaseClient from 'common/lib/client/baseclient';
import ErrorInfo, { PartialErrorInfo } from 'common/lib/types/errorinfo';
import { RequestCallbackHeaders, RequestParams, RequestResult } from 'common/types/http';
import Platform from 'common/platform';
import Defaults from 'common/lib/util/defaults';
import * as Utils from 'common/lib/util/utils';

function isAblyError(responseBody: unknown, headers: Headers): responseBody is { error?: ErrorInfo } {
  return !!headers.get('x-ably-errorcode');
}

function getAblyError(responseBody: unknown, headers: Headers) {
  if (isAblyError(responseBody, headers)) {
    return responseBody.error && ErrorInfo.fromValues(responseBody.error);
  }
}

function convertHeaders(headers: Headers) {
  const result: RequestCallbackHeaders = {};

  headers.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

export default async function fetchRequest(
  method: HttpMethods,
  client: BaseClient | null,
  uri: string,
  headers: Record<string, string> | null,
  params: RequestParams,
  body: unknown
): Promise<RequestResult> {
  const fetchHeaders = new Headers(headers || {});
  const _method = method ? method.toUpperCase() : Utils.isEmptyArg(body) ? 'GET' : 'POST';

  const controller = new AbortController();

  // TODO sort out this type (because of Node / DOM incompatibility) — see our typing of clearTimeout
  let timeout: NodeJS.Timeout | number;
  const timeoutPromise: Promise<RequestResult> = new Promise((resolve, reject) => {
    timeout = setTimeout(
      () => {
        controller.abort();
        reject(new PartialErrorInfo('Request timed out', null, 408));
      },
      client ? client.options.timeouts.httpRequestTimeout : Defaults.TIMEOUTS.httpRequestTimeout
    );
  });

  const requestInit: RequestInit = {
    method: _method,
    headers: fetchHeaders,
    body: body as any,
  };

  if (!Platform.Config.isWebworker) {
    requestInit.credentials = fetchHeaders.has('authorization') ? 'include' : 'same-origin';
  }

  const resultPromise = (async (): Promise<RequestResult> => {
    try {
      const res = await Utils.getGlobalObject().fetch(uri + '?' + new URLSearchParams(params || {}), requestInit);

      clearTimeout(timeout!);

      const contentType = res.headers.get('Content-Type');
      let prom;
      if (contentType && contentType.indexOf('application/x-msgpack') > -1) {
        prom = res.arrayBuffer();
      } else if (contentType && contentType.indexOf('application/json') > -1) {
        prom = res.json();
      } else {
        prom = res.text();
      }

      const body = await prom;
      const unpacked = !!contentType && contentType.indexOf('application/x-msgpack') === -1;
      const headers = convertHeaders(res.headers);

      if (!res.ok) {
        const error =
          getAblyError(body, res.headers) ||
          new PartialErrorInfo(
            'Error response received from server: ' + res.status + ' body was: ' + Platform.Config.inspect(body),
            null,
            res.status
          );

        return { error, body, headers, unpacked, statusCode: res.status };
      } else {
        return { error: null, body, headers, unpacked, statusCode: res.status };
      }
    } catch (error) {
      clearTimeout(timeout!);
      throw error;
    }
  })();

  return Promise.race([timeoutPromise, resultPromise]);
}
