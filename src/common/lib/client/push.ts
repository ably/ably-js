import * as Utils from '../util/utils';
import DeviceDetails from '../types/devicedetails';
import Resource from './resource';
import PaginatedResource from './paginatedresource';
import ErrorInfo from '../types/errorinfo';
import PushChannelSubscription from '../types/pushchannelsubscription';
import { ErrCallback, PaginatedResultCallback, StandardCallback } from '../../types/utils';
import BaseClient from './baseclient';
import Defaults from '../util/defaults';

class Push {
  client: BaseClient;
  admin: Admin;

  constructor(client: BaseClient) {
    this.client = client;
    this.admin = new Admin(client);
  }
}

class Admin {
  client: BaseClient;
  deviceRegistrations: DeviceRegistrations;
  channelSubscriptions: ChannelSubscriptions;

  constructor(client: BaseClient) {
    this.client = client;
    this.deviceRegistrations = new DeviceRegistrations(client);
    this.channelSubscriptions = new ChannelSubscriptions(client);
  }

  publish(recipient: any, payload: any, callback: ErrCallback) {
    const client = this.client;
    const format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Defaults.defaultPostHeaders(client.options, { format }),
      params = {};
    const body = Utils.mixin({ recipient: recipient }, payload);

    if (typeof callback !== 'function') {
      return Utils.promisify(this, 'publish', arguments);
    }

    Utils.mixin(headers, client.options.headers);

    if (client.options.pushFullWait) Utils.mixin(params, { fullWait: 'true' });

    const requestBody = Utils.encodeBody(body, client._MsgPack, format);
    Resource.post(client, '/push/publish', requestBody, headers, params, null, (err) => callback(err));
  }
}

class DeviceRegistrations {
  client: BaseClient;

  constructor(client: BaseClient) {
    this.client = client;
  }

  save(device: any, callback: StandardCallback<DeviceDetails>) {
    const client = this.client;
    const body = DeviceDetails.fromValues(device);
    const format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Defaults.defaultPostHeaders(client.options, { format }),
      params = {};

    if (typeof callback !== 'function') {
      return Utils.promisify(this, 'save', arguments);
    }

    Utils.mixin(headers, client.options.headers);

    if (client.options.pushFullWait) Utils.mixin(params, { fullWait: 'true' });

    const requestBody = Utils.encodeBody(body, client._MsgPack, format);
    Resource.put(
      client,
      '/push/deviceRegistrations/' + encodeURIComponent(device.id),
      requestBody,
      headers,
      params,
      null,
      (err, body, headers, unpacked) => {
        callback(
          err,
          !err
            ? (DeviceDetails.fromResponseBody(
                body as Record<string, unknown>,
                client._MsgPack,
                unpacked ? undefined : format
              ) as DeviceDetails)
            : undefined
        );
      }
    );
  }

  get(deviceIdOrDetails: any, callback: StandardCallback<DeviceDetails>) {
    const client = this.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Defaults.defaultGetHeaders(client.options, { format }),
      deviceId = deviceIdOrDetails.id || deviceIdOrDetails;

    if (typeof callback !== 'function') {
      return Utils.promisify(this, 'get', arguments);
    }

    if (typeof deviceId !== 'string' || !deviceId.length) {
      callback(
        new ErrorInfo(
          'First argument to DeviceRegistrations#get must be a deviceId string or DeviceDetails',
          40000,
          400
        )
      );
      return;
    }

    Utils.mixin(headers, client.options.headers);

    Resource.get(
      client,
      '/push/deviceRegistrations/' + encodeURIComponent(deviceId),
      headers,
      {},
      null,
      function (err, body, headers, unpacked) {
        callback(
          err,
          !err
            ? (DeviceDetails.fromResponseBody(
                body as Record<string, unknown>,
                client._MsgPack,
                unpacked ? undefined : format
              ) as DeviceDetails)
            : undefined
        );
      }
    );
  }

  list(params: any, callback: PaginatedResultCallback<unknown>) {
    const client = this.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = this.client.http.supportsLinkHeaders ? undefined : format,
      headers = Defaults.defaultGetHeaders(client.options, { format });

    if (typeof callback !== 'function') {
      return Utils.promisify(this, 'list', arguments);
    }

    Utils.mixin(headers, client.options.headers);

    new PaginatedResource(client, '/push/deviceRegistrations', headers, envelope, async function (
      body: any,
      headers: Record<string, string>,
      unpacked?: boolean
    ) {
      return DeviceDetails.fromResponseBody(body, client._MsgPack, unpacked ? undefined : format);
    }).get(params, callback);
  }

