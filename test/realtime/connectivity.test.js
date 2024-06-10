'use strict';

define(['ably', 'shared_helper', 'chai'], function (Ably, Helper, chai) {
  var expect = chai.expect;

  describe('realtime/connectivity', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      const helper = Helper.forHook(this);
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
      const helper = this.helper;
      Helper.whenPromiseSettles(new Ably.Realtime._Http().checkConnectivity(), function (err, res) {
        try {
          expect(res && !err, 'Connectivity check completed ' + (err && helper.Utils.inspectError(err))).to.be.ok;
        } catch (err) {
          done(err);
          return;
        }
        done();
      });
    });

    function options(connectivityCheckUrl, disableConnectivityCheck) {
      return {
        connectivityCheckUrl,
        disableConnectivityCheck,
        autoConnect: false,
      };
    }

    describe('configured_connectivity_check_url', function () {
      var urlScheme = 'https://';
      var echoServer = 'echo.ably.io';
      var successUrl = echoServer + '/respondwith?status=200';
      var failUrl = echoServer + '/respondwith?status=500';

      it('succeeds with scheme', function (done) {
        const helper = this.helper;
        Helper.whenPromiseSettles(
          helper.AblyRealtime(options(urlScheme + successUrl)).http.checkConnectivity(),
          function (err, res) {
            try {
              expect(res && !err, 'Connectivity check completed ' + (err && helper.Utils.inspectError(err))).to.be.ok;
            } catch (err) {
              done(err);
              return;
            }
            done();
          },
        );
      });

      it('fails with scheme', function (done) {
        const helper = this.helper;
        Helper.whenPromiseSettles(
          helper.AblyRealtime(options(urlScheme + failUrl)).http.checkConnectivity(),
          function (err, res) {
            try {
              expect(!res, 'Connectivity check expected to return false').to.be.ok;
              done();
            } catch (err) {
              done(err);
            }
          },
        );
      });

      it('succeeds with querystring', function (done) {
        const helper = this.helper;
        Helper.whenPromiseSettles(
          helper.AblyRealtime(options(successUrl)).http.checkConnectivity(),
          function (err, res) {
            try {
              expect(res && !err, 'Connectivity check completed ' + (err && helper.Utils.inspectError(err))).to.be.ok;
              done();
            } catch (err) {
              done(err);
            }
          },
        );
      });

      it('fails with querystring', function (done) {
        const helper = this.helper;
        Helper.whenPromiseSettles(helper.AblyRealtime(options(failUrl)).http.checkConnectivity(), function (err, res) {
          try {
            expect(!res, 'Connectivity check expected to return false').to.be.ok;
            done();
          } catch (err) {
            done(err);
          }
        });
      });

      it('succeeds with plain url', function (done) {
        const helper = this.helper;
        Helper.whenPromiseSettles(
          helper.AblyRealtime(options('sandbox-rest.ably.io/time')).http.checkConnectivity(),
          function (err, res) {
            try {
              expect(res && !err, 'Connectivity check completed ' + (err && helper.Utils.inspectError(err))).to.be.ok;
              done();
            } catch (err) {
              done(err);
            }
          },
        );
      });

      it('fails with plain url', function (done) {
        const helper = this.helper;
        Helper.whenPromiseSettles(
          helper.AblyRealtime(options('echo.ably.io')).http.checkConnectivity(),
          function (err, res) {
            try {
              expect(!res, 'Connectivity check expected to return false').to.be.ok;
              done();
            } catch (err) {
              done(err);
            }
          },
        );
      });
    });

    it('disable_connectivity_check', function (done) {
      const helper = this.helper;
      Helper.whenPromiseSettles(
        helper.AblyRealtime(options('notarealhost', true)).http.checkConnectivity(),
        function (err, res) {
          try {
            expect(res && !err, 'Connectivity check completed ' + (err && helper.Utils.inspectError(err))).to.be.ok;
            done();
          } catch (err) {
            done(err);
          }
        },
      );
    });
  });
});
