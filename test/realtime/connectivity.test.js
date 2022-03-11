'use strict';

define(['ably', 'shared_helper', 'chai'], function (Ably, helper, chai) {
  var expect = chai.expect;
  var closeAndFinish = helper.closeAndFinish;
  var monitorConnection = helper.monitorConnection;
  var utils = helper.Utils;

  describe('realtime/connectivity', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      helper.setupApp(function (err) {
        if (err) {
          done(err);
        }
        done();
      });
    });

    /*
     * Connect with available http transports; internet connectivity check should work
     */
    it('http_connectivity_check', function (done) {
      new Ably.Realtime.Http().checkConnectivity(function (err, res) {
        try {
          expect(res && !err, 'Connectivity check completed ' + (err && utils.inspectError(err))).to.be.ok;
        } catch (err) {
          done(err);
          return;
        }
        done();
      });
    });
  });
});
