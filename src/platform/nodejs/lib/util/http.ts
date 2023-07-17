import Platform from 'common/platform';
import Defaults from 'common/lib/util/defaults';
import ErrorInfo from 'common/lib/types/errorinfo';
import { ErrnoException, IHttp, PathParameter, RequestCallback, RequestParams } from '../../../../common/types/http';
import HttpMethods from '../../../../common/constants/HttpMethods';
import got, { Response, Options, CancelableRequest, Agents } from 'got';
import http from 'http';
import https from 'https';
import Rest from 'common/lib/client/rest';
import Realtime from 'common/lib/client/realtime';
import { NormalisedClientOptions, RestAgentOptions } from 'common/types/ClientOptions';
import { isSuccessCode } from 'common/constants/HttpStatusCodes';
import { shallowEquals } from 'common/lib/util/utils';

/***************************************************
 *
 * These Http operations are used for REST operations
 * and assume that the system is stateless - ie
 * there is no connection state that tells us
 * anything about the state of the network or the
 * viability of any of the hosts we know about.
 * Therefore all requests will respond to specific
 * errors by attempting the fallback hosts, and no
 * assumptions about host or network is retained to
 * influence the handling of any subsequent request.
 *
 ***************************************************/

const globalAgentPool: Array<{ options: RestAgentOptions; agents: Agents }> = [];

const handler = function (uri: string, params: unknown, callback?: RequestCallback) {
  return function (err: ErrnoException | null, response?: Response, body?: unknown) {
    if (err) {
      callback?.(err);
      return;
    }
    const statusCode = (response as Response).statusCode,
      headers = (response as Response).headers;
    if (statusCode >= 300) {
      switch (headers['content-type']) {
        case 'application/json':
          body = JSON.parse(body as string);
          break;
        case 'application/x-msgpack':
          body = Platform.Config.msgpack.decode(body as Buffer);
      }
      const error = (body as { error: ErrorInfo }).error
        ? ErrorInfo.fromValues((body as { error: ErrorInfo }).error)
        : new ErrorInfo(
            (headers['x-ably-errormessage'] as string) ||
              'Error response received from server: ' + statusCode + ' body was: ' + Platform.Config.inspect(body),
            Number(headers['x-ably-errorcode']),
            statusCode
          );
      callback?.(error, body, headers, true, statusCode);
      return;
    }
    callback?.(null, body, headers, false, statusCode);
  };
};

function shouldFallback(err: ErrnoException) {
  const { code, statusCode } = err;
  return (
    code === 'ENETUNREACH' ||
    code === 'EHOSTUNREACH' ||
    code === 'EHOSTDOWN' ||
    code === 'ETIMEDOUT' ||
    code === 'ESOCKETTIMEDOUT' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    (statusCode >= 500 && statusCode <= 504)
  );
}

function getHosts(client: Rest | Realtime): string[] {
  /* If we're a connected realtime client, try the endpoint we're connected
   * to first -- but still have fallbacks, being connected is not an absolute
   * guarantee that a datacenter has free capacity to service REST requests. */
  const connection = (client as Realtime).connection;
  const connectionHost = connection && connection.connectionManager.host;

  if (connectionHost) {
    return [connectionHost].concat(Defaults.getFallbackHosts(client.options));
  }

  return Defaults.getHosts(client.options);
}

