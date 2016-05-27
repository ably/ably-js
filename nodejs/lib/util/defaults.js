"use strict";
this.Defaults = {
	internetUpUrlWithoutExtension: 'https://internet-up.ably-realtime.com/is-the-internet-up',
	/* Note: order matters here: the base transport is the leftmost one in the
	* intersection of this list and the transports clientOption that's supported */
	transports: ['comet', 'web_socket'],
	transportPreferenceOrder: ['comet', 'web_socket'],
	upgradeTransports: ['web_socket']
};
