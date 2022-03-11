import * as Utils from '../util/utils';
import ErrorInfo from './errorinfo';

enum DeviceFormFactor {
  Phone = 'phone',
  Tablet = 'tablet',
  Desktop = 'desktop',
  TV = 'tv',
  Watch = 'watch',
  Car = 'car',
  Embedded = 'embedded',
  Other = 'other',
}

enum DevicePlatform {
  Android = 'android',
  IOS = 'ios',
  Browser = 'browser',
}

type DevicePushState = 'ACTIVE' | 'FAILING' | 'FAILED';

type DevicePushDetails = {
  error?: ErrorInfo;
  recipient?: string;
  state?: DevicePushState;
  metadata?: string;
};

class DeviceDetails {
  id?: string;
  clientId?: string;
  deviceSecret?: string;
  formFactor?: DeviceFormFactor;
  platform?: DevicePlatform;
  push?: DevicePushDetails;
  metadata?: string;
  deviceIdentityToken?: string;

  toJSON(): DeviceDetails {
    return {
      id: this.id,
      deviceSecret: this.deviceSecret,
      platform: this.platform,
      formFactor: this.formFactor,
      clientId: this.clientId,
      metadata: this.metadata,
      deviceIdentityToken: this.deviceIdentityToken,
      push: {
        recipient: this.push?.recipient,
        state: this.push?.state,
        error: this.push?.error,
      },
    } as DeviceDetails;
  }

  toString(): string {
    let result = '[DeviceDetails';
    if (this.id) result += '; id=' + this.id;
    if (this.platform) result += '; platform=' + this.platform;
    if (this.formFactor) result += '; formFactor=' + this.formFactor;
    if (this.clientId) result += '; clientId=' + this.clientId;
    if (this.metadata) result += '; metadata=' + this.metadata;
    if (this.deviceIdentityToken) result += '; deviceIdentityToken=' + JSON.stringify(this.deviceIdentityToken);
    if (this.push?.recipient) result += '; push.recipient=' + JSON.stringify(this.push.recipient);
    if (this.push?.state) result += '; push.state=' + this.push.state;
    if (this.push?.error) result += '; push.error=' + JSON.stringify(this.push.error);
    if (this.push?.metadata) result += '; push.metadata=' + this.push.metadata;
    result += ']';
    return result;
  }

  static toRequestBody = Utils.encodeBody;

  static fromResponseBody(
    body: Array<Record<string, unknown>> | Record<string, unknown>,
    format?: Utils.Format
  ): DeviceDetails | DeviceDetails[] {
    if (format) {
      body = Utils.decodeBody(body, format);
    }

    if (Utils.isArray(body)) {
      return DeviceDetails.fromValuesArray(body);
    } else {
      return DeviceDetails.fromValues(body);
    }
  }

  static fromValues(values: Record<string, unknown>): DeviceDetails {
    values.error = values.error && ErrorInfo.fromValues(values.error as Error);
    return Object.assign(new DeviceDetails(), values);
  }

  static fromValuesArray(values: Array<Record<string, unknown>>): DeviceDetails[] {
    const count = values.length,
      result = new Array(count);
    for (let i = 0; i < count; i++) result[i] = DeviceDetails.fromValues(values[i]);
    return result;
  }
}

export default DeviceDetails;
