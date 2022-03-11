'use strict';

define(['shared_helper', 'chai'], function (helper, chai) {
  var rest;
  var utils = helper.Utils;
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

    it('time0', function (done) {
      rest.time(function (err, serverTime) {
        if (err) {
          done(err);
          return;
        }
        try {
          var localFiveMinutesAgo = utils.now() - 5 * 60 * 1000;
          expect(
            serverTime > localFiveMinutesAgo,
            'Verify returned time matches current local time with 5 minute leeway for badly synced local clocks',
          ).to.be.ok;
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    if (typeof Promise !== 'undefined') {
      it('timePromise', function (done) {
        var rest = helper.AblyRest({ promises: true });
        rest
          .time()
          .then(function () {
            done();
          })
          ['catch'](function (err) {
            done(err);
          });
      });
    }
  });
});
