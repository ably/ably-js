"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	helper.describeWithCounter('rest/defaults', function (expect, counter) {
		var exports = {};
		var Defaults = Ably.Rest.Defaults;

		/* init with no endpoint-related options */
		it('defaults_no_opts', function(done) {
			counter.expect(11);
			var normalisedOptions = Defaults.normaliseOptions({});

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
			counter.assert();
			done();
		});

		/* init with production environment */
		it('defaults_production', function(done) {
			counter.expect(11);
			var normalisedOptions = Defaults.normaliseOptions({environment: 'production'});

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
			counter.assert();
			done();
		});

		/* init with given environment */
		it('defaults_given_environment', function(done) {
			counter.expect(11);
			var normalisedOptions = Defaults.normaliseOptions({environment: 'sandbox'});

			expect(normalisedOptions.restHost).to.equal('sandbox-rest.ably.io');
			expect(normalisedOptions.realtimeHost).to.equal('sandbox-realtime.ably.io');
			expect(normalisedOptions.port).to.equal(80);
			expect(normalisedOptions.tlsPort).to.equal(443);
			expect(normalisedOptions.fallbackHosts.sort()).to.deep.equal(Defaults.environmentFallbackHosts('sandbox').sort());
			expect(normalisedOptions.tls).to.equal(true);

			expect(Defaults.getHosts(normalisedOptions).length).to.deep.equal(4);
			expect(Defaults.getHosts(normalisedOptions)[0]).to.deep.equal(normalisedOptions.restHost);
			expect(Defaults.getHost(normalisedOptions, 'sandbox-rest.ably.io', false)).to.deep.equal('sandbox-rest.ably.io');
			expect(Defaults.getHost(normalisedOptions, 'sandbox-rest.ably.io', true)).to.deep.equal('sandbox-realtime.ably.io');

			expect(Defaults.getPort(normalisedOptions)).to.equal(443);
			counter.assert();
			done();
		});

		/* init with given environment */
		it('defaults_given_environment2', function(done) {
			counter.expect(11);
			var normalisedOptions = Defaults.normaliseOptions({environment: 'sandbox', fallbackHostsUseDefault: true});
	
			expect(normalisedOptions.restHost).to.equal('sandbox-rest.ably.io');
			expect(normalisedOptions.realtimeHost).to.equal('sandbox-realtime.ably.io');
			expect(normalisedOptions.port).to.equal(80);
			expect(normalisedOptions.tlsPort).to.equal(443);
			expect(normalisedOptions.fallbackHosts.sort()).to.deep.equal(Defaults.FALLBACK_HOSTS.sort());
			expect(normalisedOptions.tls).to.equal(true);
	
			expect(Defaults.getHosts(normalisedOptions).length).to.deep.equal(4);
			expect(Defaults.getHosts(normalisedOptions)[0]).to.deep.equal(normalisedOptions.restHost);
			expect(Defaults.getHost(normalisedOptions).to.deep.equal('sandbox-rest.ably.io', false), 'sandbox-rest.ably.io');
			expect(Defaults.getHost(normalisedOptions).to.deep.equal('sandbox-rest.ably.io', true), 'sandbox-realtime.ably.io');
	
			expect(Defaults.getPort(normalisedOptions)).to.equal(443);
			counter.assert();
			done();
		});

		/* init with local environment and non-default ports */
		it('defaults_local_ports', function(done) {
			counter.expect(10);
			var normalisedOptions = Defaults.normaliseOptions({environment: 'local', port: 8080, tlsPort: 8081});

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
			counter.assert();
			done();
		});

		/* init with given host */
		it('defaults_given_host', function(done) {
			counter.expect(10);
			var normalisedOptions = Defaults.normaliseOptions({restHost: 'test.org'});

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
			counter.assert();
			done();
		});

		/* init with given restHost and realtimeHost */
		it('defaults_given_realtimehost', function(done) {
			counter.expect(10);
			var normalisedOptions = Defaults.normaliseOptions({restHost: 'test.org', realtimeHost: 'ws.test.org'});

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
			counter.assert();
			done();
		});

		/* init with given restHost and realtimeHost, using the default fallback hosts */
		it('defaults_given_host_using_default_fallbacks', function(done) {
			counter.expect(3);
			var normalisedOptions = Defaults.normaliseOptions({restHost: 'test.org', realtimeHost: 'ws.test.org', fallbackHostsUseDefault: true});

			expect(normalisedOptions.restHost).to.equal('test.org');
			expect(normalisedOptions.realtimeHost).to.equal('ws.test.org');
			expect(normalisedOptions.fallbackHosts.sort()).to.deep.equal(Defaults.FALLBACK_HOSTS.sort());
			counter.assert();
			done();
		});

		/* init with deprecated host and wsHost options */
		/* will emit a warning */
		it('defaults_given_deprecated_host', function(done) {
			counter.expect(10);
			var normalisedOptions = Defaults.normaliseOptions({host: 'test.org', wsHost: 'ws.test.org'});

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
			counter.assert();
			done();
		});

		/* init with no endpoint-related options and given default environment */
		it('defaults_set_default_environment', function(done) {
			counter.expect(11);
			Defaults.ENVIRONMENT = 'sandbox';
			var normalisedOptions = Defaults.normaliseOptions({});

			expect(normalisedOptions.restHost).to.equal('sandbox-rest.ably.io');
			expect(normalisedOptions.realtimeHost).to.equal('sandbox-realtime.ably.io');
			expect(normalisedOptions.port).to.equal(80);
			expect(normalisedOptions.tlsPort).to.equal(443);
			expect(normalisedOptions.fallbackHosts.sort()).to.deep.equal(Defaults.environmentFallbackHosts('sandbox').sort());
			expect(normalisedOptions.tls).to.equal(true);

			expect(Defaults.getHosts(normalisedOptions).length).to.deep.equal(4);
			expect(Defaults.getHosts(normalisedOptions)[0]).to.deep.equal(normalisedOptions.restHost);
			expect(Defaults.getHost(normalisedOptions, 'sandbox-rest.ably.io', false)).to.deep.equal('sandbox-rest.ably.io');
			expect(Defaults.getHost(normalisedOptions, 'sandbox-rest.ably.io', true)).to.deep.equal('sandbox-realtime.ably.io');

			expect(Defaults.getPort(normalisedOptions)).to.equal(443);
			counter.assert();
			done();
		});

		it('defaults_closeOnUnload', function(done) {
			counter.expect(6);
			var options;

			/* Default to true */
			options = Defaults.normaliseOptions({});
			expect(options.closeOnUnload).to.equal(true);

			/* Default to false if using manual recovery */
			options = Defaults.normaliseOptions({recover: 'someRecoveryKey'});
			expect(options.closeOnUnload).to.equal(false);

			/* Default to false if using autorecovery */
			options = Defaults.normaliseOptions({recover: function(){}});
			expect(options.closeOnUnload).to.equal(false);

			/* can override default with manual recovery */
			options = Defaults.normaliseOptions({recover: 'someRecoveryKey', closeOnUnload: true});
			expect(options.closeOnUnload).to.equal(true);

			/* can override default with autorecovery only at the cost of unsetting autorecovery */
			options = Defaults.normaliseOptions({recover: function(){}, closeOnUnload: true});
			expect(options.closeOnUnload).to.equal(true);
			expect(!options.recover);

			counter.assert();
			done();
		});
	});
});
