import Logger, { LoggerOptions } from '../util/logger';
import Defaults from '../util/defaults';
import Auth from './auth';
import { HttpPaginatedResponse, PaginatedResult } from './paginatedresource';
import ErrorInfo from '../types/errorinfo';
import Stats from '../types/stats';
import { Http, RequestParams } from '../../types/http';
import ClientOptions, { NormalisedClientOptions } from '../../types/ClientOptions';
import * as API from '../../../../ably';

import Platform from '../../platform';
import { Rest } from './rest';
import { IUntypedCryptoStatic } from 'common/types/ICryptoStatic';
import { throwMissingPluginError } from '../util/utils';
import { MsgPack } from 'common/types/msgpack';
import { HTTPRequestImplementations } from 'platform/web/lib/http/http';
import { FilteredSubscriptions } from './filteredsubscriptions';

type BatchResult<T> = API.BatchResult<T>;
type BatchPublishSpec = API.BatchPublishSpec;
type BatchPublishSuccessResult = API.BatchPublishSuccessResult;
type BatchPublishFailureResult = API.BatchPublishFailureResult;
type BatchPublishResult = BatchResult<BatchPublishSuccessResult | BatchPublishFailureResult>;
type BatchPresenceSuccessResult = API.BatchPresenceSuccessResult;
type BatchPresenceFailureResult = API.BatchPresenceFailureResult;
type BatchPresenceResult = BatchResult<BatchPresenceSuccessResult | BatchPresenceFailureResult>;

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
  http: Http;
  auth: Auth;

  private readonly _rest: Rest | null;
  readonly _Crypto: IUntypedCryptoStatic | null;
  readonly _MsgPack: MsgPack | null;
  // Extra HTTP request implementations available to this client, in addition to those in web’s Http.bundledRequestImplementations
  readonly _additionalHTTPRequestImplementations: HTTPRequestImplementations | null;
  private readonly __FilteredSubscriptions: typeof FilteredSubscriptions | null;

  constructor(options: ClientOptions) {
    this._additionalHTTPRequestImplementations = options.plugins ?? null;

    Logger.setLog(options.logLevel, options.logHandler);
    Logger.logAction(
      Logger.LOG_MICRO,
      'BaseClient()',
      'initialized with clientOptions ' + Platform.Config.inspect(options),
    );

    this._MsgPack = options.plugins?.MsgPack ?? null;
    const normalOptions = (this.options = Defaults.normaliseOptions(options, this._MsgPack));

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
          400,
        );
    }

    Logger.logAction(Logger.LOG_MINOR, 'BaseClient()', 'started; version = ' + Defaults.version);

    this._currentFallback = null;

    this.serverTimeOffset = null;
    this.http = new Http(this);
    this.auth = new Auth(this, normalOptions);

    this._rest = options.plugins?.Rest ? new options.plugins.Rest(this) : null;
    this._Crypto = options.plugins?.Crypto ?? null;
    this.__FilteredSubscriptions = options.plugins?.MessageInteractions ?? null;
  }

  get rest(): Rest {
    if (!this._rest) {
      throwMissingPluginError('Rest');
    }
    return this._rest;
  }

  get _FilteredSubscriptions(): typeof FilteredSubscriptions {
    if (!this.__FilteredSubscriptions) {
      throwMissingPluginError('MessageInteractions');
    }
    return this.__FilteredSubscriptions;
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

  async stats(params: RequestParams): Promise<PaginatedResult<Stats>> {
    return this.rest.stats(params);
  }

  async time(params?: RequestParams): Promise<number> {
    return this.rest.time(params);
  }

  async request(
    method: string,
    path: string,
    version: number,
    params: RequestParams,
    body: unknown,
    customHeaders: Record<string, string>,
  ): Promise<HttpPaginatedResponse<unknown>> {
    return this.rest.request(method, path, version, params, body, customHeaders);
  }

  batchPublish<T extends BatchPublishSpec | BatchPublishSpec[]>(
    specOrSpecs: T,
  ): Promise<T extends BatchPublishSpec ? BatchPublishResult : BatchPublishResult[]> {
    return this.rest.batchPublish(specOrSpecs);
  }

  batchPresence(channels: string[]): Promise<BatchPresenceResult> {
    return this.rest.batchPresence(channels);
  }

  setLog(logOptions: LoggerOptions): void {
    Logger.setLog(logOptions.level, logOptions.handler);
  }

  static Platform = Platform;
}

export default BaseClient;
