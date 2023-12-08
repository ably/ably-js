import * as Utils from '../util/utils';
import Logger from '../util/logger';
import Resource from './resource';
import { IPartialErrorInfo } from '../types/errorinfo';
import { PaginatedResultCallback } from '../../types/utils';
import BaseClient from './baseclient';
import { RequestCallbackHeaders } from 'common/types/http';

export type BodyHandler = (body: unknown, headers: RequestCallbackHeaders, unpacked?: boolean) => Promise<any>;

function getRelParams(linkUrl: string) {
  const urlMatch = linkUrl.match(/^\.\/(\w+)\?(.*)$/);
  return urlMatch && urlMatch[2] && Utils.parseQueryString(urlMatch[2]);
}

function parseRelLinks(linkHeader: string | Array<string>) {
  if (typeof linkHeader == 'string') linkHeader = linkHeader.split(',');

  const relParams: Record<string, Record<string, string>> = {};
  for (let i = 0; i < linkHeader.length; i++) {
    const linkMatch = linkHeader[i].match(/^\s*<(.+)>;\s*rel="(\w+)"$/);
    if (linkMatch) {
      const params = getRelParams(linkMatch[1]);
      if (params) relParams[linkMatch[2]] = params;
    }
  }
  return relParams;
}

function returnErrOnly(err: IPartialErrorInfo, body: unknown, useHPR?: boolean) {
  /* If using httpPaginatedResponse, errors from Ably are returned as part of
   * the HPR, only do callback(err) for network errors etc. which don't
   * return a body and/or have no ably-originated error code (non-numeric
   * error codes originate from node) */
  return !(useHPR && (body || typeof err.code === 'number'));
}

class PaginatedResource {
  client: BaseClient;
  path: string;
  headers: Record<string, string>;
  envelope: Utils.Format | null;
  bodyHandler: BodyHandler;
  useHttpPaginatedResponse: boolean;

  constructor(
    client: BaseClient,
    path: string,
    headers: Record<string, string>,
    envelope: Utils.Format | undefined,
    bodyHandler: BodyHandler,
    useHttpPaginatedResponse?: boolean
  ) {
    this.client = client;
    this.path = path;
    this.headers = headers;
    this.envelope = envelope ?? null;
    this.bodyHandler = bodyHandler;
    this.useHttpPaginatedResponse = useHttpPaginatedResponse || false;
  }

  async get<T1, T2>(params: Record<string, T2>): Promise<PaginatedResult<T1>> {
    return new Promise((resolve, reject) => {
      Resource.get(
        this.client,
        this.path,
        this.headers,
        params,
        this.envelope,
        (err, body, headers, unpacked, statusCode) => {
          // TODO sort out types of err and any, throughout these similar methods
          Utils.whenPromiseSettles(this.handlePage(err, body, headers, unpacked, statusCode), (err: any, result: any) =>
            err ? reject(err) : resolve(result)
          );
        }
      );
    });
  }

  async delete<T1, T2>(params: Record<string, T2>): Promise<PaginatedResult<T1>> {
    return new Promise((resolve, reject) => {
      Resource.delete(
        this.client,
        this.path,
        this.headers,
        params,
        this.envelope,
        (err, body, headers, unpacked, statusCode) => {
          Utils.whenPromiseSettles(this.handlePage(err, body, headers, unpacked, statusCode), (err: any, result: any) =>
            err ? reject(err) : resolve(result)
          );
        }
      );
    });
  }

  async post<T1, T2>(params: Record<string, T2>, body: unknown): Promise<PaginatedResult<T1>> {
    return new Promise((resolve, reject) => {
      Resource.post(
        this.client,
        this.path,
        body,
        this.headers,
        params,
        this.envelope,
        (err, responseBody, headers, unpacked, statusCode) => {
          Utils.whenPromiseSettles(this.handlePage(err, body, headers, unpacked, statusCode), (err: any, result: any) =>
            err ? reject(err) : resolve(result)
          );
        }
      );
    });
  }

  async put<T1, T2>(params: Record<string, T2>, body: unknown): Promise<PaginatedResult<T1>> {
    return new Promise((resolve, reject) => {
      Resource.put(
        this.client,
        this.path,
        body,
        this.headers,
        params,
        this.envelope,
        (err, responseBody, headers, unpacked, statusCode) => {
          Utils.whenPromiseSettles(this.handlePage(err, body, headers, unpacked, statusCode), (err: any, result: any) =>
            err ? reject(err) : resolve(result)
          );
        }
      );
    });
  }

