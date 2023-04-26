'use strict';

define(['shared_helper', 'async', 'chai'], function (helper, async, chai) {
  var expect = chai.expect;
  var utils = helper.Utils;
  var goodHost;

  describe('rest/fallbacks', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      helper.setupApp(function (err) {
        if (err) {
          done(err);
          return;
        }
        goodHost = helper.AblyRestPromise().options.restHost;
        done();
      });
    });

    /* RSC15f */
    it('Store working fallback', async function () {
      var rest = helper.AblyRestPromise({
        restHost: helper.unroutableHost,
        fallbackHosts: [goodHost],
        httpRequestTimeout: 3000,
        logLevel: 4,
      });
      var validUntil;
      var serverTime = await rest.time();
      expect(serverTime, 'Check serverTime returned').to.be.ok;
      var currentFallback = rest._currentFallback;
      expect(currentFallback, 'Check current fallback stored').to.be.ok;
      expect(currentFallback && currentFallback.host).to.equal(goodHost, 'Check good host set');
      validUntil = currentFallback.validUntil;
      /* now try again, check that this time it uses the remembered good endpoint straight away */
      var serverTime = await rest.time();
      expect(serverTime, 'Check serverTime returned').to.be.ok;
      var currentFallback = rest._currentFallback;
      expect(currentFallback.validUntil).to.equal(
        validUntil,
        'Check validUntil is the same (implying currentFallback has not been re-set)'
      );
      /* set the validUntil to the past and check that the stored fallback is forgotten */
      var now = utils.now();
      rest._currentFallback.validUntil = now - 1000;
      var serverTime = await rest.time();
      expect(serverTime, 'Check serverTime returned').to.be.ok;
      var currentFallback = rest._currentFallback;
      expect(currentFallback, 'Check current fallback re-stored').to.be.ok;
      expect(currentFallback && currentFallback.host).to.equal(goodHost, 'Check good host set again');
      expect(currentFallback.validUntil > now, 'Check validUntil has been re-set').to.be.ok;
    });
  });
});
