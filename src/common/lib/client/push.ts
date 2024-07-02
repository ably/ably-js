import * as Utils from '../util/utils';
import DeviceDetails from '../types/devicedetails';
import Resource from './resource';
import PaginatedResource, { PaginatedResult } from './paginatedresource';
import ErrorInfo from '../types/errorinfo';
import PushChannelSubscription from '../types/pushchannelsubscription';
import BaseClient from './baseclient';
import Defaults from '../util/defaults';
import type {
  ActivationStateMachine,
  DeregisterCallback,
  LocalDeviceFactory,
  RegisterCallback,
} from 'plugins/push/pushactivation';
import Platform from 'common/platform';
import type { ErrCallback } from 'common/types/utils';

class Push {
  client: BaseClient;
  admin: Admin;
  stateMachine?: ActivationStateMachine;
  LocalDevice?: LocalDeviceFactory;

  constructor(client: BaseClient) {
    this.client = client;
    this.admin = new Admin(client);
    if (Platform.Config.push && client.options.plugins?.Push) {
      this.stateMachine = new client.options.plugins.Push.ActivationStateMachine(client);
      this.LocalDevice = client.options.plugins.Push.localDeviceFactory(DeviceDetails);
    }
  }

  async activate(registerCallback?: RegisterCallback, updateFailedCallback?: ErrCallback) {
    await new Promise<void>((resolve, reject) => {
      if (!this.client.options.plugins?.Push) {
        reject(Utils.createMissingPluginError('Push'));
        return;
      }
      if (!this.stateMachine) {
        reject(new ErrorInfo('This platform is not supported as a target of push notifications', 40000, 400));
        return;
      }
      if (this.stateMachine.activatedCallback) {
        reject(new ErrorInfo('Activation already in progress', 40000, 400));
        return;
      }
      this.stateMachine.activatedCallback = (err: ErrorInfo) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      };
      this.stateMachine.updateFailedCallback = updateFailedCallback;
      this.stateMachine.handleEvent(
        new this.client.options.plugins.Push.CalledActivate(this.stateMachine, registerCallback),
      );
    });
  }

  async deactivate(deregisterCallback: DeregisterCallback) {
    await new Promise<void>((resolve, reject) => {
      if (!this.client.options.plugins?.Push) {
        reject(Utils.createMissingPluginError('Push'));
        return;
      }
      if (!this.stateMachine) {
        reject(new ErrorInfo('This platform is not supported as a target of push notifications', 40000, 400));
        return;
      }
      if (this.stateMachine.deactivatedCallback) {
        reject(new ErrorInfo('Deactivation already in progress', 40000, 400));
        return;
      }
      this.stateMachine.deactivatedCallback = (err: ErrorInfo) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      };
      this.stateMachine.handleEvent(
        new this.client.options.plugins.Push.CalledDeactivate(this.stateMachine, deregisterCallback),
      );
    });
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

  async publish(recipient: any, payload: any): Promise<void> {
    const client = this.client;
    const format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Defaults.defaultPostHeaders(client.options, { format }),
      params = {};
    const body = Utils.mixin({ recipient: recipient }, payload);

    Utils.mixin(headers, client.options.headers);

    if (client.options.pushFullWait) Utils.mixin(params, { fullWait: 'true' });

    const requestBody = Utils.encodeBody(body, client._MsgPack, format);
    await Resource.post(client, '/push/publish', requestBody, headers, params, null, true);
  }
}

class DeviceRegistrations {
  client: BaseClient;

  constructor(client: BaseClient) {
    this.client = client;
  }

  async save(device: any): Promise<DeviceDetails> {
    const client = this.client;
    const body = DeviceDetails.fromValues(device);
    const format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Defaults.defaultPostHeaders(client.options, { format }),
      params = {};

    Utils.mixin(headers, client.options.headers);

    if (client.options.pushFullWait) Utils.mixin(params, { fullWait: 'true' });

    const requestBody = Utils.encodeBody(body, client._MsgPack, format);
    const response = await Resource.put(
      client,
      '/push/deviceRegistrations/' + encodeURIComponent(device.id),
      requestBody,
      headers,
      params,
      null,
      true,
    );

    return DeviceDetails.fromResponseBody(
      response.body as Record<string, unknown>,
      client._MsgPack,
      response.unpacked ? undefined : format,
    ) as DeviceDetails;
  }

  async get(deviceIdOrDetails: any): Promise<DeviceDetails> {
    const client = this.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Defaults.defaultGetHeaders(client.options, { format }),
      deviceId = deviceIdOrDetails.id || deviceIdOrDetails;

    if (typeof deviceId !== 'string' || !deviceId.length) {
      throw new ErrorInfo(
        'First argument to DeviceRegistrations#get must be a deviceId string or DeviceDetails',
        40000,
        400,
      );
    }

    Utils.mixin(headers, client.options.headers);

    const response = await Resource.get(
      client,
      '/push/deviceRegistrations/' + encodeURIComponent(deviceId),
      headers,
      {},
      null,
      true,
    );

    return DeviceDetails.fromResponseBody(
      response.body as Record<string, unknown>,
      client._MsgPack,
      response.unpacked ? undefined : format,
    ) as DeviceDetails;
  }

