import type BaseClient from 'common/lib/client/baseclient';
import type RealtimeChannel from 'common/lib/client/realtimechannel';
import type RestChannel from 'common/lib/client/restchannel';
import type { LocalDevice } from 'plugins/push/pushactivation';

class PushChannel {
  client: BaseClient;
  channel: RestChannel | RealtimeChannel;

  constructor(channel: RestChannel | RealtimeChannel) {
    this.channel = channel;
    this.client = channel.client;
  }

  async subscribeDevice() {
    const client = this.client;
    const device = client.device as LocalDevice;
    const format = client.options.useBinaryProtocol ? client.Utils.Format.msgpack : client.Utils.Format.json,
      body = { deviceId: device.id, channel: this.channel.name },
      headers = client.Defaults.defaultPostHeaders(client.options, { format });

    if (client.options.headers) client.Utils.mixin(headers, client.options.headers);

    client.Utils.mixin(headers, this._getPushAuthHeaders());

    const requestBody = client.Utils.encodeBody(body, client._MsgPack, format);
    await client.rest.Resource.post(client, '/push/channelSubscriptions', requestBody, headers, {}, format, true);
  }

  async unsubscribeDevice() {
    const client = this.client;
    const device = client.device as LocalDevice;
    const format = client.options.useBinaryProtocol ? client.Utils.Format.msgpack : client.Utils.Format.json,
      headers = client.Defaults.defaultPostHeaders(client.options, { format });

    if (client.options.headers) client.Utils.mixin(headers, client.options.headers);

    client.Utils.mixin(headers, this._getPushAuthHeaders());

    await client.rest.Resource.delete(
      client,
      '/push/channelSubscriptions',
      headers,
      { deviceId: device.id, channel: this.channel.name },
      format,
      true,
    );
  }

  async subscribeClient() {
    const client = this.client;
    const clientId = this.client.auth.clientId;
    if (!clientId) {
      throw new this.client.ErrorInfo('Cannot subscribe from client without client ID', 50000, 500);
    }
    const format = client.options.useBinaryProtocol ? client.Utils.Format.msgpack : client.Utils.Format.json,
      body = { clientId: clientId, channel: this.channel.name },
      headers = client.Defaults.defaultPostHeaders(client.options, { format });

    if (client.options.headers) client.Utils.mixin(headers, client.options.headers);

    const requestBody = client.Utils.encodeBody(body, client._MsgPack, format);
    await client.rest.Resource.post(client, '/push/channelSubscriptions', requestBody, headers, {}, format, true);
  }

  async unsubscribeClient() {
    const client = this.client;

    const clientId = this.client.auth.clientId;
    if (!clientId) {
      throw new this.client.ErrorInfo('Cannot unsubscribe from client without client ID', 50000, 500);
    }
    const format = client.options.useBinaryProtocol ? client.Utils.Format.msgpack : client.Utils.Format.json,
      headers = client.Defaults.defaultPostHeaders(client.options, { format });

    if (client.options.headers) client.Utils.mixin(headers, client.options.headers);

    await client.rest.Resource.delete(
      client,
      '/push/channelSubscriptions',
      headers,
      { clientId: clientId, channel: this.channel.name },
      format,
      true,
    );
  }

  async listSubscriptions(params?: Record<string, string>) {
    this.client.Logger.logAction(
      this.client.logger,
      this.client.Logger.LOG_MICRO,
      'PushChannel.listSubscriptions()',
      'channel = ' + this.channel.name,
    );

    return this.client.push.admin.channelSubscriptions.list({
      ...params,
      channel: this.channel.name,
      concatFilters: true,
    });
  }

  private _getDeviceIdentityToken() {
    const device = this.client.device as LocalDevice;
    const deviceIdentityToken = device.deviceIdentityToken;
    if (deviceIdentityToken) {
      return deviceIdentityToken;
    } else {
      throw new this.client.ErrorInfo('Cannot subscribe from client without deviceIdentityToken', 50000, 500);
    }
  }

  private _getPushAuthHeaders() {
    const deviceIdentityToken = this._getDeviceIdentityToken();
    return { 'X-Ably-DeviceToken': deviceIdentityToken };
  }
}

export default PushChannel;
