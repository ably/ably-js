import Platform from 'common/platform';
import * as Utils from '../util/utils';
import * as API from '../../../../ably';

export interface IPartialErrorInfo extends Error {
  code: number | null;
  statusCode?: number;
  cause?: string | Error | ErrorInfo;
  href?: string;
}

function toString(err: ErrorInfo | PartialErrorInfo) {
  let result = '[' + err.constructor.name;
  if (err.message) result += ': ' + err.message;
  if (err.statusCode) result += '; statusCode=' + err.statusCode;
  if (err.code) result += '; code=' + err.code;
  if (err.cause) result += '; cause=' + Utils.inspectError(err.cause);
  if (err.href && !(err.message && err.message.indexOf('help.ably.io') > -1)) result += '; see ' + err.href + ' ';
  result += ']';
  return result;
}

export default class ErrorInfo extends Error implements IPartialErrorInfo, API.Types.ErrorInfo {
  code: number;
  statusCode: number;
  cause?: string | Error | ErrorInfo;
  href?: string;

  constructor(message: string, code: number, statusCode: number, cause?: string | Error | ErrorInfo) {
    super(message);
    if (typeof Object.setPrototypeOf !== 'undefined') {
      Object.setPrototypeOf(this, ErrorInfo.prototype);
    }
    this.code = code;
    this.statusCode = statusCode;
    this.cause = cause;
  }

  toString(): string {
    return toString(this);
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

export class PartialErrorInfo extends Error implements IPartialErrorInfo {
  code: number | null;
  statusCode?: number;
  cause?: string | Error | ErrorInfo;
  href?: string;

  constructor(message: string, code: number | null, statusCode?: number, cause?: string | Error | ErrorInfo) {
    super(message);
    if (typeof Object.setPrototypeOf !== 'undefined') {
      Object.setPrototypeOf(this, PartialErrorInfo.prototype);
    }
    this.code = code;
    this.statusCode = statusCode;
    this.cause = cause;
  }

  toString(): string {
    return toString(this);
  }
}
