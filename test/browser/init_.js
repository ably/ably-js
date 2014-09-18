/*
 * Base init case
 */
var _init = {};
var init_ = {};

init_.initbase0 = function (test) {
	test.expect(1);
	try {
		var timeout,
			ably = simple.realtimeConnection();

		ably.connection.on('connected', function () {
			clearTimeout(timeout);
			test.ok(true, 'Verify init with key');
			test.done();
			ably.close();
		});
		function exitOnState(state) {
			ably.connection.on(state, function () {
				connectionTimeout.stop();
				test.ok(false, 'Connection to server failed');
				test.done();
				ably.close();
			});
		}
		exitOnState('failed');
		exitOnState('suspended');
		timeout = setTimeout(function () {
			test.ok(false, 'Timed out: Trying to connect took longer than expected');
			test.done();
			ably.close();
		}, 10 * 1000);
	} catch (e) {
		test.ok(false, 'Init with key failed with exception: ' + e);
		test.done();
	}
};
