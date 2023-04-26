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

    it('Init with key string', function () {
      var keyStr = helper.getTestApp().keys[0].keyStr;
      var rest = new helper.Ably.Rest.Promise(keyStr);

      expect(rest.options.key).to.equal(keyStr);
    });

    it('Init with token string', async function () {
      /* first generate a token ... */
      var rest = helper.AblyRestPromise();
      var testKeyOpts = { key: helper.getTestApp().keys[1].keyStr };

      var tokenDetails = await rest.auth.requestToken(null, testKeyOpts);
      var tokenStr = tokenDetails.token,
        rest = new helper.Ably.Rest.Promise(tokenStr);

      expect(rest.options.token).to.equal(tokenStr);
    });

    it('Init with tls: false', function () {
      var rest = helper.AblyRestPromise({ tls: false, port: 123, tlsPort: 456 });
      expect(rest.baseUri('example.com')).to.equal('http://example.com:123');
    });

    it('Init with tls: true', function () {
      var rest = helper.AblyRestPromise({ tls: true, port: 123, tlsPort: 456 });
      expect(rest.baseUri('example.com')).to.equal('https://example.com:456');
    });

    /* init without any tls key should enable tls */
    it('Init without any tls key should enable tls', function () {
      var rest = helper.AblyRestPromise({ port: 123, tlsPort: 456 });
      expect(rest.baseUri('example.com')).to.equal('https://example.com:456');
    });

    it("Init with clientId set to '*' or anything other than a string or null should error", function () {
      expect(function () {
        var rest = helper.AblyRestPromise({ clientId: '*' });
      }, 'Check can’t init library with a wildcard clientId').to.throw;
      expect(function () {
        var rest = helper.AblyRestPromise({ clientId: 123 });
      }, 'Check can’t init library with a numerical clientId').to.throw;
      expect(function () {
        var rest = helper.AblyRestPromise({ clientId: false });
      }, 'Check can’t init library with a boolean clientId').to.throw;
    });

    it('Init promises', function () {
      var rest,
        keyStr = helper.getTestApp().keys[0].keyStr;

      rest = new Ably.Rest.Promise(keyStr);
      expect(rest.options.promises, 'Check promises default to true with promise constructor').to.be.ok;

      if (!isBrowser && typeof require == 'function') {
        var AblyPromises = require('../../promises');
        rest = new AblyPromises.Rest(keyStr);
        expect(rest.options.promises, 'Check promises default to true with promise require target').to.be.ok;
      }
    });
  });
});
