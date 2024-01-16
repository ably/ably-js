import Platform from 'common/platform';
import HttpMethods from '../constants/HttpMethods';
import BaseClient from '../lib/client/baseclient';
import ErrorInfo, { IPartialErrorInfo } from '../lib/types/errorinfo';

export type PathParameter = string | ((host: string) => string);
export type RequestCallbackHeaders = Partial<Record<string, string | string[]>>;
export type RequestCallback = (
  error?: ErrnoException | IPartialErrorInfo | null,
  body?: unknown,
  headers?: RequestCallbackHeaders,
  unpacked?: boolean,
  statusCode?: number
) => void;
export type RequestParams = Record<string, string> | null;

export interface IHttpStatic {
  new (client?: BaseClient): IHttp;
  methods: Array<HttpMethods>;
  methodsWithBody: Array<HttpMethods>;
  methodsWithoutBody: Array<HttpMethods>;
}

export interface IHttp {
  supportsAuthHeaders: boolean;
  supportsLinkHeaders: boolean;

  _getHosts: (client: BaseClient) => string[];
  do(
    method: HttpMethods,
    path: PathParameter,
    headers: Record<string, string> | null,
    body: unknown,
    params: RequestParams,
    callback?: RequestCallback
  ): void;
  doUri(
    method: HttpMethods,
    uri: string,
    headers: Record<string, string> | null,
    body: unknown,
    params: RequestParams,
    callback?: RequestCallback
  ): void;
  checkConnectivity?: (callback: (err?: ErrorInfo | null, connected?: boolean) => void) => void;
}

// TODO name, explain
export class Http implements IHttp {
  private readonly http: IHttp;
  checkConnectivity?: (callback: (err?: ErrorInfo | null, connected?: boolean) => void) => void;

  constructor(private readonly client?: BaseClient) {
    this.http = new Platform.Http(client);

    this.checkConnectivity = this.http.checkConnectivity
      ? (callback: (err?: ErrorInfo | null, connected?: boolean) => void) => this.http.checkConnectivity!(callback)
      : undefined;
  }

  get supportsAuthHeaders() {
    return this.http.supportsAuthHeaders;
  }

  get supportsLinkHeaders() {
    return this.http.supportsLinkHeaders;
  }

  _getHosts(client: BaseClient) {
    return this.http._getHosts(client);
  }

  do(
    method: HttpMethods,
    path: PathParameter,
    headers: Record<string, string> | null,
    body: unknown,
    params: RequestParams,
    callback?: RequestCallback | undefined
  ): void {
    this.http.do(method, path, headers, body, params, callback);
  }

  doUri(
    method: HttpMethods,
    uri: string,
    headers: Record<string, string> | null,
    body: unknown,
    params: RequestParams,
    callback?: RequestCallback | undefined
  ): void {
    this.http.doUri(method, uri, headers, body, params, callback);
  }
}

export interface ErrnoException extends Error {
  errno?: number;
  code?: string;
  path?: string;
  syscall?: string;
  stack?: string;
  statusCode: number;
}
