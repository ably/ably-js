import Platform from 'common/platform';
import * as Utils from '../util/utils';

export default class ErrorInfo {
  message: string;
  code: number | null;
  statusCode?: number;
  cause?: string | Error | ErrorInfo;
  href?: string;

  constructor(message: string, code: number | null, statusCode?: number, cause?: string | Error | ErrorInfo) {
    this.message = message;
    this.code = code;
    this.statusCode = statusCode;
    this.cause = cause;
  }

  toString(): string {
    let result = '[' + this.constructor.name;
    if (this.message) result += ': ' + this.message;
    if (this.statusCode) result += '; statusCode=' + this.statusCode;
    if (this.code) result += '; code=' + this.code;
    if (this.cause) result += '; cause=' + Utils.inspectError(this.cause);
    if (this.href && !(this.message && this.message.indexOf('help.ably.io') > -1)) result += '; see ' + this.href + ' ';
    result += ']';
    return result;
  }

  static fromValues(values: Record<string, unknown> | ErrorInfo | Error): ErrorInfo {
    const { message, code, statusCode } = values as ErrorInfo;
    if (typeof message !== 'string' || typeof code !== 'number' || typeof statusCode !== 'number') {
      throw new Error('ErrorInfo.fromValues(): invalid values: ' + Platform.Config.inspect(values));
    }
    const result = Object.assign(new ErrorInfo(message, code, statusCode), values);
    if (result.code && !result.href) {
      result.href = 'https://help.ably.io/error/' + result.code;
    }
    return result;
  }
}
