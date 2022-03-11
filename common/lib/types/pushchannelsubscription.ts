import * as Utils from '../util/utils';

type PushChannelSubscriptionObject = {
  channel?: string;
  deviceId?: string;
  clientId?: string;
};

class PushChannelSubscription {
  channel?: string;
  deviceId?: string;
  clientId?: string;

  /**
   * Overload toJSON() to intercept JSON.stringify()
   * @return {*}
   */
  toJSON(): PushChannelSubscriptionObject {
    return {
      channel: this.channel,
      deviceId: this.deviceId,
      clientId: this.clientId,
    };
  }

  toString(): string {
    let result = '[PushChannelSubscription';
    if (this.channel) result += '; channel=' + this.channel;
    if (this.deviceId) result += '; deviceId=' + this.deviceId;
    if (this.clientId) result += '; clientId=' + this.clientId;
    result += ']';
    return result;
  }

  static toRequestBody = Utils.encodeBody;

  static fromResponseBody(
    body: Array<Record<string, unknown>> | Record<string, unknown>,
    format?: Utils.Format
  ): PushChannelSubscription | PushChannelSubscription[] {
    if (format) {
      body = Utils.decodeBody(body, format) as Record<string, unknown>;
    }

    if (Utils.isArray(body)) {
      return PushChannelSubscription.fromValuesArray(body);
    } else {
      return PushChannelSubscription.fromValues(body);
    }
  }

  static fromValues(values: Record<string, unknown>): PushChannelSubscription {
    return Object.assign(new PushChannelSubscription(), values);
  }

  static fromValuesArray(values: Array<Record<string, unknown>>): PushChannelSubscription[] {
    const count = values.length,
      result = new Array(count);
    for (let i = 0; i < count; i++) result[i] = PushChannelSubscription.fromValues(values[i]);
    return result;
  }
}

export default PushChannelSubscription;