  async patch<T1, T2>(params: Record<string, T2>, body: unknown): Promise<PaginatedResult<T1>> {
    return new Promise((resolve, reject) => {
      Resource.patch(
        this.client,
        this.path,
        body,
        this.headers,
        params,
        this.envelope,
        (err, responseBody, headers, unpacked, statusCode) => {
          Utils.whenPromiseSettles(this.handlePage(err, body, headers, unpacked, statusCode), (err: any, result: any) =>
            err ? reject(err) : resolve(result)
          );
        }
      );
    });
  }

  async handlePage<T>(
    err: IPartialErrorInfo | null,
    body: unknown,
    headers: RequestCallbackHeaders | undefined,
    unpacked: boolean | undefined,
    statusCode: number | undefined
  ): Promise<PaginatedResult<T>> {
    if (err && returnErrOnly(err, body, this.useHttpPaginatedResponse)) {
      Logger.logAction(
        Logger.LOG_ERROR,
        'PaginatedResource.handlePage()',
        'Unexpected error getting resource: err = ' + Utils.inspectError(err)
      );
      throw err;
    }

    let items, linkHeader, relParams;

    try {
      items = await this.bodyHandler(body, headers || {}, unpacked);
    } catch (e) {
      /* If we got an error, the failure to parse the body is almost certainly
       * due to that, so throw that in preference over the parse error */
      throw err || e;
    }

    if (headers && (linkHeader = headers['Link'] || headers['link'])) {
      relParams = parseRelLinks(linkHeader);
    }

    if (this.useHttpPaginatedResponse) {
      return new HttpPaginatedResponse(this, items, headers || {}, statusCode as number, relParams, err);
    } else {
      return new PaginatedResult(this, items, relParams);
    }
  }
}

interface PaginatedResultLoadFunction<T> {
  (results: PaginatedResultCallback<T>): void;
  (): Promise<PaginatedResult<T>>;
}

export class PaginatedResult<T> {
  resource: PaginatedResource;
  items: T[];
  first?: () => Promise<PaginatedResult<T>>;
  next?: () => Promise<PaginatedResult<T>>;
  current?: () => Promise<PaginatedResult<T>>;
  hasNext?: () => boolean;
  isLast?: () => boolean;

  constructor(resource: PaginatedResource, items: T[], relParams?: Record<string, any>) {
    this.resource = resource;
    this.items = items;

    const self = this;
    if (relParams) {
      if ('first' in relParams) {
        this.first = async function () {
          return self.get(relParams.first);
        };
      }
      if ('current' in relParams) {
        this.current = async function () {
          return self.get(relParams.current);
        };
      }
      this.next = async function () {
        if ('next' in relParams) {
          return self.get(relParams.next);
        } else {
          // TODO what is this? this looks a bit odd
          //callback(null);
          throw new Error('there is no next page');
        }
      };

      this.hasNext = function () {
        return 'next' in relParams;
      };
      this.isLast = () => {
        return !this.hasNext?.();
      };
    }
  }

  /* We assume that only the initial request can be a POST, and that accessing
   * the rest of a multipage set of results can always be done with GET */
  async get(params: any): Promise<PaginatedResult<T>> {
    const res = this.resource;
    return new Promise((resolve, reject) => {
      Resource.get(
        res.client,
        res.path,
        res.headers,
        params,
        res.envelope,
        function (err, body, headers, unpacked, statusCode) {
          // TODO sort out type of err and result
          Utils.whenPromiseSettles(res.handlePage(err, body, headers, unpacked, statusCode), (err: any, result: any) =>
            err ? reject(err) : resolve(result)
          );
        }
      );
    });
  }
}

export class HttpPaginatedResponse<T> extends PaginatedResult<T> {
  statusCode: number;
  success: boolean;
  headers: RequestCallbackHeaders;
  errorCode?: number | null;
  errorMessage?: string | null;

  constructor(
    resource: PaginatedResource,
    items: T[],
    headers: RequestCallbackHeaders,
    statusCode: number,
    relParams: any,
    err: IPartialErrorInfo | null
  ) {
    super(resource, items, relParams);
    this.statusCode = statusCode;
    this.success = statusCode < 300 && statusCode >= 200;
    this.headers = headers;
    this.errorCode = err && err.code;
    this.errorMessage = err && err.message;
  }

  toJSON() {
    return {
      items: this.items,
      statusCode: this.statusCode,
      success: this.success,
      headers: this.headers,
      errorCode: this.errorCode,
      errorMessage: this.errorMessage,
    };
  }
}

export default PaginatedResource;
