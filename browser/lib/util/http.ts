import Platform from 'platform';
import * as Utils from '../../../common/lib/util/utils';
import Defaults from '../../../common/lib/util/defaults';
import ErrorInfo from '../../../common/lib/types/errorinfo';
import { ErrnoException, IHttp, RequestCallback, RequestParams } from '../../../common/types/http';
import HttpMethods from '../../../common/constants/HttpMethods';
import Rest from '../../../common/lib/client/rest';
import Realtime from '../../../common/lib/client/realtime';
import XHRRequest from '../transport/xhrrequest';
import XHRStates from '../../../common/constants/XHRStates';
import Logger from '../../../common/lib/util/logger';
import { StandardCallback } from '../../../common/types/utils';
import { createRequest, Request } from '../transport/jsonptransport';

function shouldFallback(errorInfo: ErrorInfo) {
	const statusCode = errorInfo.statusCode as number;
	/* 400 + no code = a generic xhr onerror. Browser doesn't give us enough
		* detail to know whether it's fallback-fixable, but it may be (eg if a
		* network issue), so try just in case */
	return (statusCode === 408 && !errorInfo.code) ||
		(statusCode === 400 && !errorInfo.code)      ||
		(statusCode >= 500 && statusCode <= 504);
}

function getHosts(client: Rest | Realtime): string[] {
	/* If we're a connected realtime client, try the endpoint we're connected
		* to first -- but still have fallbacks, being connected is not an absolute
		* guarantee that a datacenter has free capacity to service REST requests. */
	const connection = (client as Realtime).connection,
		connectionHost = connection && connection.connectionManager.host;

	if(connectionHost) {
		return [connectionHost].concat(Defaults.getFallbackHosts(client.options));
	}

	return Defaults.getHosts(client.options);
}

