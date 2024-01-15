import Platform from 'common/platform';
import Defaults from 'common/lib/util/defaults';
import ErrorInfo from 'common/lib/types/errorinfo';
import {
  ErrnoException,
  IHttpStatic,
  PathParameter,
  RequestParams,
  RequestResult,
} from '../../../../common/types/http';
import HttpMethods from '../../../../common/constants/HttpMethods';
import got, { Response, Options, CancelableRequest, Agents } from 'got';
import http from 'http';
import https from 'https';
import BaseClient from 'common/lib/client/baseclient';
import BaseRealtime from 'common/lib/client/baserealtime';
import { RestAgentOptions } from 'common/types/ClientOptions';
import { isSuccessCode } from 'common/constants/HttpStatusCodes';
import { shallowEquals, throwMissingModuleError } from 'common/lib/util/utils';

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

const handler = function (
  uri: string,
  params: unknown,
  client: BaseClient | null
): (err: ErrnoException | null, response?: Response, body?: unknown) => Promise<RequestResult> {
  return async function (error, response, body) {
    if (error) {
      return { error };
    }
    const statusCode = (response as Response).statusCode,
      headers = (response as Response).headers;
    if (statusCode >= 300) {
      switch (headers['content-type']) {
        case 'application/json':
          body = JSON.parse(body as string);
          break;
        case 'application/x-msgpack':
          if (!client?._MsgPack) {
            throwMissingModuleError('MsgPack');
          }
          body = client._MsgPack.decode(body as Buffer);
      }
      const error = (body as { error: ErrorInfo }).error
        ? ErrorInfo.fromValues((body as { error: ErrorInfo }).error)
        : new ErrorInfo(
            (headers['x-ably-errormessage'] as string) ||
              'Error response received from server: ' + statusCode + ' body was: ' + Platform.Config.inspect(body),
            Number(headers['x-ably-errorcode']),
            statusCode
          );
      return { error, body, headers, unpacked: true, statusCode };
    }
    return { error: null, body, headers, unpacked: false, statusCode };
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

function getHosts(client: BaseClient): string[] {
  /* If we're a connected realtime client, try the endpoint we're connected
   * to first -- but still have fallbacks, being connected is not an absolute
   * guarantee that a datacenter has free capacity to service REST requests. */
  const connection = (client as BaseRealtime).connection;
  const connectionHost = connection && connection.connectionManager.host;

  if (connectionHost) {
    return [connectionHost].concat(Defaults.getFallbackHosts(client.options));
  }

  return Defaults.getHosts(client.options);
}

const Http: IHttpStatic = class {
  static methods = [HttpMethods.Get, HttpMethods.Delete, HttpMethods.Post, HttpMethods.Put, HttpMethods.Patch];
  static methodsWithoutBody = [HttpMethods.Get, HttpMethods.Delete];
  static methodsWithBody = [HttpMethods.Post, HttpMethods.Put, HttpMethods.Patch];
  agent: Agents | null = null;
  _getHosts = getHosts;
  supportsAuthHeaders = true;
  supportsLinkHeaders = true;
  private client: BaseClient | null;

  constructor(client?: BaseClient) {
    this.client = client ?? null;
  }

  async do(
    method: HttpMethods,
    path: PathParameter,
    headers: Record<string, string> | null,
    body: unknown,
    params: RequestParams
  ): Promise<RequestResult> {
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
        const result = await this.doUri(method, uriFromHost(currentFallback.host), headers, body, params);

        if (result.error && shouldFallback(result.error as ErrnoException)) {
          /* unstore the fallback and start from the top with the default sequence */
          client._currentFallback = null;
          return this.do(method, path, headers, body, params);
        }
        return result;
      } else {
        /* Fallback expired; remove it and fallthrough to normal sequence */
        client._currentFallback = null;
      }
    }

    const hosts = getHosts(client);

    /* see if we have one or more than one host */
    if (hosts.length === 1) {
      return this.doUri(method, uriFromHost(hosts[0]), headers, body, params);
    }

    const tryAHost = async (candidateHosts: Array<string>, persistOnSuccess?: boolean): Promise<RequestResult> => {
      const host = candidateHosts.shift();
      const result = await this.doUri(method, uriFromHost(host as string), headers, body, params);

      if (result.error && shouldFallback(result.error as ErrnoException) && candidateHosts.length) {
        return tryAHost(candidateHosts, true);
      }
      if (persistOnSuccess) {
        /* RSC15f */
        client._currentFallback = {
          host: host as string,
          validUntil: Date.now() + client.options.timeouts.fallbackRetryTimeout,
        };
      }
      return result;
    };
    return tryAHost(hosts);
  }

  async doUri(
    method: HttpMethods,
    uri: string,
    headers: Record<string, string> | null,
    body: unknown,
    params: RequestParams
  ): Promise<RequestResult> {
    /* Will generally be making requests to one or two servers exclusively
     * (Ably and perhaps an auth server), so for efficiency, use the
     * foreverAgent to keep the TCP stream alive between requests where possible */
    const agentOptions =
      (this.client && this.client.options.restAgentOptions) || (Defaults.restAgentOptions as RestAgentOptions);
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
    doOptions.timeout = {
      request: ((this.client && this.client.options.timeouts) || Defaults.TIMEOUTS).httpRequestTimeout,
    };
    // We have our own logic that retries appropriate statuscodes to fallback endpoints,
    // with timeouts constructed appropriately. Don't want `got` doing its own retries to
    // the same endpoint, inappropriately retrying 429s, etc
    doOptions.retry = { limit: 0 };

    try {
      const res = await (got[method](doOptions) as CancelableRequest<Response>);
      return handler(uri, params, this.client)(null, res, res.body);
    } catch (err) {
      if (err instanceof got.HTTPError) {
        return handler(uri, params, this.client)(null, err.response, err.response.body);
      }
      return handler(uri, params, this.client)(err as ErrnoException);
    }
  }

  checkConnectivity = async (): Promise<boolean> => {
    if (this.client?.options.disableConnectivityCheck) {
      return true;
    }
    const connectivityCheckUrl = this.client?.options.connectivityCheckUrl || Defaults.connectivityCheckUrl;
    const connectivityCheckParams = this.client?.options.connectivityCheckParams ?? null;
    const connectivityUrlIsDefault = !this.client?.options.connectivityCheckUrl;

    const { error, statusCode, body } = await this.doUri(
      HttpMethods.Get,
      connectivityCheckUrl,
      null,
      null,
      connectivityCheckParams
    );

    if (!error && !connectivityUrlIsDefault) {
      return isSuccessCode(statusCode as number);
    }
    return !error && (body as Buffer | string)?.toString().trim() === 'yes';
  };

  Request?: (
    method: HttpMethods,
    uri: string,
    headers: Record<string, string> | null,
    params: RequestParams,
    body: unknown
  ) => Promise<RequestResult> = undefined;
};

export default Http;
