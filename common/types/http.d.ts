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
	static do(method: HttpMethods, rest: Rest | null, path: PathParameter, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback?: RequestCallback): void;
	static doUri(method: HttpMethods, rest: Rest | null, uri: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback?: RequestCallback): void;
	static get(rest: Rest | null, path: PathParameter, headers: Record<string, string> | null, params: RequestParams, callback: RequestCallback): void;
	static getUri(rest: Rest | null, uri: string, headers: Record<string, string> | null, params: RequestParams, callback: RequestCallback): void;
	static delete(rest: Rest | null, path: PathParameter, headers: Record<string, string> | null, params: RequestParams, callback: RequestCallback): void;
	static deleteUri(rest: Rest | null, uri: string, headers: Record<string, string> | null, params: RequestParams, callback: RequestCallback): void;
	static post(rest: Rest | null, path: PathParameter, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void;
	static postUri(rest: Rest | null, uri: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void;
	static put(rest: Rest | null, path: PathParameter, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void;
	static putUri(rest: Rest | null, uri: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void;
	static patch(rest: Rest | null, path: PathParameter, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void;
	static patchUri(rest: Rest | null, uri: string, headers: Record<string, string> | null, body: unknown, params: RequestParams, callback: RequestCallback): void;
	static checkConnectivity?: (callback: (err?: ErrorInfo | null, connected?: boolean) => void) => void;
	static Request?: (method: HttpMethods, rest: Rest | null, uri: string, headers: Record<string, string> | null, params: RequestParams, body: unknown, callback: RequestCallback) => void;
	static _getHosts: (client: Rest | Realtime) => string[];
	static supportsAuthHeaders: boolean;
	static supportsLinkHeaders: boolean;
	static agent?: { http: http.Agent, https: https.Agent } | null;
}

export interface ErrnoException extends Error {
	errno?: number;
	code?: string;
	path?: string;
	syscall?: string;
	stack?: string;
	statusCode: number;
}
