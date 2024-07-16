'use strict';

define(['ably', 'chai'], function (Ably, chai) {
  var expect = chai.expect;
  var Defaults = Ably.Realtime.Platform.Defaults;

  describe('rest/defaults', function () {
    it('Init with no endpoint-related options', function () {
      const helper = this.test.helper;

      helper.recordPrivateApi('call.Defaults.normaliseOptions');
      var normalisedOptions = Defaults.normaliseOptions({}, null, null);

      expect(normalisedOptions.restHost).to.equal('rest.ably.io');
      expect(normalisedOptions.realtimeHost).to.equal('realtime.ably.io');
      expect(normalisedOptions.port).to.equal(80);
      expect(normalisedOptions.tlsPort).to.equal(443);
      expect(normalisedOptions.fallbackHosts.sort()).to.deep.equal(Defaults.FALLBACK_HOSTS.sort());
      expect(normalisedOptions.tls).to.equal(true);

      helper.recordPrivateApi('call.Defaults.getHosts');
      expect(Defaults.getHosts(normalisedOptions).length).to.equal(4);
      expect(Defaults.getHosts(normalisedOptions)[0]).to.deep.equal(normalisedOptions.restHost);
      helper.recordPrivateApi('call.Defaults.getHost');
      expect(Defaults.getHost(normalisedOptions, 'rest.ably.io', false)).to.deep.equal('rest.ably.io');
      expect(Defaults.getHost(normalisedOptions, 'rest.ably.io', true)).to.equal('realtime.ably.io');

      helper.recordPrivateApi('call.Defaults.getPort');
      expect(Defaults.getPort(normalisedOptions)).to.equal(443);
    });

    it('Init with production environment', function () {
      const helper = this.test.helper;

      helper.recordPrivateApi('call.Defaults.normaliseOptions');
      var normalisedOptions = Defaults.normaliseOptions({ environment: 'production' }, null, null);

      expect(normalisedOptions.restHost).to.equal('rest.ably.io');
      expect(normalisedOptions.realtimeHost).to.equal('realtime.ably.io');
      expect(normalisedOptions.port).to.equal(80);
      expect(normalisedOptions.tlsPort).to.equal(443);
      expect(normalisedOptions.fallbackHosts.sort()).to.deep.equal(Defaults.FALLBACK_HOSTS.sort());
      expect(normalisedOptions.tls).to.equal(true);

      helper.recordPrivateApi('call.Defaults.getHosts');
      expect(Defaults.getHosts(normalisedOptions).length).to.deep.equal(4);
      expect(Defaults.getHosts(normalisedOptions)[0]).to.deep.equal(normalisedOptions.restHost);
      helper.recordPrivateApi('call.Defaults.getHost');
      expect(Defaults.getHost(normalisedOptions, 'rest.ably.io', false)).to.deep.equal('rest.ably.io');
      expect(Defaults.getHost(normalisedOptions, 'rest.ably.io', true)).to.deep.equal('realtime.ably.io');

      helper.recordPrivateApi('call.Defaults.getPort');
      expect(Defaults.getPort(normalisedOptions)).to.equal(443);
    });

    it('Init with given environment', function () {
      const helper = this.test.helper;

      helper.recordPrivateApi('call.Defaults.normaliseOptions');
      var normalisedOptions = Defaults.normaliseOptions({ environment: 'sandbox' }, null, null);

      expect(normalisedOptions.restHost).to.equal('sandbox-rest.ably.io');
      expect(normalisedOptions.realtimeHost).to.equal('sandbox-realtime.ably.io');
      expect(normalisedOptions.port).to.equal(80);
      expect(normalisedOptions.tlsPort).to.equal(443);
      expect(normalisedOptions.fallbackHosts.sort()).to.deep.equal(Defaults.environmentFallbackHosts('sandbox').sort());
      expect(normalisedOptions.tls).to.equal(true);

      helper.recordPrivateApi('call.Defaults.getHosts');
      expect(Defaults.getHosts(normalisedOptions).length).to.deep.equal(4);
      expect(Defaults.getHosts(normalisedOptions)[0]).to.deep.equal(normalisedOptions.restHost);
      helper.recordPrivateApi('call.Defaults.getHost');
      expect(Defaults.getHost(normalisedOptions, 'sandbox-rest.ably.io', false)).to.deep.equal('sandbox-rest.ably.io');
      expect(Defaults.getHost(normalisedOptions, 'sandbox-rest.ably.io', true)).to.deep.equal(
        'sandbox-realtime.ably.io',
      );

      helper.recordPrivateApi('call.Defaults.getPort');
      expect(Defaults.getPort(normalisedOptions)).to.equal(443);
    });

    it('Init with local environment and non-default ports', function () {
      const helper = this.test.helper;

      helper.recordPrivateApi('call.Defaults.normaliseOptions');
      var normalisedOptions = Defaults.normaliseOptions(
        { environment: 'local', port: 8080, tlsPort: 8081 },
        null,
        null,
      );

      expect(normalisedOptions.restHost).to.equal('local-rest.ably.io');
      expect(normalisedOptions.realtimeHost).to.equal('local-realtime.ably.io');
      expect(normalisedOptions.port).to.equal(8080);
      expect(normalisedOptions.tlsPort).to.equal(8081);
      expect(normalisedOptions.fallbackHosts).to.equal(undefined);
      expect(normalisedOptions.tls).to.equal(true);

      helper.recordPrivateApi('call.Defaults.getHosts');
      expect(Defaults.getHosts(normalisedOptions)).to.deep.equal([normalisedOptions.restHost]);
      helper.recordPrivateApi('call.Defaults.getHost');
      expect(Defaults.getHost(normalisedOptions, 'local-rest.ably.io', false)).to.deep.equal('local-rest.ably.io');
      expect(Defaults.getHost(normalisedOptions, 'local-rest.ably.io', true)).to.deep.equal('local-realtime.ably.io');

      helper.recordPrivateApi('call.Defaults.getPort');
      expect(Defaults.getPort(normalisedOptions)).to.equal(8081);
    });

    it('Init with given host', function () {
      const helper = this.test.helper;

      helper.recordPrivateApi('call.Defaults.normaliseOptions');
      var normalisedOptions = Defaults.normaliseOptions({ restHost: 'test.org' }, null, null);

      expect(normalisedOptions.restHost).to.equal('test.org');
      expect(normalisedOptions.realtimeHost).to.equal('test.org');
      expect(normalisedOptions.port).to.equal(80);
      expect(normalisedOptions.tlsPort).to.equal(443);
      expect(normalisedOptions.fallbackHosts).to.equal(undefined);
      expect(normalisedOptions.tls).to.equal(true);

      helper.recordPrivateApi('call.Defaults.getHosts');
      expect(Defaults.getHosts(normalisedOptions)).to.deep.equal([normalisedOptions.restHost]);
      helper.recordPrivateApi('call.Defaults.getHost');
      expect(Defaults.getHost(normalisedOptions, 'test.org', false)).to.deep.equal('test.org');
      expect(Defaults.getHost(normalisedOptions, 'test.org', true)).to.deep.equal('test.org');

      helper.recordPrivateApi('call.Defaults.getPort');
      expect(Defaults.getPort(normalisedOptions)).to.equal(443);
    });

    /* init with given restHost and realtimeHost */
    it('Init with given restHost and realtimeHost', function () {
      const helper = this.test.helper;

      helper.recordPrivateApi('call.Defaults.normaliseOptions');
      var normalisedOptions = Defaults.normaliseOptions(
        { restHost: 'test.org', realtimeHost: 'ws.test.org' },
        null,
        null,
      );

      expect(normalisedOptions.restHost).to.equal('test.org');
      expect(normalisedOptions.realtimeHost).to.equal('ws.test.org');
      expect(normalisedOptions.port).to.equal(80);
      expect(normalisedOptions.tlsPort).to.equal(443);
      expect(normalisedOptions.fallbackHosts).to.equal(undefined);
      expect(normalisedOptions.tls).to.equal(true);

      helper.recordPrivateApi('call.Defaults.getHosts');
      expect(Defaults.getHosts(normalisedOptions)).to.deep.equal([normalisedOptions.restHost]);
      helper.recordPrivateApi('call.Defaults.getHost');
      expect(Defaults.getHost(normalisedOptions, 'test.org', false)).to.deep.equal('test.org');
      expect(Defaults.getHost(normalisedOptions, 'test.org', true)).to.deep.equal('ws.test.org');

      helper.recordPrivateApi('call.Defaults.getPort');
      expect(Defaults.getPort(normalisedOptions)).to.equal(443);
    });

    it('Init with no endpoint-related options and given default environment', function () {
      const helper = this.test.helper;

      helper.recordPrivateApi('write.Defaults.ENVIRONMENT');
      Defaults.ENVIRONMENT = 'sandbox';
      helper.recordPrivateApi('call.Defaults.normaliseOptions');
      var normalisedOptions = Defaults.normaliseOptions({}, null, null);

      expect(normalisedOptions.restHost).to.equal('sandbox-rest.ably.io');
      expect(normalisedOptions.realtimeHost).to.equal('sandbox-realtime.ably.io');
      expect(normalisedOptions.port).to.equal(80);
      expect(normalisedOptions.tlsPort).to.equal(443);
      expect(normalisedOptions.fallbackHosts.sort()).to.deep.equal(Defaults.environmentFallbackHosts('sandbox').sort());
      expect(normalisedOptions.tls).to.equal(true);

      helper.recordPrivateApi('call.Defaults.getHosts');
      expect(Defaults.getHosts(normalisedOptions).length).to.equal(4);
      expect(Defaults.getHosts(normalisedOptions)[0]).to.deep.equal(normalisedOptions.restHost);
      helper.recordPrivateApi('call.Defaults.getHost');
      expect(Defaults.getHost(normalisedOptions, 'sandbox-rest.ably.io', false)).to.deep.equal('sandbox-rest.ably.io');
      expect(Defaults.getHost(normalisedOptions, 'sandbox-rest.ably.io', true)).to.deep.equal(
        'sandbox-realtime.ably.io',
      );

      helper.recordPrivateApi('call.Defaults.getPort');
      expect(Defaults.getPort(normalisedOptions)).to.equal(443);
      helper.recordPrivateApi('write.Defaults.ENVIRONMENT');
      Defaults.ENVIRONMENT = '';
    });

    // TODO once https://github.com/ably/ably-js/issues/1424 is fixed, this should also test the case where the useBinaryProtocol option is not specified
    describe('normaliseOptions with useBinaryProtocol == true', () => {
      if (Ably.Realtime.Platform.Config.supportsBinary) {
        describe('given MsgPack implementation', () => {
          it('maintains useBinaryProtocol as true', function () {
            const helper = this.test.helper;
            const StubMsgPack = {};
            helper.recordPrivateApi('call.Defaults.normaliseOptions');
            var normalisedOptions = Defaults.normaliseOptions({ useBinaryProtocol: true }, StubMsgPack, null);

            expect(normalisedOptions.useBinaryProtocol).to.be.true;
          });
        });
      }

      describe('given no MsgPack implementation', () => {
        it('changes useBinaryProtocol to false', function () {
          const helper = this.test.helper;
          helper.recordPrivateApi('call.Defaults.normaliseOptions');
          var normalisedOptions = Defaults.normaliseOptions({ useBinaryProtocol: true }, null, null);

          expect(normalisedOptions.useBinaryProtocol).to.be.false;
        });
      });
    });

    it('closeOnUnload', function () {
      const helper = this.test.helper;
      var options;

      helper.recordPrivateApi('call.Defaults.normaliseOptions');

      /* Default to true */
      options = Defaults.normaliseOptions({}, null, null);
      expect(options.closeOnUnload).to.equal(true);

      /* Default to false if using manual recovery */
      options = Defaults.normaliseOptions({ recover: 'someRecoveryKey' }, null, null);
      expect(options.closeOnUnload).to.equal(false);

      /* Default to false if using autorecovery */
      options = Defaults.normaliseOptions({ recover: function () {} }, null, null);
      expect(options.closeOnUnload).to.equal(false);

      /* can override default with manual recovery */
      options = Defaults.normaliseOptions({ recover: 'someRecoveryKey', closeOnUnload: true }, null, null);
      expect(options.closeOnUnload).to.equal(true);

      /* can override default with autorecovery only at the cost of unsetting autorecovery */
      options = Defaults.normaliseOptions({ recover: function () {}, closeOnUnload: true }, null, null);
      expect(options.closeOnUnload).to.equal(true);
      expect(!options.recover).to.be.ok;
    });
  });
});
