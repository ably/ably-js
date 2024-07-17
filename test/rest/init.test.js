'use strict';

define(['ably', 'shared_helper', 'chai'], function (Ably, helper, chai) {
  var expect = chai.expect;

  describe('rest/init', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      helper.setupApp(function (err) {
        if (err) {
          done(err);
          return;
        }
        done();
      });
    });

    /**
     * @specpartial RSC1a - test with key string
     * @specpartial RSC1c - test with key string
     */
    it('Init with key string', function () {
      var keyStr = helper.getTestApp().keys[0].keyStr;
      var rest = new helper.Ably.Rest(keyStr);

      expect(rest.options.key).to.equal(keyStr);
    });

    /**
     * @specpartial RSC1a - test with token string
     * @specpartial RSC1c - test with token string
     */
    it('Init with token string', async function () {
      /* first generate a token ... */
      var rest = helper.AblyRest();
      var testKeyOpts = { key: helper.getTestApp().keys[1].keyStr };

      var tokenDetails = await rest.auth.requestToken(null, testKeyOpts);
      var tokenStr = tokenDetails.token,
        rest = new helper.Ably.Rest(tokenStr);

      expect(rest.options.token).to.equal(tokenStr);
    });

    /**
     * @spec RSC18
     * @spec TO3d
     * @spec TO3k4
     * @spec TO3k5
     */
    it('Init with tls: false', function () {
      var rest = helper.AblyRest({ tls: false, port: 123, tlsPort: 456 });
      expect(rest.baseUri('example.com')).to.equal('http://example.com:123');
    });

    /**
     * @spec RSC18
     * @spec TO3d
     * @spec TO3k5
     */
    it('Init with tls: true', function () {
      var rest = helper.AblyRest({ tls: true, port: 123, tlsPort: 456 });
      expect(rest.baseUri('example.com')).to.equal('https://example.com:456');
    });

    /**
     * Init without any tls key should enable tls.
     *
     * @spec RSC18
     * @spec TO3d
     * @spec TO3k5
     */

    it('Init without any tls key should enable tls', function () {
      var rest = helper.AblyRest({ port: 123, tlsPort: 456 });
      expect(rest.baseUri('example.com')).to.equal('https://example.com:456');
    });

    /**
     * @spec RSC17
     * @spec RSA15a
     * @spec RSA15c
     */
    it("Init with clientId set to '*' or anything other than a string or null should error", function () {
      expect(function () {
        var rest = helper.AblyRest({ clientId: '*' });
      }, 'Check can’t init library with a wildcard clientId').to.throw;
      expect(function () {
        var rest = helper.AblyRest({ clientId: 123 });
      }, 'Check can’t init library with a numerical clientId').to.throw;
      expect(function () {
        var rest = helper.AblyRest({ clientId: false });
      }, 'Check can’t init library with a boolean clientId').to.throw;
    });
  });
});
