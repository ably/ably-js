import * as Utils from '../util/utils';
import DeviceDetails from '../types/devicedetails';
import Resource from './resource';
import PaginatedResource from './paginatedresource';
import ErrorInfo from '../types/errorinfo';
import PushChannelSubscription from '../types/pushchannelsubscription';
import { ErrCallback, PaginatedResultCallback, StandardCallback } from '../../types/utils';
import Rest from './rest';

const noop = function () {};

class Push {
  rest: Rest;
  admin: Admin;

  constructor(rest: Rest) {
    this.rest = rest;
    this.admin = new Admin(rest);
  }
}

class Admin {
  rest: Rest;
  deviceRegistrations: DeviceRegistrations;
  channelSubscriptions: ChannelSubscriptions;

  constructor(rest: Rest) {
    this.rest = rest;
    this.deviceRegistrations = new DeviceRegistrations(rest);
    this.channelSubscriptions = new ChannelSubscriptions(rest);
  }

  publish(recipient: any, payload: any, callback: ErrCallback) {
    const rest = this.rest;
    const format = rest.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Utils.defaultPostHeaders(rest.options, format),
      params = {};
    const body = Utils.mixin({ recipient: recipient }, payload);

    if (typeof callback !== 'function') {
      if (this.rest.options.promises) {
        return Utils.promisify(this, 'publish', arguments);
      }
      callback = noop;
    }

    if (rest.options.headers) Utils.mixin(headers, rest.options.headers);

    if (rest.options.pushFullWait) Utils.mixin(params, { fullWait: 'true' });

    const requestBody = Utils.encodeBody(body, format);
    Resource.post(rest, '/push/publish', requestBody, headers, params, null, (err) => callback(err));
  }
}

class DeviceRegistrations {
  rest: Rest;

  constructor(rest: Rest) {
    this.rest = rest;
  }

  save(device: any, callback: StandardCallback<DeviceDetails>) {
    const rest = this.rest;
    const body = DeviceDetails.fromValues(device);
    const format = rest.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Utils.defaultPostHeaders(rest.options, format),
      params = {};

    if (typeof callback !== 'function') {
      if (this.rest.options.promises) {
        return Utils.promisify(this, 'save', arguments);
      }
      callback = noop;
    }

    if (rest.options.headers) Utils.mixin(headers, rest.options.headers);

    if (rest.options.pushFullWait) Utils.mixin(params, { fullWait: 'true' });

    const requestBody = Utils.encodeBody(body, format);
    Resource.put(
      rest,
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
                unpacked ? undefined : format
              ) as DeviceDetails)
            : undefined
        );
      }
    );
  }

  get(deviceIdOrDetails: any, callback: StandardCallback<DeviceDetails>) {
    const rest = this.rest,
      format = rest.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Utils.defaultGetHeaders(rest.options, format),
      deviceId = deviceIdOrDetails.id || deviceIdOrDetails;

    if (typeof callback !== 'function') {
      if (this.rest.options.promises) {
        return Utils.promisify(this, 'get', arguments);
      }
      callback = noop;
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

    if (rest.options.headers) Utils.mixin(headers, rest.options.headers);

    Resource.get(
      rest,
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
                unpacked ? undefined : format
              ) as DeviceDetails)
            : undefined
        );
      }
    );
  }

  list(params: any, callback: PaginatedResultCallback<unknown>) {
    const rest = this.rest,
      format = rest.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = this.rest.http.supportsLinkHeaders ? undefined : format,
      headers = Utils.defaultGetHeaders(rest.options, format);

    if (typeof callback !== 'function') {
      if (this.rest.options.promises) {
        return Utils.promisify(this, 'list', arguments);
      }
      callback = noop;
    }

    if (rest.options.headers) Utils.mixin(headers, rest.options.headers);

    new PaginatedResource(rest, '/push/deviceRegistrations', headers, envelope, function (
      body: any,
      headers: Record<string, string>,
      unpacked?: boolean
    ) {
      return DeviceDetails.fromResponseBody(body, unpacked ? undefined : format);
    }).get(params, callback);
  }

  remove(deviceIdOrDetails: any, callback: ErrCallback) {
    const rest = this.rest,
      format = rest.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Utils.defaultGetHeaders(rest.options, format),
      params = {},
      deviceId = deviceIdOrDetails.id || deviceIdOrDetails;

    if (typeof callback !== 'function') {
      if (this.rest.options.promises) {
        return Utils.promisify(this, 'remove', arguments);
      }
      callback = noop;
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

    if (rest.options.headers) Utils.mixin(headers, rest.options.headers);

    if (rest.options.pushFullWait) Utils.mixin(params, { fullWait: 'true' });

    Resource['delete'](
      rest,
      '/push/deviceRegistrations/' + encodeURIComponent(deviceId),
      headers,
      params,
      null,
      (err) => callback(err)
    );
  }

  removeWhere(params: any, callback: ErrCallback) {
    const rest = this.rest,
      format = rest.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Utils.defaultGetHeaders(rest.options, format);

    if (typeof callback !== 'function') {
      if (this.rest.options.promises) {
        return Utils.promisify(this, 'removeWhere', arguments);
      }
      callback = noop;
    }

    if (rest.options.headers) Utils.mixin(headers, rest.options.headers);

    if (rest.options.pushFullWait) Utils.mixin(params, { fullWait: 'true' });

    Resource['delete'](rest, '/push/deviceRegistrations', headers, params, null, (err) => callback(err));
  }
}

