import * as Utils from '../util/utils';
import Logger, { LoggerOptions } from '../util/logger';
import Defaults from '../util/defaults';
import Push from './push';
import PaginatedResource, { HttpPaginatedResponse, PaginatedResult } from './paginatedresource';
import RestChannel from './restchannel';
import ErrorInfo from '../types/errorinfo';
import Stats from '../types/stats';
import HttpMethods from '../../constants/HttpMethods';
import { ChannelOptions } from '../../types/channel';
import { RequestBody, RequestParams } from '../../types/http';
import * as API from '../../../../ably';
import Resource from './resource';

import Platform from '../../platform';
import BaseClient from './baseclient';
import { useTokenAuth } from './auth';
import { RestChannelMixin } from './restchannelmixin';
import { RestPresenceMixin } from './restpresencemixin';

type BatchResult<T> = API.BatchResult<T>;

type BatchPublishSpec = API.BatchPublishSpec;
type BatchPublishSuccessResult = API.BatchPublishSuccessResult;
type BatchPublishFailureResult = API.BatchPublishFailureResult;
type BatchPublishResult = BatchResult<BatchPublishSuccessResult | BatchPublishFailureResult>;
type BatchPresenceSuccessResult = API.BatchPresenceSuccessResult;
type BatchPresenceFailureResult = API.BatchPresenceFailureResult;
type BatchPresenceResult = BatchResult<BatchPresenceSuccessResult | BatchPresenceFailureResult>;

type TokenRevocationTargetSpecifier = API.TokenRevocationTargetSpecifier;
type TokenRevocationOptions = API.TokenRevocationOptions;
type TokenRevocationSuccessResult = API.TokenRevocationSuccessResult;
type TokenRevocationFailureResult = API.TokenRevocationFailureResult;
type TokenRevocationResult = BatchResult<TokenRevocationSuccessResult | TokenRevocationFailureResult>;

export class Rest {
  private readonly client: BaseClient;
  readonly channels: Channels;
  readonly push: Push;

  readonly channelMixin = RestChannelMixin;
  readonly presenceMixin = RestPresenceMixin;

  constructor(client: BaseClient) {
    this.client = client;
    this.channels = new Channels(this.client);
    this.push = new Push(this.client);
  }

  async stats(params: RequestParams): Promise<PaginatedResult<Stats>> {
    const headers = Defaults.defaultGetHeaders(this.client.options),
      format = this.client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = this.client.http.supportsLinkHeaders ? undefined : format;

    Utils.mixin(headers, this.client.options.headers);

    return new Promise((resolve, reject) => {
      new PaginatedResource(this.client, '/stats', headers, envelope, function (body, headers, unpacked) {
        const statsValues = unpacked ? body : JSON.parse(body as string);
        for (let i = 0; i < statsValues.length; i++) statsValues[i] = Stats.fromValues(statsValues[i]);
        return statsValues;
      }).get(params as Record<string, string>, (err, result) => (err ? reject(err) : resolve(result)));
    });
  }

  async time(params?: RequestParams): Promise<number> {
    const headers = Defaults.defaultGetHeaders(this.client.options);
    if (this.client.options.headers) Utils.mixin(headers, this.client.options.headers);
    const timeUri = (host: string) => {
      return this.client.baseUri(host) + '/time';
    };
    return new Promise((resolve, reject) => {
      this.client.http.do(
        HttpMethods.Get,
        timeUri,
        headers,
        null,
        params as RequestParams,
        (err, res, headers, unpacked) => {
          if (err) {
            reject(err);
            return;
          }
          if (!unpacked) res = JSON.parse(res as string);
          const time = (res as number[])[0];
          if (!time) {
            reject(new ErrorInfo('Internal error (unexpected result type from GET /time)', 50000, 500));
            return;
          }
          /* calculate time offset only once for this device by adding to the prototype */
          this.client.serverTimeOffset = time - Utils.now();
          resolve(time);
        }
      );
    });
  }

  async request(
    method: string,
    path: string,
    version: number,
    params: RequestParams,
    body: unknown,
    customHeaders: Record<string, string>
  ): Promise<HttpPaginatedResponse<unknown>> {
    const [encoder, decoder, format] = (() => {
      if (this.client.options.useBinaryProtocol) {
        if (!this.client._MsgPack) {
          Utils.throwMissingModuleError('MsgPack');
        }
        return [this.client._MsgPack.encode, this.client._MsgPack.decode, Utils.Format.msgpack];
      } else {
        return [JSON.stringify, JSON.parse, Utils.Format.json];
      }
    })();
    const envelope = this.client.http.supportsLinkHeaders ? undefined : format;
    params = params || {};
    const _method = method.toLowerCase() as HttpMethods;
    const headers =
      _method == 'get'
        ? Defaults.defaultGetHeaders(this.client.options, { format, protocolVersion: version })
        : Defaults.defaultPostHeaders(this.client.options, { format, protocolVersion: version });

    if (typeof body !== 'string') {
      body = encoder(body) ?? null;
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
      async function (resbody, headers, unpacked) {
        return Utils.ensureArray(unpacked ? resbody : decoder(resbody as string & Buffer));
      },
      /* useHttpPaginatedResponse: */ true
    );

    if (!Utils.arrIn(Platform.Http.methods, _method)) {
      throw new ErrorInfo('Unsupported method ' + _method, 40500, 405);
    }

    return new Promise((resolve, reject) => {
      if (Utils.arrIn(Platform.Http.methodsWithBody, _method)) {
        paginatedResource[_method as HttpMethods.Post](params!, body as RequestBody, (err, result) =>
          err ? reject(err) : resolve(result)
        );
      } else {
        paginatedResource[_method as HttpMethods.Get | HttpMethods.Delete](params!, (err, result) =>
          err ? reject(err) : resolve(result)
        );
      }
    });
  }

