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
      new Ably.Realtime.Platform.Http().checkConnectivity(function (res) {
        try {
          expect(res).to.be.ok;
        } catch (err) {
          done(err);
          return;
        }
        done();
      });
    });

    describe('configured_connectivity_check_url', function () {
      var urlScheme = 'https://';
      var echoServer = 'echo.ably.io';
      var successUrl = echoServer + '/respondwith?status=200';
      var failUrl = echoServer + '/respondwith?status=500';

      function options(connectivityCheckUrl) {
        return {
          connectivityCheckUrl: connectivityCheckUrl,
          autoConnect: false,
        };
      }

      it('succeeds with scheme', function (done) {
        new helper.AblyRealtime(options(urlScheme + successUrl)).http.checkConnectivity(function (res) {
          try {
            expect(res).to.be.ok;
          } catch (err) {
            done(err);
            return;
          }
          done();
        });
      });

      it('fails with scheme', function (done) {
        new helper.AblyRealtime(options(urlScheme + failUrl)).http.checkConnectivity(function (res) {
          try {
            expect(!res, 'Connectivity check expected to return false').to.be.ok;
            done();
          } catch (err) {
            done(err);
          }
        });
      });

      it('succeeds with querystring', function (done) {
        new helper.AblyRealtime(options(successUrl)).http.checkConnectivity(function (res) {
          try {
            expect(res).to.be.ok;
            done();
          } catch (err) {
            done(err);
          }
        });
      });

      it('fails with querystring', function (done) {
        new helper.AblyRealtime(options(failUrl)).http.checkConnectivity(function (res) {
          try {
            expect(!res, 'Connectivity check expected to return false').to.be.ok;
            done();
          } catch (err) {
            done(err);
          }
        });
      });

      it('succeeds with plain url', function (done) {
        new helper.AblyRealtime(options('sandbox-rest.ably.io/time')).http.checkConnectivity(function (res) {
          try {
            expect(res).to.be.ok;
            done();
          } catch (err) {
            done(err);
          }
        });
      });

      it('fails with plain url', function (done) {
        new helper.AblyRealtime(options('echo.ably.io')).http.checkConnectivity(function (res) {
          try {
            expect(!res, 'Connectivity check expected to return false').to.be.ok;
            done();
          } catch (err) {
            done(err);
          }
        });
      });
    });

    it('disable_connectivity_check', function (done) {
      new helper.AblyRealtime({
        connectivityCheckUrl: 'notarealhost',
        disableConnectivityCheck: true,
      }).http.checkConnectivity(function (res) {
        try {
          expect(res).to.be.ok;
          done();
        } catch (err) {
          done(err);
        }
      });
    });
  });
});
