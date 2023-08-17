import Logger, { LoggerOptions } from '../util/logger';
import Defaults from '../util/defaults';
import Auth from './auth';
import { HttpPaginatedResponse, PaginatedResult } from './paginatedresource';
import ErrorInfo from '../types/errorinfo';
import Stats from '../types/stats';
import { StandardCallback } from '../../types/utils';
import { IHttp, RequestParams } from '../../types/http';
import ClientOptions, { NormalisedClientOptions } from '../../types/ClientOptions';

import Platform from '../../platform';
import PresenceMessage from '../types/presencemessage';
import { ModulesMap } from './modulesmap';
import { Rest } from './rest';
import { IUntypedCryptoStatic } from 'common/types/ICryptoStatic';
import { throwMissingModuleError } from '../util/utils';

/**
 `BaseClient` acts as the base class for all of the client classes exported by the SDK. It is an implementation detail and this class is not advertised publicly.
 */
class BaseClient {
  options: NormalisedClientOptions;
  _currentFallback: null | {
    host: string;
    validUntil: number;
  };
  serverTimeOffset: number | null;
  http: IHttp;
  auth: Auth;

  private readonly _rest: Rest | null;
  readonly _Crypto: IUntypedCryptoStatic | null;
  readonly _MsgPack = Platform.Config.msgpack;

  constructor(options: ClientOptions | string, modules: ModulesMap) {
    if (!options) {
      const msg = 'no options provided';
      Logger.logAction(Logger.LOG_ERROR, 'BaseClient()', msg);
      throw new Error(msg);
    }
    const optionsObj = Defaults.objectifyOptions(options);

    Logger.setLog(optionsObj.logLevel, optionsObj.logHandler);
    Logger.logAction(
      Logger.LOG_MICRO,
      'BaseClient()',
      'initialized with clientOptions ' + Platform.Config.inspect(options)
    );

    const normalOptions = (this.options = Defaults.normaliseOptions(optionsObj));

    /* process options */
    if (normalOptions.key) {
      const keyMatch = normalOptions.key.match(/^([^:\s]+):([^:.\s]+)$/);
      if (!keyMatch) {
        const msg = 'invalid key parameter';
        Logger.logAction(Logger.LOG_ERROR, 'BaseClient()', msg);
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

    Logger.logAction(Logger.LOG_MINOR, 'BaseClient()', 'started; version = ' + Defaults.version);

    this._currentFallback = null;

    this.serverTimeOffset = null;
    this.http = new Platform.Http(normalOptions);
    this.auth = new Auth(this, normalOptions);

    this._rest = modules.Rest ? new modules.Rest(this) : null;
    this._Crypto = modules.Crypto ?? null;
  }

  private get rest(): Rest {
    if (!this._rest) {
      throwMissingModuleError('Crypto');
    }
    return this._rest;
  }

  get channels() {
    return this.rest.channels;
  }

  get push() {
    return this.rest.push;
  }

  baseUri(host: string) {
    return Defaults.getHttpScheme(this.options) + host + ':' + Defaults.getPort(this.options, false);
  }

  stats(
    params: RequestParams,
    callback: StandardCallback<PaginatedResult<Stats>>
  ): Promise<PaginatedResult<Stats>> | void {
    return this.rest.stats(params, callback);
  }

  time(params?: RequestParams | StandardCallback<number>, callback?: StandardCallback<number>): Promise<number> | void {
    return this.rest.time(params, callback);
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
    return this.rest.request(method, path, version, params, body, customHeaders, callback);
  }

  setLog(logOptions: LoggerOptions): void {
    Logger.setLog(logOptions.level, logOptions.handler);
  }

  static Platform = Platform;
  static PresenceMessage = PresenceMessage;
}

export default BaseClient;