  async batchPublish<T extends BatchPublishSpec | BatchPublishSpec[]>(
    specOrSpecs: T
  ): Promise<T extends BatchPublishSpec ? BatchPublishResult : BatchPublishResult[]> {
    let requestBodyDTO: BatchPublishSpec[];
    let singleSpecMode: boolean;
    if (Utils.isArray(specOrSpecs)) {
      requestBodyDTO = specOrSpecs;
      singleSpecMode = false;
    } else {
      requestBodyDTO = [specOrSpecs];
      singleSpecMode = true;
    }

    const format = this.client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Defaults.defaultPostHeaders(this.client.options, { format });

    if (this.client.options.headers) Utils.mixin(headers, this.client.options.headers);

    const requestBody = Utils.encodeBody(requestBodyDTO, this.client._MsgPack, format);
    return new Promise((resolve, reject) => {
      Resource.post(this.client, '/messages', requestBody, headers, {}, null, (err, body, headers, unpacked) => {
        if (err) {
          reject(err);
          return;
        }

        const batchResults = (
          unpacked ? body : Utils.decodeBody(body, this.client._MsgPack, format)
        ) as BatchPublishResult[];

        // I don't love the below type assertions for `resolve` but not sure how to avoid them
        if (singleSpecMode) {
          (resolve as (result: BatchPublishResult) => void)(batchResults[0]);
        } else {
          (resolve as (result: BatchPublishResult[]) => void)(batchResults);
        }
      });
    });
  }

  async batchPresence(channels: string[]): Promise<BatchPresenceResult> {
    const format = this.client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Defaults.defaultPostHeaders(this.client.options, { format });

    if (this.client.options.headers) Utils.mixin(headers, this.client.options.headers);

    const channelsParam = channels.join(',');

    return new Promise((resolve, reject) => {
      Resource.get(
        this.client,
        '/presence',
        headers,
        { channels: channelsParam },
        null,
        (err, body, headers, unpacked) => {
          if (err) {
            reject(err);
            return;
          }

          const batchResult = (
            unpacked ? body : Utils.decodeBody(body, this.client._MsgPack, format)
          ) as BatchPresenceResult;

          resolve(batchResult);
        }
      );
    });
  }

  async revokeTokens(
    specifiers: TokenRevocationTargetSpecifier[],
    options?: TokenRevocationOptions
  ): Promise<TokenRevocationResult> {
    if (useTokenAuth(this.client.options)) {
      throw new ErrorInfo('Cannot revoke tokens when using token auth', 40162, 401);
    }

    const keyName = this.client.options.keyName!;

    let resolvedOptions = options ?? {};

    const requestBodyDTO = {
      targets: specifiers.map((specifier) => `${specifier.type}:${specifier.value}`),
      ...resolvedOptions,
    };

    const format = this.client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Defaults.defaultPostHeaders(this.client.options, { format });

    if (this.client.options.headers) Utils.mixin(headers, this.client.options.headers);

    const requestBody = Utils.encodeBody(requestBodyDTO, this.client._MsgPack, format);

    return new Promise((resolve, reject) => {
      Resource.post(
        this.client,
        `/keys/${keyName}/revokeTokens`,
        requestBody,
        headers,
        {},
        null,
        (err, body, headers, unpacked) => {
          if (err) {
            reject(err);
            return;
          }

          const batchResult = (
            unpacked ? body : Utils.decodeBody(body, this.client._MsgPack, format)
          ) as TokenRevocationResult;

          resolve(batchResult);
        }
      );
    });
  }

  setLog(logOptions: LoggerOptions): void {
    Logger.setLog(logOptions.level, logOptions.handler);
  }
}

class Channels {
  client: BaseClient;
  all: Record<string, RestChannel>;

  constructor(client: BaseClient) {
    this.client = client;
    this.all = Object.create(null);
  }

  get(name: string, channelOptions?: ChannelOptions) {
    name = String(name);
    let channel = this.all[name];
    if (!channel) {
      this.all[name] = channel = new RestChannel(this.client, name, channelOptions);
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
