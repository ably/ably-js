import HttpMethods from '../constants/HttpMethods';
import BaseClient from '../lib/client/baseclient';
import ErrorInfo, { IPartialErrorInfo } from '../lib/types/errorinfo';
import { Agents } from 'got';

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
  agent?: Agents | null;

  Request?: (
    method: HttpMethods,
    uri: string,
    headers: Record<string, string> | null,
    params: RequestParams,
    body: unknown,
    callback: RequestCallback
  ) => void;
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

export interface ErrnoException extends Error {
  errno?: number;
  code?: string;
  path?: string;
  syscall?: string;
  stack?: string;
  statusCode: number;
}