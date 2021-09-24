import Utils from '../../../common/lib/util/utils';
import Defaults from '../../../common/lib/util/defaults';
import ErrorInfo from '../../../common/lib/types/errorinfo';

interface ErrnoException extends Error {
	errno?: number;
	code?: string;
	path?: string;
	syscall?: string;
	stack?: string;
	statusCode: number;
}

enum HttpMethods {
	Get = 'get',
	Delete = 'delete',
	Post = 'post',
	Put = 'put',
	Patch = 'patch',
}

const noop = function() {};

function shouldFallback(err: ErrnoException) {
	var statusCode = err.statusCode;
	/* 400 + no code = a generic xhr onerror. Browser doesn't give us enough
		* detail to know whether it's fallback-fixable, but it may be (eg if a
		* network issue), so try just in case */
	return (statusCode === 408 && !err.code) ||
		(statusCode === 400 && !err.code)      ||
		(statusCode >= 500 && statusCode <= 504);
}

function getHosts(client: any) {
	/* If we're a connected realtime client, try the endpoint we're connected
		* to first -- but still have fallbacks, being connected is not an absolute
		* guarantee that a datacenter has free capacity to service REST requests. */
	var connection = client.connection,
		connectionHost = connection && connection.connectionManager.host;

	if(connectionHost) {
		return [connectionHost].concat(Defaults.getFallbackHosts(client.options));
	}

	return Defaults.getHosts(client.options);
}

class Http {
	static methods = [HttpMethods.Get, HttpMethods.Delete, HttpMethods.Post, HttpMethods.Put, HttpMethods.Patch];
	static methodsWithoutBody = [HttpMethods.Get, HttpMethods.Delete];
	static methodsWithBody = [HttpMethods.Post, HttpMethods.Put, HttpMethods.Patch];

	/* Unlike for doUri, the 'rest' param here is mandatory, as it's used to generate the hosts */
	static do(method: HttpMethods, rest: any, path: string, headers: Record<string, string> | null, body: unknown, params: any, callback: Function) {
		callback = callback || noop;
		var uriFromHost = (typeof(path) == 'function') ? path : function(host: string) { return rest.baseUri(host) + path; };
		var binary = (headers && headers.accept != 'application/json');
		var doArgs = arguments;

		var currentFallback = rest._currentFallback;
		if(currentFallback) {
			if(currentFallback.validUntil > Utils.now()) {
				/* Use stored fallback */
				if (!Http.Request) {
					callback(new ErrorInfo('Request invoked before assigned to', undefined, 500));
					return;
				}
				Http.Request(method, rest, uriFromHost(currentFallback.host), headers, params, body, function(err: ErrnoException) {
					if(err && shouldFallback(err)) {
						/* unstore the fallback and start from the top with the default sequence */
						rest._currentFallback = null;
						Http['do'].apply(Http, doArgs as any);
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

		var hosts = getHosts(rest);

		/* if there is only one host do it */
		if(hosts.length == 1) {
			Http.doUri(method, rest, uriFromHost(hosts[0]), headers, body, params, callback);
			return;
		}

		/* hosts is an array with preferred host plus at least one fallback */
		var tryAHost = function(candidateHosts: Array<string>, persistOnSuccess?: boolean) {
			var host = candidateHosts.shift();
			Http.doUri(method, rest, uriFromHost(host as string), headers, body, params, function(err: ErrnoException) {
				if(err && shouldFallback(err) && candidateHosts.length) {
					tryAHost(candidateHosts, true);
					return;
				}
				if(persistOnSuccess) {
					/* RSC15f */
					rest._currentFallback = {
						host: host,
						validUntil: Utils.now() + rest.options.timeouts.fallbackRetryTimeout
					};
				}
				callback.apply(null, arguments);
			});
		};
		tryAHost(hosts);
	}

	static doUri(method: HttpMethods, rest: any, uri: string, headers: Record<string, string> | null, body: unknown, params: any, callback: Function) {
		if (!Http.Request) {
			callback(new ErrorInfo('Request invoked before assigned to', undefined, 500));
			return;
		}
		Http.Request(method, rest, uri, headers, params, body, callback);
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

	static Request?: Function = undefined;

	static checkConnectivity?: Function = undefined;

	static supportsAuthHeaders = false;
	static supportsLinkHeaders = false;

	static _getHosts = getHosts;
}

export default Http;