  remove(deviceIdOrDetails: any, callback: ErrCallback) {
    const client = this.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Defaults.defaultGetHeaders(client.options, { format }),
      params = {},
      deviceId = deviceIdOrDetails.id || deviceIdOrDetails;

    if (typeof callback !== 'function') {
      return Utils.promisify(this, 'remove', arguments);
    }

    if (typeof deviceId !== 'string' || !deviceId.length) {
      callback(
        new ErrorInfo(
          'First argument to DeviceRegistrations#remove must be a deviceId string or DeviceDetails',
          40000,
          400
        )
      );
      return;
    }

    Utils.mixin(headers, client.options.headers);

    if (client.options.pushFullWait) Utils.mixin(params, { fullWait: 'true' });

    Resource['delete'](
      client,
      '/push/deviceRegistrations/' + encodeURIComponent(deviceId),
      headers,
      params,
      null,
      (err) => callback(err)
    );
  }

  removeWhere(params: any, callback: ErrCallback) {
    const client = this.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Defaults.defaultGetHeaders(client.options, { format });

    if (typeof callback !== 'function') {
      return Utils.promisify(this, 'removeWhere', arguments);
    }

    Utils.mixin(headers, client.options.headers);

    if (client.options.pushFullWait) Utils.mixin(params, { fullWait: 'true' });

    Resource['delete'](client, '/push/deviceRegistrations', headers, params, null, (err) => callback(err));
  }
}

class ChannelSubscriptions {
  client: BaseClient;

  constructor(client: BaseClient) {
    this.client = client;
  }

  save(subscription: Record<string, unknown>, callback: PaginatedResultCallback<unknown>) {
    const client = this.client;
    const body = PushChannelSubscription.fromValues(subscription);
    const format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Defaults.defaultPostHeaders(client.options, { format }),
      params = {};

    if (typeof callback !== 'function') {
      return Utils.promisify(this, 'save', arguments);
    }

    Utils.mixin(headers, client.options.headers);

    if (client.options.pushFullWait) Utils.mixin(params, { fullWait: 'true' });

    const requestBody = Utils.encodeBody(body, client._MsgPack, format);
    Resource.post(
      client,
      '/push/channelSubscriptions',
      requestBody,
      headers,
      params,
      null,
      function (err, body, headers, unpacked) {
        callback(
          err,
          !err &&
            PushChannelSubscription.fromResponseBody(
              body as Record<string, any>,
              client._MsgPack,
              unpacked ? undefined : format
            )
        );
      }
    );
  }

  list(params: any, callback: PaginatedResultCallback<unknown>) {
    const client = this.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = this.client.http.supportsLinkHeaders ? undefined : format,
      headers = Defaults.defaultGetHeaders(client.options, { format });

    if (typeof callback !== 'function') {
      return Utils.promisify(this, 'list', arguments);
    }

    Utils.mixin(headers, client.options.headers);

    new PaginatedResource(client, '/push/channelSubscriptions', headers, envelope, async function (
      body: any,
      headers: Record<string, string>,
      unpacked?: boolean
    ) {
      return PushChannelSubscription.fromResponseBody(body, client._MsgPack, unpacked ? undefined : format);
    }).get(params, callback);
  }

  removeWhere(params: any, callback: PaginatedResultCallback<unknown>) {
    const client = this.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Defaults.defaultGetHeaders(client.options, { format });

    if (typeof callback !== 'function') {
      return Utils.promisify(this, 'removeWhere', arguments);
    }

    Utils.mixin(headers, client.options.headers);

    if (client.options.pushFullWait) Utils.mixin(params, { fullWait: 'true' });

    Resource['delete'](client, '/push/channelSubscriptions', headers, params, null, (err) => callback(err));
  }

  /* ChannelSubscriptions have no unique id; removing one is equivalent to removeWhere by its properties */
  remove = ChannelSubscriptions.prototype.removeWhere;

  listChannels(params: any, callback: PaginatedResultCallback<unknown>) {
    const client = this.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = this.client.http.supportsLinkHeaders ? undefined : format,
      headers = Defaults.defaultGetHeaders(client.options, { format });

    if (typeof callback !== 'function') {
      return Utils.promisify(this, 'listChannels', arguments);
    }

    Utils.mixin(headers, client.options.headers);

    if (client.options.pushFullWait) Utils.mixin(params, { fullWait: 'true' });

    new PaginatedResource(client, '/push/channels', headers, envelope, async function (
      body: unknown,
      headers: Record<string, string>,
      unpacked?: boolean
    ) {
      const parsedBody = (
        !unpacked && format ? Utils.decodeBody(body, client._MsgPack, format) : body
      ) as Array<string>;

      for (let i = 0; i < parsedBody.length; i++) {
        parsedBody[i] = String(parsedBody[i]);
      }
      return parsedBody;
    }).get(params, callback);
  }
}

export default Push;
