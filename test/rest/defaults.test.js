'use strict';

define(['ably', 'chai'], function (Ably, chai) {
  var expect = chai.expect;
  var Defaults = Ably.Realtime.Platform.Defaults;

  describe.only('rest/defaults', function () {
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

    /* will emit a deprecation warning */
    it('Init with given environment and default fallbacks', function () {
      var normalisedOptions = Defaults.normaliseOptions({ environment: 'sandbox', fallbackHostsUseDefault: true });

      expect(normalisedOptions.restHost).to.equal('sandbox-rest.ably.io');
      expect(normalisedOptions.realtimeHost).to.equal('sandbox-realtime.ably.io');
      expect(normalisedOptions.port).to.equal(80);
      expect(normalisedOptions.tlsPort).to.equal(443);
      expect(normalisedOptions.fallbackHosts.sort()).to.deep.equal(Defaults.FALLBACK_HOSTS.sort());
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

    /* init with given restHost and realtimeHost, using the default fallback hosts */
    it('Init with given restHost and realtimeHost, using the default fallback hosts', function () {
      var normalisedOptions = Defaults.normaliseOptions({
        restHost: 'test.org',
        realtimeHost: 'ws.test.org',
        fallbackHostsUseDefault: true,
      });

      expect(normalisedOptions.restHost).to.equal('test.org');
      expect(normalisedOptions.realtimeHost).to.equal('ws.test.org');
      expect(normalisedOptions.fallbackHosts.sort()).to.deep.equal(Defaults.FALLBACK_HOSTS.sort());
    });

    it('Throws an error when initiated with fallbackHosts and fallbackHostsUseDefault', function () {
      expect(function () {
        Defaults.normaliseOptions({ fallbackHosts: ['a.example.com', 'b.example.com'], fallbackHostsUseDefault: true });
      }, "Check fallbackHosts and fallbackHostsUseDefault can't both be set").to.throw();
    });

    it('Throws an error with initiated with fallbackHostsUseDefault and port or tlsPort set', function () {
      expect(function () {
        Defaults.normaliseOptions({ fallbackHostsUseDefault: true, port: 8080 });
      }, "Check fallbackHostsUseDefault and port can't both be set").to.throw;
      expect(function () {
        Defaults.normaliseOptions({ fallbackHostsUseDefault: true, tlsPort: 8081 });
      }, "Check fallbackHostsUseDefault and tlsPort can't both be set").to.throw;
    });

    /* will emit a warning */
    it('Init with deprecated host and wsHost options', function () {
      var normalisedOptions = Defaults.normaliseOptions({ host: 'test.org', wsHost: 'ws.test.org' });

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
