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

export interface IPlatformHttpStatic {
  new (client?: BaseClient): IPlatformHttp;
  methods: Array<HttpMethods>;
  methodsWithBody: Array<HttpMethods>;
  methodsWithoutBody: Array<HttpMethods>;
}

export interface IPlatformHttp {
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

export class Http {
  private readonly platformHttp: IPlatformHttp;
  checkConnectivity?: (callback: (err?: ErrorInfo | null, connected?: boolean) => void) => void;

  constructor(private readonly client?: BaseClient) {
    this.platformHttp = new Platform.Http(client);

    this.checkConnectivity = this.platformHttp.checkConnectivity
      ? (callback: (err?: ErrorInfo | null, connected?: boolean) => void) =>
          this.platformHttp.checkConnectivity!(callback)
      : undefined;
  }

  get supportsAuthHeaders() {
    return this.platformHttp.supportsAuthHeaders;
  }

  get supportsLinkHeaders() {
    return this.platformHttp.supportsLinkHeaders;
  }

  _getHosts(client: BaseClient) {
    return this.platformHttp._getHosts(client);
  }

  do(
    method: HttpMethods,
    path: PathParameter,
    headers: Record<string, string> | null,
    body: unknown,
    params: RequestParams,
    callback?: RequestCallback | undefined
  ): void {
    this.platformHttp.do(method, path, headers, body, params, callback);
  }

  doUri(
    method: HttpMethods,
    uri: string,
    headers: Record<string, string> | null,
    body: unknown,
    params: RequestParams,
    callback?: RequestCallback | undefined
  ): void {
    this.platformHttp.doUri(method, uri, headers, body, params, callback);
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
