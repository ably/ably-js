import Platform from 'platform';
import * as Utils from '../../../common/lib/util/utils';
import Defaults from '../../../common/lib/util/defaults';
import ErrorInfo from '../../../common/lib/types/errorinfo';
import request, { Options as RequestOptions, RequestResponse } from 'request';
import { ErrnoException, IHttp, PathParameter, RequestCallback, RequestParams } from '../../../common/types/http';
import HttpMethods from '../../../common/constants/HttpMethods';

// TODO: replace these with the real types once these classes are in TypeScript
type Rest = any;
type Realtime = any;

const msgpack = Platform.msgpack;

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

const handler = function(uri: string, params: unknown, callback?: RequestCallback) {
	return function(err: Error, response: RequestResponse, body: unknown) {
		if(err) {
			callback?.(err);
			return;
		}
		const statusCode = response.statusCode, headers = response.headers;
		if(statusCode >= 300) {
			switch(headers['content-type']) {
				case 'application/json':
					body = JSON.parse(body as string);
					break;
				case 'application/x-msgpack':
					body = msgpack.decode(body as Buffer);
			}
			const error = (body as { error: ErrorInfo }).error ? ErrorInfo.fromValues((body as { error: ErrorInfo }).error) : new ErrorInfo(
				(headers['x-ably-errormessage'] as string) || 'Error response received from server: ' + statusCode + ' body was: ' + Utils.inspect(body),
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
	return code === 'ENETUNREACH' ||
		code === 'EHOSTUNREACH'     ||
		code === 'EHOSTDOWN'        ||
		code === 'ETIMEDOUT'        ||
		code === 'ESOCKETTIMEDOUT'  ||
		code === 'ENOTFOUND'        ||
		code === 'ECONNRESET'       ||
		code === 'ECONNREFUSED'     ||
		(statusCode >= 500 && statusCode <= 504);
}


function getHosts(client: Rest | Realtime): string[] {
	/* If we're a connected realtime client, try the endpoint we're connected
		* to first -- but still have fallbacks, being connected is not an absolute
		* guarantee that a datacenter has free capacity to service REST requests. */
	const connection = (client as Realtime).connection;
	const connectionHost = connection && connection.connectionManager.host;

	if(connectionHost) {
		return [connectionHost].concat(Defaults.getFallbackHosts(client.options));
	}

	return Defaults.getHosts(client.options);
}

const Http: typeof IHttp = class {
	static methods = [HttpMethods.Get, HttpMethods.Delete, HttpMethods.Post, HttpMethods.Put, HttpMethods.Patch];
	static methodsWithoutBody = [HttpMethods.Get, HttpMethods.Delete];
	static methodsWithBody = [HttpMethods.Post, HttpMethods.Put, HttpMethods.Patch];

	/* Unlike for doUri, the 'rest' param here is mandatory, as it's used to generate the hosts */
	static do(method: HttpMethods, rest: Rest, path: PathParameter, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void {
		const uriFromHost = (typeof(path) == 'function') ? path : function(host: string) { return rest.baseUri(host) + path; };
	
		const currentFallback = rest._currentFallback;
		if(currentFallback) {
			if(currentFallback.validUntil > Date.now()) {
				/* Use stored fallback */
				Http.doUri(method, rest, uriFromHost(currentFallback.host), headers, body, params, (err?: ErrorInfo | null) => {
					if(err && shouldFallback(err as ErrnoException)) {
						/* unstore the fallback and start from the top with the default sequence */
						rest._currentFallback = null;
						Http.do(method, rest, path, headers, body, params, callback);
						return;
					}
					callback(err);
				});
				return;
			} else {
				/* Fallback expired; remove it and fallthrough to normal sequence */
				rest._currentFallback = null;
			}
		}
	
		const hosts = getHosts(rest);
	
		/* see if we have one or more than one host */
		if(hosts.length == 1) {
			Http.doUri(method, rest, uriFromHost(hosts[0]), headers, body, params, callback);
			return;
		}
	
		const tryAHost = (candidateHosts: Array<string>, persistOnSuccess?: boolean) => {
			const host = candidateHosts.shift();
			Http.doUri(method, rest, uriFromHost(host as string), headers, body, params, function(err?: ErrorInfo | null) {
				if(err && shouldFallback(err as ErrnoException) && candidateHosts.length) {
					tryAHost(candidateHosts, true);
					return;
				}
				if(persistOnSuccess) {
					/* RSC15f */
					rest._currentFallback = {
						host: host as string,
						validUntil: Date.now() + rest.options.timeouts.fallbackRetryTimeout
					};
				}
				callback(err)
			});
		};
		tryAHost(hosts);
	}

	static doUri(method: HttpMethods, rest: Rest, uri: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void {
		/* Will generally be making requests to one or two servers exclusively
		* (Ably and perhaps an auth server), so for efficiency, use the
		* foreverAgent to keep the TCP stream alive between requests where possible */
		const agentOptions = (rest && rest.options.restAgentOptions) || Defaults.restAgentOptions;
		const doOptions: RequestOptions = {uri, headers: headers ?? undefined, encoding: null, agentOptions: agentOptions};
		if (body) {
			doOptions.body = body;
		}
		if(params)
			doOptions.qs = params;

		doOptions.uri = uri;
		doOptions.timeout = (rest && rest.options.timeouts || Defaults.TIMEOUTS).httpRequestTimeout;
		request[method](doOptions, handler(uri, params, callback));
	}

	/** Http.get, Http.post, Http.put, ...
	 * Perform an HTTP request for a given path against prime and fallback Ably hosts
	 * @param rest
	 * @param path the full path
	 * @param headers optional hash of headers
	 * [only for methods with body: @param body object or buffer containing request body]
	 * @param params optional hash of params
	 * @param callback (err, response)
	 *
	 ** Http.getUri, Http.postUri, Http.putUri, ...
		* Perform an HTTP request for a given full URI
		* @param rest
		* @param uri the full URI
		* @param headers optional hash of headers
		* [only for methods with body: @param body object or buffer containing request body]
		* @param params optional hash of params
		* @param callback (err, response)
		*/

	static get(rest: Rest, path: string, headers: Record<string, string> | null, params: RequestParams, callback: RequestCallback): void {
		Http.do(HttpMethods.Get, rest, path, headers, null, params, callback);
	}

	static getUri(rest: Rest, uri: string, headers: Record<string, string> | null, params: RequestParams, callback: RequestCallback): void {
		Http.doUri(HttpMethods.Get, rest, uri, headers, null, params, callback);
	}

	static delete(rest: Rest, path: string, headers: Record<string, string> | null, params: RequestParams, callback: RequestCallback): void {
		Http.do(HttpMethods.Delete, rest, path, headers, null, params, callback);
	}

	static deleteUri(rest: Rest, uri: string, headers: Record<string, string> | null, params: RequestParams, callback: RequestCallback): void {
		Http.doUri(HttpMethods.Delete, rest, uri, headers, null, params, callback);
	}

	static post(rest: Rest, path: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void {
		Http.do(HttpMethods.Post, rest, path, headers, body, params, callback);
	}

	static postUri(rest: Rest, uri: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void {
		Http.doUri(HttpMethods.Post, rest, uri, headers, body, params, callback);
	}

	static put(rest: Rest, path: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void {
		Http.do(HttpMethods.Put, rest, path, headers, body, params, callback);
	}

	static putUri(rest: Rest, uri: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void {
		Http.doUri(HttpMethods.Put, rest, uri, headers, body, params, callback);
	}

	static patch(rest: Rest, path: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void {
		Http.do(HttpMethods.Patch, rest, path, headers, body, params, callback);
	}

	static patchUri(rest: Rest, uri: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void {
		Http.doUri(HttpMethods.Patch, rest, uri, headers, body, params, callback);
	}

	static checkConnectivity = function (callback: (err: ErrorInfo | null, connected?: boolean) => void): void {
		Http.getUri(null, Defaults.internetUpUrl, null, null, function(err?: ErrorInfo | null, responseText?: unknown) {
			if (!(typeof responseText === 'string')) {
				callback(new ErrorInfo('Recieved non text response from internetUpUrl', null, 500));
				return;
			}
			callback(null, !err && (responseText as string)?.toString().trim() === 'yes');
		});
	}

	static Request?: (method: HttpMethods, rest: Rest | null, uri: string, headers: Record<string, string> | null, params: RequestParams, body: unknown, callback: RequestCallback) => void = undefined;

	static _getHosts = getHosts;

	static supportsAuthHeaders = true;
	static supportsLinkHeaders = true;
}

export default Http;
