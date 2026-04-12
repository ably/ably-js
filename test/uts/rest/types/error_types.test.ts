/**
 * UTS: ErrorInfo Type Tests
 *
 * Spec points: TI1, TI2, TI3, TI4, TI5
 * Source: uts/test/rest/unit/types/error_types.md
 */

import { expect } from 'chai';
import { Ably } from '../../helpers';

describe('uts/rest/types/error_types', function () {
  /**
   * TI1 - code attribute
   */
  it('TI1 - code attribute', function () {
    const error = new Ably.ErrorInfo('Bad request', 40000, 400);
    expect(error.code).to.equal(40000);
  });

  /**
   * TI2 - statusCode attribute
   */
  it('TI2 - statusCode attribute', function () {
    const error = new Ably.ErrorInfo('Unauthorized', 40100, 401);
    expect(error.statusCode).to.equal(401);
  });

  /**
   * TI3 - message attribute
   */
  it('TI3 - message attribute', function () {
    const error = new Ably.ErrorInfo('Bad request: invalid parameter', 40000, 400);
    expect(error.message).to.equal('Bad request: invalid parameter');
  });

  /**
   * TI4 - href attribute (auto-generated from code)
   */
  it('TI4 - href attribute', function () {
    const error = Ably.ErrorInfo.fromValues({
      code: 40000,
      statusCode: 400,
      message: 'Bad request',
    });
    expect(error.href).to.equal('https://help.ably.io/error/40000');
  });

  /**
   * TI5 - cause attribute
   */
  it('TI5 - cause attribute', function () {
    const cause = new Error('Network failure');
    const error = Ably.ErrorInfo.fromValues({
      code: 50003,
      statusCode: 500,
      message: 'Timeout',
      cause: cause,
    });
    expect(error.cause).to.equal(cause);
  });

  /**
   * TI - ErrorInfo is an Error instance
   */
  it('TI - ErrorInfo is an Error instance', function () {
    const error = new Ably.ErrorInfo('test', 40000, 400);
    expect(error).to.be.an.instanceOf(Error);
  });

  /**
   * TI - ErrorInfo from JSON-like object
   */
  it('TI - ErrorInfo from object', function () {
    const error = Ably.ErrorInfo.fromValues({
      code: 40100,
      statusCode: 401,
      message: 'Token expired',
    });

    expect(error.code).to.equal(40100);
    expect(error.statusCode).to.equal(401);
    expect(error.message).to.equal('Token expired');
    expect(error.href).to.equal('https://help.ably.io/error/40100');
  });

  /**
   * TI - Common error codes
   */
  it('TI - common error codes', function () {
    const cases = [
      { code: 40000, status: 400, meaning: 'Bad request' },
      { code: 40100, status: 401, meaning: 'Unauthorized' },
      { code: 40101, status: 401, meaning: 'Invalid credentials' },
      { code: 40140, status: 401, meaning: 'Token error' },
      { code: 40142, status: 401, meaning: 'Token expired' },
      { code: 40160, status: 401, meaning: 'Invalid capability' },
      { code: 40300, status: 403, meaning: 'Forbidden' },
      { code: 40400, status: 404, meaning: 'Not found' },
      { code: 50000, status: 500, meaning: 'Internal server error' },
      { code: 50003, status: 500, meaning: 'Timeout' },
    ];

    for (const tc of cases) {
      const error = new Ably.ErrorInfo(tc.meaning, tc.code, tc.status);
      expect(error.code).to.equal(tc.code);
      expect(error.statusCode).to.equal(tc.status);
    }
  });

  /**
   * TI - Error string representation
   */
  it('TI - string representation', function () {
    const error = new Ably.ErrorInfo('Unauthorized: token expired', 40100, 401);
    const str = error.toString();
    expect(str).to.include('40100');
    expect(str).to.include('401');
  });
});
