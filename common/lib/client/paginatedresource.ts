import * as Utils from '../util/utils';
import Logger from '../util/logger';
import Resource from './resource';
import ErrorInfo from '../types/errorinfo';
import { PaginatedResultCallback } from '../../types/utils';
import Rest from './rest';

export type BodyHandler = (body: unknown, headers: Record<string, string>, packed?: boolean) => any;

function getRelParams(linkUrl: string) {
	const urlMatch = linkUrl.match(/^\.\/(\w+)\?(.*)$/);
	return urlMatch && urlMatch[2] && Utils.parseQueryString(urlMatch[2]);
}

function parseRelLinks(linkHeader: string | Array<string>) {
	if(typeof(linkHeader) == 'string')
		linkHeader = linkHeader.split(',');

	const relParams: Record<string, Record<string, string>> = {};
	for(let i = 0; i < linkHeader.length; i++) {
		const linkMatch = linkHeader[i].match(/^\s*<(.+)>;\s*rel="(\w+)"$/);
		if(linkMatch) {
			const params = getRelParams(linkMatch[1]);
			if(params)
				relParams[linkMatch[2]] = params;
		}
	}
	return relParams;
}

function returnErrOnly(err: ErrorInfo, body: unknown, useHPR?: boolean) {
	/* If using httpPaginatedResponse, errors from Ably are returned as part of
		* the HPR, only do callback(err) for network errors etc. which don't
		* return a body and/or have no ably-originated error code (non-numeric
		* error codes originate from node) */
	return !(useHPR && (body || typeof err.code === 'number'));
}

class PaginatedResource {
	rest: Rest;
	path: string;
	headers: Record<string, string>;
	envelope: Utils.Format | null;
	bodyHandler: BodyHandler;
	useHttpPaginatedResponse: boolean;

	constructor(rest: Rest, path: string, headers: Record<string, string>, envelope: Utils.Format | undefined, bodyHandler: BodyHandler, useHttpPaginatedResponse?: boolean) {
		this.rest = rest;
		this.path = path;
		this.headers = headers;
		this.envelope = envelope ?? null;
		this.bodyHandler = bodyHandler;
		this.useHttpPaginatedResponse = useHttpPaginatedResponse || false;
	}

	get<T1, T2>(params: Record<string, T2>, callback: PaginatedResultCallback<T1>): void {
		Resource.get(this.rest, this.path, this.headers, params, this.envelope, (err: ErrorInfo, body: unknown, headers: Record<string, string>, unpacked: boolean, statusCode: number) => {
			this.handlePage(err, body, headers, unpacked, statusCode, callback);
		});
	}

	delete<T1, T2>(params: Record<string, T2>, callback: PaginatedResultCallback<T1>): void {
		Resource.delete(this.rest, this.path, this.headers, params, this.envelope, (err: ErrorInfo, body: unknown, headers: Record<string, string>, unpacked: boolean, statusCode: number) => {
			this.handlePage(err, body, headers, unpacked, statusCode, callback);
		});
	}

	post<T1, T2>(params: Record<string, T2>, body: unknown, callback: PaginatedResultCallback<T1>): void {
		Resource.post(this.rest, this.path, body, this.headers, params, this.envelope, (err: ErrorInfo, resbody: unknown, headers: Record<string, string>, unpacked: boolean, statusCode: number) => {
			if(callback) {
				this.handlePage(err, resbody, headers, unpacked, statusCode, callback);
			}
		});
	}

	put<T1, T2>(params: Record<string, T2>, body: unknown, callback: PaginatedResultCallback<T1>): void {
		Resource.put(this.rest, this.path, body, this.headers, params, this.envelope, (err: ErrorInfo, resbody: unknown, headers: Record<string, string>, unpacked: boolean, statusCode: number) => {
			if(callback) {
				this.handlePage(err, resbody, headers, unpacked, statusCode, callback);
			}
		});
	}

