'use strict';

define(['ably', 'shared_helper', 'chai'], function (Ably, helper, chai) {
  var rest;
  var expect = chai.expect;
  var Defaults = Ably.Rest.Platform.Defaults;

  describe('rest/http', function () {
    this.timeout(60 * 1000);
    before(function (done) {
      helper.setupApp(function () {
        rest = helper.AblyRest({
          agents: {
            'custom-agent': '0.1.2',
          },
        });
        done();
      });
    });

    /**
     * RSC7a
     */
    it('Should send X-Ably-Version and Ably-Agent headers in get/post requests', function (done) {
      //Intercept Http.do with test
      function testRequestHandler(_, __, ___, headers) {
        try {
          expect('X-Ably-Version' in headers, 'Verify version header exists').to.be.ok;
          expect('Ably-Agent' in headers, 'Verify agent header exists').to.be.ok;

          // This test should not directly validate version against Defaults.version, as
          // ultimately the version header has been derived from that value.
          expect(headers['X-Ably-Version']).to.equal('2', 'Verify current version number');
          expect(headers['Ably-Agent'].indexOf('ably-js/' + Defaults.version) > -1, 'Verify agent').to.be.ok;
          expect(headers['Ably-Agent'].indexOf('custom-agent/0.1.2') > -1, 'Verify custom agent').to.be.ok;

          // We don't test on NativeScript so a check for that platform is excluded here
          if (typeof document !== 'undefined') {
            // browser
            expect(headers['Ably-Agent'].indexOf('browser') > -1, 'Verify agent').to.be.ok;
          } else if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
            // reactnative
            expect(headers['Ably-Agent'].indexOf('reactnative') > -1, 'Verify agent').to.be.ok;
          } else {
            // node
            expect(headers['Ably-Agent'].indexOf('nodejs') > -1, 'Verify agent').to.be.ok;
          }
        } catch (err) {
          done(err);
        }
      }

      rest.http.do = testRequestHandler;

      // Call all methods that use rest http calls
      rest.auth.requestToken();
      rest.time();
      rest.stats();
      var channel = rest.channels.get('http_test_channel');
      channel.publish('test', 'Testing http headers');
      channel.presence.get();

      done();
    });

    it('Should handle no content responses', function (done) {
      //Intercept Http.do with test

      function testRequestHandler(_, __, ___, ____, _____, ______, callback) {
        callback(null, null, null, false, 204);
      }

      rest.http.do = testRequestHandler;

      rest.request('GET', '/foo', {}, null, {}, (error, response) => {
        try {
          expect(error).to.be.null;
          expect(response.statusCode).to.equal(204);
          expect(response.items).to.be.empty;
          done();
        } catch (err) {
          done(err);
        }
      });
    });
  });
});