const Http: typeof IHttp = class {
  static methods = [HttpMethods.Get, HttpMethods.Delete, HttpMethods.Post, HttpMethods.Put, HttpMethods.Patch];
  static methodsWithoutBody = [HttpMethods.Get, HttpMethods.Delete];
  static methodsWithBody = [HttpMethods.Post, HttpMethods.Put, HttpMethods.Patch];
  agent: Agents | null = null;
  _getHosts = getHosts;
  supportsAuthHeaders = true;
  supportsLinkHeaders = true;
  options: NormalisedClientOptions;

  constructor(options: NormalisedClientOptions) {
    this.options = options || {};
  }

  /* Unlike for doUri, the 'rest' param here is mandatory, as it's used to generate the hosts */
  do(
    method: HttpMethods,
    rest: Rest,
    path: PathParameter,
    headers: Record<string, string> | null,
    body: unknown,
    params: RequestParams,
    callback: RequestCallback
  ): void {
    const uriFromHost =
      typeof path === 'function'
        ? path
        : function (host: string) {
            return rest.baseUri(host) + path;
          };

    const currentFallback = rest._currentFallback;
    if (currentFallback) {
      if (currentFallback.validUntil > Date.now()) {
        /* Use stored fallback */
        this.doUri(
          method,
          rest,
          uriFromHost(currentFallback.host),
          headers,
          body,
          params,
          (err?: ErrnoException | ErrorInfo | null, ...args: unknown[]) => {
            if (err && shouldFallback(err as ErrnoException)) {
              /* unstore the fallback and start from the top with the default sequence */
              rest._currentFallback = null;
              this.do(method, rest, path, headers, body, params, callback);
              return;
            }
            callback(err, ...args);
          }
        );
        return;
      } else {
        /* Fallback expired; remove it and fallthrough to normal sequence */
        rest._currentFallback = null;
      }
    }

    const hosts = getHosts(rest);

    /* see if we have one or more than one host */
    if (hosts.length === 1) {
      this.doUri(method, rest, uriFromHost(hosts[0]), headers, body, params, callback);
      return;
    }

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
          if (err && shouldFallback(err as ErrnoException) && candidateHosts.length) {
            tryAHost(candidateHosts, true);
            return;
          }
          if (persistOnSuccess) {
            /* RSC15f */
            rest._currentFallback = {
              host: host as string,
              validUntil: Date.now() + rest.options.timeouts.fallbackRetryTimeout,
            };
          }
          callback(err, ...args);
        }
      );
    };
    tryAHost(hosts);
  }

  doUri(
    method: HttpMethods,
    rest: Rest,
    uri: string,
    headers: Record<string, string> | null,
    body: unknown,
    params: RequestParams,
    callback: RequestCallback
  ): void {
    /* Will generally be making requests to one or two servers exclusively
     * (Ably and perhaps an auth server), so for efficiency, use the
     * foreverAgent to keep the TCP stream alive between requests where possible */
    const agentOptions = (rest && rest.options.restAgentOptions) || (Defaults.restAgentOptions as RestAgentOptions);
    const doOptions: Options = { headers: headers || undefined, responseType: 'buffer' };

    if (!this.agent) {
      const persistedAgent = globalAgentPool.find((x) => shallowEquals(agentOptions, x.options))?.agents;
      if (persistedAgent) {
        this.agent = persistedAgent;
      } else {
        this.agent = {
          http: new http.Agent(agentOptions),
          https: new https.Agent(agentOptions),
        };
        globalAgentPool.push({
          options: agentOptions,
          agents: this.agent,
        });
      }
    }

    if (body) {
      doOptions.body = body as Buffer;
    }
    if (params) doOptions.searchParams = params;

    doOptions.agent = this.agent;

    doOptions.url = uri;
    doOptions.timeout = { request: ((rest && rest.options.timeouts) || Defaults.TIMEOUTS).httpRequestTimeout };
    // We have our own logic that retries appropriate statuscodes to fallback endpoints,
    // with timeouts constructed appropriately. Don't want `got` doing its own retries to
    // the same endpoint, inappropriately retrying 429s, etc
    doOptions.retry = { limit: 0 };

    (got[method](doOptions) as CancelableRequest<Response>)
      .then((res: Response) => {
        handler(uri, params, callback)(null, res, res.body);
      })
      .catch((err: ErrnoException) => {
        if (err instanceof got.HTTPError) {
          handler(uri, params, callback)(null, err.response, err.response.body);
          return;
        }
        handler(uri, params, callback)(err);
      });
  }

  checkConnectivity = (callback: (errorInfo: ErrorInfo | null, connected?: boolean) => void): void => {
    if (this.options.disableConnectivityCheck) {
      callback(null, true);
      return;
    }
    const connectivityCheckUrl = this.options.connectivityCheckUrl || Defaults.connectivityCheckUrl;
    const connectivityCheckParams = this.options.connectivityCheckParams;
    const connectivityUrlIsDefault = !this.options.connectivityCheckUrl;

    this.doUri(
      HttpMethods.Get,
      null as any,
      connectivityCheckUrl,
      null,
      null,
      connectivityCheckParams,
      function (
        err?: ErrnoException | ErrorInfo | null,
        responseText?: unknown,
        headers?: any,
        unpacked?: boolean,
        statusCode?: number
      ) {
        if (!err && !connectivityUrlIsDefault) {
          callback(null, isSuccessCode(statusCode as number));
          return;
        }
        callback(null, !err && (responseText as Buffer | string)?.toString().trim() === 'yes');
      }
    );
  };

  Request?: (
    method: HttpMethods,
    rest: Rest | null,
    uri: string,
    headers: Record<string, string> | null,
    params: RequestParams,
    body: unknown,
    callback: RequestCallback
  ) => void = undefined;
};

export default Http;
