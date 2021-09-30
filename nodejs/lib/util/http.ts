import Platform from 'platform';
import * as Utils from '../../../common/lib/util/utils';
import Defaults from '../../../common/lib/util/defaults';
import ErrorInfo from '../../../common/lib/types/errorinfo';
import request, { Options as RequestOptions, RequestResponse } from 'request';

interface ErrnoException extends Error {
	errno?: number;
	code?: string;
	path?: string;
	syscall?: string;
	stack?: string;
	statusCode: number;
}

const msgpack = Platform.msgpack;
const noop = function() {};

/***************************************************
 *
 * These Http ops are used for REST operations
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

const handler = function(uri: string, params: unknown, callback: Function) {
	callback = callback || noop;
	return function(err: Error, response: RequestResponse, body: { error?: Error }) {
		if(err) {
			callback(err);
			return;
		}
		const statusCode = response.statusCode, headers = response.headers;
		if(statusCode >= 300) {
			switch(headers['content-type']) {
				case 'application/json':
					body = JSON.parse(body as string);
					break;
				case 'application/x-msgpack':
					body = msgpack.decode(body);
			}
			const error = body.error ? ErrorInfo.fromValues(body.error) : new ErrorInfo(
				(headers['x-ably-errormessage'] as string) || 'Error response received from server: ' + statusCode + ' body was: ' + Utils.inspect(body),
				Number(headers['x-ably-errorcode']),
				statusCode
			);
			callback(error, body, headers, true, statusCode);
			return;
		}
		callback(null, body, headers, false, statusCode);
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

function getHosts(client: any) {
	/* If we're a connected realtime client, try the endpoint we're connected
		* to first -- but still have fallbacks, being connected is not an absolute
		* guarantee that a datacenter has free capacity to service REST requests. */
	const connection = client.connection;
	const connectionHost = connection && connection.connectionManager.host;

	if(connectionHost) {
		return [connectionHost].concat(Defaults.getFallbackHosts(client.options));
	}

	return Defaults.getHosts(client.options);
}

enum HttpMethods {
	Get = 'get',
	Delete = 'delete',
	Post = 'post',
	Put = 'put',
	Patch = 'patch',
}

class Http {
	static methods = [HttpMethods.Get, HttpMethods.Delete, HttpMethods.Post, HttpMethods.Put, HttpMethods.Patch];
	static methodsWithoutBody = [HttpMethods.Get, HttpMethods.Delete];
	static methodsWithBody = [HttpMethods.Post, HttpMethods.Put, HttpMethods.Patch];

	/* Unlike for doUri, the 'rest' param here is mandatory, as it's used to generate the hosts */
	static do(method: HttpMethods, rest: any, path: string, headers: Record<string, string> | null, body: unknown, params: any, callback: Function) {
		const uriFromHost = (typeof(path) == 'function') ? path : function(host: string) { return rest.baseUri(host) + path; };
		const doArgs = arguments;
		const self = this;
	
		const currentFallback = rest._currentFallback;
		if(currentFallback) {
			if(currentFallback.validUntil > Date.now()) {
				/* Use stored fallback */
				Http.doUri(method, rest, uriFromHost(currentFallback.host), headers, body, params, function (err: ErrnoException) {
					if(err && shouldFallback(err)) {
						/* unstore the fallback and start from the top with the default sequence */
						rest._currentFallback = null;
						self.do.apply(Http, doArgs as any);
						return;
					}
					callback.apply(null, arguments);
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
			Http.doUri(method, rest, uriFromHost(host as string), headers, body, params, function(err: ErrnoException) {
				if(err && shouldFallback(err) && candidateHosts.length) {
					tryAHost(candidateHosts, true);
					return;
				}
				if(persistOnSuccess) {
					/* RSC15f */
					rest._currentFallback = {
						host: host,
						validUntil: Date.now() + rest.options.timeouts.fallbackRetryTimeout
					};
				}
				callback.apply(null, arguments);
			});
		};
		tryAHost(hosts);
	}

	static doUri(method: HttpMethods, rest: any, uri: string, headers: Record<string, string> | null, body: unknown, params: any, callback: Function) {
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

	static get(rest: any, path: string, headers: Record<string, string> | null, params: any, callback: Function) {
		Http.do(HttpMethods.Get, rest, path, headers, null, params, callback);
	}

	static getUri(rest: any, uri: string, headers: Record<string, string> | null, params: any, callback: Function) {
		Http.doUri(HttpMethods.Get, rest, uri, headers, null, params, callback);
	}

	static delete(rest: any, path: string, headers: Record<string, string> | null, params: any, callback: Function) {
		Http.do(HttpMethods.Delete, rest, path, headers, null, params, callback);
	}

	static deleteUri(rest: any, uri: string, headers: Record<string, string> | null, params: any, callback: Function) {
		Http.doUri(HttpMethods.Delete, rest, uri, headers, null, params, callback);
	}

	static post(rest: any, path: string, headers: Record<string, string> | null, body: unknown, params: any, callback: Function) {
		Http.do(HttpMethods.Post, rest, path, headers, body, params, callback);
	}

	static postUri(rest: any, uri: string, headers: Record<string, string> | null, body: unknown, params: any, callback: Function) {
		Http.doUri(HttpMethods.Post, rest, uri, headers, body, params, callback);
	}

	static put(rest: any, path: string, headers: Record<string, string> | null, body: unknown, params: any, callback: Function) {
		Http.do(HttpMethods.Put, rest, path, headers, body, params, callback);
	}

	static putUri(rest: any, uri: string, headers: Record<string, string> | null, body: unknown, params: any, callback: Function) {
		Http.doUri(HttpMethods.Put, rest, uri, headers, body, params, callback);
	}

	static patch(rest: any, path: string, headers: Record<string, string> | null, body: unknown, params: any, callback: Function) {
		Http.do(HttpMethods.Patch, rest, path, headers, body, params, callback);
	}

	static patchUri(rest: any, uri: string, headers: Record<string, string> | null, body: unknown, params: any, callback: Function) {
		Http.doUri(HttpMethods.Patch, rest, uri, headers, body, params, callback);
	}

	static checkConnectivity = function (callback: Function) {
		Http.getUri(null, Defaults.internetUpUrl, null, null, function (err: Error, responseText: string) {
			callback(null, !err && responseText.toString().trim() === 'yes');
		});
	}

	static Request?: Function = undefined;

	static _getHosts = getHosts;

	static supportsAuthHeaders = true;
	static supportsLinkHeaders = true;
}

export default Http;
