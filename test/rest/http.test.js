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
    it('Should send X-Ably-Version and Ably-Agent headers in get/post requests', async function () {
      var originalDo = rest.http.do;

      // Intercept Http.do with test
      function testRequestHandler(method, path, headers, body, params, callback) {
        expect('X-Ably-Version' in headers, 'Verify version header exists').to.be.ok;
        expect('Ably-Agent' in headers, 'Verify agent header exists').to.be.ok;

        // This test should not directly validate version against Defaults.version, as
        // ultimately the version header has been derived from that value.
        expect(headers['X-Ably-Version']).to.equal('3', 'Verify current version number');
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

        originalDo.call(rest.http, method, path, headers, body, params, callback);
      }

      rest.http.do = testRequestHandler;

      // Call all methods that use rest http calls
      await rest.auth.requestToken();
      await rest.time();
      await rest.stats();
      var channel = rest.channels.get('http_test_channel');
      await channel.publish('test', 'Testing http headers');
      await channel.presence.get();
    });
  });
});
