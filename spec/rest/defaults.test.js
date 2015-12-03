"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	var exports = {};
	var Defaults = Ably.Rest.Defaults;

	/* init with no endpoint-related options */
	exports.defaults_no_opts = function(test) {
		test.expect(10);
		var normalisedOptions = Defaults.normaliseOptions({});

		test.equal(normalisedOptions.restHost, 'rest.ably.io');
		test.equal(normalisedOptions.realtimeHost, 'realtime.ably.io');
		test.equal(normalisedOptions.port, 80);
		test.equal(normalisedOptions.tlsPort, 443);
		test.deepEqual(normalisedOptions.fallbackHosts, Defaults.FALLBACK_HOSTS);
		test.equal(normalisedOptions.tls, true);

		test.deepEqual(Defaults.getHosts(normalisedOptions), [normalisedOptions.restHost].concat(Defaults.FALLBACK_HOSTS.slice(0,3)));
		test.deepEqual(Defaults.getHost(normalisedOptions, 'rest.ably.io', false), 'rest.ably.io');
		test.deepEqual(Defaults.getHost(normalisedOptions, 'rest.ably.io', true), 'realtime.ably.io');

		test.equal(Defaults.getPort(normalisedOptions), 443);
		test.done();
	};

	/* init with production environment */
	exports.defaults_production = function(test) {
		test.expect(10);
		var normalisedOptions = Defaults.normaliseOptions({environment: 'production'});

		test.equal(normalisedOptions.restHost, 'rest.ably.io');
		test.equal(normalisedOptions.realtimeHost, 'realtime.ably.io');
		test.equal(normalisedOptions.port, 80);
		test.equal(normalisedOptions.tlsPort, 443);
		test.deepEqual(normalisedOptions.fallbackHosts, Defaults.FALLBACK_HOSTS);
		test.equal(normalisedOptions.tls, true);

		test.deepEqual(Defaults.getHosts(normalisedOptions), [normalisedOptions.restHost].concat(Defaults.FALLBACK_HOSTS.slice(0,3)));
		test.deepEqual(Defaults.getHost(normalisedOptions, 'rest.ably.io', false), 'rest.ably.io');
		test.deepEqual(Defaults.getHost(normalisedOptions, 'rest.ably.io', true), 'realtime.ably.io');

		test.equal(Defaults.getPort(normalisedOptions), 443);
		test.done();
	};

	/* init with given environment */
	exports.defaults_given_environment = function(test) {
		test.expect(10);
		var normalisedOptions = Defaults.normaliseOptions({environment: 'sandbox'});

		test.equal(normalisedOptions.restHost, 'sandbox-rest.ably.io');
		test.equal(normalisedOptions.realtimeHost, 'sandbox-realtime.ably.io');
		test.equal(normalisedOptions.port, 80);
		test.equal(normalisedOptions.tlsPort, 443);
		test.equal(normalisedOptions.fallbackHosts, undefined);
		test.equal(normalisedOptions.tls, true);

		test.deepEqual(Defaults.getHosts(normalisedOptions), [normalisedOptions.restHost]);
		test.deepEqual(Defaults.getHost(normalisedOptions, 'sandbox-rest.ably.io', false), 'sandbox-rest.ably.io');
		test.deepEqual(Defaults.getHost(normalisedOptions, 'sandbox-rest.ably.io', true), 'sandbox-realtime.ably.io');

		test.equal(Defaults.getPort(normalisedOptions), 443);
		test.done();
	};

	/* init with local environment and non-default ports */
	exports.defaults_local_ports = function(test) {
		test.expect(10);
		var normalisedOptions = Defaults.normaliseOptions({environment: 'local', port: 8080, tlsPort: 8081});

		test.equal(normalisedOptions.restHost, 'local-rest.ably.io');
		test.equal(normalisedOptions.realtimeHost, 'local-realtime.ably.io');
		test.equal(normalisedOptions.port, 8080);
		test.equal(normalisedOptions.tlsPort, 8081);
		test.equal(normalisedOptions.fallbackHosts, undefined);
		test.equal(normalisedOptions.tls, true);

		test.deepEqual(Defaults.getHosts(normalisedOptions), [normalisedOptions.restHost]);
		test.deepEqual(Defaults.getHost(normalisedOptions, 'local-rest.ably.io', false), 'local-rest.ably.io');
		test.deepEqual(Defaults.getHost(normalisedOptions, 'local-rest.ably.io', true), 'local-realtime.ably.io');

		test.equal(Defaults.getPort(normalisedOptions), 8081);
		test.done();
	};

	/* init with given host */
	exports.defaults_given_host = function(test) {
		test.expect(10);
		var normalisedOptions = Defaults.normaliseOptions({restHost: 'test.org'});

		test.equal(normalisedOptions.restHost, 'test.org');
		test.equal(normalisedOptions.realtimeHost, 'test.org');
		test.equal(normalisedOptions.port, 80);
		test.equal(normalisedOptions.tlsPort, 443);
		test.equal(normalisedOptions.fallbackHosts, undefined);
		test.equal(normalisedOptions.tls, true);

		test.deepEqual(Defaults.getHosts(normalisedOptions), [normalisedOptions.restHost]);
		test.deepEqual(Defaults.getHost(normalisedOptions, 'test.org', false), 'test.org');
		test.deepEqual(Defaults.getHost(normalisedOptions, 'test.org', true), 'test.org');

		test.equal(Defaults.getPort(normalisedOptions), 443);
		test.done();
	};

	/* init with given restHost and realtimeHost */
	exports.defaults_given_realtimehost = function(test) {
		test.expect(10);
		var normalisedOptions = Defaults.normaliseOptions({restHost: 'test.org', realtimeHost: 'ws.test.org'});

		test.equal(normalisedOptions.restHost, 'test.org');
		test.equal(normalisedOptions.realtimeHost, 'ws.test.org');
		test.equal(normalisedOptions.port, 80);
		test.equal(normalisedOptions.tlsPort, 443);
		test.equal(normalisedOptions.fallbackHosts, undefined);
		test.equal(normalisedOptions.tls, true);

		test.deepEqual(Defaults.getHosts(normalisedOptions), [normalisedOptions.restHost]);
		test.deepEqual(Defaults.getHost(normalisedOptions, 'test.org', false), 'test.org');
		test.deepEqual(Defaults.getHost(normalisedOptions, 'test.org', true), 'ws.test.org');

		test.equal(Defaults.getPort(normalisedOptions), 443);
		test.done();
	};

	/* init with deprecated host and wsHost options */
	/* will emit a warning */
	exports.defaults_given_deprecated_host = function(test) {
		test.expect(10);
		var normalisedOptions = Defaults.normaliseOptions({host: 'test.org', wsHost: 'ws.test.org'});

		test.equal(normalisedOptions.restHost, 'test.org');
		test.equal(normalisedOptions.realtimeHost, 'ws.test.org');
		test.equal(normalisedOptions.port, 80);
		test.equal(normalisedOptions.tlsPort, 443);
		test.equal(normalisedOptions.fallbackHosts, undefined);
		test.equal(normalisedOptions.tls, true);

		test.deepEqual(Defaults.getHosts(normalisedOptions), [normalisedOptions.restHost]);
		test.deepEqual(Defaults.getHost(normalisedOptions, 'test.org', false), 'test.org');
		test.deepEqual(Defaults.getHost(normalisedOptions, 'test.org', true), 'ws.test.org');

		test.equal(Defaults.getPort(normalisedOptions), 443);
		test.done();
	};

	/* init with no endpoint-related options and given default environment */
	exports.defaults_set_default_environment = function(test) {
		test.expect(10);
		Defaults.ENVIRONMENT = 'sandbox';
		var normalisedOptions = Defaults.normaliseOptions({});

		test.equal(normalisedOptions.restHost, 'sandbox-rest.ably.io');
		test.equal(normalisedOptions.realtimeHost, 'sandbox-realtime.ably.io');
		test.equal(normalisedOptions.port, 80);
		test.equal(normalisedOptions.tlsPort, 443);
		test.equal(normalisedOptions.fallbackHosts, undefined);
		test.equal(normalisedOptions.tls, true);

		test.deepEqual(Defaults.getHosts(normalisedOptions), [normalisedOptions.restHost]);
		test.deepEqual(Defaults.getHost(normalisedOptions, 'sandbox-rest.ably.io', false), 'sandbox-rest.ably.io');
		test.deepEqual(Defaults.getHost(normalisedOptions, 'sandbox-rest.ably.io', true), 'sandbox-realtime.ably.io');

		test.equal(Defaults.getPort(normalisedOptions), 443);
		test.done();
	};

	return module.exports = helper.withTimeout(exports);
});
