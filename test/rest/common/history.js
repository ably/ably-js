"use strict";

exports.setup = function(base) {
	var rExports = {}, _rExports = {};
	var rest = base.rest;
	var displayError = base.displayError;

	if (!base.isBrowser)
		var async = require('async');
	else
		var async = window.async;

	rExports.setuphistory = function(test) {
		rest = base.rest({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value
		});
		test.done();
	};

	rExports.history0 = function(test) {
		test.expect(1);
		var testchannel = rest.channels.get('persisted:history0');

		/* first, send a number of events to this channel */
		var testEvents = [
			{ name: 'event0',
				data: 'message0' },
			{ name: 'event1',
				data: 'message1' },
			{ name: 'event2',
				data: 'message2' },
			{ name: 'event3',
				data: 'message3' },
			{ name: 'event4',
				data: 'message4' }
		];
		var publishTasks = testEvents.map(function(event) {
			return function(publishCb) {
				testchannel.publish(event.name, event.data, publishCb);
			};
		});

		/* add a 16s delay to allow published messages to reach persistent storage */
		publishTasks.push(function(waitCb) { setTimeout(function() {
			waitCb(null);
		}, 16000); });
		try {
			async.parallel(publishTasks, function(err) {
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}

				/* so now the messages are there; try querying the timeline */
				testchannel.history(function(err, messages) {
					//console.log(require('util').inspect(messages));
					if(err) {
						test.ok(false, displayError(err));
						test.done();
						return;
					}
					test.equal(messages.length, testEvents.length, 'Verify correct number of messages found');
					test.done();
				});
			});
		} catch(e) {
			console.log(e.stack);
		}
	};

	return rExports;
};
