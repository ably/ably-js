'use strict';

define(['ably', 'chai'], function (Ably, chai) {
  var expect = chai.expect;
  var Defaults = Ably.Realtime.Platform.Defaults;

  describe('rest/defaults', function () {
    it('Init with no endpoint-related options', function () {
      var normalisedOptions = Defaults.normaliseOptions({});

      expect(normalisedOptions.restHost).to.equal('rest.ably.io');
      expect(normalisedOptions.realtimeHost).to.equal('realtime.ably.io');
      expect(normalisedOptions.port).to.equal(80);
      expect(normalisedOptions.tlsPort).to.equal(443);
      expect(normalisedOptions.fallbackHosts.sort()).to.deep.equal(Defaults.FALLBACK_HOSTS.sort());
      expect(normalisedOptions.tls).to.equal(true);

      expect(Defaults.getHosts(normalisedOptions).length).to.equal(4);
      expect(Defaults.getHosts(normalisedOptions)[0]).to.deep.equal(normalisedOptions.restHost);
      expect(Defaults.getHost(normalisedOptions, 'rest.ably.io', false)).to.deep.equal('rest.ably.io');
      expect(Defaults.getHost(normalisedOptions, 'rest.ably.io', true)).to.equal('realtime.ably.io');

      expect(Defaults.getPort(normalisedOptions)).to.equal(443);
    });

    it('Init with production environment', function () {
      var normalisedOptions = Defaults.normaliseOptions({ environment: 'production' });

      expect(normalisedOptions.restHost).to.equal('rest.ably.io');
      expect(normalisedOptions.realtimeHost).to.equal('realtime.ably.io');
      expect(normalisedOptions.port).to.equal(80);
      expect(normalisedOptions.tlsPort).to.equal(443);
      expect(normalisedOptions.fallbackHosts.sort()).to.deep.equal(Defaults.FALLBACK_HOSTS.sort());
      expect(normalisedOptions.tls).to.equal(true);

      expect(Defaults.getHosts(normalisedOptions).length).to.deep.equal(4);
      expect(Defaults.getHosts(normalisedOptions)[0]).to.deep.equal(normalisedOptions.restHost);
      expect(Defaults.getHost(normalisedOptions, 'rest.ably.io', false)).to.deep.equal('rest.ably.io');
      expect(Defaults.getHost(normalisedOptions, 'rest.ably.io', true)).to.deep.equal('realtime.ably.io');

      expect(Defaults.getPort(normalisedOptions)).to.equal(443);
    });

    it('Init with given environment', function () {
      var normalisedOptions = Defaults.normaliseOptions({ environment: 'sandbox' });

      expect(normalisedOptions.restHost).to.equal('sandbox-rest.ably.io');
      expect(normalisedOptions.realtimeHost).to.equal('sandbox-realtime.ably.io');
      expect(normalisedOptions.port).to.equal(80);
      expect(normalisedOptions.tlsPort).to.equal(443);
      expect(normalisedOptions.fallbackHosts.sort()).to.deep.equal(Defaults.environmentFallbackHosts('sandbox').sort());
      expect(normalisedOptions.tls).to.equal(true);

      expect(Defaults.getHosts(normalisedOptions).length).to.deep.equal(4);
      expect(Defaults.getHosts(normalisedOptions)[0]).to.deep.equal(normalisedOptions.restHost);
      expect(Defaults.getHost(normalisedOptions, 'sandbox-rest.ably.io', false)).to.deep.equal('sandbox-rest.ably.io');
      expect(Defaults.getHost(normalisedOptions, 'sandbox-rest.ably.io', true)).to.deep.equal(
        'sandbox-realtime.ably.io'
      );

      expect(Defaults.getPort(normalisedOptions)).to.equal(443);
    });

    it('Init with local environment and non-default ports', function () {
      var normalisedOptions = Defaults.normaliseOptions({ environment: 'local', port: 8080, tlsPort: 8081 });

      expect(normalisedOptions.restHost).to.equal('local-rest.ably.io');
      expect(normalisedOptions.realtimeHost).to.equal('local-realtime.ably.io');
      expect(normalisedOptions.port).to.equal(8080);
      expect(normalisedOptions.tlsPort).to.equal(8081);
      expect(normalisedOptions.fallbackHosts).to.equal(undefined);
      expect(normalisedOptions.tls).to.equal(true);

      expect(Defaults.getHosts(normalisedOptions)).to.deep.equal([normalisedOptions.restHost]);
      expect(Defaults.getHost(normalisedOptions, 'local-rest.ably.io', false)).to.deep.equal('local-rest.ably.io');
      expect(Defaults.getHost(normalisedOptions, 'local-rest.ably.io', true)).to.deep.equal('local-realtime.ably.io');

      expect(Defaults.getPort(normalisedOptions)).to.equal(8081);
    });

    it('Init with given host', function () {
      var normalisedOptions = Defaults.normaliseOptions({ restHost: 'test.org' });

      expect(normalisedOptions.restHost).to.equal('test.org');
      expect(normalisedOptions.realtimeHost).to.equal('test.org');
      expect(normalisedOptions.port).to.equal(80);
      expect(normalisedOptions.tlsPort).to.equal(443);
      expect(normalisedOptions.fallbackHosts).to.equal(undefined);
      expect(normalisedOptions.tls).to.equal(true);

      expect(Defaults.getHosts(normalisedOptions)).to.deep.equal([normalisedOptions.restHost]);
      expect(Defaults.getHost(normalisedOptions, 'test.org', false)).to.deep.equal('test.org');
      expect(Defaults.getHost(normalisedOptions, 'test.org', true)).to.deep.equal('test.org');

      expect(Defaults.getPort(normalisedOptions)).to.equal(443);
    });

    /* init with given restHost and realtimeHost */
    it('Init with given restHost and realtimeHost', function () {
      var normalisedOptions = Defaults.normaliseOptions({ restHost: 'test.org', realtimeHost: 'ws.test.org' });

      expect(normalisedOptions.restHost).to.equal('test.org');
      expect(normalisedOptions.realtimeHost).to.equal('ws.test.org');
      expect(normalisedOptions.port).to.equal(80);
      expect(normalisedOptions.tlsPort).to.equal(443);
      expect(normalisedOptions.fallbackHosts).to.equal(undefined);
      expect(normalisedOptions.tls).to.equal(true);

      expect(Defaults.getHosts(normalisedOptions)).to.deep.equal([normalisedOptions.restHost]);
      expect(Defaults.getHost(normalisedOptions, 'test.org', false)).to.deep.equal('test.org');
      expect(Defaults.getHost(normalisedOptions, 'test.org', true)).to.deep.equal('ws.test.org');

      expect(Defaults.getPort(normalisedOptions)).to.equal(443);
    });

    it('Init with no endpoint-related options and given default environment', function () {
      Defaults.ENVIRONMENT = 'sandbox';
      var normalisedOptions = Defaults.normaliseOptions({});

      expect(normalisedOptions.restHost).to.equal('sandbox-rest.ably.io');
      expect(normalisedOptions.realtimeHost).to.equal('sandbox-realtime.ably.io');
      expect(normalisedOptions.port).to.equal(80);
      expect(normalisedOptions.tlsPort).to.equal(443);
      expect(normalisedOptions.fallbackHosts.sort()).to.deep.equal(Defaults.environmentFallbackHosts('sandbox').sort());
      expect(normalisedOptions.tls).to.equal(true);

      expect(Defaults.getHosts(normalisedOptions).length).to.equal(4);
      expect(Defaults.getHosts(normalisedOptions)[0]).to.deep.equal(normalisedOptions.restHost);
      expect(Defaults.getHost(normalisedOptions, 'sandbox-rest.ably.io', false)).to.deep.equal('sandbox-rest.ably.io');
      expect(Defaults.getHost(normalisedOptions, 'sandbox-rest.ably.io', true)).to.deep.equal(
        'sandbox-realtime.ably.io'
      );

      expect(Defaults.getPort(normalisedOptions)).to.equal(443);
      Defaults.ENVIRONMENT = '';
    });

    // TODO once https://github.com/ably/ably-js/issues/1424 is fixed, this should also test the case where the useBinaryProtocol option is not specified
    describe('normaliseOptions with useBinaryProtocol == true', () => {
      if (Ably.Realtime.Platform.Config.supportsBinary) {
        describe('given MsgPack implementation', () => {
          it('maintains useBinaryProtocol as true', () => {
            const StubMsgPack = {};
            var normalisedOptions = Defaults.normaliseOptions({ useBinaryProtocol: true }, StubMsgPack);

            expect(normalisedOptions.useBinaryProtocol).to.be.true;
          });
        });
      }

      describe('given no MsgPack implementation', () => {
        it('changes useBinaryProtocol to false', () => {
          var normalisedOptions = Defaults.normaliseOptions({ useBinaryProtocol: true }, null);

          expect(normalisedOptions.useBinaryProtocol).to.be.false;
        });
      });
    });

    it('closeOnUnload', function () {
      var options;

      /* Default to true */
      options = Defaults.normaliseOptions({});
      expect(options.closeOnUnload).to.equal(true);

      /* Default to false if using manual recovery */
      options = Defaults.normaliseOptions({ recover: 'someRecoveryKey' });
      expect(options.closeOnUnload).to.equal(false);

      /* Default to false if using autorecovery */
      options = Defaults.normaliseOptions({ recover: function () {} });
      expect(options.closeOnUnload).to.equal(false);

      /* can override default with manual recovery */
      options = Defaults.normaliseOptions({ recover: 'someRecoveryKey', closeOnUnload: true });
      expect(options.closeOnUnload).to.equal(true);

      /* can override default with autorecovery only at the cost of unsetting autorecovery */
      options = Defaults.normaliseOptions({ recover: function () {}, closeOnUnload: true });
      expect(options.closeOnUnload).to.equal(true);
      expect(!options.recover).to.be.ok;
    });
  });
});
