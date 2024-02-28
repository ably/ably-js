'use strict';

define(['shared_helper', 'chai'], function (helper, chai) {
  var rest;
  var expect = chai.expect;

  describe('rest/time', function () {
    before(function (done) {
      helper.setupApp(function (err) {
        if (err) {
          done(err);
          return;
        }
        rest = helper.AblyRest();
        done();
      });
    });

    it('time0', async function () {
      var serverTime = await rest.time();
      var localFiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      expect(
        serverTime > localFiveMinutesAgo,
        'Verify returned time matches current local time with 5 minute leeway for badly synced local clocks'
      ).to.be.ok;
    });
  });
});
