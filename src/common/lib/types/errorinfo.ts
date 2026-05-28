import Platform from 'common/platform';
import * as Utils from '../util/utils';
import * as API from '../../../../ably';

export interface IPartialErrorInfo extends Error {
  code: number | null;
  statusCode?: number;
  cause?: ErrorInfo | PartialErrorInfo;
  href?: string;
  detail?: Record<string, string>;
  hint?: string;
}

function toString(err: ErrorInfo | PartialErrorInfo) {
  let result = '[' + err.constructor.name;
  if (err.message) result += ': ' + err.message;
  if (err.statusCode) result += '; statusCode=' + err.statusCode;
  if (err.code) result += '; code=' + err.code;
  if (err.cause) result += '; cause=' + Utils.inspectError(err.cause);
  if (err.hint) result += '; hint=' + err.hint;
  if (err.detail && Object.keys(err.detail).length > 0) result += '; detail=' + JSON.stringify(err.detail);
  if (err.href && !(err.message && err.message.indexOf('help.ably.io') > -1)) result += '; see ' + err.href + ' ';
  result += ']';
  return result;
}

export interface IConvertibleToErrorInfo {
  message: string;
  code: number;
  statusCode: number;
  detail?: Record<string, string>;
  hint?: string;
  cause?: ErrorInfo | PartialErrorInfo;
  href?: string;
}

export interface IConvertibleToPartialErrorInfo {
  message: string;
  code: number | null;
  statusCode?: number;
  detail?: Record<string, string>;
  hint?: string;
  cause?: ErrorInfo | PartialErrorInfo;
  href?: string;
}

export default class ErrorInfo extends Error implements IPartialErrorInfo, API.ErrorInfo {
  code: number;
  statusCode: number;
  cause?: ErrorInfo;
  href?: string;
  detail?: Record<string, string>;
  hint?: string;

  constructor(message: string, code: number, statusCode: number, cause?: ErrorInfo, detail?: Record<string, string>);
  constructor(values: IConvertibleToErrorInfo);
  constructor(
    messageOrValues: string | IConvertibleToErrorInfo,
    code?: number,
    statusCode?: number,
    cause?: ErrorInfo,
    detail?: Record<string, string>,
  ) {
    if (typeof messageOrValues === 'object') {
      const values = messageOrValues;
      if (
        typeof values.message !== 'string' ||
        typeof values.code !== 'number' ||
        typeof values.statusCode !== 'number' ||
        (!Utils.isNil(values.detail) && (typeof values.detail !== 'object' || Array.isArray(values.detail)))
      ) {
        throw new Error('ErrorInfo: invalid values: ' + Platform.Config.inspect(values));
      }
      super(values.message);
      if (typeof Object.setPrototypeOf !== 'undefined') {
        Object.setPrototypeOf(this, ErrorInfo.prototype);
      }
      this.code = values.code;
      this.statusCode = values.statusCode;
      this.detail = values.detail;
      Object.assign(this, values);
    } else {
      super(messageOrValues);
      if (typeof Object.setPrototypeOf !== 'undefined') {
        Object.setPrototypeOf(this, ErrorInfo.prototype);
      }
      this.code = code as number;
      this.statusCode = statusCode as number;
      this.cause = cause;
      this.detail = detail;
    }
  }

  toString(): string {
    return toString(this);
  }

  static fromValues(values: IConvertibleToErrorInfo): ErrorInfo {
    // Delegate shape validation and field assignment to the options-object constructor;
    // fromValues only adds the help.ably.io href default for server-decoded errors that
    // arrive without one. SDK-thrown errors that use `new ErrorInfo({...})` directly do
    // not get this default, by design.
    const result = new ErrorInfo(values);
    if (result.code && !result.href) {
      result.href = 'https://help.ably.io/error/' + result.code;
    }
    return result;
  }
}

export class PartialErrorInfo extends Error implements IPartialErrorInfo {
  code: number | null;
  statusCode?: number;
  cause?: ErrorInfo | PartialErrorInfo;
  href?: string;
  detail?: Record<string, string>;
  hint?: string;

  constructor(
    message: string,
    code: number | null,
    statusCode?: number,
    cause?: ErrorInfo | PartialErrorInfo,
    detail?: Record<string, string>,
  );
  constructor(values: IConvertibleToPartialErrorInfo);
  constructor(
    messageOrValues: string | IConvertibleToPartialErrorInfo,
    code?: number | null,
    statusCode?: number,
    cause?: ErrorInfo | PartialErrorInfo,
    detail?: Record<string, string>,
  ) {
    if (typeof messageOrValues === 'object') {
      const values = messageOrValues;
      if (
        typeof values.message !== 'string' ||
        (!Utils.isNil(values.code) && typeof values.code !== 'number') ||
        (!Utils.isNil(values.statusCode) && typeof values.statusCode !== 'number') ||
        (!Utils.isNil(values.detail) && (typeof values.detail !== 'object' || Array.isArray(values.detail)))
      ) {
        throw new Error('PartialErrorInfo: invalid values: ' + Platform.Config.inspect(values));
      }
      super(values.message);
      if (typeof Object.setPrototypeOf !== 'undefined') {
        Object.setPrototypeOf(this, PartialErrorInfo.prototype);
      }
      this.code = values.code;
      this.statusCode = values.statusCode;
      this.detail = values.detail;
      Object.assign(this, values);
    } else {
      super(messageOrValues);
      if (typeof Object.setPrototypeOf !== 'undefined') {
        Object.setPrototypeOf(this, PartialErrorInfo.prototype);
      }
      this.code = code as number | null;
      this.statusCode = statusCode;
      this.cause = cause;
      this.detail = detail;
    }
  }

  toString(): string {
    return toString(this);
  }

  static fromValues(values: IConvertibleToPartialErrorInfo): PartialErrorInfo {
    // Same shape as ErrorInfo.fromValues - delegate validation/assignment to the
    // options-object constructor; href default applies only to the server-decoded path.
    const result = new PartialErrorInfo(values);
    if (result.code && !result.href) {
      result.href = 'https://help.ably.io/error/' + result.code;
    }
    return result;
  }
}