	patch<T1, T2>(params: Record<string, T2>, body: unknown, callback: PaginatedResultCallback<T1>): void {
		Resource.patch(this.rest, this.path, body, this.headers, params, this.envelope, (err: ErrorInfo, resbody: unknown, headers: Record<string, string>, unpacked: boolean, statusCode: number) => {
			if(callback) {
				this.handlePage(err, resbody, headers, unpacked, statusCode, callback);
			}
		});
	}

	handlePage<T>(err: ErrorInfo, body: unknown, headers: Record<string, string>, unpacked: boolean, statusCode: number, callback: PaginatedResultCallback<T>): void {
		if(err && returnErrOnly(err, body, this.useHttpPaginatedResponse)) {
			Logger.logAction(Logger.LOG_ERROR, 'PaginatedResource.handlePage()', 'Unexpected error getting resource: err = ' + Utils.inspectError(err));
			callback(err);
			return;
		}
		let items, linkHeader, relParams;
		try {
			items = this.bodyHandler(body, headers, unpacked);
		} catch(e) {
			/* If we got an error, the failure to parse the body is almost certainly
			 * due to that, so callback with that in preference over the parse error */
			callback(err || e);
			return;
		}

		if(headers && (linkHeader = (headers['Link'] || headers['link']))) {
			relParams = parseRelLinks(linkHeader);
		}

		if(this.useHttpPaginatedResponse) {
			callback(null, new HttpPaginatedResponse(this, items, headers, statusCode, relParams, err));
		} else {
			callback(null, new PaginatedResult(this, items, relParams));
		}
	}
}

export class PaginatedResult <T> {
	resource: PaginatedResource;
	items: T[];
	first?: (results: PaginatedResultCallback<T>) => void;
	next?: (results: PaginatedResultCallback<T>) => void;
	current?: (results: PaginatedResultCallback<T>) => void;
	hasNext?: () => boolean;
	isLast?: () => boolean;

	constructor(resource: PaginatedResource, items: T[], relParams?: Record<string, any>) {
		this.resource = resource;
		this.items = items;

		if(relParams) {
			if('first' in relParams) {
				this.first = (callback: (result?: ErrorInfo | null) => void) => {
					if(!callback && this.resource.rest.options.promises) {
						return Utils.promisify(this, 'first', []);
					}
					this.get(relParams.first, callback);
				};
			}
			if('current' in relParams) {
				this.current = (callback: (results?: ErrorInfo | null) => void) => {
					if(!callback && this.resource.rest.options.promises) {
						return Utils.promisify(this, 'current', []);
					}
					this.get(relParams.current, callback);
				};
			}
			this.next = (callback: (results?: ErrorInfo | null) => void) => {
				if(!callback && this.resource.rest.options.promises) {
					return Utils.promisify(this, 'next', []);
				}
				if('next' in relParams) {
					this.get(relParams.next, callback);
				} else {
					callback(null);
				}
			};

			this.hasNext = function() { return ('next' in relParams) };
			this.isLast = () => { return !this.hasNext?.(); }
		}
	}

	/* We assume that only the initial request can be a POST, and that accessing
	 * the rest of a multipage set of results can always be done with GET */
	get(params: any, callback: PaginatedResultCallback<T>): void {
		const res = this.resource;
		Resource.get(res.rest, res.path, res.headers, params, res.envelope, function(err: ErrorInfo, body: any, headers: Record<string, string>, unpacked: boolean, statusCode: number) {
			res.handlePage(err, body, headers, unpacked, statusCode, callback);
		});
	}
}

export class HttpPaginatedResponse<T> extends PaginatedResult<T> {
	statusCode: number;
	success: boolean;
	headers: Record<string, string>;
	errorCode?: number | null;
	errorMessage?: string;

	constructor(resource: PaginatedResource, items: T[], headers: Record<string, string>, statusCode: number, relParams: any, err: ErrorInfo) {
		super(resource, items, relParams);
		this.statusCode = statusCode;
		this.success = statusCode < 300 && statusCode >= 200;
		this.headers = headers;
		this.errorCode = err && err.code;
		this.errorMessage = err && err.message;
	}
}

export default PaginatedResource;
