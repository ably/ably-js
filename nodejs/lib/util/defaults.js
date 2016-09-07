"use strict";
this.Defaults = {
	internetUpUrl: 'https://internet-up.ably-realtime.com/is-the-internet-up.txt',
	/* Note: order matters here: the base transport is the leftmost one in the
	* intersection of this list and the transports clientOption that's supported */
	transports: ['comet', 'web_socket'],
	transportPreferenceOrder: ['comet', 'web_socket'],
	upgradeTransports: ['web_socket'],
	restAgentOptions: {maxSockets: 40}
};
