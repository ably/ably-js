import HttpMethods from '../constants/HttpMethods';
import Rest from '../lib/client/rest';
import ErrorInfo from '../lib/types/errorinfo';
import http from 'http';
import https from 'https';

export type PathParameter = string | ((host: string) => string);
export type RequestCallback = (error?: ErrnoException | ErrorInfo | null, body?: unknown, headers?: IncomingHttpHeaders, packed?: boolean, statusCode?: number) => void;
export type RequestParams = Record<string, string> | null;

export declare class IHttp {
	static methods: Array<HttpMethods>;
	static methodsWithBody: Array<HttpMethods>;
	static methodsWithoutBody: Array<HttpMethods>;
	supportsAuthHeaders: boolean;
	supportsLinkHeaders: boolean;
	agent?: { http: http.Agent, https: https.Agent } | null;
	Request?: (method: HttpMethods, rest: Rest | null, uri: string, headers: Record<string, string> | null, params: RequestParams, body: unknown, callback: RequestCallback) => void;
	_getHosts: (client: Rest | Realtime) => string[];
	do(method: HttpMethods, rest: Rest | null, path: PathParameter, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback?: RequestCallback): void;
	doUri(method: HttpMethods, rest: Rest | null, uri: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback?: RequestCallback): void;
	get(rest: Rest | null, path: PathParameter, headers: Record<string, string> | null, params: RequestParams, callback: RequestCallback): void;
	getUri(rest: Rest | null, uri: string, headers: Record<string, string> | null, params: RequestParams, callback: RequestCallback): void;
	delete(rest: Rest | null, path: PathParameter, headers: Record<string, string> | null, params: RequestParams, callback: RequestCallback): void;
	deleteUri(rest: Rest | null, uri: string, headers: Record<string, string> | null, params: RequestParams, callback: RequestCallback): void;
	post(rest: Rest | null, path: PathParameter, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void;
	postUri(rest: Rest | null, uri: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void;
	put(rest: Rest | null, path: PathParameter, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void;
	putUri(rest: Rest | null, uri: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void;
	patch(rest: Rest | null, path: PathParameter, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void;
	patchUri(rest: Rest | null, uri: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void;
	checkConnectivity?: (callback: (err?: ErrorInfo | null, connected?: boolean) => void) => void;
}

export interface ErrnoException extends Error {
	errno?: number;
	code?: string;
	path?: string;
	syscall?: string;
	stack?: string;
	statusCode: number;
}
