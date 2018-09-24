"use strict";
this.Defaults = {
	internetUpUrl: 'https://internet-up.ably-realtime.com/is-the-internet-up.txt',
	/* Note: order matters here: the base transport is the leftmost one in the
	* intersection of baseTransportOrder and the transports clientOption that's supported.
	* (For node this is the same as the transportPreferenceOrder, but for
	* browsers it's different*/
	defaultTransports: ['web_socket'],
	baseTransportOrder: ['comet', 'web_socket'],
	transportPreferenceOrder: ['comet', 'web_socket'],
	upgradeTransports: ['web_socket'],
	restAgentOptions: {maxSockets: 40, keepAlive: true}
};