  async list(params: any): Promise<PaginatedResult<unknown>> {
    const client = this.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = this.client.http.supportsLinkHeaders ? undefined : format,
      headers = Defaults.defaultGetHeaders(client.options, { format });

    Utils.mixin(headers, client.options.headers);

    return new PaginatedResource(client, '/push/deviceRegistrations', headers, envelope, async function (
      body,
      headers,
      unpacked,
    ) {
      return DeviceDetails.fromResponseBody(
        body as Record<string, unknown>[],
        client._MsgPack,
        unpacked ? undefined : format,
      );
    }).get(params);
  }

  async remove(deviceIdOrDetails: any): Promise<void> {
    const client = this.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Defaults.defaultGetHeaders(client.options, { format }),
      params = {},
      deviceId = deviceIdOrDetails.id || deviceIdOrDetails;

    if (typeof deviceId !== 'string' || !deviceId.length) {
      throw new ErrorInfo(
        'First argument to DeviceRegistrations#remove must be a deviceId string or DeviceDetails',
        40000,
        400,
      );
    }

    Utils.mixin(headers, client.options.headers);

    if (client.options.pushFullWait) Utils.mixin(params, { fullWait: 'true' });

    await Resource['delete'](
      client,
      '/push/deviceRegistrations/' + encodeURIComponent(deviceId),
      headers,
      params,
      null,
      true,
    );
  }

  async removeWhere(params: any): Promise<void> {
    const client = this.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Defaults.defaultGetHeaders(client.options, { format });

    Utils.mixin(headers, client.options.headers);

    if (client.options.pushFullWait) Utils.mixin(params, { fullWait: 'true' });

    await Resource['delete'](client, '/push/deviceRegistrations', headers, params, null, true);
  }
}

class ChannelSubscriptions {
  client: BaseClient;

  constructor(client: BaseClient) {
    this.client = client;
  }

  async save(subscription: Record<string, unknown>): Promise<PushChannelSubscription> {
    const client = this.client;
    const body = PushChannelSubscription.fromValues(subscription);
    const format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Defaults.defaultPostHeaders(client.options, { format }),
      params = {};

    Utils.mixin(headers, client.options.headers);

    if (client.options.pushFullWait) Utils.mixin(params, { fullWait: 'true' });

    const requestBody = Utils.encodeBody(body, client._MsgPack, format);
    const response = await Resource.post(
      client,
      '/push/channelSubscriptions',
      requestBody,
      headers,
      params,
      null,
      true,
    );

    return PushChannelSubscription.fromResponseBody(
      response.body as Record<string, any>,
      client._MsgPack,
      response.unpacked ? undefined : format,
    ) as PushChannelSubscription;
  }

  async list(params: any): Promise<PaginatedResult<unknown>> {
    const client = this.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = this.client.http.supportsLinkHeaders ? undefined : format,
      headers = Defaults.defaultGetHeaders(client.options, { format });

    Utils.mixin(headers, client.options.headers);

    return new PaginatedResource(client, '/push/channelSubscriptions', headers, envelope, async function (
      body,
      headers,
      unpacked,
    ) {
      return PushChannelSubscription.fromResponseBody(
        body as Record<string, unknown>[],
        client._MsgPack,
        unpacked ? undefined : format,
      );
    }).get(params);
  }

  async removeWhere(params: any): Promise<void> {
    const client = this.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      headers = Defaults.defaultGetHeaders(client.options, { format });

    Utils.mixin(headers, client.options.headers);

    if (client.options.pushFullWait) Utils.mixin(params, { fullWait: 'true' });

    await Resource['delete'](client, '/push/channelSubscriptions', headers, params, null, true);
  }

  /* ChannelSubscriptions have no unique id; removing one is equivalent to removeWhere by its properties */
  remove = ChannelSubscriptions.prototype.removeWhere;

  async listChannels(params: any): Promise<PaginatedResult<unknown>> {
    const client = this.client,
      format = client.options.useBinaryProtocol ? Utils.Format.msgpack : Utils.Format.json,
      envelope = this.client.http.supportsLinkHeaders ? undefined : format,
      headers = Defaults.defaultGetHeaders(client.options, { format });

    Utils.mixin(headers, client.options.headers);

    if (client.options.pushFullWait) Utils.mixin(params, { fullWait: 'true' });

    return new PaginatedResource(client, '/push/channels', headers, envelope, async function (body, headers, unpacked) {
      const parsedBody = (
        !unpacked && format ? Utils.decodeBody(body, client._MsgPack, format) : body
      ) as Array<string>;

      for (let i = 0; i < parsedBody.length; i++) {
        parsedBody[i] = String(parsedBody[i]);
      }
      return parsedBody;
    }).get(params);
  }
}

export default Push;