const Http: typeof IHttp = class {
	static methods = [HttpMethods.Get, HttpMethods.Delete, HttpMethods.Post, HttpMethods.Put, HttpMethods.Patch];
	static methodsWithoutBody = [HttpMethods.Get, HttpMethods.Delete];
	static methodsWithBody = [HttpMethods.Post, HttpMethods.Put, HttpMethods.Patch];
	checksInProgress: Array<StandardCallback<boolean>> | null = null;

	constructor() {
		if(Platform.xhrSupported) {
			this.supportsAuthHeaders = true;
			this.Request = function(method: HttpMethods, rest: Rest | null, uri: string, headers: Record<string, string> | null, params: RequestParams, body: unknown, callback: RequestCallback) {
				const req = XHRRequest.createRequest(uri, headers, params, body, XHRStates.REQ_SEND, rest && rest.options.timeouts, method);
				req.once('complete', callback);
				req.exec();
				return req;
			};

			this.checkConnectivity = function(callback: (err: ErrorInfo | null, connectivity: boolean) => void) {
				const upUrl = Defaults.internetUpUrl;
				Logger.logAction(Logger.LOG_MICRO, '(XHRRequest)Http.checkConnectivity()', 'Sending; ' + upUrl);
				this.getUri(null as any, upUrl, null, null, function(err?: ErrorInfo | ErrnoException | null, responseText?: unknown) {
					const result = (!err && (responseText as string)?.replace(/\n/, '') == 'yes');
					Logger.logAction(Logger.LOG_MICRO, '(XHRRequest)Http.checkConnectivity()', 'Result: ' + result);
					callback(null, result);
				});
			};
		} else if (Platform.jsonpSupported) {
			this.Request = function(method: HttpMethods, rest: Rest | null, uri: string, headers: Record<string, string> | null, params: RequestParams, body: unknown, callback: RequestCallback) {
				const req = createRequest(uri, headers, params, body, XHRStates.REQ_SEND, rest && rest.options.timeouts, method);
				req.once('complete', callback);
				Utils.nextTick(function() {
					req.exec();
				});
				return req;
			};
	
			this.checkConnectivity = function(callback: (err: ErrorInfo | null, connectivity?: boolean) => void) {
				const upUrl = Defaults.jsonpInternetUpUrl;
	
				if(this.checksInProgress) {
					this.checksInProgress.push(callback);
					return;
				}
				this.checksInProgress = [callback];
				Logger.logAction(Logger.LOG_MICRO, '(JSONP)Http.checkConnectivity()', 'Sending; ' + upUrl);
	
				const req = new Request('isTheInternetUp', upUrl as string, null, null, null, XHRStates.REQ_SEND, Defaults.TIMEOUTS);
				req.once('complete', (err: Error, response: string) => {
					const result = !err && response;
					Logger.logAction(Logger.LOG_MICRO, '(JSONP)Http.checkConnectivity()', 'Result: ' + result);
					for(let i = 0; i < (this.checksInProgress as Array<StandardCallback<boolean>>).length; i++) (this.checksInProgress as Array<StandardCallback<boolean>>)[i](null, result);
					this.checksInProgress = null;
				});
				Utils.nextTick(function() {
					req.exec();
				});
			};
		}
	}

	/* Unlike for doUri, the 'rest' param here is mandatory, as it's used to generate the hosts */
	do(method: HttpMethods, rest: Rest, path: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback?: RequestCallback): void {
		const uriFromHost = (typeof(path) == 'function') ? path : function(host: string) { return rest.baseUri(host) + path; };

		const currentFallback = rest._currentFallback;
		if(currentFallback) {
			if(currentFallback.validUntil > Utils.now()) {
				/* Use stored fallback */
				if (!this.Request) {
					callback?.(new ErrorInfo('Request invoked before assigned to', null, 500));
					return;
				}
				this.Request(method, rest, uriFromHost(currentFallback.host), headers, params, body, (err?: ErrnoException | ErrorInfo | null, ...args: unknown[]) => {
					// This typecast is safe because ErrnoExceptions are only thrown in NodeJS
					if(err && shouldFallback(err as ErrorInfo)) {
						/* unstore the fallback and start from the top with the default sequence */
						rest._currentFallback = null;
						this.do(method, rest, path, headers, body, params, callback);
						return;
					}
					callback?.(err, ...args);
				});
				return;
			} else {
				/* Fallback expired; remove it and fallthrough to normal sequence */
				rest._currentFallback = null;
			}
		}

		const hosts = getHosts(rest);

		/* if there is only one host do it */
		if(hosts.length === 1) {
			this.doUri(method, rest, uriFromHost(hosts[0]), headers, body, params, callback as RequestCallback);
			return;
		}

		/* hosts is an array with preferred host plus at least one fallback */
		const tryAHost = (candidateHosts: Array<string>, persistOnSuccess?: boolean) => {
			const host = candidateHosts.shift();
			this.doUri(method, rest, uriFromHost(host as string), headers, body, params, function(err?: ErrnoException | ErrorInfo | null, ...args: unknown[]) {
				// This typecast is safe because ErrnoExceptions are only thrown in NodeJS
				if(err && shouldFallback(err as ErrorInfo) && candidateHosts.length) {
					tryAHost(candidateHosts, true);
					return;
				}
				if(persistOnSuccess) {
					/* RSC15f */
					rest._currentFallback = {
						host: host as string,
						validUntil: Utils.now() + rest.options.timeouts.fallbackRetryTimeout
					};
				}
				callback?.(err, ...args);
			});
		};
		tryAHost(hosts);
	}

	doUri(method: HttpMethods, rest: Rest | null, uri: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void {
		if (!this.Request) {
			callback(new ErrorInfo('Request invoked before assigned to', null, 500));
			return;
		}
		this.Request(method, rest, uri, headers, params, body, callback);
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

	get(rest: Rest, path: string, headers: Record<string, string> | null, params: RequestParams, callback: RequestCallback): void {
		this.do(HttpMethods.Get, rest, path, headers, null, params, callback);
	}

	getUri(rest: Rest, uri: string, headers: Record<string, string> | null, params: RequestParams, callback: RequestCallback): void {
		this.doUri(HttpMethods.Get, rest, uri, headers, null, params, callback);
	}

	delete(rest: Rest, path: string, headers: Record<string, string> | null, params: RequestParams, callback: RequestCallback): void {
		this.do(HttpMethods.Delete, rest, path, headers, null, params, callback);
	}

	deleteUri(rest: Rest, uri: string, headers: Record<string, string> | null, params: RequestParams, callback: RequestCallback): void {
		this.doUri(HttpMethods.Delete, rest, uri, headers, null, params, callback);
	}

	post(rest: Rest, path: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void {
		this.do(HttpMethods.Post, rest, path, headers, body, params, callback);
	}

	postUri(rest: Rest, uri: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void {
		this.doUri(HttpMethods.Post, rest, uri, headers, body, params, callback);
	}

	put(rest: Rest, path: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void {
		this.do(HttpMethods.Put, rest, path, headers, body, params, callback);
	}

	putUri(rest: Rest, uri: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void {
		this.doUri(HttpMethods.Put, rest, uri, headers, body, params, callback);
	}

	patch(rest: Rest, path: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void {
		this.do(HttpMethods.Patch, rest, path, headers, body, params, callback);
	}

	patchUri(rest: Rest, uri: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void {
		this.doUri(HttpMethods.Patch, rest, uri, headers, body, params, callback);
	}

	Request?: (method: HttpMethods, rest: Rest | null, uri: string, headers: Record<string, string> | null, params: RequestParams, body: unknown, callback: RequestCallback) => void;

	checkConnectivity?: (callback: (err: ErrorInfo | null, connectivity?: boolean) => void) => void = undefined;

	supportsAuthHeaders = false;
	supportsLinkHeaders = false;

	_getHosts = getHosts;
}

export default Http;
