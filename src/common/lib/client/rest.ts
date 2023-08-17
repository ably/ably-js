import * as Utils from '../util/utils';
import Logger, { LoggerOptions } from '../util/logger';
import Defaults from '../util/defaults';
import Push from './push';
import PaginatedResource, { HttpPaginatedResponse, PaginatedResult } from './paginatedresource';
import Channel from './channel';
import ErrorInfo from '../types/errorinfo';
import Stats from '../types/stats';
import HttpMethods from '../../constants/HttpMethods';
import { ChannelOptions } from '../../types/channel';
import { PaginatedResultCallback, StandardCallback } from '../../types/utils';
import { ErrnoException, RequestParams } from '../../types/http';

import Platform from '../../platform';
import BaseClient from './baseclient';

const noop = function () {};
export class Rest {
  private readonly client: BaseClient;
  readonly channels: Channels;
  readonly push: Push;

  constructor(client: BaseClient) {
    this.client = client;
    this.channels = new Channels(this.client);
    this.push = new Push(this.client);
  }

  stats(
    params: RequestParams,
    callback: StandardCallback<PaginatedResult<Stats>>
  ): Promise<PaginatedResult<Stats>> | void {
    /* params and callback are optional; see if params contains the callback */
    if (callback === undefined) {
      if (typeof params == 'function') {
        callback = params;
        params = null;
      } else {
        return Utils.promisify(this, 'stats', [params]) as Promise<PaginatedResult<Stats>>;
      }
    }
    const headers = Defaults.defaultGetHeaders(this.client.options),
      format = this.client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = this.client.http.supportsLinkHeaders ? undefined : format;

    Utils.mixin(headers, this.client.options.headers);

    new PaginatedResource(this.client, '/stats', headers, envelope, function (
      body: unknown,
      headers: Record<string, string>,
      unpacked?: boolean
    ) {
      const statsValues = unpacked ? body : JSON.parse(body as string);
      for (let i = 0; i < statsValues.length; i++) statsValues[i] = Stats.fromValues(statsValues[i]);
      return statsValues;
    }).get(params as Record<string, string>, callback);
  }

  time(params?: RequestParams | StandardCallback<number>, callback?: StandardCallback<number>): Promise<number> | void {
    /* params and callback are optional; see if params contains the callback */
    if (callback === undefined) {
      if (typeof params == 'function') {
        callback = params;
        params = null;
      } else {
        return Utils.promisify(this, 'time', [params]) as Promise<number>;
      }
    }

    const _callback = callback || noop;

    const headers = Defaults.defaultGetHeaders(this.client.options);
    if (this.client.options.headers) Utils.mixin(headers, this.client.options.headers);
    const timeUri = (host: string) => {
      return this.client.baseUri(host) + '/time';
    };
    this.client.http.do(
      HttpMethods.Get,
      this.client,
      timeUri,
      headers,
      null,
      params as RequestParams,
      (
        err?: ErrorInfo | ErrnoException | null,
        res?: unknown,
        headers?: Record<string, string>,
        unpacked?: boolean
      ) => {
        if (err) {
          _callback(err);
          return;
        }
        if (!unpacked) res = JSON.parse(res as string);
        const time = (res as number[])[0];
        if (!time) {
          _callback(new ErrorInfo('Internal error (unexpected result type from GET /time)', 50000, 500));
          return;
        }
        /* calculate time offset only once for this device by adding to the prototype */
        this.client.serverTimeOffset = time - Utils.now();
        _callback(null, time);
      }
    );
  }

  request(
    method: string,
    path: string,
    version: number,
    params: RequestParams,
    body: unknown,
    customHeaders: Record<string, string>,
    callback: StandardCallback<HttpPaginatedResponse<unknown>>
  ): Promise<HttpPaginatedResponse<unknown>> | void {
    const useBinary = this.client.options.useBinaryProtocol,
      encoder = useBinary ? this.client._MsgPack.encode : JSON.stringify,
      decoder = useBinary ? this.client._MsgPack.decode : JSON.parse,
      format = useBinary ? Utils.Format.msgpack : Utils.Format.json,
      envelope = this.client.http.supportsLinkHeaders ? undefined : format;
    params = params || {};
    const _method = method.toLowerCase() as HttpMethods;
    const headers =
      _method == 'get'
        ? Defaults.defaultGetHeaders(this.client.options, { format, protocolVersion: version })
        : Defaults.defaultPostHeaders(this.client.options, { format, protocolVersion: version });

    if (callback === undefined) {
      return Utils.promisify(this, 'request', [method, path, version, params, body, customHeaders]) as Promise<
        HttpPaginatedResponse<unknown>
      >;
    }

    if (typeof body !== 'string') {
      body = encoder(body);
    }
    Utils.mixin(headers, this.client.options.headers);
    if (customHeaders) {
      Utils.mixin(headers, customHeaders);
    }
    const paginatedResource = new PaginatedResource(
      this.client,
      path,
      headers,
      envelope,
      async function (resbody: unknown, headers: Record<string, string>, unpacked?: boolean) {
        return Utils.ensureArray(unpacked ? resbody : decoder(resbody as string & Buffer));
      },
      /* useHttpPaginatedResponse: */ true
    );

    if (!Utils.arrIn(Platform.Http.methods, _method)) {
      throw new ErrorInfo('Unsupported method ' + _method, 40500, 405);
    }

    if (Utils.arrIn(Platform.Http.methodsWithBody, _method)) {
      paginatedResource[_method as HttpMethods.Post](params, body, callback as PaginatedResultCallback<unknown>);
    } else {
      paginatedResource[_method as HttpMethods.Get | HttpMethods.Delete](
        params,
        callback as PaginatedResultCallback<unknown>
      );
    }
  }

  setLog(logOptions: LoggerOptions): void {
    Logger.setLog(logOptions.level, logOptions.handler);
  }
}

class Channels {
  client: BaseClient;
  all: Record<string, Channel>;

  constructor(client: BaseClient) {
    this.client = client;
    this.all = Object.create(null);
  }

  get(name: string, channelOptions?: ChannelOptions) {
    name = String(name);
    let channel = this.all[name];
    if (!channel) {
      this.all[name] = channel = new Channel(this.client, name, channelOptions);
    } else if (channelOptions) {
      channel.setOptions(channelOptions);
    }

    return channel;
  }

  /* Included to support certain niche use-cases; most users should ignore this.
   * Please do not use this unless you know what you're doing */
  release(name: string) {
    delete this.all[String(name)];
  }
}
