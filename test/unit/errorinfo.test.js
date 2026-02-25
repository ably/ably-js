'use strict';

define(['chai', 'ably'], function (chai, Ably) {
  const { expect } = chai;
  const ErrorInfo = Ably.ErrorInfo;

  describe('ErrorInfo', function () {
    describe('detail field', function () {
      it('should deserialise detail from server response via fromValues', function () {
        const serverError = {
          message: 'Message rejected by BeforePublish rule',
          code: 42211,
          statusCode: 400,
          detail: { reason: 'content policy violation', category: 'moderation' },
        };

        const errorInfo = ErrorInfo.fromValues(serverError);

        expect(errorInfo).to.be.instanceOf(ErrorInfo);
        expect(errorInfo.code).to.equal(42211);
        expect(errorInfo.message).to.equal('Message rejected by BeforePublish rule');
        expect(errorInfo.detail).to.deep.equal({ reason: 'content policy violation', category: 'moderation' });
      });

      it('should not include detail when absent in server response', function () {
        const serverError = {
          message: 'Some error',
          code: 50000,
          statusCode: 500,
        };

        const errorInfo = ErrorInfo.fromValues(serverError);

        expect(errorInfo.detail).to.be.undefined;
      });

      it('should include detail in toString output when present', function () {
        const serverError = {
          message: 'Rejected',
          code: 42211,
          statusCode: 400,
          detail: { reason: 'spam' },
        };

        const errorInfo = ErrorInfo.fromValues(serverError);
        const str = errorInfo.toString();

        expect(str).to.contain('detail=');
        expect(str).to.contain('"reason":"spam"');
      });

      it('should not include detail in toString when absent', function () {
        const serverError = {
          message: 'Some error',
          code: 50000,
          statusCode: 500,
        };

        const errorInfo = ErrorInfo.fromValues(serverError);
        const str = errorInfo.toString();

        expect(str).to.not.contain('detail=');
      });
    });
  });
});
