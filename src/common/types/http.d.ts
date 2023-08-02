import HttpMethods from '../constants/HttpMethods';
import Rest from '../lib/client/rest';
import ErrorInfo from '../lib/types/errorinfo';
import { Agents } from 'got';

export type PathParameter = string | ((host: string) => string);
export type RequestCallback = (
  error?: ErrnoException | IPartialErrorInfo | null,
  body?: unknown,
  headers?: IncomingHttpHeaders,
  unpacked?: boolean,
  statusCode?: number
) => void;
export type RequestParams = Record<string, string> | null;

export declare class IHttp {
  constructor(options: NormalisedClientOptions);
  static methods: Array<HttpMethods>;
  static methodsWithBody: Array<HttpMethods>;
  static methodsWithoutBody: Array<HttpMethods>;
  supportsAuthHeaders: boolean;
  supportsLinkHeaders: boolean;
  agent?: Agents | null;
  options: NormalisedClientOptions;

  Request?: (
    method: HttpMethods,
    rest: Rest | null,
    uri: string,
    headers: Record<string, string> | null,
    params: RequestParams,
    body: unknown,
    callback: RequestCallback
  ) => void;
  _getHosts: (client: Rest | Realtime) => string[];
  do(
    method: HttpMethods,
    rest: Rest | null,
    path: PathParameter,
    headers: Record<string, string> | null,
    body: unknown,
    params: RequestParams,
    callback?: RequestCallback
  ): void;
  doUri(
    method: HttpMethods,
    rest: Rest | null,
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