class ChannelSubscriptions {
  rest: Rest;

  constructor(rest: Rest) {
    this.rest = rest;
  }

  save(subscription: Record<string, unknown>, callback: PaginatedResultCallback<unknown>) {
    const rest = this.rest;
    const body = PushChannelSubscription.fromValues(subscription);
    const format = rest.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Utils.defaultPostHeaders(rest.options, format),
      params = {};

    if (typeof callback !== 'function') {
      if (this.rest.options.promises) {
        return Utils.promisify(this, 'save', arguments);
      }
      callback = noop;
    }

    if (rest.options.headers) Utils.mixin(headers, rest.options.headers);

    if (rest.options.pushFullWait) Utils.mixin(params, { fullWait: 'true' });

    const requestBody = Utils.encodeBody(body, format);
    Resource.post(
      rest,
      '/push/channelSubscriptions',
      requestBody,
      headers,
      params,
      null,
      function (err, body, headers, unpacked) {
        callback(
          err,
          !err && PushChannelSubscription.fromResponseBody(body as Record<string, any>, unpacked ? undefined : format)
        );
      }
    );
  }

  list(params: any, callback: PaginatedResultCallback<unknown>) {
    const rest = this.rest,
      format = rest.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = this.rest.http.supportsLinkHeaders ? undefined : format,
      headers = Utils.defaultGetHeaders(rest.options, format);

    if (typeof callback !== 'function') {
      if (this.rest.options.promises) {
        return Utils.promisify(this, 'list', arguments);
      }
      callback = noop;
    }

    if (rest.options.headers) Utils.mixin(headers, rest.options.headers);

    new PaginatedResource(rest, '/push/channelSubscriptions', headers, envelope, function (
      body: any,
      headers: Record<string, string>,
      unpacked?: boolean
    ) {
      return PushChannelSubscription.fromResponseBody(body, unpacked ? undefined : format);
    }).get(params, callback);
  }

  removeWhere(params: any, callback: PaginatedResultCallback<unknown>) {
    const rest = this.rest,
      format = rest.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Utils.defaultGetHeaders(rest.options, format);

    if (typeof callback !== 'function') {
      if (this.rest.options.promises) {
        return Utils.promisify(this, 'removeWhere', arguments);
      }
      callback = noop;
    }

    if (rest.options.headers) Utils.mixin(headers, rest.options.headers);

    if (rest.options.pushFullWait) Utils.mixin(params, { fullWait: 'true' });

    Resource['delete'](rest, '/push/channelSubscriptions', headers, params, null, (err) => callback(err));
  }

  /* ChannelSubscriptions have no unique id; removing one is equivalent to removeWhere by its properties */
  remove = ChannelSubscriptions.prototype.removeWhere;

  listChannels(params: any, callback: PaginatedResultCallback<unknown>) {
    const rest = this.rest,
      format = rest.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = this.rest.http.supportsLinkHeaders ? undefined : format,
      headers = Utils.defaultGetHeaders(rest.options, format);

    if (typeof callback !== 'function') {
      if (this.rest.options.promises) {
        return Utils.promisify(this, 'listChannels', arguments);
      }
      callback = noop;
    }

    if (rest.options.headers) Utils.mixin(headers, rest.options.headers);

    if (rest.options.pushFullWait) Utils.mixin(params, { fullWait: 'true' });

    new PaginatedResource(rest, '/push/channels', headers, envelope, function (
      body: unknown,
      headers: Record<string, string>,
      unpacked?: boolean
    ) {
      const parsedBody = (!unpacked && format ? Utils.decodeBody(body, format) : body) as Array<string>;

      for (let i = 0; i < parsedBody.length; i++) {
        parsedBody[i] = String(parsedBody[i]);
      }
      return parsedBody;
    }).get(params, callback);
  }
}

export default Push;
