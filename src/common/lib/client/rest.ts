import * as Utils from '../util/utils';
import Logger, { LoggerOptions } from '../util/logger';
import Defaults from '../util/defaults';
import Auth from './auth';
import Push from './push';
import PaginatedResource, { HttpPaginatedResponse, PaginatedResult } from './paginatedresource';
import Channel from './channel';
import ErrorInfo from '../types/errorinfo';
import Stats from '../types/stats';
import HttpMethods from '../../constants/HttpMethods';
import { ChannelOptions } from '../../types/channel';
import { PaginatedResultCallback, StandardCallback } from '../../types/utils';
import { ErrnoException, IHttp, RequestParams } from '../../types/http';
import ClientOptions, { DeprecatedClientOptions, NormalisedClientOptions } from '../../types/ClientOptions';

import Platform from '../../platform';

const noop = function () {};
class Rest {
  options: NormalisedClientOptions;
  baseUri: (host: string) => string;
  authority: (host: string) => string;
  _currentFallback: null | {
    host: string;
    validUntil: number;
  };
  serverTimeOffset: number | null;
  http: IHttp;
  auth: Auth;
  channels: Channels;
  push: Push;

  constructor(options: ClientOptions | string) {
    if (!options) {
      const msg = 'no options provided';
      Logger.logAction(Logger.LOG_ERROR, 'Rest()', msg);
      throw new Error(msg);
    }
    const optionsObj = Defaults.objectifyOptions(options);

    if (optionsObj.log) {
      Logger.setLog(optionsObj.log.level, optionsObj.log.handler);
    }
    Logger.logAction(Logger.LOG_MICRO, 'Rest()', 'initialized with clientOptions ' + Platform.Config.inspect(options));

    const normalOptions = (this.options = Defaults.normaliseOptions(optionsObj));

    /* process options */
    if (normalOptions.key) {
      const keyMatch = normalOptions.key.match(/^([^:\s]+):([^:.\s]+)$/);
      if (!keyMatch) {
        const msg = 'invalid key parameter';
        Logger.logAction(Logger.LOG_ERROR, 'Rest()', msg);
        throw new ErrorInfo(msg, 40400, 404);
      }
      normalOptions.keyName = keyMatch[1];
      normalOptions.keySecret = keyMatch[2];
    }

    if ('clientId' in normalOptions) {
      if (!(typeof normalOptions.clientId === 'string' || normalOptions.clientId === null))
        throw new ErrorInfo('clientId must be either a string or null', 40012, 400);
      else if (normalOptions.clientId === '*')
        throw new ErrorInfo(
          'Can’t use "*" as a clientId as that string is reserved. (To change the default token request behaviour to use a wildcard clientId, use {defaultTokenParams: {clientId: "*"}})',
          40012,
          400
        );
    }

    Logger.logAction(Logger.LOG_MINOR, 'Rest()', 'started; version = ' + Defaults.version);

    this.baseUri = this.authority = function (host) {
      return Defaults.getHttpScheme(normalOptions) + host + ':' + Defaults.getPort(normalOptions, false);
    };
    this._currentFallback = null;

    this.serverTimeOffset = null;
    this.http = new Platform.Http();
    this.auth = new Auth(this, normalOptions);
    this.channels = new Channels(this);
    this.push = new Push(this);
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
        if (this.options.promises) {
          return Utils.promisify(this, 'stats', arguments) as Promise<PaginatedResult<Stats>>;
        }
        callback = noop;
      }
    }
    const headers = Utils.defaultGetHeaders(),
      format = this.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = this.http.supportsLinkHeaders ? undefined : format;

    if (this.options.headers) Utils.mixin(headers, this.options.headers);

    new PaginatedResource(this, '/stats', headers, envelope, function (
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
        if (this.options.promises) {
          return Utils.promisify(this, 'time', arguments) as Promise<number>;
        }
      }
    }

    const _callback = callback || noop;

    const headers = Utils.defaultGetHeaders();
    if (this.options.headers) Utils.mixin(headers, this.options.headers);
    const timeUri = (host: string) => {
      return this.authority(host) + '/time';
    };
    this.http.do(
      HttpMethods.Get,
      this,
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
        this.serverTimeOffset = time - Utils.now();
        _callback(null, time);
      }
    );
  }

  request(
    method: string,
    path: string,
    params: RequestParams,
    body: unknown,
    customHeaders: Record<string, string>,
    callback: StandardCallback<HttpPaginatedResponse<unknown>>
  ): Promise<HttpPaginatedResponse<unknown>> | void {
    const useBinary = this.options.useBinaryProtocol,
      encoder = useBinary ? Platform.Config.msgpack.encode : JSON.stringify,
      decoder = useBinary ? Platform.Config.msgpack.decode : JSON.parse,
      format = useBinary ? Utils.Format.msgpack : Utils.Format.json,
      envelope = this.http.supportsLinkHeaders ? undefined : format;
    params = params || {};
    const _method = method.toLowerCase() as HttpMethods;
    const headers = _method == 'get' ? Utils.defaultGetHeaders(format) : Utils.defaultPostHeaders(format);

    if (callback === undefined) {
      if (this.options.promises) {
        return Utils.promisify(this, 'request', arguments) as Promise<HttpPaginatedResponse<unknown>>;
      }
      callback = noop;
    }

    if (typeof body !== 'string') {
      body = encoder(body);
    }
    if (this.options.headers) {
      Utils.mixin(headers, this.options.headers);
    }
    if (customHeaders) {
      Utils.mixin(headers, customHeaders);
    }
    const paginatedResource = new PaginatedResource(
      this,
      path,
      headers,
      envelope,
      function (resbody: unknown, headers: Record<string, string>, unpacked?: boolean) {
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

  static Promise = function (options: DeprecatedClientOptions): Rest {
    options = Defaults.objectifyOptions(options);
    options.promises = true;
    return new Rest(options);
  };

  static Callbacks = Rest;
  static Platform = Platform;
}

class Channels {
  rest: Rest;
  all: Record<string, Channel>;

  constructor(rest: Rest) {
    this.rest = rest;
    this.all = {};
  }

  get(name: string, channelOptions?: ChannelOptions) {
    name = String(name);
    let channel = this.all[name];
    if (!channel) {
      this.all[name] = channel = new Channel(this.rest, name, channelOptions);
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

export default Rest;
